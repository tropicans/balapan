---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# External Integrations

**Analysis Date:** 2026-09-03

## APIs & External Services

**Browser Audio Synthesis & Indonesian Voice Engine:**
- Web Audio API (`AudioContext` / `OscillatorNode` / `GainNode`):
  - File: `client/src/utils/audio.js`
  - Purpose: Generates synthetic audio tones (cyberpunk hydraulic lock clicks, ready chimes, race start buzzers, and multi-frequency BTO siren sound).
  - Auth: None (Client-side native browser API).
- Web Speech API (`SpeechSynthesis` / `SpeechSynthesisUtterance`):
  - File: `client/src/utils/audio.js`
  - Purpose: Pronounces Indonesian numbers during the Round 2 elimination countdown (*"Sepuluh... Sembilan... Delapan... Satu!"*).
  - Language: `id-ID` locale.
  - Controls: Automatic cancellation on new tick (`speechSynth.cancel()`) and instant abort on RD stop.

**Browser Haptic Feedback Engine:**
- Navigator Vibration API (`navigator.vibrate`):
  - File: `client/src/hooks/useHaptic.js`
  - Purpose: Physical tactile feedback on mobile devices for racer confirmation (`hapticReady`: `[120, 60, 120]`), RD race lock (`hapticLock`: `[200, 100, 200]`), countdown tick (`hapticTick`: `[80]`), and validation failure (`hapticError`: `[300, 100, 300]`).
  - Auth: Native browser permission model.

**Mobile Optical Scanner & QR Code Rendering:**
- `html5-qrcode` Library:
  - File: `client/src/screens/ParticipantDashboard.jsx`
  - Purpose: Accesses mobile device camera feed (`navigator.mediaDevices.getUserMedia`) to scan track start-line stencils (`LINE A`, `LINE B`, `LINE C`).
- `qrcode.react` SVG Generator:
  - File: `client/src/screens/DeskQRCodes.jsx`
  - Purpose: Renders high-resolution printable SVG QR codes for physical race track pit tables.

## Data Storage

**Databases:**
- SQLite (WASM via `sql.js`):
  - File: `server/db.js`
  - Connection / Path: File-backed buffer initialized from `process.env.DB_PATH` or `data/tamiya.sqlite`.
  - Persistence Mechanism: Custom `SqliteWrapper` class exporting WASM memory buffer to disk synchronously on write operations (`this.rawDb.export()` -> `fs.writeFileSync`).
  - Tables:
    - `users`: User profiles, racer tags, roles (`admin`, `scrutineer`, `participant`), virtual user flags.
    - `coupons`: Balance tracking for qualifying heats with relational cascade.
    - `races`: Heat records, status (`draft`, `pre-start`, `locked`, `completed`), winner references.
    - `race_registrations`: Lane assignments (`A`, `B`, `C`), status (`pending`, `ready`), finish times, scrutineer verdict (`pending`, `pass`, `disqualified`).
    - `bracket_matches`: Single-elimination tournament tree with binary match hierarchy (`parent_match_id`).

**File Storage:**
- Local filesystem disk storage in `data/` directory.
- Containerized persistence using Docker named volume `tamiya_data` mounted to `/app/data`.

**Caching:**
- In-memory SQLite state managed by `sql.js` WASM heap.
- Browser `localStorage` caching active user session: `tamiya_user` (`client/src/context/RaceContext.jsx`).

## Authentication & Identity

**Auth Provider:**
- Dual-Track Hybrid Identity System:
  - Implementation: `server/index.js` (`/api/users/login`, `/api/users/guest`).
  - Registered / Google Users: Accepts `name`, `email`, `googleSubId`, and `teamName`. Maps to real participant record.
  - Virtual Accounts (Assisted Track): Cashier creates virtual guest accounts (`guest101@tamiya.local`) with custom racer tag and initial coupon balance for kids or guests without mobile phones.
  - Token / Session Management: Client persists active user object in `localStorage`. In-memory context allows quick user switching for testing and multi-role operations.

**Role-Based Access:**
- Roles supported in schema: `admin` (Race Director), `scrutineer` (Juri Meja Fisik), `participant` (Pembalap).
- Navigation switching facilitated via top Cyberpunk navigation bar (`client/src/components/ui/Navbar.jsx`).

## Monitoring & Observability

**Error Tracking:**
- Server-side error logging via `console.error` and structured JSON error responses (`{ success: false, error: err.message }`).
- Client-side visual alert banners (`feedback` states) and haptic warning pulses.

**Logs:**
- Standard output (`stdout` / `stderr`) captured by Docker daemon (`docker compose logs -f`).

## CI/CD & Deployment

**Hosting:**
- Containerized Linux environment (`node:20-alpine`).
- Docker Compose configuration: `docker-compose.yml`.
  - Service: `tamiya-app`
  - Exposed Port: `3000:3000`
  - Persistent Volume: `tamiya_data:/app/data`

**Build Pipeline:**
- Multi-stage Docker build:
  - Stage 1 (`client-builder`): Copies `client/`, executes `npm install` and `npm run build` producing production bundle in `client/dist`.
  - Stage 2 (`runner`): Copies root `package.json`, installs production dependencies with `--omit=dev`, copies `server/`, pulls built static assets from Stage 1 into `client/dist`, and starts `server/index.js`.

## Environment Configuration

**Development:**
- Port: `3000`
- Concurrently runs Node backend and Vite dev server.
- Optional custom SQLite path via `DB_PATH`.

**Production:**
- `NODE_ENV=production`
- `PORT=3000`
- `DB_PATH=/app/data/tamiya.sqlite`
- Express serves both REST APIs, WebSocket connections, and production static assets from `client/dist/`.

## Webhooks & Real-Time Event Engine

**WebSocket (Socket.IO) Events:**

**Client to Server:**
- `GET_STATE` - Requests immediate full tournament state snapshot.

**Server to Client Broadcasts:**
- `STATE_UPDATE` - Emitted whenever tournament state changes (registration, ready, lock, times, scrutineer result, top-up). Carries full state payload: active race, BTO leaderboard, upcoming queue, scrutineer queue, bracket matches.
- `RACE_LOCKED` - Emitted when RD locks the heat. Triggers hydraulic lock audio, haptic vibration on phones, and changes TV banner to `READY - LINTASAN SIAP!`.
- `RACE_STARTED` - Emitted when physical race begins. Updates TV to `BALAPAN BERLANGSUNG`.
- `RACE_FINISHED_PENDING_SCRUTINEER` - Emitted when finish times are submitted. Sends winner to Scrutineering desk and updates TV status to `VERIFIKASI MEJA SCRUTINEER`.
- `NEW_BTO_RECORD` - Emitted when a racer clocks the fastest verified lap time of the day. Triggers golden confetti explosion, siren sound, and takeover celebration modal across all connected screens.
- `COUNTDOWN_STARTED` - Starts 10-second vocal countdown for Round 2.
- `COUNTDOWN_TICK` - Emitted every second with number name, triggering Indonesian speech and haptic ticks.
- `COUNTDOWN_COMPLETE` - Emitted at zero, triggering `GO! LEPAS MOBIL!` signal.
- `COUNTDOWN_STOPPED` - Emitted when RD aborts countdown early with "SIAP / STOP", immediately playing start tone and flashing `RACE READY - LEPAS!`.

---

*Integration audit: 2026-09-03*
*Update when adding/removing external services*
