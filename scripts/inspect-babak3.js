import 'dotenv/config';
import db, { initDatabase } from '../server/db.js';

await initDatabase();

console.log('🔍 Inspecting bracket_matches in database...');

const allRounds = db.prepare('SELECT DISTINCT round_number, COUNT(*) as count FROM bracket_matches GROUP BY round_number ORDER BY round_number ASC').all();
console.log('📊 Matches count per round_number:', allRounds);

const r3Matches = db.prepare('SELECT id, match_number, round_number, status, winner_id, user_id_1, user_id_2, user_id_3 FROM bracket_matches WHERE round_number = 3 ORDER BY match_number ASC').all();
console.log(`📋 Found ${r3Matches.length} matches in Round 3 (round_number = 3):`);
console.log(r3Matches);

const allMatchesSample = db.prepare('SELECT id, match_number, round_number, status FROM bracket_matches ORDER BY match_number ASC LIMIT 30').all();
console.log('📋 Sample of all match_numbers in bracket_matches (first 30):', allMatchesSample);

process.exit(0);
