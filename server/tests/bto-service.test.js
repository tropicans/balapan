import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_bto_service_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { createEvent, setActiveEvent, getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { recordBtoTime, getBtoLeaderboard, deleteBtoRecord, validateAndFormatTime } = await import('../services/btoService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING MANUAL BTO BACKEND & LEADERBOARD TEST SUITE (PHASE 13)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist');

    // Register 3 participants
    const p1 = registerParticipant({ name: 'Fast Racer 1', team_name: 'Team Speed' });
    const p2 = registerParticipant({ name: 'Fast Racer 2', team_name: 'Team Nitro' });
    const p3 = registerParticipant({ name: 'Fast Racer 3', team_name: 'Team Turbo' });
    assert.strictEqual(p1.participant_number, 1);
    assert.strictEqual(p2.participant_number, 2);
    assert.strictEqual(p3.participant_number, 3);

    // ----------------------------------------------------
    // Test 1: validateAndFormatTime utility
    // ----------------------------------------------------
    console.log('--- Test 1: validateAndFormatTime validation ---');
    assert.strictEqual(validateAndFormatTime('12.3456'), 12.346);
    assert.strictEqual(validateAndFormatTime(10.5), 10.5);
    assert.throws(() => validateAndFormatTime(0), /positif/);
    assert.throws(() => validateAndFormatTime(-5), /positif/);
    assert.throws(() => validateAndFormatTime(350), /299\.999/);
    assert.throws(() => validateAndFormatTime('invalid'), /angka/);
    console.log('✓ Test 1: validateAndFormatTime validated successfully');

    // ----------------------------------------------------
    // Test 2: BTO-01 & BTO-04 - Initial Record & Overall #1 detection
    // ----------------------------------------------------
    console.log('--- Test 2: BTO-01 & BTO-04 - Initial Record & Overall #1 ---');
    const rec1 = recordBtoTime({
      participant_number: 1,
      finish_time: '15.420'
    });
    assert.ok(rec1.updated);
    assert.ok(rec1.is_new_personal_best);
    assert.ok(rec1.is_new_overall_record, 'First record must be new overall record #1');
    assert.strictEqual(rec1.record.finish_time, 15.42);
    assert.strictEqual(rec1.record.participant_number, 1);
    console.log('✓ Test 2: Initial BTO record and #1 record detection passed');

    // ----------------------------------------------------
    // Test 3: BTO-02 - Personal Best Replacement Logic
    // ----------------------------------------------------
    console.log('--- Test 3: BTO-02 - Personal Best Replacement Logic ---');
    // Try recording a slower time for participant 1
    const rec1Slower = recordBtoTime({
      participant_number: 1,
      finish_time: '16.500'
    });
    assert.strictEqual(rec1Slower.updated, false, 'Slower time must not update database');
    assert.strictEqual(rec1Slower.is_new_personal_best, false);
    assert.strictEqual(rec1Slower.record.finish_time, 15.42, 'Existing time preserved');

    // Now record a faster time for participant 1
    const rec1Faster = recordBtoTime({
      participant_number: 1,
      finish_time: '14.100'
    });
    assert.strictEqual(rec1Faster.updated, true, 'Faster time must update database');
    assert.strictEqual(rec1Faster.is_new_personal_best, true);
    assert.strictEqual(rec1Faster.record.finish_time, 14.1);
    assert.strictEqual(rec1Faster.previous_best, 15.42);
    console.log('✓ Test 3: Personal-best replacement logic strictly verified');

    // ----------------------------------------------------
    // Test 4: BTO-03 & BTO-04 - Top-N Leaderboard & Overall Record Competition
    // ----------------------------------------------------
    console.log('--- Test 4: BTO-03 & BTO-04 - Leaderboard Ordering ---');
    // Participant 2: slower than p1
    const rec2 = recordBtoTime({
      participant_number: 2,
      finish_time: '14.800'
    });
    assert.strictEqual(rec2.is_new_overall_record, false, '14.800 is not faster than 14.100');

    // Participant 3: faster than p1 (new overall record)
    const rec3 = recordBtoTime({
      participant_number: 3,
      finish_time: '13.950'
    });
    assert.strictEqual(rec3.is_new_overall_record, true, '13.950 beats 14.100 for overall #1');

    const leaderboard = getBtoLeaderboard({ limit: 5 });
    assert.strictEqual(leaderboard.length, 3);
    assert.strictEqual(leaderboard[0].participant_number, 3, 'Rank #1 is Participant 3');
    assert.strictEqual(leaderboard[0].finish_time, 13.95);
    assert.strictEqual(leaderboard[1].participant_number, 1, 'Rank #2 is Participant 1');
    assert.strictEqual(leaderboard[1].finish_time, 14.1);
    assert.strictEqual(leaderboard[2].participant_number, 2, 'Rank #3 is Participant 2');
    assert.strictEqual(leaderboard[2].finish_time, 14.8);
    console.log('✓ Test 4: Leaderboard ordering and rank allocation verified');

    // ----------------------------------------------------
    // Test 5: Full State Integration (RaceManager.getFullState)
    // ----------------------------------------------------
    console.log('--- Test 5: Full State Integration ---');
    const fullState = RaceManager.getFullState();
    assert.ok(Array.isArray(fullState.btoLeaderboard));
    assert.strictEqual(fullState.btoLeaderboard.length, 3);
    assert.strictEqual(fullState.btoLeaderboard[0].finish_time, 13.95);
    console.log('✓ Test 5: RaceManager.getFullState() returns canonical BTO leaderboard');

    // ----------------------------------------------------
    // Test 6: HTTP REST Endpoints (/api/bto, /api/bto/leaderboard, /api/bto/:id)
    // ----------------------------------------------------
    console.log('--- Test 6: HTTP REST Endpoints ---');
    const httpGetRes = await fetch(`${baseUrl}/api/bto/leaderboard?limit=2`);
    assert.strictEqual(httpGetRes.status, 200);
    const getJson = await httpGetRes.json();
    assert.ok(getJson.success);
    assert.strictEqual(getJson.data.length, 2);

    const httpPostRes = await fetch(`${baseUrl}/api/bto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_number: 2,
        finish_time: '13.500' // Beat p3 (13.950)
      })
    });
    assert.strictEqual(httpPostRes.status, 201);
    const postJson = await httpPostRes.json();
    assert.ok(postJson.success);
    assert.strictEqual(postJson.data.is_new_overall_record, true);
    assert.strictEqual(postJson.data.record.finish_time, 13.5);

    // Delete record test
    const deleteId = postJson.data.record.id;
    const httpDelRes = await fetch(`${baseUrl}/api/bto/${deleteId}`, { method: 'DELETE' });
    assert.strictEqual(httpDelRes.status, 200);
    const delJson = await httpDelRes.json();
    assert.ok(delJson.success);

    const afterDelLeaderboard = getBtoLeaderboard();
    assert.strictEqual(afterDelLeaderboard.length, 2, 'Leaderboard must now have 2 records');
    console.log('✓ Test 6: HTTP REST endpoints verified');

    // ----------------------------------------------------
    // Test 7: EVNT-04 - Event Isolation
    // ----------------------------------------------------
    console.log('--- Test 7: EVNT-04 - Event Isolation ---');
    const newEvent = createEvent({ nama: 'Event BTO Testing' });
    setActiveEvent(newEvent.id);
    assert.strictEqual(getActiveEventId(), newEvent.id);

    const isolatedLeaderboard = getBtoLeaderboard();
    assert.strictEqual(isolatedLeaderboard.length, 0, 'New event must start with empty BTO leaderboard');

    // Switch back to original event
    setActiveEvent(activeEventId);
    const restoredLeaderboard = getBtoLeaderboard();
    assert.strictEqual(restoredLeaderboard.length, 2, 'Restored event retains its BTO records');
    console.log('✓ Test 7: Event isolation for BTO records verified');

    console.log('\n🎉 ALL 7 MANUAL BTO BACKEND & LEADERBOARD TESTS PASSED (100% GREEN)!\n');
    server.close();
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
