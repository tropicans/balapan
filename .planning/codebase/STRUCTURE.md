---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# Codebase Structure

**Analysis Date:** 2026-09-20

## Directory Layout

```
balapan/
├── client/                     # Frontend Single Page Application (React 18 + Vite + Tailwind)
│   ├── index.html              # HTML entry shell with Google Identity Services & viewport metadata
│   ├── package.json            # Client dependencies and Vite scripts
│   ├── postcss.config.js       # PostCSS plugins configuration
│   ├── tailwind.config.js      # Cyberpunk color tokens, fonts, and glowing shadow extensions
│   ├── vite.config.js          # Vite build tool and development proxy setup
│   └── src/                    # Client source code
│       ├── App.jsx             # Root React application component and screen router
│       ├── main.jsx            # React DOM mounting entry point
│       ├── index.css           # Global Tailwind directives, CRT scanlines, and cyber cut-paths
│       ├── components/         # Reusable UI widgets and specialized sub-components
│       │   ├── auth/           # Authentication widgets (GoogleLoginButton.jsx)
│       │   ├── bracket/        # Bracket visualization and match controls
│       │   ├── cashier/        # Cashier top-up and participant search modals
│       │   ├── director/       # Race Director controls (Heat lineup, Overrides, Round Locks)
│       │   ├── marshal/        # Pit marshal queue controls
│       │   ├── sync/           # Live sync indicators (SyncStatusBadge.jsx)
│       │   └── ui/             # Cyberpunk UI library (CyberButton, CyberCard, Navbar, Modals)
│       ├── context/            # React global state providers
│       │   ├── AuthContext.jsx # Google OAuth session, current user, and RBAC permissions
│       │   └── RaceContext.jsx # Global tournament state, Socket.IO sync, and API methods
│       ├── hooks/              # Custom React hooks
│       │   └── useHaptic.js    # Mobile vibration API patterns (ready, lock, tick, error)
│       ├── screens/            # Application dashboard screens
│       │   ├── AdminUserDashboard.jsx       # User approvals, RBAC role assignment, system settings
│       │   ├── BracketDashboard.jsx         # Multi-round 3-lane bracket view (Babak 2, Babak 3, Finals)
│       │   ├── CashierDashboard.jsx         # Virtual guest registration and quick coupon top-up
│       │   ├── DeskQRCodes.jsx              # Printable QR code stencils for pit start tables (A, B, C)
│       │   ├── EventManagementDashboard.jsx # Multi-event creation, active switcher, archive
│       │   ├── MarshalDashboard.jsx         # Pit marshal queue coordination
│       │   ├── ParticipantDashboard.jsx     # Mobile camera scanner, giant Ready, and Cancel button
│       │   ├── RaceDirectorDashboard.jsx    # Central command console (Lock, Start, Finish, Overrides)
│       │   ├── RealtimeTV.jsx               # 16:9 Circuit TV HUD with active lanes, BTO, Best Race box
│       │   ├── ScrutineerDashboard.jsx      # Zero-keyboard tablet car inspection verification
│       │   └── WinnerRegistrationDashboard.jsx # Winner qualification desk
│       └── utils/              # Client utility functions
│           ├── api.js          # Fetch wrapper with Bearer token injection
│           ├── audio.js        # Web Audio synthesizer and Indonesian voice reader
│           ├── audioChime.js   # Cyberpunk audio alerts and chimes
│           └── qrScannerHelper.js # Mobile camera QR scanner helper
├── server/                     # Backend application (Express + Socket.IO + SQLite WASM)
│   ├── db.js                   # SqliteWrapper, WASM SQLite initialization, schema, and queries
│   ├── index.js                # Express server, Socket.IO engine, and REST route controllers
│   ├── raceManager.js          # Tournament state machine, rules, concurrency, and calculations
│   ├── ticketEngine.js         # Ticket packages and coupon balance transactions
│   ├── migrations.js           # Structured database schema migrations
│   ├── backup.js               # Timestamped SQLite database backup snapshots
│   ├── middleware/             # Express middlewares
│   │   └── authMiddleware.js   # RBAC session protection (requireAuth, requireApproved, requireRole)
│   ├── services/               # Modular domain services
│   │   ├── authService.js      # Google OAuth verification and user approval pipeline
│   │   ├── btoService.js       # Best Time Overall records and leaderboard calculation
│   │   ├── eventService.js     # Tournament event scoping and active event management
│   │   ├── googleSheetService.js # Google Sheet CSV normalization, roster sync, and bracket sync
│   │   ├── participantService.js # Participant CRUD, search, and coupon allocation
│   │   ├── sheetSyncScheduler.js # 60-second background cron sync runner and telemetry
│   │   ├── stateService.js     # State snapshot cache and payload aggregation
│   │   └── winnerService.js    # Winner registration and round qualification quotas
│   ├── utils/                  # Backend utilities
│   │   ├── csvParser.js        # Robust CSV tokenizer and header mapper
│   │   └── participantNumber.js # Formats participant numbering (#001 etc.)
│   └── tests/                  # Backend automated test suites (31 test files)
├── scripts/                    # Operational and deployment scripts
│   ├── import-roster.js        # Standalone roster import CLI
│   ├── inspect-tournament.js   # Tournament state inspection CLI
│   ├── reconcile-participants.mjs # Participant reconciliation script
│   ├── reset-tournament-data.js # Tournament reset utility
│   └── setup-git-hooks.js      # Pre-commit git hooks setup
├── data/                       # Local SQLite persistence directory
│   ├── tamiya.sqlite           # SQLite database binary file
│   └── backups/                # Timestamped SQLite backups
├── .agents/                    # GSD orchestrator configuration, skills, and workflows
├── .planning/                  # Project planning, roadmap, and codebase maps
├── Dockerfile                  # Production multi-stage Docker build file
├── docker-compose.yml          # Container orchestration service definition
├── package.json                # Root package configuration and development runner scripts
├── package-lock.json           # Root npm lockfile
└── README.md                   # System documentation and launch guide
```

## Directory Purposes

**`client/src/screens/`:**
- Purpose: Implements distinct operator role screens and public displays.
- Key files: `RaceDirectorDashboard.jsx`, `RealtimeTV.jsx`, `BracketDashboard.jsx`, `AdminUserDashboard.jsx`, `ParticipantDashboard.jsx`.

**`client/src/components/`:**
- Purpose: Modular UI widgets divided by functional domain (`ui/`, `bracket/`, `sync/`, `director/`, etc.).
- Key files: `Navbar.jsx`, `CyberButton.jsx`, `CyberCard.jsx`, `SyncStatusBadge.jsx`.

**`client/src/context/`:**
- Purpose: React Context providers managing shared global state.
- Key files: `RaceContext.jsx` (Socket.IO, race state), `AuthContext.jsx` (OAuth, sessions, roles).

**`server/services/`:**
- Purpose: Domain service layer decoupling business logic from Express route handlers.
- Key files: `googleSheetService.js`, `sheetSyncScheduler.js`, `authService.js`, `btoService.js`.

**`server/middleware/`:**
- Purpose: Express middleware verifying sessions, approvals, and roles.
- Key files: `authMiddleware.js`.

**`server/tests/`:**
- Purpose: Automated regression test suites verifying race lifecycles, bracket logic, Google Sheet sync, and RBAC.
- Key files: 31 test files including `race-flow.test.js`, `babak3-21heats-cap.test.js`, `in-app-results-protection.test.js`, `phase-27-mutation-rbac.test.js`.

## Key File Locations

**Entry Points:**
- `server/index.js`: Backend HTTP/WebSocket server entry point.
- `client/src/main.jsx`: Frontend React application mounting entry point.
- `client/src/App.jsx`: Screen routing and global modal container.

**Configuration:**
- `.env`: Environment secrets and configuration (ports, Google Client ID, Super Admin email).
- `package.json`: Root scripts (`dev`, `build`, `test`, `docker:*`).
- `client/vite.config.js`: Vite bundling and dev proxy configuration.
- `client/tailwind.config.js`: Design system theme definition.

**Core Logic:**
- `server/raceManager.js`: Tournament finite-state machine and heat progression.
- `server/services/googleSheetService.js`: Google Sheets sync and CSV parsing.
- `server/services/sheetSyncScheduler.js`: Background sync cron.
- `server/services/authService.js`: Authentication and RBAC.
- `server/db.js`: Database engine and queries.

## Naming Conventions

**Files:**
- React Screens & Components: `PascalCase.jsx` (e.g., `BracketDashboard.jsx`, `SyncStatusBadge.jsx`).
- Backend Modules & Services: `camelCase.js` (e.g., `googleSheetService.js`, `raceManager.js`).
- Tests: `kebab-case.test.js` under `server/tests/`.
- Utility Files: `camelCase.js`.

**Variables & Functions:**
- Functions & Methods: `camelCase` (e.g., `advanceBracketWinner`, `syncBracketFromSheet`).
- React Hooks: Prefixed with `use` (e.g., `useRace`, `useAuth`, `useHaptic`).
- Database Columns: `snake_case` (e.g., `finish_time`, `user_id`, `is_no_race`).
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_SHEET_URL`, `DEFAULT_SUPER_ADMIN`).

## Where to Add New Code

**New Screen / Operator View:**
- Implementation: `client/src/screens/YourScreen.jsx`.
- Navigation: Add screen key to `client/src/components/ui/Navbar.jsx` and route in `client/src/App.jsx`.
- RBAC permissions: Configure allowed roles in `client/src/context/AuthContext.jsx`.

**New Backend Domain Feature / External Integration:**
- Service Logic: `server/services/yourService.js`.
- REST Endpoints: Register routes in `server/index.js`.
- Route Protection: Apply `requireAuth`, `requireApproved`, or `requireRole('admin')` from `server/middleware/authMiddleware.js`.
- Database Migration: If new tables/columns needed, append migration in `server/migrations.js` and schema in `server/db.js`.
- Real-Time Broadcasts: Call `broadcastFullState()` or emit dedicated event via `io.emit(...)`.
- Automated Test: Add standalone test in `server/tests/your-feature.test.js` and add to `"test"` script in `package.json`.

---

*Structure analysis: 2026-09-20*
*Update after major directory changes*
