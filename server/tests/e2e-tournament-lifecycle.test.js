import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_e2e_tournament_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { RaceManager } = await import('../raceManager.js');
const { TicketEngine } = await import('../ticketEngine.js');

async function runTests() {
  console.log('🧪 RUNNING END-TO-END TOURNAMENT LIFECYCLE INTEGRATION TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`📡 Test server active on ${baseUrl}`);

    // =========================================================================
    // STEP 1: Kasir Activation (POST /api/cashier/packages/activate)
    // =========================================================================
    console.log('\n--- Step 1: Kasir Activation (Kupon Fisik 50 Kotak) ---');
    const serialRacer1 = `CPN-LFC-001`;
    const resActivate1 = await fetch(`${baseUrl}/api/cashier/packages/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer1,
        new_user_name: 'Ray Stinger Speed',
        team_name: 'OGAMI-CORP',
        total_quota: 50,
        price_paid: 100000,
        payment_method: 'cash'
      })
    });

    assert.strictEqual(resActivate1.status, 201, 'Aktivasi paket kupon kasir harus 201 Created');
    const dataActivate1 = await resActivate1.json();
    assert.strictEqual(dataActivate1.success, true);
    assert.strictEqual(dataActivate1.data.package.serial_number, serialRacer1);
    assert.strictEqual(dataActivate1.data.package.total_quota, 50);
    assert.strictEqual(dataActivate1.data.package.remaining_quota, 50);

    const racer1Id = dataActivate1.data.package.user_id;
    const racer1Name = dataActivate1.data.package.user_name;
    assert.ok(racer1Id, 'User ID pembalap harus terbuat');
    console.log(`✓ Kasir berhasil aktivasi paket ${serialRacer1} untuk ${racer1Name} (${racer1Id})`);

    // Tambah 2 pembalap lagi untuk Jalur B dan Jalur C
    const serialRacer2 = `CPN-LFC-002`;
    const resActivate2 = await fetch(`${baseUrl}/api/cashier/packages/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer2,
        new_user_name: 'Sonic Saber Pro',
        team_name: 'TRIDAGGER-X',
        total_quota: 50,
        price_paid: 100000,
        payment_method: 'qris'
      })
    });
    const dataActivate2 = await resActivate2.json();
    const racer2Id = dataActivate2.data.package.user_id;

    const serialRacer3 = `CPN-LFC-003`;
    const resActivate3 = await fetch(`${baseUrl}/api/cashier/packages/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer3,
        new_user_name: 'Magnum Saber GT',
        team_name: 'VICTORYS',
        total_quota: 50,
        price_paid: 100000,
        payment_method: 'transfer'
      })
    });
    const dataActivate3 = await resActivate3.json();
    const racer3Id = dataActivate3.data.package.user_id;

    console.log(`✓ 3 Pembalap turnamen berhasil diaktivasi kupon fisiknya.`);

    // =========================================================================
    // STEP 2: Marshal Registration & Debit (POST /api/marshal/register-box)
    // =========================================================================
    console.log('\n--- Step 2: Marshal Start Box Registration & Quota Debit ---');

    // Lane A
    const resBoxA = await fetch(`${baseUrl}/api/marshal/register-box`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer1,
        lane: 'A',
        box_number: 1
      })
    });
    assert.strictEqual(resBoxA.status, 200, 'Register box Lane A harus 200 OK');
    const dataBoxA = await resBoxA.json();
    assert.strictEqual(dataBoxA.success, true);
    assert.strictEqual(dataBoxA.data.remaining_quota, 49, 'Kuota sisa harus 49');
    assert.strictEqual(dataBoxA.data.lane, 'A');

    // Lane B
    const resBoxB = await fetch(`${baseUrl}/api/marshal/register-box`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer2,
        lane: 'B',
        box_number: 1
      })
    });
    assert.strictEqual(resBoxB.status, 200, 'Register box Lane B harus 200 OK');

    // Lane C
    const resBoxC = await fetch(`${baseUrl}/api/marshal/register-box`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer3,
        lane: 'C',
        box_number: 1
      })
    });
    assert.strictEqual(resBoxC.status, 200, 'Register box Lane C harus 200 OK');

    console.log('✓ Petugas start box sukses mendaftarkan Jalur A, B, C dan memotong kupon pembalap.');

    // =========================================================================
    // STEP 3 & 4: Finish & Ticket Issuing (POST /api/marshal/record-winner)
    // =========================================================================
    console.log('\n--- Step 3 & 4: Finish Record Winner & Digital Ticket Auto-Issuance ---');

    const resWinner1 = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer1,
        lane: 'A',
        heat_number: 1
      })
    });

    assert.strictEqual(resWinner1.status, 200, 'Record winner harus 200 OK');
    const dataWinner1 = await resWinner1.json();
    assert.strictEqual(dataWinner1.success, true);

    const ticket1 = dataWinner1.data.ticket;
    assert.ok(ticket1, 'Tiket digital harus terbit');
    assert.strictEqual(ticket1.ticket_number, 1, 'Nomor tiket pertama harus 1');
    assert.strictEqual(ticket1.ticket_code, 'TKT-B2-001', 'Kode tiket harus TKT-B2-001');
    assert.strictEqual(ticket1.status, 'issued', 'Status tiket harus issued');
    assert.strictEqual(ticket1.racer_ticket_index, 1, 'Index tiket pembalap harus 1');
    assert.strictEqual(ticket1.racer_label, `${racer1Name} #1`, 'Label tiket pembalap harus Nama #1');
    assert.strictEqual(ticket1.bracket_match_number, 1, 'Seeding ke Match 1 Round 2');
    assert.strictEqual(ticket1.bracket_slot, 'user_id_1', 'Slot pertama masuk user_id_1 (Jalur A)');

    console.log(`✓ Kemenangan Heat 1 tercatat: Tiket ${ticket1.ticket_code} (#${ticket1.ticket_number}) diterbitkan untuk ${ticket1.racer_label}`);

    // =========================================================================
    // STEP 5 & 6: Multi-Ticket Seeding untuk Pembalap yang Sama
    // =========================================================================
    console.log('\n--- Step 5 & 6: Multi-Ticket Seeding (Nama #1, Nama #2) ---');

    const resWinner2 = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer1,
        lane: 'B',
        heat_number: 2
      })
    });

    assert.strictEqual(resWinner2.status, 200);
    const dataWinner2 = await resWinner2.json();
    const ticket2 = dataWinner2.data.ticket;
    assert.strictEqual(ticket2.ticket_number, 2, 'Nomor tiket kedua harus 2');
    assert.strictEqual(ticket2.ticket_code, 'TKT-B2-002', 'Kode tiket harus TKT-B2-002');
    assert.strictEqual(ticket2.racer_ticket_index, 2, 'Index tiket kedua untuk pembalap harus 2');
    assert.strictEqual(ticket2.racer_label, `${racer1Name} #2`, 'Label tiket kedua harus Nama #2');
    assert.strictEqual(ticket2.bracket_match_number, 1, 'Masuk ke Match 1 Round 2');
    assert.strictEqual(ticket2.bracket_slot, 'user_id_2', 'Slot kedua masuk user_id_2 (Jalur B)');
    assert.strictEqual(ticket2.autoAdvanced, false, 'Belum auto-advance');

    console.log(`✓ Tiket kedua untuk ${racer1Name} berhasil di-seeding: ${ticket2.ticket_code} (${ticket2.racer_label}) di slot ${ticket2.bracket_slot}`);

    // =========================================================================
    // STEP 7: All-3-Same-Lane Auto-Advance Rule (D-04)
    // =========================================================================
    console.log('\n--- Step 7: All-3-Same-Lane Auto-Advance Rule ---');

    const resWinner3 = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer1,
        lane: 'C',
        heat_number: 3
      })
    });

    assert.strictEqual(resWinner3.status, 200);
    const dataWinner3 = await resWinner3.json();
    const ticket3 = dataWinner3.data.ticket;
    assert.strictEqual(ticket3.ticket_number, 3, 'Nomor tiket ketiga harus 3');
    assert.strictEqual(ticket3.ticket_code, 'TKT-B2-003', 'Kode tiket harus TKT-B2-003');
    assert.strictEqual(ticket3.racer_ticket_index, 3, 'Index tiket ketiga untuk pembalap harus 3');
    assert.strictEqual(ticket3.racer_label, `${racer1Name} #3`, 'Label tiket ketiga harus Nama #3');
    assert.strictEqual(ticket3.autoAdvanced, true, 'Ketiga slot terisi pembalap sama -> Auto-Advance HARUS true');

    // Verifikasi di database bahwa match 1 round 2 statusnya completed & is_auto_advanced = 1
    const match1 = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(ticket3.bracket_match_id);
    assert.strictEqual(match1.status, 'completed', 'Match status harus completed');
    assert.strictEqual(match1.is_auto_advanced, 1, 'is_auto_advanced harus bernilai 1');
    assert.strictEqual(match1.winner_id, racer1Id, 'Pemenang harus racer1');

    // Verifikasi pemenang otomatis maju ke parent match (Round 3 / Grand Final)
    if (match1.parent_match_id) {
      const parentMatch = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(match1.parent_match_id);
      assert.ok(
        parentMatch.user_id_1 === racer1Id || parentMatch.user_id_2 === racer1Id || parentMatch.user_id_3 === racer1Id,
        'Pembalap harus maju otomatis ke Grand Final'
      );
    }
    console.log(`✓ All-3-Same-Lane Auto-Advance terverifikasi: Match #${match1.match_number} selesai otomatis dan ${racer1Name} maju ke Round berikutnya!`);

    // =========================================================================
    // STEP 8: Ticket Telemetry di RaceManager.getFullState() & GET /api/state
    // =========================================================================
    console.log('\n--- Step 8: Telemetri Ticket & TV HUD Quota State ---');

    const stateRes = await fetch(`${baseUrl}/api/state`);
    assert.strictEqual(stateRes.status, 200);
    const stateData = await stateRes.json();
    assert.strictEqual(stateData.success, true);
    const ticketStats = stateData.data.ticketStats;

    assert.ok(ticketStats, 'ticketStats harus ada di getFullState()');
    assert.strictEqual(ticketStats.total_issued, 3, 'Total issued harus 3');
    assert.strictEqual(ticketStats.total_void, 0, 'Total void harus 0');
    assert.ok(ticketStats.target_quota > 0, 'Target quota harus > 0');
    assert.strictEqual(ticketStats.remaining_quota, ticketStats.target_quota - 3, 'Remaining quota harus sesuai');
    assert.strictEqual(ticketStats.is_locked, false, 'Kualifikasi masih terbuka');
    assert.strictEqual(typeof ticketStats.is_critical, 'boolean', 'is_critical harus boolean');
    assert.ok(Array.isArray(ticketStats.racers), 'racers harus berupa array');
    assert.ok(Array.isArray(ticketStats.tickets), 'tickets harus berupa array');

    const racer1Summary = ticketStats.racers.find(r => r.user_id === racer1Id);
    assert.ok(racer1Summary, 'Pembalap 1 harus terdaftar di roster tiket');
    assert.strictEqual(racer1Summary.ticket_count, 3, 'Pembalap 1 harus memiliki 3 tiket');

    console.log(`✓ Telemetri tiket terverifikasi di getFullState: target=${ticketStats.target_quota}, issued=${ticketStats.total_issued}, remaining=${ticketStats.remaining_quota}`);

    // =========================================================================
    // STEP 9: Kunci Kualifikasi, Bye System, & Penolakan Tiket Baru
    // =========================================================================
    console.log('\n--- Step 9: Kunci Kualifikasi, Bye System & Rejection Lock ---');

    // 1. Kunci kualifikasi
    const resLock = await fetch(`${baseUrl}/api/tickets/lock-qualifying`, {
      method: 'POST'
    });
    assert.strictEqual(resLock.status, 200, 'Lock qualifying harus 200 OK');
    const dataLock = await resLock.json();
    assert.strictEqual(dataLock.success, true);
    assert.strictEqual(dataLock.data.is_locked, true);

    // Verifikasi status kualifikasi terkunci di DB
    assert.strictEqual(TicketEngine.isQualifyingLocked(), true, 'TicketEngine.isQualifyingLocked() harus true');

    // Verifikasi di state terbaru
    const postLockState = RaceManager.getFullState();
    assert.strictEqual(postLockState.ticketStats.is_locked, true, 'ticketStats.is_locked di state harus true');

    // 2. Percobaan mencatat pemenang / menerbitkan tiket baru saat terkunci HARUS DITOLAK (Error 400)
    const resReject = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: serialRacer2,
        lane: 'A',
        heat_number: 4
      })
    });
    assert.strictEqual(resReject.status, 400, 'Penerbitan tiket baru setelah lock HARUS DITOLAK 400');
    const dataReject = await resReject.json();
    assert.strictEqual(dataReject.success, false);
    assert.match(dataReject.error, /dikunci/i, 'Pesan error harus menyatakan kualifikasi telah dikunci');

    console.log('✓ Kunci Kualifikasi dan proteksi penolakan tiket baru (400 Bad Request) terverifikasi 100%.');

    console.log('\n🎉 ALL 9 END-TO-END TOURNAMENT LIFECYCLE STEPS PASSED SUCCESSFULLY!\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    try {
      server.close();
      if (fs.existsSync(uniqueTestDb)) {
        fs.unlinkSync(uniqueTestDb);
      }
    } catch (e) {}
  }
}

runTests();
