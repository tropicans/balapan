import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../db.js';
import { RaceManager } from '../raceManager.js';
import { parseBracketCsv } from '../services/googleSheetService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uniqueTestDb = path.join(__dirname, `../../data/test_b3_cap_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;

console.log('🧪 RUNNING BABAK 3 (21 HEATS MAX) CAP TEST SUITE...\n');

await initDatabase();

try {
  // Test 1: parseBracketCsv caps Babak 3 at 21 heats
  console.log('--- Test 1: parseBracketCsv Babak 3 limit ---');
  let mockCsv = 'BABAK 2,,,,\n';
  for (let i = 1; i <= 50; i++) {
    mockCsv += `${i},,,,\n`;
  }
  const heats = parseBracketCsv(mockCsv);
  assert.strictEqual(heats.length, 21, 'Babak 3 CSV parsing must be strictly capped at 21 heats');
  assert.strictEqual(heats[0].match_number, 1);
  assert.strictEqual(heats[20].match_number, 21);
  console.log('✅ Test 1 Passed: parseBracketCsv imported exactly 21 heats (1..21), ignoring rows 22..50');

  // Test 2: Auto-advance strictly does not create Heat 22, 23, 24
  console.log('\n--- Test 2: Auto-advance capping at 21 heats ---');
  const user = { id: uuidv4(), name: 'Test Racer', participant_number: 10 };
  db.prepare('INSERT OR REPLACE INTO users (id, name, participant_number, role) VALUES (?, ?, ?, ?)').run(user.id, user.name, user.participant_number, 'participant');

  // Initialize all 21 heats in Round 3 (match_number 201..221) and fill all 63 slots
  for (let h = 1; h <= 21; h++) {
    db.prepare(`
      INSERT INTO bracket_matches (id, match_number, round_number, user_id_1, user_id_2, user_id_3, status)
      VALUES (?, ?, 3, ?, ?, ?, 'pending')
    `).run(uuidv4(), 200 + h, user.id, user.id, user.id);
  }

  const r3CountBefore = db.prepare('SELECT COUNT(*) as c FROM bracket_matches WHERE round_number = 3').get().c;
  assert.strictEqual(r3CountBefore, 21, 'Round 3 must have exactly 21 heats initially');

  // Create another user2 with 0 slots in Round 3
  const user2 = { id: uuidv4(), name: 'Unslotted Racer', participant_number: 11 };
  db.prepare('INSERT OR REPLACE INTO users (id, name, participant_number, role) VALUES (?, ?, ?, ?)').run(user2.id, user2.name, user2.participant_number, 'participant');

  // Create a match in Round 2 won by user2
  const r2MatchId = uuidv4();
  db.prepare(`
    INSERT INTO bracket_matches (id, match_number, round_number, user_id_1, winner_id, status)
    VALUES (?, 1, 2, ?, ?, 'completed')
  `).run(r2MatchId, user2.id, user2.id);

  // Advance winner user2 - since all 21 heats (63 slots) are occupied by other racers, it MUST NOT create Heat 22 or 24!
  const advResult = RaceManager.advanceBracketWinner(r2MatchId, user2.id);
  assert.strictEqual(advResult.capped, true, 'advanceBracketWinner should flag capped: true when 21 heats full');

  const r3CountAfter = db.prepare('SELECT COUNT(*) as c FROM bracket_matches WHERE round_number = 3').get().c;
  assert.strictEqual(r3CountAfter, 21, 'Round 3 heat count must stay exactly 21, never creating heat 22, 23, 24');
  console.log('✅ Test 2 Passed: advanceBracketWinner respected 21 heats maximum limit');

  // Test 3: reconcileRoundAdvances also respects 21 heats maximum limit
  console.log('\n--- Test 3: reconcileRoundAdvances capping at 21 heats ---');
  const recRes = RaceManager.reconcileRoundAdvances(2);
  const r3CountAfterRec = db.prepare('SELECT COUNT(*) as c FROM bracket_matches WHERE round_number = 3').get().c;
  assert.strictEqual(r3CountAfterRec, 21, 'reconcileRoundAdvances must never create heats past Heat 21');
  console.log('✅ Test 3 Passed: reconcileRoundAdvances respected 21 heats limit');

  console.log('\n🎉 ALL BABAK 3 (21 HEATS MAX) TESTS PASSED SUCCESSFULLY!');
} finally {
  try {
    if (fs.existsSync(uniqueTestDb)) fs.unlinkSync(uniqueTestDb);
  } catch (_) {}
}
