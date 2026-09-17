import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_state_contract_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { getFullState } = await import('../services/stateService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING STATE CONTRACT SWITCH & BACKEND DECOUPLING TEST SUITE (PHASE 15)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist in initialized DB');

    // Register a participant
    const p1 = registerParticipant({ name: 'State Tester 1', team_name: 'DecoupleTeam' });
    assert.strictEqual(p1.participant_number, 1, 'Participant 1 must have number 1');

    // 1. stateService.getFullState() contract check
    console.log('Test 1: Verifying stateService.getFullState() canonical contract...');
    const canonicalState = getFullState();
    assert.ok(canonicalState.activeEvent, 'State must contain activeEvent');
    assert.strictEqual(canonicalState.activeEvent.id, activeEventId);
    assert.ok(Array.isArray(canonicalState.participants), 'State must contain participants array');
    assert.strictEqual(canonicalState.participants.length, 1);
    assert.strictEqual(canonicalState.participants[0].participant_number, 1);
    assert.ok(Array.isArray(canonicalState.bracketMatches), 'State must contain bracketMatches array');
    assert.ok(Array.isArray(canonicalState.btoLeaderboard), 'State must contain btoLeaderboard array');
    assert.ok(canonicalState.settings !== undefined, 'State must contain settings');
    assert.ok(canonicalState.serverTime, 'State must contain serverTime');
    console.log('✅ Test 1 Passed: Canonical state matches specification.\n');

    // 2. RaceManager.getFullState() contract check
    console.log('Test 2: Verifying RaceManager.getFullState() backwards-compatible payload...');
    const rmState = RaceManager.getFullState();
    assert.ok(rmState.activeEvent, 'RaceManager state must include activeEvent');
    assert.ok(Array.isArray(rmState.participants), 'RaceManager state must include participants');
    assert.strictEqual(rmState.participants.length, 1);
    assert.ok(Array.isArray(rmState.bracketMatches), 'RaceManager state must include bracketMatches');
    assert.ok(Array.isArray(rmState.btoLeaderboard), 'RaceManager state must include btoLeaderboard');
    assert.ok(rmState.settings !== undefined, 'RaceManager state must include settings');
    console.log('✅ Test 2 Passed: RaceManager includes canonical v3 fields.\n');

    // 3. GET /api/state HTTP endpoint
    console.log('Test 3: Checking GET /api/state response...');
    const stateRes = await fetch(`${baseUrl}/api/state`);
    const stateJson = await stateRes.json();
    assert.strictEqual(stateRes.status, 200);
    assert.strictEqual(stateJson.success, true);
    assert.ok(stateJson.data.activeEvent, '/api/state data must contain activeEvent');
    assert.ok(Array.isArray(stateJson.data.participants), '/api/state data must contain participants');
    assert.strictEqual(stateJson.data.participants[0].name, 'State Tester 1');
    console.log('✅ Test 3 Passed: GET /api/state endpoint operates properly.\n');

    // 4. GET /api/users decoupled from coupons
    console.log('Test 4: Checking GET /api/users decoupling...');
    const usersRes = await fetch(`${baseUrl}/api/users`);
    const usersJson = await usersRes.json();
    assert.strictEqual(usersRes.status, 200);
    assert.strictEqual(usersJson.success, true);
    assert.ok(Array.isArray(usersJson.data));
    const found = usersJson.data.find(u => u.name === 'State Tester 1');
    assert.ok(found, 'User should be found in /api/users');
    assert.strictEqual(found.coupon_balance, 0, 'coupon_balance must default to 0 without error');
    console.log('✅ Test 4 Passed: GET /api/users returns users list without coupons dependency.\n');

    console.log('🎉 ALL PHASE 15 TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
    if (db && db.close) {
      db.close();
    }
    if (fs.existsSync(uniqueTestDb)) {
      try { fs.unlinkSync(uniqueTestDb); } catch (_) {}
    }
    const walFile = `${uniqueTestDb}-wal`;
    const shmFile = `${uniqueTestDb}-shm`;
    if (fs.existsSync(walFile)) try { fs.unlinkSync(walFile); } catch (_) {}
    if (fs.existsSync(shmFile)) try { fs.unlinkSync(shmFile); } catch (_) {}
  }
}

runTests().catch(err => {
  console.error('❌ PHASE 15 TEST FAILED:', err);
  process.exit(1);
});
