import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db.js';
import { RaceManager } from './raceManager.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Production Security & Proxy Settings
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors());
app.use(express.json());

// Initialize database
await initDatabase();

// Countdown state management
let countdownInterval = null;
let countdownRemaining = 0;
let countdownResetCount = 0;
const INDONESIAN_NUMBERS = [
  'Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
  'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh'
];

function broadcastFullState() {
  const state = RaceManager.getFullState();
  io.emit('STATE_UPDATE', state);
  return state;
}

// REST APIs
// 0. Production Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: db.rawDb ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});
// 1. Full State Snapshot
app.get('/api/state', (req, res) => {
  try {
    const state = RaceManager.getFullState();
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Users list for Cashier & RD Search
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.*, 
        COALESCE(c.balance, 0) as coupon_balance
      FROM users u
      LEFT JOIN coupons c ON u.id = c.user_id
      ORDER BY u.created_at DESC
    `).all();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. User Login / Profile Setup (Google OAuth or Quick Sign-in)
app.post('/api/users/login', (req, res) => {
  try {
    const { name, email, googleSubId, teamName } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nama wajib diisi' });

    let user = null;
    if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }

    if (!user) {
      const uId = uuidv4();
      const tag = teamName ? teamName.substring(0, 10).toUpperCase() : name.substring(0, 6).toUpperCase();
      db.prepare(`
        INSERT INTO users (id, name, email, google_sub_id, team_name, role, is_virtual)
        VALUES (?, ?, ?, ?, ?, 'participant', 0)
      `).run(uId, name, email || `${name.toLowerCase().replace(/\s+/g, '')}@tamiya.local`, googleSubId || null, tag);

      // Default coupons for new user
      db.prepare('INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, 10)').run(uuidv4(), uId);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(uId);
    } else if (teamName && teamName !== user.team_name) {
      db.prepare('UPDATE users SET team_name = ? WHERE id = ?').run(teamName.substring(0, 10).toUpperCase(), user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    const coupon = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(user.id);

    res.json({
      success: true,
      data: {
        ...user,
        coupon_balance: coupon?.balance || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update Profile (Racer Tag)
app.post('/api/users/profile', (req, res) => {
  try {
    const { userId, teamName } = req.body;
    if (!userId || !teamName) return res.status(400).json({ success: false, error: 'Data tidak lengkap' });

    db.prepare('UPDATE users SET team_name = ? WHERE id = ?').run(teamName.substring(0, 10).toUpperCase(), userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Cashier: Create Guest / Kid Participant
app.post('/api/users/guest', (req, res) => {
  try {
    const { name, teamName, initialBalance } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nama peserta wajib diisi' });

    const result = RaceManager.registerGuest(name, teamName, initialBalance);
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Cashier: Top Up Coupons
app.post('/api/coupons/topup', (req, res) => {
  try {
    const { userId, amount } = req.body;
    const result = RaceManager.topUpCoupons(userId, amount);
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Participant: Scan Lane QR (Babak 1)
app.post('/api/race/scan', (req, res) => {
  try {
    const { userId, lane } = req.body;
    const result = RaceManager.registerLane(userId, lane);
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Participant: Click "SIAP BALAP"
app.post('/api/race/ready', (req, res) => {
  try {
    const { userId, raceId } = req.body;
    const result = RaceManager.setReady(userId, raceId);
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 9. Participant: Click "BATAL / SALAH JALUR"
app.post('/api/race/cancel', (req, res) => {
  try {
    const { userId } = req.body;
    const result = RaceManager.cancelRegistration(userId);
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. RD: Lock Race ("KUNCI BALAPAN")
app.post('/api/race/lock', (req, res) => {
  try {
    const { raceId } = req.body;
    const result = RaceManager.lockRace(raceId);
    
    // Broadcast specialized lock event for audio/haptic/TV flash
    io.emit('RACE_LOCKED', {
      raceNumber: result.raceNumber,
      message: 'RACE READY - LINTASAN SIAP!',
      timestamp: new Date().toISOString()
    });

    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. RD: Start Physical Race
app.post('/api/race/start', (req, res) => {
  try {
    const { raceId } = req.body;
    const result = RaceManager.startRace(raceId);
    io.emit('RACE_STARTED', { raceNumber: result.raceNumber });
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 12. RD / Juri Finish: Submit Times
app.post('/api/race/finish', (req, res) => {
  try {
    const { raceId, times } = req.body;
    const result = RaceManager.submitFinishTimes(raceId, times);
    
    io.emit('RACE_FINISHED_PENDING_SCRUTINEER', {
      raceNumber: result.raceNumber,
      winner: result.winner
    });

    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 12b. RD: Declare "SEMUA CO / DNF (No Winner)"
app.post('/api/race/all-co', (req, res) => {
  try {
    const { raceId } = req.body;
    const result = RaceManager.declareAllCO(raceId);
    
    io.emit('RACE_ALL_CO', {
      raceNumber: result.raceNumber,
      message: 'SEMUA MOBIL COURSE OUT / DNF - TIDAK ADA PEMENANG',
      timestamp: new Date().toISOString()
    });

    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 12c. RD: Declare "DEKLARASI RE-RACE"
app.post('/api/race/re-race', (req, res) => {
  try {
    const { raceId, lanes } = req.body;
    const result = RaceManager.declareReRace(raceId, lanes);
    
    io.emit('RACE_RERACE_DECLARED', {
      raceNumber: result.raceNumber,
      reRaceLanes: result.reRaceLanes,
      message: `BALAP ULANG (RE-RACE) JALUR [${result.reRaceLanes.join(', ')}]`,
      timestamp: new Date().toISOString()
    });

    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 13. Scrutineer: "LOLOS" (pass) or "DISKUALIFIKASI" (disqualified)
app.post('/api/race/scrutineer', (req, res) => {
  try {
    const { registrationId, action } = req.body;
    const result = RaceManager.handleScrutineerAction(registrationId, action);

    if (result.isNewBTO) {
      io.emit('NEW_BTO_RECORD', {
        userName: result.userName,
        teamName: result.teamName,
        time: result.finishTime
      });
    }

    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 13b. Scrutineer: Lapis 3 Emergency Override (Ambil Alih Hasil dari Meja Juri)
app.post('/api/race/scrutineer-override', (req, res) => {
  try {
    const { raceId, lane, finishTime, action } = req.body;
    const result = RaceManager.scrutineerOverride({ raceId, lane, finishTime, action });

    if (result.isNewBTO) {
      io.emit('NEW_BTO_RECORD', {
        userName: result.winner.userName,
        teamName: result.winner.teamName,
        time: result.winner.finishTime
      });
    }

    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 14. RD Admin Override Panel (Assign / Force Ready / Kick)
app.post('/api/race/override', (req, res) => {
  try {
    const { action, raceId, lane, userId } = req.body;
    const result = RaceManager.adminOverrideLane(action, { raceId, lane, userId });
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 15. RD Advance Bracket Match
app.post('/api/bracket/advance', (req, res) => {
  try {
    const { matchId, winnerId, isFinal } = req.body;
    const result = RaceManager.advanceBracketWinner(matchId, winnerId, { isFinal });
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 16. Countdown Controls (Babak 2 Voice Countdown)
app.post('/api/countdown/start', (req, res) => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  countdownRemaining = 10;
  
  io.emit('COUNTDOWN_STARTED', { seconds: 10, word: INDONESIAN_NUMBERS[10] });

  countdownInterval = setInterval(() => {
    countdownRemaining--;
    if (countdownRemaining >= 1) {
      io.emit('COUNTDOWN_TICK', {
        seconds: countdownRemaining,
        word: INDONESIAN_NUMBERS[countdownRemaining],
        haptic: true
      });
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      io.emit('COUNTDOWN_COMPLETE', { message: 'GO! LEPAS MOBIL!' });
    }
  }, 1000);

  res.json({ success: true, message: 'Countdown dimulai' });
});

app.post('/api/countdown/reset', (req, res) => {
  if (countdownResetCount >= 2) {
    return res.status(400).json({ success: false, error: 'Maksimal 2x reset hitungan mundur telah tercapai!' });
  }
  countdownResetCount++;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownRemaining = 10;

  io.emit('COUNTDOWN_STARTED', { seconds: 10, word: INDONESIAN_NUMBERS[10], resetCount: countdownResetCount });

  countdownInterval = setInterval(() => {
    countdownRemaining--;
    if (countdownRemaining >= 1) {
      io.emit('COUNTDOWN_TICK', {
        seconds: countdownRemaining,
        word: INDONESIAN_NUMBERS[countdownRemaining],
        haptic: true
      });
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      io.emit('COUNTDOWN_COMPLETE', { message: 'GO! LEPAS MOBIL!' });
    }
  }, 1000);

  res.json({ success: true, resetCount: countdownResetCount });
});

app.post('/api/countdown/stop', (req, res) => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdownRemaining = 0;
  io.emit('COUNTDOWN_STOPPED', {
    message: 'RACE READY - LEPAS!',
    status: 'ready_release'
  });
  res.json({ success: true, message: 'Countdown dihentikan. Siap Lepas!' });
});

// Serve frontend static files in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>DGDash Racing System</title></head>
        <body style="background:#0a0b10;color:#00f0ff;font-family:sans-serif;padding:40px;text-align:center;">
          <h1>DGDash Racing System Server Active</h1>
          <p>Client build pending or in development mode. Run Vite dev server or npm run build.</p>
        </body>
        </html>
      `);
    }
  });
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send immediate state snapshot
  socket.emit('STATE_UPDATE', RaceManager.getFullState());

  socket.on('GET_STATE', () => {
    socket.emit('STATE_UPDATE', RaceManager.getFullState());
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🏎️ DGDASH RACING SYSTEM BACKEND ACTIVE`);
  console.log(`📍 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`⚡ Real-time Socket.IO and REST API Ready`);
  console.log(`====================================================`);
});

// Graceful Shutdown Handlers
const shutdown = (signal) => {
  console.log(`\n🛑 [SHUTDOWN] Received ${signal}. Starting graceful termination...`);
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  try {
    db.save();
    console.log('💾 [DB] Database flushed and saved to disk successfully.');
  } catch (err) {
    console.error('❌ [DB] Error saving database during shutdown:', err);
  }
  server.close(() => {
    console.log('🔒 [SERVER] HTTP and WebSocket connections closed cleanly.');
    process.exit(0);
  });
  // Force termination if connections don't close within 5s
  setTimeout(() => {
    console.error('⚠️ [SHUTDOWN] Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
