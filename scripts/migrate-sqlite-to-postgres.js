import initSqlJs from 'sql.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🚀 Starting SQLite to PostgreSQL Data Migration...');

  // 1. Locate SQLite file
  const sqlitePath = process.env.DB_PATH || path.join(__dirname, '../data/tamiya.sqlite');
  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite database file not found at: ${sqlitePath}`);
    process.exit(1);
  }
  console.log(`📁 Reading SQLite database from: ${sqlitePath}`);

  let sqliteDb;
  try {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(sqlitePath);
    sqliteDb = new SQL.Database(fileBuffer);
    console.log('📖 SQLite database loaded successfully.');
  } catch (e) {
    console.error('❌ Failed to load SQLite database with sql.js:', e.message || e);
    process.exit(1);
  }

  // Helper to read all rows from a table in SQLite
  const readSqliteTable = (tableName) => {
    try {
      const stmt = sqliteDb.prepare(`SELECT * FROM ${tableName}`);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (e) {
      console.warn(`  ⚠️ Table [${tableName}] missing or unreadable in SQLite:`, e.message);
      return [];
    }
  };

  // 3. Connect to PostgreSQL
  let pgConfig;
  if (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
    pgConfig = {
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'dgdash'
    };
  } else if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    pgConfig = { connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL };
  } else {
    pgConfig = {
      user: 'postgres',
      password: 'postgres123',
      host: 'postgres',
      port: 5432,
      database: 'dgdash'
    };
  }

  console.log(`🔌 Connecting to PostgreSQL at ${pgConfig.host || 'URL'} (user: ${pgConfig.user || 'from URL'})...`);
  const pool = new pg.Pool(pgConfig);
  
  let pgClient;
  try {
    pgClient = await pool.connect();
    console.log('⚡ Connected to PostgreSQL instance successfully!');
  } catch (e) {
    console.error('❌ Failed to connect to PostgreSQL:', e.message || e);
    await pool.end();
    process.exit(1);
  }

  try {
    // 4. Initialize PostgreSQL DDL Schema
    const possibleSchemaPaths = [
      path.join(__dirname, '../server/schemas/postgres-schema.sql'),
      path.join(__dirname, 'server/schemas/postgres-schema.sql'),
      '/app/server/schemas/postgres-schema.sql'
    ];
    const schemaPath = possibleSchemaPaths.find(p => fs.existsSync(p));

    if (schemaPath) {
      console.log(`📋 Found schema DDL at: ${schemaPath}`);
      const ddl = fs.readFileSync(schemaPath, 'utf-8');
      await pgClient.query(ddl);
      console.log('📋 PostgreSQL DDL schema initialized.');
    } else {
      console.warn('⚠️ Could not find postgres-schema.sql file, proceeding with existing table structure...');
    }

    await pgClient.query("SET session_replication_role = 'replica';");
    await pgClient.query('BEGIN');

    // 5. Order of tables to migrate (respecting foreign key relationships)
    const tables = [
      { name: 'events', pkey: 'id' },
      { name: 'users', pkey: 'id' },
      { name: 'coupons', pkey: 'id' },
      { name: 'races', pkey: 'id' },
      { name: 'race_registrations', pkey: 'id' },
      { name: 'bracket_matches', pkey: 'id' },
      { name: 'coupon_packages', pkey: 'id' },
      { name: 'marshal_winner_logs', pkey: 'id' },
      { name: 'next_round_tickets', pkey: 'id' },
      { name: 'bto_records', pkey: 'id' },
      { name: 'tournament_settings', pkey: 'key' },
      { name: 'app_users', pkey: 'id' },
      { name: 'auth_sessions', pkey: 'id' }
    ];

    for (const { name: tableName, pkey } of tables) {
      const rows = readSqliteTable(tableName);
      if (rows.length === 0) {
        console.log(`  ℹ️ Table [${tableName}] is empty, skipping...`);
        continue;
      }

      // Fetch existing columns in target PostgreSQL table
      const pgColsRes = await pgClient.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [tableName]
      );
      const validPgCols = new Set(pgColsRes.rows.map(r => r.column_name.toLowerCase()));

      const sqliteCols = Object.keys(rows[0]);
      const columns = sqliteCols.filter(c => validPgCols.has(c.toLowerCase()));

      if (columns.length === 0) {
        console.warn(`  ⚠️ No matching columns found between SQLite and Postgres for [${tableName}]`);
        continue;
      }

      const colList = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === undefined) return null;
          return val;
        });

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        // Build ON CONFLICT DO UPDATE clause
        const updateCols = columns
          .filter(col => col !== pkey)
          .map(col => `"${col}" = EXCLUDED."${col}"`)
          .join(', ');

        const conflictClause = updateCols.length > 0
          ? `ON CONFLICT ("${pkey}") DO UPDATE SET ${updateCols}`
          : `ON CONFLICT ("${pkey}") DO NOTHING`;

        const query = `
          INSERT INTO "${tableName}" (${colList})
          VALUES (${placeholders})
          ${conflictClause}
        `;

        await pgClient.query(query, values);
      }

      console.log(`  ✅ Migrated ${rows.length} record(s) into [${tableName}]`);
    }

    await pgClient.query('COMMIT');
    await pgClient.query("SET session_replication_role = 'origin';");
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY! All SQLite data moved to PostgreSQL.');

  } catch (err) {
    try { await pgClient.query('ROLLBACK'); } catch (_) {}
    try { await pgClient.query("SET session_replication_role = 'origin';"); } catch (_) {}
    console.error('❌ Migration failed:', err.message || err);
    throw err;
  } finally {
    pgClient.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration execution uncaught error:', err);
  process.exit(1);
});
