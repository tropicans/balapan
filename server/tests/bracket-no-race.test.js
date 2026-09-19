import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_bracket_no_race_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';
process.env.JWT_SECRET = 'test_secret_key_no_race_123';

const { initDatabase, default: db } = await import('../db.js');
const { app, server, io } = await import('../index.js');
const { getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { registerWinner } = await import('../services/winnerService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING BRACKET NO RACE (ALL CO/DNF) TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist in initialized DB');

    // Register 6 participants to fill 2 heats in Round 2
    const p1 = registerParticipant({ name: 'Om Sandi', team_name: 'Team Speed' });
    const p2 = registerParticipant({ name: 'Pengepul Racer', team_name: 'Team Racer' });
    const p3 = registerParticipant({ name: 'Ajib', team_name: 'Team Ajib' });
    const p4 = registerParticipant({ name: 'Budi', team_name: 'Team Budi' });
    const p5 = registerParticipant({ name: 'Candra', team_name: 'Team Candra' });
    const p6 = registerParticipant({ name: 'Dedi', team_name: 'Team Dedi' });

    // Fill Heat 1 & Heat 2
    registerWinner({ participant_number: p1.participant_number, round: 2 });
    registerWinner({ participant_number: p2.participant_number, round: 2 });
    registerWinner({ participant_number: p3.participant_number, round: 2 });
    registerWinner({ participant_number: p4.participant_number, round: 2 });
    registerWinner({ participant_number: p5.participant_number, round: 2 });
    registerWinner({ participant_number: p6.participant_number, round: 2 });

    const heat1 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 AND match_number = 1').get();
    const heat2 = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 AND match_number = 2').get();
    assert.strictEqual(heat1.status, 'pending');
    assert.strictEqual(heat2.status, 'pending');

    // Test 1: RaceManager.declareBracketNoRace directly
    console.log('Test 1: Declaring No Race for Heat 1 via RaceManager...');
    assert.strictEqual(typeof RaceManager.declareBracketNoRace, 'function', 'RaceManager.declareBracketNoRace must exist');
    const noRaceRes1 = RaceManager.declareBracketNoRace(heat1.id);
    assert.strictEqual(noRaceRes1.success, true);
    assert.strictEqual(noRaceRes1.status, 'completed');
    assert.strictEqual(noRaceRes1.winnerId, null);

    const heat1After = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(heat1After.status, 'completed', 'Heat 1 status must be completed');
    assert.strictEqual(heat1After.winner_id, null, 'Heat 1 winner_id must be null for No Race');
    assert.strictEqual(heat1After.user_id_1, p1.id, 'Lane A contestant preserved');
    assert.strictEqual(heat1After.user_id_2, p2.id, 'Lane B contestant preserved');
    assert.strictEqual(heat1After.user_id_3, p3.id, 'Lane C contestant preserved');
    console.log('✅ Test 1 Passed: Heat 1 marked as completed with null winner.\n');

    // Test 2: HTTP POST /api/marshal/record-bracket-no-race for Heat 2
    console.log('Test 2: Declaring No Race via Marshal API POST /api/marshal/record-bracket-no-race...');
    const marshalRes = await fetch(`${baseUrl}/api/marshal/record-bracket-no-race`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: heat2.id })
    });
    assert.strictEqual(marshalRes.status, 200, 'Marshal endpoint should return 200');
    const marshalData = await marshalRes.json();
    assert.strictEqual(marshalData.success, true);

    const heat2After = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat2.id);
    assert.strictEqual(heat2After.status, 'completed');
    assert.strictEqual(heat2After.winner_id, null);
    console.log('✅ Test 2 Passed: Marshal No Race endpoint succeeded.\n');

    // Test 3: Verify Round Progress counts No-Race heats as completed
    console.log('Test 3: Checking Round Progress with No Race heats...');
    const progress = RaceManager.getRoundProgress(2);
    assert.strictEqual(progress.completed_heats >= 2, true, 'Completed heats must count No Race heats');
    console.log(`✅ Test 3 Passed: Round progress completed_heats = ${progress.completed_heats}.\n`);

    // Test 4: Resetting a No-Race heat allows re-race
    console.log('Test 4: Resetting No Race heat back to pending via RaceManager.resetBracketMatch...');
    const resetRes = RaceManager.resetBracketMatch(heat1.id);
    assert.strictEqual(resetRes.success, true);
    assert.strictEqual(resetRes.status, 'pending');

    const heat1Reset = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(heat1Reset.status, 'pending');
    assert.strictEqual(heat1Reset.winner_id, null);
    assert.strictEqual(heat1Reset.user_id_1, p1.id);
    console.log('✅ Test 4 Passed: No Race heat can be reset back to pending.\n');

    // Test 5: HTTP POST /api/bracket/no-race with Role Authentication
    console.log('Test 5: Testing RD endpoint POST /api/bracket/no-race with JWT auth...');
    const rdRes = await fetch(`${baseUrl}/api/bracket/no-race`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token:race_director:approved:rd@test.local'
      },
      body: JSON.stringify({ matchId: heat1.id })
    });
    assert.strictEqual(rdRes.status, 200, 'RD endpoint should return 200 with valid token');
    const rdData = await rdRes.json();
    assert.strictEqual(rdData.success, true);

    const heat1Final = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat1.id);
    assert.strictEqual(heat1Final.status, 'completed');
    assert.strictEqual(heat1Final.winner_id, null);
    console.log('✅ Test 5 Passed: RD endpoint successfully declared No Race.\n');

    // Test 6: Round lock protection
    console.log('Test 6: Verifying locked round protection...');
    RaceManager.lockRound(2);
    assert.throws(() => {
      RaceManager.declareBracketNoRace(heat1.id);
    }, /dikunci/i, 'Declaring No Race on locked round must throw');
    console.log('✅ Test 6 Passed: Locked round blocks declareBracketNoRace.\n');

    RaceManager.unlockRound(2);

    console.log('🎉 ALL BRACKET NO RACE TESTS PASSED SUCCESSFULLY!');
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
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
