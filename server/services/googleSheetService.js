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
      SELECT id, name, team_name, participant_number, source_key 
      FROM users 
      WHERE event_id = ? AND role = 'participant'
    `).all(targetEventId);

    const existingBySourceKey = new Map();
    const existingByName = new Map();
    const existingNamesSet = new Set();

    for (const r of existingRows) {
      const norm = String(r.name || '').trim().toLowerCase();
      if (norm) {
        existingNamesSet.add(norm);
        if (!existingByName.has(norm)) {
          existingByName.set(norm, r);
        }
      }
      if (r.source_key) {
        existingBySourceKey.set(r.source_key, r);
      }
    }

    // 2. Query highest participant number in active event
    const row = db.prepare(`
      SELECT COALESCE(MAX(participant_number), 0) AS max_num 
      FROM users 
      WHERE event_id = ?
    `).get(targetEventId);

    let nextNum = (row?.max_num || 0) + 1;

    const added = [];
    const updated = [];
    const skipped = [...parseSkipped];

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number, source_key
      ) VALUES (?, ?, NULL, NULL, ?, 'participant', 0, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE users 
      SET name = ?, team_name = ?, source_key = COALESCE(source_key, ?) 
      WHERE id = ?
    `);

    const linkSourceKeyStmt = db.prepare(`
      UPDATE users 
      SET source_key = ? 
      WHERE id = ? AND source_key IS NULL
    `);

    // 3. Process candidate participants with auto-update by source_key / name
    for (const candidate of candidateParticipants) {
      const trimmedName = String(candidate.name || '').trim();
      if (!trimmedName) continue;

      const normName = trimmedName.toLowerCase();
      const candidateSourceKey = candidate.source_key || null;
      const team = candidate.team_name ? String(candidate.team_name).trim().substring(0, 50) : null;

      // 3a. Match by source_key if available
      let matchedUser = candidateSourceKey ? existingBySourceKey.get(candidateSourceKey) : null;

      // 3b. If not matched by source_key, check exact name match (links legacy unkeyed DB rows)
      if (!matchedUser && existingByName.has(normName)) {
        const userByName = existingByName.get(normName);
        if (!userByName.source_key) {
          if (candidateSourceKey) {
            linkSourceKeyStmt.run(candidateSourceKey, userByName.id);
            userByName.source_key = candidateSourceKey;
            existingBySourceKey.set(candidateSourceKey, userByName);
          }
          matchedUser = userByName;
        } else if (!allow_multi_entry) {
          skipped.push({
            name: trimmedName,
            reason: 'Sudah terdaftar di event aktif (dilewati untuk cegah duplikasi)'
          });
          continue;
        }
      }

      // 3c. If still not matched, check if an unlinked row has matching participant_number / source_no
      if (!matchedUser && candidateSourceKey && candidate.source_no && !isNaN(Number(candidate.source_no))) {
        const candidateNum = Number(candidate.source_no);
        const unlinkedUser = existingRows.find(u => !u.source_key && u.participant_number === candidateNum);
        if (unlinkedUser) {
          // Check if an unreferenced phantom duplicate was previously inserted for this renamed candidate
          const duplicateUser = existingRows.find(u => 
            u.id !== unlinkedUser.id && 
            String(u.name || '').trim().toLowerCase() === normName &&
            u.participant_number > candidateNum
          );

          if (duplicateUser) {
            let inMatch = false;
            try {
              const m = db.prepare(`
                SELECT id FROM bracket_matches 
                WHERE user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ? OR winner_id = ? 
                LIMIT 1
              `).get(duplicateUser.id, duplicateUser.id, duplicateUser.id, duplicateUser.id);
              if (m) inMatch = true;
            } catch (_) {}

            let inBto = false;
            try {
              const b = db.prepare('SELECT id FROM bto_records WHERE user_id = ? LIMIT 1').get(duplicateUser.id);
              if (b) inBto = true;
            } catch (_) {}

            if (!inMatch && !inBto) {
              db.prepare('DELETE FROM users WHERE id = ?').run(duplicateUser.id);
              existingByName.delete(normName);
              const dIdx = existingRows.findIndex(u => u.id === duplicateUser.id);
              if (dIdx !== -1) existingRows.splice(dIdx, 1);
            }
          }

          linkSourceKeyStmt.run(candidateSourceKey, unlinkedUser.id);
          unlinkedUser.source_key = candidateSourceKey;
          existingBySourceKey.set(candidateSourceKey, unlinkedUser);
          matchedUser = unlinkedUser;
        }
      }

      // 3d. If matched user found -> UPDATE if name or team changed, or SKIP if identical
      if (matchedUser) {
        const currentName = String(matchedUser.name || '').trim();
        const currentTeam = matchedUser.team_name ? String(matchedUser.team_name).trim() : null;

        const nameChanged = currentName !== trimmedName;
        const teamChanged = (currentTeam || null) !== (team || null);

        if (nameChanged || teamChanged) {
          updateStmt.run(trimmedName, team, candidateSourceKey, matchedUser.id);

          updated.push({
            id: matchedUser.id,
            participant_number: matchedUser.participant_number,
            old_name: currentName,
            new_name: trimmedName,
            old_team: currentTeam,
            new_team: team,
            event_id: targetEventId
          });

          // Update memory maps
          existingNamesSet.delete(currentName.toLowerCase());
          existingNamesSet.add(normName);
          matchedUser.name = trimmedName;
          matchedUser.team_name = team;
          if (candidateSourceKey && !matchedUser.source_key) {
            matchedUser.source_key = candidateSourceKey;
          }
          existingByName.set(normName, matchedUser);
        } else {
          skipped.push({
            name: trimmedName,
            reason: 'Sudah terdaftar di event aktif (data sama persis)'
          });
        }
        continue;
      }

      // 3e. If not matched, check allow_multi_entry
      if (!allow_multi_entry && existingNamesSet.has(normName)) {
        skipped.push({
          name: trimmedName,
          reason: 'Sudah terdaftar di event aktif (dilewati untuk cegah duplikasi)'
        });
        continue;
      }

      // 3f. Truly new participant: INSERT
      const uId = uuidv4();
      insertStmt.run(uId, trimmedName, team, targetEventId, nextNum, candidateSourceKey);

      const newRecord = {
        id: uId,
        name: trimmedName,
        team_name: team,
        participant_number: nextNum,
        source_key: candidateSourceKey,
        event_id: targetEventId
      };

      added.push(newRecord);
      existingRows.push(newRecord);
      if (candidateSourceKey) {
        existingBySourceKey.set(candidateSourceKey, newRecord);
      }
      existingByName.set(normName, newRecord);
      existingNamesSet.add(normName);

      nextNum++;
    }

    // 4. Update tournament_settings
    const nowIso = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_sync_url', ?, CURRENT_TIMESTAMP)").run(rawUrl);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_last_sync_time', ?, CURRENT_TIMESTAMP)").run(nowIso);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_last_sync_count', ?, CURRENT_TIMESTAMP)").run(String(added.length));
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_last_sync_updated_count', ?, CURRENT_TIMESTAMP)").run(String(updated.length));

    return {
      totalFound: candidateParticipants.length,
      addedCount: added.length,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      added,
      updated,
      skipped,
      sheetUrl: rawUrl,
      exportUrl,
      targetEventId,
      syncedAt: nowIso
    };
  })();
}
