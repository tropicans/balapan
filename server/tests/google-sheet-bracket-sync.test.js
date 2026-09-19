import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_bracket_sync_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { createEvent, getActiveEventId } = await import('../services/eventService.js');
const {
  parseBracketCsv,
  resolveParticipantForBracket,
  syncParticipantsFromSheet,
  syncBracketFromSheet,
  syncAllFromGoogleSheets,
  getBracketSyncConfig,
  DEFAULT_BRACKET_SHEET_URL
} = await import('../services/googleSheetService.js');
const {
  getSchedulerStatus,
  updateSchedulerConfig,
  runSyncJob
} = await import('../services/sheetSyncScheduler.js');

async function runTests() {
  console.log('🧪 RUNNING GOOGLE SHEET BRACKET & CRON SYNC TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist');

    // Seed dummy participants to test name resolution
    const sampleParticipantsCsv = [
      'nama,team',
      'om sandi,Team Sandi',
      'superzen,Zen Racing',
      'ict anya,ICT Team',
      'ict jos,ICT Team',
      'om daniel,Daniel Garage',
      'mochi,Mochi Works',
      'ict miniatur,Miniatur Club',
      'uncle warehouse,Uncle Speed',
      'no. 18,Eighteen Speed'
    ].join('\n');

    const pSync = await syncParticipantsFromSheet({
      event_id: activeEventId,
      csv_override: sampleParticipantsCsv
    });
    console.log('Added participants:', pSync.added.map(p => `${p.participant_number}: ${p.name}`));
    assert.ok(pSync.addedCount >= 9, 'Should add initial participants');

    // ----------------------------------------------------
    // Test 1: parseBracketCsv format parsing
    // ----------------------------------------------------
    console.log('--- Test 1: parseBracketCsv ---');
    const mockBracketCsv = [
      ',,,,',
      'Race,Lines,,,"Nama Finisher"',
      ',A,B,C,',
      'BABAK 1,,,,',
      '1,om sandi,superzen,ict anya,',
      '2,ict jos,om daniel,mochi,',
      '3,miniatur,uncle,no. 18,superzen',
      'BABAK 2,,,,',
      '1,superzen,,,',
      'BABAK 5 (FINAL),,,,',
      '1,superzen,om sandi,ict anya,superzen'
    ].join('\n');

    const parsedHeats = parseBracketCsv(mockBracketCsv);
    assert.strictEqual(parsedHeats.length, 5, 'Should parse 5 heats across rounds');
    
    // Babak 1 -> round_number 2
    assert.strictEqual(parsedHeats[0].round_number, 2);
    assert.strictEqual(parsedHeats[0].match_number, 1);
    assert.strictEqual(parsedHeats[0].lane_a, 'om sandi');
    assert.strictEqual(parsedHeats[0].lane_b, 'superzen');
    assert.strictEqual(parsedHeats[0].lane_c, 'ict anya');
    assert.strictEqual(parsedHeats[0].finisher, '');
    assert.strictEqual(parsedHeats[0].is_final, 0);

    // Heat 3 has finisher
    assert.strictEqual(parsedHeats[2].match_number, 3);
    assert.strictEqual(parsedHeats[2].finisher, 'superzen');

    // Babak 5 (FINAL) -> round_number 6, is_final = 1
    assert.strictEqual(parsedHeats[4].round_number, 6);
    assert.strictEqual(parsedHeats[4].is_final, 1);
    console.log('✓ parseBracketCsv parsed multiple rounds and headers correctly');

    // ----------------------------------------------------
    // Test 2: resolveParticipantForBracket fuzzy matching
    // ----------------------------------------------------
    console.log('\n--- Test 2: resolveParticipantForBracket ---');
    const roster = db.prepare('SELECT id, name, participant_number, source_key FROM users WHERE event_id = ?').all(activeEventId);
    
    // Exact
    const resExact = resolveParticipantForBracket('om sandi', roster);
    assert.strictEqual(resExact.name, 'om sandi');

    // Substring / Word containment ('miniatur' -> 'ict miniatur')
    const resContains = resolveParticipantForBracket('miniatur', roster);
    assert.strictEqual(resContains.name, 'ict miniatur');

    // Word containment ('uncle' -> 'uncle warehouse')
    const resUncle = resolveParticipantForBracket('uncle', roster);
    assert.strictEqual(resUncle.name, 'uncle warehouse');

    // Participant number reference or exact match ('no. 18' -> 'no. 18')
    const res18 = resolveParticipantForBracket('no. 18', roster);
    assert.strictEqual(res18.name, 'no. 18');
    console.log('✓ resolveParticipantForBracket resolved exact, substring, and token matches correctly');

    // ----------------------------------------------------
    // Test 3: syncBracketFromSheet idempotent insertion & winner detection
    // ----------------------------------------------------
    console.log('\n--- Test 3: syncBracketFromSheet ---');
    const bracketSync1 = await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: mockBracketCsv
    });

    assert.strictEqual(bracketSync1.addedCount, 5, 'Should insert 5 new matches');
    assert.strictEqual(bracketSync1.updatedCount, 0);

    // Check DB state
    const matchesInDb = db.prepare('SELECT * FROM bracket_matches WHERE event_id = ? ORDER BY round_number ASC, match_number ASC').all(activeEventId);
    assert.strictEqual(matchesInDb.length, 5);

    // Verify heat 1: user_id_1 = om sandi, user_id_2 = superzen, user_id_3 = ict anya, winner_id = null
    const m1 = matchesInDb.find(m => m.round_number === 2 && m.match_number === 1);
    assert.strictEqual(m1.status, 'pending');
    assert.strictEqual(m1.winner_id, null);

    // Verify heat 3: winner_id = superzen, status = 'completed'
    const m3 = matchesInDb.find(m => m.round_number === 2 && m.match_number === 3);
    assert.strictEqual(m3.status, 'completed');
    const superzenUser = roster.find(p => p.name === 'superzen');
    assert.strictEqual(m3.winner_id, superzenUser.id);

    // Re-sync with exact same CSV -> 0 changes, 5 skipped
    const bracketSync2 = await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: mockBracketCsv
    });
    assert.strictEqual(bracketSync2.addedCount, 0);
    assert.strictEqual(bracketSync2.updatedCount, 0);
    assert.strictEqual(bracketSync2.skippedCount, 5);
    console.log('✓ syncBracketFromSheet idempotency and winner tracking verified');

    // ----------------------------------------------------
    // Test 4: Dynamic update when finisher is entered in sheet
    // ----------------------------------------------------
    console.log('\n--- Test 4: Update when finisher is added ---');
    const mockBracketCsvUpdated = mockBracketCsv.replace(
      '1,om sandi,superzen,ict anya,',
      '1,om sandi,superzen,ict anya,om sandi'
    );

    const bracketSync3 = await syncBracketFromSheet({
      event_id: activeEventId,
      csv_override: mockBracketCsvUpdated
    });

    assert.strictEqual(bracketSync3.updatedCount, 1);
    const m1Updated = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(m1.id);
    assert.strictEqual(m1Updated.status, 'completed');
    const omSandiUser = roster.find(p => p.name === 'om sandi');
    assert.strictEqual(m1Updated.winner_id, omSandiUser.id);
    console.log('✓ Heat winner updated dynamically when finisher is added in sheet');

    // ----------------------------------------------------
    // Test 5: HTTP Endpoints for bracket sync & scheduler
    // ----------------------------------------------------
    console.log('\n--- Test 5: HTTP Endpoints ---');
    
    // Status endpoint
    const statusRes = await fetch(`${baseUrl}/api/participants/sync-sheet/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.ok(statusBody.success);
    assert.ok(statusBody.data.bracketConfig);
    assert.ok(statusBody.data.scheduler);

    // Update config endpoint
    const configRes = await fetch(`${baseUrl}/api/participants/sync-sheet/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        intervalSeconds: 30
      })
    });
    assert.strictEqual(configRes.status, 200);
    const configBody = await configRes.json();
    assert.strictEqual(configBody.data.intervalSeconds, 30);
    assert.strictEqual(configBody.data.enabled, true);

    // Bracket sync endpoint
    const syncBracketRes = await fetch(`${baseUrl}/api/participants/sync-bracket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_override: mockBracketCsvUpdated
      })
    });
    assert.strictEqual(syncBracketRes.status, 200);
    const syncBracketBody = await syncBracketRes.json();
    assert.ok(syncBracketBody.success);
    assert.strictEqual(syncBracketBody.data.totalFound, 5);

    // Reset config back to 60s
    updateSchedulerConfig({ enabled: true, intervalSeconds: 60 });

    console.log('✓ HTTP Endpoints /api/participants/sync-sheet/status, /config, and /sync-bracket passed');

    console.log('\n🎉 ALL GOOGLE SHEET BRACKET & CRON SYNC TESTS PASSED SUCCESSFULLY!');
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
