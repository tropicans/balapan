import { initDatabase } from '../db.js';
import db from '../db.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_cp_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;

async function runTests() {
  console.log('🧪 RUNNING COUPON PACKAGE TEST SUITE...\n');

  try {
    // 1. Inisialisasi Database
    await initDatabase();
    console.log('✓ [1/3] Database initialized and tables verified');

    // Pastikan tabel coupon_packages ada
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

    // Ambil seeded user
    const user = db.prepare("SELECT * FROM users WHERE email = 'andi@gmail.com'").get();
    assert.ok(user, 'User andi@gmail.com harus ada');

    // 2. Insert valid package
    const pkg1Id = uuidv4();
    db.prepare(`
      INSERT INTO coupon_packages (id, serial_number, user_id, total_quota, used_quota, remaining_quota, price_paid, payment_method, status)
      VALUES (?, ?, ?, 50, 0, 50, 100000, 'cash', 'active')
    `).run(pkg1Id, 'SN-001', user.id);

    const inserted1 = db.prepare("SELECT * FROM coupon_packages WHERE id = ?").get(pkg1Id);
    assert.strictEqual(inserted1.serial_number, 'SN-001');
    assert.strictEqual(inserted1.remaining_quota, 50);
    assert.strictEqual(inserted1.status, 'active');
    console.log('✓ [2/3] Valid coupon package inserted successfully');

    // 3. Insert duplicate serial number - harus throw UNIQUE constraint error
    let duplicateThrown = false;
    try {
      db.prepare(`
        INSERT INTO coupon_packages (id, serial_number, user_id, total_quota, used_quota, remaining_quota, price_paid, payment_method, status)
        VALUES (?, ?, ?, 50, 0, 50, 100000, 'cash', 'active')
      `).run(uuidv4(), 'SN-001', user.id);
    } catch (err) {
      duplicateThrown = true;
      assert.ok(
        /unique/i.test(err.message) || /constraint/i.test(err.message),
        `Error harus menunjukkan pelanggaran constraint UNIQUE, got: ${err.message}`
      );
    }
    assert.strictEqual(duplicateThrown, true, 'Insert duplicate serial number harus melempar error');

    // 4. Multiple packages untuk user yang sama dengan serial berbeda
    const pkg2Id = uuidv4();
    db.prepare(`
      INSERT INTO coupon_packages (id, serial_number, user_id, total_quota, used_quota, remaining_quota, price_paid, payment_method, status)
      VALUES (?, ?, ?, 50, 0, 50, 100000, 'qris', 'active')
    `).run(pkg2Id, 'SN-002', user.id);

    const userPackages = db.prepare("SELECT * FROM coupon_packages WHERE user_id = ?").all(user.id);
    assert.strictEqual(userPackages.length, 2, 'User harus memiliki 2 paket kupon terdaftar');
    console.log('✓ [3/3] Duplicate serial rejected by UNIQUE constraint & multiple packages allowed per user');

    console.log('\n🎉 ALL TASK 1 TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    if (fs.existsSync(uniqueTestDb)) {
      try {
        fs.unlinkSync(uniqueTestDb);
      } catch (e) {
        // ignore cleanup error
      }
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
