import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';
import { timestampTag, createTimestampedBackup } from '../backup.js';
import { MIGRATIONS, runMigrations, DEFAULT_EVENT_ID } from '../migrations.js';

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

    // ----------------------------------------------------
    // Task 2: Real, Reentrant SqliteWrapper Transactions (D-10)
    // ----------------------------------------------------
    console.log('--- Task 2: Real, Reentrant SqliteWrapper Transactions ---');

    // 2.1 prepare().run() accurate changes count
    const updateRes0 = db.prepare("UPDATE users SET name = 'Ghost' WHERE id = 'non-existent-id'").run();
    assert.strictEqual(updateRes0.changes, 0, '0-match UPDATE must return changes: 0');

    const updateRes1 = db.prepare("UPDATE users SET name = 'Andi Modified' WHERE email = 'andi@gmail.com'").run();
    assert.strictEqual(updateRes1.changes, 1, '1-match UPDATE must return changes: 1');

    const andiMod = db.prepare("SELECT name FROM users WHERE email = 'andi@gmail.com'").get();
    assert.strictEqual(andiMod.name, 'Andi Modified');
    console.log('✓ [6/9] prepare().run() returns accurate modified row counts');

    // 2.2 Transaction rollback on exception
    const countBeforeRollback = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
    assert.throws(
      () => {
        db.transaction(() => {
          db.prepare("INSERT INTO users (id, name, email, role) VALUES ('test-fail-1', 'Fail User', 'fail@test.com', 'participant')").run();
          throw new Error('Simulated transaction failure');
        })();
      },
      /Simulated transaction failure/,
      'Transaction must rethrow the original error'
    );

    const countAfterRollback = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
    assert.strictEqual(countAfterRollback, countBeforeRollback, 'Rolled back transaction must not persist inserted rows');
    const failUser = db.prepare("SELECT * FROM users WHERE id = 'test-fail-1'").get();
    assert.strictEqual(failUser, null, 'Uncommitted row must not exist in database');
    console.log('✓ [7/9] db.transaction() rolls back all statements when callback throws');

    // 2.3 Nested reentrant transactions
    const nestedRes = db.transaction(() => {
      return db.transaction(() => {
        return db.transaction(() => {
          db.prepare("INSERT INTO users (id, name, email, role) VALUES ('nested-user-1', 'Nested', 'nested@test.com', 'participant')").run();
          return 42;
        })();
      })();
    })();
    assert.strictEqual(nestedRes, 42, 'Nested transactions must return inner result without error');

    const nestedUser = db.prepare("SELECT * FROM users WHERE id = 'nested-user-1'").get();
    assert.ok(nestedUser, 'Nested committed transaction data must persist');
    console.log('✓ [8/9] Nested reentrant db.transaction() executes without throwing and commits at outermost exit');

    // 2.4 Nested transaction rollback at outer level
    assert.throws(
      () => {
        db.transaction(() => {
          db.prepare("INSERT INTO users (id, name, email, role) VALUES ('nested-user-outer', 'Outer', 'outer@test.com', 'participant')").run();
          db.transaction(() => {
            db.prepare("INSERT INTO users (id, name, email, role) VALUES ('nested-user-inner', 'Inner', 'inner@test.com', 'participant')").run();
          })();
          throw new Error('Outer rollback after inner success');
        })();
      },
      /Outer rollback after inner success/
    );

    assert.strictEqual(db.prepare("SELECT * FROM users WHERE id = 'nested-user-outer'").get(), null);
    assert.strictEqual(db.prepare("SELECT * FROM users WHERE id = 'nested-user-inner'").get(), null);
    console.log('✓ [9/9] Nested transaction rolls back entirely if outermost fails\n');

    // ----------------------------------------------------
    // Task 3: Versioned Migration Runner, Event Schema, Backfill (D-01..D-11)
    // ----------------------------------------------------
    console.log('--- Task 3: Versioned Migration Runner, Event Schema & Backfill ---');

    // 3.1 PRAGMA table_info assertions
    const getCols = (t) => (db.rawDb.exec(`PRAGMA table_info(${t})`)[0]?.values || []).map(r => r[1]);
    const userCols = getCols('users');
    assert.ok(userCols.includes('event_id'), 'users must have event_id');
    assert.ok(userCols.includes('participant_number'), 'users must have participant_number');
    assert.ok(userCols.includes('side_event_gta'), 'users must have side_event_gta');

    const bracketCols = getCols('bracket_matches');
    assert.ok(bracketCols.includes('event_id'), 'bracket_matches must have event_id');
    assert.ok(bracketCols.includes('is_final'), 'bracket_matches must have is_final');
    assert.ok(bracketCols.includes('ticket_id_1'), 'bracket_matches must have ticket_id_1');
    assert.ok(bracketCols.includes('ticket_id_2'), 'bracket_matches must have ticket_id_2');
    assert.ok(bracketCols.includes('ticket_id_3'), 'bracket_matches must have ticket_id_3');
    assert.ok(bracketCols.includes('is_auto_advanced'), 'bracket_matches must have is_auto_advanced');

    const marshalCols = getCols('marshal_winner_logs');
    assert.ok(marshalCols.includes('ticket_id'), 'marshal_winner_logs must have ticket_id');
    console.log('✓ [10/16] Schema columns present on users, bracket_matches, and marshal_winner_logs');

    // 3.2 Index existence in sqlite_master
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map(r => r.name);
    assert.ok(indexes.includes('idx_users_event_participant_number'), 'idx_users_event_participant_number must exist');
    assert.ok(indexes.includes('idx_events_single_active'), 'idx_events_single_active must exist');
    assert.ok(indexes.includes('idx_bto_event_time'), 'idx_bto_event_time must exist');
    assert.ok(indexes.includes('idx_bracket_matches_event'), 'idx_bracket_matches_event must exist');
    console.log('✓ [11/16] Required indexes exist in sqlite_master');

    // 3.3 Single active event constraint & multiple archived events
    assert.throws(
      () => {
        db.prepare("INSERT INTO events (id, nama, status) VALUES ('event-active-2', 'Event 2', 'active')").run();
      },
      /UNIQUE constraint failed/,
      'Inserting second active event must violate idx_events_single_active partial unique index'
    );

    // Inserting multiple archived events must succeed
    db.prepare("INSERT INTO events (id, nama, status) VALUES ('event-archived-1', 'Event Past 1', 'archived')").run();
    db.prepare("INSERT INTO events (id, nama, status) VALUES ('event-archived-2', 'Event Past 2', 'archived')").run();
    const archivedCount = db.prepare("SELECT COUNT(*) as count FROM events WHERE status = 'archived'").get().count;
    assert.strictEqual(archivedCount, 2, 'Multiple archived events must be permitted');
    console.log('✓ [12/16] Single active event partial unique index and multi-archived events verified');

    // 3.4 schema_version row verification & idempotency
    const maxVer = db.prepare('SELECT MAX(version) as max_v, COUNT(*) as cnt FROM schema_version').get();
    assert.strictEqual(maxVer.max_v, 1, 'Max version in schema_version must be 1');
    assert.strictEqual(maxVer.cnt, 1, 'schema_version must have exactly 1 row');

    const rerunRes = runMigrations(db);
    assert.strictEqual(rerunRes.applied, 0, 'Re-running migrations on up-to-date schema returns applied: 0');
    assert.strictEqual(db.prepare('SELECT COUNT(*) as cnt FROM schema_version').get().cnt, 1, 'schema_version count remains 1');

    // Delete schema_version and re-run (should re-apply version 1)
    db.exec('DELETE FROM schema_version;');
    const reapplyRes = runMigrations(db);
    assert.strictEqual(reapplyRes.applied, 1, 'Re-running migrations after deleting schema_version returns applied: 1');
    console.log('✓ [13/16] Versioned migration runner idempotency and schema_version tracking verified');

    // 3.5 Backfill assertions (participants and bracket_matches)
    const activeEventRow = db.prepare("SELECT id FROM events WHERE status = 'active'").get();
    assert.ok(activeEventRow, 'Active event must exist');
    const participants = db.prepare("SELECT id, name, event_id, participant_number FROM users WHERE role = 'participant'").all();
    assert.ok(participants.length > 0, 'Participants should be seeded');
    for (const p of participants) {
      assert.strictEqual(p.event_id, activeEventRow.id, `Participant ${p.name} must have active event_id`);
      assert.ok(p.participant_number > 0, `Participant ${p.name} must have positive participant_number`);
    }

    const invalidParticipants = db.prepare('SELECT COUNT(*) as count FROM users WHERE participant_number IS NOT NULL AND event_id IS NULL').get().count;
    assert.strictEqual(invalidParticipants, 0, 'No user with participant_number and NULL event_id permitted');

    const bracketMatches = db.prepare('SELECT id, event_id FROM bracket_matches').all();
    assert.ok(bracketMatches.length > 0, 'Seeded bracket matches must exist');
    for (const bm of bracketMatches) {
      assert.strictEqual(bm.event_id, activeEventRow.id, `Bracket match ${bm.id} must be scoped to active event_id`);
    }
    console.log('✓ [14/16] Participant numbering and bracket match event_id backfill verified');

    // 3.6 Backup written before pending migrations run on existing DB
    // Save DB to disk, delete schema_version, and re-run runMigrations -> backup should be produced
    db.save();
    db.exec('DELETE FROM schema_version;');
    runMigrations(db);
    const backupsDir = path.join(path.dirname(uniqueTestDb), 'backups');
    const backupsAfter = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir).filter(f => f.startsWith('tamiya-')) : [];
    assert.ok(backupsAfter.length > 0, 'A backup file matching tamiya-*.sqlite must exist');
    console.log('✓ [15/16] Timestamped backup created before pending migrations run on existing DB file');

    // 3.7 Destructive migration gate with injected probe
    const probe = {
      version: 999,
      name: 'destructive_probe',
      destructive: true,
      up(targetDb) {
        targetDb.exec('CREATE TABLE destructive_probe_sentinel (x INTEGER);');
      }
    };

    MIGRATIONS.push(probe);
    try {
      // With ALLOW_DESTRUCTIVE_MIGRATION unset/false:
      delete process.env.ALLOW_DESTRUCTIVE_MIGRATION;
      const skipRes = runMigrations(db);
      assert.strictEqual(skipRes.applied, 0, 'Destructive probe must be skipped when flag is unset');
      const sentinelTableUnset = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='destructive_probe_sentinel'").get();
      assert.strictEqual(sentinelTableUnset, null, 'Sentinel table must NOT exist when destructive migration is skipped');

      // With ALLOW_DESTRUCTIVE_MIGRATION = 'true':
      process.env.ALLOW_DESTRUCTIVE_MIGRATION = 'true';
      const allowRes = runMigrations(db);
      assert.strictEqual(allowRes.applied, 1, 'Destructive probe must be applied when flag is true');
      const sentinelTableSet = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='destructive_probe_sentinel'").get();
      assert.ok(sentinelTableSet, 'Sentinel table MUST exist after destructive migration is applied');
    } finally {
      MIGRATIONS.pop();
      delete process.env.ALLOW_DESTRUCTIVE_MIGRATION;
      try { db.exec('DROP TABLE IF EXISTS destructive_probe_sentinel;'); } catch (_) {}
      try { db.prepare('DELETE FROM schema_version WHERE version = 999;').run(); } catch (_) {}
    }
    console.log('✓ [16/16] Destructive migration gate (ALLOW_DESTRUCTIVE_MIGRATION) verified via injected probe\n');

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
