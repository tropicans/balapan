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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_winner_reg_event ON winner_registrations(event_id, created_at DESC);
  `);
}

/**
 * Register a participant as Round 2 winner based on participant number.
 * Automatically finds open slot in Round 2 (A -> B -> C) or creates next heat.
 *
 * @param {Object} params
 * @param {number|string} params.participant_number
 * @param {string} [params.event_id]
 * @returns {Object} { success, match, slot, participant, message }
 */
export function registerWinner({ participant_number, event_id }) {
  ensureWinnerLogTable();
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu.');
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

    // 2. Check if user is already in Round 2
    const existingInR2 = db.prepare(`
      SELECT id, match_number 
      FROM bracket_matches 
      WHERE event_id = ? AND round_number = 2 AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)
    `).get(targetEventId, user.id, user.id, user.id);

    if (existingInR2) {
      throw new Error(`Peserta #${user.participant_number} (${user.name}) sudah terdaftar di Babak 2 (Heat #${existingInR2.match_number})`);
    }

    // 3. Find open slot in Round 2 matches
    const openMatches = db.prepare(`
      SELECT * FROM bracket_matches 
      WHERE event_id = ? AND round_number = 2 AND status = 'pending' AND (user_id_1 IS NULL OR user_id_2 IS NULL OR user_id_3 IS NULL)
      ORDER BY match_number ASC
    `).all(targetEventId);

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

    // 4. If no open matches, create new heat in Round 2
    if (!targetMatch) {
      const maxMatchRow = db.prepare(`
        SELECT COALESCE(MAX(match_number), 0) as max_match 
        FROM bracket_matches 
        WHERE event_id = ?
      `).get(targetEventId);

      const nextMatchNum = (maxMatchRow?.max_match || 0) + 1;
      const newMatchId = uuidv4();

      db.prepare(`
        INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, status)
        VALUES (?, ?, ?, 2, ?, 'pending')
      `).run(newMatchId, targetEventId, nextMatchNum, user.id);

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
      INSERT INTO winner_registrations (id, event_id, user_id, participant_number, bracket_match_id, slot)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, targetEventId, user.id, user.participant_number, targetMatch.id, targetSlot);

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
      message: `Peserta #${user.participant_number} (${user.name}) berhasil didaftarkan ke Babak 2 (Heat #${targetMatch.match_number} Jalur ${slotLane})`
    };
  })();
}

/**
 * Undo last winner registration.
 *
 * @param {Object} [params]
 * @param {string} [params.event_id]
 * @returns {Object} { success, undone_participant, message }
 */
export function undoLastWinnerRegistration({ event_id } = {}) {
  ensureWinnerLogTable();
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif');
  }

  return db.transaction(() => {
    // 1. Fetch latest registration
    const lastLog = db.prepare(`
      SELECT * FROM winner_registrations 
      WHERE event_id = ? 
      ORDER BY created_at DESC, rowid DESC 
      LIMIT 1
    `).get(targetEventId);

    if (!lastLog) {
      throw new Error('Belum ada pendaftaran pemenang yang dapat di-undo pada event ini');
    }

    // 2. Check if the match is still pending and has no winner yet
    const match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(lastLog.bracket_match_id);
    if (!match) {
      db.prepare('DELETE FROM winner_registrations WHERE id = ?').run(lastLog.id);
      throw new Error('Pertandingan bracket terkait tidak ditemukan');
    }

    if (match.status === 'completed' || match.winner_id) {
      throw new Error(`Pertandingan Heat #${match.match_number} sudah selesai, pendaftaran tidak dapat di-undo`);
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
      message: `Pendaftaran pemenang #${lastLog.participant_number} (${user?.name}) di Heat #${match.match_number} berhasil dibatalkan (undo)`
    };
  })();
}

/**
 * Get registered winners for active event.
 *
 * @param {Object} [params]
 * @param {string} [params.event_id]
 * @returns {Array<Object>}
 */
export function getRegisteredWinners({ event_id } = {}) {
  ensureWinnerLogTable();
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) return [];

  const rows = db.prepare(`
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
    ORDER BY w.created_at DESC, w.rowid DESC
  `).all(targetEventId);

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
  getRegisteredWinners
};
