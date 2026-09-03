---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# Architecture

**Analysis Date:** 2026-09-03

## Pattern Overview

**Overall:** Centralized Real-Time Event-Driven Monolith with React Single-Page Application (SPA) HUD.

**Key Characteristics:**
- **Zero-Hardware Paperless Operation:** Replaces costly physical RFID timing hardware with mobile camera QR-scanning, stopwatch time entry, and centralized Race Director locking.
- **Centralized Event-Driven State Broadcast:** Every state-modifying action executed on the server automatically emits `STATE_UPDATE` across all connected client displays (TV HUD, RD console, Scrutineer table, Cashier, and Participant phones).
- **Embedded In-Memory WASM Relational Database:** Pure JavaScript/WebAssembly SQLite (`sql.js`) eliminates binary dependency headaches and native toolchains while preserving relational integrity and ACID transactions.
- **Optimistic Concurrency & Lane Shifting:** Automatically routes racers to the next sequential heat if their requested lane is already taken or if the active race is already locked.

## Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer (React 18 SPA)               │
│  - Participant Dashboard (Camera QR, Giant Ready, Cancel)       │
│  - Race Director Dashboard (Lock, Force-Ready, Finish, Kick)    │
│  - Scrutineer Desk (Zero-Keyboard Pass/DQ Verification)         │
│  - Cashier Dashboard (Virtual Guest Setup, Fast Coupon Top-up)  │
│  - Realtime Circuit TV HUD (16:9 Neon Racing Display, BTO)      │
│  - Bracket Dashboard (Round 2 Single Elimination Tree)          │
│  - Audio Engine (Web Audio Tones & Indonesian Voice Synth)      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP REST & Socket.IO WebSockets
┌───────────────────────────────▼─────────────────────────────────┐
│                 Transport & API Layer (Express.js)              │
│  - REST Endpoints (/api/race/*, /api/users/*, /api/countdown/*) │
│  - Socket.IO Server (Event broadcasting & connection management)│
│  - Static Asset Delivery (Serves client/dist in production)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ In-process method calls
┌───────────────────────────────▼─────────────────────────────────┐
│                 Domain Business Logic (RaceManager)             │
│  - State Machine Transition Controls (draft -> pre-start ->     │
│    locked -> completed)                                         │
│  - Coupon Balance & Atomic Deduction Transaction                │
│  - Auto-Bracket Seeding & Winner Progression Logic              │
│  - Best Time Overall (BTO) Calculation                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ SQL Queries & Transactions
┌───────────────────────────────▼─────────────────────────────────┐
│               Persistence Layer (SqliteWrapper & sql.js)         │
│  - Pure WASM SQLite Engine (sql.js)                             │
│  - Synchronous Disk Buffer Snapshot (`export()` -> writeFileSync)│
│  - Relational Schema (users, coupons, races, registrations)     │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Presentation Layer (`client/src/`)
- **Purpose:** Renders the futuristic Cyberpunk user interface, manages device hardware integration (camera, audio synthesis, speech synthesizer, vibration), and handles user interactions.
- **Contains:**
  - Screens: `client/src/screens/ParticipantDashboard.jsx`, `client/src/screens/RaceDirectorDashboard.jsx`, `client/src/screens/RealtimeTV.jsx`, `client/src/screens/ScrutineerDashboard.jsx`, `client/src/screens/CashierDashboard.jsx`, `client/src/screens/BracketDashboard.jsx`, `client/src/screens/DeskQRCodes.jsx`.
  - Global Context: `client/src/context/RaceContext.jsx` holds socket connection, tournament snapshot, current user session, and modal controllers.
  - UI Building Blocks: `client/src/components/ui/CyberButton.jsx`, `client/src/components/ui/CyberCard.jsx`, `client/src/components/ui/Navbar.jsx`, `client/src/components/ui/CountdownModal.jsx`, `client/src/components/ui/BtoCelebrationModal.jsx`.
  - Native Audio & Haptics: `client/src/utils/audio.js`, `client/src/hooks/useHaptic.js`.
- **Depends on:** REST endpoints and Socket.IO WebSocket stream from backend.

### 2. Transport & Controller Layer (`server/index.js`)
- **Purpose:** Exposes HTTP endpoints for client commands and manages the Socket.IO pub/sub bus.
- **Contains:** 16 REST endpoints mapping client actions to `RaceManager` methods, Socket.IO connection handling, Indonesian speech countdown interval runner, and production static file fallback.
- **Depends on:** `server/raceManager.js`, `server/db.js`, `express`, `socket.io`.
- **Used by:** Connected browser clients.

### 3. Domain Logic Layer (`server/raceManager.js`)
- **Purpose:** Houses all rules, state transitions, concurrency safety checks, and tournament business logic.
- **Contains:**
  - `getActiveRace()`: Finds active race or auto-creates next sequential heat.
  - `getFullState()`: Compiles aggregated state (active race, BTO top 5, upcoming queue, scrutineer queue, bracket matches).
  - `registerLane(userId, lane)`: Validates coupons, checks lane occupancy, shifts to subsequent race if needed.
  - `setReady(userId)`: Flags participant ready.
  - `cancelRegistration(userId)`: Allows instant cancellation while race is still `draft`.
  - `lockRace(raceId)`: Atomic transaction deducting 1 coupon from all heat racers and locking race to `pre-start`.
  - `startRace(raceId)`: Transitions race to `locked`.
  - `submitFinishTimes(raceId, times)`: Computes winner, updates finish times, places winner in `scrutineerQueue`.
  - `handleScrutineerAction(regId, action)`: Pass or Disqualify; on Pass, updates BTO and auto-seeds Round 2 bracket.
  - `placeIntoBracket(userId)` & `advanceBracketWinner(matchId, winnerId)`: Tournament single-elimination progression.
  - `topUpCoupons(userId, amount)` & `registerGuest(...)`: Cashier operations.
  - `adminOverrideLane(action, ...)`: Race Director emergency override (force-ready, assign, kick with coupon refund).
- **Depends on:** `server/db.js`.
- **Used by:** Route handlers in `server/index.js`.

### 4. Persistence Layer (`server/db.js`)
- **Purpose:** Abstraction over WASM SQLite providing prepared statement emulation, ACID transactions, automatic schema migration, initial seed data, and disk synchronization.
- **Contains:** `SqliteWrapper` class implementing `.prepare()`, `.all()`, `.get()`, `.run()`, `.transaction()`, and `.save()`.
- **Depends on:** `sql.js`, `fs`, `path`.
- **Used by:** `server/raceManager.js` and `server/index.js`.

## Data Flow

### Qualifying Heat Lifecycle (Babak 1)

1. **Registration:** Participant scans QR stencil `LINE A`, `LINE B`, or `LINE C` on their smartphone. Client sends `POST /api/race/scan`.
2. **Concurrency Check:** `RaceManager.registerLane` verifies user coupon balance $\ge 1$. If the lane is taken or the race is not in `draft`, it automatically creates/finds Heat $N+1$ and places the racer there.
3. **Ready Check:** Participant taps giant "SIAP BALAP" button (`POST /api/race/ready`). Lane turns green on RD console and TV HUD.
4. **Lock ("KUNCI BALAPAN"):** Race Director clicks Lock (`POST /api/race/lock`). An atomic SQLite transaction runs:
   - Permanently deducts 1 coupon from all racers in this heat.
   - Updates race status to `pre-start`.
   - Emits `RACE_LOCKED` (plays hydraulic sound, triggers haptic lock on mobile phones, disables user cancel button).
5. **Physical Start:** RD signals track release (`POST /api/race/start`). Race status changes to `locked` (TV shows `BALAPAN BERLANGSUNG`).
6. **Finish Times Entry:** Juri Finish / RD enters stopwatch times (`POST /api/race/finish`). Lowest time is determined as heat winner and queued for car inspection (`scrutineer_status = 'pending'`).
7. **Scrutineering Verification:** Winner brings physical Mini 4WD car to inspection desk. Scrutineer taps "LOLOS" (`POST /api/race/scrutineer`).
   - If car passes, `scrutineer_status` becomes `pass`.
   - If time is fastest of the day, `isNewBTO = true` triggers `NEW_BTO_RECORD` event (golden confetti and siren on TV).
   - Winner is automatically placed into the next vacant slot in the Round 2 Elimination Bracket tree (`placeIntoBracket`).
   - If disqualified, victory is voided and removed from BTO records.

### Round 2 Elimination Bracket & Voice Countdown Flow

1. Race Director opens Bracket Dashboard.
2. When launching an elimination match, RD starts the 10-second vocal countdown (`POST /api/countdown/start`).
3. Server emits `COUNTDOWN_TICK` every second. Clients play audio tone and invoke Indonesian speech synthesis.
4. RD can press "SIAP / STOP SEKARANG" at any moment (`POST /api/countdown/stop`), instantly cutting audio and flashing `RACE READY - LEPAS!` across screens.
5. RD selects the match winner, which automatically cascades the racer into the parent match (Quarterfinals $\rightarrow$ Semifinals $\rightarrow$ Grand Final).

## Key Abstractions

- **`RaceManager` (`server/raceManager.js`):** Singleton domain service encapsulating all state rules, transaction boundaries, and query compositions.
- **`SqliteWrapper` (`server/db.js`):** Adapter wrapping `sql.js` WASM API into an ergonomic interface mimicking `better-sqlite3` (`prepare().all()`, `prepare().get()`, `transaction()`).
- **`RaceContext` (`client/src/context/RaceContext.jsx`):** React Context providing unified state access, API wrappers, and real-time socket event subscription to the component tree.
- **`CyberAudioEngine` (`client/src/utils/audio.js`):** Web Audio oscillator synthesizer and SpeechSynthesis facade for zero-asset sound generation.

## Entry Points

**Backend:**
- `server/index.js` - Starts HTTP server, initializes SQLite WASM database, registers REST endpoints and Socket.IO event listeners, binds to `0.0.0.0:${PORT}`.

**Frontend:**
- `client/src/main.jsx` - Mounts React application into `#root` DOM element in `client/index.html`.
- `client/src/App.jsx` - Sets up `RaceProvider`, global modals (`CountdownModal`, `BtoCelebrationModal`), `Navbar`, and conditional screen rendering.

## Error Handling

- **REST API Boundaries:** All endpoints wrapped in `try / catch` blocks returning standard JSON:
  - On success: `{ success: true, ...data }`
  - On failure: `{ success: false, error: err.message }` with appropriate HTTP status codes (`400` for validation/business errors, `500` for internal errors).
- **Database Transactions:** Handled through `db.transaction(() => { ... })`. Any error thrown automatically rolls back statements and aborts disk export.
- **Client Handling:** Displays cyberpunk-styled feedback banners (`feedback.type = 'error'`), triggers haptic error vibrations (`hapticError()`), and prevents UI freezing during network disconnections.

## Cross-Cutting Concerns

- **Real-Time Synchronization:** Managed centrally via `broadcastFullState()`. Any write endpoint triggers this function, guaranteeing that all client screens are strictly in sync without polling.
- **Aesthetic Styling:** Cyberpunk / Neo-Racing HUD design tokens configured globally via Tailwind CSS (`client/tailwind.config.js`) and custom CRT/chamfer classes (`client/src/index.css`).
- **Audio Autoplay Resilience:** `CyberAudioEngine.initContext()` resumes suspended browser AudioContext on first user touch/click.

---

*Architecture analysis: 2026-09-03*
*Update after major architectural changes*
