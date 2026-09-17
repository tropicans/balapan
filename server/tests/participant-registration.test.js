import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const uniqueTestDb = path.join(repoRoot, 'data', `test_participant_reg_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'false';
process.env.PORT = '0'; // ephemeral port for HTTP testing

// Import dependencies after setting env
const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { createEvent, setActiveEvent, archiveEvent, getActiveEventId } = await import('../services/eventService.js');
const { registerParticipant, getParticipants, updateParticipant, importParticipants } = await import('../services/participantService.js');
const { parseParticipantCsv, tokenizeCsv } = await import('../utils/csvParser.js');

async function runTests() {
  console.log('🧪 RUNNING PARTICIPANT REGISTRATION & AUTO-NUMBERING TEST SUITE (PHASE 12)...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`📡 Test server running on ${baseUrl}\n`);

    const initialEventId = getActiveEventId();
    assert.ok(initialEventId, 'Active event must exist after initDatabase()');

    // ----------------------------------------------------
    // T-PARN-01: Single participant registration without coupons
    // ----------------------------------------------------
    console.log('--- T-PARN-01: Participant Registration without Coupons (PARN-01) ---');
    const p1 = registerParticipant({ name: 'Alpha Racer', team_name: 'Team Red' });
    assert.ok(p1.id, 'Participant ID must be generated');
    assert.strictEqual(p1.name, 'Alpha Racer');
    assert.strictEqual(p1.team_name, 'Team Red');
    assert.strictEqual(p1.role, 'participant');
    assert.strictEqual(p1.participant_number, 1, 'First participant must receive #1');
    assert.strictEqual(p1.event_id, initialEventId);

    // Verify database record has email = NULL and no coupon balance required
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(p1.id);
    assert.strictEqual(userRow.email, null, 'email must be NULL for v3.0 participant registration');
    assert.strictEqual(userRow.role, 'participant');
    const couponRow = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(p1.id);
    assert.ok(!couponRow || couponRow.balance === 0, 'No coupon package/balance required');

    // Also verify via HTTP POST /api/participants
    const resHttp1 = await fetch(`${baseUrl}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Http Racer', team_name: 'Team HTTP' })
    });
    assert.strictEqual(resHttp1.status, 201);
    const bodyHttp1 = await resHttp1.json();
    assert.strictEqual(bodyHttp1.success, true);
    assert.strictEqual(bodyHttp1.data.participant_number, 2);
    console.log('✓ [1/10] T-PARN-01 passed: participant registered with role="participant", email=NULL, no coupons required');

    // ----------------------------------------------------
    // T-PARN-02: Sequential participant numbers #1, #2, #3
    // ----------------------------------------------------
    console.log('\n--- T-PARN-02: Sequential Auto-Numbering (PARN-02) ---');
    const p3 = registerParticipant({ name: 'Beta Racer', team_name: 'Team Blue' });
    const p4 = registerParticipant({ name: 'Gamma Racer', team_name: 'Team Green' });
    assert.strictEqual(p3.participant_number, 3);
    assert.strictEqual(p4.participant_number, 4);
    console.log('✓ [2/10] T-PARN-02 passed: sequential participant numbers #1, #2, #3, #4 allocated ascendingly');

    // ----------------------------------------------------
    // T-EVNT-03: Switching/activating a new event resets participant number to #1
    // ----------------------------------------------------
    console.log('\n--- T-EVNT-03: Event Isolation and Reset to #1 (EVNT-03) ---');
    const event2 = createEvent({ nama: 'STC Seri 2 - Championship' });
    setActiveEvent(event2.id);
    assert.strictEqual(getActiveEventId(), event2.id);

    const pEv2_1 = registerParticipant({ name: 'New Era Racer 1' });
    assert.strictEqual(pEv2_1.participant_number, 1, 'Number must reset to #1 in newly active event');
    assert.strictEqual(pEv2_1.event_id, event2.id);

    const pEv2_2 = registerParticipant({ name: 'New Era Racer 2' });
    assert.strictEqual(pEv2_2.participant_number, 2, 'Number increments sequentially in new event');

    // Switch back to original event and assert numbering continues from previous max (4)
    setActiveEvent(initialEventId);
    assert.strictEqual(getActiveEventId(), initialEventId);
    const pResume = registerParticipant({ name: 'Delta Racer' });
    assert.strictEqual(pResume.participant_number, 5, 'Number in original event resumes continuing from max (4 + 1 = 5)');
    console.log('✓ [3/10] T-EVNT-03 passed: event isolation verified, resets to #1 on new event and resumes on return');

    // ----------------------------------------------------
    // T-PARN-03A: Omni-search by exact number (#42 or 42)
    // ----------------------------------------------------
    console.log('\n--- T-PARN-03A: Omni-search by Number (PARN-03, D-06) ---');
    const searchByNum = getParticipants({ event_id: initialEventId, search: '1' });
    assert.ok(searchByNum.participants.length >= 1);
    assert.ok(searchByNum.participants.some(p => p.participant_number === 1));

    const searchByHash = getParticipants({ event_id: initialEventId, search: '#1' });
    assert.ok(searchByHash.participants.length >= 1);
    assert.ok(searchByHash.participants.some(p => p.participant_number === 1));

    // Via HTTP GET /api/participants?search=3
    const resSearchHttp = await fetch(`${baseUrl}/api/participants?search=3`);
    assert.strictEqual(resSearchHttp.status, 200);
    const bodySearchHttp = await resSearchHttp.json();
    assert.strictEqual(bodySearchHttp.success, true);
    assert.ok(bodySearchHttp.data.participants.some(p => p.participant_number === 3));
    console.log('✓ [4/10] T-PARN-03A passed: omni-search finds participant by exact number "3" and "#1"');

    // ----------------------------------------------------
    // T-PARN-03B: Omni-search by name substring or team tag
    // ----------------------------------------------------
    console.log('\n--- T-PARN-03B: Omni-search by Text (PARN-03, D-06) ---');
    const searchByName = getParticipants({ event_id: initialEventId, search: 'Alpha' });
    assert.ok(searchByName.participants.length >= 1);
    assert.ok(searchByName.participants.some(p => p.name === 'Alpha Racer'));

    const searchByTeam = getParticipants({ event_id: initialEventId, search: 'Blue' });
    assert.ok(searchByTeam.participants.length >= 1);
    assert.ok(searchByTeam.participants.some(p => p.team_name === 'Team Blue'));
    console.log('✓ [5/10] T-PARN-03B passed: omni-search finds participants by name substring and team tag');

    // ----------------------------------------------------
    // T-PARN-04: Multi-entry allowed with identical racer name
    // ----------------------------------------------------
    console.log('\n--- T-PARN-04: Multi-entry with Identical Name (D-04) ---');
    const multi1 = registerParticipant({ name: 'Twin Driver', team_name: 'Double Trouble' });
    const multi2 = registerParticipant({ name: 'Twin Driver', team_name: 'Double Trouble' });
    assert.notStrictEqual(multi1.id, multi2.id, 'IDs must be distinct UUIDs');
    assert.strictEqual(multi1.name, multi2.name);
    assert.strictEqual(multi2.participant_number, multi1.participant_number + 1, 'Sequential numbers allocated');
    console.log(`✓ [6/10] T-PARN-04 passed: identical name multi-entry succeeded with distinct numbers #${multi1.participant_number} and #${multi2.participant_number}`);

    // ----------------------------------------------------
    // T-PARN-05: Optional team name defaults to NULL
    // ----------------------------------------------------
    console.log('\n--- T-PARN-05: Optional Team Name Stores NULL (D-05) ---');
    const emptyTeam = registerParticipant({ name: 'Solo Racer', team_name: '' });
    assert.strictEqual(emptyTeam.team_name, null);
    const omittedTeam = registerParticipant({ name: 'Independent Racer' });
    assert.strictEqual(omittedTeam.team_name, null);

    const dbEmpty = db.prepare('SELECT team_name FROM users WHERE id = ?').get(emptyTeam.id);
    assert.strictEqual(dbEmpty.team_name, null, 'Database column must store NULL');
    console.log('✓ [7/10] T-PARN-05 passed: empty or omitted team_name stores NULL in database and outputs null');

    // ----------------------------------------------------
    // T-PARN-06: Typo edit updates name/team only
    // ----------------------------------------------------
    console.log('\n--- T-PARN-06: Typo Edit Protections (D-12) ---');
    const updatedP1 = updateParticipant(p1.id, { name: 'Alpha Racer Prime', team_name: 'Team Red Scarlet' });
    assert.strictEqual(updatedP1.name, 'Alpha Racer Prime');
    assert.strictEqual(updatedP1.team_name, 'Team Red Scarlet');
    assert.strictEqual(updatedP1.participant_number, p1.participant_number, 'participant_number must remain unchanged');
    assert.strictEqual(updatedP1.event_id, p1.event_id, 'event_id must remain unchanged');

    // HTTP PUT /api/participants/:id
    const resPut = await fetch(`${baseUrl}/api/participants/${p1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alpha Final', team_name: 'Red Final' })
    });
    assert.strictEqual(resPut.status, 200);
    const bodyPut = await resPut.json();
    assert.strictEqual(bodyPut.data.name, 'Alpha Final');
    assert.strictEqual(bodyPut.data.participant_number, p1.participant_number);

    // Empty name rejection
    assert.throws(() => {
      updateParticipant(p1.id, { name: '   ' });
    }, /Nama peserta wajib diisi/);
    console.log('✓ [8/10] T-PARN-06 passed: typo update updates name/team while protecting participant_number and event_id');

    // ----------------------------------------------------
    // T-PARN-07: CSV import preview and execution
    // ----------------------------------------------------
    console.log('\n--- T-PARN-07: CSV Import Preview & Execution (PARN-05, D-07, D-09) ---');
    const testCsv = `name,team\nImported Racer 1,Team Apex\nImported Racer 2,Team Apex\n,Empty Name\nImported Racer 3,`;
    const preview = parseParticipantCsv(testCsv);
    assert.strictEqual(preview.valid.length, 3);
    assert.strictEqual(preview.skipped.length, 1);
    assert.strictEqual(preview.skipped[0].reason, 'Kolom nama kosong');

    const beforeMax = db.prepare('SELECT COALESCE(MAX(participant_number), 0) AS m FROM users WHERE event_id = ?').get(initialEventId).m;
    const importRes = importParticipants(preview.valid, { event_id: initialEventId });
    assert.strictEqual(importRes.count, 3);
    assert.strictEqual(importRes.imported[0].participant_number, beforeMax + 1);
    assert.strictEqual(importRes.imported[1].participant_number, beforeMax + 2);
    assert.strictEqual(importRes.imported[2].participant_number, beforeMax + 3);

    // HTTP POST /api/participants/import-preview
    const resPreviewHttp = await fetch(`${baseUrl}/api/participants/import-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: testCsv })
    });
    assert.strictEqual(resPreviewHttp.status, 200);
    const bodyPreviewHttp = await resPreviewHttp.json();
    assert.strictEqual(bodyPreviewHttp.data.valid.length, 3);
    console.log('✓ [9/10] T-PARN-07 passed: CSV import preview and execution accurately sequential from max + 1');

    // ----------------------------------------------------
    // T-PARN-08: CSV compatibility with STC Vol 8 roster
    // ----------------------------------------------------
    console.log('\n--- T-PARN-08: STC Vol 8 Format Compatibility (D-08) ---');
    const stcFile = path.join(repoRoot, 'data', 'stc-vol8-roster.csv');
    assert.ok(fs.existsSync(stcFile), 'stc-vol8-roster.csv file must exist');
    const stcText = fs.readFileSync(stcFile, 'utf8');
    const stcPreview = parseParticipantCsv(stcText);

    // 31 paid (Lunas) + 3 comp (Rp0) = 34 valid racers
    assert.strictEqual(stcPreview.valid.length, 34, 'STC Vol 8 should parse 34 valid racers');
    assert.ok(stcPreview.skipped.length > 0, 'STC Vol 8 should report skipped rows');
    assert.ok(stcPreview.valid.some(r => r.name.toLowerCase() === 'om sandi'), 'Must include "om sandi"');
    assert.ok(stcPreview.valid.some(r => r.name.toLowerCase() === 'unyil'), 'Must include comp racer "Unyil"');
    console.log('✓ [10/10] T-PARN-08 passed: STC Vol 8 format accurately parsed 34 valid (paid + comp) racers');

    // ----------------------------------------------------
    // T-PARN-09: Rejection when no active event exists
    // ----------------------------------------------------
    console.log('\n--- T-PARN-09: Rejection on Missing Active Event (EVNT-03) ---');
    // Archive all events
    const allEvents = db.prepare('SELECT id FROM events WHERE status = "active"').all();
    for (const ev of allEvents) {
      archiveEvent(ev.id);
    }
    assert.strictEqual(getActiveEventId(), null);

    assert.throws(() => {
      registerParticipant({ name: 'Orphan Racer' });
    }, /Tidak ada event aktif/);

    const resNoEvent = await fetch(`${baseUrl}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Orphan Racer' })
    });
    assert.strictEqual(resNoEvent.status, 400);
    const bodyNoEvent = await resNoEvent.json();
    assert.strictEqual(bodyNoEvent.success, false);
    assert.match(bodyNoEvent.error, /Tidak ada event aktif/);

    // Restore active event
    setActiveEvent(initialEventId);
    assert.strictEqual(getActiveEventId(), initialEventId);
    console.log('✓ [Bonus 1/2] T-PARN-09 passed: registration rejected with 400 when no active event exists');

    // ----------------------------------------------------
    // T-PARN-10: CLI script scripts/import-roster.js execution
    // ----------------------------------------------------
    console.log('\n--- T-PARN-10: CLI Script scripts/import-roster.js (D-07) ---');
    // Flush DB to disk first so CLI subprocess sees current state
    db.save();

    const nodeExec = process.execPath;
    const scriptPath = path.join(repoRoot, 'scripts', 'import-roster.js');

    // Execute dry run
    const dryOut = execSync(`"${nodeExec}" "${scriptPath}" --dry --csv "${stcFile}"`, {
      encoding: 'utf8',
      env: { ...process.env, DB_PATH: uniqueTestDb }
    });
    assert.match(dryOut, /DRY RUN/);
    assert.match(dryOut, /34 valid racers/);

    // Execute actual import into active event
    const importOut = execSync(`"${nodeExec}" "${scriptPath}" --db "${uniqueTestDb}" --event "${initialEventId}" --csv "${stcFile}"`, {
      encoding: 'utf8',
      env: { ...process.env, DB_PATH: uniqueTestDb }
    });
    assert.match(importOut, /Sukses mengimpor 34 peserta/);

    // Reload DB from file to observe CLI writes
    await db.init(uniqueTestDb);
    const importedRacer = db.prepare('SELECT * FROM users WHERE event_id = ? AND name = ?').get(initialEventId, 'om sandi');
    assert.ok(importedRacer, 'Imported racer "om sandi" must exist in database');
    assert.strictEqual(importedRacer.role, 'participant');
    console.log('✓ [Bonus 2/2] T-PARN-10 passed: CLI script successfully parsed and imported 34 participants into active event');

    console.log('\n🎉 ALL 10 PARTICIPANT REGISTRATION & AUTO-NUMBERING TESTS PASSED (100% GREEN)!\n');
  } finally {
    server.close();
    if (fs.existsSync(uniqueTestDb)) {
      try {
        fs.unlinkSync(uniqueTestDb);
      } catch (_) {}
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
