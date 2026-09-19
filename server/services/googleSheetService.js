import crypto from 'crypto';
import db from '../db.js';
import { getActiveEventId } from './eventService.js';
import { parseParticipantCsv, tokenizeCsv } from '../utils/csvParser.js';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FZC65RxP3XMZM4FtsCTSt3C-EabqYbky/edit?gid=1028020136#gid=1028020136';
export const DEFAULT_BRACKET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FZC65RxP3XMZM4FtsCTSt3C-EabqYbky/edit?gid=1237789593#gid=1237789593';

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
 * Retrieves the stored Google Sheets bracket sync configuration.
 */
export function getBracketSyncConfig() {
  try {
    const urlSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_bracket_sync_url'").get();
    const lastSyncSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_bracket_last_sync_time'").get();
    const lastCountSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_bracket_last_sync_count'").get();
    const lastUpdatedSetting = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_bracket_last_sync_updated_count'").get();

    return {
      configuredUrl: urlSetting?.value || DEFAULT_BRACKET_SHEET_URL,
      lastSyncTime: lastSyncSetting?.value || null,
      lastSyncCount: lastCountSetting?.value ? Number(lastCountSetting.value) : 0,
      lastSyncUpdatedCount: lastUpdatedSetting?.value ? Number(lastUpdatedSetting.value) : 0
    };
  } catch (e) {
    return {
      configuredUrl: DEFAULT_BRACKET_SHEET_URL,
      lastSyncTime: null,
      lastSyncCount: 0,
      lastSyncUpdatedCount: 0
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

/**
 * Parses bracket/heat CSV exported from Google Sheets (e.g., Tab 2 / Babak selanjutnya).
 *
 * @param {string} csvText
 * @returns {Array<Object>}
 */
export function parseBracketCsv(csvText) {
  const rows = tokenizeCsv(csvText);
  let currentRound = { round_number: 2, is_final: 0, title: 'BABAK 1' };
  const heats = [];

  for (const rawRow of rows) {
    const cells = rawRow.map(c => String(c || '').trim());
    if (cells.every(c => !c)) continue;

    const firstCell = cells[0];
    const babakMatch = firstCell.match(/^BABAK\s*(\d+)/i);
    if (babakMatch) {
      const bNum = parseInt(babakMatch[1], 10);
      const isFinal = /FINAL/i.test(firstCell) && !/SEMI/i.test(firstCell) ? 1 : 0;
      currentRound = {
        round_number: bNum + 1, // Babak 1 in tournament maps to round_number 2 in DGDASH
        is_final: isFinal,
        title: firstCell
      };
      continue;
    }

    const raceNum = parseInt(firstCell, 10);
    if (!isNaN(raceNum) && raceNum > 0) {
      const laneA = cells[1] || '';
      const laneB = cells[2] || '';
      const laneC = cells[3] || '';
      const finisher = cells[4] || '';

      if (laneA || laneB || laneC || finisher) {
        heats.push({
          round_number: currentRound.round_number,
          match_number: raceNum,
          is_final: currentRound.is_final,
          lane_a: laneA,
          lane_b: laneB,
          lane_c: laneC,
          finisher: finisher
        });
      }
    }
  }

  return heats;
}

/**
 * Robust participant resolver that matches sheet name strings against the active event roster.
 * Supports exact match, participant number references (e.g. "no. 18"), substring containment, and token overlap.
 *
 * @param {string} rawName
 * @param {Array<Object>} roster
 * @returns {Object|null}
 */
export function resolveParticipantForBracket(rawName, roster) {
  if (!rawName || !Array.isArray(roster) || roster.length === 0) return null;
  const clean = String(rawName).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return null;

  // Strategy A: Exact name match
  const exact = roster.find(p => String(p.name || '').trim().toLowerCase() === clean);
  if (exact) return exact;

  // Strategy B: Participant number reference (e.g. "no. 18", "#18")
  const numMatch = clean.match(/^(?:no\.?|#)\s*(\d+)$/);
  if (numMatch) {
    const pNum = parseInt(numMatch[1], 10);
    const byNum = roster.find(p => p.participant_number === pNum || Number(p.source_no) === pNum);
    if (byNum) return byNum;
  }

  // Strategy C: Substring / Containment match
  const containmentMatches = roster.filter(p => {
    const pName = String(p.name || '').trim().toLowerCase();
    return pName && (pName.includes(clean) || clean.includes(pName));
  });
  if (containmentMatches.length === 1) return containmentMatches[0];

  // Strategy D: Token overlap (words of 3 or more characters)
  const tokens = clean.split(' ').filter(t => t.length >= 3);
  if (tokens.length > 0) {
    const tokenMatches = roster.filter(p => {
      const pTokens = String(p.name || '').trim().toLowerCase().split(' ').filter(t => t.length >= 3);
      return tokens.some(t => pTokens.includes(t));
    });
    if (tokenMatches.length >= 1) return tokenMatches[0];
  }

  return null;
}

/**
 * Synchronizes elimination heats/matches from Google Sheets Tab 2 into the active event bracket.
 *
 * @param {Object} [options]
 * @param {string} [options.sheet_url]
 * @param {string} [options.event_id]
 * @param {string} [options.csv_override]
 * @returns {Promise<Object>}
 */
export async function syncBracketFromSheet({ sheet_url, event_id, csv_override } = {}) {
  const targetEventId = event_id || getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  const rawUrl = sheet_url || getBracketSyncConfig().configuredUrl || DEFAULT_BRACKET_SHEET_URL;
  const exportUrl = normalizeGoogleSheetUrl(rawUrl);

  const csvText = csv_override || await fetchGoogleSheetCsv(exportUrl);
  const heats = parseBracketCsv(csvText);

  return db.transaction(() => {
    // 1. Fetch participants roster in active event
    const roster = db.prepare(`
      SELECT id, name, participant_number, source_key, team_name 
      FROM users 
      WHERE event_id = ? AND role = 'participant'
    `).all(targetEventId);

    // 2. Fetch existing bracket matches in active event
    const existingMatches = db.prepare(`
      SELECT * FROM bracket_matches 
      WHERE event_id = ?
    `).all(targetEventId);

    const existingByRoundAndMatch = new Map();
    for (const m of existingMatches) {
      existingByRoundAndMatch.set(`${m.round_number}_${m.match_number}`, m);
    }

    const added = [];
    const updated = [];
    const skipped = [];

    const insertStmt = db.prepare(`
      INSERT INTO bracket_matches (
        id, event_id, match_number, round_number, user_id_1, user_id_2, user_id_3, winner_id, status, is_final
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE bracket_matches 
      SET user_id_1 = ?, user_id_2 = ?, user_id_3 = ?, winner_id = ?, status = ?, is_final = ?
      WHERE id = ?
    `);

    for (const heat of heats) {
      const user1 = resolveParticipantForBracket(heat.lane_a, roster);
      const user2 = resolveParticipantForBracket(heat.lane_b, roster);
      const user3 = resolveParticipantForBracket(heat.lane_c, roster);

      const userId1 = user1?.id || null;
      const userId2 = user2?.id || null;
      const userId3 = user3?.id || null;

      let winnerId = null;
      if (heat.finisher) {
        const finisherUser = resolveParticipantForBracket(heat.finisher, roster);
        if (finisherUser) {
          winnerId = finisherUser.id;
        }
      }

      // In SQLite, match_number has a UNIQUE constraint across the table.
      // Babak 1 (round_number 2) uses match_number directly (1..25).
      // Future rounds (Babak 2, 3) offset by (round_number - 1) * 100 to stay unique.
      const dbMatchNumber = heat.round_number === 2 
        ? heat.match_number 
        : ((heat.round_number - 1) * 100 + heat.match_number);

      const key = `${heat.round_number}_${dbMatchNumber}`;
      const existing = existingByRoundAndMatch.get(key) || existingMatches.find(m => m.round_number === heat.round_number && m.match_number === dbMatchNumber);

      if (existing) {
        const currentWinnerId = existing.winner_id || null;
        const newWinnerId = winnerId !== null ? winnerId : currentWinnerId;
        const newStatus = newWinnerId ? 'completed' : (existing.status === 'completed' && !newWinnerId ? 'pending' : existing.status);

        const changed = (
          (existing.user_id_1 || null) !== (userId1 || null) ||
          (existing.user_id_2 || null) !== (userId2 || null) ||
          (existing.user_id_3 || null) !== (userId3 || null) ||
          (currentWinnerId !== newWinnerId) ||
          (existing.status !== newStatus) ||
          Number(existing.is_final || 0) !== Number(heat.is_final || 0)
        );

        if (changed) {
          updateStmt.run(userId1, userId2, userId3, newWinnerId, newStatus, heat.is_final, existing.id);
          updated.push({
            id: existing.id,
            match_number: heat.match_number,
            db_match_number: dbMatchNumber,
            round_number: heat.round_number,
            user_id_1: userId1,
            user_id_2: userId2,
            user_id_3: userId3,
            winner_id: newWinnerId,
            status: newStatus
          });
          // Update in-memory cache
          existing.user_id_1 = userId1;
          existing.user_id_2 = userId2;
          existing.user_id_3 = userId3;
          existing.winner_id = newWinnerId;
          existing.status = newStatus;
          existing.is_final = heat.is_final;
        } else {
          skipped.push({
            match_number: heat.match_number,
            round_number: heat.round_number,
            reason: 'Data heat identik'
          });
        }
      } else {
        const matchId = uuidv4();
        const status = winnerId ? 'completed' : 'pending';

        insertStmt.run(
          matchId,
          targetEventId,
          dbMatchNumber,
          heat.round_number,
          userId1,
          userId2,
          userId3,
          winnerId,
          status,
          heat.is_final
        );

        const newRecord = {
          id: matchId,
          event_id: targetEventId,
          match_number: heat.match_number,
          db_match_number: dbMatchNumber,
          round_number: heat.round_number,
          user_id_1: userId1,
          user_id_2: userId2,
          user_id_3: userId3,
          winner_id: winnerId,
          status,
          is_final: heat.is_final
        };

        added.push(newRecord);
        existingMatches.push(newRecord);
        existingByRoundAndMatch.set(key, newRecord);
      }
    }

    const nowIso = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_bracket_sync_url', ?, CURRENT_TIMESTAMP)").run(rawUrl);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_bracket_last_sync_time', ?, CURRENT_TIMESTAMP)").run(nowIso);
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_bracket_last_sync_count', ?, CURRENT_TIMESTAMP)").run(String(added.length));
    db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_bracket_last_sync_updated_count', ?, CURRENT_TIMESTAMP)").run(String(updated.length));

    return {
      totalFound: heats.length,
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

let lastParticipantCsvHash = null;
let lastBracketCsvHash = null;

/**
 * Synchronizes both participants (Tab 1) and bracket elimination heats (Tab 2).
 * Uses MD5 hash comparison to skip redundant database operations if sheets are unchanged.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force=false]
 * @returns {Promise<Object>}
 */
export async function syncAllFromGoogleSheets({ force = false } = {}) {
  const targetEventId = getActiveEventId();
  if (!targetEventId) {
    throw new Error('Tidak ada event aktif. Aktifkan atau buat event terlebih dahulu di Manajemen Event.');
  }

  const pUrlRaw = getSheetSyncConfig().configuredUrl || DEFAULT_SHEET_URL;
  const bUrlRaw = getBracketSyncConfig().configuredUrl || DEFAULT_BRACKET_SHEET_URL;

  const pExportUrl = normalizeGoogleSheetUrl(pUrlRaw);
  const bExportUrl = normalizeGoogleSheetUrl(bUrlRaw);

  const [pCsvText, bCsvText] = await Promise.all([
    fetchGoogleSheetCsv(pExportUrl),
    fetchGoogleSheetCsv(bExportUrl)
  ]);

  const pHash = crypto.createHash('md5').update(pCsvText).digest('hex');
  const bHash = crypto.createHash('md5').update(bCsvText).digest('hex');

  const pUnchanged = pHash === lastParticipantCsvHash;
  const bUnchanged = bHash === lastBracketCsvHash;

  if (!force && pUnchanged && bUnchanged) {
    return {
      unchanged: true,
      hasChanges: false,
      message: 'Kedua sheet tidak mengalami perubahan (konten sama persis)',
      participants: { addedCount: 0, updatedCount: 0, skippedCount: 0 },
      bracket: { addedCount: 0, updatedCount: 0, skippedCount: 0 },
      syncedAt: new Date().toISOString()
    };
  }

  // 1. Sync participants first so bracket resolver has the freshest participant roster
  let participantResult = { addedCount: 0, updatedCount: 0, skippedCount: 0 };
  if (force || !pUnchanged) {
    participantResult = await syncParticipantsFromSheet({
      sheet_url: pUrlRaw,
      event_id: targetEventId,
      csv_override: pCsvText
    });
    lastParticipantCsvHash = pHash;
  }

  // 2. Sync bracket heats
  let bracketResult = { addedCount: 0, updatedCount: 0, skippedCount: 0 };
  if (force || !bUnchanged || participantResult.addedCount > 0 || participantResult.updatedCount > 0) {
    bracketResult = await syncBracketFromSheet({
      sheet_url: bUrlRaw,
      event_id: targetEventId,
      csv_override: bCsvText
    });
    lastBracketCsvHash = bHash;
  }

  const hasChanges = (
    (participantResult.addedCount || 0) > 0 ||
    (participantResult.updatedCount || 0) > 0 ||
    (bracketResult.addedCount || 0) > 0 ||
    (bracketResult.updatedCount || 0) > 0
  );

  return {
    unchanged: false,
    hasChanges,
    participants: participantResult,
    bracket: bracketResult,
    syncedAt: new Date().toISOString()
  };
}

