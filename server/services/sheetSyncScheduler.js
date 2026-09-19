import db from '../db.js';
import { 
  syncAllFromGoogleSheets, 
  getSheetSyncConfig, 
  getBracketSyncConfig,
  DEFAULT_SHEET_URL,
  DEFAULT_BRACKET_SHEET_URL
} from './googleSheetService.js';

let schedulerIntervalId = null;
let ioInstance = null;
let broadcastFullStateFn = null;
let isSyncInProgress = false;

let lastRunAt = null;
let lastStatus = 'idle'; // 'idle' | 'running' | 'success' | 'error'
let lastError = null;
let lastResultSummary = null;

/**
 * Reads scheduler configuration from tournament_settings.
 *
 * @returns {{ enabled: boolean, intervalSeconds: number, participantUrl: string, bracketUrl: string }}
 */
export function getSchedulerConfig() {
  try {
    const enabledRow = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_auto_sync_enabled'").get();
    const intervalRow = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_auto_sync_interval_seconds'").get();
    const pUrlRow = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_sync_url'").get();
    const bUrlRow = db.prepare("SELECT value FROM tournament_settings WHERE key = 'google_sheet_bracket_sync_url'").get();

    return {
      enabled: enabledRow ? enabledRow.value === 'true' : true, // default enabled
      intervalSeconds: intervalRow?.value ? Math.max(10, parseInt(intervalRow.value, 10)) : 60, // default 60s
      participantUrl: pUrlRow?.value || DEFAULT_SHEET_URL,
      bracketUrl: bUrlRow?.value || DEFAULT_BRACKET_SHEET_URL
    };
  } catch (e) {
    return {
      enabled: true,
      intervalSeconds: 60,
      participantUrl: DEFAULT_SHEET_URL,
      bracketUrl: DEFAULT_BRACKET_SHEET_URL
    };
  }
}

/**
 * Returns runtime telemetry and state for UI diagnostics.
 */
export function getSchedulerStatus() {
  const config = getSchedulerConfig();
  return {
    ...config,
    isRunning: Boolean(schedulerIntervalId),
    isSyncInProgress,
    lastRunAt,
    lastStatus,
    lastError: lastError ? (lastError.message || String(lastError)) : null,
    lastResultSummary,
    participantConfig: getSheetSyncConfig(),
    bracketConfig: getBracketSyncConfig()
  };
}

/**
 * Updates scheduler config in tournament_settings and adjusts the running interval.
 */
export function updateSchedulerConfig({ enabled, intervalSeconds, participantUrl, bracketUrl } = {}) {
  return db.transaction(() => {
    if (enabled !== undefined) {
      const val = enabled ? 'true' : 'false';
      db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_auto_sync_enabled', ?, CURRENT_TIMESTAMP)").run(val);
    }

    if (intervalSeconds !== undefined) {
      const sec = Math.max(10, parseInt(intervalSeconds, 10) || 60);
      db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_auto_sync_interval_seconds', ?, CURRENT_TIMESTAMP)").run(String(sec));
    }

    if (participantUrl) {
      db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_sync_url', ?, CURRENT_TIMESTAMP)").run(String(participantUrl).trim());
    }

    if (bracketUrl) {
      db.prepare("INSERT OR REPLACE INTO tournament_settings (key, value, updated_at) VALUES ('google_sheet_bracket_sync_url', ?, CURRENT_TIMESTAMP)").run(String(bracketUrl).trim());
    }

    restartSheetSyncScheduler();
    return getSchedulerStatus();
  })();
}

/**
 * Executes a single sync pass (participants + bracket) and broadcasts if state changed.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force=false]
 * @returns {Promise<Object>}
 */
export async function runSyncJob({ force = false } = {}) {
  if (isSyncInProgress) {
    return { skipped: true, reason: 'Sync already in progress' };
  }

  isSyncInProgress = true;
  lastStatus = 'running';
  lastRunAt = new Date().toISOString();
  lastError = null;

  try {
    const result = await syncAllFromGoogleSheets({ force });
    lastStatus = 'success';
    lastResultSummary = {
      participantsAdded: result.participants?.addedCount || 0,
      participantsUpdated: result.participants?.updatedCount || 0,
      bracketAdded: result.bracket?.addedCount || 0,
      bracketUpdated: result.bracket?.updatedCount || 0,
      unchanged: Boolean(result.unchanged),
      timestamp: lastRunAt
    };

    if (result.hasChanges) {
      if (ioInstance) {
        if ((result.participants?.addedCount || 0) > 0 || (result.participants?.updatedCount || 0) > 0) {
          ioInstance.emit('participants_imported', {
            count: result.participants.addedCount,
            updatedCount: result.participants.updatedCount,
            event_id: result.participants.targetEventId
          });
        }
        if ((result.bracket?.addedCount || 0) > 0 || (result.bracket?.updatedCount || 0) > 0) {
          ioInstance.emit('bracket_updated', {
            addedCount: result.bracket.addedCount,
            updatedCount: result.bracket.updatedCount,
            event_id: result.bracket.targetEventId
          });
        }
      }
      if (broadcastFullStateFn) {
        broadcastFullStateFn();
      }
    }

    return result;
  } catch (err) {
    console.error('⚠️ [Google Sheet Auto-Sync] Background sync error:', err.message);
    lastStatus = 'error';
    lastError = err;
    throw err;
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Starts background sync interval loop.
 *
 * @param {Object} io - Socket.io instance
 * @param {Function} broadcastFn - State broadcaster function
 */
export function startSheetSyncScheduler(io, broadcastFn) {
  if (io) ioInstance = io;
  if (broadcastFn) broadcastFullStateFn = broadcastFn;

  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }

  const config = getSchedulerConfig();
  if (!config.enabled) {
    console.log('ℹ️ [Google Sheet Auto-Sync] Scheduler disabled in tournament_settings');
    return;
  }

  const intervalMs = config.intervalSeconds * 1000;
  console.log(`⏱️ [Google Sheet Auto-Sync] Scheduler started (interval: ${config.intervalSeconds}s)`);

  // Initial sync 3s after boot
  const bootTimer = setTimeout(() => {
    runSyncJob({ force: false }).catch(err => {
      console.warn('⚠️ [Google Sheet Auto-Sync] Initial boot sync failed:', err.message);
    });
  }, 3000);
  if (bootTimer && typeof bootTimer.unref === 'function') {
    bootTimer.unref();
  }

  // Periodic interval
  schedulerIntervalId = setInterval(() => {
    runSyncJob({ force: false }).catch(err => {
      console.warn('⚠️ [Google Sheet Auto-Sync] Interval sync failed:', err.message);
    });
  }, intervalMs);
  if (schedulerIntervalId && typeof schedulerIntervalId.unref === 'function') {
    schedulerIntervalId.unref();
  }
}

/**
 * Stops background sync interval loop.
 */
export function stopSheetSyncScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log('🛑 [Google Sheet Auto-Sync] Scheduler stopped');
  }
}

/**
 * Restarts scheduler with current configuration.
 */
export function restartSheetSyncScheduler() {
  stopSheetSyncScheduler();
  startSheetSyncScheduler(ioInstance, broadcastFullStateFn);
}
