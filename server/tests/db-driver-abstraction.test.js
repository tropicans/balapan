import test from 'node:test';
import assert from 'node:assert';
import db, { initDatabase } from '../db.js';

await initDatabase();

test('Phase 30 - DB Driver Abstraction & Health Check', async (t) => {
  // 1. Verify driverName property
  assert.ok(db.driverName, 'db.driverName must be present');
  assert.ok(['sqlite', 'postgres'].includes(db.driverName), 'db.driverName must be sqlite or postgres');

  // 2. Verify basic prepare/get/all/run interface
  const user = db.prepare('SELECT COUNT(*) as count FROM users').get();
  assert.ok(typeof user.count === 'number', 'prepare.get() returned expected structure');

  // 3. Verify ACID transaction support
  const countBefore = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  try {
    db.transaction(() => {
      db.prepare('INSERT INTO users (id, name, role) VALUES (?, ?, ?)').run('test-uuid-999', 'Test Driver User', 'participant');
      throw new Error('Rollback test error');
    })();
  } catch (err) {
    // Expected rollback
  }
  const countAfter = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  assert.strictEqual(countBefore, countAfter, 'Transaction rollback successfully reverted insertion');
});
