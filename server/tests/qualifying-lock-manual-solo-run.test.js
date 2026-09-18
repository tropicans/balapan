import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_manual_solo_run_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0';

const { initDatabase, default: db } = await import('../db.js');
const { getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant } = await import('../services/participantService.js');
const { registerWinner } = await import('../services/winnerService.js');
const { TicketEngine } = await import('../ticketEngine.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING QUALIFYING LOCK MANUAL SOLO RUN (OPSI A) REPRODUCTION TEST...\n');

  try {
    await initDatabase();
    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist in initialized DB');

    // Register 4 test participants
    const p1 = registerParticipant({ name: 'Om Sandi', team_name: 'Team Speed' });
    const p2 = registerParticipant({ name: 'Papa MKZ', team_name: 'Team MKZ' });
    const p3 = registerParticipant({ name: 'Pengepul Racer', team_name: 'Team Racer' });
    const p4 = registerParticipant({ name: 'Xcool', team_name: 'Team Cool' });

    // Register 4 winners into Round 2
    // p1, p2, p3 will fill Heat 1 (Lanes A, B, C)
    registerWinner({ participant_number: p1.participant_number, round: 2 });
    registerWinner({ participant_number: p2.participant_number, round: 2 });
    registerWinner({ participant_number: p3.participant_number, round: 2 });

    // p4 will create Heat 2 with only 1 racer (Lane A)
    registerWinner({ participant_number: p4.participant_number, round: 2 });

    const heat1Before = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 AND match_number = 1').get();
    const heat2Before = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 AND match_number = 2').get();

    assert.strictEqual(heat1Before.status, 'pending', 'Heat 1 must initially be pending');
    assert.strictEqual(heat2Before.status, 'pending', 'Heat 2 must initially be pending');
    assert.strictEqual(heat2Before.user_id_1, p4.id, 'Heat 2 Lane A must have p4');
    assert.strictEqual(heat2Before.user_id_2, null, 'Heat 2 Lane B must be empty');
    assert.strictEqual(heat2Before.user_id_3, null, 'Heat 2 Lane C must be empty');
    assert.strictEqual(heat2Before.winner_id, null, 'Heat 2 must have no winner before lock');

    console.log('Test 1: Locking qualifying stage and asserting Heat 2 remains pending (Manual Solo Run)...');
    // Lock Qualifying Stage
    TicketEngine.lockQualifyingStage();

    const heat2AfterLock = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 2 AND match_number = 2').get();

    // Under Opsi A (Manual Solo Run):
    // Heat 2 with 1 racer MUST NOT auto-win upon locking qualifying.
    // It must remain status = 'pending' and winner_id = null so Race Director can click MENANG manually.
    assert.strictEqual(
      heat2AfterLock.status,
      'pending',
      'BUG REPRODUCED: Heat 2 with 1 racer must REMAIN pending when qualifying is locked, not auto-completed!'
    );
    assert.strictEqual(
      heat2AfterLock.winner_id,
      null,
      'BUG REPRODUCED: Heat 2 with 1 racer must NOT have winner_id set automatically!'
    );

    console.log('✅ Test 1 Passed: Heat with 1 racer remains pending and has null winner_id after qualifying lock.\n');

    console.log('Test 2: Race Director manually clicks MENANG on Heat 2 (Solo Run)...');
    RaceManager.advanceBracketWinner(heat2AfterLock.id, p4.id, { autoAdvance: false });

    const heat2AfterManualAdvance = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(heat2AfterLock.id);
    assert.strictEqual(heat2AfterManualAdvance.status, 'completed', 'Heat 2 should now be completed');
    assert.strictEqual(heat2AfterManualAdvance.winner_id, p4.id, 'Heat 2 winner should be p4');

    console.log('✅ Test 2 Passed: Manual advance by Race Director succeeds for solo run heat.\n');

    console.log('🎉 ALL QUALIFYING LOCK MANUAL SOLO RUN TESTS PASSED!');
  } finally {
    if (fs.existsSync(uniqueTestDb)) {
      try { fs.unlinkSync(uniqueTestDb); } catch (_) {}
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
