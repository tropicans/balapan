# Pitfalls Research — Destructive Removal & Manual-Flow Migration

**Domain:** Removing scanning + digital coupon modules from a live tournament system (NEO-TAMIYA v3.0)
**Researched:** 2026-09-17
**Confidence:** HIGH (grounded in current code: `server/db.js`, `server/index.js`, `server/raceManager.js`, `server/ticketEngine.js`, `client/src/*`; SQLite behavior verified empirically against the actual `sql.js@1.14.2` build)

> This file supersedes the v2.0 coupon-flow pitfalls. v3.0 is a **subtractive** milestone: the danger is not new features, it is what breaks when modules are deleted from a system that has shipped four milestones of coupled behavior.

---

## Critical Pitfalls

### Pitfall 1: "Removed" tables resurrect on every server restart

**What goes wrong:**
A dev deletes `coupons`, `coupon_packages`, `marshal_winner_logs`, `next_round_tickets` from frontend/API code, deploys, and still sees them in `sqlite_master`. Worse: a *column* migration later re-adds a column that was just dropped.

**Why it happens:**
`server/db.js` `initDatabase()` runs `CREATE TABLE IF NOT EXISTS …` for every table and a block of `ALTER TABLE … ADD COLUMN` statements wrapped in silent `try/catch` **on every boot** (db.js:123–268). Removing the consumers does not remove the creator. The v2.0 `ALTER TABLE coupon_packages ADD COLUMN package_type` (db.js:268) will literally re-add `package_type` after you `ALTER TABLE … DROP COLUMN package_type`.

**How to avoid:**
Schema definition and feature code are two separate deletion surfaces. Treat `server/db.js` `initDatabase()` as the single source of truth and remove/guard the definition in the *same commit* as the feature. Do not assume "nulled out app code" == "no schema."

**Warning signs:**
- After cleanup, `SELECT name FROM sqlite_master WHERE type='table'` still lists removed tables.
- A dropped column reappears after a restart.
- `PRAGMA table_info(<removed_table>)` returns rows.

**Phase to address:**
Schema Migration Foundation (first phase of v3.0) — before any UI/API deletion.

---

### Pitfall 2: Fake transactions — "atomic" migration with no rollback

**What goes wrong:**
A destructive migration (drop tables / backfill participant numbers) fails halfway. Part of the schema changed, part did not. The next write serializes the half-migrated DB to disk. Tournament history is now inconsistent and possibly unrecoverable.

**Why it happens:**
`SqliteWrapper.transaction()` (db.js:104–115) does **not** emit `BEGIN`/`COMMIT`/`ROLLBACK`. It just calls the function and then `save()`. There is no transaction boundary anywhere in the backend. Every comment in the codebase that says "atomic transaction" is aspirational, not real. Compounding it, `SqliteWrapper.prepare().run()` always returns `{ changes: 1 }` (db.js:99), so any new code that guards on `res.changes === 0` (like `lockRace`, raceManager.js:295) never fires. And `save()` serializes the whole in-memory DB with `fs.writeFileSync` (db.js:42–55) with no temp-file+rename, so a crash mid-write can corrupt the file.

**How to avoid:**
1. Migration code must NOT rely on `db.transaction()`. Wrap manually: `db.exec('BEGIN')`, mutate, `db.exec('COMMIT')`, with `db.exec('ROLLBACK')` in the catch. Verify rollback works with an intentional failing migration in a test.
2. Back up `data/tamiya.sqlite` to a timestamped file before any destructive step.
3. For participant-number backfill, make it idempotent (re-runnable) so a crash+rerun converges.
4. Fix or explicitly avoid `res.changes` guards for new code.

**Warning signs:**
- Migration logs an error but subsequent reads show a mix of old and new schema.
- `db.exec('BEGIN')`/`COMMIT` never appears in the diff.
- `db.transaction(` appears in migration code and someone claims "it rolls back."

**Phase to address:**
Schema Migration Foundation.

---

### Pitfall 3: Foreign keys are OFF — deleting parents leaves orphan children

**What goes wrong:**
Someone runs `DELETE FROM users` (or drops `coupon_packages`) expecting `ON DELETE CASCADE` to clean `coupons`, `next_round_tickets`, `marshal_winner_logs`, `bracket_matches`. It does not. Bracket slots point at dead user IDs; a match can no longer resolve `user_1_name` (renders blank racers); winner selection fails with "Pemenang harus salah satu dari kontestan."

**Why it happens:**
SQLite defaults `PRAGMA foreign_keys = OFF`; verified **0** in this app's `sql.js@1.14.2` runtime. The schema *declares* `ON DELETE CASCADE` (db.js:141, 200, 138) but it is inert. Nothing in `initDatabase()` enables the pragma.

**How to avoid:**
Enable `db.exec('PRAGMA foreign_keys = ON')` once at init — but only *after* auditing/cleaning existing orphans, since enabling it can make later deletes fail. For the removal, clean child tables in dependency order explicitly (tickets/logs → packages → coupons) rather than trusting cascade. For users: never bulk-delete users; prefer `is_virtual`/status flags.

**Warning signs:**
- `PRAGMA foreign_key_check` returns rows.
- Bracket cards show `null`/`undefined` names.
- Deleting a user "succeeds" but `SELECT COUNT(*) FROM bracket_matches WHERE user_id_1='<id>'` is still 1.

**Phase to address:**
Schema Migration Foundation (add check), Bracket phase (defensive null handling).

---

### Pitfall 4: Irreversible destruction of live financial/history data

**What goes wrong:**
The first deploy of v3.0 drops coupon tables against an existing `data/tamiya.sqlite` (possibly on a Docker volume `tamiya_data`). Serial numbers, price paid, payment method, quota usage, and full winner log/history are gone forever. There is no rollback and no export.

**Why it happens:**
"Remove the module" is interpreted as "DROP the tables now." The system ships via `docker-compose` with a named volume (see `.planning/codebase/CONCERNS.md` §Fragile Areas). Existing installs have real data. Removal is treated as a code task, not a data-retention decision.

**How to avoid:**
Separate the decision into three tiers and pick deliberately:
- **Default (safest): stop creating, keep storing.** Remove all reads/writes/UI, but leave the tables in place (or rename to `_archived_*`). Zero data loss; the cost is unused tables.
- **Archival:** copy removed tables into `data/archive-v2-<date>.sqlite` (or `_archive` tables) before dropping.
- **Drop:** only with an explicit operator-run backup step documented in the release notes.

Never `DROP` unconditionally from application startup code. Gate destructive steps behind an env flag (e.g. `RUN_DESTRUCTIVE_MIGRATION=true`) or a manual script.

**Warning signs:**
- A diff containing `DROP TABLE` inside `initDatabase()`.
- No backup file created before first v3.0 boot.
- Release notes don't mention data migration behavior.

**Phase to address:**
Schema Migration Foundation (must land before any feature deletion).

---

### Pitfall 5: Circular import — deleting `ticketEngine.js` crashes the whole backend

**What goes wrong:**
`server/index.js` imports `TicketEngine`; `raceManager.js` imports `TicketEngine`; `ticketEngine.js` imports `RaceManager` (circular ESM). Delete one import or the file and you get either a boot-time `SyntaxError: The requested module … does not provide an export`, or a deferred runtime `TicketEngine is not defined` on the first winner registration — not at startup.

**Why it happens:**
`raceManager.placeIntoBracket()` (raceManager.js:676–690) and `handleScrutineerAction()` (raceManager.js:602) delegate to `TicketEngine.issueTicket()`; `TicketEngine` calls back into `RaceManager.advanceBracketWinner()` (ticketEngine.js:50, 229). The dependency is two-way. And `getFullState()` returns `ticketStats: TicketEngine.getTicketStats()` (raceManager.js:131), so every `STATE_UPDATE` touches it.

**How to avoid:**
Break both directions in one commit: strip the `TicketEngine` import from `raceManager.js`, remove `getTicketStats()` from `getFullState()`, remove `TicketEngine.issueTicket()` calls, then delete `ticketEngine.js`, then remove the `index.js` import. Boot the server and hit `/api/state` before touching UI.

**Warning signs:**
- Server exits on `node server/index.js`.
- `grep -r "TicketEngine" server` still returns hits after "removal."
- `/api/state` returns 500 while `/api/health` is green.

**Phase to address:**
Schema Migration Foundation / backend removal — this is the first backend cut.

---

### Pitfall 6: Human identifier disappears with `serial_number` — no participant number source

**What goes wrong:**
v3.0 needs "input nomor peserta → nama otomatis." Today the *only* human-facing unique identifier is `coupon_packages.serial_number` (UNIQUE, db.js:188/204). Remove it and `users` has no number at all — only a UUID PK and a UNIQUE email. Winner registration by number is impossible until a number scheme exists. Then the first manual entry fails because "7", "007", and " 7 " are different keys.

**Why it happens:**
The v2.0 number lived on the coupon sheet, not the person, and the same racer could hold multiple packages (multi-ticket: `racer_ticket_index`, ticketEngine.js:126–135). Participant numbering is a genuinely new identity model, not a rename.

**How to avoid:**
1. Add `participant_number` to `users` (or a new table) with a **UNIQUE** index; make it the lookup key.
2. Normalize on both write and read: `String(n).trim()`, strip leading zeros, uppercase — define one canonical form and unit-test `"7" == "007"`.
3. Backfill deterministically from existing users (order by `created_at`) and make it idempotent.
4. Keep names non-unique; number is the key. Decide explicitly what happens when two people share a name.

**Warning signs:**
- Two rows with the same visual number but different storage.
- Registration lookup uses `LIKE` instead of exact normalized equality.
- A user has no `participant_number` after migration.

**Phase to address:**
Cashier Participant Numbering phase (must precede the winner-registration phase).

---

### Pitfall 7: Winner registration loses idempotency and the undo window

**What goes wrong:**
Replacing `marshal_winner_logs` (which had a 60-second undo, index.js:830–929, and per-ticket uniqueness) with a bare "enter number → register" form means: double-tap registers a racer twice; a typo registers the wrong racer; there is no way to correct it. Duplicates cascade into `advanceBracketWinner`, corrupting the 3-lane tree.

**Why it happens:**
Manual flows feel simple, so correction logic is dropped as "no longer needed." But `advanceBracketWinner` only guards against *cross-round* duplication (raceManager.js:721–735); it does not prevent the same racer twice in the same match, nor accidental re-advance from a double click.

**How to avoid:**
- Add a UNIQUE constraint on `(bracket_match_id, slot)` or an equivalent guard, plus an idempotent "already registered in Babak 2" check before insert.
- Keep a correction/undo path (delete last registration, or reassign) — the physical equivalent of the 60s undo.
- Require a confirmation step showing the resolved *name* ("Nomor 12 = Budi Santoso — daftarkan ke Babak 2?") before committing.

**Warning signs:**
- Same user ID appears in two slots of one match.
- Double submission within 2 seconds creates two rows.
- No API endpoint exists to remove a mis-registered winner.

**Phase to address:**
Babak 2 Winner Registration phase.

---

### Pitfall 8: Removing `coupons` breaks `getFullState` even if you keep everything else

**What goes wrong:**
`RaceManager.getActiveRace()` does `LEFT JOIN coupons c` (raceManager.js:35) and selects `c.balance as coupon_balance`. Delete the `coupons` table without editing that query and **every** `STATE_UPDATE` throws `no such table: coupons` → all screens freeze on stale state, TV goes dark. `lockRace()` also JOINs `coupons` (raceManager.js:281) and references balance. `users` API joins coupons too (index.js:81).

**Why it happens:**
Coupons are referenced from unrelated-looking read paths (race state, user list, navbar balance), not just coupon endpoints. Deletion is scoped by feature, not by query graph.

**How to avoid:**
Build a query-impact list first: grep for `coupons`, `coupon_packages`, `next_round_tickets`, `ticketStats`, `scrutineer_status`, `coupon_balance` across `server/` and `client/src/`. Edit each query to drop the join before removing the table. Boot + `/api/state` + one lock/advance action as the acceptance test.

**Warning signs:**
- Console shows `no such table: coupons` on state broadcast.
- `/api/users` returns 500.
- TV shows "OFFLINE" while health check is OK.

**Phase to address:**
Backend Query De-coupling phase (before table removal), paired with RD/TV phase.

---

### Pitfall 9: Frontend routes and nav entries outlive their screens

**What goes wrong:**
`App.jsx` maps `/marshal`, `/scrutineer`, `/qr-codes`, `/participant` and renders their components (App.jsx:22–48). `Navbar.jsx` still lists "Marshal Finish", "Scrutineer", "QR Jalur Fisik" (ui/Navbar.jsx:44–53). Delete the screens but leave nav/route entries → blank pane or import crash. `RaceDirectorDashboard` still `fetch('/api/tickets')` (line 76); `RealtimeTV` reads `raceState.ticketStats` (lines 35–41); `CountdownModal` is mounted in `App.jsx`.

**Why it happens:**
Screens are removed file-by-file while the shared navigation/router/context are forgotten. Socket handlers in `RaceContext.jsx` (`ticket:granted`, `COUNTDOWN_*`, `scrutineerQueue`) are also easy to leave behind.

**How to avoid:**
Delete as one coordinated set: nav array entry → route branch → screen import/render → context handlers/API helpers → backend endpoint. Then grep for the literal strings (`'/marshal'`, `'ticket:granted'`, `COUNTDOWN_`, `/api/tickets`) and expect zero hits outside docs/tests.

**Warning signs:**
- Nav shows a tab that renders nothing.
- `npm run build:client` warns about unused imports or unresolved paths.
- Browser console has 404s for `/api/tickets` or `/api/marshal/*`.

**Phase to address:**
Dead Code / Route Cleanup phase (final), but nav+route edits land with each screen's removal.

---

### Pitfall 10: Babak 1 tables (`races`, `race_registrations`) have an unstated fate

**What goes wrong:**
v3.0 makes Babak 1 fully manual. Two bad outcomes:
- **Keep everything:** `getFullState` still emits `activeRace`, `upcomingRaces`, `scrutineerQueue`; BTO still derives from `race_registrations.scrutineer_status='pass'` (raceManager.js:51–62) — which cannot reflect the now-manual BTO.
- **Drop everything:** bracket seeding, winner registration, and `advanceBracketWinner` still depend on `users` and `bracket_matches`, but `races`/`race_registrations` deletion requires rewriting `getActiveRace`, `lockRace`, `submitFinishTimes`, `handleScrutineerAction`, and every `race_registrations` query — a large blast radius that looks small from the requirement "remove lock/countdown."

The `scrutineerQueue` and `btoLeaderboard` are *derived* from `race_registrations`. Removing the Scrutineer screen does not remove the data dependency.

**Why it happens:**
"Babak 1 is manual now" is mistaken for "Babak 1 tables are unused." They are still the storage for BTO and the qualification audit trail.

**How to avoid:**
Decide explicitly and document it: either (a) keep `races`/`race_registrations` as manual-entry containers and add a manual BTO path, or (b) introduce a dedicated `bto`/results table and delete the race engine. Do not half-remove. If BTO becomes manual, it needs its own table (racer + time + recorded_at), because the current BTO is a computed query over race registrations.

**Warning signs:**
- BTO leaderboard is empty on TV after removal.
- `getFullState` still names fields no screen consumes.
- `race_registrations` writes continue despite "manual Babak 1."

**Phase to address:**
RD Manual BTO phase + a preceding explicit data-model decision.

---

### Pitfall 11: Test suite becomes red / coverage silently lost

**What goes wrong:**
`package.json` `test` script hardcodes the file list, including `camera-scanner.test.js`, `coupon-package.test.js`, `marshal-flow.test.js`, `ticket-engine-flow.test.js` (package.json:15). Deleting those files makes `npm test` fail with ENOENT. Deleting the tests without replacement also removes regression coverage for `advanceBracketWinner`, race flow, and the bracket UI — exactly the code v3.0 still needs.

**Why it happens:**
Tests are treated as "for removed features." But `race-flow.test.js` and `bracket-3lane.test.js` cover retained logic and will need editing, not deletion.

**How to avoid:**
1. Update the `test` script in the same commit as test deletions.
2. Keep and adapt `bracket-3lane.test.js` and any bracket-render test; port winner-registration-by-number into a new test.
3. Add one migration smoke test: boot with an old-schema DB fixture, assert tables/final state.

**Warning signs:**
- `npm test` exits non-zero before feature work starts.
- `server/tests/` file count drops while retained logic has no test.
- No test asserts the new participant-number normalization.

**Phase to address:**
Every removal phase (keep the suite green continuously), plus Test Update in cleanup phase.

---

### Pitfall 12: Stale clients / bookmarks hit removed endpoints

**What goes wrong:**
Operators have `/marshal`, `/scrutineer`, `/participant`, `/qr-codes` bookmarked on tablets. A leftover cached tab keeps calling `/api/marshal/*` after deploy. Old sessions also hold `currentUser` in `localStorage` (`tamiya_user`) keyed to coupon balance. These produce confusing 404 HTML (the Express catch-all returns HTML, index.js:1142–1161) that client code tries to `res.json()`, throwing opaque errors.

**Why it happens:**
No service worker, but `localStorage` state, bookmarks, and multiple physical kiosks persist across deploys. The catch-all returns HTML for unknown non-`/api` paths but JSON 404 for `/api/*` (index.js:1143–1144) — still parsed as `data.success` undefined.

**How to avoid:**
Add redirects for removed physical routes to a "flow retired" or default screen; bump the app version string; clear/ignore stale `localStorage` keys (`tamiya_user.coupon_balance`) on load. Verify each removed endpoint returns a clear JSON error or is redirected, never a silent crash.

**Warning signs:**
- `Unexpected token '<'` in browser console.
- Kiosk shows blank after deploy.
- `localStorage` still contains coupon balance fields.

**Phase to address:**
Dead Code / Route Cleanup + each screen-removal phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Leave removed tables in place (stop reading/writing) | Zero data-loss risk, trivial rollback | Dead tables accumulate; schema confusing; migrators must skip them | **Recommended default** until a proven archive exists |
| `DROP TABLE` inside `initDatabase()` | "Clean" schema immediately | Fires on every boot; catastrophic if code reverts; destroys live data | Never |
| Rely on `db.transaction()` for migration rollback | Looks atomic in review | No BEGIN/COMMIT → no rollback; partial migration possible | Never for migrations |
| Keep `html5-qrcode` / `qrcode.react` / `canvas-confetti` deps after module removal | Avoids touching lockfiles | Bundle bloat, dead deps, security surface | Only if a retained feature uses them (confetti is used by BTO — keep) |
| Delete tests with features | Faster removal | Lose regression net over retained bracket/race logic | Never for retained logic; OK for pure removed-feature tests, after script update |
| Frontend-only "removal" while endpoints stay | Fast demo | Endpoints remain reachable, docs lie, dead code | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Socket.IO `STATE_UPDATE` | Removing fields (`ticketStats`, `scrutineerQueue`, `coupon_balance`) without auditing consumers | Consumers default via `|| {}` (RealtimeTV:35) and silently degrade; grep every `raceState.*` before removal |
| `RaceContext` localStorage session | Leaving `coupon_balance` in saved user objects | Strip coupon fields; migrate or invalidate `tamiya_user` |
| `db.js` ALTER migrations | Deleting a column while its `ALTER … ADD COLUMN` remains | Remove the ALTER line in the same commit (see Pitfall 1) |
| `seedInitialData()` | `SEED_DEMO_DATA=true` still inserts into `coupons`; with the table dropped, seeding throws during init | Remove/modify seed path when coupons go; test boot with the flag on |
| Express catch-all | Old clients POST to removed `/api/*` and parse HTML/JSON blind | Return explicit JSON 404 for removed endpoints; client checks `res.ok` |
| Docker volume `tamiya_data` | Assuming a fresh DB on redeploy | Migration must handle pre-existing `data/tamiya.sqlite` from v2.0 |
| `scripts/import-roster.js` / package scripts | Forgetting non-`server`/`client` consumers of removed schema | Grep `scripts/`, `docker-compose.yml`, `Dockerfile`, `.env.example` before deletion |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full DB `export()` + `writeFileSync` on every `run()`/`exec()` | Latency spikes during peak registration | Defer to existing concern; do not make worse with per-row migration loops | Peak registration; large DB (>5MB) |
| Migration in a loop running one `save()` per row | Multi-second boot / disk thrash | Batch writes; save once at end | Backfilling participants over a large user table |
| `getFullState` still querying removed/empty tables | Extra queries per broadcast | Remove dead queries | Every state broadcast (~2–5KB payload per action) |
| Bracket queries without index on `user_id_*` | Slow bracket render at scale | Index lookup columns used for winner registration | Large tournaments (100+ heats) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Winner registration by number with no operator confirmation | Anyone on the LAN can claim any participant number as a Babak 2 winner | Confirmation step showing resolved name; keep operator-only access assumption explicit; consider a PIN later |
| No auth on remaining mutating endpoints (pre-existing, per CONCERNS.md) | Spoofed bracket advances / BTO edits | Document the trusted-LAN assumption; at minimum add operator PIN middleware before exposing beyond venue |
| Removed `scrutineer` verification layer | Physical eligibility checks no longer recorded | Keep a minimal pass/DQ/note field if adjudication disputes are possible |
| Backup files (`tamiya.sqlite` copies) written into served `data/` | Express static could expose them | Write backups outside the served root or ensure `.gitignore`/no static mapping |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Number entry with ambiguous formatting (`7` vs `007`) | "Nomor tidak ditemukan" at the worst moment | Normalize + accept both; show resolved name before commit |
| Manual BTO free-text time entry | Typos like `111.111` vs `1:11.111` corrupt the leaderboard | Masked/numeric input with min/max sanity, or mm:ss.ms segmented entry |
| Removing the Marshal/Scrutineer screens with no replacement checklist | Panitia loses the "coret kotak #N" workflow guidance | Provide a printed/onscreen manual checklist for Babak 1 |
| Silent removal of the 60s undo | Mis-registered winners cannot be fixed | Visible "Batalkan pemenang terakhir" action |
| Nav/route changes without redirects | Bookmarked kiosk URLs go blank | Redirect retired routes to the new default screen |

---

## "Looks Done But Isn't" Checklist

- [ ] **Tables:** `sqlite_master` no longer lists removed tables/columns after a **restart** (not just after deploy).
- [ ] **Migrations:** `ALTER TABLE … ADD COLUMN` lines for removed columns are gone from `db.js`.
- [ ] **Transactions:** destructive migration has real `BEGIN`/`COMMIT`/`ROLLBACK` and was tested with a forced failure.
- [ ] **Foreign keys:** `PRAGMA foreign_key_check` is clean; orphan children handled explicitly.
- [ ] **Backup:** a timestamped DB backup exists before the first v3.0 boot against real data.
- [ ] **Imports:** `grep -r "TicketEngine" server/` = 0; server boots and `/api/state` returns 200.
- [ ] **Queries:** `grep -r "coupons|ticketStats|scrutineer" server/ client/src/` returns only intended references.
- [ ] **Routes:** `App.jsx` and `Navbar.jsx` have no entries for removed screens; no 404 fetches in console.
- [ ] **State:** `getFullState()` emits only fields some screen consumes.
- [ ] **Tests:** `npm test` is green with an updated file list; participant-number normalization is asserted.
- [ ] **Seeding:** boot with `SEED_DEMO_DATA=true` succeeds without coupon tables.
- [ ] **Docs:** `PROJECT.md`, SRS, and README no longer describe scanning/coupon flows as current.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Data dropped without backup | HIGH | Restore from host/volume snapshot or pre-migration backup; if none, data is unrecoverable — prevent, don't recover |
| Partial/failed migration | MEDIUM–HIGH | Restore backup, fix transaction handling, rerun idempotent migration |
| `getFullState` 500 after table removal | LOW | Edit the offending JOIN, redeploy; UI recovers on next broadcast |
| Circular import boot crash | LOW | Remove both import directions, boot, smoke-test `/api/state` |
| Duplicate winner registered | MEDIUM | Add undo/delete path; if already advanced, manually repair affected match and parent chain |
| Schema resurrected by `IF NOT EXISTS`/ALTER | LOW | Edit `db.js` and restart; drop resurrected objects if intended |
| Red test suite blocks execution | LOW | Update `package.json` test list; port retained tests |
| Stale kiosk showing blank | LOW | Hard-refresh/redeploy; add route redirects |

---

## Pitfall-to-Phase Mapping

Suggested v3.0 phase order (roadmap not yet finalized; names below are recommended).

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Resurrection via `IF NOT EXISTS`/ALTER (1) | Schema Migration Foundation | Restart twice; `sqlite_master` stable |
| Fake transactions / no rollback (2) | Schema Migration Foundation | Forced-failure migration test leaves DB unchanged |
| Foreign keys OFF / orphans (3) | Schema Migration Foundation + Bracket | `PRAGMA foreign_key_check` empty; bracket renders names |
| Irreversible data loss (4) | Schema Migration Foundation | Backup artifact exists; migration gated by flag |
| Circular import / TicketEngine removal (5) | Backend Removal | Server boots; `/api/state` 200; grep TicketEngine = 0 |
| No participant-number identity (6) | Cashier Participant Numbering | Unique index; `"7"`/`"007"` resolve to one racer |
| Duplicate winners / lost undo (7) | Babak 2 Winner Registration | Double-submit creates one entry; undo restores prior state |
| Query-level coupon coupling (8) | Backend Query De-coupling | `/api/state` + `/api/users` return 200 with tables gone |
| Dangling frontend routes/nav (9) | Each removal + Dead Code Cleanup | No 404s; nav has no dead tabs; build clean |
| Ambiguous Babak 1 table fate (10) | RD Manual BTO (needs explicit data decision) | BTO leaderboard populated from manual source |
| Test suite break / lost coverage (11) | Continuous; Test Update in Cleanup | `npm test` green; bracket regression present |
| Stale clients / bookmarks (12) | Each removal + Cleanup | Retired routes redirect; no HTML-parse errors |

**Ordering rationale:** Migration safety and backend de-coupling must precede any UI deletion — otherwise you delete screens while the data layer still crashes on every broadcast. Participant numbering must precede winner registration (it is the lookup key). Bracket execution depends on registration. TV/RD BTO depends on the chosen data model. Cleanup is last because it verifies the whole.

---

## Sources

- `server/db.js` — schema bootstrap, silent `ALTER` migrations, `SqliteWrapper` transaction/save implementation (lines 15–116, 120–275)
- `server/index.js` — endpoint surface, countdown engine, marshal/ticket APIs, catch-all routing (lines 37–1161)
- `server/raceManager.js` — coupon JOINs in state/lock paths, scrutineer BTO derivation, bracket advance logic
- `server/ticketEngine.js` — circular RaceManager dependency, ticket issuance/void, `getTicketStats`
- `client/src/App.jsx`, `components/ui/Navbar.jsx`, `context/RaceContext.jsx`, `screens/RealtimeTV.jsx`, `screens/RaceDirectorDashboard.jsx` — route/nav/context coupling
- `package.json` — hardcoded test file list; `client/package.json` — removable scanner deps
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md` — pre-existing fragility (sync disk writes, non-atomic file writes, no auth, Docker volume)
- Empirical verification on this machine: `sql.js@1.14.2` → SQLite 3.49.1 (`DROP COLUMN` supported); `PRAGMA foreign_keys` = 0

---

*Pitfalls research for: destructive removal of scanning/coupon modules → manual number-based tournament flow*
*Researched: 2026-09-17*