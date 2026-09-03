import { initDatabase } from '../db.js';
import db from '../db.js';
import { RaceManager } from '../raceManager.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_bracket_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;

async function runBracketTests() {
  console.log('🧪 RUNNING 3-LANE ELIMINATION BRACKET TEST SUITE...\n');

  // 1. Initialize Database
  await initDatabase();
  console.log('✓ [1/6] Database initialized and seeded with 3-lane bracket schema');

  // Verify initial seed: 3 heats in Round 2 (Match 1, 2, 3) and 1 Grand Final in Round 3 (Match 4)
  const initialMatches = db.prepare('SELECT * FROM bracket_matches ORDER BY match_number ASC').all();
  assert.strictEqual(initialMatches.length, 4, 'Initial bracket should have exactly 4 matches (3 heats in Round 2, 1 in Round 3)');
  
  const round2Initial = initialMatches.filter(m => m.round_number === 2);
  const round3Initial = initialMatches.filter(m => m.round_number === 3);
  assert.strictEqual(round2Initial.length, 3, 'Should have 3 Round 2 heats');
  assert.strictEqual(round3Initial.length, 1, 'Should have 1 Round 3 match (Grand Final)');
  assert.strictEqual(round3Initial[0].match_number, 4, 'Round 3 match should be Match #4');
  console.log('✓ [2/6] Initial 3-lane bracket structure verified (3 heats R2 -> 1 Grand Final R3)');

  // 2. Test ELIM-01: Seeding 3 racers into Heat 1 (Jalur A, B, C)
  // Create 3 dummy test users
  const userA = { id: uuidv4(), name: 'Pembalap Pink (Line A)', email: 'pink@test.local' };
  const userB = { id: uuidv4(), name: 'Pembalap Cyan (Line B)', email: 'cyan@test.local' };
  const userC = { id: uuidv4(), name: 'Pembalap Green (Line C)', email: 'green@test.local' };

  for (const u of [userA, userB, userC]) {
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(u.id, u.name, u.email, 'participant');
  }

  RaceManager.seedIntoBracket(userA.id);
  let heat1 = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 1').get();
  assert.strictEqual(heat1.user_id_1, userA.id, 'User A should occupy Jalur A (user_id_1)');
  assert.strictEqual(heat1.user_id_2, null);
  assert.strictEqual(heat1.user_id_3, null);

  RaceManager.seedIntoBracket(userB.id);
  heat1 = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 1').get();
  assert.strictEqual(heat1.user_id_1, userA.id);
  assert.strictEqual(heat1.user_id_2, userB.id, 'User B should occupy Jalur B (user_id_2)');
  assert.strictEqual(heat1.user_id_3, null);

  RaceManager.seedIntoBracket(userC.id);
  heat1 = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 1').get();
  assert.strictEqual(heat1.user_id_1, userA.id);
  assert.strictEqual(heat1.user_id_2, userB.id);
  assert.strictEqual(heat1.user_id_3, userC.id, 'User C should occupy Jalur C (user_id_3)');
  console.log('✓ [3/6] ELIM-01: 3 contestants correctly seeded into Heat 1 (Jalur A -> B -> C)');

  // Test duplicate prevention: attempting to re-seed userA must be a no-op
  RaceManager.seedIntoBracket(userA.id);
  const heat2 = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 2').get();
  assert.strictEqual(heat2.user_id_1, null, 'User A duplicate seeding should be prevented');
  console.log('✓ Duplicate seeding prevention verified: User A not re-inserted into Heat 2');

  // 3. Test ELIM-02: Scalable Dynamic Heat Allocation (30 racers = 10 heats, up to 300 racers = 100 heats)
  console.log('  Testing dynamic heat generation for 30 racers...');
  // Heat 1 has 3 racers already. We need 27 more racers to fill 10 heats (30 racers total)
  const bulkRacers = [];
  for (let i = 4; i <= 30; i++) {
    const u = { id: uuidv4(), name: `Racer ${i}`, email: `racer${i}@test.local` };
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(u.id, u.name, u.email, 'participant');
    bulkRacers.push(u);
    RaceManager.seedIntoBracket(u.id);
  }

  const round2MatchesAfter30 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 ORDER BY match_number ASC').all();
  assert.strictEqual(round2MatchesAfter30.length, 10, 'Round 2 should have exactly 10 heats for 30 racers');
  for (const m of round2MatchesAfter30) {
    assert.ok(m.user_id_1 && m.user_id_2 && m.user_id_3, `Heat ${m.match_number} must have all 3 slots filled`);
  }
  console.log('✓ Scalability check 1: 30 racers correctly allocated across 10 heats');

  console.log('  Testing massive scale: seeding up to 300 racers (100 heats total in Round 2)...');
  for (let i = 31; i <= 300; i++) {
    const u = { id: uuidv4(), name: `Racer ${i}`, email: `racer${i}@test.local` };
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(u.id, u.name, u.email, 'participant');
    RaceManager.seedIntoBracket(u.id);
  }

  const round2MatchesAfter300 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 ORDER BY match_number ASC').all();
  assert.strictEqual(round2MatchesAfter300.length, 100, 'Round 2 should scale dynamically to 100 heats for 300 racers');
  for (let i = 0; i < 100; i++) {
    const m = round2MatchesAfter300[i];
    assert.ok(m.user_id_1 && m.user_id_2 && m.user_id_3, `Heat #${m.match_number} must have all 3 racers`);
  }
  console.log('✓ [4/6] ELIM-02: Scalability verified up to 300 contestants (100 full heats in Round 2)');

  // 4. Test ELIM-03: 3:1 Auto-Advance Tree Reduction to Next Round
  // Heat 1: userA vs userB vs userC -> userA wins
  const adv1 = RaceManager.advanceBracketWinner(heat1.id, userA.id);
  assert.strictEqual(adv1.success, true);
  
  // Heat 2 winner: pick user_id_1 of heat 2
  const heat2R2 = round2MatchesAfter300[1];
  const winnerH2 = heat2R2.user_id_1;
  const adv2 = RaceManager.advanceBracketWinner(heat2R2.id, winnerH2);
  assert.strictEqual(adv2.success, true);

  // Heat 3 winner: pick user_id_2 of heat 3
  const heat3R2 = round2MatchesAfter300[2];
  const winnerH3 = heat3R2.user_id_2;
  const adv3 = RaceManager.advanceBracketWinner(heat3R2.id, winnerH3);
  assert.strictEqual(adv3.success, true);

  // Check Round 3 Match #4 (Grand Final or R3 heat):
  // Should have userA in user_id_1, winnerH2 in user_id_2, winnerH3 in user_id_3!
  const r3Match4 = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 4').get();
  assert.strictEqual(r3Match4.user_id_1, userA.id, 'Winner of Heat 1 should advance to Round 3 slot A');
  assert.strictEqual(r3Match4.user_id_2, winnerH2, 'Winner of Heat 2 should advance to Round 3 slot B');
  assert.strictEqual(r3Match4.user_id_3, winnerH3, 'Winner of Heat 3 should advance to Round 3 slot C');
  console.log('✓ [5/6] ELIM-03: 3:1 Auto-advance verified (Winners of Heat 1, 2, 3 fill Round 3 Jalur A, B, C)');

  // 5. Test Grand Final Champion Crowning & Hierarchical Next-Round dynamic creation
  // When Match 4 (Round 3) concludes with userA as winner:
  const advFinal = RaceManager.advanceBracketWinner(r3Match4.id, userA.id, { isFinal: true });
  assert.strictEqual(advFinal.success, true);
  assert.strictEqual(advFinal.isFinal, true);

  const finalMatchCheck = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(r3Match4.id);
  assert.strictEqual(finalMatchCheck.winner_id, userA.id);
  assert.strictEqual(finalMatchCheck.status, 'completed');
  console.log('✓ [6/6] Grand Final completion verified: User A crowned tournament champion');

  // Test error conditions:
  // Advancing non-existent match
  assert.throws(() => {
    RaceManager.advanceBracketWinner('non-existent-id', userA.id);
  }, /Pertandingan bracket tidak ditemukan/);

  // Advancing with a winner who is not a contestant in that match
  assert.throws(() => {
    RaceManager.advanceBracketWinner(heat1.id, 'random-impostor-id');
  }, /Pemenang harus salah satu dari kontestan/);
  console.log('✓ Error handling verified: rejected invalid match ID and non-contestant winner');

  console.log('\n=============================================================');
  console.log('🏁 ALL 3-LANE BRACKET TESTS PASSED! ZERO ERRORS OR WARNINGS!');
  console.log('=============================================================\n');

  // Cleanup test DB
  if (fs.existsSync(uniqueTestDb)) {
    try { fs.unlinkSync(uniqueTestDb); } catch(e) {}
  }
}

runBracketTests().catch(err => {
  console.error('❌ Bracket test failed:', err);
  if (fs.existsSync(uniqueTestDb)) {
    try { fs.unlinkSync(uniqueTestDb); } catch(e) {}
  }
  process.exit(1);
});
