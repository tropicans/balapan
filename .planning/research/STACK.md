# Stack Research

**Domain:** Physical-only tournament flow (v3.0) — removal of scan/coupon modules, sequential participant numbering, manual BTO entry
**Researched:** 2026-09-17
**Confidence:** HIGH (verified against local source tree + npm registry current versions)

## Bottom Line

**Zero new runtime dependencies required.** All three v3.0 capabilities are net *removals* or pure logic on the validated stack. Do not add a QR/scanner lib, a form lib, a validation lib, or a state manager. The correct v3.0 stack change is a **dependency prune plus a schema migration**, not an addition.

- (a) Remove coupon/QR modules → delete files + uninstall 2 client deps (`html5-qrcode`, `qrcode.react`) + prune 1 dead dep (`tailwind-merge`).
- (b) Auto-assigned participant numbers → new `participant_number INTEGER UNIQUE` column on `users`, assigned by `MAX+1` inside the existing `db.transaction()` wrapper. No library.
- (c) Manual BTO entry → new `bto_records` table + one REST endpoint + one socket event. Reuses existing `express`, `socket.io`, `sql.js` already in place. No library.

## Recommended Stack

### Core Technologies (UNCHANGED — do not re-research)

| Technology | Version (current) | Purpose | Why Kept |
|------------|-------------------|---------|----------|
| React | ^18.3.1 | Frontend UI | Validated baseline; no v3.0 requirement touches it |
| Vite | ^6.0.11 | Build/dev server | Validated baseline |
| TailwindCSS | ^3.4.17 | Styling | Validated baseline; all existing classes stay |
| Node.js ESM + Express | express ^4.21.2 (npm latest 5.2.1 exists — stay on 4) | HTTP API | Existing routers extended, not replaced |
| Socket.IO | ^4.8.1 (npm latest 4.8.3) | Real-time state broadcast | `broadcastFullState()` already pushes bracket/BTO; reuse |
| sql.js (WASM SQLite) | ^1.14.2 | Persistence | Already has transaction wrapper + save-to-disk; new tables fit |
| uuid | ^11.0.5 | PK generation | Reuse for new `bto_records` PKs |

**Deliberately NOT upgraded:** Express 4 → 5, Socket.IO 4.8.1 → 4.8.3, framer-motion, lucide-react. Version bumps are orthogonal to v3.0 and add regression risk to a 4-milestone-old validated system. Bump only if a security advisory demands it.

### Supporting Libraries (client) — KEEP

| Library | Version | Purpose | Why Keep in v3.0 |
|---------|---------|---------|------------------|
| `framer-motion` | ^12.4.7 (npm latest 13.4.0) | Modal animation | Still used by `BtoCelebrationModal.jsx` (BTO celebration stays). Do NOT drop just because CountdownModal/QualifierCelebrationModal are deleted. |
| `canvas-confetti` | ^1.9.4 | Golden confetti | Still fired on `NEW_BTO_RECORD` (`RaceContext.jsx:145`). BTO record celebration is a kept baseline feature. |
| `lucide-react` | ^1.16.0 (npm latest 1.47.0) | Icons | Used across every retained screen. Optionally bump to ^1.47.0, but not required. |
| `clsx` | ^2.1.1 | Conditional classnames | Used in ~15 files across retained screens. |
| `socket.io-client` | ^4.8.1 | WS client | Core to real-time TV/RD sync. |
| `react`, `react-dom` | ^18.3.1 | — | Core. |

### Dependencies to REMOVE (v3.0 prune)

| Package | Current | Where Used (sole site) | Removal Action |
|---------|---------|------------------------|----------------|
| `html5-qrcode` | ^2.3.8 | `client/src/screens/ParticipantDashboard.jsx` (`Html5Qrcode` scan lane QR) | `npm uninstall html5-qrcode` after ParticipantDashboard deletion |
| `qrcode.react` | ^4.2.0 | `client/src/screens/DeskQRCodes.jsx` (`QRCodeSVG`) | `npm uninstall qrcode.react` after DeskQRCodes deletion |
| `tailwind-merge` | ^3.0.2 | **UNUSED** — zero imports in `client/src` (grep verified) | `npm uninstall tailwind-merge` immediately; dead dep |

**Server-side prune:** none. Server `package.json` (`cors`, `dotenv`, `express`, `socket.io`, `sql.js`, `uuid`) has no scan/coupon-specific library — QR generation lives entirely client-side. `uuid` stays (used for all new PKs).

### Not a library — deletion targets

These are source files/routes, not npm deps, but they are the real "stack changes":

**Server:**
- `server/ticketEngine.js` — delete whole file (Ticket Engine removed).
- `raceManager.js` — strip coupon/lock/scan/countdown-coupled methods: `registerLane`, `setReady`, `cancelRegistration`, `lockRace`, `startRace`, `submitFinishTimes`, `declareAllCO`, `declareReRace`, `scrutineerOverride`, `handleScrutineerAction`, `seedIntoBracket`, `placeIntoBracket`, `topUpCoupons`, `adminOverrideLane` coupon refund. Keep `getFullState` (rewritten), `advanceBracketWinner` (keep — bracket advance is core v3.0), new `registerParticipant`, new winner-registration, new manual BTO methods.
- `index.js` — remove routes: `/api/coupons/*`, `/api/coupon-packages/*`, `/api/race/scan|ready|cancel|lock|start|finish|all-co|re-race|scrutineer*|override`, `/api/countdown/*`, `/api/marshal/*`, `/api/tickets/*`. Add `/api/participants/*`, `/api/round2/register-winner`, `/api/bto`.

**Client:**
- Delete screens: `ParticipantDashboard.jsx`, `DeskQRCodes.jsx`, `MarshalDashboard.jsx`, `ScrutineerDashboard.jsx`.
- Delete components: `components/marshal/*` (5 files), `components/cashier/VoidPackageModal.jsx`, `components/cashier/CouponPackageList.jsx`, `components/ui/CountdownModal.jsx`, `components/ui/QualifierCelebrationModal.jsx`, `components/cashier/CouponRegistrationForm.jsx` (rewrite → `ParticipantRegistrationForm.jsx`).
- Delete util: `client/src/utils/qrScannerHelper.js`.
- Keep: `BracketDashboard.jsx`, `RealtimeTV.jsx` (edit), `RaceDirectorDashboard.jsx` (edit), `CashierDashboard.jsx` (rewrite), `BtoCelebrationModal.jsx`, `CyberButton/CyberCard`, `OnScreenNumpad.jsx` (reusable for manual number entry), `LaneSelector.jsx` (reusable for winner lane).
- `App.jsx` routes: remove `participant`, `marshal`, `scrutineer`, `qr-codes`; add `register` (winner registration panel) + `cashier` (participant registration).

## Integration Points (how new features fit existing stack)

### (b) Auto-assigned participant numbers — no library

Schema (sql.js, applied in `initDatabase()` via `ALTER TABLE ... ADD COLUMN` guarded try/catch, matching existing migration pattern at `db.js:254-268`):

```sql
ALTER TABLE users ADD COLUMN participant_number INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_participant_number ON users(participant_number);
```

Assignment inside existing `db.transaction()`:

```js
const next = db.prepare(
  'SELECT COALESCE(MAX(participant_number), 0) + 1 AS n FROM users'
).get().n;
```

Why this shape:
- `sql.js` supports `INTEGER PRIMARY KEY AUTOINCREMENT` only on the PK column; `users.id` is TEXT uuid already used as FK everywhere. A second auto-increment column is not supported, so `MAX+1` inside a transaction is the correct sql.js-compatible approach.
- The `SqliteWrapper.transaction()` (`db.js:104`) already serializes and flushes to disk — reuse it, no new concurrency primitive.
- Unique index prevents duplicate assignment; retry-on-`UNIQUE constraint failed` pattern already exists (`raceManager.js:220`).

### (c) Manual BTO entry — no library

Schema:
```sql
CREATE TABLE IF NOT EXISTS bto_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  participant_number INTEGER,
  finish_time REAL NOT NULL,
  race_number INTEGER,
  round_number INTEGER DEFAULT 2,
  recorded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bto_time ON bto_records(finish_time ASC);
```

- Reuses `express.json()` body parsing, existing `POST` route pattern, `broadcastFullState()` for TV/RD sync, and `NEW_BTO_RECORD` socket event already consumed by `RaceContext.jsx:140` + `BtoCelebrationModal`.
- Numeric entry UI reuses `OnScreenNumpad.jsx` (tablet touch targets already built).
- No date/time formatting lib needed; store `REAL` seconds consistent with existing `race_registrations.finish_time REAL`.
- Ranking = `ORDER BY finish_time ASC LIMIT 5` (existing `btoLeaderboard` query shape at `raceManager.js:51-62`).

### (a) Module removal safety

- Delete-then-prune order: remove importing files first, run `npm run build` (fails if import dangling), then `npm uninstall`.
- `package.json` `test` script references removed suites — rewrite test list, do not leave commands pointing at deleted files (`camera-scanner.test.js`, `coupon-package.test.js`, `marshal-flow.test.js`, `ticket-engine-flow.test.js` become obsolete; `race-flow.test.js` needs coupon assertions stripped; `e2e-tournament-lifecycle.test.js` needs rewrite to physical flow; `bracket-3lane.test.js` + `bracket-dashboard-render.test.js` survive).
- Existing `data/tamiya.sqlite` retains dead tables (`coupons`, `coupon_packages`, `next_round_tickets`, `marshal_winner_logs`). Because `initDatabase()` uses `CREATE TABLE IF NOT EXISTS`, dead tables persist harmlessly. **Do not `DROP TABLE`** — irreversible on live deployment data and not required; removing code access is sufficient. Optionally add a documented "fresh DB" note.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `MAX(participant_number)+1` in transaction | Dedicated `counters` table row | Only if multiple concurrent writers beyond single-process Node — not the case here (single Express process) |
| `MAX+1` sequential | Reuse `race_registrations.id` / uuid as identity | Never — HUMAN-facing number must be short and sequential; uuid is unusable for cashier/winner input |
| New `bto_records` table | Reuse `race_registrations.finish_time` | Reuse only if BTO is tied 1:1 to a heat record. v3.0 BTO is manual and may be recorded independent of a digital race row → separate table is cleaner |
| Keep `framer-motion` | Drop after deleting 2 modals | Only if `BtoCelebrationModal` is also rewritten without motion — then drop. Currently it still imports motion |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `html5-qrcode`, `qrcode.react`, `instascan`, any scanner lib | v3.0 is explicitly scan-free; adding = scope regression | Plain `<input type="number">` + `OnScreenNumpad` |
| `react-hook-form` / `zod` / `yup` | Registration is 2 fields (name/team) + 1 numeric field; adds bundle weight for nothing | Existing controlled-input pattern in `CouponRegistrationForm` (rewrite) |
| `zustand` / `redux` / `jotai` | `RaceContext` (single provider + socket) already covers global state | Extend `RaceContext.jsx` |
| `better-sqlite3` / `sqlite3` (native) | Native rebuild toolchain breaks on Windows + Docker simplicity; sql.js WASM is the validated baseline | Keep `sql.js` |
| A date/time lib (`dayjs`, `date-fns`) for BTO | BTO is seconds-as-float, not wall-clock | Plain `parseFloat` + existing `new Date().toISOString()` |
| `canvas-confetti` removal | BTO record celebration still uses it | Keep |
| New REST framework / ORM (Prisma, Knex) | Raw `db.prepare()` wrappers already everywhere | Keep `SqliteWrapper` |

## Stack Patterns by Variant

**If running the tournament offline LAN (primary deployment):**
- Keep sql.js + file-based save; Socket.IO websocket transport. No change.

**If adding a fresh-DB / event-reset feature in v3.0:**
- Add an admin endpoint calling `initDatabase()` against a new `DB_PATH` rather than `DROP TABLE`. Because sql.js export/import is file-based, a "new event" = new sqlite file.

**If cashier needs printable number cards later:**
- Render numbers as plain HTML/CSS text (`print:` utilities already used in Navbar). Only reintroduce `qrcode.react` if barcodes are explicitly re-scoped — they are not.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `sql.js@1.14.2` | Node ESM (current project) | WASM loads via `initSqlJs()`; no build step |
| `express@4.21.2` | `socket.io@4.8.1`, `cors@2.8.5` | Do not jump to Express 5 — middleware/router API differences |
| `react@18.3.1` | `framer-motion@12.4.7`, `lucide-react@1.x` | React 19 not required; stay 18 |
| `vite@6.0.11` | `@vitejs/plugin-react@4.3.4` | Client-only build; unaffected by server changes |

## Sources

- Local verification: `server/db.js`, `server/index.js`, `server/raceManager.js`, `server/ticketEngine.js`, `client/src/App.jsx`, `client/src/components/ui/Navbar.jsx`, `client/src/context/RaceContext.jsx`, `client/src/package.json`, root `package.json` (HIGH — direct source read)
- `npm view <pkg> version` (2026-09-17): lucide-react 1.47.0, html5-qrcode 2.3.8, qrcode.react 4.2.0, canvas-confetti 1.9.4, framer-motion 13.4.0, sql.js 1.14.2, socket.io 4.8.3, express 5.2.1 (HIGH — registry)
- No Context7/official-docs lookup performed: v3.0 introduces no new library, so library docs are not applicable.

---
*Stack research for: physical-only tournament flow (v3.0)*
*Researched: 2026-09-17*