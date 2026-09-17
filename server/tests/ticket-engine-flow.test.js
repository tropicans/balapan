import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_ticket_engine_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'true';
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { RaceManager } = await import('../raceManager.js');
let TicketEngine;
try {
  const teModule = await import('../ticketEngine.js');
  TicketEngine = teModule.TicketEngine || teModule.default;
} catch (e) {
  // Will be imported once created in Task 2
}

async function runTests() {
  console.log('🧪 RUNNING COMPREHENSIVE TICKET ENGINE TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`📡 Test server running on ${baseUrl}`);

    // =========================================================================
    // TASK 1: Skema Database next_round_tickets & Kolom bracket_matches
    // =========================================================================
    console.log('\n--- Task 1: Schema next_round_tickets & Migrasi Kolom bracket_matches ---');
    const tableInfo = db.prepare("PRAGMA table_info(next_round_tickets)").all();
    assert.ok(tableInfo.length > 0, 'Tabel next_round_tickets harus dibuat di SQLite');

    const columnNames = tableInfo.map(c => c.name);
    const expectedCols = [
      'id', 'ticket_number', 'ticket_code', 'user_id', 'racer_ticket_index',
      'package_id', 'serial_number', 'lane', 'source', 'status',
      'bracket_match_id', 'bracket_slot', 'void_reason', 'created_at', 'updated_at'
    ];
    for (const col of expectedCols) {
      assert.ok(columnNames.includes(col), `Kolom ${col} harus ada di next_round_tickets`);
    }

    const bracketTableInfo = db.prepare("PRAGMA table_info(bracket_matches)").all();
    const bracketCols = bracketTableInfo.map(c => c.name);
    assert.ok(bracketCols.includes('ticket_id_1'), 'bracket_matches harus punya kolom ticket_id_1');
    assert.ok(bracketCols.includes('ticket_id_2'), 'bracket_matches harus punya kolom ticket_id_2');
    assert.ok(bracketCols.includes('ticket_id_3'), 'bracket_matches harus punya kolom ticket_id_3');
    assert.ok(bracketCols.includes('is_auto_advanced'), 'bracket_matches harus punya kolom is_auto_advanced');

    console.log('✓ Task 1: Schema next_round_tickets dan migrasi bracket_matches terverifikasi.');

    // =========================================================================
    // TASK 2: TicketEngine Sequential Issuing, Multi-Ticket, Seeding, Auto-Advance, Void
    // =========================================================================
    console.log('\n--- Task 2: TicketEngine Issuing, Multi-Ticket, Seeding, Auto-Advance ---');

    const andi = db.prepare("SELECT * FROM users WHERE email = 'andi@gmail.com'").get();
    const budi = db.prepare("SELECT * FROM users WHERE email = 'budi@gmail.com'").get();
    assert.ok(andi && budi, 'User Andi dan Budi harus ada');

    // Register test package for Budi
    const budiPkgId = uuidv4();
    db.prepare(`
      INSERT INTO coupon_packages (
        id, serial_number, user_id, total_quota, used_quota, remaining_quota, status
      ) VALUES (?, 'TKT-TEST-BUDI', ?, 50, 0, 50, 'active')
    `).run(budiPkgId, budi.id);

    // 1. Issue Ticket 1 for Budi
    const t1 = TicketEngine.issueTicket({
      userId: budi.id,
      packageId: budiPkgId,
      serialNumber: 'TKT-TEST-BUDI',
      lane: 'A',
      source: 'marshal'
    });

    assert.strictEqual(t1.ticket_number, 1, 'Nomor tiket pertama harus 1');
    assert.strictEqual(t1.ticket_code, 'TKT-B2-001', 'Kode tiket harus TKT-B2-001');
    assert.strictEqual(t1.racer_ticket_index, 1, 'Index tiket pembalap harus 1');
    assert.strictEqual(t1.racer_label, `${budi.name} #1`, 'Label harus Nama #1');
    assert.strictEqual(t1.bracket_slot, 'user_id_1', 'Tiket pertama masuk slot user_id_1');
    assert.strictEqual(t1.bracket_match_number, 1, 'Tiket pertama masuk Match 1 Round 2');
    assert.strictEqual(t1.autoAdvanced, false, 'Belum auto advance');

    // 2. Issue Ticket 2 for Budi (Multi-ticket D-01 & D-03)
    const t2 = TicketEngine.issueTicket({
      userId: budi.id,
      packageId: budiPkgId,
      serialNumber: 'TKT-TEST-BUDI',
      lane: 'B',
      source: 'marshal'
    });

    assert.strictEqual(t2.ticket_number, 2, 'Nomor tiket kedua harus 2');
    assert.strictEqual(t2.ticket_code, 'TKT-B2-002', 'Kode tiket harus TKT-B2-002');
    assert.strictEqual(t2.racer_ticket_index, 2, 'Index tiket pembalap harus 2');
    assert.strictEqual(t2.racer_label, `${budi.name} #2`, 'Label harus Budi #2');
    assert.strictEqual(t2.bracket_slot, 'user_id_2', 'Tiket kedua masuk slot user_id_2');
    assert.strictEqual(t2.bracket_match_number, 1, 'Tiket kedua tetap di Match 1');
    assert.strictEqual(t2.autoAdvanced, false, 'Belum auto advance');

    // 3. Issue Ticket 3 for Budi -> Fills All 3 Slots in Match 1 -> Triggers All-3-Same-Lane Auto-Advance (D-04)
    const t3 = TicketEngine.issueTicket({
      userId: budi.id,
      packageId: budiPkgId,
      serialNumber: 'TKT-TEST-BUDI',
      lane: 'C',
      source: 'marshal'
    });

    assert.strictEqual(t3.ticket_number, 3, 'Nomor tiket ketiga harus 3');
    assert.strictEqual(t3.racer_ticket_index, 3, 'Index tiket pembalap harus 3');
    assert.strictEqual(t3.racer_label, `${budi.name} #3`, 'Label harus Budi #3');
    assert.strictEqual(t3.bracket_slot, 'user_id_3', 'Tiket ketiga masuk slot user_id_3');
    assert.strictEqual(t3.autoAdvanced, true, 'Aturan All-3-Same-Lane Auto-Advance harus aktif');

    // Verify Match 1 in DB
    const m1 = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 1').get();
    assert.strictEqual(m1.status, 'completed', 'Match 1 harus berstatus completed');
    assert.strictEqual(m1.is_auto_advanced, 1, 'Match 1 is_auto_advanced harus 1');
    assert.strictEqual(m1.winner_id, budi.id, 'Winner harus Budi');

    // Verify Grand Final / parent match has Budi advanced
    const gf = db.prepare('SELECT * FROM bracket_matches WHERE round_number = 3').get();
    assert.ok(gf.user_id_1 === budi.id || gf.user_id_2 === budi.id || gf.user_id_3 === budi.id, 'Budi harus auto-advanced ke Round 3');

    // 4. Test Void Ticket (e.g. void t3)
    const initialBalance = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(budi.id)?.balance || 0;
    const voidRes = TicketEngine.voidTicket(t3.id, 'Test rollback auto-advance');
    assert.strictEqual(voidRes.success, true, 'Void harus sukses');

    // Verify Match 1 restored
    const m1AfterVoid = db.prepare('SELECT * FROM bracket_matches WHERE match_number = 1').get();
    assert.strictEqual(m1AfterVoid.status, 'pending', 'Status match harus kembali pending');
    assert.strictEqual(m1AfterVoid.is_auto_advanced, 0, 'is_auto_advanced harus kembali 0');
    assert.strictEqual(m1AfterVoid.user_id_3, null, 'Slot user_id_3 harus kosong kembali');
    assert.strictEqual(m1AfterVoid.ticket_id_3, null, 'Slot ticket_id_3 harus kosong kembali');

    // Verify Coupon Balance restored
    const restoredBalance = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(budi.id)?.balance || 0;
    assert.strictEqual(restoredBalance, initialBalance + 1, 'Saldo kupon harus dikembalikan +1');

    console.log('✓ Task 2: Issuance sequential, multi-ticket #1/#2/#3, Auto-Advance, dan Void rollback terverifikasi.');

    // =========================================================================
    // TASK 3: Integrasi Dual-Source Trigger (/marshal & RD), Void 60s, DNF Zero-Ticket
    // =========================================================================
    console.log('\n--- Task 3: Integrasi Dual-Source (/marshal & RD), Void 60s, DNF Zero-Ticket ---');

    // 1. Test POST /api/marshal/record-winner integration
    const chandra = db.prepare("SELECT * FROM users WHERE email = 'chandra@gmail.com'").get();
    assert.ok(chandra, 'User Chandra harus ada');

    const chandraPkgId = uuidv4();
    db.prepare(`
      INSERT INTO coupon_packages (
        id, serial_number, user_id, total_quota, used_quota, remaining_quota, status
      ) VALUES (?, 'TKT-TEST-CHAN', ?, 50, 0, 50, 'active')
    `).run(chandraPkgId, chandra.id);

    const initialTicketsCount = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;

    const resRecord = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'TKT-TEST-CHAN',
        lane: 'B'
      })
    });

    assert.strictEqual(resRecord.status, 200, 'Record winner marshal harus 200 OK');
    const recData = await resRecord.json();
    assert.strictEqual(recData.success, true);
    assert.ok(recData.data.ticket, 'Data harus menyertakan info tiket Babak 2');
    assert.strictEqual(recData.data.ticket.user_id, chandra.id);
    assert.strictEqual(recData.data.ticket.serial_number, 'TKT-TEST-CHAN');
    assert.strictEqual(recData.data.ticket.lane, 'B');
    assert.ok(recData.data.ticket.ticket_number > 0, 'Nomor tiket harus valid');

    const postRecordCount = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;
    assert.strictEqual(postRecordCount, initialTicketsCount + 1, 'Total tiket harus bertambah 1');

    // 2. Test POST /api/marshal/undo-last-winner
    const resUndo = await fetch(`${baseUrl}/api/marshal/undo-last-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: recData.data.log_id
      })
    });

    assert.strictEqual(resUndo.status, 200, 'Undo winner marshal harus 200 OK');
    const undoData = await resUndo.json();
    assert.strictEqual(undoData.success, true);
    assert.strictEqual(undoData.data.remaining_quota, 50, 'Kuota kupon harus pulih kembali 50');

    const ticketAfterUndo = db.prepare('SELECT * FROM next_round_tickets WHERE id = ?').get(recData.data.ticket.id);
    assert.strictEqual(ticketAfterUndo.status, 'void', 'Status tiket harus berubah void');

    // Check slot in bracket is freed
    const matchSlot = db.prepare(`SELECT * FROM bracket_matches WHERE id = ?`).get(recData.data.ticket.bracket_match_id);
    assert.strictEqual(matchSlot[recData.data.ticket.bracket_slot], null, 'Slot bracket harus dikosongkan kembali');

    // 3. Test Scrutineer Pass in RaceManager issues ticket (TKET-01 via RD)
    const activeRace = RaceManager.getActiveRace();
    // Register Doni into active race
    const doni = db.prepare("SELECT * FROM users WHERE email = 'doni@gmail.com'").get();
    assert.ok(doni, 'User Doni harus ada');

    const regDoni = db.prepare(`
      INSERT INTO race_registrations (id, race_id, user_id, lane, status, finish_time)
      VALUES (?, ?, ?, 'C', 'finished', 10.95)
    `);
    const regDoniId = uuidv4();
    regDoni.run(regDoniId, activeRace.id, doni.id);

    const countBeforeScrut = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;

    const scrutRes = RaceManager.handleScrutineerAction(regDoniId, 'pass');
    assert.strictEqual(scrutRes.success, true);
    assert.strictEqual(scrutRes.status, 'pass');

    const countAfterScrut = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;
    assert.strictEqual(countAfterScrut, countBeforeScrut + 1, 'Scrutineer pass harus menerbitkan tiket Babak 2');

    // 4. Test declareAllCO() zero-ticket guarantee (TKET-03)
    // Create new race for testing CO
    const maxRaceNum = db.prepare('SELECT MAX(race_number) as max_num FROM races').get()?.max_num || 1;
    const coRaceId = uuidv4();
    db.prepare(`
      INSERT INTO races (id, race_number, status)
      VALUES (?, ?, 'locked')
    `).run(coRaceId, maxRaceNum + 1);

    const eko = db.prepare("SELECT * FROM users WHERE email = 'eko@gmail.com'").get();
    db.prepare(`
      INSERT INTO race_registrations (id, race_id, user_id, lane, status)
      VALUES (?, ?, ?, 'A', 'ready')
    `).run(uuidv4(), coRaceId, eko.id);

    const countBeforeCO = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;

    const coRes = RaceManager.declareAllCO(coRaceId);
    assert.strictEqual(coRes.success, true);
    assert.strictEqual(coRes.status, 'completed');

    const countAfterCO = db.prepare("SELECT COUNT(*) as count FROM next_round_tickets WHERE status = 'issued'").get()?.count || 0;
    assert.strictEqual(countAfterCO, countBeforeCO, 'declareAllCO tidak boleh menerbitkan tiket (Zero-Ticket TKET-03)');

    console.log('✓ Task 3: Dual-source trigger, 60s void rollback, dan DNF zero-ticket guarantee terverifikasi 100%.');

    // =========================================================================
    // TASK 4 (Plan 09-02 Task 1): REST API /api/tickets, Lock Qualifying & Rejection
    // =========================================================================
    console.log('\n--- Task 4: REST API /api/tickets, Lock Qualifying, dan Rejection ---');

    // 1. GET /api/tickets
    const resTickets = await fetch(`${baseUrl}/api/tickets`);
    assert.strictEqual(resTickets.status, 200, 'GET /api/tickets harus 200 OK');
    const ticketsData = await resTickets.json();
    assert.strictEqual(ticketsData.success, true);
    assert.ok(ticketsData.data.tickets.length > 0, 'Harus ada tiket terbit di database');
    assert.ok(ticketsData.data.total_issued > 0, 'total_issued harus > 0');
    assert.strictEqual(ticketsData.data.is_locked, false, 'Awalnya kualifikasi belum terkunci');

    // 2. POST /api/tickets/lock-qualifying
    const resLock = await fetch(`${baseUrl}/api/tickets/lock-qualifying`, { method: 'POST' });
    assert.strictEqual(resLock.status, 200, 'POST lock-qualifying harus 200 OK');
    const lockData = await resLock.json();
    assert.strictEqual(lockData.success, true);
    assert.strictEqual(lockData.data.is_locked, true);
    assert.strictEqual(TicketEngine.isQualifyingLocked(), true, 'TicketEngine harus mengenali state locked');

    // 3. Reject issueTicket when locked
    assert.throws(() => {
      TicketEngine.issueTicket({
        userId: andi.id,
        serialNumber: 'LOCKED-TEST',
        lane: 'A'
      });
    }, /Kualifikasi telah dikunci/i, 'issueTicket saat locked harus ditolak');

    // Reject via REST /api/marshal/record-winner when locked
    const resBlockedMarshal = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'TKT-TEST-CHAN',
        lane: 'B'
      })
    });
    assert.ok([400, 500].includes(resBlockedMarshal.status), 'Marshal record winner harus gagal 400 atau 500 saat locked');
    const blockedData = await resBlockedMarshal.json();
    assert.ok(blockedData.error.includes('dikunci'), 'Error message harus menyebut kualifikasi dikunci');

    // 4. POST /api/tickets/unlock-qualifying
    const resUnlock = await fetch(`${baseUrl}/api/tickets/unlock-qualifying`, { method: 'POST' });
    assert.strictEqual(resUnlock.status, 200, 'POST unlock-qualifying harus 200 OK');
    assert.strictEqual(TicketEngine.isQualifyingLocked(), false, 'State harus kembali open');

    console.log('✓ Task 4: API /api/tickets, lock-qualifying, penolakan tiket, dan unlock-qualifying terverifikasi.');

    console.log('\n🎉 ALL 09-01 & 09-02 BACKEND TASKS PASSED SUCCESSFULLY!');
  } finally {
    if (server && server.listening) {
      server.close();
    }
    if (fs.existsSync(uniqueTestDb)) {
      try {
        fs.unlinkSync(uniqueTestDb);
      } catch (e) {}
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});
