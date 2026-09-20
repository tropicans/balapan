import db, { initDatabase } from '../server/db.js';
import { RaceManager } from '../server/raceManager.js';

await initDatabase();

console.log('🚀 Updating Babak 3 (Round 3) empty heats to No Race status...');

// Heats to mark as No Race: 6, 12, 15, 18, 19, 21
// Corresponding match_numbers in Round 3: 206, 212, 215, 218, 219, 221
const emptyHeatsMatchNumbers = [206, 212, 215, 218, 219, 221];

let updatedCount = 0;

for (const matchNum of emptyHeatsMatchNumbers) {
  const match = db.prepare('SELECT id, match_number, status, winner_id FROM bracket_matches WHERE round_number = 3 AND match_number = ?').get(matchNum);
  if (match) {
    db.prepare(`
      UPDATE bracket_matches 
      SET status = 'completed', winner_id = NULL 
      WHERE id = ?
    `).run(match.id);
    console.log(`✅ Heat #${matchNum - 200} (match_number ${matchNum}, ID ${match.id}) updated to No Race (status: completed, winner_id: NULL)`);
    updatedCount++;
  } else {
    console.warn(`⚠️ Match with match_number ${matchNum} not found in Round 3`);
  }
}

console.log(`\n🎉 Successfully updated ${updatedCount} empty Babak 3 heats to No Race!`);
process.exit(0);
