---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# Codebase Structure

**Analysis Date:** 2026-09-03

## Directory Layout

```
balapan/
├── client/                     # Frontend Single Page Application (React 18 + Vite + Tailwind)
│   ├── index.html              # HTML entry shell with Google Fonts & viewport metadata
│   ├── package.json            # Client dependencies and Vite scripts
│   ├── postcss.config.js       # PostCSS plugins configuration
│   ├── tailwind.config.js      # Cyberpunk color tokens, fonts, and glowing shadow extensions
│   ├── vite.config.js          # Vite build tool and development proxy setup
│   └── src/                    # Client source code
│       ├── App.jsx             # Root React application component and screen switcher
│       ├── main.jsx            # React DOM mounting entry point
│       ├── index.css           # Global Tailwind directives, CRT scanlines, and cyber cut-paths
│       ├── components/ui/      # Reusable Cyberpunk UI widgets and modals
│       │   ├── BtoCelebrationModal.jsx  # Fullscreen gold celebration modal with confetti
│       │   ├── CountdownModal.jsx       # 10s voice countdown overlay modal
│       │   ├── CyberButton.jsx          # Angular chamfered button with glowing neon states
│       │   ├── CyberCard.jsx            # Border-glow content container with corner accents
│       │   └── Navbar.jsx               # Top navigation bar with active heat badge & role switcher
│       ├── context/            # React state providers
│       │   └── RaceContext.jsx          # Global tournament state, Socket.IO sync, and API methods
│       ├── hooks/              # Custom React hooks
│       │   └── useHaptic.js             # Mobile vibration API patterns (ready, lock, tick, error)
│       ├── screens/            # Application dashboard screens
│       │   ├── BracketDashboard.jsx     # Round 2 Single Elimination tournament bracket view
│       │   ├── CashierDashboard.jsx     # Virtual guest registration and quick coupon top-up
│       │   ├── DeskQRCodes.jsx          # Printable QR code stencils for pit start tables (A, B, C)
│       │   ├── ParticipantDashboard.jsx # Mobile camera scanner, giant Ready, and Cancel button
│       │   ├── RaceDirectorDashboard.jsx# Central command console (Lock, Start, Finish, Overrides)
│       │   ├── RealtimeTV.jsx           # 16:9 Circuit TV HUD with active lanes and Top 5 BTO
│       │   └── ScrutineerDashboard.jsx  # Zero-keyboard tablet car inspection verification
│       └── utils/              # Client utility functions
│           └── audio.js                 # Web Audio synthesizer and Indonesian voice reader
├── server/                     # Backend application (Express + Socket.IO + SQLite WASM)
│   ├── db.js                   # SqliteWrapper, WASM SQLite initialization, schema, and seeds
│   ├── index.js                # Express server, Socket.IO engine, and REST route controllers
│   ├── raceManager.js          # Tournament state machine, rules, concurrency, and calculations
│   └── tests/                  # Backend automated test suites
│       └── race-flow.test.js   # End-to-end integration test verifying complete tournament flow
├── data/                       # Local SQLite persistence directory (auto-created at runtime)
│   └── tamiya.sqlite           # SQLite database binary file (persisted across restarts)
├── .agents/                    # GSD orchestrator configuration, skills, and workflows
├── Dockerfile                  # Production multi-stage Docker build file (Vite build + Node runner)
├── docker-compose.yml          # Container orchestration service definition with volume mapping
├── package.json                # Root package configuration and development runner scripts
├── package-lock.json           # Root npm lockfile
├── README.md                   # System documentation, feature manual, and launch guide
└── tamiya-vibescoding-context-recipe.md # Master context engineering and prompt specification
```

## Directory Purposes

**`client/`:**
- Purpose: Contains the complete frontend web application.
- Contains: React components, styling configurations, static assets, and client-side libraries.
- Key files: `client/src/App.jsx`, `client/src/context/RaceContext.jsx`, `client/tailwind.config.js`.

**`client/src/components/ui/`:**
- Purpose: Houses reusable UI elements following the Cyberpunk / Neo-Racing visual identity.
- Contains: Buttons with chamfered 45-degree cuts, cards with glowing drop-shadows, global navigation, and event modals.
- Key files: `CyberButton.jsx`, `CyberCard.jsx`, `Navbar.jsx`, `CountdownModal.jsx`, `BtoCelebrationModal.jsx`.

**`client/src/screens/`:**
- Purpose: Implements the distinct operator role screens and public displays.
- Contains: One JSX screen per operator domain (Participant, RD, Scrutineer, Cashier, TV HUD, Bracket, QR).
- Key files: `ParticipantDashboard.jsx`, `RaceDirectorDashboard.jsx`, `RealtimeTV.jsx`.

**`server/`:**
- Purpose: Back-end API services, database connection, real-time messaging, and tournament business logic.
- Contains: Node.js ES module source files and database migration/seed scripts.
- Key files: `server/index.js`, `server/raceManager.js`, `server/db.js`.

**`server/tests/`:**
- Purpose: Regression and integration testing of tournament state transitions and business rules.
- Contains: Standalone node test scripts.
- Key files: `server/tests/race-flow.test.js`.

## Key File Locations

**Entry Points:**
- `server/index.js`: Backend HTTP/WebSocket server entry point.
- `client/src/main.jsx`: Frontend React application mounting entry point.
- `client/src/App.jsx`: Screen routing and global modal wrapper.

**Configuration:**
- `package.json`: Root package manifests and orchestrator scripts.
- `client/package.json`: Client package manifests and Vite scripts.
- `client/vite.config.js`: Vite bundling configuration.
- `client/tailwind.config.js`: Design system theme definition.
- `Dockerfile`: Multi-stage container build definition.
- `docker-compose.yml`: Container runtime specification.

**Core Logic:**
- `server/raceManager.js`: State machine, race creation, coupon deduction, BTO evaluation, and bracket progression.
- `server/db.js`: Database wrapper, tables creation, and seed data.
- `client/src/context/RaceContext.jsx`: Client-side real-time state synchronization.

**Testing:**
- `server/tests/race-flow.test.js`: Integration test for race flow, concurrency, coupon deduction, and auto-brackets.

**Documentation:**
- `README.md`: Architectural overview, module documentation, and deployment instructions.
- `tamiya-vibescoding-context-recipe.md`: Detailed prompt engineering specification and theme styling guide.

## Naming Conventions

**Files:**
- React Components & Screens: `PascalCase.jsx` (e.g., `ParticipantDashboard.jsx`, `CyberButton.jsx`).
- Logic Modules & Services: `camelCase.js` (e.g., `raceManager.js`, `db.js`, `audio.js`).
- Hooks: `camelCase.js` with `use` prefix (e.g., `useHaptic.js`).
- Tests: `kebab-case.test.js` (e.g., `race-flow.test.js`).
- Config Files: `kebab-case.js` or standard tooling names (e.g., `tailwind.config.js`, `vite.config.js`).

**Directories:**
- Feature directories and categories: `kebab-case` or lowercase single words (e.g., `components`, `screens`, `ui`, `context`, `hooks`, `utils`, `tests`).

## Where to Add New Code

**New Screen / Operator View:**
- Implementation: `client/src/screens/[NewScreenName].jsx`
- Navigation Link: Add entry in `client/src/components/ui/Navbar.jsx`
- Routing Integration: Register screen conditional render in `client/src/App.jsx`

**New UI Component:**
- Implementation: `client/src/components/ui/[ComponentName].jsx`
- Styling: Reuse classes from `client/tailwind.config.js` and `client/src/index.css`

**New API Endpoint & Business Action:**
- Logic Method: Implement in `server/raceManager.js` under `RaceManager` class
- Route Handler: Add endpoint in `server/index.js` (with `try/catch` and `broadcastFullState()`)
- Client API Consumer: Add wrapper method in `client/src/context/RaceContext.jsx`

**New Test Case:**
- Add assertions in `server/tests/race-flow.test.js` or create a new test file under `server/tests/`.

---

*Structure analysis: 2026-09-03*
*Update after directory reorganizations*
