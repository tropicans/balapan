import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { getActiveEvent, getActiveEventId } from './eventService.js';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';

/**
 * Register a new participant with automatic sequential participant_number per active event.
 *
 * @param {Object} params
 * @param {string} params.name - Racer name (required, max 100 chars)
 * @param {string} [params.team_name] - Team name (optional, max 50 chars, null if empty)
 * @param {string} [params.event_id] - Explicit event ID (defaults to active event)
 * @returns {Object} Created participant record
 */
export function registerParticipant({ name, team_name, event_id }) {
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) {
    throw new Error('Nama peserta wajib diisi');
  }
  if (trimmedName.length > 100) {
    throw new Error('Nama peserta maksimal 100 karakter');
  }

  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  const trimmedTeam = team_name != null ? String(team_name).trim() : null;
  const finalTeam = trimmedTeam ? trimmedTeam.substring(0, 50) : null;
  const newId = uuidv4();

  return db.transaction(() => {
    // D-05, EVNT-03: Sequentially allocate MAX + 1 scoped to active event
    const row = db.prepare(`
      SELECT COALESCE(MAX(participant_number), 0) AS max_num 
      FROM users 
      WHERE event_id = ?
    `).get(targetEventId);

    const nextNum = (row?.max_num || 0) + 1;

    db.prepare(`
      INSERT INTO users (
        id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number
      ) VALUES (?, ?, NULL, NULL, ?, 'participant', 0, ?, ?)
    `).run(newId, trimmedName, finalTeam, targetEventId, nextNum);

    return db.prepare('SELECT id, name, team_name, role, event_id, participant_number, created_at FROM users WHERE id = ?').get(newId);
  })();
}

/**
 * Retrieve participants list with pagination and omni-search support.
 *
 * @param {Object} [options]
 * @param {string} [options.event_id] - Scoped event ID (defaults to active event)
 * @param {string} [options.search] - Omni-search query (numeric matches number, string matches name/team)
 * @param {number} [options.limit=200] - Page size
 * @param {number} [options.offset=0] - Page offset
 * @returns {Object} { active_event, total, latest_number, participants }
 */
export function getParticipants({ event_id, search, limit = 200, offset = 0 } = {}) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    return {
      active_event: null,
      total: 0,
      latest_number: 0,
      participants: []
    };
  }

  const activeEvent = getActiveEvent();

  // Aggregate stats
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total, 
      COALESCE(MAX(participant_number), 0) as latest_number 
    FROM users 
    WHERE event_id = ? AND role = 'participant'
  `).get(targetEventId);

  let query = `
    SELECT id, name, team_name, role, event_id, participant_number, created_at 
    FROM users 
    WHERE event_id = ? AND role = 'participant'
  `;
  const params = [targetEventId];

  if (search && search.trim()) {
    const q = search.trim();
    const num = normalizeParticipantNumber(q.replace(/^#/, ''));

    if (num !== null) {
      query += ` AND (participant_number = ? OR name LIKE ? OR team_name LIKE ?)`;
      params.push(num, `%${q}%`, `%${q}%`);
    } else {
      query += ` AND (name LIKE ? OR team_name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
  }

  query += ` ORDER BY participant_number DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit) || 200, Number(offset) || 0);

  const participants = db.prepare(query).all(...params);

  return {
    active_event: activeEvent,
    total: stats?.total || 0,
    latest_number: stats?.latest_number || 0,
    participants
  };
}

/**
 * Update participant typo (name and team only).
 * Protects participant_number and event_id from mutation.
 *
 * @param {string} id - User ID
 * @param {Object} params
 * @param {string} params.name - Racer name (required, max 100 chars)
 * @param {string} [params.team_name] - Team name (optional, max 50 chars, null if empty)
 * @returns {Object} Updated participant record
 */
export function updateParticipant(id, { name, team_name }) {
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) {
    throw new Error('Nama peserta wajib diisi');
  }
  if (trimmedName.length > 100) {
    throw new Error('Nama peserta maksimal 100 karakter');
  }

  const trimmedTeam = team_name != null ? String(team_name).trim() : null;
  const finalTeam = trimmedTeam ? trimmedTeam.substring(0, 50) : null;

  return db.transaction(() => {
    const existing = db.prepare('SELECT id, participant_number, event_id FROM users WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Peserta tidak ditemukan');
    }

    db.prepare(`
      UPDATE users 
      SET name = ?, team_name = ? 
      WHERE id = ?
    `).run(trimmedName, finalTeam, id);

    return db.prepare('SELECT id, name, team_name, role, event_id, participant_number, created_at FROM users WHERE id = ?').get(id);
  })();
}

/**
 * Sequentially allocate participant numbers and batch insert participants for an event.
 *
 * @param {Array<{ name: string, team_name?: string|null }>} participantsList
 * @param {Object} [options]
 * @param {string} [options.event_id]
 * @returns {Object} { count: number, imported: Array }
 */
export function importParticipants(participantsList, { event_id } = {}) {
  if (!Array.isArray(participantsList) || participantsList.length === 0) {
    throw new Error('Daftar peserta untuk di-import kosong');
  }

  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  return db.transaction(() => {
    const row = db.prepare(`
      SELECT COALESCE(MAX(participant_number), 0) AS max_num 
      FROM users 
      WHERE event_id = ?
    `).get(targetEventId);

    let nextNum = (row?.max_num || 0) + 1;
    const imported = [];

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number
      ) VALUES (?, ?, NULL, NULL, ?, 'participant', 0, ?, ?)
    `);

    for (const item of participantsList) {
      const name = String(item.name || '').trim();
      if (!name) continue;
      const team = item.team_name ? String(item.team_name).trim().substring(0, 50) : null;
      const uId = uuidv4();

      insertStmt.run(uId, name, team, targetEventId, nextNum);
      imported.push({ id: uId, name, team_name: team, participant_number: nextNum, event_id: targetEventId });
      nextNum++;
    }

    return { count: imported.length, imported };
  })();
}
