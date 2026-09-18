import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_winner_reg_${Date.now()}.sqlite`);
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
  console.log('🧪 RUNNING WINNER REGISTRATION & BRACKET EXECUTION TEST SUITE (PHASE 14)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist');

    // Register 5 participants (#1, #2, #3, #4, #5)
    const p1 = registerParticipant({ name: 'Bambang Stinger', team_name: 'SpeedZone' });
    const p2 = registerParticipant({ name: 'Citra Sonic', team_name: 'Nitro' });
    const p3 = registerParticipant({ name: 'Deni Magnum', team_name: 'Turbo' });
    const p4 = registerParticipant({ name: 'Eka Saber', team_name: 'Cyclone' });
    const p5 = registerParticipant({ name: 'Fajar Tridagger', team_name: 'Viper' });

    // ----------------------------------------------------
    // Test 1: Reject invalid / unknown participant number (WREG-03)
    // ----------------------------------------------------
    console.log('--- Test 1: WREG-03 - Reject Unknown Number ---');
    assert.throws(() => registerWinner({ participant_number: 999 }), /tidak ditemukan/);
    assert.throws(() => registerWinner({ participant_number: 'abc' }), /tidak valid/);
    console.log('✓ Test 1: Unknown and invalid participant numbers rejected');

    // ----------------------------------------------------
    // Test 2: Auto-placement into Round 2 slots A -> B -> C (WREG-01, WREG-02, WREG-06)
    // ----------------------------------------------------
    console.log('--- Test 2: WREG-06 - Auto Placement A -> B -> C ---');
    const w1 = registerWinner({ participant_number: 1 });
    assert.ok(w1.success);
    assert.strictEqual(w1.participant.id, p1.id);
    assert.strictEqual(w1.slot, 'user_id_1', 'Slot 1 must be Jalur A');
    assert.strictEqual(w1.lane, 'A');
    const match1Id = w1.match.id;

    const w2 = registerWinner({ participant_number: 2 });
    assert.ok(w2.success);
    assert.strictEqual(w2.match.id, match1Id, 'Must fill same match');
    assert.strictEqual(w2.slot, 'user_id_2', 'Slot 2 must be Jalur B');
    assert.strictEqual(w2.lane, 'B');

    const w3 = registerWinner({ participant_number: 3 });
    assert.ok(w3.success);
    assert.strictEqual(w3.match.id, match1Id);
    assert.strictEqual(w3.slot, 'user_id_3', 'Slot 3 must be Jalur C');
    assert.strictEqual(w3.lane, 'C');

    // Slot 4 should create a new heat in Round 2
    const w4 = registerWinner({ participant_number: 4 });
    assert.ok(w4.success);
    assert.notStrictEqual(w4.match.id, match1Id, 'Must create or pick Heat 2');
    assert.strictEqual(w4.slot, 'user_id_1', 'Heat 2 starts with Jalur A');
    console.log('✓ Test 2: Sequential slotting A -> B -> C and dynamic heat allocation verified');

    // ----------------------------------------------------
    // Test 3: Multi-slot / multi-ticket registration in Round 2 (WREG-04)
    // ----------------------------------------------------
    console.log('--- Test 3: WREG-04 - Multi-Slot Support (Separate Heats) ---');
    const w1Second = registerWinner({ participant_number: 1 });
    assert.ok(w1Second.success, 'Participant 1 must be able to register multiple tickets into Round 2');
    assert.notStrictEqual(w1Second.match.id, match1Id, 'Participant 1 must be placed in a separate heat (Heat 2)');
    assert.strictEqual(w1Second.match.id, w4.match.id, 'Participant 1 should take an open slot in Heat 2');
    assert.strictEqual(w1Second.slot, 'user_id_2', 'Must take slot 2 (Jalur B) in Heat 2');
    assert.strictEqual(w1Second.lane, 'B');
    console.log('✓ Test 3: Participant 1 successfully registered into Heat 2 without clashing with themselves');

    // Clean up second registration so subsequent Test 4 (undo for p4) remains intact
    undoLastWinnerRegistration();

    // ----------------------------------------------------
    // Test 4: Undo last winner registration (WREG-05)
    // ----------------------------------------------------
    console.log('--- Test 4: WREG-05 - Undo Last Winner ---');
    const undoRes = undoLastWinnerRegistration();
    assert.ok(undoRes.success);
    assert.strictEqual(undoRes.undone_participant.participant_number, 4);

    // Verify match slot for p4 is now NULL
    const checkMatch2 = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(w4.match.id);
    assert.strictEqual(checkMatch2.user_id_1, null, 'Slot user_id_1 must be vacated');

    // After undo, p4 can be registered again
    const w4Re = registerWinner({ participant_number: 4 });
    assert.ok(w4Re.success);
    assert.strictEqual(w4Re.participant.participant_number, 4);
    console.log('✓ Test 4: Undo last winner registration verified');

    // ----------------------------------------------------
    // Test 5: Bracket execution without digital race lock (BRKT-01, BRKT-02)
    // ----------------------------------------------------
    console.log('--- Test 5: BRKT-01 & BRKT-02 - Manual Advance Bracket ---');
    // Heat 1 contestants: p1, p2, p3. Advance p1 as winner of Heat 1
    const advRes = RaceManager.advanceBracketWinner(match1Id, p1.id);
    assert.ok(advRes.success);
    assert.strictEqual(advRes.winnerId, p1.id);

    const updatedMatch1 = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(match1Id);
    assert.strictEqual(updatedMatch1.winner_id, p1.id);
    assert.strictEqual(updatedMatch1.status, 'completed');

    // Verify p1 was promoted to Round 3 (Grand Final)
    const r3Match = db.prepare(`
      SELECT * FROM bracket_matches 
      WHERE round_number = 3 AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)
    `).get(p1.id, p1.id, p1.id);
    assert.ok(r3Match, 'Winner p1 must be placed in Round 3 slot');
    console.log('✓ Test 5: Manual winner selection and auto-advance to next round verified');

    // ----------------------------------------------------
    // Test 6: HTTP REST Endpoints
    // ----------------------------------------------------
    console.log('--- Test 6: HTTP REST Endpoints ---');
    const httpWinnersList = await fetch(`${baseUrl}/api/winners`);
    assert.strictEqual(httpWinnersList.status, 200);
    const winJson = await httpWinnersList.json();
    assert.ok(winJson.success);
    assert.ok(Array.isArray(winJson.data));

    // Register p5 via HTTP
    const httpPostWin = await fetch(`${baseUrl}/api/winners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_number: 5 })
    });
    assert.strictEqual(httpPostWin.status, 201);
    const postWinJson = await httpPostWin.json();
    assert.ok(postWinJson.success);
    assert.strictEqual(postWinJson.participant.participant_number, 5);

    // Undo via HTTP
    const httpUndo = await fetch(`${baseUrl}/api/winners/undo`, { method: 'POST' });
    assert.strictEqual(httpUndo.status, 200);
    const undoJson = await httpUndo.json();
    assert.ok(undoJson.success);
    assert.strictEqual(undoJson.undone_participant.participant_number, 5);
    console.log('✓ Test 6: HTTP REST endpoints verified');

    console.log('\n🎉 ALL 6 WINNER REGISTRATION & BRACKET EXECUTION TESTS PASSED (100% GREEN)!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
