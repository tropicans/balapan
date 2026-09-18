import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db.js';
import { RaceManager } from './raceManager.js';
import { TicketEngine } from './ticketEngine.js';
import { createEvent, listEvents, getActiveEvent, setActiveEvent, archiveEvent } from './services/eventService.js';
import { registerParticipant, getParticipants, updateParticipant, importParticipants } from './services/participantService.js';
import { recordBtoTime, getBtoLeaderboard, deleteBtoRecord } from './services/btoService.js';
import { registerWinner, undoLastWinnerRegistration, getRegisteredWinners, checkWinnerEligibility } from './services/winnerService.js';
import { parseParticipantCsv } from './utils/csvParser.js';
import { syncParticipantsFromSheet, getSheetSyncConfig } from './services/googleSheetService.js';
import {
  authenticateGoogleUser,
  getUserByToken,
  invalidateSession,
  listAppUsers,
  getAppUserById,
  approveAppUser,
  updateAppUserRole,
  setAppUserStatus
} from './services/authService.js';
import { requireAuth, requireApproved, requireRole } from './middleware/authMiddleware.js';
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
app.use(express.text({ type: ['text/plain', 'text/csv'] }));

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

// 0.1 Authentication Endpoints (Google OAuth & Session)
app.post('/api/auth/google', async (req, res) => {
  try {
    let credential = req.body?.credential || req.body?.id_token || req.body?.token;
    if (!credential && req.body?.mock_user) {
      const email = req.body.mock_user.email || 'user@gmail.com';
      const name = req.body.mock_user.name || 'Test User';
      credential = `mock-google-token:${email}:${name}`;
    }

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential/token wajib dikirim' });
    }
    const result = await authenticateGoogleUser(credential);
    res.json({ success: true, data: result, ...result });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ success: false, error: err.message || 'Autentikasi Google gagal' });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Sesi tidak ditemukan atau token tidak valid' });
    }
    const user = getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesi telah kedaluwarsa atau tidak valid' });
    }
    res.json({ success: true, data: user, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 0.1b Auth Public Config Endpoint (provides Google Client ID to frontend)
app.get('/api/auth/config', (req, res) => {
  res.json({
    success: true,
    data: {
      google_client_id: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ''
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.body?.token || null);
    if (token) {
      invalidateSession(token);
    }
    res.json({ success: true, message: 'Berhasil keluar' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 0.2 Admin User Management Endpoints (Super Admin & Admin only)
app.get('/api/admin/users', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { status, search } = req.query;
    const users = listAppUsers({ status, search });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/users/:id/approve', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = approveAppUser(req.params.id, role, req.user.email);
    io.emit('user:updated', updatedUser);
    res.json({
      success: true,
      user: updatedUser,
      message: `Pengguna berhasil disetujui sebagai ${role}`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/users/:id/role', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = updateAppUserRole(req.params.id, role, req.user);
    io.emit('user:updated', updatedUser);
    res.json({
      success: true,
      user: updatedUser,
      message: `Peran pengguna berhasil diubah menjadi ${role}`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/users/:id/status', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { status } = req.body;
    const updatedUser = setAppUserStatus(req.params.id, status, req.user);
    io.emit('user:updated', updatedUser);
    res.json({
      success: true,
      user: updatedUser,
      message: `Status pengguna berhasil diubah menjadi ${status}`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
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

// 2. Users list for Cashier & RD Search (Decoupled from coupons table)
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.*, 
        0 as coupon_balance
      FROM users u
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

      // New participants start with an empty coupon balance; coupons are issued by the cashier.
      db.prepare('INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, 0)').run(uuidv4(), uId);

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

// 6a. Coupon Packages: Get List with Search & Status Filter
app.get('/api/coupon-packages', (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT 
        cp.*,
        u.name as user_name,
        u.team_name,
        u.email
      FROM coupon_packages cp
      JOIN users u ON cp.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND cp.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (cp.serial_number LIKE ? OR u.name LIKE ? OR u.team_name LIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY cp.created_at DESC LIMIT 200';
    const packages = db.prepare(sql).all(...params);
    res.json({ success: true, data: packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6b. Coupon Packages: Get Suggested Next Serial Number
app.get('/api/coupon-packages/next-serial', (req, res) => {
  try {
    const lastPkg = db.prepare(`
      SELECT serial_number FROM coupon_packages 
      ORDER BY rowid DESC 
      LIMIT 1
    `).get();

    let nextSerial = '001';
    if (lastPkg && lastPkg.serial_number) {
      const match = lastPkg.serial_number.match(/(\d+)$/);
      if (match) {
        const numStr = match[1];
        const nextNum = parseInt(numStr, 10) + 1;
        const prefix = lastPkg.serial_number.slice(0, -numStr.length);
        nextSerial = prefix + String(nextNum).padStart(numStr.length, '0');
      } else {
        nextSerial = `${lastPkg.serial_number}-1`;
      }
    }
    res.json({ success: true, data: { next_serial: nextSerial } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6c. Coupon Packages: Register / Activate New Pre-Printed Package (Cashier)
const handleRegisterPackage = (req, res) => {
  try {
    const {
      serial_number,
      user_id,
      new_user_name,
      team_name,
      total_quota = 50,
      price_paid = 0,
      payment_method = 'cash'
    } = req.body;

    const serial = String(serial_number || '').trim().toUpperCase();
    if (!serial || serial.length < 4 || serial.length > 32) {
      return res.status(400).json({
        success: false,
        error: 'Nomor seri wajib diisi (4-32 karakter alfanumerik)'
      });
    }

    const quota = parseInt(total_quota, 10);
    if (isNaN(quota) || quota <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Total kuota harus berupa angka lebih dari 0'
      });
    }

    // Cek pra-insert untuk mendeteksi nomor seri duplikat (D-03)
    const existing = db.prepare(`
      SELECT cp.*, u.name as racer_name, u.team_name 
      FROM coupon_packages cp 
      JOIN users u ON cp.user_id = u.id 
      WHERE cp.serial_number = ?
    `).get(serial);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'SERIAL_EXISTS',
        message: `Lembar seri #${serial} sudah terdaftar atas nama ${existing.racer_name}.`,
        existing_package: {
          id: existing.id,
          serial_number: existing.serial_number,
          remaining_quota: existing.remaining_quota,
          total_quota: existing.total_quota,
          status: existing.status,
          user_name: existing.racer_name,
          team_name: existing.team_name
        }
      });
    }

    let targetUserId = user_id;

    // Dual mode: New user on-the-fly (D-06)
    if (!targetUserId && new_user_name) {
      const uId = uuidv4();
      const tag = team_name ? team_name.substring(0, 10).toUpperCase() : new_user_name.substring(0, 6).toUpperCase();
      const sanitizedEmail = `${new_user_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}@tamiya.local`;

      db.prepare(`
        INSERT INTO users (id, name, email, google_sub_id, team_name, role, is_virtual)
        VALUES (?, ?, ?, null, ?, 'participant', 0)
      `).run(uId, new_user_name.trim(), sanitizedEmail, tag);

      db.prepare(`
        INSERT INTO coupons (id, user_id, balance)
        VALUES (?, ?, 0)
      `).run(uuidv4(), uId);

      targetUserId = uId;
    } else if (targetUserId) {
      const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
      if (!existingUser) {
        return res.status(404).json({ success: false, error: 'Pembalap tidak ditemukan' });
      }
      const existingCoupon = db.prepare('SELECT id FROM coupons WHERE user_id = ?').get(targetUserId);
      if (!existingCoupon) {
        db.prepare('INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, 0)').run(uuidv4(), targetUserId);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Pilih pembalap terdaftar atau masukkan nama pembalap baru'
      });
    }

    const pkgId = uuidv4();

    // Atomic transaction: Insert package and sync coupon balance (D-07, T-07-02)
    db.transaction(() => {
      db.prepare(`
        INSERT INTO coupon_packages (
          id, serial_number, user_id, total_quota, used_quota,
          remaining_quota, price_paid, payment_method, status, void_from_id
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'active', null)
      `).run(pkgId, serial, targetUserId, quota, quota, price_paid || 0, payment_method || 'cash');

      db.prepare(`
        UPDATE coupons 
        SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `).run(quota, targetUserId);
    })();

    const newPkg = db.prepare(`
      SELECT cp.*, u.name as user_name, u.team_name, u.email
      FROM coupon_packages cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = ?
    `).get(pkgId);

    // Broadcast WebSocket events
    io.emit('coupon_package_updated', { type: 'created', package: newPkg });
    broadcastFullState();

    res.status(201).json({ success: true, data: { package: newPkg } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/coupon-packages', handleRegisterPackage);
app.post('/api/cashier/packages/activate', handleRegisterPackage);

// 6d. Coupon Packages: Emergency Void & Transfer Quota (D-08)
app.post('/api/coupon-packages/:id/void', (req, res) => {
  try {
    const { id } = req.params;
    const { new_serial_number, reason } = req.body;

    const oldPkg = db.prepare('SELECT * FROM coupon_packages WHERE id = ?').get(id);
    if (!oldPkg) {
      return res.status(404).json({ success: false, error: 'Paket kupon tidak ditemukan' });
    }

    if (oldPkg.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Paket tidak dapat di-void karena berstatus '${oldPkg.status}'`
      });
    }

    if (oldPkg.remaining_quota <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Sisa kuota paket sudah habis (0), tidak dapat ditransfer'
      });
    }

    const cleanNewSerial = String(new_serial_number || '').trim().toUpperCase();
    if (!cleanNewSerial || cleanNewSerial.length < 4 || cleanNewSerial.length > 32) {
      return res.status(400).json({
        success: false,
        error: 'Nomor seri lembar baru wajib diisi (4-32 karakter alfanumerik)'
      });
    }

    // Cek keunikan nomor seri baru
    const serialConflict = db.prepare('SELECT id FROM coupon_packages WHERE serial_number = ?').get(cleanNewSerial);
    if (serialConflict) {
      return res.status(409).json({
        success: false,
        error: 'SERIAL_EXISTS',
        message: `Nomor seri baru #${cleanNewSerial} sudah terdaftar dalam sistem.`
      });
    }

    const newPkgId = uuidv4();

    // Atomic transaction: Void old package and create replacement with carried quota (D-08, T-07-03)
    // Note: Saldo digital user di tabel coupons TIDAK DIUBAH karena sisa kuota hanya dialihkan ke fisik baru.
    db.transaction(() => {
      db.prepare(`
        UPDATE coupon_packages 
        SET status = 'void', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(oldPkg.id);

      db.prepare(`
        INSERT INTO coupon_packages (
          id, serial_number, user_id, total_quota, used_quota,
          remaining_quota, price_paid, payment_method, status, void_from_id
        ) VALUES (?, ?, ?, ?, 0, ?, 0, 'transfer_void', 'active', ?)
      `).run(newPkgId, cleanNewSerial, oldPkg.user_id, oldPkg.remaining_quota, oldPkg.remaining_quota, oldPkg.id);
    })();

    const newPkg = db.prepare(`
      SELECT cp.*, u.name as user_name, u.team_name, u.email
      FROM coupon_packages cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = ?
    `).get(newPkgId);

    // Broadcast WebSocket events
    io.emit('coupon_package_updated', {
      type: 'voided',
      old_id: oldPkg.id,
      new_package: newPkg,
      reason: reason || null
    });
    broadcastFullState();

    res.json({ success: true, data: { new_package: newPkg } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// ====================================================
// 17. MARSHAL & JURI FINISH RAPID CHECK-OFF APIs (PHASE 08)
// ====================================================

// 17a. Record Round 1 Winner via Coupon Serial Number & Lane (MRSH-02, MRSH-03)
app.post('/api/marshal/record-winner', (req, res) => {
  try {
    const { serial_number, lane, heat_number } = req.body;

    if (!lane || !['A', 'B', 'C'].includes(lane)) {
      return res.status(400).json({
        success: false,
        error: 'Jalur kemenangan tidak valid. Harus Jalur A, B, atau C'
      });
    }

    const cleanSerial = String(serial_number || '').trim().toUpperCase();
    if (!cleanSerial) {
      return res.status(400).json({
        success: false,
        error: 'Nomor seri kupon wajib diisi'
      });
    }

    // Lookup active coupon package
    const pkg = db.prepare(`
      SELECT cp.*, u.name as user_name, u.team_name, u.email
      FROM coupon_packages cp
      JOIN users u ON cp.user_id = u.id
      WHERE UPPER(TRIM(cp.serial_number)) = ?
    `).get(cleanSerial);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: 'KUPON BELUM TERDAFTAR DI KASIR',
        code: 'COUPON_NOT_FOUND'
      });
    }

    if (pkg.status === 'void' || pkg.remaining_quota <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Kuota Kupon Telah Habis atau Lembar Void'
      });
    }

    const logId = uuidv4();
    const newUsed = pkg.used_quota + 1;
    const newRemaining = pkg.remaining_quota - 1;
    const newStatus = newRemaining === 0 ? 'completed' : 'active';
    const boxNumber = newUsed;
    const nowIso = new Date().toISOString();

    // Atomic transaction: debit package quota, sync coupons balance, issue ticket into Round 2 bracket, and record log
    let ticket = null;
    db.transaction(() => {
      db.prepare(`
        UPDATE coupon_packages 
        SET used_quota = ?, remaining_quota = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newUsed, newRemaining, newStatus, pkg.id);

      db.prepare(`
        UPDATE coupons 
        SET balance = MAX(0, balance - 1), updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `).run(pkg.user_id);

      // Issue Next Round Ticket (TKET-01, TKET-02, D-01, D-08)
      ticket = TicketEngine.issueTicket({
        userId: pkg.user_id,
        packageId: pkg.id,
        serialNumber: pkg.serial_number,
        lane,
        source: 'marshal',
        heatNumber: heat_number || null
      });

      db.prepare(`
        INSERT INTO marshal_winner_logs (
          id, package_id, serial_number, user_id, lane, heat_number, box_number, status, ticket_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(logId, pkg.id, pkg.serial_number, pkg.user_id, lane, heat_number || null, boxNumber, ticket.id, nowIso);
    })();

    const winnerData = {
      log_id: logId,
      serial_number: pkg.serial_number,
      user_id: pkg.user_id,
      user_name: pkg.user_name,
      team_name: pkg.team_name,
      lane,
      heat_number: heat_number || null,
      box_number: boxNumber,
      remaining_quota: newRemaining,
      total_quota: pkg.total_quota,
      ticket: ticket || null
    };

    io.emit('marshal:winner-recorded', {
      winner: winnerData,
      timestamp: nowIso
    });

    if (ticket) {
      const stats = TicketEngine.getTicketStats();
      io.emit('ticket:granted', {
        ticket,
        stats
      });
    }

    broadcastFullState();

    res.json({
      success: true,
      message: 'Pemenang heat berhasil dicatat',
      data: winnerData
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 17b. Undo Last Winner within 60s Window (MRSH-03, D-09, D-10)
app.post('/api/marshal/undo-last-winner', (req, res) => {
  try {
    const { log_id } = req.body;

    let log = null;
    if (log_id) {
      log = db.prepare(`SELECT * FROM marshal_winner_logs WHERE id = ? AND status = 'active'`).get(log_id);
    } else {
      log = db.prepare(`SELECT * FROM marshal_winner_logs WHERE status = 'active' ORDER BY created_at DESC, rowid DESC LIMIT 1`).get();
    }

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Tidak ada catatan pemenang aktif untuk dibatalkan'
      });
    }

    // 60 seconds time window verification
    const createdAtMs = new Date(log.created_at).getTime();
    const elapsedSeconds = (Date.now() - createdAtMs) / 1000;
    if (elapsedSeconds > 60) {
      return res.status(400).json({
        success: false,
        error: 'Koreksi Kedaluwarsa (>60s)'
      });
    }

    // Atomic transaction: void ticket (which frees bracket slot, restores quota & coupon balance), and mark log as undone
    let voidedTicket = null;
    db.transaction(() => {
      let ticketId = log.ticket_id;
      if (!ticketId) {
        const activeTicket = db.prepare(`
          SELECT id FROM next_round_tickets 
          WHERE user_id = ? AND package_id = ? AND status = 'issued' 
          ORDER BY created_at DESC, rowid DESC LIMIT 1
        `).get(log.user_id, log.package_id);
        ticketId = activeTicket?.id;
      }

      if (ticketId) {
        voidedTicket = TicketEngine.voidTicket(ticketId, 'Marshal 60s Undo');
      } else {
        // Fallback if no ticket was associated
        db.prepare(`
          UPDATE coupon_packages 
          SET used_quota = MAX(0, used_quota - 1), 
              remaining_quota = remaining_quota + 1, 
              status = 'active', 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(log.package_id);

        db.prepare(`
          UPDATE coupons 
          SET balance = balance + 1, 
              updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `).run(log.user_id);
      }

      db.prepare(`
        UPDATE marshal_winner_logs 
        SET status = 'undone' 
        WHERE id = ?
      `).run(log.id);
    })();

    const updatedPkg = db.prepare(`SELECT remaining_quota FROM coupon_packages WHERE id = ?`).get(log.package_id);

    io.emit('marshal:winner-undone', {
      log_id: log.id,
      serial_number: log.serial_number
    });

    if (voidedTicket) {
      io.emit('ticket:voided', {
        ticketId: voidedTicket.ticketId,
        ticketNumber: voidedTicket.ticketNumber,
        reason: 'Marshal 60s Undo'
      });
    }

    broadcastFullState();

    res.json({
      success: true,
      message: 'Pemenang heat berhasil dibatalkan dan kuota kupon dikembalikan',
      data: {
        log_id: log.id,
        serial_number: log.serial_number,
        remaining_quota: updatedPkg ? updatedPkg.remaining_quota : null,
        voided_ticket: voidedTicket
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17c. Recent Winners Log (Last 5)
app.get('/api/marshal/recent-winners', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        mwl.*, 
        u.name as user_name, 
        u.team_name,
        cp.total_quota, 
        cp.remaining_quota
      FROM marshal_winner_logs mwl
      JOIN users u ON mwl.user_id = u.id
      JOIN coupon_packages cp ON mwl.package_id = cp.id
      ORDER BY mwl.created_at DESC, mwl.rowid DESC
      LIMIT 5
    `).all();

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17d. Active Round 2 Bracket Match (MRSH-04, D-11)
app.get('/api/marshal/active-bracket-match', (req, res) => {
  try {
    const match = db.prepare(`
      SELECT bm.*, 
        u1.name as user_1_name, u1.team_name as user_1_team,
        u2.name as user_2_name, u2.team_name as user_2_team,
        u3.name as user_3_name, u3.team_name as user_3_team
      FROM bracket_matches bm
      LEFT JOIN users u1 ON bm.user_id_1 = u1.id
      LEFT JOIN users u2 ON bm.user_id_2 = u2.id
      LEFT JOIN users u3 ON bm.user_id_3 = u3.id
      WHERE bm.status = 'pending'
      ORDER BY bm.round_number ASC, bm.match_number ASC
      LIMIT 1
    `).get();

    res.json({ success: true, data: { match: match || null } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17e. 1-Tap Winner Selection for Round 2 Bracket Match (MRSH-04, D-12)
app.post('/api/marshal/record-bracket-winner', (req, res) => {
  try {
    const { match_id, winner_id } = req.body;
    if (!match_id || !winner_id) {
      return res.status(400).json({
        success: false,
        error: 'match_id dan winner_id wajib diisi'
      });
    }

    const result = RaceManager.advanceBracketWinner(match_id, winner_id);
    io.emit('bracket_updated', { match_id, winner_id, result });
    broadcastFullState();

    res.json({
      success: true,
      message: 'Pemenang match bracket berhasil dicatat',
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 17f. Marshal Start Box Registration & Debit
app.post('/api/marshal/register-box', (req, res) => {
  try {
    const { serial_number, lane, box_number } = req.body;
    if (!lane || !['A', 'B', 'C'].includes(lane.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Jalur tidak valid (harus A, B, atau C)' });
    }
    const cleanSerial = String(serial_number || '').trim().toUpperCase();
    if (!cleanSerial) {
      return res.status(400).json({ success: false, error: 'Nomor seri kupon wajib diisi' });
    }

    const pkg = db.prepare(`
      SELECT cp.*, u.name as user_name, u.team_name 
      FROM coupon_packages cp
      JOIN users u ON cp.user_id = u.id
      WHERE UPPER(TRIM(cp.serial_number)) = ?
    `).get(cleanSerial);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: 'KUPON BELUM TERDAFTAR DI KASIR',
        code: 'COUPON_NOT_FOUND'
      });
    }

    if (pkg.status === 'void' || pkg.remaining_quota <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Kuota Kupon Telah Habis atau Lembar Void'
      });
    }

    // Ensure coupon balance in coupons table is at least 1 so registerLane passes
    const userCoupon = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(pkg.user_id);
    if (!userCoupon || userCoupon.balance < 1) {
      db.prepare('UPDATE coupons SET balance = 1 WHERE user_id = ?').run(pkg.user_id);
    }

    // Register into race lane
    const regResult = RaceManager.registerLane(pkg.user_id, lane.toUpperCase());

    // Auto set ready so race can start smoothly
    try {
      RaceManager.setReady(pkg.user_id);
    } catch (e) {}

    // Record marshal box log / debit quota
    const newUsed = pkg.used_quota + 1;
    const newRemaining = Math.max(0, pkg.remaining_quota - 1);
    const newStatus = newRemaining === 0 ? 'depleted' : 'active';
    const logId = uuidv4();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO marshal_winner_logs (
          id, package_id, serial_number, user_id, lane, box_number, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'active')
      `).run(logId, pkg.id, cleanSerial, pkg.user_id, lane.toUpperCase(), box_number || newUsed);

      db.prepare(`
        UPDATE coupon_packages 
        SET used_quota = ?, remaining_quota = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newUsed, newRemaining, newStatus, pkg.id);

      db.prepare(`
        UPDATE coupons 
        SET balance = MAX(0, balance - 1), updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(pkg.user_id);
    })();

    broadcastFullState();

    res.json({
      success: true,
      data: {
        registration: regResult,
        box_number: box_number || newUsed,
        remaining_quota: newRemaining,
        user_name: pkg.user_name,
        lane: lane.toUpperCase(),
        serial_number: cleanSerial
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 18a. Get Next Round Tickets & Statistics (TKET-01, TKET-02, D-05, D-06)
app.get('/api/tickets', (req, res) => {
  try {
    const stats = TicketEngine.getTicketStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18b. Lock Qualifying Stage & Finalize Round 2 Bracket (D-12, D-13)
app.post('/api/tickets/lock-qualifying', (req, res) => {
  try {
    const result = TicketEngine.lockQualifyingStage(io);
    broadcastFullState();
    res.json({
      success: true,
      message: 'Kualifikasi Babak 1 berhasil dikunci. Bagan Babak 2 telah difinalisasi.',
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18c. Unlock Qualifying Stage (Admin Reset)
app.post('/api/tickets/unlock-qualifying', (req, res) => {
  try {
    const result = TicketEngine.unlockQualifyingStage(io);
    broadcastFullState();
    res.json({
      success: true,
      message: 'Kualifikasi Babak 1 berhasil dibuka kembali.',
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19. Event Management Endpoints (Phase 11: EVNT-01, EVNT-02)
// 19a. List all events
app.get('/api/events', (req, res) => {
  try {
    const events = listEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19b. Create event
app.post('/api/events', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const { nama, tanggal, catatan, jumlah_lap } = req.body || {};
    const created = createEvent({ nama, tanggal, catatan, jumlah_lap });
    broadcastFullState();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 19c. Activate event
app.post('/api/events/:id/activate', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const activated = setActiveEvent(req.params.id);
    broadcastFullState();
    res.json({ success: true, data: activated });
  } catch (err) {
    const status = err.message === 'Event tidak ditemukan' ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// 19d. Archive event
app.post('/api/events/:id/archive', requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const archived = archiveEvent(req.params.id);
    broadcastFullState();
    res.json({ success: true, data: archived });
  } catch (err) {
    const status = err.message === 'Event tidak ditemukan' ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ====================================================
// 20. PARTICIPANT REGISTRATION & AUTO-NUMBERING (PHASE 12)
// ====================================================

// 20a. Register single participant (PARN-01, PARN-02, D-01, D-02)
app.post('/api/participants', requireRole('cashier', 'admin', 'super_admin'), (req, res) => {
  try {
    const { name, team_name, event_id } = req.body || {};
    const participant = registerParticipant({ name, team_name, event_id });
    io.emit('participant_registered', participant);
    broadcastFullState();
    res.status(201).json({ success: true, data: participant });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 20b. List participants with omni-search (PARN-03, D-06)
app.get('/api/participants', (req, res) => {
  try {
    const { event_id, search, limit, offset } = req.query;
    const result = getParticipants({
      event_id,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20c. Update participant typo (name / team only) (D-12)
app.put('/api/participants/:id', requireRole('cashier', 'admin', 'super_admin'), (req, res) => {
  try {
    const { name, team_name } = req.body || {};
    const updated = updateParticipant(req.params.id, { name, team_name });
    io.emit('participant_updated', updated);
    broadcastFullState();
    res.json({ success: true, data: updated });
  } catch (err) {
    const status = err.message === 'Peserta tidak ditemukan' ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// 20d. Preview CSV import (PARN-05, D-08)
app.post('/api/participants/import-preview', requireRole('cashier', 'admin', 'super_admin'), (req, res) => {
  try {
    const csvText = typeof req.body === 'string' ? req.body : (req.body?.csv || '');
    if (!csvText || !csvText.trim()) {
      return res.status(400).json({ success: false, error: 'Data CSV tidak boleh kosong' });
    }
    const preview = parseParticipantCsv(csvText);
    res.json({
      success: true,
      data: {
        valid: preview.valid,
        skipped: preview.skipped,
        totalRows: preview.valid.length + preview.skipped.length
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 20e. Batch import participants into active event (PARN-05, D-07, D-09)
app.post('/api/participants/import', requireRole('cashier', 'admin', 'super_admin'), (req, res) => {
  try {
    const { participants, csv, event_id } = req.body || {};
    let participantsList = participants;
    if ((!participantsList || !participantsList.length) && csv) {
      const preview = parseParticipantCsv(csv);
      participantsList = preview.valid;
    }
    if (!Array.isArray(participantsList) || participantsList.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data peserta yang valid untuk di-import' });
    }
    const result = importParticipants(participantsList, { event_id });
    io.emit('participants_imported', {
      count: result.count,
      event_id: result.imported[0]?.event_id || event_id
    });
    broadcastFullState();
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 20f. Get Google Sheet sync status & configuration
app.get('/api/participants/sync-sheet/status', (req, res) => {
  try {
    const config = getSheetSyncConfig();
    const activeEvent = getActiveEvent();
    res.json({
      success: true,
      data: {
        ...config,
        activeEvent: activeEvent ? { id: activeEvent.id, nama: activeEvent.nama } : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20g. Sync participants directly from Google Sheets (SYNC-01 to SYNC-07)
app.post('/api/participants/sync-sheet', requireRole('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { sheet_url, event_id, csv_override } = req.body || {};
    const result = await syncParticipantsFromSheet({ sheet_url, event_id, csv_override });

    if (result.addedCount > 0) {
      io.emit('participants_imported', {
        count: result.addedCount,
        event_id: result.targetEventId
      });
      broadcastFullState();
    }

    res.json({
      success: true,
      message: `Sinkronisasi selesai: ${result.addedCount} pembalap baru ditambahkan, ${result.skippedCount} dilewati/duplikat.`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ====================================================
// Phase 13: Manual BTO Backend & Leaderboard (BTO-01 to BTO-04)
// ====================================================

// 21a. Record or update manual BTO time (personal best policy)
app.post('/api/bto', requireRole('scrutineer', 'race_director', 'admin', 'super_admin'), (req, res) => {
  try {
    const { participant_number, user_id, finish_time, recorded_by, event_id } = req.body || {};
    const result = recordBtoTime({ participant_number, user_id, finish_time, recorded_by, event_id });

    if (result.is_new_overall_record) {
      io.emit('NEW_BTO_RECORD', {
        userName: result.participant.name,
        teamName: result.participant.team_name,
        time: result.record.finish_time,
        participantNumber: result.participant.participant_number,
        rank: 1
      });
    }

    if (result.updated) {
      io.emit('bto:updated', {
        type: 'record_updated',
        record: result.record,
        participant: result.participant,
        is_new_overall_record: result.is_new_overall_record
      });
    }

    broadcastFullState();
    res.status(result.updated ? 201 : 200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 21b. Get BTO Leaderboard for active event
app.get('/api/bto/leaderboard', (req, res) => {
  try {
    const { event_id, limit } = req.query;
    const leaderboard = getBtoLeaderboard({ event_id, limit });
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21c. Delete BTO record (official correction)
app.delete('/api/bto/:id', requireRole('scrutineer', 'race_director', 'admin', 'super_admin'), (req, res) => {
  try {
    const result = deleteBtoRecord(req.params.id);
    io.emit('bto:updated', { type: 'record_deleted', id: req.params.id });
    broadcastFullState();
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.message === 'Catatan BTO tidak ditemukan' ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ====================================================
// Phase 14: Winner Registration & Bracket Execution (WREG-01 to WREG-06, BRKT-01 to BRKT-03)
// ====================================================

// 22a. Register Winner by Participant Number and Round (Milestone v3.2)
app.post('/api/winners/register', requireRole('marshal', 'race_director', 'admin', 'super_admin'), (req, res) => {
  try {
    const { participant_number, round, event_id } = req.body || {};
    const result = registerWinner({ participant_number, round, event_id });

    io.emit('winner_registered', result);
    io.emit('bracket_updated');
    broadcastFullState();
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22b. Undo Last Winner Registration (optionally filtered by round)
app.post('/api/winners/undo', requireRole('marshal', 'race_director', 'admin', 'super_admin'), (req, res) => {
  try {
    const { round, event_id } = req.body || {};
    const result = undoLastWinnerRegistration({ round, event_id });

    io.emit('winner_undone', result);
    io.emit('bracket_updated');
    broadcastFullState();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22c. Get List of Registered Winners (optionally filtered by round)
app.get('/api/winners', (req, res) => {
  try {
    const { round, event_id } = req.query;
    const winners = getRegisteredWinners({ round, event_id });
    res.json({ success: true, data: winners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 22c2. Check Participant Eligibility for Target Round
app.get('/api/winners/eligibility', (req, res) => {
  try {
    const { participant_number, round, event_id } = req.query;
    const eligibility = checkWinnerEligibility({ participant_number, round, event_id });
    res.json({ success: true, data: eligibility });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22d. Advance Bracket Match Winner (BRKT-01, BRKT-02 - no lock required)
app.post('/api/bracket/advance', requireRole('race_director', 'admin', 'super_admin'), (req, res) => {
  try {
    const { match_id, matchId, winner_id, winnerId, isFinal, autoAdvance } = req.body || {};
    const mId = match_id || matchId;
    const wId = winner_id || winnerId;
    // In physical tournament (v3.2), winners do not auto-advance to next round unless autoAdvance is explicitly true
    const shouldAutoAdvance = autoAdvance === true;
    const result = RaceManager.advanceBracketWinner(mId, wId, { isFinal, autoAdvance: shouldAutoAdvance });

    io.emit('bracket_updated');
    broadcastFullState();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22e. Finalize & Lock Round (RDELIM-04, D-01, D-05)
app.post('/api/bracket/lock-round', requireRole('race_director', 'admin', 'super_admin'), async (req, res) => {
  try {
    const round = parseInt(req.body?.round) || 2;
    const result = RaceManager.lockRound(round);
    io.emit(`round${round}:locked`, { round, timestamp: new Date().toISOString() });
    io.emit('bracket_updated');
    broadcastFullState();
    res.json({ success: true, data: result, message: `Babak ${round} berhasil difinalisasi dan dikunci.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22f. Emergency Unlock Round (RDELIM-04, D-03, D-05)
app.post('/api/bracket/unlock-round', requireRole('race_director', 'admin', 'super_admin'), async (req, res) => {
  try {
    const round = parseInt(req.body?.round) || 2;
    const result = RaceManager.unlockRound(round);
    io.emit(`round${round}:unlocked`, { round, timestamp: new Date().toISOString() });
    io.emit('bracket_updated');
    broadcastFullState();
    res.json({ success: true, data: result, message: `Kunci Babak ${round} berhasil dibuka.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22g. Get Round Progress Metadata (RDELIM-04, D-04)
app.get('/api/bracket/progress', (req, res) => {
  try {
    const round = parseInt(req.query?.round) || 2;
    const progress = RaceManager.getRoundProgress(round);
    res.json({ success: true, data: progress });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 22h. Reset / Reopen Bracket Match (Re-race / Winner Correction)
app.post('/api/bracket/reset', requireRole('race_director', 'admin', 'super_admin'), (req, res) => {
  try {
    const { match_id, matchId } = req.body || {};
    const mId = match_id || matchId;
    if (!mId) {
      return res.status(400).json({ success: false, error: 'matchId wajib diisi' });
    }
    const result = RaceManager.resetBracketMatch(mId);

    io.emit('bracket_updated');
    broadcastFullState();
    res.json({ success: true, data: result, message: 'Heat berhasil dibuka kembali.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
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

export { app, server, io };
