import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeParticipantNumber } from '../utils/participantNumber.js';
import { timestampTag, createTimestampedBackup } from '../backup.js';
import { MIGRATIONS, runMigrations, DEFAULT_EVENT_ID } from '../migrations.js';
import { createEvent, listEvents, getActiveEvent, getActiveEventId, setActiveEvent, archiveEvent } from '../services/eventService.js';
import { RaceManager } from '../raceManager.js';

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
      assert.ok(allowRes.applied >= 1, 'Destructive migrations must be applied when flag is true');
      const sentinelTableSet = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='destructive_probe_sentinel'").get();
      assert.ok(sentinelTableSet, 'Sentinel table MUST exist after destructive migration is applied');
    } finally {
      MIGRATIONS.pop();
      delete process.env.ALLOW_DESTRUCTIVE_MIGRATION;
      try { db.exec('DROP TABLE IF EXISTS destructive_probe_sentinel;'); } catch (_) {}
      try { db.prepare('DELETE FROM schema_version WHERE version = 999;').run(); } catch (_) {}
    }
    console.log('✓ [16/16] Destructive migration gate (ALLOW_DESTRUCTIVE_MIGRATION) verified via injected probe\n');

    // ----------------------------------------------------
    // Plan 11-02: Event Domain Service & Scoped Bracket Reads
    // ----------------------------------------------------
    console.log('--- Plan 11-02: Event Domain Service & Scoped Reads ---');

    // 4.1 createEvent validations
    assert.throws(() => createEvent({ nama: '' }), /Nama event wajib diisi/);
    assert.throws(() => createEvent({ nama: '   ' }), /Nama event wajib diisi/);
    assert.throws(() => createEvent({ nama: 'a'.repeat(101) }), /Nama event maksimal 100 karakter/);
    assert.throws(() => createEvent({ nama: 'Valid', catatan: 'c'.repeat(501) }), /Catatan event maksimal 500 karakter/);
    assert.throws(() => createEvent({ nama: 'Valid', jumlah_lap: 0 }), /Jumlah lap harus bilangan bulat positif/);
    assert.throws(() => createEvent({ nama: 'Valid', jumlah_lap: -2 }), /Jumlah lap harus bilangan bulat positif/);
    assert.throws(() => createEvent({ nama: 'Valid', jumlah_lap: 1.5 }), /Jumlah lap harus bilangan bulat positif/);
    console.log('✓ [17/22] createEvent parameter validation (nama, catatan, jumlah_lap) verified');

    // 4.2 createEvent creation
    const eventA = createEvent({ nama: 'Turnamen A', tanggal: '2026-10-01', catatan: 'Testing turnamen A', jumlah_lap: 3 });
    assert.ok(eventA.id, 'Created event must have uuid id');
    assert.strictEqual(eventA.nama, 'Turnamen A');
    assert.strictEqual(eventA.tanggal, '2026-10-01');
    assert.strictEqual(eventA.status, 'archived', 'Since Event 1 is already active, Turnamen A starts archived');
    assert.strictEqual(eventA.jumlah_lap, 3);
    assert.strictEqual(eventA.catatan, 'Testing turnamen A');
    console.log('✓ [18/22] createEvent creates archived event when active event already exists');

    // 4.3 setActiveEvent (archive previous active and activate target in one transaction)
    const prevActive = getActiveEvent();
    assert.ok(prevActive, 'Previous active event must exist');
    const activatedA = setActiveEvent(eventA.id);
    assert.strictEqual(activatedA.id, eventA.id);
    assert.strictEqual(activatedA.status, 'active');

    // Check that previous active is now archived
    const checkPrev = db.prepare('SELECT status FROM events WHERE id = ?').get(prevActive.id);
    assert.strictEqual(checkPrev.status, 'archived');

    // Exactly one active event in DB
    const activeRows = db.prepare("SELECT COUNT(*) as count FROM events WHERE status = 'active'").get().count;
    assert.strictEqual(activeRows, 1, 'Exactly one event must be active');
    console.log('✓ [19/22] setActiveEvent switches active event and archives previous in one transaction');

    // 4.4 archiveEvent & error cases
    assert.throws(() => setActiveEvent('non-existent-event-id'), /Event tidak ditemukan/);
    assert.throws(() => archiveEvent('non-existent-event-id'), /Event tidak ditemukan/);

    const archivedA = archiveEvent(eventA.id);
    assert.strictEqual(archivedA.id, eventA.id);
    assert.strictEqual(archivedA.status, 'archived');
    assert.strictEqual(getActiveEvent(), null, 'No active event exists after archiving active');

    // Reactivate Event 1 so subsequent tests have an active event
    setActiveEvent(DEFAULT_EVENT_ID);
    assert.strictEqual(getActiveEventId(), DEFAULT_EVENT_ID);

    // 4.5 listEvents returns all events
    const allEvents = listEvents();
    assert.ok(allEvents.length >= 2, 'listEvents returns all events');
    console.log('✓ [20/22] archiveEvent, getActiveEventId, listEvents, and error handling verified');

    // 4.6 Scoped bracket reads in RaceManager.getFullState() (EVNT-04)
    // Insert a dummy bracket match on eventA (which is not active)
    db.prepare(`
      INSERT INTO bracket_matches (id, event_id, match_number, round_number, status)
      VALUES ('bm-eventA-match', ?, 99, 2, 'pending')
    `).run(eventA.id);

    const fullState = RaceManager.getFullState();
    assert.ok(fullState.activeEvent, 'fullState.activeEvent must be present additively');
    assert.strictEqual(fullState.activeEvent.id, DEFAULT_EVENT_ID);
    assert.ok(fullState.activeRace, 'fullState.activeRace must still be present');
    assert.ok(fullState.ticketStats, 'fullState.ticketStats must still be present');
    assert.ok(Array.isArray(fullState.bracketMatches), 'fullState.bracketMatches must be an array');

    const foreignMatch = fullState.bracketMatches.find(m => m.id === 'bm-eventA-match');
    assert.strictEqual(foreignMatch, undefined, 'bracketMatches must NOT contain matches from foreign events (scoped read)');

    for (const m of fullState.bracketMatches) {
      assert.strictEqual(m.event_id, DEFAULT_EVENT_ID, 'Every returned match must belong to active event');
    }
    console.log('✓ [21/22] RaceManager.getFullState() scopes bracketMatches to active event (EVNT-04)');
    console.log('✓ [22/22] Plan 11-02 event domain service and scoped reads verified\n');

    // ----------------------------------------------------
    // Plan 11-03 Task 2: v2.0 Boot-Safety Regression Test
    // ----------------------------------------------------
    console.log('--- Plan 11-03 Task 2: v2.0 Boot-Safety Regression Test ---');

    const bootTestDb = path.join(__dirname, `../../data/test_boot_safety_${Date.now()}.sqlite`);
    try {
      // 1. Initial boot on a fresh DB file via process.env.DB_PATH switch
      process.env.DB_PATH = bootTestDb;
      await initDatabase();
      assert.ok(fs.existsSync(bootTestDb), 'First boot creates the target DB file on disk');

      // 2. Re-open the same DB file with a second initDatabase() call (or runMigrations directly)
      // Assert it applies 0 migration steps and does not throw (idempotent re-open)
      const secondRunRes = runMigrations(db);
      assert.strictEqual(secondRunRes.applied, 0, 'Re-opening deployed v2.0 database applies 0 migration steps');

      // 3. Schema checks: schema_version has version 1, users has participant_number, legacy tables coupons and races survive
      const bootVer = db.prepare('SELECT MAX(version) as max_v FROM schema_version').get();
      assert.strictEqual(bootVer.max_v, 1, 'schema_version must be version 1');

      const userColsBoot = (db.rawDb.exec('PRAGMA table_info(users)')[0]?.values || []).map(r => r[1]);
      assert.ok(userColsBoot.includes('participant_number'), 'users table must have participant_number column');
      assert.ok(userColsBoot.includes('event_id'), 'users table must have event_id column');

      const masterTables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name);
      assert.ok(masterTables.includes('coupons'), 'Legacy coupons table must survive in sqlite_master (not dropped)');
      assert.ok(masterTables.includes('races'), 'Legacy races table must survive in sqlite_master (not dropped)');

      // 4. Invariant: numbered participant rows must not have NULL event_id
      const orphanNumberedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE participant_number IS NOT NULL AND event_id IS NULL').get().count;
      assert.strictEqual(orphanNumberedUsers, 0, 'No participant row with participant_number can have NULL event_id');

      // Every participant row must have non-NULL event_id and positive participant_number
      const bootParticipants = db.prepare("SELECT id, name, event_id, participant_number FROM users WHERE role = 'participant'").all();
      assert.ok(bootParticipants.length > 0, 'Participants exist from seed');
      for (const p of bootParticipants) {
        assert.ok(p.event_id !== null && p.event_id !== undefined, `Participant ${p.name} must have non-null event_id`);
        assert.ok(p.participant_number > 0, `Participant ${p.name} must have positive participant_number`);
      }

      // 5. RaceManager.getFullState() returns without throwing and contains activeRace and bracketMatches
      const bootFullState = RaceManager.getFullState();
      assert.ok(bootFullState, 'RaceManager.getFullState() returns state object without error');
      assert.ok(bootFullState.activeRace, 'bootFullState must contain activeRace');
      assert.ok(Array.isArray(bootFullState.bracketMatches), 'bootFullState must contain bracketMatches array');

      console.log('✓ [23/23] v2.0 boot-safety regression test against existing database file verified\n');
    } finally {
      if (fs.existsSync(bootTestDb)) {
        try { fs.unlinkSync(bootTestDb); } catch (_) {}
      }
    }

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

