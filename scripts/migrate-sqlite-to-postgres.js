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
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const pgConfig = connectionString
    ? { connectionString }
    : {
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres123',
        host: process.env.POSTGRES_HOST || 'postgres',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'dgdash'
      };

  console.log(`🔌 Connecting to PostgreSQL at ${pgConfig.host || 'URL'}...`);
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

      const columns = Object.keys(rows[0]);
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
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY! All SQLite data moved to PostgreSQL.');

  } catch (err) {
    await pgClient.query('ROLLBACK');
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
