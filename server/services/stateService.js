import db from '../db.js';
import { getActiveEvent, getActiveEventId } from './eventService.js';
import { getBtoLeaderboard } from './btoService.js';

/**
 * Returns the v3.0 canonical state contract:
 * - activeEvent
 * - participants
 * - bracketMatches
 * - btoLeaderboard
 * - settings
 * Includes backward-safe fallbacks for legacy client compatibility.
 */
export function getFullState() {
  const activeEvent = getActiveEvent();
  const activeEventId = activeEvent?.id || null;

  // 1. Participants for active event
  const participants = activeEventId
    ? db.prepare(`
        SELECT id, name, team_name, role, event_id, participant_number, created_at
        FROM users
        WHERE event_id = ? AND role = 'participant'
        ORDER BY participant_number ASC
      `).all(activeEventId)
    : [];

  // 2. Bracket Matches for active event
  const bracketMatches = activeEventId
    ? db.prepare(`
        SELECT 
          bm.*,
          u1.name as user_1_name, u1.team_name as user_1_team, u1.participant_number as participant_number_1,
          u2.name as user_2_name, u2.team_name as user_2_team, u2.participant_number as participant_number_2,
          u3.name as user_3_name, u3.team_name as user_3_team, u3.participant_number as participant_number_3,
          w.name as winner_name
        FROM bracket_matches bm
        LEFT JOIN users u1 ON bm.user_id_1 = u1.id
        LEFT JOIN users u2 ON bm.user_id_2 = u2.id
        LEFT JOIN users u3 ON bm.user_id_3 = u3.id
        LEFT JOIN users w ON bm.winner_id = w.id
        WHERE bm.event_id = ?
        ORDER BY bm.round_number ASC, bm.match_number ASC
      `).all(activeEventId)
    : [];

  // 3. Canonical BTO Leaderboard (Phase 13)
  const btoLeaderboard = getBtoLeaderboard({ event_id: activeEventId, limit: 10 });

  // 4. Tournament Settings
  const settingsRows = db.prepare('SELECT key, value FROM tournament_settings').all();
  const settings = {};
  for (const s of settingsRows) {
    settings[s.key] = s.value;
  }

  return {
    activeEvent,
    participants,
    bracketMatches,
    btoLeaderboard,
    settings,
    serverTime: new Date().toISOString(),

    // Legacy client compatibility fallbacks (empty/mock)
    activeRace: { id: 'v3-manual', race_number: 1, status: 'completed', registrations: [] },
    upcomingRaces: [],
    scrutineerQueue: [],
    ticketStats: {
      total_issued: 0,
      total_void: 0,
      target_quota: 24,
      remaining_quota: 24,
      is_locked: false,
      is_critical: false,
      racers: [],
      tickets: []
    }
  };
}

export default {
  getFullState
};
