import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_bracket_reset_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';

const { initDatabase, default: db } = await import('../db.js');
const { app, server, io } = await import('../index.js');
const { getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { registerWinner } = await import('../services/winnerService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING BRACKET RESET / REOPEN HEAT TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist in initialized DB');

    // Register 3 participants
    const p1 = registerParticipant({ name: 'Om Sandi', team_name: 'Team Speed' });
    const p2 = registerParticipant({ name: 'Pengepul Racer', team_name: 'Team Racer' });
    const p3 = registerParticipant({ name: 'Ajib', team_name: 'Team Ajib' });

    // Register into Round 2 Heat 1
    registerWinner({ participant_number: p1.participant_number, round: 2 });
    registerWinner({ participant_number: p2.participant_number, round: 2 });
    registerWinner({ participant_number: p3.participant_number, round: 2 });

    const heat1 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 AND match_number = 1').get();
    assert.strictEqual(heat1.status, 'pending');

    // Test 1: Advance Heat 1 with winner p1
    console.log('Test 1: Advancing Heat 1...');
    RaceManager.advanceBracketWinner(heat1.id, p1.id, { autoAdvance: false });
    const completedHeat1 = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(completedHeat1.status, 'completed');
    assert.strictEqual(completedHeat1.winner_id, p1.id);
    console.log('✅ Test 1 Passed: Heat 1 completed with winner p1.\n');

    // Test 2: Call RaceManager.resetBracketMatch
    console.log('Test 2: Resetting / Reopening Heat 1 via RaceManager...');
    assert.strictEqual(typeof RaceManager.resetBracketMatch, 'function', 'RaceManager.resetBracketMatch must exist');
    const resetResult = RaceManager.resetBracketMatch(heat1.id);
    assert.strictEqual(resetResult.success, true);
    assert.strictEqual(resetResult.status, 'pending');

    const reopenedHeat1 = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(reopenedHeat1.status, 'pending', 'Heat 1 must be pending after reset');
    assert.strictEqual(reopenedHeat1.winner_id, null, 'Heat 1 winner_id must be null after reset');
    assert.strictEqual(reopenedHeat1.user_id_1, p1.id, 'Lane A must still be p1');
    assert.strictEqual(reopenedHeat1.user_id_2, p2.id, 'Lane B must still be p2');
    assert.strictEqual(reopenedHeat1.user_id_3, p3.id, 'Lane C must still be p3');
    console.log('✅ Test 2 Passed: Heat 1 cleanly reset back to pending with preserved contestants.\n');

    // Test 3: Re-advancing with a different winner (re-race scenario: p2 wins)
    console.log('Test 3: Re-advancing with new winner p2 (Re-Race)...');
    RaceManager.advanceBracketWinner(heat1.id, p2.id, { autoAdvance: false });
    const reAdvHeat1 = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(reAdvHeat1.status, 'completed');
    assert.strictEqual(reAdvHeat1.winner_id, p2.id);
    console.log('✅ Test 3 Passed: Re-race winner updated to p2.\n');

    // Test 4: Reset via HTTP REST endpoint POST /api/bracket/reset
    console.log('Test 4: Resetting via HTTP POST /api/bracket/reset...');
    const httpRes = await fetch(`${baseUrl}/api/bracket/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: heat1.id })
    });
    assert.strictEqual(httpRes.status, 200, 'HTTP reset endpoint should return 200');
    const httpData = await httpRes.json();
    assert.strictEqual(httpData.success, true);

    const httpReopened = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(httpReopened.status, 'pending');
    assert.strictEqual(httpReopened.winner_id, null);
    console.log('✅ Test 4 Passed: REST endpoint POST /api/bracket/reset succeeded.\n');

    // Test 5: Reopening is blocked if Round is locked
    console.log('Test 5: Mutation protection when Round 2 is locked...');
    RaceManager.advanceBracketWinner(heat1.id, p3.id, { autoAdvance: false });
    RaceManager.lockRound(2);

    assert.throws(() => {
      RaceManager.resetBracketMatch(heat1.id);
    }, /dikunci/i, 'Resetting match in locked round must throw an error');
    console.log('✅ Test 5 Passed: Locked round blocks reset.\n');

    RaceManager.unlockRound(2);

    console.log('🎉 ALL BRACKET RESET / REOPEN HEAT TESTS PASSED!');
  } finally {
    if (server && server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
    if (db && db.close) {
      try { db.close(); } catch (_) {}
    }
    if (fs.existsSync(uniqueTestDb)) {
      try { fs.unlinkSync(uniqueTestDb); } catch (_) {}
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
