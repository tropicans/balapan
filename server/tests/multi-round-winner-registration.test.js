import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_multi_round_win_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { getActiveEventId, createEvent, setActiveEvent } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { registerWinner, undoLastWinnerRegistration, getRegisteredWinners } = await import('../services/winnerService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING MULTI-ROUND WINNER REGISTRATION TEST SUITE (PHASE 20 / v3.2)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist');

    // Register 4 participants (#1, #2, #3, #4)
    const p1 = registerParticipant({ name: 'Aero Avante', team_name: 'Team Speed' });
    const p2 = registerParticipant({ name: 'Thunder Shot', team_name: 'Team Nitro' });
    const p3 = registerParticipant({ name: 'Dash Emperor', team_name: 'Team Turbo' });
    const p4 = registerParticipant({ name: 'Shooting Star', team_name: 'Team Cyclone' });

    // ----------------------------------------------------
    // Test 1: Register into Round 2 works normally
    // ----------------------------------------------------
    console.log('--- Test 1: Register into Round 2 ---');
    const w1 = registerWinner({ participant_number: 1, round: 2 });
    const w2 = registerWinner({ participant_number: 2, round: 2 });
    const w3 = registerWinner({ participant_number: 3, round: 2 });

    assert.ok(w1.success);
    assert.strictEqual(w1.match.round_number, 2);
    assert.strictEqual(w1.lane, 'A');
    assert.strictEqual(w2.lane, 'B');
    assert.strictEqual(w3.lane, 'C');
    const heat1Id = w1.match.id;
    console.log('✓ Test 1: Participants 1, 2, 3 registered into Round 2 Heat 1 (Lanes A, B, C)');

    // ----------------------------------------------------
    // Test 2: Attempt to register into Round 3 without winning in Round 2 is rejected
    // ----------------------------------------------------
    console.log('\n--- Test 2: Strict Validation (Option A) - Rejection on no Round 2 win ---');
    assert.throws(
      () => registerWinner({ participant_number: 1, round: 3 }),
      /belum tercatat menang di Babak 2/i,
      'Must reject Round 3 registration when participant has 0 wins in Round 2'
    );
    console.log('✓ Test 2: Participant 1 rejected from Round 3 before winning in Round 2');

    // ----------------------------------------------------
    // Test 3: Win Round 2 Heat via advanceBracketWinner (without auto-advance)
    // ----------------------------------------------------
    console.log('\n--- Test 3: Mark Winner in Round 2 without auto-advance ---');
    const advRes = RaceManager.advanceBracketWinner(heat1Id, p1.id, { autoAdvance: false });
    assert.ok(advRes.success);
    assert.strictEqual(advRes.winnerId, p1.id);

    // Verify Round 3 is NOT automatically populated
    const checkR3Empty = db.prepare('SELECT COUNT(*) as cnt FROM bracket_matches WHERE round_number = 3').get();
    assert.strictEqual(checkR3Empty.cnt, 0, 'Round 3 must NOT be auto-created or auto-populated');
    console.log('✓ Test 3: Heat 1 completed, p1 recorded as winner, Round 3 remains unpopulated');

    // ----------------------------------------------------
    // Test 4: Register p1 into Round 3 now succeeds after winning Round 2
    // ----------------------------------------------------
    console.log('\n--- Test 4: Register p1 into Round 3 after Scrutineering ---');
    const w1R3 = registerWinner({ participant_number: 1, round: 3 });
    assert.ok(w1R3.success);
    assert.strictEqual(w1R3.match.round_number, 3);
    assert.strictEqual(w1R3.slot, 'user_id_1');
    assert.strictEqual(w1R3.lane, 'A');
    console.log(`✓ Test 4: Participant 1 successfully registered into Round 3 (Heat #${w1R3.match.match_number} Lane A)`);

    // ----------------------------------------------------
    // Test 5: Attempt to register p1 a 2nd time into Round 3 is rejected (quota exhausted)
    // ----------------------------------------------------
    console.log('\n--- Test 5: Multi-Slot Ticket Guard (1 win = 1 slot) ---');
    assert.throws(
      () => registerWinner({ participant_number: 1, round: 3 }),
      /kuota tiket Babak 3.*sudah terdaftar/i,
      'Must reject when participant has already used all Round 2 win tickets'
    );
    console.log('✓ Test 5: Second registration for p1 in Round 3 rejected (only 1 win in Round 2)');

    // ----------------------------------------------------
    // Test 6: Multi-slot: If p1 has a 2nd ticket in Round 2 and wins Heat 2, can register 2nd time in Round 3
    // ----------------------------------------------------
    console.log('\n--- Test 6: Multi-slot win in Round 2 allows 2nd ticket in Round 3 ---');
    // Register p1 again in Round 2 (separate heat)
    const w1SecondR2 = registerWinner({ participant_number: 1, round: 2 });
    const w4R2 = registerWinner({ participant_number: 4, round: 2 });
    const heat2Id = w1SecondR2.match.id;
    assert.notStrictEqual(heat2Id, heat1Id, 'Must be in a separate heat in Round 2');

    // p1 wins Heat 2 as well
    RaceManager.advanceBracketWinner(heat2Id, p1.id, { autoAdvance: false });

    // Now p1 has 2 wins in Round 2, and 1 registration in Round 3. Second registration in Round 3 must succeed!
    const w1SecondR3 = registerWinner({ participant_number: 1, round: 3 });
    assert.ok(w1SecondR3.success);
    // Since Heat 1 in Round 3 already has p1 in Lane A, self-clash prevention must place p1 in Heat 2 in Round 3!
    assert.notStrictEqual(w1SecondR3.match.id, w1R3.match.id, 'Self-clash prevention must place p1 in a separate heat in Round 3');
    assert.strictEqual(w1SecondR3.match.round_number, 3);
    console.log('✓ Test 6: Multi-slot win verified: p1 placed in separate heat in Round 3 without clashing with themselves');

    // ----------------------------------------------------
    // Test 7: HTTP REST API with round parameter
    // ----------------------------------------------------
    console.log('\n--- Test 7: HTTP REST API with round parameter ---');
    // Register p4 win in heat 2? heat 2 was already won by p1. Let's create heat 3 in Round 2
    const w2Heat3 = registerWinner({ participant_number: 2, round: 2 });
    RaceManager.advanceBracketWinner(w2Heat3.match.id, p2.id, { autoAdvance: false });

    const httpRes = await fetch(`${baseUrl}/api/winners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_number: 2, round: 3 })
    });
    const httpData = await httpRes.json();
    assert.strictEqual(httpRes.status, 201);
    assert.ok(httpData.success);
    assert.strictEqual(httpData.match.round_number, 3);

    // GET /api/winners?round=3
    const getR3Res = await fetch(`${baseUrl}/api/winners?round=3`);
    const getR3Data = await getR3Res.json();
    assert.ok(getR3Data.success);
    assert.ok(getR3Data.data.length >= 2, 'Must return Round 3 winners');
    assert.ok(getR3Data.data.every(w => w.round_number === 3), 'All returned items must have round_number = 3');
    console.log('✓ Test 7: HTTP POST /api/winners/register and GET /api/winners?round=3 verified');

    // ----------------------------------------------------
    // Test 8: Undo Round 3 registration
    // ----------------------------------------------------
    console.log('\n--- Test 8: Undo Round 3 registration ---');
    const undoRes = await fetch(`${baseUrl}/api/winners/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: 3 })
    });
    const undoData = await undoRes.json();
    assert.ok(undoData.success);
    assert.strictEqual(undoData.undone_participant.participant_number, 2);
    console.log('✓ Test 8: Undo Round 3 winner registration verified');

    console.log('\n🎉 ALL MULTI-ROUND WINNER REGISTRATION TESTS PASSED (100% GREEN)!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (server.listening) server.close();
  }
}

runTests();
