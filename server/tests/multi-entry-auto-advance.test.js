import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../db.js';
import { RaceManager } from '../raceManager.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uniqueTestDb = path.join(__dirname, `../../data/test_multi_entry_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;

console.log('🧪 RUNNING MULTI-ENTRY AUTO-ADVANCE (21 HEATS) TEST SUITE...\n');

await initDatabase();

try {

// Setup 3 users: A, B, C
const userA = { id: uuidv4(), name: 'King Northland', participant_number: 4 };
const userB = { id: uuidv4(), name: 'Om Daniel', participant_number: 36 };
const userC = { id: uuidv4(), name: 'Papamkz', participant_number: 2 };

for (const u of [userA, userB, userC]) {
  db.prepare('INSERT OR REPLACE INTO users (id, name, participant_number, role) VALUES (?, ?, ?, ?)').run(u.id, u.name, u.participant_number, 'participant');
}

// Create 10 heats in Round 2
const r2Matches = [];
for (let i = 1; i <= 10; i++) {
  const mId = uuidv4();
  db.prepare(`
    INSERT INTO bracket_matches (id, match_number, round_number, user_id_1, user_id_2, user_id_3, status)
    VALUES (?, ?, 2, ?, ?, ?, 'pending')
  `).run(mId, 900 + i, userA.id, userB.id, userC.id);
  r2Matches.push(mId);
}

// Create 5 heats in Round 3 (Heat 1..5)
for (let i = 1; i <= 5; i++) {
  db.prepare(`
    INSERT INTO bracket_matches (id, match_number, round_number, status)
    VALUES (?, ?, 3, 'pending')
  `).run(uuidv4(), 200 + i);
}

console.log('--- Step 1: User A wins Heat 1, User B wins Heat 2, User C wins Heat 3 ---');
RaceManager.advanceBracketWinner(r2Matches[0], userA.id);
RaceManager.advanceBracketWinner(r2Matches[1], userB.id);
RaceManager.advanceBracketWinner(r2Matches[2], userC.id);

const r3Heat1 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 3 AND match_number = 201').get();
assert.strictEqual(r3Heat1.user_id_1, userA.id, 'User A should be in R3 Heat 1 Slot A');
assert.strictEqual(r3Heat1.user_id_2, userB.id, 'User B should be in R3 Heat 1 Slot B');
assert.strictEqual(r3Heat1.user_id_3, userC.id, 'User C should be in R3 Heat 1 Slot C');
console.log('✅ Step 1 Passed: R3 Heat 1 is full with A, B, C');

console.log('\n--- Step 2: User A wins Heat 4 (Second win for User A) ---');
// User A wins heat 4 in Round 2.
// With the old bug, User A was blocked because alreadyInNext was true!
// With multi-entry support, User A MUST advance into R3 Heat 2 Slot A!
const adv4 = RaceManager.advanceBracketWinner(r2Matches[3], userA.id);
assert.strictEqual(adv4.alreadyAdvanced, undefined, 'User A second win should NOT be blocked by alreadyInNext');

const r3Heat2 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 3 AND match_number = 202').get();
assert.strictEqual(r3Heat2.user_id_1, userA.id, 'User A second win must occupy R3 Heat 2 Slot A');
console.log('✅ Step 2 Passed: User A second win successfully entered R3 Heat 2 Slot A');

console.log('\n--- Step 3: Duplicate click on Heat 4 must be ignored ---');
const adv4Dup = RaceManager.advanceBracketWinner(r2Matches[3], userA.id);
assert.strictEqual(adv4Dup.alreadyAdvanced, true, 'Re-clicking Heat 4 must be recognized as already advanced');
const r3Heat2AfterDup = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 3 AND match_number = 202').get();
assert.strictEqual(r3Heat2AfterDup.user_id_2, null, 'Slot B should remain empty on duplicate advance');
console.log('✅ Step 3 Passed: Duplicate click prevention on same heat verified');

console.log('\n--- Step 4: User B wins Heat 5, User C wins Heat 6 ---');
RaceManager.advanceBracketWinner(r2Matches[4], userB.id);
RaceManager.advanceBracketWinner(r2Matches[5], userC.id);

const r3Heat2Full = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 3 AND match_number = 202').get();
assert.strictEqual(r3Heat2Full.user_id_1, userA.id);
assert.strictEqual(r3Heat2Full.user_id_2, userB.id);
assert.strictEqual(r3Heat2Full.user_id_3, userC.id);
console.log('✅ Step 4 Passed: R3 Heat 2 is full with second entries of A, B, C');

console.log('\n--- Step 5: Test reconcileRoundAdvances backfill ---');
// Simulate Heat 7, 8, 9 won by A, B, C in DB but not advanced yet
db.prepare("UPDATE bracket_matches SET status = 'completed', winner_id = ? WHERE id = ?").run(userA.id, r2Matches[6]);
db.prepare("UPDATE bracket_matches SET status = 'completed', winner_id = ? WHERE id = ?").run(userB.id, r2Matches[7]);
db.prepare("UPDATE bracket_matches SET status = 'completed', winner_id = ? WHERE id = ?").run(userC.id, r2Matches[8]);

const recRes = RaceManager.reconcileRoundAdvances(2);
assert.strictEqual(recRes.advancedCount, 3, 'Should backfill 3 winners into Round 3');

const r3Heat3 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 3 AND match_number = 203').get();
assert.strictEqual(r3Heat3.user_id_1, userA.id, 'User A third win must occupy R3 Heat 3 Slot A');
assert.strictEqual(r3Heat3.user_id_2, userB.id, 'User B third win must occupy R3 Heat 3 Slot B');
assert.strictEqual(r3Heat3.user_id_3, userC.id, 'User C third win must occupy R3 Heat 3 Slot C');
console.log('✅ Step 5 Passed: reconcileRoundAdvances successfully backfilled 3 un-advanced wins into R3 Heat 3');

console.log('\n🎉 ALL MULTI-ENTRY AUTO-ADVANCE TESTS PASSED (100% GREEN)!\n');

} finally {
  if (fs.existsSync(uniqueTestDb)) {
    try { fs.unlinkSync(uniqueTestDb); } catch (_) {}
  }
}
