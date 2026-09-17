# Project Research Summary

**Project:** NEO-TAMIYA — v3.0 Alur Balap Fisik Tanpa Scan Kupon (Physical-only tournament flow, no coupon scanning)
**Domain:** Grassroots Tamiya Mini 4WD tournament management — single-elimination bracket + manual best-time tracking; LAN-hosted React + Express + Socket.IO + sql.js
**Researched:** 2026-09-17
**Confidence:** HIGH

## Executive Summary

v3.0 is a **subtractive migration**, not a feature build. The product removes QR scanning, digital coupons, marshal, scrutineer, ticket engine, countdown and the live race engine, and adds exactly three thin capabilities: auto-numbered participant registration, winner registration by participant number into the existing Round 2 bracket, and manual BTO entry. All research agrees the correct engineering posture is **delete-and-rewire**, never drop-first. The bracket subsystem (`bracket_matches` + `advanceBracketWinner` + `seedIntoBracket` + `BracketDashboard.jsx`) already implements the elimination behavior v3.0 needs and must be preserved verbatim; everything coupled to coupons/tickets/scans should be removed around it.

**Zero new runtime dependencies are required.** The correct stack change is a dependency *prune* (`html5-qrcode`, `qrcode.react`, dead `tailwind-merge`) plus a schema migration (`participant_number` on `users`, new `bto_records` table). Do not add a scanner lib, form lib, validation lib, state manager, ORM, or a replacement race engine. Do not upgrade Express 4 → 5, Socket.IO, or React — version bumps are orthogonal and add regression risk to a four-milestone-old validated system.

The dominant risks are all **removal hazards**, not new-feature risks: schema resurrection via `CREATE TABLE IF NOT EXISTS` / silent `ALTER` on every boot; fake transactions (`SqliteWrapper.transaction()` never emits `BEGIN`/`COMMIT`/`ROLLBACK`); foreign keys OFF (`PRAGMA foreign_keys = 0`) leaving orphan children; irreversible loss of live coupon/financial/history data if tables are dropped on deploy; and a two-way circular ESM dependency between `ticketEngine.js` and `raceManager.js` that turns a naive deletion into a boot crash. Mitigation is a strict **add → switch → remove** phase order, with schema migration safety and backend query de-coupling landing before any UI deletion, and a timestamped `data/tamiya.sqlite` backup before the first destructive step.

## Key Findings

### Recommended Stack

**Zero new runtime deps.** v3.0 is a prune plus a schema migration. Keep React 18.3.1, Vite 6.0.11, Tailwind 3.4.17, Express 4.21.2, Socket.IO 4.8.1, sql.js 1.14.2, uuid 11.0.5. Client keeps `framer-motion` (BTO celebration modal still imports it), `canvas-confetti` (BTO record still fires it), `lucide-react`, `clsx`, `socket.io-client`. Remove `html5-qrcode`, `qrcode.react`, and the unused `tailwind-merge`. Server package.json has nothing scan/coupon-specific to remove.

**Core technologies:**
- sql.js (WASM SQLite) — persistence; already has save-to-disk + a transaction wrapper; new tables fit; keep it, do not migrate to native better-sqlite3
- Express 4.21.2 + Socket.IO 4.8.1 — REST mutations + `STATE_UPDATE` broadcast; keep, extend existing routers only
- React 18.3.1 + Vite 6 + Tailwind 3.4.17 — client; untouched by v3.0
- uuid — reuse for new PKs (`bto_records.id`, participant rows)

**Deliberately NOT added:** scanner libs, `react-hook-form`/`zod`/`yup`, `zustand`/`redux`, native sqlite, date libs, ORM. Manual numeric entry reuses existing `OnScreenNumpad.jsx`.

### Expected Features

**Must have (table stakes / P1 launch):**
- Participant roster registration (name + team) at cashier — the new entry point replacing coupon packages
- Auto-assigned unique participant number — the physical key the committee writes on paper; new identity primitive everything keys off
- Number → name auto-resolution on input — linchpin feature; the Registration Panel is unusable without it
- Round 2 seeding panel (input winner number → seat into bracket) — replaces `next_round_tickets` auto-seeding
- Duplicate-seeding guard + unknown/invalid number rejection — paper typos and double-punches must not create ghosts
- Manual heat winner pick + auto-advance (no lock/start) — reuse `advanceBracketWinner` decoupled from race lock/ticket engine
- Manual BTO entry + leaderboard replacement — single most important backend replacement; the old board derives from deleted `race_registrations.finish_time`
- RD monitoring view + TV bracket/BTO display — replaces race ticker

**Should have (competitive / P2):**
- Giant-number touch keypad for seeding (reuse `OnScreenNumpad`/`LaneSelector`)
- Undo last seeding / winner advance (port the v2.0 60s undo + `marshal_winner_logs` pattern)
- BTO audit trail (`recorded_by`, `created_at`, `updated_at`, `void_reason`)
- Live "next heat" cue on TV (replaces race-lock alert)

**Defer (v2+):**
- Printable seeding list per heat
- Consolation / 3rd-place classification heats

**Anti-features (reject explicitly):** auto-seed Round 2 by BTO ranking, any residual coupon/saldo/serial, any scanning, countdown/race-lock/timing engine, digital stopwatch integration, participant self-service app, auto-advance without human confirm, forcing power-of-two bracket with byes.

### Architecture Approach

One React SPA talking to one Express + Socket.IO process over a single-file sql.js DB; all shared state fans out through `STATE_UPDATE` from `RaceManager.getFullState()`. Target v3.0 splits the monolith `raceManager.js` into `bracketManager.js` (keep `getFullState`, `seedIntoBracket`, `advanceBracketWinner`), a new `participantService.js` (allocate number, create entry, lookup), and a new `btoService.js` (insert manual record, top-5 query, new-record detection); `ticketEngine.js` and `raceManager.js` are deleted. Migration is **add → switch → remove**, gated by a `schema_version` row; never drop-first, because sql.js has no migration framework and the live DB is a single file.

**Major components (post-migration):**
1. `ParticipantService` — allocate `participant_number` via `MAX+1` inside `db.transaction`, create entry rows, lookup by number/name
2. `BracketManager` — `getFullState`, `registerWinnerToBracket`, `seedIntoBracket`, `advanceBracketWinner` (carried over verbatim)
3. `BtoService` — `bto_records` insert, top-5 `ORDER BY finish_time ASC`, new-record detection
4. `RaceContext.jsx` — rewired socket/state contract; strips countdown/ticket/coupon handlers
5. Screens — `CashierDashboard` rewrite (participant form), new `WinnerRegistrationPanel`, `RaceDirectorDashboard` rewrite (roster + BTO), `RealtimeTV` rewrite (bracket + BTO), `BracketDashboard` modify (drop ticket/auto-advance badges)

**State contract change:** `getFullState()` emits `participants[]`, `bracketMatches[]` (no `ticket_*`), `btoLeaderboard[]`, `settings`; removes `ticketStats`, `activeRace`, `upcomingRaces`, `scrutineerQueue`. New socket events `participant_registered`, `bto_updated`; `NEW_BTO_RECORD` superseded. This contract change is the highest-risk integration — do it in one phase with the frontend rewrite.

**Key data-model decision:** participant number = entry identity, not person identity. One physical sheet = one `users` row = one `participant_number`. Never enforce unique `name`.

### Critical Pitfalls

1. **Schema resurrection** — `initDatabase()` runs `CREATE TABLE IF NOT EXISTS` and silent `ALTER TABLE … ADD COLUMN` on every boot. Removing consumers does not remove the creator. *Avoid:* treat `db.js` `initDatabase()` as the single source of truth; remove/guard definitions in the same commit as the feature.
2. **Fake transactions / irreversible data loss** — `SqliteWrapper.transaction()` never emits `BEGIN`/`COMMIT`/`ROLLBACK`; `save()` uses `fs.writeFileSync` with no temp+rename. `DROP TABLE` on startup destroys live coupon/financial data with no rollback. *Avoid:* real `BEGIN`/`COMMIT`/`ROLLBACK` in migration code, idempotent backfills, timestamped DB backup, and gate destructive steps behind an env flag (default: stop creating, keep storing).
3. **Query-level coupon coupling** — `getActiveRace()`/`lockRace()` JOIN `coupons`; `getFullState()` reads `ticketStats`; `users` API joins coupons. Delete the table without editing those queries → every `STATE_UPDATE` throws `no such table: coupons`, all screens freeze. *Avoid:* build a query-impact grep list first, edit each query to drop the join, then accept with `/api/state` + one advance action.
4. **Circular import boot crash** — `raceManager.js` ↔ `ticketEngine.js` two-way ESM dependency; deleting one side crashes at boot or on first winner registration. *Avoid:* break both directions in one commit, boot server and hit `/api/state` before touching UI.
5. **Identity + idempotency loss** — `serial_number` is the only human-facing unique ID; removing it leaves no number key, and `"7"`/`"007"`/`" 7 "` become different keys. Manual winner registration also loses the 60s undo and double-submit guard. *Avoid:* UNIQUE `participant_number` with canonical normalization (`trim`/strip leading zeros), idempotent "already registered in Babak 2" check, undo path, and a confirmation step showing the resolved name.

Additional must-address: foreign keys OFF (`PRAGMA foreign_keys = 0`) leaves orphans; dangling frontend routes/nav outliving deleted screens; ambiguous fate of `races`/`race_registrations` (derived `btoLeaderboard`/`scrutineerQueue`); hardcoded test file list breaking `npm test`; stale kiosk bookmarks/localStorage hitting removed endpoints.

## Implications for Roadmap

Based on combined research, suggested phase structure (aligns the architecture "Safe Build Order" with the pitfalls phase-mapping):

### Phase 1: Schema Migration Foundation
**Rationale:** Destructive schema work and migration safety must precede any UI/API deletion — otherwise screens are deleted while the data layer still crashes on every broadcast. Pitfall research is emphatic: this is the first phase.
**Delivers:** `participant_number` column + UNIQUE index on `users`; new `bto_records` table; `schema_version` row; guarded, real-transaction migration with idempotent backfill; documented timestamped `data/tamiya.sqlite` backup step; `PRAGMA foreign_keys` decision + orphan audit; `PRAGMA foreign_key_check` clean.
**Addresses:** auto-assigned participant number (identity primitive feeding all later features)
**Avoids:** Pitfalls 1 (resurrection), 2 (fake transactions), 3 (orphans), 4 (irreversible data loss)

### Phase 2: Cashier Participant Numbering (backend, additive)
**Rationale:** Numbering must precede winner registration — it is the lookup key. Additive only; old paths stay live.
**Delivers:** `ParticipantService` (allocate `MAX+1`, create entry, lookup); `POST/GET /api/participants`; `participant_registered` socket event; canonical number normalization (`"7"` == `"007"`) with test.
**Uses:** sql.js + existing `db.transaction` wrapper; uuid
**Avoids:** Pitfall 6 (no participant-number identity); Anti-Pattern 2 (silent `users` semantics rename — entry ≠ person, names stay non-unique)

### Phase 3: Manual BTO Backend (backend, additive)
**Rationale:** The old BTO board derives from `race_registrations.finish_time WHERE scrutineer_status='pass'`; removing the race engine silently empties it. The replacement must land before removal. This phase also forces the explicit Babak 1 data-model decision (Pitfall 10).
**Delivers:** `bto_records` insert + top-5 query + `isNewBest` detection; `POST/GET /api/bto`; `bto_updated` event; edit/correction path (personal-best-per-participant policy recommended).
**Implements:** `BtoService`; repoints TV/RD leaderboard
**Avoids:** Pitfalls 8 (coupon JOIN crash) and 10 (ambiguous `races`/`race_registrations` fate)

### Phase 4: Winner Registration API + Bracket Execution
**Rationale:** Depends on Phase 2 lookup. Reuses existing `seedIntoBracket`/`advanceBracketWinner`; must decouple winner path from `TicketEngine`/lock state before the ticket engine dies.
**Delivers:** `POST /api/bracket/register-winner` (number → lookup → seed next open Round 2 slot A→B→C, else new heat), `POST /api/bracket/unseed`, duplicate-seeding guard, confirmation echo (heat # + lane), manual winner pick + auto-advance with no lock/start.
**Implements:** `BracketManager` (from `raceManager.js`); ticket logic folded into `seedIntoBracket`
**Avoids:** Pitfall 5 (circular import — break both directions in one commit), Pitfall 7 (duplicate winners / lost undo)

### Phase 5: State Contract Switch + Backend Removal
**Rationale:** The `getFullState()` shape change is the highest-risk integration; keep old and new paths coexisting until this single switch phase.
**Delivers:** `RaceManager` → `BracketManager` rename/gut; new `getFullState()` payload (add `participants`, drop `ticketStats`/`activeRace`/`scrutineerQueue`/`ticket_*`); removal of race/coupon/marshal/ticket/countdown routes and socket events from `index.js`; delete `ticketEngine.js`; server boots + `/api/state` 200 + `grep -r "TicketEngine" server/` = 0.
**Avoids:** Pitfall 5, Pitfall 8, Pitfall 9 (dangling routes/nav); Anti-Pattern 3 (dead ticket joins), Anti-Pattern 4 (retaining race lifecycle)

### Phase 6: Frontend Rewrite / Prune
**Rationale:** Depends on the Phase 5 state contract. Must land as one coordinated set: nav entry → route branch → screen import → context handlers → API helpers.
**Delivers:** `RaceContext.jsx` rewrite; `CashierDashboard` rewrite; new `WinnerRegistrationPanel`; `RaceDirectorDashboard` rewrite (roster + BTO); `RealtimeTV` rewrite (bracket + BTO); `BracketDashboard` modify; `App.jsx`/`Navbar.jsx` route updates; delete `MarshalDashboard`, `ScrutineerDashboard`, `ParticipantDashboard`, `DeskQRCodes`, `components/cashier/*`, `components/marshal/*`, `CountdownModal`, `QualifierCelebrationModal`, `qrScannerHelper.js`; trim `audio.js`/`useHaptic.js`; prune client deps.
**Avoids:** Pitfall 9, Pitfall 12 (stale clients/bookmarks — add redirects + clear coupon fields from `tamiya_user` localStorage)

### Phase 7: Cleanup, Tests, Docs
**Rationale:** Last because it verifies the whole. Keeps the suite green continuously; destructive drops only now, gated and backed up.
**Delivers:** Guarded `DROP TABLE` (or archive) for `coupons`, `coupon_packages`, `marshal_winner_logs`, `next_round_tickets`, `races`, `race_registrations`; remove their CREATE/ALTER from `db.js`; rewrite `package.json` test list (keep/adapt `bracket-3lane.test.js`, `bracket-dashboard-render.test.js`; delete `camera-scanner`, `coupon-package`, `marshal-flow`, `ticket-engine-flow`; strip coupon assertions from `race-flow`; rewrite `e2e-tournament-lifecycle`); rewrite/delete `scripts/import-roster.js`; boot with `SEED_DEMO_DATA=true` without coupon tables; docs (PROJECT.md, SRS, README) no longer describe scanning/coupons as current.
**Avoids:** Pitfall 11 (red suite / lost coverage), Pitfall 1 (definitions removed in same commit), Pitfall 4 (data retention decision made deliberately)

### Phase 8: BTO Celebration + TV Showcase (increment, optional)
**Rationale:** Polish after the functional flow is proven; depends on Phases 1–6.
**Delivers:** `BtoCelebrationModal` wired to `bto_updated`; TV BTO panel + bracket display polish; next-heat cue (P2).
**Avoids:** Silent removal of the emotional payoff that made BTO valuable

### Phase Ordering Rationale

- Migration safety and backend de-coupling **must precede any UI deletion** — otherwise screens die while the data layer still crashes on every broadcast (Pitfall 8).
- Participant numbering **must precede** winner registration — it is the lookup key (Pitfall 6 → 7).
- Bracket execution depends on registration; TV/RD BTO depends on the chosen data model (Pitfall 10 is an explicit decision gate).
- Cleanup is last because it verifies the whole; destructive drops are gated and backed up.
- **Every phase leaves the app runnable**; old tables/routes stay live until Phase 7.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Schema Migration Foundation):** real-transaction migration semantics on sql.js, orphan audit strategy, and destructive-step gating warrant `--research-phase` if the team has no prior sql.js migration experience.
- **Phase 5 (State Contract Switch + Backend Removal):** highest-risk integration; full route/event/query consumer audit needed; `--research-phase` recommended to enumerate every `raceState.*` consumer before removal.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Participant Numbering):** simple `MAX+1` + UNIQUE index; pattern already exists in codebase.
- **Phase 3 (Manual BTO):** mirrors existing `btoLeaderboard` SQL over a new table.
- **Phase 4 (Winner Registration):** `seedIntoBracket`/`advanceBracketWinner` carried over verbatim.
- **Phase 6 (Frontend Rewrite):** mechanical delete/rewire, no new technology.
- **Phase 7 (Cleanup/Tests):** established test-file-list update pattern.
- **Phase 8 (BTO showcase):** existing modal repoint.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Local source read + npm registry current versions; conclusion is "no new deps," which is low-risk by construction |
| Features | MEDIUM | Codebase evidence HIGH; domain conventions MEDIUM from single-elimination/seeding standards; no direct competitor product research (LOW) |
| Architecture | HIGH | Direct reading of `db.js`, `index.js`, `raceManager.js`, `ticketEngine.js`, `App.jsx`, `RaceContext.jsx`, all screens/components |
| Pitfalls | HIGH | Grounded in current code; SQLite behavior verified empirically against the actual `sql.js@1.14.2` build (`PRAGMA foreign_keys` = 0, `DROP COLUMN` supported on SQLite 3.49.1) |

**Overall confidence:** HIGH

### Gaps to Address

- **BTO policy** — personal-best per participant vs. every logged run is recommended (personal-best) but not confirmed against organizer intent; surface in requirements/discuss-phase.
- **Number presentation form** — canonical storage form (`"7"` vs `"007"`) needs a single unit-tested decision; define in Phase 2.
- **Data-retention tier** — stop-storing / archive-to-`data/archive-v2-<date>.sqlite` / drop is deliberately left as an operator decision; must be explicit in Phase 1 and Phase 7 release notes.
- **Foreign-key pragma timing** — enabling `PRAGMA foreign_keys = ON` can make later deletes fail if pre-existing orphans exist; audit-first sequencing needed.
- **Babak 1 data-model fate** — explicitly decide (a) keep `races`/`race_registrations` as manual containers vs. (b) dedicated `bto_records` + delete race engine. Architecture and pitfalls both recommend (b).
- **No auth / trusted-LAN assumption** — pre-existing per CONCERNS.md; winner registration by number is spoofable on the LAN. Document the assumption; consider an operator PIN before any exposure beyond venue.

## Sources

### Primary (HIGH confidence)
- `server/db.js`, `server/index.js`, `server/raceManager.js`, `server/ticketEngine.js` — schema bootstrap, route surface, bracket logic to preserve, circular dependency, transaction/save implementation
- `client/src/App.jsx`, `client/src/context/RaceContext.jsx`, `client/src/components/ui/Navbar.jsx`, `client/src/screens/*`, `client/src/components/{cashier,marshal}/*` — route/screen/socket wiring, removal inventory
- `client/package.json`, root `package.json` — removable scanner deps, hardcoded test file list
- `npm view <pkg> version` (2026-09-17) — registry current versions
- Empirical verification: `sql.js@1.14.2` → SQLite 3.49.1, `PRAGMA foreign_keys` = 0
- `.planning/PROJECT.md` — v3.0 goal, requirements, out-of-scope

### Secondary (MEDIUM confidence)
- `tamiya-developer-handover-srs.md`, `tamiya-web-app-blueprint-v20.md` — original flow intent
- Wikipedia, *Single-elimination tournament* — seeding/byes/dynamic bracket conventions
- `.planning/codebase/ARCHITECTURE.md`, `CONCERNS.md`, `INTEGRATIONS.md`, `TESTING.md` — pre-existing fragility, baseline architecture

### Tertiary (LOW confidence)
- Competitor feature comparison (Challonge/Toornament) — inferential, no direct competitor product research performed
- No Context7/official-docs lookup performed: v3.0 introduces no new library, so library docs are not applicable

---
*Research completed: 2026-09-17*
*Ready for roadmap: yes*