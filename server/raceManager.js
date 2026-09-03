import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

export class RaceManager {
  // Get currently active race (draft, pre-start, locked) or latest race
  static getActiveRace() {
    let race = db.prepare(`
      SELECT * FROM races 
      WHERE status IN ('draft', 'pre-start', 'locked') 
      ORDER BY race_number ASC 
      LIMIT 1
    `).get();

    // If no active race, create or fetch next race
    if (!race) {
      const maxRace = db.prepare('SELECT MAX(race_number) as max_num FROM races').get();
      const nextNum = (maxRace?.max_num || 0) + 1;
      const raceId = uuidv4();
      db.prepare(`
        INSERT INTO races (id, race_number, status)
        VALUES (?, ?, 'draft')
      `).run(raceId, nextNum);
      race = db.prepare('SELECT * FROM races WHERE id = ?').get(raceId);
    }

    // Fetch registrations with user details
    const registrations = db.prepare(`
      SELECT 
        rr.id, rr.race_id, rr.user_id, rr.lane, rr.status, rr.finish_time, rr.scrutineer_status,
        u.name as user_name, u.team_name, u.email, u.is_virtual,
        c.balance as coupon_balance
      FROM race_registrations rr
      JOIN users u ON rr.user_id = u.id
      LEFT JOIN coupons c ON c.user_id = u.id
      WHERE rr.race_id = ?
      ORDER BY rr.lane ASC
    `).all(race.id);

    return {
      ...race,
      registrations
    };
  }

  // Get full state snapshot for TV, RD, and Clients
  static getFullState() {
    const activeRace = this.getActiveRace();

    // Top 5 Best Time Overall (BTO) - Only verified PASS scrutineer status
    const btoLeaderboard = db.prepare(`
      SELECT 
        rr.id, rr.finish_time, rr.lane, rr.race_id,
        u.id as user_id, u.name as user_name, u.team_name,
        r.race_number
      FROM race_registrations rr
      JOIN users u ON rr.user_id = u.id
      JOIN races r ON rr.race_id = r.id
      WHERE rr.scrutineer_status = 'pass' AND rr.finish_time IS NOT NULL AND rr.finish_time > 0
      ORDER BY rr.finish_time ASC
      LIMIT 5
    `).all();

    // Upcoming queue (races after active race or pending registrations)
    const upcomingRaces = db.prepare(`
      SELECT 
        r.id, r.race_number, r.status,
        (
          SELECT json_group_array(
            json_object(
              'lane', rr2.lane, 
              'user_name', u2.name, 
              'team_name', u2.team_name,
              'status', rr2.status
            )
          )
          FROM race_registrations rr2
          JOIN users u2 ON rr2.user_id = u2.id
          WHERE rr2.race_id = r.id
        ) as racers_json
      FROM races r
      WHERE r.race_number > ?
      ORDER BY r.race_number ASC
      LIMIT 3
    `).all(activeRace.race_number).map(r => ({
      ...r,
      racers: r.racers_json ? JSON.parse(r.racers_json) : []
    }));

    // Scrutineering Queue (Racers waiting for car inspection: winners or finished racers)
    const scrutineerQueue = db.prepare(`
      SELECT 
        rr.id as registration_id, rr.lane, rr.finish_time, rr.scrutineer_status,
        r.id as race_id, r.race_number, r.status as race_status,
        u.id as user_id, u.name as user_name, u.team_name, u.email
      FROM race_registrations rr
      JOIN races r ON rr.race_id = r.id
      JOIN users u ON rr.user_id = u.id
      WHERE rr.scrutineer_status = 'pending'
      ORDER BY r.race_number DESC, rr.finish_time ASC
    `).all();

    // Bracket matches
    const bracketMatches = db.prepare(`
      SELECT 
        bm.*,
        u1.name as user_1_name, u1.team_name as user_1_team,
        u2.name as user_2_name, u2.team_name as user_2_team,
        u3.name as user_3_name, u3.team_name as user_3_team,
        w.name as winner_name
      FROM bracket_matches bm
      LEFT JOIN users u1 ON bm.user_id_1 = u1.id
      LEFT JOIN users u2 ON bm.user_id_2 = u2.id
      LEFT JOIN users u3 ON bm.user_id_3 = u3.id
      LEFT JOIN users w ON bm.winner_id = w.id
      ORDER BY bm.round_number ASC, bm.match_number ASC
    `).all();

    return {
      activeRace,
      btoLeaderboard,
      upcomingRaces,
      scrutineerQueue,
      bracketMatches,
      serverTime: new Date().toISOString()
    };
  }

  // Participant scans a lane QR (A, B, C)
  static registerLane(userId, lane) {
    lane = lane.toUpperCase();
    if (!['A', 'B', 'C'].includes(lane)) {
      throw new Error('Jalur tidak valid (harus A, B, atau C)');
    }

    // Check user coupons
    const coupon = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(userId);
    if (!coupon || coupon.balance < 1) {
      throw new Error('Saldo Kupon Habis! Silakan top up di meja kasir.');
    }

    // Check if user is already registered in active race
    let targetRace = this.getActiveRace();

    const existingInActive = db.prepare(`
      SELECT id, lane FROM race_registrations 
      WHERE race_id = ? AND user_id = ?
    `).get(targetRace.id, userId);

    if (existingInActive) {
      if (existingInActive.lane === lane) {
        return { success: true, message: `Anda sudah terdaftar di Jalur ${lane}`, raceNumber: targetRace.race_number, lane };
      }
      throw new Error(`Anda sudah terdaftar di Jalur ${existingInActive.lane} pada Race ${targetRace.race_number}. Batal dulu jika ingin ganti.`);
    }

    // Check if target lane in active race is occupied
    const occupiedInActive = db.prepare(`
      SELECT id FROM race_registrations WHERE race_id = ? AND lane = ?
    `).get(targetRace.id, lane);

    let assignedRaceNumber = targetRace.race_number;
    let assignedRaceId = targetRace.id;

    if (occupiedInActive || targetRace.status !== 'draft') {
      // Find next available race or create one
      let nextRace = db.prepare(`
        SELECT r.id, r.race_number FROM races r
        WHERE r.race_number > ? AND NOT EXISTS (
          SELECT 1 FROM race_registrations rr WHERE rr.race_id = r.id AND rr.lane = ?
        )
        ORDER BY r.race_number ASC
        LIMIT 1
      `).get(targetRace.race_number, lane);

      if (!nextRace) {
        const maxRace = db.prepare('SELECT MAX(race_number) as max_num FROM races').get();
        const nextNum = Math.max(targetRace.race_number + 1, (maxRace?.max_num || 0) + 1);
        const newRaceId = uuidv4();
        db.prepare(`
          INSERT INTO races (id, race_number, status)
          VALUES (?, ?, 'draft')
        `).run(newRaceId, nextNum);
        assignedRaceId = newRaceId;
        assignedRaceNumber = nextNum;
      } else {
        assignedRaceId = nextRace.id;
        assignedRaceNumber = nextRace.race_number;
      }
    }

    // Insert registration
    const regId = uuidv4();
    try {
      db.prepare(`
        INSERT INTO race_registrations (id, race_id, user_id, lane, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(regId, assignedRaceId, userId, lane);

      const pushedToNext = assignedRaceNumber !== targetRace.race_number;

      return {
        success: true,
        registrationId: regId,
        raceNumber: assignedRaceNumber,
        lane,
        pushedToNext,
        message: pushedToNext
          ? `Jalur ${lane} terisi, Anda masuk ke antrean Race ${assignedRaceNumber}`
          : `Berhasil mendaftar di Jalur ${lane} (Race ${assignedRaceNumber})`
      };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        // Concurrency retry on next race
        return this.registerLane(userId, lane);
      }
      throw err;
    }
  }

  // Participant clicks "SIAP BALAP"
  static setReady(userId, raceId = null) {
    let race = raceId ? db.prepare('SELECT * FROM races WHERE id = ?').get(raceId) : this.getActiveRace();
    if (!race) throw new Error('Balapan tidak ditemukan');

    const reg = db.prepare(`
      SELECT * FROM race_registrations WHERE race_id = ? AND user_id = ?
    `).get(race.id, userId);

    if (!reg) throw new Error('Anda belum terdaftar di balapan ini');

    db.prepare(`
      UPDATE race_registrations SET status = 'ready' WHERE id = ?
    `).run(reg.id);

    return { success: true, lane: reg.lane, raceNumber: race.race_number };
  }

  // Participant clicks "BATAL / SALAH JALUR"
  static cancelRegistration(userId) {
    const activeRace = this.getActiveRace();

    // Check if user is in active race or future race with 'draft' status
    const reg = db.prepare(`
      SELECT rr.id, rr.race_id, rr.lane, r.status as race_status, r.race_number
      FROM race_registrations rr
      JOIN races r ON rr.race_id = r.id
      WHERE rr.user_id = ? AND r.status = 'draft'
      ORDER BY r.race_number ASC
      LIMIT 1
    `).get(userId);

    if (!reg) {
      throw new Error('Pendaftaran tidak dapat dibatalkan (balapan sudah dikunci atau tidak ada pendaftaran)');
    }

    db.prepare('DELETE FROM race_registrations WHERE id = ?').run(reg.id);

    return {
      success: true,
      message: `Pendaftaran Jalur ${reg.lane} pada Race ${reg.race_number} telah dibatalkan. Kupon utuh.`
    };
  }

  // RD locks race: "KUNCI BALAPAN"
  static lockRace(raceId = null) {
    const race = raceId ? db.prepare('SELECT * FROM races WHERE id = ?').get(raceId) : this.getActiveRace();
    if (!race) throw new Error('Tidak ada balapan aktif');
    if (race.status !== 'draft') throw new Error(`Status balapan saat ini sudah '${race.status}'`);

    const regs = db.prepare(`
      SELECT rr.id, rr.user_id, rr.lane, c.balance
      FROM race_registrations rr
      JOIN coupons c ON c.user_id = rr.user_id
      WHERE rr.race_id = ?
    `).all(race.id);

    if (regs.length === 0) {
      throw new Error('Tidak ada pembalap yang terdaftar di lintasan!');
    }

    // Execute atomic transaction: deduct 1 coupon from all competitors and lock race
    const deductTx = db.transaction(() => {
      // Deduct 1 coupon
      const deductCoupon = db.prepare('UPDATE coupons SET balance = balance - 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND balance >= 1');
      for (const reg of regs) {
        const res = deductCoupon.run(reg.user_id);
        if (res.changes === 0) {
          throw new Error(`Saldo kupon pembalap di Jalur ${reg.lane} tidak mencukupi untuk dikunci.`);
        }
      }

      // Update race status to pre-start
      db.prepare(`
        UPDATE races SET status = 'pre-start' WHERE id = ?
      `).run(race.id);
    });

    deductTx();

    return {
      success: true,
      raceNumber: race.race_number,
      status: 'pre-start',
      lockedLanes: regs.map(r => r.lane)
    };
  }

  // RD starts physical race: updates to 'locked' (race in progress)
  static startRace(raceId = null) {
    const race = raceId ? db.prepare('SELECT * FROM races WHERE id = ?').get(raceId) : this.getActiveRace();
    if (!race) throw new Error('Tidak ada balapan aktif');

    db.prepare(`UPDATE races SET status = 'locked' WHERE id = ?`).run(race.id);
    return { success: true, raceNumber: race.race_number, status: 'locked' };
  }

  // RD/Juri Finish submits times
  static submitFinishTimes(raceId, times) {
    // times = { A: 11.450, B: 12.100, C: null }
    const race = db.prepare('SELECT * FROM races WHERE id = ?').get(raceId);
    if (!race) throw new Error('Balapan tidak ditemukan');

    const regs = db.prepare(`
      SELECT rr.*, u.name as user_name
      FROM race_registrations rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.race_id = ?
    `).all(race.id);

    if (regs.length === 0) throw new Error('Tidak ada peserta di balapan ini');

    let validTimes = [];

    const updateStmt = db.prepare(`
      UPDATE race_registrations 
      SET finish_time = ?, scrutineer_status = ?
      WHERE id = ?
    `);

    const updateTx = db.transaction(() => {
      for (const reg of regs) {
        const rawTime = times[reg.lane];
        const timeVal = rawTime ? parseFloat(rawTime) : null;
        
        if (timeVal && !isNaN(timeVal) && timeVal > 0) {
          validTimes.push({ ...reg, finish_time: timeVal });
        }
        
        // Default scrutineer status: null unless valid time
        updateStmt.run(timeVal, null, reg.id);
      }

      // Determine Winner (lowest finish time)
      if (validTimes.length > 0) {
        validTimes.sort((a, b) => a.finish_time - b.finish_time);
        const winner = validTimes[0];

        // Mark winner as pending scrutineering
        db.prepare(`
          UPDATE race_registrations 
          SET scrutineer_status = 'pending' 
          WHERE id = ?
        `).run(winner.id);

        db.prepare(`
          UPDATE races 
          SET winner_id = ? 
          WHERE id = ?
        `).run(winner.user_id, race.id);
      }
    });

    updateTx();

    return {
      success: true,
      raceNumber: race.race_number,
      winner: validTimes[0] ? {
        userId: validTimes[0].user_id,
        userName: validTimes[0].user_name,
        lane: validTimes[0].lane,
        finishTime: validTimes[0].finish_time
      } : null
    };
  }

  // RD declares "SEMUA CO / DNF (No Winner)"
  static declareAllCO(raceId = null) {
    const race = raceId ? db.prepare('SELECT * FROM races WHERE id = ?').get(raceId) : this.getActiveRace();
    if (!race) throw new Error('Balapan tidak ditemukan');
    if (race.status !== 'pre-start' && race.status !== 'locked') {
      throw new Error(`Balapan harus berstatus 'pre-start' atau 'locked' untuk deklarasi CO/DNF (saat ini: ${race.status})`);
    }

    const regs = db.prepare('SELECT * FROM race_registrations WHERE race_id = ?').all(race.id);
    if (regs.length === 0) throw new Error('Tidak ada pembalap di balapan ini');

    const updateTx = db.transaction(() => {
      // Mark race as completed with winner_id = NULL
      db.prepare(`
        UPDATE races 
        SET status = 'completed', winner_id = NULL 
        WHERE id = ?
      `).run(race.id);

      // Mark all registrations as dnf_co, clear finish_time and scrutineer_status
      db.prepare(`
        UPDATE race_registrations 
        SET status = 'dnf_co', finish_time = NULL, scrutineer_status = NULL 
        WHERE race_id = ?
      `).run(race.id);
    });

    updateTx();

    return {
      success: true,
      raceNumber: race.race_number,
      status: 'completed',
      message: `Semua mobil di Heat #${race.race_number} dinyatakan Course Out / DNF. Heat ditutup tanpa pemenang. Kupon kualifikasi tetap terpotong.`
    };
  }

  // RD declares "DEKLARASI RE-RACE"
  static declareReRace(raceId = null, lanes = []) {
    const race = raceId ? db.prepare('SELECT * FROM races WHERE id = ?').get(raceId) : this.getActiveRace();
    if (!race) throw new Error('Balapan tidak ditemukan');
    if (race.status !== 'pre-start' && race.status !== 'locked') {
      throw new Error(`Balapan harus berstatus 'pre-start' atau 'locked' untuk balap ulang (saat ini: ${race.status})`);
    }

    if (!Array.isArray(lanes) || lanes.length === 0) {
      throw new Error('Pilih minimal 1 jalur untuk balap ulang (Re-Race)');
    }

    const upperLanes = lanes.map(l => String(l).toUpperCase());

    const regs = db.prepare('SELECT * FROM race_registrations WHERE race_id = ?').all(race.id);
    const validLanesInRace = regs.filter(r => upperLanes.includes(r.lane));

    if (validLanesInRace.length === 0) {
      throw new Error('Tidak ada peserta pada jalur yang dipilih untuk balap ulang');
    }

    const updateTx = db.transaction(() => {
      // Reset selected lanes to ready, clear finish_time and scrutineer_status
      const resetStmt = db.prepare(`
        UPDATE race_registrations 
        SET status = 'ready', finish_time = NULL, scrutineer_status = NULL 
        WHERE race_id = ? AND lane = ?
      `);

      for (const reg of validLanesInRace) {
        resetStmt.run(race.id, reg.lane);
      }

      // Reset race status back to pre-start (locked for ready to release, without re-deducting coupons)
      db.prepare(`
        UPDATE races 
        SET status = 'pre-start', winner_id = NULL 
        WHERE id = ?
      `).run(race.id);
    });

    updateTx();

    return {
      success: true,
      raceNumber: race.race_number,
      reRaceLanes: validLanesInRace.map(r => r.lane),
      status: 'pre-start',
      message: `Balap ulang (Re-Race) aktif untuk Heat #${race.race_number} pada Jalur [${validLanesInRace.map(r => r.lane).join(', ')}]. Bebas kupon baru & tanpa scan ulang.`
    };
  }

  // Scrutineer Desk: "LOLOS" or "DISKUALIFIKASI"
  static handleScrutineerAction(registrationId, action) {
    const reg = db.prepare(`
      SELECT rr.*, r.race_number, u.name as user_name, u.team_name
      FROM race_registrations rr
      JOIN races r ON rr.race_id = r.id
      JOIN users u ON rr.user_id = u.id
      WHERE rr.id = ?
    `).get(registrationId);

    if (!reg) throw new Error('Data pendaftaran / pemenang tidak ditemukan');

    const isPass = action === 'pass';
    const newStatus = isPass ? 'pass' : 'disqualified';

    let isNewBTO = false;
    let currentBest = db.prepare(`
      SELECT MIN(finish_time) as best_time 
      FROM race_registrations 
      WHERE scrutineer_status = 'pass' AND finish_time IS NOT NULL AND id != ?
    `).get(reg.id)?.best_time;

    const actionTx = db.transaction(() => {
      // 1. Update registration scrutineer status
      db.prepare(`
        UPDATE race_registrations 
        SET scrutineer_status = ? 
        WHERE id = ?
      `).run(newStatus, reg.id);

      // 2. Update race status to completed
      db.prepare(`
        UPDATE races 
        SET status = 'completed' 
        WHERE id = ?
      `).run(reg.race_id);

      if (isPass) {
        // Check BTO record
        if (reg.finish_time && (!currentBest || reg.finish_time < currentBest)) {
          isNewBTO = true;
        }

        // Auto-place racer into Round 2 Elimination Bracket match!
        this.placeIntoBracket(reg.user_id);
      } else {
        // Disqualified - clear winner from race if it was this user
        db.prepare(`
          UPDATE races SET winner_id = NULL WHERE id = ? AND winner_id = ?
        `).run(reg.race_id, reg.user_id);
      }
    });

    actionTx();

    return {
      success: true,
      userName: reg.user_name,
      teamName: reg.team_name,
      status: newStatus,
      finishTime: reg.finish_time,
      isNewBTO
    };
  }

  // Auto-progress winner into Round 2 bracket match slot
  static placeIntoBracket(userId) {
    // Check if user is already in bracket
    const alreadyInBracket = db.prepare(`
      SELECT id FROM bracket_matches 
      WHERE user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?
    `).get(userId, userId, userId);

    if (alreadyInBracket) return;

    // Find first open slot in Round 1 matches
    const matches = db.prepare(`
      SELECT * FROM bracket_matches 
      WHERE round_number = 1 
      ORDER BY match_number ASC
    `).all();

    for (const m of matches) {
      if (!m.user_id_1) {
        db.prepare('UPDATE bracket_matches SET user_id_1 = ? WHERE id = ?').run(userId, m.id);
        return;
      } else if (!m.user_id_2) {
        db.prepare('UPDATE bracket_matches SET user_id_2 = ? WHERE id = ?').run(userId, m.id);
        return;
      }
    }
  }

  // RD advances bracket match winner
  static advanceBracketWinner(matchId, winnerId) {
    const match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(matchId);
    if (!match) throw new Error('Pertandingan bracket tidak ditemukan');

    db.prepare(`
      UPDATE bracket_matches 
      SET winner_id = ?, status = 'completed' 
      WHERE id = ?
    `).run(winnerId, matchId);

    // If there is a parent match, place winner in parent match
    if (match.parent_match_id) {
      const parent = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(match.parent_match_id);
      if (parent) {
        if (!parent.user_id_1) {
          db.prepare('UPDATE bracket_matches SET user_id_1 = ? WHERE id = ?').run(winnerId, parent.id);
        } else if (!parent.user_id_2) {
          db.prepare('UPDATE bracket_matches SET user_id_2 = ? WHERE id = ?').run(winnerId, parent.id);
        }
      }
    }

    return { success: true };
  }

  // RD Admin Override Panel
  static adminOverrideLane(action, { raceId, lane, userId }) {
    const activeRace = raceId ? db.prepare('SELECT * FROM races WHERE id = ?').get(raceId) : this.getActiveRace();

    if (action === 'assign') {
      // Check if lane is already taken
      const existing = db.prepare('SELECT id FROM race_registrations WHERE race_id = ? AND lane = ?').get(activeRace.id, lane);
      if (existing) {
        db.prepare('DELETE FROM race_registrations WHERE id = ?').run(existing.id);
      }
      const regId = uuidv4();
      db.prepare(`
        INSERT INTO race_registrations (id, race_id, user_id, lane, status)
        VALUES (?, ?, ?, ?, 'ready')
      `).run(regId, activeRace.id, userId, lane);
      return { success: true, message: `Pembalap berhasil dimasukkan ke Jalur ${lane}` };
    }

    if (action === 'force_ready') {
      db.prepare(`
        UPDATE race_registrations SET status = 'ready' 
        WHERE race_id = ? AND lane = ?
      `).run(activeRace.id, lane);
      return { success: true, message: `Jalur ${lane} diubah menjadi SIAP` };
    }

    if (action === 'kick') {
      const existing = db.prepare(`
        SELECT rr.id, rr.user_id, r.status as race_status
        FROM race_registrations rr
        JOIN races r ON rr.race_id = r.id
        WHERE rr.race_id = ? AND rr.lane = ?
      `).get(activeRace.id, lane);

      if (existing) {
        // If race was pre-start / locked, refund coupon
        if (existing.race_status === 'pre-start' || existing.race_status === 'locked') {
          db.prepare('UPDATE coupons SET balance = balance + 1 WHERE user_id = ?').run(existing.user_id);
        }
        db.prepare('DELETE FROM race_registrations WHERE id = ?').run(existing.id);
      }
      return { success: true, message: `Jalur ${lane} telah di-reset / kick` };
    }

    throw new Error('Aksi override tidak valid');
  }

  // Cashier top up coupons
  static topUpCoupons(userId, amount) {
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Jumlah kupon harus berupa angka positif');
    }

    let coupon = db.prepare('SELECT * FROM coupons WHERE user_id = ?').get(userId);
    if (!coupon) {
      const cId = uuidv4();
      db.prepare('INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, ?)').run(cId, userId, parsedAmount);
    } else {
      db.prepare('UPDATE coupons SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(parsedAmount, userId);
    }

    const updated = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(userId);
    return { success: true, newBalance: updated.balance };
  }

  // Cashier register new guest/kid racer
  static registerGuest(name, teamName, initialBalance = 10) {
    const countVirtual = db.prepare('SELECT count(*) as count FROM users WHERE is_virtual = 1').get().count;
    const virtualEmail = `guest${countVirtual + 101}@tamiya.local`;
    const userId = uuidv4();
    const tag = teamName ? teamName.substring(0, 10).toUpperCase() : name.substring(0, 8).toUpperCase();

    db.prepare(`
      INSERT INTO users (id, name, email, team_name, role, is_virtual)
      VALUES (?, ?, ?, ?, 'participant', 1)
    `).run(userId, name, virtualEmail, tag);

    const cId = uuidv4();
    db.prepare('INSERT INTO coupons (id, user_id, balance) VALUES (?, ?, ?)').run(cId, userId, parseInt(initialBalance, 10) || 10);

    return {
      success: true,
      user: {
        id: userId,
        name,
        email: virtualEmail,
        team_name: tag,
        balance: initialBalance,
        is_virtual: 1
      }
    };
  }
}
