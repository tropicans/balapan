import db from '../db.js';
import { getActiveEventId } from './eventService.js';
import { parseParticipantCsv } from '../utils/csvParser.js';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FZC65RxP3XMZM4FtsCTSt3C-EabqYbky/edit?gid=1028020136#gid=1028020136';

/**
 * Normalizes any Google Sheets URL into a direct CSV export endpoint.
 *
 * @param {string} rawUrl
 * @returns {string} CSV export URL
 */
export function normalizeGoogleSheetUrl(rawUrl) {
  const urlStr = String(rawUrl || '').trim();
  if (!urlStr) {
    throw new Error('URL Google Sheets tidak boleh kosong');
  }

  // Extract Spreadsheet ID: /spreadsheets/d/{ID}
  const idMatch = urlStr.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch || !idMatch[1]) {
    throw new Error('URL Google Sheets tidak valid: Spreadsheet ID tidak ditemukan');
  }
  const docId = idMatch[1];

  // Extract gid (Sheet tab ID): gid=12345 in query or hash
  let gid = '0';
  const gidMatch = urlStr.match(/[?&#]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
}

/**
 * Fetches CSV text directly from Google Sheets export endpoint.
 *
 * @param {string} exportUrl
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<string>}
 */
export async function fetchGoogleSheetCsv(exportUrl, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(exportUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });

    if (!res.ok) {
      throw new Error(`Gagal mengunduh Google Sheet (HTTP ${res.status}: ${res.statusText})`);
    }

    const csvText = await res.text();
    if (!csvText || !csvText.trim()) {
      throw new Error('Data Google Sheet yang diunduh kosong');
    }

    return csvText;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Koneksi ke Google Sheets timeout setelah ${timeoutMs / 1000} detik`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retrieves the stored Google Sheets sync configuration.
 */
export function getSheetSyncConfig() {
  try {
    const urlSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_sync_url'").get();
    const lastSyncSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_last_sync_time'").get();
    const lastCountSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_last_sync_count'").get();

    return {
      configuredUrl: urlSetting?.value || DEFAULT_SHEET_URL,
      lastSyncTime: lastSyncSetting?.value || null,
      lastSyncCount: lastCountSetting?.value ? Number(lastCountSetting.value) : 0
    };
  } catch (e) {
    return {
      configuredUrl: DEFAULT_SHEET_URL,
      lastSyncTime: null,
      lastSyncCount: 0
    };
  }
}

/**
 * Idempotently synchronizes participants from Google Sheets into the active event.
 *
 * @param {Object} [options]
 * @param {string} [options.sheet_url] - Custom or default sheet URL
 * @param {string} [options.event_id] - Scoped event ID (defaults to active event)
 * @param {string} [options.csv_override] - Optional CSV string (for offline testing or custom override)
 * @returns {Promise<Object>}
 */
export async function syncParticipantsFromSheet({ sheet_url, event_id, csv_override, allow_multi_entry = false } = {}) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  const rawUrl = sheet_url || getSheetSyncConfig().configuredUrl || DEFAULT_SHEET_URL;
  const exportUrl = normalizeGoogleSheetUrl(rawUrl);

  // Fetch or use override
  const csvText = csv_override || await fetchGoogleSheetCsv(exportUrl);

  // Parse CSV
  const parseResult = parseParticipantCsv(csvText);
  const candidateParticipants = parseResult.valid || [];
  const parseSkipped = parseResult.skipped || [];

  return db.transaction(() => {
    // 1. Fetch existing participants in the target active event
    const existingRows = db.prepare(`
      SELECT id, name, team_name, participant_number 
      FROM users 
      WHERE event_id = ? AND role = 'participant'
    `).all(targetEventId);

    const existingNamesSet = new Set(
      existingRows.map(r => String(r.name || '').trim().toLowerCase())
    );

    // 2. Query highest participant number in active event
    const row = db.prepare(`
      SELECT COALESCE(MAX(participant_number), 0) AS max_num 
      FROM users 
      WHERE event_id = ?
    `).get(targetEventId);

    let nextNum = (row?.max_num || 0) + 1;

    const added = [];
    const skipped = [...parseSkipped];

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number
      ) VALUES (?, ?, NULL, NULL, ?, 'participant', 0, ?, ?)
    `);

    // 3. Process candidate participants with optional multi-entry support (ENH-04)
    for (const candidate of candidateParticipants) {
      const trimmedName = String(candidate.name || '').trim();
      if (!trimmedName) continue;

      const normName = trimmedName.toLowerCase();
      if (!allow_multi_entry && existingNamesSet.has(normName)) {
        skipped.push({
          name: trimmedName,
          reason: 'Sudah terdaftar di event aktif (dilewati untuk cegah duplikasi)'
        });
        continue;
      }

      // Add new participant
      const uId = uuidv4();
      const team = candidate.team_name ? String(candidate.team_name).trim().substring(0, 50) : null;

      insertStmt.run(uId, trimmedName, team, targetEventId, nextNum);
      if (!allow_multi_entry) {
        existingNamesSet.add(normName);
      }

      added.push({
        id: uId,
        name: trimmedName,
        team_name: team,
        participant_number: nextNum,
        event_id: targetEventId
      });

      nextNum++;
    }

    // 4. Update tournament_settings
    const nowIso = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_sync_url', ?, CURRENT_TIMESTAMP)").run(rawUrl);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_last_sync_time', ?, CURRENT_TIMESTAMP)").run(nowIso);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_last_sync_count', ?, CURRENT_TIMESTAMP)").run(String(added.length));

    return {
      totalFound: candidateParticipants.length,
      addedCount: added.length,
      skippedCount: skipped.length,
      added,
      skipped,
      sheetUrl: rawUrl,
      exportUrl,
      targetEventId,
      syncedAt: nowIso
    };
  })();
}
