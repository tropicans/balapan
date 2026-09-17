import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';
import { timestampTag, createTimestampedBackup } from '../backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uniqueTestDb = path.join(__dirname, `../../data/test_migration_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'true';

import db, { initDatabase } from '../db.js';

async function runTests() {
  console.log('🧪 RUNNING MIGRATION FOUNDATION TEST SUITE (PHASE 11)...\n');

  try {
    // ----------------------------------------------------
    // Task 1: Normalization & Backup Utilities
    // ----------------------------------------------------
    console.log('--- Task 1: Normalization & Backup Utilities ---');

    // 1.1 normalizeParticipantNumber
    assert.strictEqual(normalizeParticipantNumber('007'), 7, '007 should normalize to 7');
    assert.strictEqual(normalizeParticipantNumber(' 7 '), 7, ' 7  should normalize to 7');
    assert.strictEqual(normalizeParticipantNumber('7'), 7, '7 should normalize to 7');
    assert.strictEqual(normalizeParticipantNumber(7), 7, 'numeric 7 should normalize to 7');

    assert.strictEqual(normalizeParticipantNumber('abc'), null, 'abc should return null');
    assert.strictEqual(normalizeParticipantNumber(''), null, 'empty string should return null');
    assert.strictEqual(normalizeParticipantNumber('   '), null, 'spaces only should return null');
    assert.strictEqual(normalizeParticipantNumber('0'), null, '0 should return null');
    assert.strictEqual(normalizeParticipantNumber('000'), null, '000 should return null');
    assert.strictEqual(normalizeParticipantNumber('-1'), null, '-1 should return null');
    assert.strictEqual(normalizeParticipantNumber('1.5'), null, '1.5 should return null');
    assert.strictEqual(normalizeParticipantNumber(null), null, 'null should return null');
    assert.strictEqual(normalizeParticipantNumber(undefined), null, 'undefined should return null');
    console.log('✓ [1/5] normalizeParticipantNumber handles padding, trimming, positive ints and rejections');

    // 1.2 timestampTag
    const tag = timestampTag();
    assert.match(tag, /^\d{8}-\d{6}$/, 'timestampTag format must match YYYYMMDD-HHmmss');
    console.log('✓ [2/5] timestampTag produces correct format (' + tag + ')');

    // 1.3 createTimestampedBackup on non-existent path
    const nonExistent = path.join(__dirname, '../../data/non_existent.sqlite');
    assert.strictEqual(createTimestampedBackup(nonExistent), null, 'Non-existent DB path must return null');
    assert.strictEqual(createTimestampedBackup(''), null, 'Falsy DB path must return null');
    console.log('✓ [3/5] createTimestampedBackup returns null on missing DB path');

    // 1.4 createTimestampedBackup with real file
    await initDatabase();
    assert.ok(fs.existsSync(uniqueTestDb), 'Database file must exist after initDatabase()');

    const backupPath = createTimestampedBackup(uniqueTestDb);
    assert.ok(backupPath && fs.existsSync(backupPath), 'Backup file must exist on disk');
    assert.match(backupPath, /backups[\\/]tamiya-\d{8}-\d{6}\.sqlite$/, 'Backup path matches pattern');

    const srcBuf = fs.readFileSync(uniqueTestDb);
    const bakBuf = fs.readFileSync(backupPath);
    assert.strictEqual(srcBuf.length, bakBuf.length, 'Backup bytes length matches source');
    assert.deepStrictEqual(srcBuf, bakBuf, 'Backup bytes content matches source');
    console.log('✓ [4/5] createTimestampedBackup creates exact copy in backups/ directory');

    // Cleanup backup file
    try { fs.unlinkSync(backupPath); } catch (_) {}

    console.log('✓ [5/5] Wave 0 Task 1 utilities passed verification\n');

  } finally {
    // Teardown
    if (fs.existsSync(uniqueTestDb)) {
      try { fs.unlinkSync(uniqueTestDb); } catch (_) {}
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
