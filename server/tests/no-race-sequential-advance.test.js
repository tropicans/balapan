import { test } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../db.js';
import { RaceManager } from '../raceManager.js';

test('Sequential advance into empty slot (such as Lane C) after a No Race heat', async (t) => {
  console.log('🧪 RUNNING NO RACE SEQUENTIAL ADVANCE (SLOT C RE-PACKING) TEST SUITE...\n');

  await initDatabase();

  // 1. Setup clean active event
  const testEventId = uuidv4();
  db.prepare(`
    INSERT OR REPLACE INTO events (id, nama, tanggal, status)
    VALUES (?, 'Test No Race Sequential Championship', '2026-09-19', 'active')
  `).run(testEventId);

  // 2. Setup 12 participants (4 heats in Round 2)
  const participants = [];
  for (let i = 1; i <= 12; i++) {
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, name, participant_number, team_name, role)
      VALUES (?, ?, ?, 'Team Turbo', 'racer')
    `).run(userId, `Racer #${i}`, i);
    participants.push({ id: userId, participant_number: i, name: `Racer #${i}` });
  }

  // Clear existing matches for this test event
  db.prepare('DELETE FROM bracket_matches WHERE event_id = ?').run(testEventId);

  // 3. Create 4 heats in Round 2
  // Heat 1 (R2): p1, p2, p3
  // Heat 2 (R2): p4, p5, p6
  // Heat 3 (R2): p7, p8, p9
  // Heat 4 (R2): p10, p11, p12
  const heat1Id = uuidv4();
  const heat2Id = uuidv4();
  const heat3Id = uuidv4();
  const heat4Id = uuidv4();

  // Create an initial match in Round 3 (Heat 1 Round 3)
  const round3MatchId = uuidv4();
  db.prepare(`
    INSERT INTO bracket_matches (id, event_id, match_number, round_number, is_final, status)
    VALUES (?, ?, 10, 3, 0, 'pending')
  `).run(round3MatchId, testEventId);

  // Insert Round 2 heats
  db.prepare(`
    INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, user_id_3, parent_match_id, status)
    VALUES (?, ?, 1, 2, ?, ?, ?, ?, 'pending')
  `).run(heat1Id, testEventId, participants[0].id, participants[1].id, participants[2].id, round3MatchId);

  db.prepare(`
    INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, user_id_3, parent_match_id, status)
    VALUES (?, ?, 2, 2, ?, ?, ?, ?, 'pending')
  `).run(heat2Id, testEventId, participants[3].id, participants[4].id, participants[5].id, round3MatchId);

  db.prepare(`
    INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, user_id_3, parent_match_id, status)
    VALUES (?, ?, 3, 2, ?, ?, ?, ?, 'pending')
  `).run(heat3Id, testEventId, participants[6].id, participants[7].id, participants[8].id, round3MatchId);

  db.prepare(`
    INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, user_id_3, status)
    VALUES (?, ?, 4, 2, ?, ?, ?, 'pending')
  `).run(heat4Id, testEventId, participants[9].id, participants[10].id, participants[11].id);

  // -------------------------------------------------------------------------
  // STEP 1: Heat 1 Babak 2 selesai -> p1 menang
  // -------------------------------------------------------------------------
  console.log('--- Step 1: Heat 1 Round 2 won by Racer #1 ---');
  const adv1 = RaceManager.advanceBracketWinner(heat1Id, participants[0].id, { autoAdvance: true });
  assert.strictEqual(adv1.slot, 'user_id_1', 'Racer #1 must occupy Lane A in Round 3');
  assert.strictEqual(adv1.targetMatchId, round3MatchId);

  let r3Match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(round3MatchId);
  assert.strictEqual(r3Match.user_id_1, participants[0].id, 'Lane A in Round 3 must be Racer #1');
  assert.strictEqual(r3Match.user_id_2, null, 'Lane B must still be empty');
  assert.strictEqual(r3Match.user_id_3, null, 'Lane C must still be empty');
  console.log('✅ Step 1 Passed: Racer #1 placed in Round 3 Lane A');

  // -------------------------------------------------------------------------
  // STEP 2: Heat 2 Babak 2 selesai -> p4 menang
  // -------------------------------------------------------------------------
  console.log('--- Step 2: Heat 2 Round 2 won by Racer #4 ---');
  const adv2 = RaceManager.advanceBracketWinner(heat2Id, participants[3].id, { autoAdvance: true });
  assert.strictEqual(adv2.slot, 'user_id_2', 'Racer #4 must occupy Lane B in Round 3');
  assert.strictEqual(adv2.targetMatchId, round3MatchId);

  r3Match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(round3MatchId);
  assert.strictEqual(r3Match.user_id_1, participants[0].id, 'Lane A in Round 3 is Racer #1');
  assert.strictEqual(r3Match.user_id_2, participants[3].id, 'Lane B in Round 3 is Racer #4');
  assert.strictEqual(r3Match.user_id_3, null, 'Lane C must still be empty');
  console.log('✅ Step 2 Passed: Racer #4 placed in Round 3 Lane B');

  // -------------------------------------------------------------------------
  // STEP 3: Heat 3 Babak 2 dinyatakan NO RACE (Semua gugur / CO)
  // -------------------------------------------------------------------------
  console.log('--- Step 3: Heat 3 Round 2 declared NO RACE ---');
  const noRaceRes = RaceManager.declareBracketNoRace(heat3Id);
  assert.strictEqual(noRaceRes.success, true);
  assert.strictEqual(noRaceRes.winnerId, null);

  const heat3After = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat3Id);
  assert.strictEqual(heat3After.status, 'completed');
  assert.strictEqual(heat3After.winner_id, null);

  // Verifikasi Round 3 masih memiliki A dan B terisi, C kosong
  r3Match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(round3MatchId);
  assert.strictEqual(r3Match.user_id_1, participants[0].id);
  assert.strictEqual(r3Match.user_id_2, participants[3].id);
  assert.strictEqual(r3Match.user_id_3, null, 'Lane C must still be empty after No Race');
  console.log('✅ Step 3 Passed: Heat 3 declared No Race, Round 3 Lane C remains vacant');

  // -------------------------------------------------------------------------
  // STEP 4: Heat 4 Babak 2 (Race selanjutnya) -> Racer #10 MENANG!
  // Sesuai permintaan user: Racer #10 HARUS MENEMPATI C di Babak 3!
  // -------------------------------------------------------------------------
  console.log('--- Step 4: Heat 4 Round 2 won by Racer #10 -> must occupy vacant Lane C in Round 3 ---');
  const adv4 = RaceManager.advanceBracketWinner(heat4Id, participants[9].id, { autoAdvance: true });
  
  assert.strictEqual(adv4.targetMatchId, round3MatchId, 'Must target the existing Round 3 match with vacant Lane C');
  assert.strictEqual(adv4.slot, 'user_id_3', 'Winner of subsequent race MUST occupy slot C (user_id_3)!');

  r3Match = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(round3MatchId);
  assert.strictEqual(r3Match.user_id_1, participants[0].id, 'Lane A is Racer #1');
  assert.strictEqual(r3Match.user_id_2, participants[3].id, 'Lane B is Racer #4');
  assert.strictEqual(r3Match.user_id_3, participants[9].id, 'Lane C is Racer #10');

  console.log('✅ Step 4 Passed: Racer #10 successfully placed in Lane C of Round 3!');
  console.log('🎉 ALL NO RACE SEQUENTIAL ADVANCE TESTS PASSED (100% GREEN)!');
});
