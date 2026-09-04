import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_marshal_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.PORT = '0'; // ephemeral port

const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');
const { RaceManager } = await import('../raceManager.js');

async function runTests() {
  console.log('🧪 RUNNING COMPREHENSIVE MARSHAL DASHBOARD FLOW TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`📡 Test server running on ${baseUrl}`);

    // =========================================================================
    // TASK 1: Skema Database marshal_winner_logs
    // =========================================================================
    console.log('\n--- Task 1: Schema & Constraints marshal_winner_logs ---');
    const tableInfo = db.prepare("PRAGMA table_info(marshal_winner_logs)").all();
    assert.ok(tableInfo.length > 0, 'Tabel marshal_winner_logs harus dibuat di SQLite');

    const columnNames = tableInfo.map(c => c.name);
    const expectedCols = [
      'id', 'package_id', 'serial_number', 'user_id', 'lane',
      'heat_number', 'box_number', 'status', 'created_at'
    ];
    for (const col of expectedCols) {
      assert.ok(columnNames.includes(col), `Kolom ${col} harus ada di marshal_winner_logs`);
    }

    // Direct insert test for status enum and lane constraint
    const andi = db.prepare("SELECT * FROM users WHERE email = 'andi@gmail.com'").get();
    assert.ok(andi, 'User Andi harus ada dari initial seed');

    // Register a test coupon package for Andi
    const testPkgId = uuidv4();
    db.prepare(`
      INSERT INTO coupon_packages (
        id, serial_number, user_id, total_quota, used_quota,
        remaining_quota, price_paid, payment_method, status
      ) VALUES (?, 'MRSH-TEST-01', ?, 50, 0, 50, 100000, 'cash', 'active')
    `).run(testPkgId, andi.id);

    // Test default status is 'active'
    const testLogId = uuidv4();
    db.prepare(`
      INSERT INTO marshal_winner_logs (
        id, package_id, serial_number, user_id, lane, box_number
      ) VALUES (?, ?, 'MRSH-TEST-01', ?, 'A', 1)
    `).run(testLogId, testPkgId, andi.id);

    const insertedLog = db.prepare('SELECT * FROM marshal_winner_logs WHERE id = ?').get(testLogId);
    assert.strictEqual(insertedLog.status, 'active', 'Default status log harus active');
    assert.strictEqual(insertedLog.lane, 'A', 'Lane harus bernilai A');

    // Reject invalid lane
    assert.throws(() => {
      db.prepare(`
        INSERT INTO marshal_winner_logs (
          id, package_id, serial_number, user_id, lane, box_number
        ) VALUES (?, ?, 'MRSH-TEST-01', ?, 'Z', 2)
      `).run(uuidv4(), testPkgId, andi.id);
    }, /CHECK|constraint/i, 'Lane selain A, B, C harus melempar constraint violation');

    console.log('✓ Task 1: Skema, index, dan constraint marshal_winner_logs terverifikasi.');

    // =========================================================================
    // TASK 2: REST API Record Winner, Atomic Debit, dan 60s Undo
    // =========================================================================
    console.log('\n--- Task 2: REST API Record Winner & 60s Undo ---');

    // 1. Unregistered coupon serial -> 404 KUPON BELUM TERDAFTAR DI KASIR
    const resUnregistered = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'UNKNOWN-999',
        lane: 'B'
      })
    });
    assert.strictEqual(resUnregistered.status, 404, 'Kupon tidak terdaftar harus return 404');
    const dataUnreg = await resUnregistered.json();
    assert.strictEqual(dataUnreg.success, false);
    assert.strictEqual(dataUnreg.code, 'COUPON_NOT_FOUND');
    assert.strictEqual(dataUnreg.error, 'KUPON BELUM TERDAFTAR DI KASIR');
    console.log('✓ 404 KUPON BELUM TERDAFTAR DI KASIR terverifikasi.');

    // 2. Invalid lane -> 400
    const resInvalidLane = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'MRSH-TEST-01',
        lane: 'X'
      })
    });
    assert.strictEqual(resInvalidLane.status, 400, 'Jalur tidak valid harus 400');

    // 3. Valid record-winner
    const andiCouponBefore = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
    const pkgBefore = db.prepare('SELECT * FROM coupon_packages WHERE id = ?').get(testPkgId);

    const resRecord1 = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'MRSH-TEST-01',
        lane: 'B',
        heat_number: 1
      })
    });
    assert.strictEqual(resRecord1.status, 200, 'Record winner valid harus 200');
    const dataRecord1 = await resRecord1.json();
    assert.strictEqual(dataRecord1.success, true);
    assert.strictEqual(dataRecord1.data.serial_number, 'MRSH-TEST-01');
    assert.strictEqual(dataRecord1.data.user_name, andi.name);
    assert.strictEqual(dataRecord1.data.lane, 'B');
    assert.strictEqual(dataRecord1.data.box_number, 1, 'Box number pertama yang dicoret adalah 1');
    assert.strictEqual(dataRecord1.data.remaining_quota, 49, 'Sisa kuota berkurang 1');

    // Verify DB state
    const pkgAfter1 = db.prepare('SELECT * FROM coupon_packages WHERE id = ?').get(testPkgId);
    assert.strictEqual(pkgAfter1.used_quota, 1);
    assert.strictEqual(pkgAfter1.remaining_quota, 49);

    const andiCouponAfter = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
    assert.strictEqual(andiCouponAfter, andiCouponBefore - 1, 'Saldo kupon user harus berkurang 1');

    // Verify auto-seeding to Round 2 bracket
    const bracketSeeded = db.prepare(`
      SELECT * FROM bracket_matches 
      WHERE round_number = 2 AND (user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ?)
    `).get(andi.id, andi.id, andi.id);
    assert.ok(bracketSeeded, 'Pemenang heat harus di-auto-seed ke bracket Babak 2');
    console.log(`✓ Record winner berhasil: box #${dataRecord1.data.box_number} dicoret, kuota sisa ${dataRecord1.data.remaining_quota}, auto-seeded ke Babak 2.`);

    // 4. Undo within 60 seconds
    const recordLogId = dataRecord1.data.log_id;
    const resUndo1 = await fetch(`${baseUrl}/api/marshal/undo-last-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: recordLogId })
    });
    assert.strictEqual(resUndo1.status, 200, 'Undo dalam 60s harus return 200');
    const dataUndo1 = await resUndo1.json();
    assert.strictEqual(dataUndo1.success, true);
    assert.strictEqual(dataUndo1.data.remaining_quota, 50, 'Kuota kupon kembali menjadi 50');

    // Verify DB after undo
    const pkgAfterUndo = db.prepare('SELECT * FROM coupon_packages WHERE id = ?').get(testPkgId);
    assert.strictEqual(pkgAfterUndo.used_quota, 0);
    assert.strictEqual(pkgAfterUndo.remaining_quota, 50);

    const andiCouponAfterUndo = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
    assert.strictEqual(andiCouponAfterUndo, andiCouponBefore, 'Saldo kupon user harus kembali penuh');

    const logUndone = db.prepare('SELECT status FROM marshal_winner_logs WHERE id = ?').get(recordLogId);
    assert.strictEqual(logUndone.status, 'undone', 'Status log harus diubah menjadi undone');
    console.log('✓ Undo 60s berhasil mengembalikan kuota dan menandai log undone.');

    // 5. Expired Undo (> 60s)
    // Record winner again
    const resRecord2 = await fetch(`${baseUrl}/api/marshal/record-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'MRSH-TEST-01',
        lane: 'C'
      })
    });
    assert.strictEqual(resRecord2.status, 200);
    const dataRecord2 = await resRecord2.json();
    const logId2 = dataRecord2.data.log_id;

    // Fast-forward created_at to 120 seconds ago
    const pastTime = new Date(Date.now() - 120000).toISOString();
    db.prepare("UPDATE marshal_winner_logs SET created_at = ? WHERE id = ?").run(pastTime, logId2);

    const resUndoExpired = await fetch(`${baseUrl}/api/marshal/undo-last-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId2 })
    });
    assert.strictEqual(resUndoExpired.status, 400, 'Undo > 60s harus ditolak dengan 400');
    const dataExpired = await resUndoExpired.json();
    assert.strictEqual(dataExpired.success, false);
    assert.match(dataExpired.error, /Kedaluwarsa/i);
    console.log('✓ Penolakan undo kedaluwarsa (>60s) terverifikasi.');

    // 6. Recent winners endpoint
    const resRecent = await fetch(`${baseUrl}/api/marshal/recent-winners`);
    assert.strictEqual(resRecent.status, 200);
    const dataRecent = await resRecent.json();
    assert.strictEqual(dataRecent.success, true);
    assert.ok(Array.isArray(dataRecent.data));
    assert.ok(dataRecent.data.length > 0, 'Recent winners harus mengembalikan array log');
    console.log(`✓ Recent winners endpoint mengembalikan ${dataRecent.data.length} catatan.`);

    // =========================================================================
    // TASK 3: REST API Eksekusi Babak 2 (Bracket Active Match & 1-Tap Winner Selection)
    // =========================================================================
    console.log('\n--- Task 3: Round 2 Active Match & 1-Tap Bracket Winner ---');

    // Create a known Round 2 match with 3 contestants for testing
    const budi = db.prepare("SELECT * FROM users WHERE email = 'budi@gmail.com'").get();
    const chandra = db.prepare("SELECT * FROM users WHERE email = 'chandra@gmail.com'").get();
    const doni = db.prepare("SELECT * FROM users WHERE email = 'doni@gmail.com'").get();

    const matchIdTest = uuidv4();
    db.prepare(`
      INSERT INTO bracket_matches (
        id, match_number, round_number, user_id_1, user_id_2, user_id_3, status
      ) VALUES (?, 901, 2, ?, ?, ?, 'pending')
    `).run(matchIdTest, budi.id, chandra.id, doni.id);

    // 1. GET /api/marshal/active-bracket-match
    const resActiveMatch = await fetch(`${baseUrl}/api/marshal/active-bracket-match`);
    assert.strictEqual(resActiveMatch.status, 200);
    const dataActiveMatch = await resActiveMatch.json();
    assert.strictEqual(dataActiveMatch.success, true);
    assert.ok(dataActiveMatch.data.match, 'Harus ada active bracket match');
    console.log(`✓ Active bracket match ditemukan: Match #${dataActiveMatch.data.match.match_number}`);

    // 2. 1-Tap Winner Selection on Round 2 match
    const resRecordBracketWinner = await fetch(`${baseUrl}/api/marshal/record-bracket-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchIdTest,
        winner_id: budi.id
      })
    });
    assert.strictEqual(resRecordBracketWinner.status, 200, 'Record bracket winner harus 200');
    const dataBracketWinner = await resRecordBracketWinner.json();
    assert.strictEqual(dataBracketWinner.success, true);

    const updatedMatch = db.prepare('SELECT * FROM bracket_matches WHERE id = ?').get(matchIdTest);
    assert.strictEqual(updatedMatch.winner_id, budi.id);
    assert.strictEqual(updatedMatch.status, 'completed');
    console.log('✓ 1-Tap winner selection berhasil memajukan pemenang match bracket Babak 2.');

    console.log('\n🎉 ALL MARSHAL DASHBOARD BACKEND TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    if (fs.existsSync(uniqueTestDb)) {
      try {
        fs.unlinkSync(uniqueTestDb);
      } catch (e) {
        // ignore file lock on windows
      }
    }
  }
}

runTests();
