import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

class SqliteWrapper {
  constructor() {
    this.rawDb = null;
    this.saveTimeout = null;
    this.currentPath = null;
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
        self.save();
        return { changes: 1 };
      }
    };
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      try {
        const res = fn(...args);
        self.save();
        return res;
      } catch (err) {
        throw err;
      }
    };
  }
}

const db = new SqliteWrapper();

export async function initDatabase() {
  await db.init();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      google_sub_id TEXT,
      team_name TEXT,
      role TEXT DEFAULT 'participant',
      is_virtual INTEGER DEFAULT 0,
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
  `);

  try {
    db.exec(`ALTER TABLE bracket_matches ADD COLUMN is_final INTEGER DEFAULT 0;`);
  } catch (e) {
    // Column may already exist
  }

  seedInitialData();
}

function seedInitialData() {
  const countUsers = db.prepare('SELECT count(*) as count FROM users').get()?.count || 0;
  if (countUsers === 0) {
    console.log('⚡ Seeding initial Cyberpunk Tamiya tournament data...');

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, google_sub_id, team_name, role, is_virtual)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCoupon = db.prepare(`
      INSERT INTO coupons (id, user_id, balance)
      VALUES (?, ?, ?)
    `);

    // 1. Race Director / Admin
    const rdId = uuidv4();
    insertUser.run(rdId, 'Race Director (Head)', 'rd@tamiya.local', null, 'HQ', 'admin', 0);
    insertCoupon.run(uuidv4(), rdId, 999);

    // 2. Scrutineer
    const scrutId = uuidv4();
    insertUser.run(scrutId, 'Juri Scrutineer', 'scrutineer@tamiya.local', null, 'QC', 'scrutineer', 0);
    insertCoupon.run(uuidv4(), scrutId, 999);

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

    racers.forEach(r => {
      const uId = uuidv4();
      insertUser.run(uId, r.name, r.email, null, r.tag, 'participant', r.is_virtual || 0);
      insertCoupon.run(uuidv4(), uId, r.balance);
    });

    // Create Initial Race 1
    const race1Id = uuidv4();
    db.prepare(`
      INSERT INTO races (id, race_number, status)
      VALUES (?, 1, 'draft')
    `).run(race1Id);

    // Seed 2 initial registered participants for demonstration
    const andi = db.prepare("SELECT id FROM users WHERE email = 'andi@gmail.com'").get();
    const budi = db.prepare("SELECT id FROM users WHERE email = 'budi@gmail.com'").get();
    if (andi && budi) {
      db.prepare("INSERT INTO race_registrations (id, race_id, user_id, lane, status) VALUES (?, ?, ?, 'A', 'ready')")
        .run(uuidv4(), race1Id, andi.id);
      db.prepare("INSERT INTO race_registrations (id, race_id, user_id, lane, status) VALUES (?, ?, ?, 'B', 'pending')")
        .run(uuidv4(), race1Id, budi.id);
    }

    // Create Initial Tournament Bracket (3-Lane Elimination: 3 Heats in Round 2 -> 1 Grand Final in Round 3)
    const gfId = uuidv4();
    db.prepare(`INSERT INTO bracket_matches (id, match_number, round_number, is_final, status) VALUES (?, 4, 3, 1, 'pending')`).run(gfId);

    const m1Id = uuidv4();
    const m2Id = uuidv4();
    const m3Id = uuidv4();
    db.prepare(`INSERT INTO bracket_matches (id, match_number, round_number, parent_match_id, status) VALUES (?, 1, 2, ?, 'pending')`).run(m1Id, gfId);
    db.prepare(`INSERT INTO bracket_matches (id, match_number, round_number, parent_match_id, status) VALUES (?, 2, 2, ?, 'pending')`).run(m2Id, gfId);
    db.prepare(`INSERT INTO bracket_matches (id, match_number, round_number, parent_match_id, status) VALUES (?, 3, 2, ?, 'pending')`).run(m3Id, gfId);

    console.log('✅ Tournament database seeded successfully!');
  }
}

export default db;
