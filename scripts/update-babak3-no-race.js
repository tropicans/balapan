import 'dotenv/config';

if (!process.env.DB_DRIVER && (process.env.POSTGRES_USER || process.env.POSTGRES_HOST || process.env.POSTGRES_URL)) {
  process.env.DB_DRIVER = 'postgres';
}

import db, { initDatabase } from '../server/db.js';

await initDatabase();

console.log('🚀 Updating Babak 3 empty heats to No Race status...');

// We want to mark Heat #6, #12, #15, #18, #19, and #21 as No Race
const targetHeatNumbers = [6, 12, 15, 18, 19, 21];

// Inspect all matches in bracket_matches
const allMatches = db.prepare('SELECT id, match_number, round_number, status, winner_id FROM bracket_matches ORDER BY round_number DESC, match_number ASC').all();

console.log(`📋 Total bracket_matches in DB: ${allMatches.length}`);

// Group by round_number
const rounds = {};
for (const m of allMatches) {
  if (!rounds[m.round_number]) rounds[m.round_number] = [];
  rounds[m.round_number].push(m);
}

console.log('📊 Rounds summary:', Object.keys(rounds).map(r => `Round ${r}: ${rounds[r].length} matches`));

// Find the target round (either round_number = 3 or the round with >= 21 matches)
let targetRoundNumber = 3;
if (!rounds[3] || rounds[3].length === 0) {
  // Find round with most matches
  const roundWithMost = Object.keys(rounds).reduce((a, b) => rounds[a].length > rounds[b].length ? a : b, 3);
  targetRoundNumber = Number(roundWithMost);
  console.log(`ℹ️ Using Round ${targetRoundNumber} as target round for Babak 3`);
}

const targetMatches = rounds[targetRoundNumber] || allMatches;
console.log(`📋 Target matches count: ${targetMatches.length}`);
if (targetMatches.length > 0) {
  console.log(`📋 Sample match_numbers in target round:`, targetMatches.map(m => m.match_number).slice(0, 25));
}

let updatedCount = 0;

for (const heatNum of targetHeatNumbers) {
  let targetMatch = null;

  // 1. Try exact match_number (e.g. 206, or 6, or 200 + heatNum)
  targetMatch = targetMatches.find(m => m.match_number === (200 + heatNum) || m.match_number === heatNum);

  // 2. Try match by ordinal index (heatNum - 1)
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
