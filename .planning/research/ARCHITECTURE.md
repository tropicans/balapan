# Architecture Research

**Domain:** Migration to Physical-Only Tournament Flow (v3.0) — participant numbering + winner registration into Round 2 bracket
**Researched:** 2026-09-17
**Confidence:** HIGH (based on direct reading of `server/db.js`, `server/index.js`, `server/raceManager.js`, `server/ticketEngine.js`, `client/src/App.jsx`, `client/src/context/RaceContext.jsx`, and all screens/components)

## Executive Summary

The app is a single-page React 18 client talking to one Express + Socket.IO process backed by a single-file sql.js SQLite DB. All shared state flows through one socket event, `STATE_UPDATE`, produced by `RaceManager.getFullState()`. v3.0 is a **subtractive migration**: delete scan/coupon/marshal/countdown/race-engine surfaces, add two thin features (auto-numbered participant registration, number-based winner seeding into the existing 3-lane bracket), and re-point the TV/RD dashboards at the bracket instead of the live race lanes.

The bracket subsystem (`bracket_matches` table + `RaceManager.advanceBracketWinner` + `seedIntoBracket` + `BracketDashboard.jsx`) already implements exactly the elimination behavior v3.0 needs. Keep it. Everything around it that assumed coupons, QR scans, tickets, scrutineering, and live timing is removable.

Key architectural decisions:
- **Participant number = the entry identity** (replaces `coupon_packages.serial_number`). One physical coupon = one number = one `users` row = one bracket slot. Same human may hold multiple numbers (multiple sheets), so names are deliberately NOT unique.
- **`next_round_tickets` and `TicketEngine` are deleted.** Winner registration writes directly to `bracket_matches` slots. Tickets existed only to model coupon-serial provenance and auto-seeding — both gone.
- **No replacement "race" engine.** App boots at Round 2; `races`/`race_registrations`/countdown/lock/timing are removed. BTO becomes a standalone manual table.
- **Migration is add → switch → remove, never drop-first**, because sql.js has no migration framework and the live DB is a single file.

## Standard Architecture

### System Overview (Target v3.0)

```
┌────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION                               │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│ Cashier / Peserta │ Winner Registration  │ Race Director & Circuit TV  │
│ - Register entry  │ (Panel Registrasi)   │ - Monitor Round 2 roster    │
│ - Auto number     │ - Input number       │ - Manual BTO input          │
│ - Search / list   │ - Name auto-fills    │ - Bracket + BTO on TV       │
├───────────────────┴──────────────────────┴─────────────────────────────┤
│                       SOCKET.IO & REALTIME SYNC                        │
├────────────────────────────────────────────────────────────────────────┤
│ Events: STATE_UPDATE, participant_registered, bracket_updated,         │
│         bto_updated                                                     │
├────────────────────────────────────────────────────────────────────────┤
│                       BACKEND BUSINESS LOGIC                           │
├───────────────────┬──────────────────────┬─────────────────────────────┤
│ ParticipantSvc    │ BracketManager       │ BtoService                  │
│ - next number     │ - register winner    │ - manual time entry        │
│ - create entry    │ - open-slot seeding  │ - leaderboard query        │
│ - lookup by number│ - winner + auto-advan│ - BTO #1 detection         │
├───────────────────┴──────────────────────┴─────────────────────────────┤
│                         SQLITE WASM STORAGE                           │
├────────────────────────────────────────────────────────────────────────┤
│ tables: users, bracket_matches, bto_records, tournament_settings       │
│ (removed: coupons, coupon_packages, marshal_winner_logs,               │
│            next_round_tickets, races, race_registrations)              │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (post-migration)

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `server/db.js` | Schema init, guarded migration, persistence wrapper | Unchanged wrapper; schema block rewritten; DROP orphan tables under a `schema_version` guard |
| `server/participantService.js` **(NEW)** | Allocate `participant_number`, create entry rows, lookup by number/name | Static class like existing engines; uses `db.transaction` |
| `server/bracketManager.js` **(NEW, renamed from RaceManager)** | `getFullState`, `registerWinnerToBracket`, `seedIntoBracket`, `advanceBracketWinner` | Carry over bracket methods verbatim; delete every coupon/race/scrutineer method |
| `server/btoService.js` **(NEW)** | Insert manual BTO record, top-5 query, new-record detection | Small static class; mirrors old `btoLeaderboard` SQL but reads `bto_records` |
| `server/ticketEngine.js` | **DELETE** | Winner-seeding logic folds into `seedIntoBracket` |
| `server/raceManager.js` | **DELETE** (split into bracketManager + participantService) | — |
| `client/src/context/RaceContext.jsx` | Socket wiring, state cache, API helpers | Strip countdown/ticket/coupon handlers; add participant + winner-reg + BTO helpers |
| `client/src/screens/CashierDashboard.jsx` | **REWRITE** — participant entry registration only | Remove tabs, coupon packages, digital top-up, guest modal |
| `client/src/screens/...` winner registration | **NEW screen** e.g. `WinnerRegistrationPanel.jsx` | Number input → name preview → confirm seed into Round 2 |
| `client/src/screens/RaceDirectorDashboard.jsx` | **REWRITE** — Round 2 roster + manual BTO | Remove lock/start/finish/CO/re-race/countdown controls |
| `client/src/screens/RealtimeTV.jsx` | **REWRITE** — bracket + BTO display | Remove lane A/B/C live cards and ticket ticker/quota bar |
| `client/src/screens/BracketDashboard.jsx` | **MODIFY** — drop ticket badge + auto-advance badge | Keep round tabs, 3-lane cards, MENANG action, pagination |
| `client/src/screens/MarshalDashboard.jsx` | **DELETE** | — |
| `client/src/screens/ScrutineerDashboard.jsx` | **DELETE** | — |
| `client/src/screens/ParticipantDashboard.jsx` | **DELETE** | — |
| `client/src/screens/DeskQRCodes.jsx` | **DELETE** | — |
| `client/src/components/cashier/*` | **DELETE** (CouponRegistrationForm, CouponPackageList, VoidPackageModal) | Replaced by simple participant form |
| `client/src/components/marshal/*` | **DELETE** | — |
| `client/src/components/ui/CountdownModal.jsx` | **DELETE** | — |
| `client/src/components/ui/QualifierCelebrationModal.jsx` | **DELETE** or repurpose | Was ticket-celebration |
| `client/src/components/ui/BtoCelebrationModal.jsx` | **KEEP** | Repoint to `bto_updated` |
| `client/src/utils/qrScannerHelper.js` | **DELETE** | — |
| `client/src/utils/audio.js` | **MODIFY** — drop countdown/ticket sounds | Keep generic beeps/chime |
| `client/src/hooks/useHaptic.js` | **MODIFY** — drop countdown haptics | Keep generic tap/ready |
| `scripts/import-roster.js` | **REWRITE or DELETE** | Currently CouponPackage/serial-centric |

## Database Schema Changes

### KEEP (modify)

**`users`** — becomes the single source of entry identity.
```sql
-- add:
participant_number INTEGER UNIQUE   -- allocated at registration; replaces coupon serial
-- retain: id, name, team_name, role, is_virtual, created_at
-- optional drop: email UNIQUE reliance, google_sub_id, side_event_gta
```
- `email` UNIQUE stays (harmless) but auto-generated per entry (`entry_<n>@tamiya.local`). Do NOT use name uniqueness.
- Add index: `CREATE INDEX idx_users_participant_number ON users(participant_number);`

**`bracket_matches`** — core, keep as-is minus ticket linkage.
```sql
-- retain: id, match_number, round_number, user_id_1/2/3, winner_id,
--         parent_match_id, status, is_final, created_at
-- DROP COLUMNS (logical, leave physically if sql.js ALTER limits): ticket_id_1/2/3
-- Optional: is_auto_advanced can stay inert or be dropped
```
Note: sql.js supports `ALTER TABLE ADD COLUMN` only; it cannot drop columns. Leave `ticket_id_*` as dead columns and stop selecting/joining them. Do not error if absent.

**`tournament_settings`** — keep. `qualifying_status` becomes meaningless; keep for misc settings (e.g. `current_round`, event name). No new keys required.

### NEW

**`bto_records`** — replaces `race_registrations.finish_time`-derived leaderboard.
```sql
CREATE TABLE IF NOT EXISTS bto_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,             -- entry (participant number)
  participant_number INTEGER NOT NULL,
  finish_time REAL NOT NULL,
  round_number INTEGER DEFAULT 2,
  match_id TEXT,                     -- optional link to bracket_matches
  entered_by TEXT,                   -- 'race_director'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(match_id) REFERENCES bracket_matches(id)
);
CREATE INDEX IF NOT EXISTS idx_bto_time ON bto_records(finish_time);
```

### REMOVE

| Table | Reason | Removal method |
|-------|--------|----------------|
| `coupons` | Digital coupon balance module deleted | `DROP TABLE IF EXISTS coupons;` under schema_version guard |
| `coupon_packages` | Serial-based physical package module deleted | `DROP TABLE IF EXISTS coupon_packages;` |
| `marshal_winner_logs` | Marshal module deleted | `DROP TABLE IF EXISTS marshal_winner_logs;` |
| `next_round_tickets` | Ticket engine deleted; bracket holds slots directly | `DROP TABLE IF EXISTS next_round_tickets;` |
| `races` | Round 1 manual off-app; no live race lifecycle | `DROP TABLE IF EXISTS races;` |
| `race_registrations` | No QR lane registration / timing / scrutineering | `DROP TABLE IF EXISTS race_registrations;` |

**Migration mechanics (opinionated):** add a `schema_version` row in `tournament_settings`. In `initDatabase()`, after CREATE TABLE IF NOT EXISTS for the new schema, run a guarded block:
```js
const v = db.prepare("SELECT value FROM tournament_settings WHERE key='schema_version'").get()?.value;
if (Number(v || 0) < 3) {
  db.exec(`DROP TABLE IF EXISTS coupons; DROP TABLE IF EXISTS coupon_packages; ...`);
  db.exec(`UPDATE tournament_settings SET value='3' WHERE key='schema_version';`);
  // INSERT if not exists
}
```
This is safe because the DB is a single file and Node/sql.js is single-threaded. Back up `data/tamiya.sqlite` before shipping (document in runbook).

## Backend Route Surface

### REMOVE (all currently in `server/index.js`)

| Route | Feature removed |
|-------|-----------------|
| `POST /api/users/login`, `POST /api/users/profile` | Google/OAuth identity, coupon balance response |
| `POST /api/users/guest` (coupon-balance variant) | Replaced by participant registration |
| `POST /api/coupons/topup` | Digital coupons |
| `GET /api/coupon-packages`, `GET /api/coupon-packages/next-serial`, `POST /api/coupon-packages`, `POST /api/cashier/packages/activate`, `POST /api/coupon-packages/:id/void` | Coupon package module |
| `POST /api/race/scan`, `/ready`, `/cancel`, `/lock`, `/start`, `/finish`, `/all-co`, `/re-race`, `/scrutineer`, `/scrutineer-override`, `/override` | Race engine, QR, scrutineer |
| `POST /api/countdown/*` (+ module-level interval state) | Countdown |
| `POST /api/marshal/record-winner`, `/undo-last-winner`, `/record-bracket-winner`, `/register-box`; `GET /api/marshal/recent-winners`, `/active-bracket-match` | Marshal module |
| `GET /api/tickets`, `POST /api/tickets/lock-qualifying`, `/unlock-qualifying` | Ticket engine |

Also remove `countdownInterval`, `countdownRemaining`, `countdownResetCount`, `INDONESIAN_NUMBERS` module state and the countdown cleanup in `shutdown()`.

### KEEP (modify)

| Route | Change |
|-------|--------|
| `GET /api/health` | unchanged |
| `GET /api/state` | returns new state shape (below) |
| `GET /api/users` | drop coupon JOIN; return `participant_number`, name, team |
| `POST /api/bracket/advance` | unchanged behavior; remove ticket side-effects (none currently) |

### ADD

| Route | Purpose | Notes |
|-------|---------|-------|
| `POST /api/participants` | Register entry: `{ name, teamName }` → allocates `participant_number` | Replaces guest + coupon-package registration. Emits `participant_registered` |
| `GET /api/participants?search=` | List/search participants and numbers for cashier + winner panel | Drives number autocomplete |
| `GET /api/bracket` | Bracket snapshot (or reuse `/api/state`) | Optional if state snapshot sufficient |
| `POST /api/bracket/register-winner` | `{ participant_number, round=2 }` → lookup user, seed into next open Round 2 slot | The new "Panel Registrasi Pemenang". Emits `bracket_updated` |
| `POST /api/bracket/unseed` (nice-to-have) | Remove a mis-seeded entry from its slot | Direct replacement for ticket void, no 60s window needed |
| `GET /api/bto` | Top-5 leaderboard | Replaces derived BTO |
| `POST /api/bto` | `{ participant_number, finish_time }` manual entry | Emits `bto_updated`; detect new #1 |

### New `getFullState()` shape (contract change — drives frontend rewrite)

```js
{
  participants: [ { id, participant_number, name, team_name, created_at } ],  // NEW
  bracketMatches: [ { ...user_id_1..3, user_1_name.., winner_id, round_number, status, is_final } ], // ticket_* removed
  btoLeaderboard: [ { user_id, participant_number, user_name, team_name, finish_time } ],
  settings: { current_round, qualifying_target_quota? },
  ticketStats: undefined,  // REMOVED
  activeRace / upcomingRaces / scrutineerQueue: undefined,  // REMOVED
  serverTime
}
```

## Socket.IO Event Changes

| Event | Action |
|-------|--------|
| `STATE_UPDATE` | KEEP — payload reshaped |
| `bracket_updated` | KEEP |
| `participant_registered` | ADD — `{ participant }` |
| `bto_updated` | ADD — `{ record, isNewBest }` (replaces `NEW_BTO_RECORD`) |
| `RACE_LOCKED`, `RACE_STARTED`, `RACE_FINISHED_PENDING_SCRUTINEER`, `RACE_ALL_CO`, `RACE_RERACE_DECLARED` | REMOVE |
| `COUNTDOWN_STARTED/TICK/COMPLETE/STOPPED` | REMOVE |
| `NEW_BTO_RECORD` | REMOVE (superseded by `bto_updated`) |
| `marshal:winner-recorded`, `marshal:winner-undone` | REMOVE |
| `ticket:granted`, `ticket:voided` | REMOVE |
| `qualifying:locked`, `qualifying:unlocked` | REMOVE |
| `coupon_package_updated` | REMOVE |

## Data Flow (Target)

### 1. Cashier registers entry (participant numbering)
```
CashierDashboard form (name/team)
  → POST /api/participants
  → ParticipantService.register(name, team)
      → participant_number = MAX(participant_number)+1 (inside db.transaction)
      → INSERT users (id, name, team, participant_number, auto email)
  → io.emit('participant_registered', { participant })
  → broadcastFullState()  → STATE_UPDATE to all clients
```

### 2. Winner registration into Round 2
```
WinnerRegistrationPanel: input participant_number
  → GET /api/participants?search=<num>  → show name (confirm)
  → POST /api/bracket/register-winner { participant_number, round: 2 }
  → BracketManager.registerWinnerToBracket()
      → lookup users by participant_number
      → seedIntoBracket(userId): next open slot in round 2 (A→B→C), else create new heat with parent = grand final
  → io.emit('bracket_updated')
  → broadcastFullState()
```
This reuses the existing `seedIntoBracket` logic verbatim (currently in `raceManager.js` lines ~631-673).

### 3. Bracket execution + auto-advance
```
BracketDashboard "MENANG" (or RD dash)
  → POST /api/bracket/advance { matchId, winnerId, isFinal }
  → RaceManager.advanceBracketWinner()  (carry over verbatim)
      → mark winner, place into parent/next-round open slot, create heat if needed
  → broadcastFullState()
```

### 4. Manual BTO
```
RaceDirectorDashboard input time for a participant number
  → POST /api/bto { participant_number, finish_time }
  → BtoService.record()
      → INSERT bto_records
      → SELECT MIN(finish_time) → isNewBest
  → io.emit('bto_updated', { record, isNewBest })
  → broadcastFullState()
  → TV BtoCelebrationModal if isNewBest
```

## Architectural Patterns

### Pattern 1: Single snapshot state (keep)
**What:** One `getFullState()` query bundle broadcast as `STATE_UPDATE`; REST mutations trigger a rebroadcast.
**When:** Always — it is the existing contract and all dashboards already subscribe.
**Trade-offs:** Simple, no client state merging; slightly chatty. Fine at circuit scale (tens of clients). Keep it — do not introduce a store library during a subtractive migration.

### Pattern 2: Static service classes over a global `db` (keep)
**What:** `RaceManager` / `TicketEngine` style static methods using `db.prepare(...)`.
**When:** All backend features.
**Trade-offs:** No DI/testability, but consistent and already pervasive. Continue for `ParticipantService`, `BracketManager`, `BtoService`.

### Pattern 3: Add-then-switch-then-remove migration
**What:** Add new columns/tables and routes first; switch `getFullState`/frontend to them; only then delete old code and drop old tables.
**When:** Any destructive schema change in a single-file sql.js DB with no migration framework.
**Trade-offs:** Two briefly-coexisting paths; eliminates data loss and lets the app run if a phase is interrupted. **Required** here.

## Anti-Patterns

### Anti-Pattern 1: Dropping tables/columns in the same commit that removes code
**What people do:** Delete coupon code and `DROP TABLE coupon_packages` at once.
**Why bad:** If the new registration path has a bug, the field DB is unrecoverable and the app cannot fall back.
**Do this instead:** Add new schema + routes and verify; switch frontend; only then drop tables under a `schema_version` guard, with a documented `data/tamiya.sqlite` backup step.

### Anti-Pattern 2: Renaming `users` semantics silently
**What people do:** Keep `users` as human identity and treat `participant_number` as a person attribute.
**Why bad:** One human can hold multiple physical sheets → multiple entries in the same bracket. A 1:1 person↔number assumption breaks seeding and winner selection.
**Do this instead:** Treat each entry as its own `users` row keyed by its unique `participant_number`. Never enforce unique `name`.

### Anti-Pattern 3: Keeping dead ticket joins "just in case"
**What people do:** Leave `next_round_tickets` and the `ticket_id_*` joins in `getFullState`/bracket queries.
**Why bad:** Nullable joins against a dropped/empty table produce confusing duplicate rows and keep the TicketEngine alive as hidden coupling.
**Do this instead:** Strip ticket columns from every SELECT and delete the table + engine in the removal phase.

### Anti-Pattern 4: Retaining the race lifecycle as "manual race mode"
**What people do:** Keep `races`/`race_registrations` and just hide the UI.
**Why bad:** PROJECT explicitly scopes Babak 1 out of the app. Carrying the race engine keeps lock/countdown/timing/scrutineer concepts wired into state and socket events, forcing every future change through dead code.
**Do this instead:** Delete the race engine; BTO is a standalone manual table, not a race result.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Backend | REST fetch for mutations + Socket.IO `STATE_UPDATE` + targeted events | Contract change in state shape is the highest-risk integration; do it in one phase with frontend rewrite |
| `index.js` ↔ services | Direct static method calls | `index.js` becomes thin: participants, bracket, bto, state, health |
| `BracketManager` ↔ `ParticipantService` | participant lookup by number | `registerWinnerToBracket` calls `ParticipantService.findByNumber` |
| `BracketManager` ↔ `BtoService` | optional `match_id` link | Keep loose; BTO can exist without a match |
| `db.js` ↔ all | Global default export | Unchanged |
| `scripts/import-roster.js` ↔ schema | Reads `coupon_packages`/`coupons` | Must be rewritten to `participant_number` or removed |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None (intentionally) | — | No hardware, no payment gateway, no OAuth in v3.0. Circuit LAN only. |

## Safe Build Order (dependency-ordered)

> Rule: every phase leaves the app runnable. Do not drop old tables until Phase 5.

**Phase 1 — Schema + Participant Numbering (backend, additive)**
- Add `participant_number` column + index to `users`; add `bto_records` table; add `schema_version` seeding.
- Add `ParticipantService`; add `POST/GET /api/participants`; add `POST/GET /api/bto` + `BtoService`; add `bto_updated`, `participant_registered` events.
- Keep existing tables/routes intact.
- *Depends on:* nothing. *Verify:* can register an entry and get a number; BTO insert works.

**Phase 2 — Winner Registration API (backend, additive)**
- Add `POST /api/bracket/register-winner` calling `seedIntoBracket`; add `POST /api/bracket/unseed`.
- Keep ticket-based seeding path running alongside.
- *Depends on:* Phase 1 (lookup by `participant_number`). *Verify:* entering a number seeds a Round 2 slot and broadcasts.

**Phase 3 — State contract + engine split (backend, switch)**
- Rename/gut `RaceManager` → `BracketManager` (`getFullState`, bracket methods only); move participant logic to `ParticipantService`.
- Rewrite `getFullState()` to the new shape (drop `activeRace`, `scrutineerQueue`, `ticketStats`; add `participants`).
- Remove race/coupon/marshal/ticket/countdown routes and socket events from `index.js`.
- Delete `ticketEngine.js`.
- *Depends on:* Phases 1-2 (new endpoints must exist before old ones die). *Verify:* state snapshot is coherent; bracket advance + register-winner work; no references to deleted modules.

**Phase 4 — Frontend rewrite/prune (switch)**
- Rewrite `RaceContext.jsx` (new state shape, new helpers, drop countdown/ticket/coupon APIs).
- Rewrite `CashierDashboard` (participant form), add `WinnerRegistrationPanel`, rewrite `RaceDirectorDashboard` (roster + BTO), rewrite `RealtimeTV` (bracket + BTO), modify `BracketDashboard` (remove ticket/auto-advance badges).
- Update `App.jsx` routes + `Navbar.jsx` (drop marshal/scrutineer/participant/qr-codes; add winner registration).
- Delete screens/components/utils: `MarshalDashboard`, `ScrutineerDashboard`, `ParticipantDashboard`, `DeskQRCodes`, `components/cashier/*`, `components/marshal/*`, `CountdownModal`, `QualifierCelebrationModal`, `qrScannerHelper.js`; trim `audio.js`, `useHaptic.js`.
- *Depends on:* Phase 3 (state contract). *Verify:* all remaining screens render; no import of deleted files.

**Phase 5 — Data cleanup + test rewrite (remove)**
- Guarded `DROP TABLE` for `coupons`, `coupon_packages`, `marshal_winner_logs`, `next_round_tickets`, `races`, `race_registrations`; remove their CREATE statements and `ALTER TABLE` migrations from `db.js`.
- Rewrite/delete tests: keep+adapt `bracket-3lane.test.js`, `bracket-dashboard-render.test.js`; delete `camera-scanner.test.js`, `coupon-package.test.js`, `marshal-flow.test.js`, `ticket-engine-flow.test.js`, `race-flow.test.js`; update `package.json` `test` script.
- Rewrite or delete `scripts/import-roster.js` + `import:roster` npm script.
- *Depends on:* Phases 1-4. *Verify:* full `npm test` green; DB re-inits clean; fresh run registers numbers and seeds bracket.

**Phase 6 — Manual BTO polish + TV showcase (optional/increment)**
- Wire `BtoCelebrationModal` to `bto_updated`; TV BTO panel + bracket display polish.
- *Depends on:* Phases 1-4.

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| One circuit (~10-60 clients) | Current monolith + snapshot broadcast is sufficient. No change. |
| Multi-venue SaaS | Not in v3.0 scope. If pursued: multi-tenant DB per event, move off single-file sql.js to a real SQLite/Postgres, add event scoping. |
| 1000+ participants | `participant_number = MAX+1` stays correct (single-threaded); add index on `users(participant_number)` (already planned). Bracket pagination already exists in `BracketDashboard`. |

## Sources

- `server/db.js` — current 9-table schema, wrapper, guarded `ALTER TABLE` migration style (lines 120-275)
- `server/index.js` — full route surface + socket event emitters (lines 52-1177)
- `server/raceManager.js` — bracket logic to preserve (`seedIntoBracket`, `advanceBracketWinner`, `getFullState`) vs race logic to delete
- `server/ticketEngine.js` — ticket engine to delete; auto-placement logic to fold into `seedIntoBracket`
- `client/src/App.jsx`, `client/src/context/RaceContext.jsx`, `client/src/components/ui/Navbar.jsx` — route/screen/socket wiring
- `client/src/screens/*`, `client/src/components/{cashier,marshal}/*` — removal/rewrite inventory
- `.planning/PROJECT.md` — v3.0 scope, target features, out-of-scope
- `.planning/codebase/ARCHITECTURE.md`, `INTEGRATIONS.md`, `TESTING.md` — baseline architecture references

---
*Architecture research for: v3.0 Physical-Only Tournament Flow migration*
*Researched: 2026-09-17*