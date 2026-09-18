import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_round_lock_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';

const { initDatabase, default: db } = await import('../db.js');
const { app, server, io } = await import('../index.js');
const { getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { getFullState } = await import('../services/stateService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING ROUND 2 FINALIZATION & LOCK TEST SUITE (PHASE 18)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist in initialized DB');

    // Register test participants
    const p1 = registerParticipant({ name: 'Racer Alpha', team_name: 'Team Red' });
    const p2 = registerParticipant({ name: 'Racer Beta', team_name: 'Team Blue' });
    const p3 = registerParticipant({ name: 'Racer Gamma', team_name: 'Team Green' });
    const p4 = registerParticipant({ name: 'Racer Delta', team_name: 'Team Yellow' });

    // ----------------------------------------------------
    // Test 1: getRoundProgress on empty round reports total_heats: 0, can_finalize: false
    // ----------------------------------------------------
    console.log('Test 1: Verifying getRoundProgress on empty round...');
    const initProgress = RaceManager.getRoundProgress(2);
    assert.strictEqual(initProgress.round, 2, 'Round should be 2');
    assert.strictEqual(initProgress.total_heats, 0, 'Total heats should be 0');
    assert.strictEqual(initProgress.completed_heats, 0, 'Completed heats should be 0');
    assert.strictEqual(initProgress.pending_heats, 0, 'Pending heats should be 0');
    assert.strictEqual(initProgress.is_locked, false, 'is_locked should be false initially');
    assert.strictEqual(initProgress.can_finalize, false, 'can_finalize should be false when total_heats is 0');
    assert.strictEqual(RaceManager.getRoundStatus(2), 'open', 'Round 2 initial status must be open');
    console.log('✅ Test 1 Passed: Initial empty round progress reported correctly.\n');

    // ----------------------------------------------------
    // Test 2: Incomplete heats in Round 2 cause lockRound(2) to fail with pending count
    // ----------------------------------------------------
    console.log('Test 2: Verifying lockRound failure when incomplete heats exist...');
    const match1Id = uuidv4();
    const match2Id = uuidv4();
    const gfId = uuidv4();

    // Insert 2 pending heats in Round 2 and 1 Grand Final in Round 3
    db.prepare(`
      INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, parent_match_id, status)
      VALUES (?, ?, 1, 2, ?, ?, ?, 'pending')
    `).run(match1Id, activeEventId, p1.id, p2.id, gfId);

    db.prepare(`
      INSERT INTO bracket_matches (id, event_id, match_number, round_number, user_id_1, user_id_2, parent_match_id, status)
      VALUES (?, ?, 2, 2, ?, ?, ?, 'pending')
    `).run(match2Id, activeEventId, p3.id, p4.id, gfId);

    db.prepare(`
      INSERT INTO bracket_matches (id, event_id, match_number, round_number, is_final, status)
      VALUES (?, ?, 3, 3, 1, 'pending')
    `).run(gfId, activeEventId);

    const pendingProgress = RaceManager.getRoundProgress(2);
    assert.strictEqual(pendingProgress.total_heats, 2, 'Should have 2 heats');
    assert.strictEqual(pendingProgress.completed_heats, 0, 'Completed heats should be 0');
    assert.strictEqual(pendingProgress.pending_heats, 2, 'Pending heats should be 2');
    assert.strictEqual(pendingProgress.can_finalize, false, 'can_finalize must be false when heats are pending');

    assert.throws(
      () => RaceManager.lockRound(2),
      /Masih ada 2 heat Babak 2 yang belum selesai/,
      'lockRound must throw when heats are incomplete'
    );

    // Test locking round with 0 heats throws descriptive error
    assert.throws(
      () => RaceManager.lockRound(4),
      /Tidak ada heat di Babak 4 untuk dikunci/,
      'lockRound must throw when total_heats is 0'
    );
    console.log('✅ Test 2 Passed: Incomplete heats and empty rounds rejected with descriptive errors.\n');

    // ----------------------------------------------------
    // Test 3: Once all heats are completed, lockRound(2) succeeds
    // ----------------------------------------------------
    console.log('Test 3: Completing heats and verifying lockRound(2)...');
    db.prepare("UPDATE bracket_matches SET winner_id = ?, status = 'completed' WHERE id = ?").run(p1.id, match1Id);
    db.prepare("UPDATE bracket_matches SET winner_id = ?, status = 'completed' WHERE id = ?").run(p3.id, match2Id);

    const readyProgress = RaceManager.getRoundProgress(2);
    assert.strictEqual(readyProgress.total_heats, 2);
    assert.strictEqual(readyProgress.completed_heats, 2);
    assert.strictEqual(readyProgress.pending_heats, 0);
    assert.strictEqual(readyProgress.can_finalize, true, 'can_finalize must be true when all heats completed');

    const lockResult = RaceManager.lockRound(2);
    assert.strictEqual(lockResult.is_locked, true, 'lockRound result must indicate is_locked: true');
    assert.strictEqual(lockResult.can_finalize, false, 'can_finalize must be false once locked');
    assert.strictEqual(RaceManager.getRoundStatus(2), 'locked', 'getRoundStatus must return locked');
    console.log('✅ Test 3 Passed: Round 2 successfully locked when all heats completed.\n');

    // ----------------------------------------------------
    // Test 4: advanceBracketWinner on locked Round 2 match is rejected
    // ----------------------------------------------------
    console.log('Test 4: Verifying advanceBracketWinner mutation protection on locked round...');
    assert.throws(
      () => RaceManager.advanceBracketWinner(match1Id, p2.id),
      /Babak 2 telah difinalisasi dan dikunci\. Buka kunci Babak 2 terlebih dahulu jika ingin merevisi hasil\./,
      'advanceBracketWinner must reject modifications on locked round'
    );
    // Confirm match1 winner remains unchanged
    const unchangedMatch = db.prepare('SELECT winner_id FROM bracket_matches WHERE id = ?').get(match1Id);
    assert.strictEqual(unchangedMatch.winner_id, p1.id, 'Winner must remain unmutated');
    console.log('✅ Test 4 Passed: Mutation protection blocked modifications while round is locked.\n');

    // ----------------------------------------------------
    // Test 5: unlockRound(2) opens status and allows advanceBracketWinner
    // ----------------------------------------------------
    console.log('Test 5: Verifying unlockRound(2) and revision capability...');
    const unlockResult = RaceManager.unlockRound(2);
    assert.strictEqual(unlockResult.is_locked, false, 'is_locked must be false after unlock');
    assert.strictEqual(unlockResult.can_finalize, true, 'can_finalize must be true after unlock');
    assert.strictEqual(RaceManager.getRoundStatus(2), 'open', 'getRoundStatus must return open');

    // Now revision should succeed
    const reviseResult = RaceManager.advanceBracketWinner(match1Id, p2.id);
    assert.strictEqual(reviseResult.success, true);
    const revisedMatch = db.prepare('SELECT winner_id FROM bracket_matches WHERE id = ?').get(match1Id);
    assert.strictEqual(revisedMatch.winner_id, p2.id, 'Winner should be revised to Racer Beta');
    console.log('✅ Test 5 Passed: Round unlocked and revision successfully applied.\n');

    // ----------------------------------------------------
    // Test 6: getFullState() payload includes round2_status and round2_progress
    // ----------------------------------------------------
    console.log('Test 6: Verifying canonical getFullState() and RaceManager.getFullState() contracts...');
    // Re-lock for state check
    RaceManager.lockRound(2);

    const canonicalState = getFullState();
    assert.strictEqual(canonicalState.round2_status, 'locked', 'canonicalState must contain round2_status');
    assert.ok(canonicalState.round2_progress, 'canonicalState must contain round2_progress');
    assert.strictEqual(canonicalState.round2_progress.round, 2);
    assert.strictEqual(canonicalState.round2_progress.is_locked, true);
    assert.strictEqual(canonicalState.round2_progress.total_heats, 2);
    assert.strictEqual(canonicalState.round2_progress.completed_heats, 2);

    const rmState = RaceManager.getFullState();
    assert.strictEqual(rmState.round2_status, 'locked', 'RaceManager state must contain round2_status');
    assert.ok(rmState.round2_progress, 'RaceManager state must contain round2_progress');
    assert.strictEqual(rmState.round2_progress.is_locked, true);
    console.log('✅ Test 6 Passed: State contracts include round2_status and round2_progress.\n');

    // ----------------------------------------------------
    // Test 7: HTTP REST API Endpoints (/api/bracket/lock-round, /unlock-round, /progress)
    // ----------------------------------------------------
    console.log('Test 7: Verifying HTTP REST API endpoints...');

    // 7a. GET /api/bracket/progress
    const progRes = await fetch(`${baseUrl}/api/bracket/progress?round=2`);
    const progJson = await progRes.json();
    assert.strictEqual(progRes.status, 200);
    assert.strictEqual(progJson.success, true);
    assert.strictEqual(progJson.data.round, 2);
    assert.strictEqual(progJson.data.is_locked, true);

    // 7b. POST /api/bracket/advance while locked via HTTP returns 400
    const advRes = await fetch(`${baseUrl}/api/bracket/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match1Id, winnerId: p1.id })
    });
    const advJson = await advRes.json();
    assert.strictEqual(advRes.status, 400);
    assert.strictEqual(advJson.success, false);
    assert.match(advJson.error, /Babak 2 telah difinalisasi dan dikunci/);

    // 7c. POST /api/bracket/unlock-round
    const unlockRes = await fetch(`${baseUrl}/api/bracket/unlock-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: 2 })
    });
    const unlockJson = await unlockRes.json();
    assert.strictEqual(unlockRes.status, 200);
    assert.strictEqual(unlockJson.success, true);
    assert.strictEqual(unlockJson.data.is_locked, false);
    assert.match(unlockJson.message, /Kunci Babak 2 berhasil dibuka/);

    // 7d. POST /api/bracket/lock-round
    const lockResHttp = await fetch(`${baseUrl}/api/bracket/lock-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: 2 })
    });
    const lockJson = await lockResHttp.json();
    assert.strictEqual(lockResHttp.status, 200);
    assert.strictEqual(lockJson.success, true);
    assert.strictEqual(lockJson.data.is_locked, true);
    assert.match(lockJson.message, /Babak 2 berhasil difinalisasi dan dikunci/);

    // 7e. Error case: POST /api/bracket/lock-round on empty round 99 returns 400
    const errRes = await fetch(`${baseUrl}/api/bracket/lock-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: 99 })
    });
    const errJson = await errRes.json();
    assert.strictEqual(errRes.status, 400);
    assert.strictEqual(errJson.success, false);
    assert.match(errJson.error, /Tidak ada heat di Babak 99 untuk dikunci/);

    console.log('✅ Test 7 Passed: REST endpoints behave correctly with proper status codes and messages.\n');

    console.log('🎉 ALL PHASE 18 ROUND-LOCK TESTS PASSED SUCCESSFULLY!');
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
  console.error('❌ PHASE 18 TEST FAILED:', err);
  process.exit(1);
});
