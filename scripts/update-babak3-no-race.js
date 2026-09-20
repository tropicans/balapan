import 'dotenv/config';

if (!process.env.DB_DRIVER && (process.env.POSTGRES_USER || process.env.POSTGRES_HOST || process.env.POSTGRES_URL)) {
  process.env.DB_DRIVER = 'postgres';
}

import db, { initDatabase } from '../server/db.js';
import { getActiveEventId } from '../server/services/eventService.js';

await initDatabase();

console.log('🚀 Synchronizing Event ID & Updating Babak 3 empty heats to No Race status...');

// 1. Get current active event ID
let activeEventId = getActiveEventId();
console.log(`📌 Current Active Event ID: ${activeEventId}`);

// If no active event or active event has no bracket matches, find the event that owns bracket_matches
const eventWithMatches = db.prepare('SELECT event_id, COUNT(*) as cnt FROM bracket_matches WHERE event_id IS NOT NULL GROUP BY event_id ORDER BY cnt DESC LIMIT 1').get();

if (eventWithMatches && eventWithMatches.event_id) {
  console.log(`📌 Found event ${eventWithMatches.event_id} holding ${eventWithMatches.cnt} bracket matches`);
  
  // Set target event to active
  db.prepare("UPDATE events SET status = 'archived' WHERE status = 'active' AND id != ?").run(eventWithMatches.event_id);
  db.prepare("UPDATE events SET status = 'active' WHERE id = ?").run(eventWithMatches.event_id);
  activeEventId = eventWithMatches.event_id;
  console.log(`✅ Activated event ${activeEventId} so UI renders all bracket matches!`);
}

// 2. Also ensure all NULL event_id bracket matches are attached to activeEventId
if (activeEventId) {
  db.prepare('UPDATE bracket_matches SET event_id = ? WHERE event_id IS NULL').run(activeEventId);
}

// 3. We want to mark Heat #6, #12, #15, #18, #19, and #21 as No Race
const targetHeatNumbers = [6, 12, 15, 18, 19, 21];

// Inspect all matches in bracket_matches
const allMatches = db.prepare('SELECT id, match_number, round_number, status, winner_id FROM bracket_matches ORDER BY round_number DESC, match_number ASC').all();

console.log(`📋 Total bracket_matches in active DB: ${allMatches.length}`);

// Group by round_number
const rounds = {};
for (const m of allMatches) {
  if (!rounds[m.round_number]) rounds[m.round_number] = [];
  rounds[m.round_number].push(m);
}

console.log('📊 Rounds summary:', Object.keys(rounds).map(r => `Round ${r}: ${rounds[r].length} matches`));

let targetRoundNumber = 3;
if (!rounds[3] || rounds[3].length === 0) {
  const roundWithMost = Object.keys(rounds).reduce((a, b) => rounds[a].length > rounds[b].length ? a : b, 3);
  targetRoundNumber = Number(roundWithMost);
  console.log(`ℹ️ Using Round ${targetRoundNumber} as target round for Babak 3`);
}

const targetMatches = rounds[targetRoundNumber] || allMatches;
console.log(`📋 Target matches count: ${targetMatches.length}`);

let updatedCount = 0;

for (const heatNum of targetHeatNumbers) {
  let targetMatch = null;

  // Try exact match_number (e.g. 206, or 6, or 200 + heatNum)
  targetMatch = targetMatches.find(m => m.match_number === (200 + heatNum) || m.match_number === heatNum);

  // Try match by ordinal index (heatNum - 1)
  if (!targetMatch && targetMatches.length >= heatNum) {
    targetMatch = targetMatches[heatNum - 1];
  }

  if (targetMatch) {
    db.prepare(`
      UPDATE bracket_matches 
      SET status = 'completed', winner_id = NULL 
      WHERE id = ?
    `).run(targetMatch.id);
    console.log(`✅ Heat #${heatNum} (Match ID: ${targetMatch.id}, match_number: ${targetMatch.match_number}, round: ${targetMatch.round_number}) updated to No Race (status: completed, winner_id: NULL)`);
    updatedCount++;
  } else {
    console.warn(`⚠️ Heat #${heatNum} not found in target round matches`);
  }
}

console.log(`\n🎉 Successfully updated ${updatedCount} empty Babak 3 heats to No Race!`);
process.exit(0);
