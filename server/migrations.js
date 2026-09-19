import fs from 'fs';
import { createTimestampedBackup } from './backup.js';

export const DEFAULT_EVENT_ID = '00000000-0000-4000-8000-000000000001';

export const MIGRATIONS = [
  {
    version: 1,
    name: 'event_schema_and_participant_number',
    up(db) {
      // 1. Core tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          tanggal TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
          catatan TEXT,
          jumlah_lap INTEGER NOT NULL DEFAULT 3,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bto_records (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          participant_number INTEGER,
          finish_time REAL NOT NULL,
          recorded_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_single_active ON events(status) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_bto_event_time ON bto_records(event_id, finish_time ASC);
      `);

      // 2. PRAGMA table_info helper for idempotent column addition
      const cols = (tableName) => {
        try {
          const res = db.rawDb.exec(`PRAGMA table_info(${tableName});`);
          return (res[0]?.values || []).map(r => r[1]);
        } catch (_) {
          return [];
        }
      };

      // Table: users
      const userCols = cols('users');
      if (!userCols.includes('event_id')) {
        db.exec('ALTER TABLE users ADD COLUMN event_id TEXT;');
      }
      if (!userCols.includes('participant_number')) {
        db.exec('ALTER TABLE users ADD COLUMN participant_number INTEGER;');
      }
      if (!userCols.includes('side_event_gta')) {
        db.exec('ALTER TABLE users ADD COLUMN side_event_gta INTEGER DEFAULT 0;');
      }
      if (!userCols.includes('source_key')) {
        db.exec('ALTER TABLE users ADD COLUMN source_key TEXT;');
      }

      // Table: bracket_matches
      const bracketCols = cols('bracket_matches');
      if (!bracketCols.includes('event_id')) {
        db.exec('ALTER TABLE bracket_matches ADD COLUMN event_id TEXT;');
      }
      if (!bracketCols.includes('is_final')) {
        db.exec('ALTER TABLE bracket_matches ADD COLUMN is_final INTEGER DEFAULT 0;');
      }
      if (!bracketCols.includes('ticket_id_1')) {
        db.exec('ALTER TABLE bracket_matches ADD COLUMN ticket_id_1 TEXT;');
      }
      if (!bracketCols.includes('ticket_id_2')) {
        db.exec('ALTER TABLE bracket_matches ADD COLUMN ticket_id_2 TEXT;');
      }
      if (!bracketCols.includes('ticket_id_3')) {
        db.exec('ALTER TABLE bracket_matches ADD COLUMN ticket_id_3 TEXT;');
      }
      if (!bracketCols.includes('is_auto_advanced')) {
        db.exec('ALTER TABLE bracket_matches ADD COLUMN is_auto_advanced INTEGER DEFAULT 0;');
      }

      // Table: marshal_winner_logs
      const marshalCols = cols('marshal_winner_logs');
      if (!marshalCols.includes('ticket_id')) {
        db.exec('ALTER TABLE marshal_winner_logs ADD COLUMN ticket_id TEXT;');
      }

      // Table: coupon_packages
      const couponCols = cols('coupon_packages');
      if (!couponCols.includes('package_type')) {
        db.exec("ALTER TABLE coupon_packages ADD COLUMN package_type TEXT DEFAULT 'standard';");
      }

      // 3. Fixed default event (00000000-0000-4000-8000-000000000001)
      db.prepare(`
        INSERT OR IGNORE INTO events (id, nama, tanggal, status, jumlah_lap)
        VALUES (?, 'Event 1', date('now'), 'active', 3);
      `).run(DEFAULT_EVENT_ID);

      // 4. Backfill users.event_id for role='participant' rows
      db.prepare(`
        UPDATE users SET event_id = ?
        WHERE role = 'participant' AND event_id IS NULL;
      `).run(DEFAULT_EVENT_ID);

      // 5. Backfill users.participant_number sequentially partitioned by event_id,
      // offsetting by existing MAX(participant_number) to prevent unique constraint violations on re-runs
      db.prepare(`
        UPDATE users SET participant_number = sub.rn
        FROM (
          SELECT
            u.id,
            COALESCE(m.max_num, 0) + ROW_NUMBER() OVER (PARTITION BY u.event_id ORDER BY u.created_at, u.rowid) AS rn
          FROM users u
          LEFT JOIN (
            SELECT event_id, MAX(participant_number) AS max_num
            FROM users
            WHERE participant_number IS NOT NULL
            GROUP BY event_id
          ) m ON u.event_id = m.event_id
          WHERE u.role = 'participant' AND u.event_id IS NOT NULL AND u.participant_number IS NULL
        ) AS sub
        WHERE users.id = sub.id AND users.participant_number IS NULL;
      `).run();

      // 6. Backfill bracket_matches.event_id
      db.prepare(`
        UPDATE bracket_matches SET event_id = ?
        WHERE event_id IS NULL;
      `).run(DEFAULT_EVENT_ID);

      // 7. Ensure round <= 3 matches are not marked as final (Babak 3 is not Grand Final)
      db.prepare(`
        UPDATE bracket_matches SET is_final = 0
        WHERE round_number <= 3 AND is_final = 1;
      `).run();

      // 8. Indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_bracket_matches_event ON bracket_matches(event_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_participant_number ON users(event_id, participant_number);
      `);
    }
  },
  {
    version: 2,
    name: 'drop_legacy_tables',
    destructive: true,
    up(db) {
      db.exec(`
        DROP TABLE IF EXISTS next_round_tickets;
        DROP TABLE IF EXISTS marshal_winner_logs;
        DROP TABLE IF EXISTS coupon_packages;
        DROP TABLE IF EXISTS race_registrations;
        DROP TABLE IF EXISTS races;
        DROP TABLE IF EXISTS coupons;
      `);
    }
  },
  {
    version: 3,
    name: 'normalize_round_3_not_final',
    destructive: false,
    up(db) {
      db.prepare(`
        UPDATE bracket_matches SET is_final = 0
        WHERE round_number <= 4 AND is_final = 1;
      `).run();
    }
  }
];

/**
 * Run all pending migrations in ascending version order.
 * Takes a timestamped backup before running any pending migration if a DB file exists.
 *
 * @param {import('./db.js').default} db
 * @returns {{ applied: number, version: number }}
 */
export function runMigrations(db) {
  // 1. Ensure schema_version table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Fetch applied migration versions
  const rows = db.prepare('SELECT version FROM schema_version ORDER BY version ASC').all();
  const appliedVersions = new Set(rows.map(r => r.version));
  let currentMax = rows.reduce((max, r) => Math.max(max, r.version), 0);

  // 3. Filter pending migrations
  const pending = MIGRATIONS
    .filter(m => !appliedVersions.has(m.version))
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    return { applied: 0, version: currentMax };
  }

  // 4. Backup before executing pending migrations on existing DB file
  if (db.currentPath && fs.existsSync(db.currentPath)) {
    createTimestampedBackup(db.currentPath);
  }

  // 5. Execute each pending migration in a separate transaction
  let appliedCount = 0;
  for (const migration of pending) {
    if (migration.destructive && process.env.ALLOW_DESTRUCTIVE_MIGRATION !== 'true') {
      console.warn(`[MIGRATION] Skipping destructive migration ${migration.version} (${migration.name}): ALLOW_DESTRUCTIVE_MIGRATION is not 'true'`);
      continue;
    }

    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_version (version, name) VALUES (?, ?)').run(migration.version, migration.name);
    })();

    appliedCount++;
    currentMax = Math.max(currentMax, migration.version);
  }

  return { applied: appliedCount, version: currentMax };
}
