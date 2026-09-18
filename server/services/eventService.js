import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

/**
 * Validate and create a new event.
 * If no event is currently active, the new event is created as 'active'; otherwise 'archived'.
 *
 * @param {Object} params
 * @param {string} params.nama
 * @param {string} [params.tanggal]
 * @param {string} [params.catatan]
 * @param {number} [params.jumlah_lap=3]
 * @returns {Object} Created event record
 */
export function createEvent({ nama, tanggal, catatan, jumlah_lap = 3 }) {
  const trimmedNama = String(nama ?? '').trim();
  if (!trimmedNama) {
    throw new Error('Nama event wajib diisi');
  }
  if (trimmedNama.length > 100) {
    throw new Error('Nama event maksimal 100 karakter');
  }

  const trimmedCatatan = catatan != null ? String(catatan).trim() : null;
  if (trimmedCatatan && trimmedCatatan.length > 500) {
    throw new Error('Catatan event maksimal 500 karakter');
  }

  const lapInt = Number(jumlah_lap ?? 3);
  if (!Number.isInteger(lapInt) || lapInt <= 0) {
    throw new Error('Jumlah lap harus bilangan bulat positif');
  }

  const newId = uuidv4();
  const eventDate = tanggal ? String(tanggal).trim() : null;

  return db.transaction(() => {
    const active = db.prepare("SELECT id FROM events WHERE status = 'active' LIMIT 1").get();
    const status = active ? 'archived' : 'active';

    db.prepare(`
      INSERT INTO events (id, nama, tanggal, status, catatan, jumlah_lap)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId, trimmedNama, eventDate, status, trimmedCatatan, lapInt);

    return db.prepare('SELECT * FROM events WHERE id = ?').get(newId);
  })();
}

/**
 * List all events (active and archived) ordered by created_at DESC.
 * @returns {Array<Object>}
 */
export function listEvents() {
  return db.prepare('SELECT * FROM events ORDER BY created_at DESC, rowid DESC').all();
}

/**
 * Retrieve the currently active event record.
 * @returns {Object|null}
 */
export function getActiveEvent() {
  return db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get() || null;
}

/**
 * Retrieve the active event ID or null.
 * @returns {string|null}
 */
export function getActiveEventId() {
  return getActiveEvent()?.id || null;
}

/**
 * Set an event as active, automatically archiving the currently active event.
 * Reversible and enforced in one transaction.
 *
 * @param {string} id
 * @returns {Object} Newly activated event
 */
export function setActiveEvent(id) {
  return db.transaction(() => {
    const target = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!target) {
      throw new Error('Event tidak ditemukan');
    }

    // Archive any other active event first to satisfy partial unique index
    db.prepare(`
      UPDATE events 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'active' AND id != ?
    `).run(id);

    // Set target event active
    db.prepare(`
      UPDATE events 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    // ENH-01: Reset dynamic tournament operational lock settings so new event starts clean
    const dynamicKeys = [
      'qualifying_status',
      'round2_status',
      'round3_status',
      'round4_status',
      'round5_status'
    ];
    for (const key of dynamicKeys) {
      db.prepare(`
        INSERT OR REPLACE INTO tournament_settings (key, value, updated_at)
        VALUES (?, 'open', CURRENT_TIMESTAMP)
      `).run(key);
    }

    return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  })();
}

/**
 * Archive an event (never deletes).
 *
 * @param {string} id
 * @returns {Object} Updated event
 */
export function archiveEvent(id) {
  return db.transaction(() => {
    const target = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!target) {
      throw new Error('Event tidak ditemukan');
    }

    db.prepare(`
      UPDATE events 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  })();
}
