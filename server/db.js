import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runMigrations } from './migrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

class SqliteWrapper {
  constructor() {
    this.driverName = 'sqlite';
    this.rawDb = null;
    this.saveTimeout = null;
    this.currentPath = null;
    this._txDepth = 0;
  }

  async init(customPath = null) {
    const SQL = await initSqlJs();
    this.currentPath = customPath || process.env.DB_PATH || path.join(dbDir, 'tamiya.sqlite');
    const targetDir = path.dirname(this.currentPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    if (fs.existsSync(this.currentPath)) {
      try {
        const filebuffer = fs.readFileSync(this.currentPath);
        this.rawDb = new SQL.Database(filebuffer);
      } catch (e) {
        console.warn('Could not read existing SQLite file, creating new database', e);
        this.rawDb = new SQL.Database();
      }
    } else {
      this.rawDb = new SQL.Database();
    }
  }

  save() {
    if (!this.rawDb || !this.currentPath) return;
    if (this._txDepth > 0) return; // CRITICAL: export() would terminate open transaction
    try {
      const targetDir = path.dirname(this.currentPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const data = this.rawDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.currentPath, buffer);
    } catch (err) {
      console.error('Error saving SQLite database to disk:', err);
    }
  }

  exec(sql) {
    this.rawDb.exec(sql);
    this.save();
  }

  pragma(p) {
    try {
      this.rawDb.exec(`PRAGMA ${p};`);
    } catch (e) {
      // Ignored for WASM sqlite
    }
  }

  prepare(sql) {
    const self = this;
    return {
      all(...params) {
        const stmt = self.rawDb.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      get(...params) {
        const stmt = self.rawDb.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },
      run(...params) {
        const stmt = self.rawDb.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        stmt.step();
        stmt.free();
        const changes = self.rawDb.getRowsModified();
        self.save();
        return { changes };
      }
    };
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      const outermost = self._txDepth === 0;
      if (outermost) {
        self.rawDb.exec('BEGIN');
      }
      self._txDepth++;
      try {
        const res = fn(...args);
        self._txDepth--;
        if (outermost) {
          self.rawDb.exec('COMMIT');
          self.save();
        }
        return res;
      } catch (err) {
        self._txDepth--;
        if (outermost) {
          try {
            self.rawDb.exec('ROLLBACK');
          } catch (_) {}
        }
        throw err;
      }
    };
  }
}

class PostgresWrapper {
  constructor() {
    this.driverName = 'postgres';
    this.pool = null;
    this.rawDb = null;
    this._txDepth = 0;
    this.fallbackSqlite = null;
  }

  async init(customPath = null) {
    try {
      const pgModule = await import('pg');
      const Pool = pgModule.default?.Pool || pgModule.Pool;
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      const pgConfig = connectionString
        ? { connectionString }
        : {
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres123',
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
            database: process.env.POSTGRES_DB || 'dgdash'
          };
      this.pool = new Pool(pgConfig);
      this.rawDb = this.pool;

      const schemaPath = path.join(__dirname, 'schemas/postgres-schema.sql');
      if (fs.existsSync(schemaPath)) {
        const ddl = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(ddl);
      }
    } catch (e) {
      console.warn('PostgreSQL client init failed, falling back to SQLite driver:', e?.message || e);
      this.driverName = 'sqlite';
      this.fallbackSqlite = new SqliteWrapper();
      await this.fallbackSqlite.init(customPath);
      this.rawDb = this.fallbackSqlite.rawDb;
    }
  }

  exec(sql) {
    if (this.fallbackSqlite) return this.fallbackSqlite.exec(sql);
    if (this.pool) return this.pool.query(sql);
  }

  prepare(sql) {
    if (this.fallbackSqlite) return this.fallbackSqlite.prepare(sql);
    const self = this;
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return {
      all(...params) {
        return self.pool.query(pgSql, params).then(res => res.rows);
      },
      get(...params) {
        return self.pool.query(pgSql, params).then(res => res.rows[0] || null);
      },
      run(...params) {
        return self.pool.query(pgSql, params).then(res => ({ changes: res.rowCount }));
      }
    };
  }

  transaction(fn) {
    if (this.fallbackSqlite) return this.fallbackSqlite.transaction(fn);
    const self = this;
    return async (...args) => {
      const client = await self.pool.connect();
      try {
        await client.query('BEGIN');
        const res = await fn(...args);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  }
}

const driverChoice = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
const db = driverChoice === 'postgres' ? new PostgresWrapper() : new SqliteWrapper();

export async function initDatabase() {
  await db.init();

  if (db.driverName === 'sqlite') {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      google_sub_id TEXT,
      team_name TEXT,
      role TEXT DEFAULT 'participant',
      is_virtual INTEGER DEFAULT 0,
      side_event_gta INTEGER DEFAULT 0,
      source_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      balance INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS races (
      id TEXT PRIMARY KEY,
      race_number INTEGER UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      winner_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(winner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS race_registrations (
      id TEXT PRIMARY KEY,
      race_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      lane TEXT CHECK(lane IN ('A', 'B', 'C')),
      status TEXT DEFAULT 'pending',
      finish_time REAL DEFAULT NULL,
      scrutineer_status TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(race_id, lane),
      FOREIGN KEY(race_id) REFERENCES races(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bracket_matches (
      id TEXT PRIMARY KEY,
      match_number INTEGER UNIQUE NOT NULL,
      round_number INTEGER NOT NULL,
      user_id_1 TEXT,
      user_id_2 TEXT,
      user_id_3 TEXT,
      winner_id TEXT,
      parent_match_id TEXT,
      status TEXT DEFAULT 'pending',
      is_final INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id_1) REFERENCES users(id),
      FOREIGN KEY(user_id_2) REFERENCES users(id),
      FOREIGN KEY(user_id_3) REFERENCES users(id),
      FOREIGN KEY(winner_id) REFERENCES users(id),
      FOREIGN KEY(parent_match_id) REFERENCES bracket_matches(id)
    );

    CREATE TABLE IF NOT EXISTS coupon_packages (
      id TEXT PRIMARY KEY,
      serial_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      total_quota INTEGER NOT NULL DEFAULT 50,
      used_quota INTEGER NOT NULL DEFAULT 0,
      remaining_quota INTEGER NOT NULL DEFAULT 50,
      price_paid INTEGER DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      package_type TEXT DEFAULT 'standard',
      status TEXT CHECK(status IN ('active', 'completed', 'void')) DEFAULT 'active',
      void_from_id TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(void_from_id) REFERENCES coupon_packages(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_packages_serial ON coupon_packages(serial_number);

    CREATE TABLE IF NOT EXISTS marshal_winner_logs (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      user_id TEXT NOT NULL,
      lane TEXT CHECK(lane IN ('A', 'B', 'C')) NOT NULL,
      heat_number INTEGER DEFAULT NULL,
      box_number INTEGER NOT NULL,
      status TEXT CHECK(status IN ('active', 'undone')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(package_id) REFERENCES coupon_packages(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_marshal_logs_created ON marshal_winner_logs(created_at);

    CREATE TABLE IF NOT EXISTS next_round_tickets (
      id TEXT PRIMARY KEY,
      ticket_number INTEGER UNIQUE NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      racer_ticket_index INTEGER NOT NULL DEFAULT 1,
      package_id TEXT,
      serial_number TEXT NOT NULL,
      lane TEXT CHECK(lane IN ('A', 'B', 'C')) NOT NULL,
      source TEXT CHECK(source IN ('marshal', 'race_director')) DEFAULT 'marshal',
      status TEXT CHECK(status IN ('issued', 'used', 'void')) DEFAULT 'issued',
      bracket_match_id TEXT,
      bracket_slot TEXT CHECK(bracket_slot IN ('user_id_1', 'user_id_2', 'user_id_3')),
      void_reason TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(package_id) REFERENCES coupon_packages(id),
      FOREIGN KEY(bracket_match_id) REFERENCES bracket_matches(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_user ON next_round_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_serial ON next_round_tickets(serial_number);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON next_round_tickets(status);

    CREATE TABLE IF NOT EXISTS tournament_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'pending',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME DEFAULT NULL,
      approved_by TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
    CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
  `);

  // Run versioned migrations (replaces legacy try/catch ALTER block)
  runMigrations(db);

  // Auto-reconcile legacy participant rename and duplicates
  reconcileLegacyParticipants(db);
  }

  // Demo/dummy data is opt-in only. Production and normal local runs start clean.
  // Enable with SEED_DEMO_DATA=true (the test suite sets this).
  if (process.env.SEED_DEMO_DATA === 'true') {
    seedInitialData();
  }
}

export function reconcileLegacyParticipants(dbInstance) {
  try {
    // 1. Rename #21, #23, #24, #25 if they still hold old names
    const renames = [
      { num: 21, newName: 'PTMK', sourceKey: 'stc:presale:21' },
      { num: 23, newName: 'papamiya', sourceKey: 'stc:presale:23' },
      { num: 24, newName: 'kasetklasik', sourceKey: 'stc:presale:24' },
      { num: 25, newName: 'slowdon', sourceKey: 'stc:presale:25' }
    ];

    for (const r of renames) {
      dbInstance.prepare(`
        UPDATE users 
        SET name = ?, source_key = COALESCE(source_key, ?)
        WHERE participant_number = ? AND role = 'participant'
      `).run(r.newName, r.sourceKey, r.num);
    }

    // 2. Safely remove duplicate phantom participants (#41, #42, #43, #44)
    const duplicateNumbers = [41, 42, 43, 44];
    for (const num of duplicateNumbers) {
      const user = dbInstance.prepare('SELECT id, name FROM users WHERE participant_number = ? AND role = "participant"').get(num);
      if (user) {
        let inMatch = false;
        try {
          const m = dbInstance.prepare(`
            SELECT id FROM bracket_matches 
            WHERE user_id_1 = ? OR user_id_2 = ? OR user_id_3 = ? OR winner_id = ?
            LIMIT 1
          `).get(user.id, user.id, user.id, user.id);
          if (m) inMatch = true;
        } catch (_) {}

        let inBto = false;
        try {
          const b = dbInstance.prepare('SELECT id FROM bto_records WHERE user_id = ? LIMIT 1').get(user.id);
          if (b) inBto = true;
        } catch (_) {}

        if (!inMatch && !inBto) {
          dbInstance.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        }
      }
    }

    // 3. Link source_key for participants #1 to #35 (presale) and #36 to #40 (ots)
    for (let n = 1; n <= 35; n++) {
      dbInstance.prepare(`
        UPDATE users SET source_key = ? 
        WHERE participant_number = ? AND role = 'participant' AND source_key IS NULL
      `).run(`stc:presale:${n}`, n);
    }
    for (let n = 36; n <= 40; n++) {
      dbInstance.prepare(`
        UPDATE users SET source_key = ? 
        WHERE participant_number = ? AND role = 'participant' AND source_key IS NULL
      `).run(`stc:ots:${n}`, n);
    }

    // 4. Safely prune excess empty heats in Round 3 beyond Heat 21 (match_number > 221 or > 21)
    dbInstance.prepare(`
      DELETE FROM bracket_matches 
      WHERE round_number = 3 
        AND (
          (match_number >= 200 AND match_number > 221) 
          OR (match_number < 200 AND match_number > 21)
        )
        AND user_id_1 IS NULL 
        AND user_id_2 IS NULL 
        AND user_id_3 IS NULL 
        AND winner_id IS NULL
    `).run();
  } catch (err) {
    // Non-fatal on newly created tables
  }
}

function seedInitialData() {
  const countUsers = db.prepare('SELECT count(*) as count FROM users').get()?.count || 0;
  if (countUsers === 0) {
    console.log('⚡ Seeding initial Cyberpunk Tamiya tournament data...');

    const activeEvent = db.prepare("SELECT id FROM events WHERE status = 'active' LIMIT 1").get();
    const activeEventId = activeEvent?.id || '00000000-0000-4000-8000-000000000001';

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, google_sub_id, team_name, role, is_virtual, event_id, participant_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tableExists = (tbl) => {
      try {
        const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tbl);
        return Boolean(r);
      } catch (_) {
        return false;
      }
    };

    const hasCoupons = tableExists('coupons');
    const hasRaces = tableExists('races');
    const hasRegistrations = tableExists('race_registrations');

    const insertCoupon = hasCoupons ? db.prepare(`
      INSERT INTO coupons (id, user_id, balance)
      VALUES (?, ?, ?)
    `) : null;

    // 1. Race Director / Admin
    const rdId = uuidv4();
    insertUser.run(rdId, 'Race Director (Head)', 'rd@tamiya.local', null, 'HQ', 'admin', 0, null, null);
    if (insertCoupon) insertCoupon.run(uuidv4(), rdId, 999);

    // 2. Scrutineer
    const scrutId = uuidv4();
    insertUser.run(scrutId, 'Juri Scrutineer', 'scrutineer@tamiya.local', null, 'QC', 'scrutineer', 0, null, null);
    if (insertCoupon) insertCoupon.run(uuidv4(), scrutId, 999);

    // 3. Demo Racers
    const racers = [
      { name: 'Andi Pratama', email: 'andi@gmail.com', tag: 'ANDI [RRT]', balance: 25 },
      { name: 'Budi Santoso', email: 'budi@gmail.com', tag: 'BUDI [GTR]', balance: 18 },
      { name: 'Chandra Wijaya', email: 'chandra@gmail.com', tag: 'CHAN [M4D]', balance: 30 },
      { name: 'Doni Kurniawan', email: 'doni@gmail.com', tag: 'DONI [SPD]', balance: 15 },
      { name: 'Eko Prasetyo', email: 'eko@gmail.com', tag: 'EKO [VBC]', balance: 20 },
      { name: 'Fandi Ahmad', email: 'fandi@gmail.com', tag: 'FANDI [NEO]', balance: 12 },
      { name: 'Gilang Ramadhan', email: 'guest101@tamiya.local', tag: 'GILANG', balance: 10, is_virtual: 1 },
      { name: 'Hendra Gunawan', email: 'guest102@tamiya.local', tag: 'HENDRA', balance: 10, is_virtual: 1 }
    ];

    let participantNum = 1;
    racers.forEach(r => {
      const uId = uuidv4();
      insertUser.run(uId, r.name, r.email, null, r.tag, 'participant', r.is_virtual || 0, activeEventId, participantNum++);
      if (insertCoupon) insertCoupon.run(uuidv4(), uId, r.balance);
    });

    // Create Initial Race 1 if table exists
    if (hasRaces && hasRegistrations) {
      const race1Id = uuidv4();
      db.prepare(`
        INSERT INTO races (id, race_number, status)
        VALUES (?, 1, 'draft')
      `).run(race1Id);

      const andi = db.prepare("SELECT id FROM users WHERE email = 'andi@gmail.com'").get();
      const budi = db.prepare("SELECT id FROM users WHERE email = 'budi@gmail.com'").get();
      if (andi && budi) {
        db.prepare("INSERT INTO race_registrations (id, race_id, user_id, lane, status) VALUES (?, ?, ?, 'A', 'ready')")
          .run(uuidv4(), race1Id, andi.id);
        db.prepare("INSERT INTO race_registrations (id, race_id, user_id, lane, status) VALUES (?, ?, ?, 'B', 'pending')")
          .run(uuidv4(), race1Id, budi.id);
      }
    }

    // Create Initial Tournament Bracket (3-Lane Elimination: 3 Heats in Round 2 -> Babak 3)
    const gfId = uuidv4();
    db.prepare(`INSERT INTO bracket_matches (id, event_id, match_number, round_number, is_final, status) VALUES (?, ?, 4, 3, 0, 'pending')`).run(gfId, activeEventId);

    const m1Id = uuidv4();
    const m2Id = uuidv4();
    const m3Id = uuidv4();
    db.prepare(`INSERT INTO bracket_matches (id, event_id, match_number, round_number, parent_match_id, status) VALUES (?, ?, 1, 2, ?, 'pending')`).run(m1Id, activeEventId, gfId);
    db.prepare(`INSERT INTO bracket_matches (id, event_id, match_number, round_number, parent_match_id, status) VALUES (?, ?, 2, 2, ?, 'pending')`).run(m2Id, activeEventId, gfId);
    db.prepare(`INSERT INTO bracket_matches (id, event_id, match_number, round_number, parent_match_id, status) VALUES (?, ?, 3, 2, ?, 'pending')`).run(m3Id, activeEventId, gfId);

    console.log('✅ Tournament database seeded successfully!');
  }
}

export default db;
