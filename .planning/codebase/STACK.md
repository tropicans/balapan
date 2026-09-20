---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# Technology Stack

**Analysis Date:** 2026-09-20

## Languages

**Primary:**
- JavaScript (ES Modules, Node.js & Browser) - All backend services, controllers, database layers (`server/index.js`, `server/raceManager.js`, `server/db.js`, `server/services/`), and frontend application logic (`client/src/`).
- JSX (React 18) - Frontend UI component rendering, reactive dashboard screens, and state-driven cyberpunk HUD views (`client/src/screens/`, `client/src/components/`).

**Secondary:**
- HTML5 / CSS3 (Tailwind CSS 3.4.17) - Layout, responsive grid systems, Cyberpunk HUD styles, CRT scanlines, neon glowing shadows, and chamfered clip-paths (`client/index.html`, `client/src/index.css`, `client/tailwind.config.js`).
- SQL (SQLite dialect via WASM `sql.js`) - Relational schema definition, constraints, foreign keys, and ACID transactions (`server/db.js`, `server/migrations.js`).

## Runtime

**Environment:**
- Node.js 20.x (Alpine base in Docker `node:20-alpine`, local Node.js runtime).
- Browser environment for client: Modern evergreen browsers (Chrome, Edge, Safari, Firefox) supporting Web Audio API (`AudioContext`), Web Speech API (`SpeechSynthesis`), Navigator Vibration API (`navigator.vibrate`), and MediaDevices camera stream (`navigator.mediaDevices.getUserMedia`).

**Package Manager:**
- npm (Root package manager with nested `client` workspace package manager).
- Lockfiles present:
  - Root: `package-lock.json`
  - Client: `client/package-lock.json`

## Frameworks

**Core:**
- Express.js 4.21.2 - Backend REST API routing, JSON/text body parsing, and static file serving (`server/index.js`).
- Socket.IO 4.8.1 - Bidirectional real-time event streaming and state broadcasts (`server/index.js`).
- React 18.3.1 - Client-side component architecture, state management via React Context (`client/src/context/RaceContext.jsx`, `client/src/context/AuthContext.jsx`).

**Testing:**
- Node.js native test runner and `node:assert` module - 31 automated test suites covering tournament lifecycles, bracket progression, RBAC, Google Sheet sync, and migrations (`server/tests/`).

**Build/Dev:**
- Vite 6.0.11 - Frontend bundler, development server with HMR, and production asset builder (`client/vite.config.js`).
- Tailwind CSS 3.4.17 & PostCSS 8.4.49 - Utility-first styling with custom cyberpunk theme tokens (`client/tailwind.config.js`, `client/postcss.config.js`).
- Concurrently 9.1.2 - Runs `dev:server` and `dev:client` concurrently during local development.

## Key Dependencies

**Critical:**
- `sql.js` 1.14.2 - WebAssembly-compiled SQLite engine running entirely in JavaScript memory with binary disk synchronization (`server/db.js`). Eliminates native C++ compilation bindings on host machines.
- `socket.io` & `socket.io-client` 4.8.1 - Low-latency real-time synchronization between Race Director, Layar TV, Scrutineer, Cashier, Pit Marshal, and Participant mobile devices.
- `google-auth-library` 11.1.0 - Backend Google OAuth ID token verification for secure multi-role authentication (`server/services/authService.js`).
- `framer-motion` 12.4.7 - Cyberpunk HUD entry animations, modal transitions, and banner animations (`client/src/components/ui/CountdownModal.jsx`, `client/src/components/ui/BtoCelebrationModal.jsx`).
- `canvas-confetti` 1.9.4 - Golden celebration confetti particle explosions on new BTO (Best Time Overall) record takeover (`client/src/components/ui/BtoCelebrationModal.jsx`).
- `uuid` 11.0.5 - Universally unique identifiers for users, races, registrations, coupons, and bracket match trees (`server/db.js`, `server/raceManager.js`).
- `lucide-react` 1.16.0 - Cyberpunk-themed iconography across all dashboard panels (`client/src/`).

**Infrastructure:**
- `cors` 2.8.5 - Cross-Origin Resource Sharing middleware for Express.
- `dotenv` 16.4.7 - Environment variable loading from `.env` files (`server/index.js`).
- `clsx` 2.1.1 & `tailwind-merge` - Safe conditional class name resolution and override handling for UI components.

## Configuration

**Environment:**
- Configured via `.env` file at project root (see `.env.example`):
  - `PORT`: Server listen port (default `3000`).
  - `NODE_ENV`: Application environment (`development` vs `production`).
  - `DB_PATH`: File path for SQLite database persistence (default `data/tamiya.sqlite`).
  - `GOOGLE_CLIENT_ID`: OAuth Client ID for Google Authentication.
  - `SUPER_ADMIN_EMAIL`: Email address granted automatic super_admin privileges (default `tropicans@gmail.com`).
  - `ALLOW_ANONYMOUS_MUTATIONS`: Safety toggle for testing / LAN environments (`false` in production).

**Build:**
- `package.json` - Root scripts (`dev`, `build`, `start`, `test`, `docker:*`).
- `client/package.json` - Client build scripts (`dev`, `build`, `preview`).
- `client/vite.config.js` - Vite configuration with `@vitejs/plugin-react` and development proxy.
- `client/tailwind.config.js` - Cyberpunk color tokens (`midnight`, `obsidian`, `neonPink`, `neonCyan`, `neonGreen`, `neonAmber`, `cyberSilver`), custom fonts, and drop-shadows.
- `client/postcss.config.js` - PostCSS runner configuring Tailwind and Autoprefixer.

## Platform Requirements

**Development:**
- Cross-platform: Windows, macOS, Linux with Node.js 18+ and npm installed.
- Optional: Docker & Docker Compose for containerized environment.

**Production:**
- Docker container deployment via multi-stage `Dockerfile` (`node:20-alpine`).
- Production orchestration via `docker-compose.yml` with persistent volume mount `tamiya_data:/app/data`.
- Reverse proxy / Load balancer with WebSocket upgrade support for Socket.IO (`Upgrade: websocket`).

---

*Stack analysis: 2026-09-20*
*Update after major dependency changes*
