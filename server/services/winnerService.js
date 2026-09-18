import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { getActiveEventId } from './eventService.js';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';

// Table for tracking winner registrations to support accurate Undo
export function ensureWinnerLogTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS winner_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      participant_number INTEGER NOT NULL,
      bracket_match_id TEXT NOT NULL,
      slot TEXT NOT NULL CHECK(slot IN ('user_id_1', 'user_id_2', 'user_id_3')),
      round_number INTEGER DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_winner_reg_event ON winner_registrations(event_id, created_at DESC);
  `);

  try {
    const cols = db.prepare("PRAGMA table_info(winner_registrations)").all();
    const hasRoundCol = cols.some(c => c.name === 'round_number');
    if (!hasRoundCol) {
      db.exec("ALTER TABLE winner_registrations ADD COLUMN round_number INTEGER DEFAULT 2");
    }
  } catch (e) {
    // Column already exists or safe to proceed
  }
}

/**
 * Register a participant as round winner based on participant number.
 * Automatically finds open slot in target round (A -> B -> C) or creates next heat.
 * Strictly verifies previous round wins when round >= 3 (Option A).
 *
 * @param {Object} params
 * @param {number|string} params.participant_number
 * @param {number|string} [params.round=2]
 * @param {string} [params.event_id]
 * @returns {Object} { success, match, slot, lane, round, participant, message }
 */
export function registerWinner({ participant_number, round = 2, event_id }) {
  ensureWinnerLogTable();
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu.');
  }

  const targetRound = parseInt(round, 10) || 2;
  if (targetRound < 2) {
    throw new Error('Nomor babak minimal adalah Babak 2');
  }

  // Check Babak 1 Qualifying lock if targeting Round 2
  if (targetRound === 2) {
    const qualSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'qualifying_status'").get();
    if (qualSetting && qualSetting.value === 'locked') {
      throw new Error('Kualifikasi Babak 1 telah dikunci oleh Race Director. Buka kunci kualifikasi di menu Race Director jika ingin mendaftarkan pemenang baru.');
    }
  }

  const pNum = normalizeParticipantNumber(participant_number);
  if (pNum === null) {
    throw new Error('Nomor peserta tidak valid');
  }

  return db.transaction(() => {
    // 1. Resolve participant
    const user = db.prepare(`
      SELECT id, name, team_name, participant_number, event_id 
      FROM users 
      WHERE event_id = ? AND participant_number = ?
    `).get(targetEventId, pNum);

    if (!user) {
      throw new Error(`Peserta dengan nomor #${pNum} tidak ditemukan pada event aktif`);
    }

    // 2. Strict Qualification Check (Option A) for Round >= 3
    if (targetRound >= 3) {
      const prevRound = targetRound - 1;
      const winsInPrevRound = db.prepare(`
        SELECT COUNT(*) as win_count 
        FROM bracket_matches 
        WHERE event_id = ? AND round_number = ? AND winner_id = ? AND status = 'completed'
      `).get(targetEventId, prevRound, user.id)?.win_count || 0;

      const regsInTargetRound = db.prepare(`
        SELECT COUNT(*) as reg_count 
        FROM bracket_matches 
        WHERE event_id = ? AND round_number = ? AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)
      `).get(targetEventId, targetRound, user.id, user.id, user.id)?.reg_count || 0;

      if (winsInPrevRound === 0) {
        throw new Error(`Peserta #${user.participant_number} (${user.name}) belum tercatat menang di Babak ${prevRound} pada Pusat Komando Race Director.`);
      }

      if (regsInTargetRound >= winsInPrevRound) {
        throw new Error(`Seluruh kuota tiket Babak ${targetRound} untuk peserta #${user.participant_number} (${user.name}) sudah terdaftar (${regsInTargetRound} dari ${winsInPrevRound} kemenangan di Babak ${prevRound}).`);
      }
    }

    // 3. Find open slot in targetRound matches
    const openMatches = db.prepare(`
      SELECT * FROM bracket_matches 
      WHERE event_id = ? AND round_number = ? AND status = 'pending' AND (user_id_1 IS NULL OR user_id_2 IS NULL OR user_id_3 IS NULL)
      ORDER BY match_number ASC
    `).all(targetEventId, targetRound);

    let targetMatch = null;
    let targetSlot = null;
    let slotLane = null;

    for (const m of openMatches) {
      if (!m.user_id_1) {
        targetMatch = m;
        targetSlot = 'user_id_1';
        slotLane = 'A';
        break;
      } else if (!m.user_id_2) {
        targetMatch = m;
        targetSlot = 'user_id_2';
        slotLane = 'B';
        break;
      } else if (!m.user_id_3) {
        targetMatch = m;
        targetSlot = 'user_id_3';
        slotLane = 'C';
        break;
      }
    }

    // 4. If no open matches, create new heat in targetRound
    if (!targetMatch) {
      const maxMatchRow = db.prepare(`
        SELECT COALESCE(MAX(match_number), 0) as max_match 
        FROM bracket_matches
      `).get();

      const nextMatchNum = (maxMatchRow?.max_match || 0) + 1;
      const newMatchId = uuidv4();

      db.prepare(`
        INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(newMatchId, targetEventId, nextMatchNum, targetRound, user.id);

      targetMatch = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(newMatchId);
      targetSlot = 'user_id_1';
      slotLane = 'A';
    } else {
      db.prepare(`UPDATE bracket_matches SET ${targetSlot} = ? WHERE id = ?`).run(user.id, targetMatch.id);
      targetMatch = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(targetMatch.id);
    }

    // 5. Log winner registration for undo
    const logId = uuidv4();
    db.prepare(`
      INSERT INTO winner_registrations (id, event_id, user_id, participant_number, bracket_match_id, slot, round_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, targetEventId, user.id, user.participant_number, targetMatch.id, targetSlot, targetRound);

    return {
      success: true,
      participant: {
        id: user.id,
        name: user.name,
        team_name: user.team_name,
        participant_number: user.participant_number
      },
      match: targetMatch,
      slot: targetSlot,
      lane: slotLane,
      round: targetRound,
      message: `Peserta #${user.participant_number} (${user.name}) berhasil didaftarkan ke Babak ${targetRound} (Heat #${targetMatch.match_number} Jalur ${slotLane})`
    };
  })();
}

/**
 * Undo last winner registration (optionally for specific round).
 *
 * @param {Object} [params]
 * @param {number|string} [params.round]
 * @param {string} [params.event_id]
 * @returns {Object} { success, undone_participant, match_number, round_number, message }
 */
export function undoLastWinnerRegistration({ round, event_id } = {}) {
  ensureWinnerLogTable();
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif');
  }

  return db.transaction(() => {
    // 1. Fetch latest registration (optionally filtered by round)
    let query = `
      SELECT * FROM winner_registrations 
      WHERE event_id = ?
    `;
    const params = [targetEventId];
    if (round) {
      const rNum = parseInt(round, 10);
      query += ` AND (round_number = ? OR (round_number IS NULL AND ? = 2))`;
      params.push(rNum, rNum);
    }
    query += ` ORDER BY created_at DESC, rowid DESC LIMIT 1`;

    const lastLog = db.prepare(query).get(...params);

    if (!lastLog) {
      throw new Error(round 
        ? `Belum ada pendaftaran pemenang Babak ${round} yang dapat di-undo pada event ini`
        : 'Belum ada pendaftaran pemenang yang dapat di-undo pada event ini'
      );
    }

    // 2. Check if the match is still pending and has no winner yet
    const match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(lastLog.bracket_match_id);
    if (!match) {
      db.prepare('DELETE FROM winner_registrations WHERE id = ?').run(lastLog.id);
      throw new Error('Pertandingan bracket terkait tidak ditemukan');
    }

    if (match.status === 'completed' || match.winner_id) {
      throw new Error(`Pertandingan Babak ${match.round_number} Heat #${match.match_number} sudah selesai, pendaftaran tidak dapat di-undo`);
    }

    // 3. Clear the slot in bracket_matches
    db.prepare(`UPDATE bracket_matches SET ${lastLog.slot} = NULL WHERE id = ?`).run(match.id);

    // 4. Delete registration log
    db.prepare('DELETE FROM winner_registrations WHERE id = ?').run(lastLog.id);

    const user = db.prepare('SELECT name, team_name, participant_number FROM users WHERE id = ?').get(lastLog.user_id);

    return {
      success: true,
      undone_participant: {
        id: lastLog.user_id,
        participant_number: lastLog.participant_number,
        name: user?.name || 'Peserta',
        team_name: user?.team_name || null
      },
      match_number: match.match_number,
      round_number: match.round_number,
      message: `Pendaftaran pemenang #${lastLog.participant_number} (${user?.name}) di Babak ${match.round_number} Heat #${match.match_number} berhasil dibatalkan (undo)`
    };
  })();
}

/**
 * Check eligibility of a participant for a target round.
 *
 * @param {Object} params
 * @param {number|string} params.participant_number
 * @param {number|string} [params.round=2]
 * @param {string} [params.event_id]
 * @returns {Object}
 */
export function checkWinnerEligibility({ participant_number, round = 2, event_id }) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) return { eligible: false, reason: 'Tidak ada event aktif' };

  const targetRound = parseInt(round, 10) || 2;
  const pNum = normalizeParticipantNumber(participant_number);
  if (pNum === null) return { eligible: false, reason: 'Nomor peserta tidak valid' };

  const user = db.prepare(`
    SELECT id, name, team_name, participant_number, event_id 
    FROM users 
    WHERE event_id = ? AND participant_number = ?
  `).get(targetEventId, pNum);

  if (!user) {
    return { eligible: false, reason: `Peserta #${pNum} tidak ditemukan` };
  }

  if (targetRound === 2) {
    const qualSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'qualifying_status'").get();
    if (qualSetting && qualSetting.value === 'locked') {
      return {
        eligible: false,
        user,
        reason: 'Kualifikasi Babak 1 telah dikunci oleh Race Director'
      };
    }
    return {
      eligible: true,
      user,
      reason: `Peserta #${user.participant_number} (${user.name}) siap didaftarkan ke Babak 2`
    };
  }

  // targetRound >= 3
  const prevRound = targetRound - 1;
  const winsInPrevRound = db.prepare(`
    SELECT COUNT(*) as win_count 
    FROM bracket_matches 
    WHERE event_id = ? AND round_number = ? AND winner_id = ? AND status = 'completed'
  `).get(targetEventId, prevRound, user.id)?.win_count || 0;

  const regsInTargetRound = db.prepare(`
    SELECT COUNT(*) as reg_count 
    FROM bracket_matches 
    WHERE event_id = ? AND round_number = ? AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)
  `).get(targetEventId, targetRound, user.id, user.id, user.id)?.reg_count || 0;

  if (winsInPrevRound === 0) {
    return {
      eligible: false,
      user,
      wins_prev_round: winsInPrevRound,
      regs_target_round: regsInTargetRound,
      reason: `Peserta #${user.participant_number} (${user.name}) belum tercatat menang di Babak ${prevRound}`
    };
  }

  const remaining = winsInPrevRound - regsInTargetRound;
  if (remaining <= 0) {
    return {
      eligible: false,
      user,
      wins_prev_round: winsInPrevRound,
      regs_target_round: regsInTargetRound,
      remaining_slots: 0,
      reason: `Seluruh kuota tiket Babak ${targetRound} sudah terdaftar (${regsInTargetRound} dari ${winsInPrevRound} kemenangan Babak ${prevRound})`
    };
  }

  return {
    eligible: true,
    user,
    wins_prev_round: winsInPrevRound,
    regs_target_round: regsInTargetRound,
    remaining_slots: remaining,
    reason: `Lolos Babak ${prevRound} (${winsInPrevRound} kemenangan). Sisa kuota daftar: ${remaining} tiket.`
  };
}

/**
 * Get registered winners for active event.
 *
 * @param {Object} [params]
 * @param {number|string} [params.round]
 * @param {string} [params.event_id]
 * @returns {Array<Object>}
 */
export function getRegisteredWinners({ round, event_id } = {}) {
  ensureWinnerLogTable();
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) return [];

  let query = `
    SELECT 
      w.id,
      w.participant_number,
      w.slot,
      w.created_at,
      u.id as user_id,
      u.name as user_name,
      u.team_name,
      bm.id as match_id,
      bm.match_number,
      bm.round_number
    FROM winner_registrations w
    JOIN users u ON w.user_id = u.id
    JOIN bracket_matches bm ON w.bracket_match_id = bm.id
    WHERE w.event_id = ?
  `;
  const params = [targetEventId];

  if (round) {
    query += ` AND bm.round_number = ?`;
    params.push(parseInt(round, 10));
  }

  query += ` ORDER BY w.created_at DESC, w.rowid DESC`;

  const rows = db.prepare(query).all(...params);

  return rows.map(r => ({
    id: r.id,
    user_id: r.user_id,
    participant_number: r.participant_number,
    user_name: r.user_name,
    team_name: r.team_name,
    match_id: r.match_id,
    match_number: r.match_number,
    round_number: r.round_number,
    slot: r.slot,
    lane: r.slot === 'user_id_1' ? 'A' : r.slot === 'user_id_2' ? 'B' : 'C',
    created_at: r.created_at
  }));
}

export default {
  registerWinner,
  undoLastWinnerRegistration,
  checkWinnerEligibility,
  getRegisteredWinners
};
