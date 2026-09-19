import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_in_app_protect_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { getActiveEventId } = await import('../services/eventService.js');
const {
  syncParticipantsFromSheet,
  syncBracketFromSheet
} = await import('../services/googleSheetService.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING IN-APP RESULTS PROTECTION TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist');

    // 1. Seed Participants
    const participantsCsv = [
      'nama,team',
      'Racer A,Team Red',
      'Racer B,Team Blue',
      'Racer C,Team Green',
      'Racer D,Team Yellow'
    ].join('\n');

    const pSync = await syncParticipantsFromSheet({
      event_id: activeEventId,
      csv_override: participantsCsv
    });
    assert.strictEqual(pSync.addedCount, 4);

    const roster = db.prepare('SELECT * FROM users WHERE event_id = ?').all(activeEventId);
    const racerA = roster.find(r => r.name === 'Racer A');
    const racerB = roster.find(r => r.name === 'Racer B');
    const racerC = roster.find(r => r.name === 'Racer C');
    const racerD = roster.find(r => r.name === 'Racer D');

    // 2. Initial Bracket from Sheet (Empty finisher in Round 2, empty lanes in Babak 2/Round 3)
    const initialSheetCsv = [
      'BABAK 1,,,,',
      '1,Racer A,Racer B,,',
      '2,Racer C,Racer D,,',
      'BABAK 2,,,,',
      '1,Juara Heat 1,-,,',
      '2,,,,'
    ].join('\n');

    const bSync1 = await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: initialSheetCsv
    });
    console.log(`Initial bracket sync: ${bSync1.addedCount} added`);

    // Verify Round 2 matches are pending
    const r2Matches = db.prepare('SELECT * FROM bracket_matches WHERE event_id = ? AND round_number = 2 ORDER BY match_number ASC').all(activeEventId);
    assert.strictEqual(r2Matches.length, 2);
    assert.strictEqual(r2Matches[0].status, 'pending');
    assert.strictEqual(r2Matches[1].status, 'pending');

    // ----------------------------------------------------
    // Test 1: In-App Result - Heat 1 Winner Recorded
    // ----------------------------------------------------
    console.log('\n--- Test 1: In-App Winner Protection ---');
    // Racer A wins Heat 1 directly in app
    db.prepare(`
      UPDATE bracket_matches 
      SET winner_id = ?, status = 'completed'
      WHERE id = ?
    `).run(racerA.id, r2Matches[0].id);

    // Reconcile advances: Racer A should auto-advance to Round 3 Heat 1
    RaceManager.reconcileRoundAdvances(2);

    const r3Heat1BeforeSync = db.prepare('SELECT * FROM bracket_matches WHERE event_id = ? AND round_number = 3 AND match_number = 201').get(activeEventId);
    assert.strictEqual(r3Heat1BeforeSync.user_id_1, racerA.id, 'Racer A should occupy Round 3 Heat 1 lane 1');

    // Google Sheet auto-sync runs with blank finishers
    const bSyncAfterWin = await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: initialSheetCsv
    });

    // Verify Heat 1 in Round 2 is STILL completed with Racer A as winner
    const r2Heat1AfterSync = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(r2Matches[0].id);
    assert.strictEqual(r2Heat1AfterSync.status, 'completed', 'Round 2 Heat 1 status must remain completed');
    assert.strictEqual(r2Heat1AfterSync.winner_id, racerA.id, 'Round 2 Heat 1 winner must remain Racer A');

    // Verify Round 3 Heat 1 did NOT lose Racer A (template in sheet had "Juara Heat 1" which shouldn\'t wipe Racer A)
    const r3Heat1AfterSync = db.prepare('SELECT * FROM bracket_matches WHERE event_id = ? AND round_number = 3 AND match_number = 201').get(activeEventId);
    assert.strictEqual(r3Heat1AfterSync.user_id_1, racerA.id, 'Round 3 Heat 1 must preserve Racer A in lane 1');
    console.log('✓ In-app winner and auto-advanced Round 3 slot preserved during sheet sync');

    // ----------------------------------------------------
    // Test 2: In-App NO RACE Protection
    // ----------------------------------------------------
    console.log('\n--- Test 2: In-App NO RACE Protection ---');
    // Heat 2 is marked as NO RACE in app (status = 'completed', winner_id = null)
    db.prepare(`
      UPDATE bracket_matches 
      SET winner_id = NULL, status = 'completed'
      WHERE id = ?
    `).run(r2Matches[1].id);

    const r2Heat2BeforeSync = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(r2Matches[1].id);
    assert.strictEqual(r2Heat2BeforeSync.status, 'completed');
    assert.strictEqual(r2Heat2BeforeSync.winner_id, null);

    // Google Sheet auto-sync runs with blank finishers
    await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: initialSheetCsv
    });

    const r2Heat2AfterSync = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(r2Matches[1].id);
    assert.strictEqual(r2Heat2AfterSync.status, 'completed', 'NO RACE heat status must NOT be reset to pending');
    assert.strictEqual(r2Heat2AfterSync.winner_id, null, 'NO RACE heat winner must remain null');
    console.log('✓ NO RACE completed status preserved without being reset to pending');

    // ----------------------------------------------------
    // Test 3: In-Progress Heat Protection
    // ----------------------------------------------------
    console.log('\n--- Test 3: In-Progress Heat Protection ---');
    // Suppose Round 3 Heat 1 is set to in_progress in app
    db.prepare(`UPDATE bracket_matches SET status = 'in_progress' WHERE id = ?`).run(r3Heat1AfterSync.id);

    await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: initialSheetCsv
    });

    const r3Heat1Prog = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(r3Heat1AfterSync.id);
    assert.strictEqual(r3Heat1Prog.status, 'in_progress', 'in_progress status must be preserved');
    console.log('✓ In-progress status preserved');

    console.log('\n🎉 ALL IN-APP RESULTS PROTECTION TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    try {
      if (fs.existsSync(uniqueTestDb)) fs.unlinkSync(uniqueTestDb);
    } catch (_) {}
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
