import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { getActiveEventId } from './eventService.js';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';

/**
 * Validates lap time format.
 * Returns normalized float rounded to 3 decimal places.
 */
export function validateAndFormatTime(time) {
  const num = parseFloat(time);
  if (isNaN(num) || num <= 0 || num >= 300) {
    throw new Error('Catatan waktu harus berupa angka positif antara 0.001 dan 299.999 detik');
  }
  return Math.round(num * 1000) / 1000;
}

/**
 * Record or update a participant's BTO time for the active event.
 * Follows personal-best replacement logic: updates only if new_time is faster.
 *
 * @param {Object} params
 * @param {string} [params.participant_number] - Participant number in event
 * @param {string} [params.user_id] - User UUID
 * @param {number|string} params.finish_time - Recorded lap time in seconds
 * @param {string} [params.recorded_by] - Identifier of official/operator
 * @param {string} [params.event_id] - Optional explicit event ID (defaults to active)
 * @returns {Object} { record, updated, is_new_personal_best, is_new_overall_record, previous_best, message }
 */
export function recordBtoTime({ participant_number, user_id, finish_time, recorded_by = 'panitia', event_id }) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu.');
  }

  const validTime = validateAndFormatTime(finish_time);

  return db.transaction(() => {
    // 1. Resolve participant user
    let user = null;
    if (participant_number !== undefined && participant_number !== null && String(participant_number).trim() !== '') {
      const pNum = normalizeParticipantNumber(participant_number);
      if (pNum === null) {
        throw new Error('Nomor peserta tidak valid');
      }
      user = db.prepare(`
        SELECT id, name, team_name, participant_number, event_id 
        FROM users 
        WHERE event_id = ? AND participant_number = ?
      `).get(targetEventId, pNum);
      if (!user) {
        throw new Error(`Peserta dengan nomor #${pNum} tidak ditemukan pada event aktif`);
      }
    } else if (user_id) {
      user = db.prepare(`
        SELECT id, name, team_name, participant_number, event_id 
        FROM users 
        WHERE id = ?
      `).get(user_id);
      if (!user) {
        throw new Error('Peserta tidak ditemukan');
      }
    } else {
      throw new Error('Nomor peserta atau user_id wajib diisi');
    }

    // 2. Check current event overall #1 best time
    const overallBestRow = db.prepare(`
      SELECT MIN(finish_time) as best_time 
      FROM bto_records 
      WHERE event_id = ?
    `).get(targetEventId);
    const overallBest = overallBestRow?.best_time !== null && overallBestRow?.best_time !== undefined ? overallBestRow.best_time : null;

    // 3. Check existing record for this participant in this event
    const existing = db.prepare(`
      SELECT * FROM bto_records 
      WHERE event_id = ? AND user_id = ?
    `).get(targetEventId, user.id);

    let isNewPersonalBest = false;
    let isNewOverallRecord = false;
    let savedRecord = null;
    let message = '';

    if (!existing) {
      // First time entry for participant
      isNewPersonalBest = true;
      const recId = uuidv4();
      db.prepare(`
        INSERT INTO bto_records (id, event_id, user_id, participant_number, finish_time, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(recId, targetEventId, user.id, user.participant_number, validTime, recorded_by);

      savedRecord = db.prepare('SELECT * FROM bto_records WHERE id = ?').get(recId);
      
      if (overallBest === null || validTime < overallBest) {
        isNewOverallRecord = true;
        message = `Catatan waktu ${validTime}s berhasil dicatat sebagai REKOR BARU BTO #1!`;
      } else {
        message = `Catatan waktu ${validTime}s berhasil dicatat untuk ${user.name}.`;
      }
    } else if (validTime < existing.finish_time) {
      // Improved personal best!
      isNewPersonalBest = true;
      db.prepare(`
        UPDATE bto_records 
        SET finish_time = ?, participant_number = ?, recorded_by = ?, created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(validTime, user.participant_number, recorded_by, existing.id);

      savedRecord = db.prepare('SELECT * FROM bto_records WHERE id = ?').get(existing.id);

      if (overallBest === null || validTime < overallBest) {
        isNewOverallRecord = true;
        message = `Catatan waktu ${validTime}s berhasil menggantikan ${existing.finish_time}s sebagai REKOR BARU BTO #1!`;
      } else {
        message = `Personal best baru ${validTime}s berhasil dicatat (sebelumnya ${existing.finish_time}s).`;
      }
    } else {
      // Slower or equal to personal best
      savedRecord = existing;
      message = `Waktu ${validTime}s tidak lebih cepat dari personal best saat ini (${existing.finish_time}s). Data tidak diubah.`;
    }

    return {
      record: savedRecord,
      participant: {
        id: user.id,
        name: user.name,
        team_name: user.team_name,
        participant_number: user.participant_number
      },
      updated: isNewPersonalBest,
      is_new_personal_best: isNewPersonalBest,
      is_new_overall_record: isNewOverallRecord,
      previous_best: existing?.finish_time || null,
      message
    };
  })();
}

/**
 * Retrieve top-N BTO leaderboard for active event.
 *
 * @param {Object} [options]
 * @param {string} [options.event_id]
 * @param {number} [options.limit=10]
 * @returns {Array<Object>}
 */
export function getBtoLeaderboard({ event_id, limit = 10 } = {}) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) return [];

  const rows = db.prepare(`
    SELECT 
      b.id,
      b.event_id,
      b.user_id,
      b.participant_number,
      b.finish_time,
      b.recorded_by,
      b.created_at,
      u.name as user_name,
      u.team_name
    FROM bto_records b
    JOIN users u ON b.user_id = u.id
    WHERE b.event_id = ?
    ORDER BY b.finish_time ASC, b.created_at ASC
    LIMIT ?
  `).all(targetEventId, Math.max(1, parseInt(limit, 10) || 10));

  return rows.map((row, idx) => ({
    rank: idx + 1,
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    participant_number: row.participant_number,
    finish_time: row.finish_time,
    user_name: row.user_name,
    team_name: row.team_name,
    recorded_by: row.recorded_by,
    created_at: row.created_at
  }));
}

/**
 * Delete a BTO record by ID (e.g. for official typo correction/undo).
 */
export function deleteBtoRecord(id) {
  return db.transaction(() => {
    const existing = db.prepare('SELECT * FROM bto_records WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Catatan BTO tidak ditemukan');
    }
    db.prepare('DELETE FROM bto_records WHERE id = ?').run(id);
    return { success: true, deleted: existing };
  })();
}

export default {
  recordBtoTime,
  getBtoLeaderboard,
  deleteBtoRecord,
  validateAndFormatTime
};
