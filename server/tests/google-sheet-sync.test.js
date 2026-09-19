import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_sheet_sync_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { createEvent, getActiveEventId } = await import('../services/eventService.js');
const {
  normalizeGoogleSheetUrl,
  syncParticipantsFromSheet,
  getSheetSyncConfig,
  DEFAULT_SHEET_URL
} = await import('../services/googleSheetService.js');

async function runTests() {
  console.log('🧪 RUNNING GOOGLE SHEET RACER SYNC TEST SUITE (PHASE 24)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const activeEventId = getActiveEventId();
    assert.ok(activeEventId, 'Active event must exist');

    // ----------------------------------------------------
    // Test 1: URL Normalization
    // ----------------------------------------------------
    console.log('--- Test 1: Google Sheet URL Normalization (SYNC-01) ---');
    const testBrowserUrl = 'https://docs.google.com/spreadsheets/d/1FZC65RxP3XMZM4FtsCTSt3C-EabqYbky/edit?gid=1028020136#gid=1028020136';
    const normalized = normalizeGoogleSheetUrl(testBrowserUrl);
    assert.strictEqual(
      normalized,
      'https://docs.google.com/spreadsheets/d/1FZC65RxP3XMZM4FtsCTSt3C-EabqYbky/export?format=csv&gid=1028020136',
      'Should extract ID and gid into clean CSV export format'
    );

    const defaultExport = normalizeGoogleSheetUrl(DEFAULT_SHEET_URL);
    assert.ok(defaultExport.includes('/export?format=csv&gid=1028020136'));

    // Test without gid -> should default to gid 0
    const noGidUrl = 'https://docs.google.com/spreadsheets/d/abcdef12345/edit';
    assert.strictEqual(
      normalizeGoogleSheetUrl(noGidUrl),
      'https://docs.google.com/spreadsheets/d/abcdef12345/export?format=csv&gid=0'
    );
    console.log('✓ URL Normalization passed\n');

    // ----------------------------------------------------
    // Test 2: Idempotent Sync with Mock CSV Data
    // ----------------------------------------------------
    console.log('--- Test 2: Idempotent Sync Logic & Scoped Allocation (SYNC-02, SYNC-03, SYNC-04) ---');
    const sampleCsv = `Kupon Sales STC Vol. 8 (2026),,,,,,
,,,,,,
No.,Nama Racer,Jumlah Kupon,Pembayaran,Status,Side Event (GTA),Best Race
Presale (40 Runs),,"Rp175,000",,,,
1,om sandi,1,"Rp175,000",Lunas,1,0
2,papamkz,1,"Rp175,000",Lunas,1,0
3,pengepul racer,1,"Rp175,000",Lunas,1,0
4,,,Rp0,Belum Lunas,0,0
5,Gilang,1,"Rp175,000",Lunas,0,0
Total Presale,,,"Rp700,000",,3,
OTS (40 Runs),,"Rp200,000",,,,
1,Superzen,1,"Rp200,000",Lunas,0,0
2,Belum Bayar,1,"Rp200,000",Belum Lunas,0,0
Total OTS,,,Rp200,000,,,
`;

    // First Sync: Should insert 5 racers (om sandi, papamkz, pengepul racer, Gilang, Superzen)
    const sync1 = await syncParticipantsFromSheet({
      csv_override: sampleCsv,
      event_id: activeEventId
    });

    assert.strictEqual(sync1.addedCount, 5, 'Should add 5 paid racers');
    assert.strictEqual(sync1.added[0].participant_number, 1, 'First racer should be #1');
    assert.strictEqual(sync1.added[0].name, 'om sandi');
    assert.strictEqual(sync1.added[4].participant_number, 5, 'Fifth racer should be #5');
    assert.strictEqual(sync1.added[4].name, 'Superzen');

    // Verify DB count
    const countRow1 = db.prepare('SELECT count(*) as cnt FROM users WHERE event_id = ? AND role = "participant"').get(activeEventId);
    assert.strictEqual(countRow1.cnt, 5);

    // Second Sync (IDEMPOTENCE): Same CSV should result in 0 added and all skipped
    const sync2 = await syncParticipantsFromSheet({
      csv_override: sampleCsv,
      event_id: activeEventId
    });

    assert.strictEqual(sync2.addedCount, 0, 'Second sync must add 0 duplicate racers');
    assert.strictEqual(sync2.skippedCount >= 5, true, 'Existing racers must be skipped');

    const countRow2 = db.prepare('SELECT count(*) as cnt FROM users WHERE event_id = ? AND role = "participant"').get(activeEventId);
    assert.strictEqual(countRow2.cnt, 5, 'Participant count in DB must remain unchanged');
    console.log('✓ Idempotence check passed\n');

    // ----------------------------------------------------
    // Test 3: Incremental Sync with New Racers
    // ----------------------------------------------------
    console.log('--- Test 3: Incremental Sync with Sequential Numbers (SYNC-04) ---');
    const expandedCsv = sampleCsv + `3,Racer Baru,1,"Rp200,000",Lunas,0,0\n`;
    const sync3 = await syncParticipantsFromSheet({
      csv_override: expandedCsv,
      event_id: activeEventId
    });

    assert.strictEqual(sync3.addedCount, 1, 'Should add exactly 1 newly appended racer');
    assert.strictEqual(sync3.added[0].name, 'Racer Baru');
    assert.strictEqual(sync3.added[0].participant_number, 6, 'Newly added racer must receive next number #6');

    const countRow3 = db.prepare('SELECT count(*) as cnt FROM users WHERE event_id = ? AND role = "participant"').get(activeEventId);
    assert.strictEqual(countRow3.cnt, 6);
    console.log('✓ Incremental sync passed\n');

    // ----------------------------------------------------
    // Test 3b: Auto-Update on Name Change in Google Sheet
    // ----------------------------------------------------
    console.log('--- Test 3b: Auto-Update on Name Change without Duplicate (BUGFIX) ---');
    const modifiedCsv = expandedCsv.replace('1,om sandi,1,', '1,om sandi MKZ,1,');
    const syncUpdate = await syncParticipantsFromSheet({
      csv_override: modifiedCsv,
      event_id: activeEventId
    });

    assert.strictEqual(syncUpdate.addedCount, 0, 'Should NOT add a new racer when existing racer name is edited');
    assert.strictEqual(syncUpdate.updatedCount, 1, 'Should update exactly 1 racer');
    assert.strictEqual(syncUpdate.updated[0].old_name, 'om sandi');
    assert.strictEqual(syncUpdate.updated[0].new_name, 'om sandi MKZ');
    assert.strictEqual(syncUpdate.updated[0].participant_number, 1, 'Participant number must remain unchanged (#1)');

    const countRowAfterUpdate = db.prepare('SELECT count(*) as cnt FROM users WHERE event_id = ? AND role = "participant"').get(activeEventId);
    assert.strictEqual(countRowAfterUpdate.cnt, 6, 'Total participant count must remain strictly 6');

    const updatedUserInDb = db.prepare('SELECT name, participant_number FROM users WHERE event_id = ? AND participant_number = 1').get(activeEventId);
    assert.strictEqual(updatedUserInDb.name, 'om sandi MKZ');
    console.log('✓ Auto-update on name change passed\n');

    // ----------------------------------------------------
    // Test 4: HTTP API Endpoints (SYNC-05, SYNC-06, SYNC-07)
    // ----------------------------------------------------
    console.log('--- Test 4: HTTP API /api/participants/sync-sheet & status ---');
    // GET Status
    const resStatus = await fetch(`${baseUrl}/api/participants/sync-sheet/status`);
    const statusData = await resStatus.json();
    assert.strictEqual(statusData.success, true);
    assert.ok(statusData.data.configuredUrl);
    assert.ok(statusData.data.activeEvent);

    // POST Sync with csv_override via HTTP
    const resPost = await fetch(`${baseUrl}/api/participants/sync-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_override: expandedCsv + `4,Pembalap Ketujuh,1,"Rp200,000",Lunas,0,0\n`
      })
    });
    const postData = await resPost.json();
    assert.strictEqual(postData.success, true);
    assert.strictEqual(postData.data.addedCount, 1);
    assert.strictEqual(postData.data.added[0].name, 'Pembalap Ketujuh');
    assert.strictEqual(postData.data.added[0].participant_number, 7);

    console.log('✓ HTTP API endpoints passed\n');

    console.log('🎉 ALL GOOGLE SHEET SYNC TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (server.listening) {
      server.close();
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
