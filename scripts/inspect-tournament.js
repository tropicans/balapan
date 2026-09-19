import { initDatabase, default as db } from '../server/db.js';

await initDatabase();

const events = db.prepare("SELECT * FROM events").all();
console.log('All Events:', events.map(e => ({ id: e.id, name: e.nama, status: e.status })));

for (const ev of events) {
  console.log(`\n=== EVENT: ${ev.nama} (${ev.id}) ===`);
  const r2Matches = db.prepare("SELECT * FROM bracket_matches WHERE event_id = ? AND round_number = 2 ORDER BY match_number ASC").all(ev.id);
  const r3Matches = db.prepare("SELECT * FROM bracket_matches WHERE event_id = ? AND round_number = 3 ORDER BY match_number ASC").all(ev.id);
  console.log(`R2 Total: ${r2Matches.length}, Completed: ${r2Matches.filter(m => m.status === 'completed').length}`);
  console.log(`R3 Total: ${r3Matches.length}, Occupied: ${r3Matches.filter(m => m.user_id_1 || m.user_id_2 || m.user_id_3).length}`);
  const r3Occupied = r3Matches.filter(m => m.user_id_1 || m.user_id_2 || m.user_id_3);
  if (r3Occupied.length > 0) {
    console.log(`R3 Occupied match numbers:`, r3Occupied.map(m => m.match_number));
  }
}

// Matches with event_id IS NULL:
const nullMatches = db.prepare("SELECT round_number, count(*) as c FROM bracket_matches WHERE event_id IS NULL GROUP BY round_number").all();
console.log('\nMatches with NULL event_id:', nullMatches);

// Total matches per round:
const allRoundCounts = db.prepare("SELECT round_number, count(*) as c FROM bracket_matches GROUP BY round_number").all();
console.log('\nTotal per round across entire DB:', allRoundCounts);
