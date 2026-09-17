import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_cp_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'true';
process.env.PORT = '0'; // use ephemeral port for test server

// Import db and server after setting env
const { initDatabase, default: db } = await import('../db.js');
const { app, server } = await import('../index.js');

async function runTests() {
  console.log('🧪 RUNNING COMPREHENSIVE COUPON PACKAGE TEST SUITE...\n');

  try {
    if (!server.listening) {
      await new Promise(resolve => server.once('listening', resolve));
    }
    const address = server.address();
    const port = address.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`📡 Test server running on ${baseUrl}`);

    // ==========================================
    // TASK 1: Schema, Unique Constraint, Index
    // ==========================================
    console.log('\n--- Task 1: Schema & Constraints ---');
    const tableInfo = db.prepare("PRAGMA table_info(coupon_packages)").all();
    assert.ok(tableInfo.length > 0, 'Tabel coupon_packages harus ada');
    
    const columnNames = tableInfo.map(c => c.name);
    const expectedColumns = [
      'id', 'serial_number', 'user_id', 'total_quota', 'used_quota',
      'remaining_quota', 'price_paid', 'payment_method', 'status',
      'void_from_id', 'created_at', 'updated_at'
    ];
    for (const col of expectedColumns) {
      assert.ok(columnNames.includes(col), `Kolom ${col} harus ada di coupon_packages`);
    }

    const andi = db.prepare("SELECT * FROM users WHERE email = 'andi@gmail.com'").get();
    assert.ok(andi, 'User andi@gmail.com harus ada');

    // Direct SQLite test: unique serial rejection
    const directPkgId = uuidv4();
    db.prepare(`
      INSERT INTO coupon_packages (id, serial_number, user_id, total_quota, used_quota, remaining_quota, price_paid, payment_method, status)
      VALUES (?, 'RAW-001', ?, 50, 0, 50, 100000, 'cash', 'active')
    `).run(directPkgId, andi.id);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO coupon_packages (id, serial_number, user_id, total_quota, used_quota, remaining_quota, price_paid, payment_method, status)
        VALUES (?, 'RAW-001', ?, 50, 0, 50, 100000, 'cash', 'active')
      `).run(uuidv4(), andi.id);
    }, /UNIQUE|constraint/i, 'Direct insert dengan serial duplikat harus melempar UNIQUE constraint error');

    console.log('✓ Task 1: Schema, constraints, dan multiple packages per user verified.');

    // ==========================================
    // TASK 2: REST API Registration, Sync, Search
    // ==========================================
    console.log('\n--- Task 2: REST API Registration & Search ---');

    // 1. Next serial initial suggestion
    const resNext1 = await fetch(`${baseUrl}/api/coupon-packages/next-serial`);
    assert.strictEqual(resNext1.status, 200);
    const dataNext1 = await resNext1.json();
    assert.strictEqual(dataNext1.success, true);
    assert.ok(dataNext1.data.next_serial, 'Next serial harus memiliki nilai');
    console.log(`✓ Initial next serial: ${dataNext1.data.next_serial}`);

    // 2. Register new package for existing user (Andi)
    const andiBalanceBefore = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;

    const resReg1 = await fetch(`${baseUrl}/api/coupon-packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'CPN-0100',
        user_id: andi.id,
        total_quota: 50,
        price_paid: 100000,
        payment_method: 'cash'
      })
    });
    if (resReg1.status !== 201) {
      console.error('Registration failed:', await resReg1.text());
    }
    assert.strictEqual(resReg1.status, 201, 'Registrasi paket harus 201 Created');
    const dataReg1 = await resReg1.json();
    assert.strictEqual(dataReg1.success, true);
    assert.strictEqual(dataReg1.data.package.serial_number, 'CPN-0100');
    assert.strictEqual(dataReg1.data.package.remaining_quota, 50);
    assert.strictEqual(dataReg1.data.package.user_name, 'Andi Pratama');

    // Cek saldo kupon Andi bertambah 50
    const andiBalanceAfter = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
    assert.strictEqual(andiBalanceAfter, andiBalanceBefore + 50, 'Saldo kupon Andi harus bertambah 50');
    console.log(`✓ Register package for existing user: Balance increased from ${andiBalanceBefore} to ${andiBalanceAfter}`);

    // 3. Register package with Dual Mode: New user on-the-fly
    const resRegNewUser = await fetch(`${baseUrl}/api/coupon-packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'CPN-0101',
        new_user_name: 'Siti Rahma',
        team_name: 'SRT',
        total_quota: 50,
        price_paid: 100000,
        payment_method: 'qris'
      })
    });
    assert.strictEqual(resRegNewUser.status, 201);
    const dataRegNewUser = await resRegNewUser.json();
    assert.strictEqual(dataRegNewUser.success, true);
    assert.strictEqual(dataRegNewUser.data.package.user_name, 'Siti Rahma');
    assert.strictEqual(dataRegNewUser.data.package.team_name, 'SRT');

    const createdUser = db.prepare("SELECT * FROM users WHERE name = 'Siti Rahma'").get();
    assert.ok(createdUser, 'User Siti Rahma harus otomatis dibuat');
    const createdCoupon = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(createdUser.id);
    assert.strictEqual(createdCoupon.balance, 50, 'User baru harus langsung memiliki balance 50 kupon');
    console.log('✓ Register package with on-the-fly user creation and coupon balance init');

    // 4. Duplicate serial number returns 409 Conflict with owner details
    const resDup = await fetch(`${baseUrl}/api/coupon-packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial_number: 'cpn-0100', // lowercase input should be normalized and conflict
        new_user_name: 'Impostor Racer',
        total_quota: 50
      })
    });
    assert.strictEqual(resDup.status, 409, 'Duplicate serial harus mengembalikan 409 Conflict');
    const dataDup = await resDup.json();
    assert.strictEqual(dataDup.success, false);
    assert.strictEqual(dataDup.error, 'SERIAL_EXISTS');
    assert.strictEqual(dataDup.existing_package.serial_number, 'CPN-0100');
    assert.strictEqual(dataDup.existing_package.user_name, 'Andi Pratama');
    console.log(`✓ Duplicate serial blocked with 409 and owner details (${dataDup.existing_package.user_name})`);

    // 5. Next serial suggestion should now increment to CPN-0102
    const resNext2 = await fetch(`${baseUrl}/api/coupon-packages/next-serial`);
    const dataNext2 = await resNext2.json();
    assert.strictEqual(dataNext2.data.next_serial, 'CPN-0102', 'Next serial auto-increment harus CPN-0102');
    console.log(`✓ Next serial correctly auto-incremented to: ${dataNext2.data.next_serial}`);

    // 6. Search packages by serial, racer name, team name
    const resSearchSerial = await fetch(`${baseUrl}/api/coupon-packages?search=0100`);
    const dataSearchSerial = await resSearchSerial.json();
    assert.strictEqual(dataSearchSerial.data.length, 1);
    assert.strictEqual(dataSearchSerial.data[0].serial_number, 'CPN-0100');

    const resSearchRacer = await fetch(`${baseUrl}/api/coupon-packages?search=Siti`);
    const dataSearchRacer = await resSearchRacer.json();
    assert.strictEqual(dataSearchRacer.data.length, 1);
    assert.strictEqual(dataSearchRacer.data[0].user_name, 'Siti Rahma');

    const resSearchTeam = await fetch(`${baseUrl}/api/coupon-packages?search=SRT`);
    const dataSearchTeam = await resSearchTeam.json();
    assert.strictEqual(dataSearchTeam.data.length, 1);
    assert.strictEqual(dataSearchTeam.data[0].team_name, 'SRT');

    console.log('✓ Search endpoint supports serial number, user name, and team name queries');

    // ==========================================
    // TASK 3: Emergency Void & Transfer Quota
    // ==========================================
    console.log('\n--- Task 3: Emergency Void & Transfer Quota ---');

    // Package to void: dataReg1.data.package (CPN-0100, remaining_quota: 50, user: Andi)
    const pkgToVoid = dataReg1.data.package;
    const andiCouponBeforeVoid = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;

    // Simulate usage of 10 quota on CPN-0100
    db.prepare('UPDATE coupon_packages SET used_quota = 10, remaining_quota = 40 WHERE id = ?').run(pkgToVoid.id);

    // 1. Attempt void with existing serial -> 409
    const resVoidConflict = await fetch(`${baseUrl}/api/coupon-packages/${pkgToVoid.id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_serial_number: 'CPN-0101', // already used by Siti Rahma
        reason: 'Sobek'
      })
    });
    assert.strictEqual(resVoidConflict.status, 409, 'Void dengan serial baru yang sudah ada harus 409');
    console.log('✓ Void rejected when replacement serial already in use');

    // 2. Successful void & replace
    const resVoidSuccess = await fetch(`${baseUrl}/api/coupon-packages/${pkgToVoid.id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_serial_number: 'CPN-0999',
        reason: 'Kertas lembaran robek basah oli di pit'
      })
    });
    assert.strictEqual(resVoidSuccess.status, 200, 'Void berhasil harus 200 OK');
    const dataVoid = await resVoidSuccess.json();
    assert.strictEqual(dataVoid.success, true);
    assert.strictEqual(dataVoid.data.new_package.serial_number, 'CPN-0999');
    assert.strictEqual(dataVoid.data.new_package.total_quota, 40, 'Total kuota paket baru harus sama dengan sisa kuota paket lama');
    assert.strictEqual(dataVoid.data.new_package.remaining_quota, 40);
    assert.strictEqual(dataVoid.data.new_package.status, 'active');
    assert.strictEqual(dataVoid.data.new_package.void_from_id, pkgToVoid.id);

    // Verifikasi paket lama berstatus 'void'
    const oldPkgUpdated = db.prepare('SELECT * FROM coupon_packages WHERE id = ?').get(pkgToVoid.id);
    assert.strictEqual(oldPkgUpdated.status, 'void', 'Paket lama harus berstatus void');

    // Verifikasi saldo digital user di tabel coupons TIDAK BERUBAH (Invariansi Kuota D-08)
    const andiCouponAfterVoid = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
    assert.strictEqual(andiCouponAfterVoid, andiCouponBeforeVoid, 'Saldo digital kupon user harus tetap sama saat void & replace');
    console.log(`✓ Void & replace transferred 40 remaining quota to CPN-0999. User digital balance unchanged (${andiCouponAfterVoid})`);

    // 3. Attempting to void the already-voided package -> 400
    const resVoidAgain = await fetch(`${baseUrl}/api/coupon-packages/${pkgToVoid.id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_serial_number: 'CPN-1000'
      })
    });
    assert.strictEqual(resVoidAgain.status, 400, 'Paket yang sudah void tidak boleh di-void lagi');
    console.log('✓ Re-voiding a voided package rejected with 400');

    console.log('\n🎉 ALL PHASE 07 BACKEND TESTS PASSED 100% GREEN!\n');
  } finally {
    server.close();
    if (fs.existsSync(uniqueTestDb)) {
      try {
        fs.unlinkSync(uniqueTestDb);
      } catch (e) {
        // cleanup error ignored
      }
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
