<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Model Scope Event
- **D-01:** Data diikat ke event via kolom `event_id` (FK) pada tabel `users`,
  `bracket_matches`, dan `bto_records`. Query memfilter `WHERE event_id = <event aktif>`.
- **D-02:** Entitas peserta tetap memakai tabel `users` yang ada + kolom `event_id`
  (bukan tabel `participants` baru).
- **D-03:** Hanya **satu event aktif** yang dikelola/ditampilkan pada satu waktu.
  Event lain tersimpan sebagai arsip (tidak dihapus).

#### Format Nomor Peserta
- **D-04:** `participant_number` disimpan sebagai `INTEGER` polos (1, 2, 3) — bukan
  TEXT zero-padded; ditampilkan apa adanya.
- **D-05:** Alokasi nomor otomatis `MAX(participant_number) + 1` di dalam event aktif,
  dijalankan dalam transaksi.
- **D-06:** Normalisasi input nomor saat lookup (dipakai Panel Registrasi Phase 14):
  trim spasi + buang leading zero, sehingga `" 007 "` == `7`.
- **D-07:** Keunikan nomor adalah per-event: `UNIQUE(event_id, participant_number)` —
  nomor boleh sama pada event berbeda.

#### Keamanan Migrasi
- **D-08:** Backup database otomatis ke `data/backups/tamiya-<YYYYMMDD-HHmmss>.sqlite`
  sebelum langkah destruktif. Folder `data/backups/` masuk `.gitignore`.
- **D-09:** Versi skema dilacak dengan tabel `schema_version` (kolom `version`, `applied_at`).
- **D-10:** Perbaiki `SqliteWrapper.transaction()` (`server/db.js`) agar benar-benar
  mengirim `BEGIN` / `COMMIT` / `ROLLBACK` — berlaku global untuk seluruh aplikasi,
  bukan helper terpisah. Catatan: `run()` saat ini selalu mengembalikan `{ changes: 1 }`.
- **D-11:** Langkah destruktif (drop/alter merusak) hanya berjalan bila env
  `ALLOW_DESTRUCTIVE_MIGRATION=true`; default aman (`false` = tahan).

#### Siklus Hidup Event
- **D-12:** Field event: `nama`, `tanggal`, `status` (`active`/`archived`), `catatan`,
  `jumlah lap` (jumlah lap balapan, mis. 3).
- **D-13:** Saat boot pertama tanpa event, otomatis buat `Event 1` dan jadikan aktif.
- **D-14:** Event tidak bisa dihapus permanen; hanya diarsipkan (status `archived`).
- **D-15:** Layar baru **Manajemen Event** untuk buat/pilih/arsip event.

### the agent's Discretion
- Struktur persis tabel `events` (kolom id/tipe, constraint) dan penamaan tipe data.
- Cara menyimpan `jumlah lap` (angka) dan apakah `catatan` opsional.
- Implementasi teknis backfill `participant_number` untuk data `users` lama (data v2.0)
  dan bagaimana `event_id` lama diisi (mis. event default).
- Strategi penamaan/urutan checksum migrasi di `schema_version`.
- Penetapan `PRAGMA foreign_keys` (audit orphan dulu; riset merekomendasikan hati-hati).

### Deferred Ideas (OUT OF SCOPE)
- **Cetak daftar seeding per heat** — EXTR-01 (v2 Requirements).
- **Heat konsolasi / perebutan juara 3** — EXTR-02.
- **Operator PIN untuk registrasi pemenang** — EXTR-03.
- **Drop tabel kupon/race lama** — Phase 17 (MIG-04).
- **Rewrite `scripts/import-roster.js` jadi pendaftaran peserta** — Phase 12 (PARN-05).
- **`PRAGMA foreign_keys = ON`** — ditunda sampai audit orphan terpisah.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVNT-01 | Panitia dapat membuat event/turnamen baru (nama, tanggal) | `events` DDL + partial-unique-active index verified; `POST /api/events` route; Manajemen Event screen |
| EVNT-02 | Panitia dapat memilih event aktif | `events.status` + `CREATE UNIQUE INDEX ... WHERE status='active'` verified (blocks 2nd active); activation route flips status inside one real transaction |
| EVNT-04 | Data peserta/bracket/BTO terpisah per event | `event_id` on `users` / `bracket_matches` / `bto_records`; backfill to default event; scoping checklist in Common Pitfalls |
| MIG-01 | Migrasi schema dalam transaksi nyata + backup DB sebelum langkah destruktif | Verified sql.js txn semantics (BEGIN/COMMIT/ROLLBACK work; `export()` kills an open txn); deferred-save wrapper design; timestamped backup via `fs.copyFileSync` (VACUUM INTO fails in sql.js) |
| MIG-02 | Skema event + `participant_number` (+index) & normalisasi nomor kanonik | `ALTER TABLE ADD COLUMN` constraints verified (no UNIQUE/NOT NULL); `CREATE UNIQUE INDEX`; `normalizeParticipantNumber` unit-tested (`"007"`→7) |
</phase_requirements>

# Phase 11: Event & Schema Migration Foundation - Research

**Researched:** 2026-09-17
**Domain:** sql.js (WASM SQLite) schema migration + event scoping for a LAN-hosted Express/Socket.IO/React tournament app
**Confidence:** HIGH (sql.js 1.14.2 transaction semantics verified empirically in this repo; all code facts read from source)

## Summary

This phase is **additive**. No table is dropped, no query loses a column, and the four-milestone-old app must keep booting against a v2.0 `data/tamiya.sqlite`. The real work is (a) making `SqliteWrapper.transaction()` emit genuine `BEGIN`/`COMMIT`/`ROLLBACK` without breaking the app, (b) adding an `events` table + `event_id` columns + `participant_number` with a real versioned migration runner, (c) a timestamped pre-migration backup, and (d) a thin Manajemen Event screen.

The single most important discovery of this research: **`sql.js` `Database.export()` silently terminates an open transaction, discarding uncommitted statements, and resets connection-scoped pragmas (including `PRAGMA foreign_keys`) to defaults.** The current `SqliteWrapper.exec()` and `prepare().run()` both call `save()` (which calls `export()`) after *every* statement. Naively adding `db.exec('BEGIN')` + `db.exec('COMMIT')` therefore produces a *broken* transaction: the `BEGIN` statement's own save ends the transaction immediately, and the later `COMMIT` throws `cannot commit - no transaction is active`. Fixing `transaction()` (D-10) therefore requires **suppressing `save()` while a transaction is open** and saving once after the outermost `COMMIT`. This was verified empirically, not assumed.

Second important discovery: `transaction()` must become **reentrant**. Production code already nests `db.transaction()` calls — `server/index.js:760-788` wraps `TicketEngine.issueTicket()` inside `db.transaction()`, and `TicketEngine.issueTicket()` itself opens `db.transaction()` (`server/ticketEngine.js:114`). Same pattern in `raceManager.handleScrutineerAction()` (line 573 → 602). Today this is harmless (no `BEGIN` is emitted). Once `transaction()` becomes real, a nested `BEGIN` throws `cannot start a transaction within a transaction` and both marshal winner recording and scrutineer pass break at runtime.

**Primary recommendation:** Rewrite `SqliteWrapper` with a transaction-depth counter + deferred save; build a tiny versioned migration runner (`server/migrations.js`) gated on a `schema_version` table; back up with `fs.copyFileSync` after `db.save()`; and leave `PRAGMA foreign_keys` OFF (audit-only), because `export()` resets it anyway.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transaction correctness (BEGIN/COMMIT/ROLLBACK) | Persistence (`server/db.js` `SqliteWrapper`) | — | Only the wrapper owns the sql.js handle; app code must never issue raw `BEGIN` |
| Schema migration runner + `schema_version` | Persistence (`server/migrations.js` called from `initDatabase()`) | — | Boot-time, pre-serving, must run before any route is registered |
| Timestamped DB backup | Persistence (`server/backup.js`) | OS/FS | Backup must be taken before the first mutating migration; path derives from `DB_PATH` (Docker volume `/app/data`) |
| Event CRUD + active-event resolution | Domain service (`server/services/eventService.js`) | API (`server/index.js`) | Business rule "exactly one active event, archive-only" lives in the service, not the route |
| `event_id` scoping of reads | Domain queries (`server/raceManager.js` `getFullState()`/`getActiveRace()`) | — | Existing queries live there; scoping must not break coupon JOINs (those go in Phase 15) |
| `participant_number` allocation (`MAX+1`) | Domain service (new `participantService`/`eventService`) | Persistence txn | Allocation must be inside the DB transaction, not in the route |
| Number normalization (`"007"` → `7`) | Shared util (`server/utils/participantNumber.js`) | API validation | Reused by Phase 12 (registration), 13 (BTO), 14 (winner panel) |
| Manajemen Event UI | Browser/Client (`client/src/screens/EventManagementDashboard.jsx`) | API | Pure CRUD form + list; no socket logic beyond existing `STATE_UPDATE` |

## Standard Stack

**Zero new runtime dependencies.** This phase adds no npm package, client or server.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sql.js | ^1.14.2 (installed) | WASM SQLite persistence | Already the validated baseline; SQLite core is **3.49.1** (verified `SELECT sqlite_version()`) — supports window functions, `UPDATE ... FROM`, partial indexes |
| express | ^4.21.2 | New `/api/events` routes | Existing router pattern; do not jump to Express 5 |
| socket.io | ^4.8.1 | Broadcast event changes | Reuse `broadcastFullState()`; optional `event_updated` emit |
| uuid | ^11.0.5 | PKs for `events` / `bto_records` / new rows | Already used everywhere for TEXT PKs |
| Node built-ins (`fs`, `path`) | Node v22.23.2 | Backup file copy, path handling | No library needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:assert` | built-in | Migration tests | Project has **no test framework** — plain `assert` + `node file.test.js` |
| `dotenv` | ^16.4.7 | Read `ALLOW_DESTRUCTIVE_MIGRATION` | Already imported in `server/index.js`; note `db.js` reads `process.env` directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Ordered-array migration runner (`server/migrations.js`) | `PRAGMA user_version` as the version store | `user_version` works (verified `PRAGMA user_version = 3` round-trips) but D-09 explicitly locks a `schema_version` table; use the table |
| `fs.copyFileSync` backup | `VACUUM INTO '<path>'` | **`VACUUM INTO` fails in sql.js** — verified `unable to open database: <path>`. Do not use |
| `export()`-blob backup | `fs.copyFileSync(db.currentPath, backupPath)` | `export()` resets pragmas and, if called mid-transaction, ends it. File copy has no side effects — prefer it |
| Window-function backfill (`ROW_NUMBER() OVER`) | JS loop `for` each row | JS loop = one `save()` per row → whole-file write per row (perf trap). Window function is one statement — verified working |
| Partial unique index for single-active event | App-level check only | Partial index is enforced by SQLite; verified it blocks a 2nd `'active'` and allows many `'archived'` |

**Installation:** none — do not modify `package.json` dependencies in this phase.

**Version verification:**
```bash
npm view sql.js version      # 1.14.2 (installed; matches)
node -e "const p=require('./package.json');console.log(p.dependencies)"
```

## Package Legitimacy Audit

**No external packages are installed by this phase.** All work uses already-installed dependencies (`express`, `socket.io`, `sql.js`, `uuid`, `cors`, `dotenv`) and Node built-ins (`fs`, `path`, `assert`). slopcheck was not required.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| — (none new) | — | — | — | — | — | Not applicable |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
          BOOT (server/index.js, top-level await)
                     │
                     ▼
        initDatabase()  ── server/db.js ────────────────┐
                     │                                  │
        1. db.init()  → load data/tamiya.sqlite (or new)│
        2. CREATE TABLE IF NOT EXISTS (legacy v2.0 set) │
        3. runMigrations(db)  ← server/migrations.js ───┤
             │     read MAX(version) FROM schema_version│
             │     if < LATEST_VERSION:                  │
             │        backupDatabase()  ── server/backup.js
             │            fs.copyFileSync(DB_PATH,       │
             │              data/backups/tamiya-<ts>.sqlite)
             │        db.transaction(() => {            │
             │            DDL: CREATE events, bto_records,
             │              schema_version                │
             │            ALTER users ADD event_id,       │
             │              participant_number (nullable) │
             │            ALTER bracket_matches ADD event_id
             │            CREATE UNIQUE INDEX users(event_id, participant_number)
             │            CREATE UNIQUE INDEX events(status) WHERE status='active'
             │            INSERT events('Event 1','active')  (INSERT OR IGNORE)
             │            UPDATE users SET event_id=<active> (backfill)
             │            UPDATE users SET participant_number=ROW_NUMBER()
             │              OVER (PARTITION BY event_id ...)
             │            INSERT schema_version(1,'event_foundation')
             │        })()   ← one BEGIN / one COMMIT / one save
             │        if fn throws → ROLLBACK, schema_version unchanged
        4. seedInitialData() if SEED_DEMO_DATA=true (must assign event_id + numbers)
                     │
                     ▼
        Express routes registered
             │
   ┌─────────┴───────────────────────────────────────┐
   │ GET  /api/events          listEvents()          │
   │ POST /api/events          createEvent(nama,tgl) │
   │ POST /api/events/:id/activate  (archive others, │
   │                                activate target) │──► db.transaction
   │ POST /api/events/:id/archive   archiveEvent()   │
   └─────────┬───────────────────────────────────────┘
             │ broadcastFullState()  → STATE_UPDATE
             ▼
   Client: Navbar tab "Manajemen Event" → /events
           EventManagementDashboard.jsx (list + create + activate/archive)
           RaceContext reads raceState.activeEvent (Phase 15 wires scoped data)
```

### Recommended Project Structure
```
server/
├── db.js                      # SqliteWrapper (txn fix) + initDatabase() + seed
├── migrations.js              # NEW: versioned runner + DDL + backfill (single source of truth)
├── backup.js                  # NEW: createTimestampedBackup()
├── services/
│   └── eventService.js        # NEW: create/list/activate/archive + getActiveEventId()
├── utils/
│   └── participantNumber.js   # NEW: normalizeParticipantNumber()
├── tests/
│   └── migration-foundation.test.js   # NEW: txn rollback, idempotency, normalization
├── raceManager.js             # getFullState()/getActiveRace(): add active-event scoping
└── index.js                   # /api/events routes
client/src/
├── screens/EventManagementDashboard.jsx   # NEW (Manajemen Event)
├── components/ui/Navbar.jsx               # + nav entry { id:'events', path:'/events' }
└── App.jsx                                # + route branch activeScreen==='events'
```

### Pattern 1: Real, reentrant transactions with deferred save (D-10)

**What:** `SqliteWrapper` gains a transaction-depth counter. `save()` becomes a no-op while a transaction is open; the outermost `transaction()` commits and saves once. Inner `transaction()` calls simply execute the callback (SQLite transactions are flat).
**When to use:** Every write path, globally — this replaces the current fake wrapper.

```js
// server/db.js  (design — verified against sql.js 1.14.2)
class SqliteWrapper {
  constructor() { this.rawDb = null; this.currentPath = null; this._txDepth = 0; }

  save() {
    if (!this.rawDb || !this.currentPath) return;
    if (this._txDepth > 0) return;            // CRITICAL: export() would end the txn
    const data = this.rawDb.export();
    fs.writeFileSync(this.currentPath, Buffer.from(data));
  }

  exec(sql) { this.rawDb.exec(sql); this.save(); }

  prepare(sql) {
    const self = this;
    return {
      all(...p){ const s=self.rawDb.prepare(sql); if(p.length) s.bind(p);
                 const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r; },
      get(...p){ const s=self.rawDb.prepare(sql); if(p.length) s.bind(p);
                 let r=null; if(s.step()) r=s.getAsObject(); s.free(); return r; },
      run(...p){ const s=self.rawDb.prepare(sql); if(p.length) s.bind(p);
                 s.step(); s.free();
                 const changes = self.rawDb.getRowsModified(); // read BEFORE save()
                 self.save(); return { changes }; }
    };
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      const outermost = self._txDepth === 0;
      if (outermost) { self.rawDb.exec('BEGIN'); }
      self._txDepth++;
      try {
        const res = fn(...args);                 // sync callbacks only (all call sites are sync)
        self._txDepth--;
        if (outermost) { self.rawDb.exec('COMMIT'); self.save(); }
        return res;
      } catch (err) {
        self._txDepth--;
        if (outermost) { try { self.rawDb.exec('ROLLBACK'); } catch (_) {} }
        throw err;
      }
    };
  }
}
```

Empirical evidence (this repo, sql.js 1.14.2 → SQLite 3.49.1):

| Probe | Result |
|-------|--------|
| `rawDb.exec('BEGIN')` + insert + `exec('COMMIT')` | works; rows persisted |
| `rawDb.exec('BEGIN')` + insert + `exec('ROLLBACK')` | works; rows reverted |
| nested `BEGIN` | throws `cannot start a transaction within a transaction` |
| `rawDb.export()` with an open transaction | export succeeds **but ends the txn**; later `COMMIT`/`ROLLBACK` throw `cannot commit/rollback - no transaction is active`; uncommitted rows are discarded |
| `PRAGMA foreign_keys` after `export()` | resets to `0` |
| `rawDb.getRowsModified()` | `0` for a 0-match UPDATE, `1` for a 1-match UPDATE (real counts) |
| `ALTER TABLE ... ADD COLUMN` + `ROLLBACK` | column removed (DDL is transactional) |
| `CREATE TABLE`/`CREATE INDEX` + `ROLLBACK` | table/index removed |

### Pattern 2: Versioned, idempotent migration without a framework

**What:** Ordered array of `{ version, name, up(db) }`. Runner reads `MAX(version)` from `schema_version`, applies pending steps in ascending order, one real transaction per step (or one for the batch).
**When to use:** All D-09/D-13 schema work.

```js
// server/migrations.js
export const MIGRATIONS = [
  {
    version: 1,
    name: 'event_schema_and_participant_number',
    up(db) {
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
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_single_active
          ON events(status) WHERE status = 'active';
        CREATE TABLE IF NOT EXISTS bto_records (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          participant_number INTEGER,
          finish_time REAL NOT NULL,
          recorded_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bto_event_time ON bto_records(event_id, finish_time ASC);
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // ADD COLUMN must be guarded: ALTER throws on duplicate column name.
      const cols = (t) => (db.rawDb.exec(`PRAGMA table_info(${t})`)[0]?.values || []).map(r => r[1]);
      if (!cols('users').includes('event_id'))           db.exec('ALTER TABLE users ADD COLUMN event_id TEXT');
      if (!cols('users').includes('participant_number')) db.exec('ALTER TABLE users ADD COLUMN participant_number INTEGER');
      if (!cols('bracket_matches').includes('event_id')) db.exec('ALTER TABLE bracket_matches ADD COLUMN event_id TEXT');

      db.exec(`INSERT OR IGNORE INTO events (id, nama, tanggal, status, jumlah_lap)
               VALUES ('00000000-0000-4000-8000-000000000001', 'Event 1', date('now'), 'active', 3)`);
      const ev = db.prepare("SELECT id FROM events WHERE status='active' LIMIT 1").get().id;

      // Backfill: participants get event_id + sequential number (window fn — SQLite 3.49.1)
      db.exec(`UPDATE users SET event_id = '${ev}' WHERE event_id IS NULL AND role = 'participant'`);
      db.exec(`
        UPDATE users SET participant_number = sub.rn
        FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at, rowid) AS rn
              FROM users WHERE event_id IS NOT NULL AND participant_number IS NULL) sub
        WHERE users.id = sub.id
      `);
      // Bracket rows are scoped to the same default event
      db.exec(`UPDATE bracket_matches SET event_id = '${ev}' WHERE event_id IS NULL`);

      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_event_participant_number ON users(event_id, participant_number)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_bracket_matches_event ON bracket_matches(event_id)');
      db.exec("INSERT OR IGNORE INTO schema_version (version, name) VALUES (1, 'event_schema_and_participant_number')");
    }
  }
];

export function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
             version INTEGER PRIMARY KEY, name TEXT NOT NULL,
             applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const current = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version').get().v;
  const pending = MIGRATIONS.filter(m => m.version > current).sort((a, b) => a.version - b.version);
  if (pending.length === 0) return { applied: 0 };
  const needsBackup = pending.some(m => m.destructive);   // D-11 gate
  if (needsBackup) { assertDestructiveAllowed(); createTimestampedBackup(db.currentPath); }
  for (const m of pending) db.transaction(() => m.up(db))();
  return { applied: pending.length, version: pending.at(-1).version };
}
```

Empirical evidence: the exact sequence above (create tables → ALTER → single-ACTIVE index → `INSERT OR IGNORE` event → window-function backfill → unique index → `schema_version` insert) was executed end-to-end in this repo against sql.js 1.14.2 and produced `participant_number` 1,2 for participants (admin left NULL), no duplicates on re-run, and a clean `ROLLBACK` when a later statement threw.

### Pattern 3: Timestamped backup (D-08)

```js
// server/backup.js
import fs from 'fs';
import path from 'path';

export function timestampTag(d = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function createTimestampedBackup(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return null;         // fresh install: nothing to back up
  const dir = path.join(path.dirname(dbPath), 'backups');      // data/backups  OR  /app/data/backups
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `tamiya-${timestampTag()}.sqlite`);
  fs.copyFileSync(dbPath, target);
  return target;
}
```

Notes:
- Derive from `db.currentPath` (`DB_PATH`), not a hardcoded `data/` — in Docker the volume is `/app/data` (`docker-compose.yml`, `.env.example`). This keeps the backup inside the same volume as the DB.
- Call `db.save()` immediately before copying so the on-disk file is the live state (the wrapper saves on every write anyway, but the DB path may not exist on a fresh install — guard).
- **Do not** use `VACUUM INTO` (fails in sql.js, verified) and **do not** use `export()` for the backup (resets pragmas, ends an open transaction).
- `data/backups/` is NOT served: Express static only maps `client/dist` (`server/index.js:1139-1140`). Safe.
- Add `data/backups/` to `.gitignore` (currently ignores `data/*.sqlite` but **not** `data/backups/*.sqlite`).

### Pattern 4: Canonical participant number (D-04/D-06)

```js
// server/utils/participantNumber.js
export function normalizeParticipantNumber(input) {
  const s = String(input ?? '').trim();
  if (!/^[0-9]+$/.test(s)) return null;      // rejects 'abc', '', '-1', '1.5'
  const n = Number.parseInt(s, 10);
  return n > 0 ? n : null;                    // rejects 0 / '000'
}
// verified: '007' -> 7, ' 7 ' -> 7, '7' -> 7, '0' -> null, '-1' -> null, 'abc' -> null
```

Store `INTEGER`, compare `WHERE participant_number = ?` with the normalized integer. Never `LIKE`, never zero-padded TEXT (D-04).

### Anti-Patterns to Avoid
- **`db.exec('BEGIN')` from app code / migration code:** only `SqliteWrapper.transaction()` may open a transaction. App-level `BEGIN` will not be reentrant and will collide with `transaction()`.
- **`db.save()` inside an open transaction:** `export()` silently ends the transaction and discards uncommitted rows (verified).
- **`ALTER TABLE ... ADD COLUMN x INTEGER UNIQUE`:** throws `Cannot add a UNIQUE column` (verified). Use `CREATE UNIQUE INDEX`.
- **`ALTER TABLE ... ADD COLUMN x TEXT NOT NULL` without default:** throws `Cannot add a NOT NULL column with default value NULL` (verified). New columns must be nullable or carry a constant default.
- **`ALTER TABLE` without a `PRAGMA table_info` guard:** throws `duplicate column name: X` on the second boot (verified). The existing silent `try/catch` pattern works but hides real errors — prefer the guard.
- **JS-loop backfill with one `save()` per row:** writes the whole DB file per row. Use one window-function `UPDATE`.
- **Unnumbered/`event_id IS NULL` participants:** `UNIQUE(event_id, participant_number)` does **not** prevent duplicate `(NULL, 1)` rows (verified) because SQL NULLs are distinct in unique indexes. Every numbered row must have a non-NULL `event_id`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration framework | A bespoke checksum/state machine | `schema_version` table + ordered array + reentrant `transaction()` | 2 migrations exist; a framework is pure overhead and the app has no ORM |
| Sequential number allocation | A JS "find max, then insert" outside a transaction | `SELECT COALESCE(MAX(participant_number),0)+1` inside `db.transaction()` | Race conditions; the existing retry-on-`UNIQUE constraint failed` pattern (`raceManager.js:220`) covers collisions |
| Backup | `VACUUM INTO` / `export()` blob / re-implementing file copy | `fs.copyFileSync` | `VACUUM INTO` fails in sql.js; `export()` has side effects on transactions and pragmas |
| Event scoping | A new `participants` table | `event_id` on existing `users` (D-02) | Locked decision; avoids rewriting every JOIN and FK |
| Active-event uniqueness | App-level "check then insert" only | Partial unique index `ON events(status) WHERE status='active'` | DB-enforced; verified it blocks a 2nd active row and allows unlimited archived rows |
| Date formatting | A date lib | `date('now')` in SQL / `new Date().toISOString()` in JS | Zero new deps (milestone rule) |

**Key insight:** Every "hard" part of this phase is a sql.js-specific pitfall, not a domain problem. The migration logic itself is ~80 lines; the risk is entirely in (1) transaction/save interaction and (2) `ALTER TABLE` restrictions.

## Runtime State Inventory

> Migration phase — runtime state outside git matters.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Live `data/tamiya.sqlite` (host) and Docker named volume `dgdash_racing_data` mounted at `/app/data` (`docker-compose.yml`). Existing `users` rows have no `event_id`/`participant_number`. | Backfill in migration; no vendor names/strings change |
| Live service config | None — no external service holds this schema. `tournament_settings` key/value table exists but is DB-resident, so covered by backup/backfill. | None |
| OS-registered state | None — no Task Scheduler / pm2 / systemd registration references the schema. `docker-compose` service name `dgdash-app` and volume `dgdash_racing_data` are unchanged by this phase. | None |
| Secrets/env vars | `DB_PATH`, `SEED_DEMO_DATA`, `PORT`, `HOST_PORT`, `NODE_ENV` exist. New `ALLOW_DESTRUCTIVE_MIGRATION` must be added to `.env.example` and `docker-compose.yml` (default `false`). | Add env var docs; no key renames |
| Build artifacts | `client/dist` (served statically) — unaffected. No compiled server artifacts (pure Node ESM). Test DBs `data/test_<ts>.sqlite` are transient. | Add `data/backups/` to `.gitignore` |

**Canonical question — after the code is updated, what runtime systems still hold the old shape?** Only the SQLite file itself, and both copies (host `data/` and Docker volume) are handled by the same `DB_PATH`-derived migration path.

## Common Pitfalls

### Pitfall 1: Fake transaction — `save()` inside the transaction kills it
**What goes wrong:** `transaction()` emits `BEGIN`/`COMMIT` but `exec()`/`run()` still call `save()` → `export()`. The `BEGIN` statement itself triggers a save, which ends the transaction; the following writes run in autocommit; `COMMIT` throws `cannot commit - no transaction is active`. Rollback becomes impossible; a failed migration leaves partial DDL committed.
**Why it happens:** `SqliteWrapper.exec()` (db.js:57-60) and `prepare().run()` (db.js:93-100) always `save()`. `export()` is not transaction-safe.
**How to avoid:** `save()` must early-return when `_txDepth > 0`; save once after the outermost `COMMIT`.
**Warning signs:** `cannot commit - no transaction is active` in logs; a migration that "rolled back" still shows new columns.
**Verification:** intentional-failure migration test asserts `schema_version` is empty and the column/table is absent afterwards.

### Pitfall 2: Nested `db.transaction()` throws once transactions are real
**What goes wrong:** `server/index.js:760-788` calls `TicketEngine.issueTicket()` (which opens `db.transaction()`, ticketEngine.js:114) **inside** an outer `db.transaction()`. Same in `raceManager.handleScrutineerAction()` (line 573) → `issueTicket()` (line 602). With a naive real `transaction()`, the inner `BEGIN` throws `cannot start a transaction within a transaction` → marshal winner recording and scrutineer "LOLOS" both fail at runtime, not at boot.
**Why it happens:** the current fake `transaction()` has no `BEGIN`, so nesting is invisible.
**How to avoid:** make `transaction()` reentrant with a depth counter (Pattern 1). Only the outermost call issues `BEGIN`/`COMMIT`/`ROLLBACK`.
**Warning signs:** `cannot start a transaction within a transaction` in a marshal/scrutineer request test.
**Verification:** a test that calls `RaceManager.handleScrutineerAction(regId,'pass')` (which internally nests) and asserts success.

### Pitfall 3: `PRAGMA foreign_keys` cannot be relied upon
**What goes wrong:** Someone "fixes" Pitfall 3 from `.planning/research/PITFALLS.md` by adding `db.exec('PRAGMA foreign_keys = ON')` at init. It appears to work (verified: FK is enforced — `FOREIGN KEY constraint failed`, `ON DELETE CASCADE` fires) **but `export()` resets the pragma to 0**, i.e. the very next `save()` disables it again. FK state then depends on where in the write cycle you look.
**Why it happens:** sql.js `export()` re-creates the connection (this also explains why it ends open transactions).
**How to avoid:** leave FK OFF for this phase. Do the **audit**, not the enforcement: run `PRAGMA foreign_key_check` (works in sql.js) plus explicit orphan queries (`LEFT JOIN ... WHERE child.fk IS NOT NULL AND parent.id IS NULL`) for `bracket_matches.user_id_*`, `race_registrations.user_id`, `coupons.user_id`. Clean orphans with explicit ordered writes.
**Warning signs:** FK behaviour changes after a write; a test passes at boot and fails after a save.
**Note:** the `deferred` list already defers `PRAGMA foreign_keys = ON` — this research confirms that deferral is technically forced, not just cautious.

### Pitfall 4: `ALTER TABLE` restrictions break the obvious migration
**What goes wrong:** `ALTER TABLE users ADD COLUMN participant_number INTEGER UNIQUE` → `Cannot add a UNIQUE column`. `... ADD COLUMN event_id TEXT NOT NULL` → `Cannot add a NOT NULL column with default value NULL`. Re-running `ALTER` → `duplicate column name`.
**How to avoid:** nullable columns only; `CREATE UNIQUE INDEX` for uniqueness; guard with `PRAGMA table_info`; `CREATE ... IF NOT EXISTS` for tables/indexes.
**Verification:** migration test runs twice on the same DB file and asserts no throw + a stable `sqlite_master`.

### Pitfall 5: Unique index creation fails on duplicate data
**What goes wrong:** `CREATE UNIQUE INDEX ... ON users(event_id, participant_number)` throws `UNIQUE constraint failed` if any duplicate already exists (verified).
**How to avoid:** backfill deterministically (`ROW_NUMBER()`), then create the index, in that order, inside the same transaction.
**Warning signs:** migration aborts with `UNIQUE constraint failed` on a real v2.0 DB.

### Pitfall 6: `(NULL, n)` bypasses the per-event uniqueness
**What goes wrong:** `UNIQUE(event_id, participant_number)` does not stop duplicate `(NULL, 1)` rows (SQL treats NULLs as distinct; verified). A numbered participant with NULL `event_id` can be duplicated and can "leak" across events.
**How to avoid:** every numbered row must have a non-NULL `event_id`; allocation always writes both columns; the migration backfills `event_id` before assigning numbers.
**Verification:** test asserts `SELECT count(*) FROM users WHERE participant_number IS NOT NULL AND event_id IS NULL` = 0.

### Pitfall 7: Backfill covers the wrong rows / seed forgets the new columns
**What goes wrong:** Backfilling numbers for `admin`/`scrutineer` rows pollutes the participant numbering (these are not entries). Conversely, `seedInitialData()` (db.js:277-350) inserts users with `INSERT INTO users (id, name, email, ..., role, is_virtual)` — it does not know about `event_id`/`participant_number`, so a fresh demo DB ends up with NULL numbers and the first `MAX+1` allocation still works but the seeded racers have no number.
**How to avoid:** define the backfill scope explicitly (recommended: `role = 'participant'`; `admin`/`scrutineer` stay NULL) and update `seedInitialData()` to insert `event_id` + sequential `participant_number` for seeded racers. Document the choice.
**Verification:** `SEED_DEMO_DATA=true` boot test asserts every `role='participant'` row has a non-NULL `participant_number` and that numbers are unique per event.

### Pitfall 8: Boot regression — v2.0 DB must still load
**What goes wrong:** an exception in `runMigrations()` (e.g. an eager `PRAGMA` that fails, an `ALTER` on a table absent from some v2.0 DB, or a non-null constraint) aborts `initDatabase()` before routes exist → server never listens.
**How to avoid:** migrations must be order-safe and tolerant (guards + `IF NOT EXISTS`); `runMigrations()` should log and rethrow only after a successful `ROLLBACK`; the migration must not assume any table beyond the ones `initDatabase()` itself creates. Keep all legacy `CREATE TABLE IF NOT EXISTS` statements running (Phase 17 removes them).
**Verification:** boot test against a copy of a v2.0-shaped DB fixture; assert `/api/health` and `/api/state` both 200 and `schema_version.version = 1`.

### Pitfall 9: Event scoping silently breaks the still-coupon-coupled state queries
**What goes wrong:** adding `event_id` filters to `getActiveRace()` / `getFullState()` touches the same methods that JOIN `coupons` (`raceManager.js:35`, `281`, `index.js:81`). A careless rewrite of these queries (removing the coupon JOIN early, or referencing `activeEvent` before it exists) freezes every `STATE_UPDATE`.
**How to avoid:** this phase stays additive — keep the coupon JOINs and `ticketStats` intact (MIG-03/Phase 15 removes them). Only *add* `event_id` columns, backfill them, and scope the reads that are already event-agnostic (`bracket_matches`), leaving legacy race queries untouched. Acceptance: `/api/state` returns 200 and one bracket advance still works.
**Warning signs:** `no such table: coupons`; `Cannot read properties of null` on `activeEvent`; `/api/users` 500.

## Code Examples

### Transaction rollback proof (test shape)
```js
// server/tests/migration-foundation.test.js (sketch)
import { initDatabase } from '../db.js';
import db from '../db.js';
import assert from 'assert';

process.env.DB_PATH = `./data/test_mig_${Date.now()}.sqlite`;
await initDatabase();

// 1. real rollback
const before = db.prepare('SELECT COUNT(*) c FROM events').get().c;
assert.throws(() => db.transaction(() => {
  db.prepare("INSERT INTO events (id, nama, status) VALUES (?,?, 'archived')").run('tmp', 'Tmp');
  throw new Error('boom');
})());
assert.strictEqual(db.prepare('SELECT COUNT(*) c FROM events').get().c, before, 'rollback must undo the insert');

// 2. nested transaction must NOT throw (TicketEngine/scrutineer path)
const nested = db.transaction(() => db.transaction(() => 42)());
assert.strictEqual(nested, 42);

// 3. normalization
assert.strictEqual(normalizeParticipantNumber('007'), 7);
assert.strictEqual(normalizeParticipantNumber(' 7 '), 7);
assert.strictEqual(normalizeParticipantNumber('abc'), null);

// 4. single active event, many archived
assert.throws(() => db.prepare("INSERT INTO events (id,nama,status) VALUES ('e2','E2','active')").run());

// 5. version recorded once
assert.strictEqual(db.prepare('SELECT MAX(version) v FROM schema_version').get().v, 1);
assert.strictEqual(db.prepare('SELECT COUNT(*) c FROM schema_version').get().c, 1);
```

### Real-changes `run()` (D-10 note)
```js
run(...p) {
  const s = this.rawDb.prepare(sql); if (p.length) s.bind(p);
  s.step(); s.free();
  const changes = this.rawDb.getRowsModified();  // must be read BEFORE save()/export()
  this.save();
  return { changes };
}
```
Verified: `getRowsModified()` returns `0` for a 0-match UPDATE and `1` for a 1-match UPDATE. This makes `raceManager.lockRace`'s existing `res.changes === 0` guard (line 295) finally correct — but run the full suite, since previously every `run()` returned `1`.

### Active-event resolver
```js
// server/services/eventService.js
export function getActiveEvent(db) {
  return db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get() || null;
}
export function setActiveEvent(db, id) {
  return db.transaction(() => {
    const target = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
    if (!target) throw new Error('Event tidak ditemukan');
    db.prepare("UPDATE events SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE status='active' AND id != ?").run(id);
    db.prepare("UPDATE events SET status='active', updated_at=CURRENT_TIMESTAMP WHERE id = ?").run(id);
    return getActiveEvent(db);
  })();
}
```
Order matters: archive the old active **before** promoting the new one, otherwise the partial unique index on `status='active'` rejects the second active row (verified: `UNIQUE constraint failed: events.status`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `db.transaction()` = call fn then save (no BEGIN) | Real `BEGIN`/`COMMIT`/`ROLLBACK`, reentrant, deferred save | This phase (D-10) | First time the app has rollback; latent bugs that relied on partial writes will surface — run the full suite |
| `DROP`-less "no version tracking" | `schema_version` table + ordered migrations | This phase (D-09) | Enables Phase 15/17 destructive steps to be gated and reversible-by-backup |
| `serial_number` (on the coupon sheet) as the human key | `participant_number` (INTEGER, per event) on the participant entry | This phase (MIG-02) | New identity primitive for Phases 12/13/14 |
| Global single tournament | `event_id`-scoped data, one active event | This phase (D-01/D-03) | Numbers reset per event; history archived not deleted |

**Deprecated/outdated (do not repeat):** the `.planning/research/PITFALLS.md` recommendation "Enable `db.exec('PRAGMA foreign_keys = ON')` once at init" — verified not durable under sql.js `export()`. Treat FK as audit-only.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Backfill scope = `role = 'participant'` only (admin/scrutineer get no `participant_number`) | Pitfall 7, Code Examples | Low — easily changed; affects only which rows get numbers |
| A2 | `events.tanggal` stored as `TEXT` ISO `YYYY-MM-DD` | Pattern 2 | Low — display-only in this phase |
| A3 | Default event is materialized with the fixed id `00000000-0000-4000-8000-000000000001` and name `Event 1` (D-13) | Pattern 2 | Low — deterministic id simplifies later phases; name is user-editable |
| A4 | Migration runs as a single batch; only one migration (version 1) exists in this phase | Pattern 2 | Low |
| A5 | `ALLOW_DESTRUCTIVE_MIGRATION` gate has no destructive step to guard in Phase 11 (all steps additive); it is infrastructure for Phases 15/17 | Pattern 2, Security | Low — criterion 3 is still met by wiring + documenting the flag |
| A6 | Event-scoping of `users`/`bracket_matches` reads is applied minimally in this phase; legacy `races`/`race_registrations`/coupon queries are left untouched until MIG-03 (Phase 15) | Pitfall 9 | Medium — if the planner over-scopes here, `STATE_UPDATE` can break |

## Open Questions

1. **Should `/api/events` mutations also emit a dedicated socket event (e.g. `event_updated`), or is `broadcastFullState()` enough?**
   - What we know: `broadcastFullState()` already fires on every mutation and clients render `raceState`.
   - What's unclear: whether Phase 15's scoped state will need a distinct signal.
   - Recommendation: emit `broadcastFullState()` only; add `event_updated` in Phase 15 if a consumer needs it.

2. **How much of `getFullState()` should expose the active event now?**
   - What we know: criterion 5 only requires "v2.0 DB still readable + server boots".
   - What's unclear: whether the Manajemen Event screen should read events from `STATE_UPDATE` or from `GET /api/events`.
   - Recommendation: screen uses `GET /api/events` (independent of the Phase 15 state-contract change); add `activeEvent` to `getFullState()` as an *additive* field.

3. **Backfill ordering for `users.created_at` ties.**
   - What we know: `ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at, rowid)` is deterministic (verified).
   - What's unclear: whether organizers expect numbering to follow roster/import order.
   - Recommendation: use `ORDER BY created_at, rowid`; Phase 12 imports can allocate fresh numbers anyway.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Runtime + tests | ✓ | v22.23.2 | — |
| npm | Install/scripts | ✓ | 10.9.8 | — |
| sql.js (WASM) | Persistence | ✓ | 1.14.2 installed (SQLite core 3.49.1) | — |
| Docker | Deployment parity (volume backup path) | ✓ | 29.7.2 | Run locally with `DB_PATH` |
| Host `sqlite3` CLI (anaconda) | Manual DB inspection only | ✓ | present at `C:\ProgramData\anaconda3\Library\bin\sqlite3.exe` | Use sql.js via node |
| Test framework | Validation | ✗ (none used by design) | — | Plain `node:assert` + `node <file>.test.js` (project convention) |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** test framework — none needed; the project convention is Node built-ins.

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (file does not exist) → treat validation as **enabled**.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in: `node:assert` + `node <file>.test.js` (no Jest/Vitest) |
| Config file | none — each test file self-bootstraps (`process.env.DB_PATH`, `SEED_DEMO_DATA`) |
| Quick run command | `node server/tests/migration-foundation.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MIG-01 | `db.transaction()` rolls back on throw | unit/integration | `node server/tests/migration-foundation.test.js` | ❌ Wave 0 |
| MIG-01 | Nested `transaction()` does not throw (marshal/scrutineer path) | integration | same file, plus `node server/tests/marshal-flow.test.js` | ❌ Wave 0 (new assertion) |
| MIG-01 | Timestamped backup file created at `data/backups/tamiya-<ts>.sqlite` | unit | same file | ❌ Wave 0 |
| MIG-01 | Migration idempotent: second `runMigrations()` applies 0 steps, `schema_version` count = 1 | integration | same file | ❌ Wave 0 |
| MIG-02 | `participant_number` column + `UNIQUE(event_id, participant_number)` index exist | schema assertion | same file (`PRAGMA table_info`, `sqlite_master`) | ❌ Wave 0 |
| MIG-02 | `normalizeParticipantNumber('007'/' 7 '/'7') === 7`; invalid → null | unit | same file | ❌ Wave 0 |
| MIG-02 | Unique index rejects duplicate `(event_id, n)`; allows duplicates on different events | integration | same file | ❌ Wave 0 |
| MIG-02 | No numbered row has NULL `event_id` | integration | same file | ❌ Wave 0 |
| EVNT-01 | `POST /api/events` creates an event with nama/tanggal | integration (service-level) | same file (call `createEvent`) | ❌ Wave 0 |
| EVNT-02 | Exactly one active event; activating another archives the previous | integration | same file | ❌ Wave 0 |
| EVNT-04 | All participants/bracket/BTO rows carry `event_id`; reads filter by active event | integration | same file | ❌ Wave 0 |
| — | v2.0 DB boot safety (`/api/state` shape unchanged, no exception) | smoke | existing `node server/tests/race-flow.test.js` + `bracket-3lane.test.js` | ✅ existing |

**Regression suite (must stay green):** `race-flow.test.js`, `bracket-3lane.test.js`, `bracket-dashboard-render.test.js`, `camera-scanner.test.js`, `coupon-package.test.js`, `marshal-flow.test.js`, `ticket-engine-flow.test.js`. The transaction fix changes runtime behaviour globally (real rollback + real `changes` counts) — these must be executed after the wrapper change, before any migration work continues.

### Sampling Rate
- **Per task commit:** `node server/tests/migration-foundation.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green + boot against a v2.0-shaped DB fixture + `/api/health` and `/api/state` both 200.

### Wave 0 Gaps
- [ ] `server/tests/migration-foundation.test.js` — covers MIG-01, MIG-02, EVNT-01/02/04
- [ ] `server/backup.js` + `server/migrations.js` + `server/services/eventService.js` + `server/utils/participantNumber.js` — modules the test imports
- [ ] `package.json` `test` script — append `&& node server/tests/migration-foundation.test.js` (script currently hardcodes 6 files and omits `bracket-3lane.test.js`)
- [ ] No framework install needed (Node `assert`)

## Security Domain

> `security_enforcement` is not configured (no `.planning/config.json`) → treat as enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Pre-existing trusted-LAN assumption (documented in PROJECT/REQUIREMENTS "Out of Scope: Auth / login / peran") |
| V3 Session Management | no | Client keeps `localStorage.tamiya_user`; unchanged this phase |
| V4 Access Control | no | No roles; documented venue-LAN trust boundary (EXTR-03 operator PIN deferred) |
| V5 Input Validation | yes | `nama`/`catatan` length + type checks on `POST /api/events`; `normalizeParticipantNumber()` returns `null` for non-numeric; bound parameters for every value |
| V6 Cryptography | no | No secrets introduced; backup files are plain DB copies (no encryption expected) |

### Known Threat Patterns for Express + sql.js + filesystem-backup stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `event` fields | Tampering | `db.prepare('... WHERE id = ?').get(id)` — never string-interpolate user input. `participantNumber.normalize()` guarantees an integer before interpolation-free binding |
| Path traversal via backup filename | Tampering | Backup name is generated from `new Date()` only; never from `nama`/user input. Backup dir = `path.dirname(DB_PATH) + '/backups'` |
| Unbounded `nama`/`catatan` payload → DB bloat | Denial of Service | Validate/trim lengths (e.g. `nama` ≤ 100, `catatan` ≤ 500) at the route before insert |
| Accidental destructive migration in production | Tampering / Elevation | `ALLOW_DESTRUCTIVE_MIGRATION` defaults false; destructive steps skipped and logged when unset (D-11) |
| Backup files exposed over HTTP | Information Disclosure | Verified: Express static only serves `client/dist` (`index.js:1139-1140`); `data/` is not mapped |
| Cross-event data leakage after scoping | Information Disclosure | Every read must filter `WHERE event_id = <activeEvent.id>`; assert no query returns cross-event rows in tests |

## Sources

### Primary (HIGH confidence)
- Empirical verification in this repo against installed `sql.js@1.14.2` (SQLite core **3.49.1**) — transaction BEGIN/COMMIT/ROLLBACK, nested BEGIN failure, `export()` ending transactions and resetting pragmas, `getRowsModified`, `ALTER TABLE` UNIQUE/NOT-NULL restrictions, `CREATE UNIQUE INDEX` over duplicates, multiple NULLs under unique index, `(NULL,n)` duplicates, partial unique index on `status='active'`, window functions, `UPDATE ... FROM`, `VACUUM INTO` failing, `PRAGMA foreign_keys` enforcement + `foreign_key_check`, `PRAGMA user_version`
- `server/db.js` — `SqliteWrapper` (`init`, `save`, `exec`, `prepare().run()`, `transaction`), `initDatabase()` silent `ALTER` block (lines 254-268), `seedInitialData()` (lines 277-350)
- `server/index.js` — route surface, `broadcastFullState()` (line 46), nested `db.transaction` wrapping `TicketEngine.issueTicket` (lines 760-788), `/api/users` coupon JOIN (line 81), static mapping (lines 1139-1140)
- `server/raceManager.js` — `getActiveRace()` coupon JOIN (line 35), `getFullState()` coupon/ticket coupling (lines 47-134), `lockRace` `res.changes === 0` guard (line 295), `handleScrutineerAction` nested txn (lines 573-618)
- `server/ticketEngine.js` — `db.transaction` inside `issueTicket` (line 114) and `lockQualifyingStage` (line 23)
- `server/tests/race-flow.test.js` — test harness convention (`DB_PATH`, `SEED_DEMO_DATA`, `node:assert`, teardown)
- `package.json`, `client/package.json`, `docker-compose.yml`, `.env.example`, `.gitignore` — dependency + deployment facts
- `.planning/phases/11-event-schema-migration-foundation/11-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `STACK.md`, `PITFALLS.md`, `ARCHITECTURE.md` — milestone research; **one correction carried forward: the `PRAGMA foreign_keys = ON` recommendation is not durable in sql.js (see Pitfall 3)**
- `.planning/codebase/ARCHITECTURE.md`, `TESTING.md` — layer boundaries, test conventions

### Tertiary (LOW confidence)
- None. No Context7/docs lookup was required: this phase installs no library and all sql.js behaviour was verified empirically against the installed build.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, versions read from the installed tree and `package.json`
- Architecture (transaction/migration design): HIGH — every sql.js claim empirically verified in this repo
- Pitfalls: HIGH — grounded in current source (nested `db.transaction` call sites read directly) plus empirical probes; the one MEDIUM item is the exact scoping extent of event-filtered reads (A6)
- Schema/event-table specifics: MEDIUM — these are explicitly the agent's discretion in CONTEXT.md and are flagged in the Assumptions Log

**Research date:** 2026-09-17
**Valid until:** ~2026-10-17 (stable stack; re-verify only if `sql.js` or Node is upgraded)