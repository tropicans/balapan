---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# Technology Stack

**Analysis Date:** 2026-09-03

## Languages

**Primary:**
- JavaScript (ES Modules, Node.js & Browser) - All application logic across backend server (`server/index.js`, `server/raceManager.js`, `server/db.js`) and frontend client (`client/src/`).
- JSX (React 18) - Frontend UI component rendering and reactivity across all screens and UI widgets.

**Secondary:**
- HTML5 / CSS3 (Tailwind CSS 3.4.17) - Layout, Cyberpunk HUD styles, scanlines, animations, neon glow shadows, and responsive grid layouts (`client/index.html`, `client/src/index.css`).
- SQL (SQLite dialect via WASM `sql.js`) - Relational schema definition, constraints, and queries (`server/db.js`).

## Runtime

**Environment:**
- Node.js 20.x (Alpine base in Docker `node:20-alpine`, local Node.js runtime)
- Browser environment for client: Modern evergreen browsers (Chrome, Edge, Safari, Firefox) supporting Web Audio API, Web Speech API (`SpeechSynthesis`), Navigator Vibration API (`navigator.vibrate`), and MediaDevices camera stream (`navigator.mediaDevices.getUserMedia`).

**Package Manager:**
- npm (Root package manager and nested client package manager)
- Lockfiles present:
  - Root: `package-lock.json`
  - Client: `client/package-lock.json`

## Frameworks

**Core:**
- Express.js 4.21.2 - Backend REST API routing, JSON body parsing, static file serving (`server/index.js`).
- Socket.IO 4.8.1 - Bidirectional real-time event streaming and state broadcasts (`server/index.js`).
- React 18.3.1 - Client-side component architecture, state management via React Context (`client/src/context/RaceContext.jsx`).

**Testing:**
- Node.js native `assert` module - Regression test suite executing end-to-end tournament workflow (`server/tests/race-flow.test.js`).

**Build/Dev:**
- Vite 6.0.11 - Frontend bundler, development server with HMR, and production asset builder (`client/vite.config.js`).
- Tailwind CSS 3.4.17 & PostCSS 8.4.49 - Utility-first styling with custom cyberpunk theme tokens (`client/tailwind.config.js`, `client/postcss.config.js`).
- Concurrently 9.1.2 - Runs `dev:server` and `dev:client` concurrently during local development.

## Key Dependencies

**Critical:**
- `sql.js` 1.14.2 - WebAssembly-compiled SQLite engine running entirely in JavaScript memory with binary disk synchronization (`server/db.js`). Eliminates native C++ compilation bindings on host machines.
- `socket.io` & `socket.io-client` 4.8.1 - Low-latency real-time synchronization between Race Director, Layar TV, Scrutineer, Cashier, and Participant phones.
- `framer-motion` 12.4.7 - Cyberpunk HUD entry animations, modal transitions, and banner animations (`client/src/components/ui/CountdownModal.jsx`, `client/src/components/ui/BtoCelebrationModal.jsx`).
- `html5-qrcode` 2.3.8 - Mobile camera QR code scanner scanning desk track stencils (`client/src/screens/ParticipantDashboard.jsx`).
- `qrcode.react` 4.2.0 - SVG rendering of QR codes for physical desk printing (`client/src/screens/DeskQRCodes.jsx`).
- `canvas-confetti` 1.9.4 - Golden celebration confetti particle explosions on new BTO (Best Time Overall) record takeover.
- `uuid` 11.0.5 - Universally unique identifiers for users, races, registrations, coupons, and bracket match trees.
- `lucide-react` 1.16.0 - Cyberpunk-themed iconography across all dashboard panels.

**Infrastructure:**
- `cors` 2.8.5 - Cross-Origin Resource Sharing middleware for Express.
- `dotenv` 16.4.7 - Environment variable loading from `.env` files.
- `tailwind-merge` 3.0.2 & `clsx` 2.1.1 - Safe conditional class name resolution and override handling for UI components.

## Configuration

**Environment:**
- Environment variables:
  - `PORT`: Server listen port (default `3000`).
  - `NODE_ENV`: Application environment (`development` vs `production`).
  - `DB_PATH`: File path for SQLite database persistence (default `data/tamiya.sqlite`).

**Build:**
- `package.json` - Root scripts (`dev`, `build`, `start`, `test`).
- `client/package.json` - Client build scripts (`dev`, `build`, `preview`).
- `client/vite.config.js` - Vite configuration with `@vitejs/plugin-react` and dev proxy config.
- `client/tailwind.config.js` - Theme extensions (custom colors `midnight`, `obsidian`, `neonPink`, `neonCyan`, `neonGreen`, `neonAmber`, `cyberSilver`, custom fonts, and box shadows).
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

*Stack analysis: 2026-09-03*
*Update after major dependency changes*
