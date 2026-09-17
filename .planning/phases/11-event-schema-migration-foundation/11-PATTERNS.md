# Phase 11: Event & Schema Migration Foundation - Pattern Map

**Mapped:** 2026-09-17
**Files analyzed:** 13 (8 server/config/test, 3 client, 2 deployment-config)
**Analogs found:** 10 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/db.js` (modify) | persistence/wrapper | CRUD + transaction | itself (`SqliteWrapper` lines 15-116) | exact (self) |
| `server/migrations.js` (new) | migration/service | batch + DDL | `server/ticketEngine.js` (`lockQualifyingStage` txn block) | role-match |
| `server/backup.js` (new) | utility | file-I/O | `server/db.js` `save()` (lines 42-55) | partial-match |
| `server/services/eventService.js` (new) | service | CRUD | `server/ticketEngine.js` static-method class | role-match |
| `server/utils/participantNumber.js` (new) | utility | transform | none (no server utils dir yet) | no analog |
| `server/index.js` (modify) | controller/routes | request-response | itself (`/api/coupon-packages` block lines 173-442) | exact (self) |
| `server/tests/migration-foundation.test.js` (new) | test | integration | `server/tests/race-flow.test.js` | exact |
| `package.json` (modify) | config | — | itself (`scripts.test` line 15) | exact (self) |
| `.gitignore` (modify) | config | — | itself (line 4-5) | exact (self) |
| `.env.example` (modify) | config | — | itself (lines 14-19) | exact (self) |
| `docker-compose.yml` (modify) | config | — | itself (existing `DB_PATH`/`SEED_DEMO_DATA` env) | exact (self) |
| `client/src/screens/EventManagementDashboard.jsx` (new) | component/screen | CRUD (fetch) | `client/src/screens/CashierDashboard.jsx` | exact |
| `client/src/components/ui/Navbar.jsx` (modify) | component | — | itself (`screens[]` lines 44-53) | exact (self) |
| `client/src/App.jsx` (modify) | component | — | itself (router branch lines 18-48) | exact (self) |

---

## Pattern Assignments

### `server/db.js` — SqliteWrapper real transaction (D-10)

**Analog:** itself

**Current broken wrapper** (lines 42-116) — `save()` always runs `export()`; `run()` always returns `{ changes: 1 }`; `transaction()` only calls `fn` then `save()` (no BEGIN):
```js
// lines 42-55 (current save)
save() {
  if (!this.rawDb || !this.currentPath) return;
  try {
    const targetDir = path.dirname(this.currentPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const data = this.rawDb.export();
    fs.writeFileSync(this.currentPath, Buffer.from(data));
  } catch (err) { console.error('Error saving SQLite database to disk:', err); }
}

// lines 104-115 (current fake transaction)
transaction(fn) {
  const self = this;
  return (...args) => {
    try { const res = fn(...args); self.save(); return res; }
    catch (err) { throw err; }
  };
}
```

**Required change** — add `this._txDepth = 0` in constructor (line 16-20), guard `save()` to early-return when `_txDepth > 0`, capture `getRowsModified()` before `save()` in `run()`, make `transaction()` reentrant. Design is fully specified in `11-RESEARCH.md` §"Pattern 1" (lines 223-269). Key excerpts:
```js
save() {
  if (!this.rawDb || !this.currentPath) return;
  if (this._txDepth > 0) return;            // CRITICAL: export() would end the txn
  const data = this.rawDb.export();
  fs.writeFileSync(this.currentPath, Buffer.from(data));
}
// prepare().run — changes read BEFORE save()
run(...p){ const s=this.rawDb.prepare(sql); if(p.length) s.bind(p);
           s.step(); s.free();
           const changes = this.rawDb.getRowsModified();
           self.save(); return { changes }; }
transaction(fn) {
  const self = this;
  return (...args) => {
    const outermost = self._txDepth === 0;
    if (outermost) self.rawDb.exec('BEGIN');
    self._txDepth++;
    try {
      const res = fn(...args);
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
```

**Boot wiring pattern** (`initDatabase()`, lines 120-275): keep the existing `db.exec(CREATE TABLE IF NOT EXISTS ...)` legacy block intact, replace the silent `try/catch ALTER` block (lines 254-268) with `runMigrations(db)` call, keep `seedInitialData()` gated by `SEED_DEMO_DATA` (lines 272-274). `seedInitialData()` inserts (lines 282-318) must add `event_id` + `participant_number`.

**Constraint enforcement** (`PRAGMA table_info` guard over silent try/catch) — from RESEARCH Pattern 2:
```js
const cols = (t) => (db.rawDb.exec(`PRAGMA table_info(${t})`)[0]?.values || []).map(r => r[1]);
if (!cols('users').includes('event_id')) db.exec('ALTER TABLE users ADD COLUMN event_id TEXT');
```

---

### `server/migrations.js` (new) — versioned runner

**Analog:** `server/ticketEngine.js` `lockQualifyingStage` (lines 22-58) — the established "build a `db.transaction(() => {...})` closure, invoke once, return result" shape:
```js
static lockQualifyingStage(io = null) {
  const lockTx = db.transaction(() => {
    const existing = db.prepare("SELECT key FROM tournament_settings WHERE key = 'qualifying_status'").get();
    if (existing) { db.prepare("UPDATE ...").run(); }
    else { db.prepare("INSERT ...").run(); }
    const totalTickets = db.prepare("SELECT COUNT(*) as count ...").get()?.count || 0;
    return { success: true, is_locked: true, total_tickets: totalTickets };
  });
  const result = lockTx();    // invoked once
  if (io) { io.emit('qualifying:locked', {...}); }
  return result;
}
```
Adopt the same `const tx = db.transaction(fn); tx();` invocation style for `runMigrations()` — per-step `for (const m of pending) db.transaction(() => m.up(db))();`.

**DDL + backfill pattern:** `CREATE TABLE IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS` matches `initDatabase()` (lines 123-252). Partial unique index for single active event and `ROW_NUMBER()` window backfill are specified in `11-RESEARCH.md` §"Pattern 2" (lines 290-369).

**Destructive gate (D-11)** — read env directly like `db.js`, not via dotenv import:
```js
if (process.env.ALLOW_DESTRUCTIVE_MIGRATION !== 'true') { /* skip + log */ }
```

---

### `server/backup.js` (new) — timestamped DB copy (D-08)

**Analog:** `server/db.js` `save()` (lines 42-55) — same `fs`/`path` usage and dir-create idiom:
```js
const targetDir = path.dirname(this.currentPath);
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
```

**Pattern to copy** — derive path from `db.currentPath` (`DB_PATH`), guard fresh-install, `fs.copyFileSync`:
```js
export function createTimestampedBackup(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return null;     // fresh install: nothing to back up
  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `tamiya-${timestampTag()}.sqlite`);
  fs.copyFileSync(dbPath, target);
  return target;
}
```
Do NOT use `VACUUM INTO` or `export()` (both verified broken/side-effecting in sql.js — RESEARCH lines 122-123, 396).

---

### `server/services/eventService.js` (new) — event CRUD service

**Analog:** `server/ticketEngine.js` (static-method class over shared `db` singleton, `import db from './db.js'`) + `server/index.js` mutation handlers.

**Imports + module shape** (from `ticketEngine.js` lines 1-5):
```js
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

export class EventService { static ... }
```
`server/services/` is a new dir; use relative `../db.js`.

**Business-rule-in-service pattern** — errors as Indonesian `Error`, route catches and formats (from `raceManager.js` lines 137-140):
```js
if (!['A','B','C'].includes(lane)) throw new Error('Jalur tidak valid (harus A, B, atau C)');
```

**Activate pattern (D-03/D-14)** — archive-before-promote, from RESEARCH lines 559-566:
```js
export function setActiveEvent(db, id) {
  return db.transaction(() => {
    const target = db.prepare('SELECT id FROM events WHERE id = ?').get(id);
    if (!target) throw new Error('Event tidak ditemukan');
    db.prepare("UPDATE events SET status='archived', ... WHERE status='active' AND id != ?").run(id);
    db.prepare("UPDATE events SET status='active', ... WHERE id = ?").run(id);
    return getActiveEvent(db);
  })();
}
```
Order matters — partial unique index rejects second active row.

**Participant number allocation (D-05)** — inside txn, mirror `TicketEngine.issueTicket` max+1 lookup (`ticketEngine.js` lines 121-122):
```js
const maxRow = db.prepare('SELECT COALESCE(MAX(ticket_number), 0) + 1 as next_num FROM next_round_tickets').get();
const ticketNumber = maxRow?.next_num || 1;
```

---

### `server/utils/participantNumber.js` (new) — normalization

**Analog:** none (no `server/utils/` exists). Use RESEARCH §"Pattern 4" (lines 402-411) verbatim:
```js
export function normalizeParticipantNumber(input) {
  const s = String(input ?? '').trim();
  if (!/^[0-9]+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  return n > 0 ? n : null;
}
```
ESM `export function`, Indonesian error strings elsewhere remain the convention. Planner should mark "no analog" and cite RESEARCH.

---

### `server/index.js` (modify) — `/api/events` routes

**Analog:** itself — `/api/coupon-packages` block (lines 173-442).

**Imports pattern** (lines 8-11): add service/util imports beside `db, { initDatabase }`, `RaceManager`, `TicketEngine`, `uuid`.

**Route + envelope + try/catch pattern** (lines 64-88, 173-205):
```js
app.get('/api/state', (req, res) => {
  try {
    const state = RaceManager.getFullState();
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```
Success envelope `{ success: true, data }`; error envelope `{ success: false, error: err.message }`. Validation failures use `400`, missing entity `404`, conflict `409` (lines 249-252, 367-401).

**Mutation + broadcast pattern** (lines 326-352):
```js
db.transaction(() => { /* writes */ })();
io.emit('coupon_package_updated', {...});
broadcastFullState();
res.status(201).json({ success: true, data: {...} });
```
Apply to create/activate/archive event: mutate inside `db.transaction`, then `broadcastFullState()`. Use `res.status(201)` for create (line 352).

**Route registration for shared handler** (lines 357-358): `app.post('/api/coupon-packages', handleRegisterPackage);` — pattern for `app.post('/api/events', handleCreateEvent)`.

---

### `server/tests/migration-foundation.test.js` (new)

**Analog:** `server/tests/race-flow.test.js` (exact harness).

**Harness pattern** (lines 1-16, 193-202):
```js
import { initDatabase } from '../db.js';
import db from '../db.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uniqueTestDb = path.join(__dirname, `../../data/test_${Date.now()}.sqlite`);
process.env.DB_PATH = uniqueTestDb;
process.env.SEED_DEMO_DATA = 'true';

async function runTests() {
  console.log('🧪 ...');
  await initDatabase();
  // assert.* calls, console.log('✓ [n/N] ...')
  if (fs.existsSync(uniqueTestDb)) { try { fs.unlinkSync(uniqueTestDb); } catch(e) {} }
}
runTests().catch(err => { console.error('❌ Test failed:', err); process.exit(1); });
```
ENV set BEFORE `initDatabase()`. Cleanup via `fs.unlinkSync`. Assertion style: `assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`, `assert.throws` (race-flow lines 25, 39, 130). Test assertions to implement are enumerated in RESEARCH §"Transaction rollback proof" (lines 506-539).

---

### `package.json` (modify)

**Analog:** itself line 15. `test` script chains files with `&&` and hardcodes 6 files (omits `bracket-3lane.test.js`). Append `&& node server/tests/migration-foundation.test.js`.

---

### `.gitignore` (modify)

**Analog:** itself lines 4-5 (`data/*.sqlite`, `data/*.sqlite-journal`). Add `data/backups/` (RESEARCH line 398 — `data/*.sqlite` does not cover nested `backups/`).

---

### `.env.example` (modify)

**Analog:** itself lines 14-19. Add `ALLOW_DESTRUCTIVE_MIGRATION=false` beside `DB_PATH`/`SEED_DEMO_DATA`.

### `docker-compose.yml` (modify)

Add `ALLOW_DESTRUCTIVE_MIGRATION=false` to the app service environment alongside existing `DB_PATH`/`SEED_DEMO_DATA` mapping.

---

### `client/src/screens/EventManagementDashboard.jsx` (new)

**Analog:** `client/src/screens/CashierDashboard.jsx` (exact — list + create form + status actions).

**Imports + component shape** (lines 1-24):
```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { /* lucide icons */ } from 'lucide-react';
import clsx from 'clsx';

export function EventManagementDashboard() { ... }
```

**Fetch + envelope pattern** (lines 51-75):
```js
const fetchEvents = useCallback(async () => {
  setLoading(true);
  try {
    const res = await fetch('/api/events');
    const data = await res.json();
    if (data.success) setEvents(data.data);
    else setError(data.error || 'Gagal memuat daftar event');
  } catch (e) {
    setError('Koneksi ke server database turnamen terputus');
  } finally { setLoading(false); }
}, []);
useEffect(() => { fetchEvents(); }, [fetchEvents]);
```

**Realtime sync pattern** (lines 83-98): subscribe `socket.on('STATE_UPDATE', fetchEvents)` with `socket.off` cleanup. Screen reads `GET /api/events` (per RESEARCH Open Q2), not `raceState`.

---

### `client/src/components/ui/Navbar.jsx` (modify)

**Analog:** itself. Add entry to `screens[]` (lines 44-53) — `{ id: 'events', label: 'Manajemen Event', icon: Calendar, color: 'cyan', path: '/events' }`; import the icon in the `lucide-react` block (lines 4-17). Tab rendering already generic (lines 156-174).

### `client/src/App.jsx` (modify)

**Analog:** itself. Add route detection in the `activeScreen` initializer (lines 18-32): `if (path === '/events' || hash === '#events') return 'events';` and render branch (lines 41-48): `{activeScreen === 'events' && <EventManagementDashboard />}`, plus import (lines 8-15).

---

## Shared Patterns

### JSON response envelope + route error handling
**Source:** `server/index.js` (lines 64-70, 202-204, 249-252, 353-355)
**Apply to:** all `/api/events` routes
```js
res.json({ success: true, data: ... });                                  // success
res.status(400).json({ success: false, error: 'Nama wajib diisi' });     // validation
res.status(500).json({ success: false, error: err.message });            // catch
```

### Real transaction ownership
**Source:** `server/db.js` `SqliteWrapper.transaction()` (to be rewritten)
**Apply to:** all writes — event create/activate/archive, number allocation, migration steps, backfill
```js
db.transaction(() => { /* sync writes only */ })();
```
Never call `db.exec('BEGIN')` directly; never call `db.save()` inside an open txn (RESEARCH Anti-Patterns lines 415-422).

### DB singleton import
**Source:** `server/raceManager.js` line 1, `server/ticketEngine.js` line 2
**Apply to:** migrations.js, backup.js, eventService.js
```js
import db from './db.js';   // or '../db.js' from subdirs
```

### Env flag read
**Source:** `server/db.js` line 272 (`process.env.SEED_DEMO_DATA`), `server/index.js` line 1 (`dotenv/config`)
**Apply to:** `ALLOW_DESTRUCTIVE_MIGRATION` (db-resident modules read `process.env` directly; `dotenv` already loaded by `index.js` entrypoint).

### Indonesian error strings
**Source:** `server/raceManager.js` line 140, `server/index.js` line 368
**Apply to:** all thrown business errors and route error messages (`'Event tidak ditemukan'`, etc.).

---

## No Analog Found

Files with no close match (planner uses RESEARCH patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/utils/participantNumber.js` | utility | transform | No `server/utils/` dir exists; use RESEARCH §"Pattern 4" (lines 402-411) |
| `server/backup.js` | utility | file-I/O | No generic file-utility module exists; only `db.js save()` fs idiom is a partial match |
| `server/migrations.js` | migration | batch/DDL | No migration module exists; pattern is `ticketEngine.js` txn-closure + `db.js` DDL idioms + RESEARCH §"Pattern 2" |

## Metadata

**Analog search scope:** `server/`, `server/tests/`, `server/services` (absent), `client/src/screens/`, `client/src/components/`, `client/src/context/`, repo root config
**Files scanned:** 13 source/config files read; routes enumerated across `server/index.js` (37 handlers)
**Pattern extraction date:** 2026-09-17