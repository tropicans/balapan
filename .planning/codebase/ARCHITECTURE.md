---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# Architecture

**Analysis Date:** 2026-09-20

## Pattern Overview

**Overall:** Centralized Real-Time Event-Driven Monolith with Modular Service Architecture and React Single-Page Application (SPA) HUD.

**Key Characteristics:**
- **Zero-Hardware Paperless Operation:** Replaces costly physical RFID timing hardware with mobile camera QR scanning, stopwatch time entry, and centralized Race Director locking.
- **Centralized Event-Driven State Broadcast:** Every state-modifying action executed on the server automatically emits `STATE_UPDATE` across all connected client displays (TV HUD, RD console, Scrutineer table, Cashier, Pit Marshal, and Participant phones).
- **Embedded In-Memory WASM Relational Database:** Pure JavaScript/WebAssembly SQLite (`sql.js`) eliminates binary native toolchains while preserving relational integrity, foreign key constraints, and ACID transactions.
- **Multi-Round Tournament Tree with Slot Repacking:** Supports 3-lane bracket elimination (Babak 2, Babak 3 capped at 21 heats, Semifinals, Grand Final). Features multi-entry auto-advancing, NO RACE declarations, and sequential slot repacking so subsequent winners fill remaining empty slots (such as Lane C) without creating gaps.
- **Automated Google Sheet Sync with In-App Result Protection:** Periodic background cron scheduler (default 60s) synchronizes participant rosters and bracket heats while safeguarding live in-app race results against accidental overwrites.
- **Role-Based Access Control (RBAC) with Admin Approval:** Multi-role authorization (`super_admin`, `admin`, `director`, `cashier`, `marshal`, `scrutineer`, `participant`) powered by Google OAuth ID token verification.

## Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Client Layer (React 18 SPA)                        │
│  - Participant Dashboard (Camera QR, Giant Ready, Cancel)               │
│  - Race Director Dashboard (Lock, Force-Ready, Finish, Round Locks)     │
│  - Scrutineer Desk (Zero-Keyboard Pass/DQ Verification)                 │
│  - Cashier Dashboard (Virtual Guest Setup, Fast Coupon Top-up)          │
│  - Realtime Circuit TV HUD (16:9 Neon Racing Display, BTO, Best Race)   │
│  - Bracket Dashboard (Round 2 & Babak 3 3-Lane Tree, NO RACE, RESET)    │
│  - Admin Dashboard (User Approvals, RBAC Roles, Sync Telemetry)         │
│  - Marshal Dashboard (Pit Lineup & Queue Coordination)                  │
│  - Event Management (Multi-event switching & archiving)                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST (Bearer Token) & Socket.IO WebSockets
┌────────────────────────────────────▼────────────────────────────────────┐
│                 Transport & API Layer (Express.js)                      │
│  - Middleware: authMiddleware (requireAuth, requireApproved, requireRole)│
│  - REST Endpoints (/api/race, /api/auth, /api/participants, etc.)       │
│  - Socket.IO Server (Event broadcasting & connection management)        │
│  - Static Asset Delivery (Serves client/dist in production)             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Service Method Invocations
┌────────────────────────────────────▼────────────────────────────────────┐
│                 Domain & Service Layer                                  │
│  - RaceManager: State machine (draft -> pre-start -> locked -> complete)│
│  - GoogleSheetService & SheetSyncScheduler: Background sync & CSV parse │
│  - AuthService: Google OAuth verification & user approval pipeline      │
│  - BtoService: Best Time Overall tracking & leaderboard sorting         │
│  - WinnerService: Winner registration & round qualification quotas      │
│  - EventService: Multi-event scoping & active event context             │
│  - TicketEngine: Ticket packages & coupon ledger transactions           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ SQL Queries & Transactions
┌────────────────────────────────────▼────────────────────────────────────┐
│               Persistence Layer (SqliteWrapper & sql.js)                │
│  - Pure WASM SQLite Engine (sql.js)                                     │
│  - Synchronous Disk Buffer Snapshot (`export()` -> writeFileSync)       │
│  - Automated Timestamped Backup Snapshots (server/backup.js)            │
│  - Versioned Schema Migrations (server/migrations.js)                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1. Presentation Layer (`client/src/`)
- **Purpose:** Renders the Cyberpunk / Neo-Racing user interface, interacts with browser device hardware (camera, Web Audio, Speech Synthesis, vibration), and consumes real-time tournament state.
- **Screens:**
  - `client/src/screens/ParticipantDashboard.jsx`: Camera QR scanner, Lane selection, Giant Ready button, Cancel.
  - `client/src/screens/RaceDirectorDashboard.jsx`: Central command console (Lock, Start, Finish, Overrides, Round Locks).
  - `client/src/screens/BracketDashboard.jsx`: Multi-round 3-lane elimination bracket tree, NO RACE button, RESET HEAT button.
  - `client/src/screens/RealtimeTV.jsx`: 16:9 full-screen circuit TV display, active heat HUD, running text ticker with heat counts, BTO leaderboard, Best Race box.
  - `client/src/screens/ScrutineerDashboard.jsx`: Zero-keyboard tablet car inspection verification.
  - `client/src/screens/CashierDashboard.jsx`: Virtual guest setup, fast participant search, coupon top-up, ticket packages.
  - `client/src/screens/AdminUserDashboard.jsx`: Super Admin user approval panel, role assignment, and sync controls.
  - `client/src/screens/MarshalDashboard.jsx`: Pit marshal heat lineup coordination.
  - `client/src/screens/EventManagementDashboard.jsx`: Event creation and active event switcher.
  - `client/src/screens/DeskQRCodes.jsx`: Printable pit start table QR stencils.
- **State & Context:**
  - `client/src/context/AuthContext.jsx`: Google OAuth state, session token, active user, RBAC permissions.
  - `client/src/context/RaceContext.jsx`: Socket.IO connection, tournament state snapshot, BTO modal triggers.

### 2. Transport & Middleware Layer (`server/index.js`, `server/middleware/`)
- **Purpose:** Exposes HTTP REST API endpoints, secures mutating endpoints via RBAC middleware, and coordinates Socket.IO event broadcasting.
- **Key Modules:**
  - `server/middleware/authMiddleware.js`: `requireAuth` (validates bearer session), `requireApproved` (checks user status is `approved`), `requireRole` (restricts actions to specified roles or `super_admin`).
  - `server/index.js`: REST controllers, Socket.IO server, countdown runner, and static file delivery.

### 3. Domain & Service Layer (`server/services/`, `server/raceManager.js`, `server/ticketEngine.js`)
- **Purpose:** Encapsulates business logic, state machine transitions, and external synchronization.
- **Key Modules:**
  - `RaceManager` (`server/raceManager.js`): Heat state machine, lane registration, race lock, finish times, bracket progression, slot repacking.
  - `googleSheetService` (`server/services/googleSheetService.js`): Google Sheet CSV URL normalization, participant roster sync, elimination bracket sync, auto-reconciliation of renamed racers.
  - `sheetSyncScheduler` (`server/services/sheetSyncScheduler.js`): Background interval cron runner (60s), telemetry status collector.
  - `authService` (`server/services/authService.js`): Google ID token verification via `google-auth-library`, user approval workflow, session management.
  - `btoService` (`server/services/btoService.js`): BTO leaderboard calculation, tie-breaking, fastest lap records.
  - `winnerService` (`server/services/winnerService.js`): Winner registration and multi-round qualification quotas.
  - `eventService` (`server/services/eventService.js`): Multi-event lifecycle management.
  - `ticketEngine` (`server/ticketEngine.js`): Ticket packages, purchase logging, and coupon balance enforcement.

### 4. Persistence Layer (`server/db.js`, `server/migrations.js`, `server/backup.js`)
- **Purpose:** Manages relational database persistence, transactions, migrations, and automated backups.
- **Key Modules:**
  - `server/db.js`: `SqliteWrapper` emulating SQLite operations in pure WASM with disk export.
  - `server/migrations.js`: Structured schema migrations ensuring forward/backward compatibility.
  - `server/backup.js`: Creates timestamped backups (`data/backups/tamiya-YYYYMMDD-HHmmss.sqlite`).

## Data Flow

### 1. Qualifying Heat Lifecycle (Babak 1)
1. **Lane Registration:** Participant scans QR stencil or selects lane via smartphone (`POST /api/race/scan`). If lane occupied or race locked, optimistic lane shifting places them into next sequential heat.
2. **Ready Confirmation:** Participant clicks "SIAP BALAPAN" (`POST /api/race/ready`).
3. **Heat Lock:** Race Director clicks "KUNCI LINTASAN" (`POST /api/race/lock`). An atomic transaction deducts 1 coupon from all heat participants and transitions race to `pre-start`. Emits `RACE_LOCKED`.
4. **Race Execution:** Race Director clicks "MULAI BALAPAN" (`POST /api/race/start`), transitioning status to `locked`. Emits `RACE_STARTED`.
5. **Finish Times Entry:** Race Director enters stopwatch times (`POST /api/race/finish`). Heat moves to `completed`. Fastest valid racer moves to Scrutineer desk (`pending`). Emits `RACE_FINISHED_PENDING_SCRUTINEER`.
6. **Scrutineering:** Physical inspection desk clicks PASS or DQ (`POST /api/race/scrutineer`). If PASS and fastest of the day, emits `NEW_BTO_RECORD` with golden confetti takeover.

### 2. Multi-Round Bracket Lifecycle (Babak 2 & Babak 3)
1. **Seeding:** Winners from Babak 1 qualify for Babak 2 bracket heats.
2. **Match Execution:** RD declares winner (`POST /api/bracket/winner`). Winner automatically advances to next round (Babak 3).
3. **Sequential Slot Repacking:** If a heat is declared "NO RACE" (`POST /api/bracket/no-race`), that match is closed without a winner. The next heat's winner is sequentially packed into the next available slot (such as Lane C) so no heats run with artificial vacancies.
4. **Babak 3 Cap:** Babak 3 is capped strictly at 21 heats max (63 slots for 3-lane format).

### 3. Google Sheet Sync Flow
1. **Scheduler Trigger:** Background cron fires every 60s (or manual click in Admin panel).
2. **CSV Fetch:** Downloads CSV from normalized export endpoint.
3. **Roster Sync:** Inserts new racers, updates team names/numbers, preserves coupon balances.
4. **Bracket Sync:** Parses Round 2 and Babak 3 matches.
5. **Result Protection Guard:** Skips overwriting any matches that already have an in-app winner, an active heat in progress, or an explicit NO RACE status.
6. **State Broadcast:** Emits `STATE_UPDATE` with updated bracket and roster.

## Key Abstractions

- **`RaceManager` (`server/raceManager.js`):** Central coordinator implementing the tournament finite-state machine.
- **`SqliteWrapper` (`server/db.js`):** WASM SQLite adapter exposing `.prepare()`, `.all()`, `.get()`, `.run()`, and `.transaction()`.
- **`TicketEngine` (`server/ticketEngine.js`):** Encapsulates coupon ledgering and ticket purchase logic.
- **`SheetSyncScheduler` (`server/services/sheetSyncScheduler.js`):** Singleton timer managing background Google Sheet synchronization.
- **`AuthService` (`server/services/authService.js`):** Identity gateway managing Google OAuth tokens, approvals, and roles.

## Entry Points

- **Backend:** `server/index.js` (CLI command `node server/index.js` or `npm run dev:server`). Initializes SQLite, runs migrations, starts sync scheduler, and launches HTTP/WebSocket server.
- **Frontend:** `client/src/main.jsx` -> `client/src/App.jsx`. Sets up `AuthContext` and `RaceContext` providers, renders navigation and screen routing.

## Error Handling

- **API Boundary:** Handled by standard `try/catch` blocks in controllers, returning standardized JSON:
  ```json
  {
    "success": false,
    "code": "ERROR_CODE",
    "error": "Pesan kesalahan dalam Bahasa Indonesia"
  }
  ```
- **Transactions:** Complex database updates run inside `db.transaction(() => { ... })` ensuring automatic rollback on failure.
- **Client Handling:** Displays cyberpunk error banners, clears loading spinners, and vibrates mobile devices with error haptic pattern.

## Cross-Cutting Concerns

- **Logging:** Structured console output with emoji prefixes (`🏎️`, `⏱️`, `🛑`, `⚡`, `⚠️`) indicating event domains.
- **Validation:** Type and bounds checking on participant inputs, lap times, and coupon balances.
- **RBAC Authentication:** Enforced via `requireAuth`, `requireApproved`, and `requireRole` middleware.
- **Real-Time State:** Broadcast to all clients on every modifying mutation via `io.emit('STATE_UPDATE', getFullState())`.

---

*Architecture analysis: 2026-09-20*
*Update after major architectural changes*
