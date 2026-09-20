---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# External Integrations

**Analysis Date:** 2026-09-20

## APIs & External Services

**Google Sheets Synchronization Engine:**
- Service: Google Sheets CSV Export API & Public Web Endpoints
  - Implementation: `server/services/googleSheetService.js`, `server/services/sheetSyncScheduler.js`
  - URL Normalization: Automatically converts standard edit URLs (`https://docs.google.com/spreadsheets/d/{ID}/edit?gid={GID}`) into direct export endpoints (`https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`).
  - Synchronized Worksheets:
    - Participant Roster Sheet: Imports racers, participant numbers (`#001`), team names, phone numbers, and coupon balances.
    - Elimination Bracket Sheet: Synchronizes Round 2 (Elimination) and Babak 3 (Quarter/Semi/Final) 3-lane match heats with in-app result protections.
  - Background Cron Scheduler: Automated background interval runner executing sync jobs every 60 seconds (configurable, minimum 10s).
  - Telemetry & Status API: `/api/participants/sync-sheet/status` provides live sync state, timestamps, error reporting, and last result summaries.

**Google Identity Services (OAuth 2.0):**
- Service: Google Sign-In & ID Token Verification
  - Implementation: `server/services/authService.js`, `server/middleware/authMiddleware.js`
  - Client SDK: Google Identity Services web client loaded in `client/index.html` / `client/src/components/auth/GoogleLoginButton.jsx`.
  - Backend Verifier: `google-auth-library` (`OAuth2Client.verifyIdToken`) validating token audience against `GOOGLE_CLIENT_ID`.
  - Offline Test Mode: Supports `mock-google-token:*` exclusively in test/dev environments.

**Browser Audio Synthesis & Indonesian Voice Engine:**
- Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`):
  - File: `client/src/utils/audio.js`, `client/src/utils/audioChime.js`
  - Purpose: Generates synthetic audio tones (cyberpunk hydraulic lock clicks, ready chimes, race start buzzers, and multi-frequency BTO siren sound).
  - Auth: Native browser client-side API.
- Web Speech API (`SpeechSynthesis`, `SpeechSynthesisUtterance`):
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
- Camera QR Scanner:
  - File: `client/src/utils/qrScannerHelper.js`, `client/src/screens/ParticipantDashboard.jsx`
  - Purpose: Accesses mobile device camera feed (`navigator.mediaDevices.getUserMedia`) to scan track start-line stencils (`LINE A`, `LINE B`, `LINE C`).
- QR Code Generator:
  - File: `client/src/screens/DeskQRCodes.jsx`
  - Purpose: Renders high-resolution printable SVG QR codes for physical race track pit tables.

## Data Storage

**Databases:**
- SQLite (WASM via `sql.js`):
  - File: `server/db.js`, `server/migrations.js`
  - Connection / Path: File-backed buffer initialized from `process.env.DB_PATH` or `data/tamiya.sqlite`.
  - Persistence Mechanism: Custom `SqliteWrapper` class exporting WASM memory buffer to disk synchronously on write operations (`this.rawDb.export()` -> `fs.writeFileSync`).
  - Automated Backup Engine: `server/backup.js` creates timestamped backups in `data/backups/tamiya-YYYYMMDD-HHmmss.sqlite`.
  - Key Tables:
    - `users`: User profiles, racer tags, roles (`super_admin`, `admin`, `director`, `cashier`, `marshal`, `scrutineer`, `participant`), approval statuses (`pending`, `approved`, `suspended`).
    - `events`: Multi-tournament event scope, active event selection, and archive tracking.
    - `coupons`: Balance tracking for qualifying heats with relational transactions.
    - `races`: Heat records, status (`draft`, `pre-start`, `locked`, `completed`), winner references.
    - `race_registrations`: Lane assignments (`A`, `B`, `C`), status (`pending`, `ready`), finish times, scrutineer verdict (`pending`, `pass`, `disqualified`).
    - `bracket_matches`: Multi-round tournament tree (Round 1, Round 2, Babak 3 with 21 heats cap, Semifinal, Grand Final), supporting 3 lanes (`user_id_1`, `user_id_2`, `user_id_3`), finish times, winners, and `is_no_race` markers.
    - `bto_records`: Fast-access Best Time Overall entries linked to events and racers.
    - `tournament_settings`: Key-value storage for round locks, sheet URLs, auto-sync intervals, and tournament toggles.

**File Storage:**
- Local filesystem disk storage in `data/` directory.
- Containerized persistence using Docker named volume `tamiya_data` mounted to `/app/data`.

**Caching:**
- In-memory SQLite state managed in WASM heap by `sql.js`.
- Browser `localStorage` caching active user session and bearer auth token (`tamiya_auth_token`, `tamiya_user`).

## Authentication & Identity

**Auth Provider:**
- Multi-Role RBAC with Google Identity & Assisted Virtual Accounts:
  - Implementation: `server/services/authService.js`, `server/middleware/authMiddleware.js`.
  - Super Admin: Automatically assigned to `SUPER_ADMIN_EMAIL` (default `tropicans@gmail.com`).
  - Role Hierarchy: `super_admin` > `admin` > `director` / `cashier` / `marshal` / `scrutineer` > `participant`.
  - User Approval Workflow: New Google logins enter `pending` state; must be approved by Super Admin before accessing mutating actions.
  - Virtual Guest Accounts: Cashier creates instant guest racers (`guest101@tamiya.local`) with custom racer tag and initial coupon balance.
  - Bearer Token Sessions: Tokens issued upon login with 7-day TTL, validated on all protected API routes.

## Monitoring & Observability

**Error Tracking:**
- Server-side structured error logging via `console.error` and standardized JSON responses (`{ success: false, code: '...', error: err.message }`).
- Client-side cyber error banners and vibration alerts.

**Telemetry & Health:**
- REST Health Check: `GET /api/health` reports system uptime, environment, timestamp, and database status.
- Sync Telemetry: `GET /api/participants/sync-sheet/status` provides live scheduler metrics.
- Logs captured via standard streams (`stdout` / `stderr`) and Docker Compose daemon (`docker compose logs -f`).

## CI/CD & Deployment

**Hosting:**
- Containerized Linux environment (`node:20-alpine`).
- Docker Compose configuration: `docker-compose.yml`.
  - Service: `tamiya-app`
  - Exposed Port: `3000:3000`
  - Persistent Volume: `tamiya_data:/app/data`

**Build Pipeline:**
- Multi-stage Docker build:
  - Stage 1 (`client-builder`): Installs client dependencies and compiles Vite production bundle into `client/dist`.
  - Stage 2 (`runner`): Installs production server dependencies, mounts built static assets from Stage 1 into `client/dist`, and executes `server/index.js`.

## Environment Configuration

**Development:**
- Port: `3000` (proxy routed from Vite dev server on port `5173`).
- Concurrently runs Node backend and Vite dev server.

**Production:**
- `NODE_ENV=production`
- `PORT=3000`
- `DB_PATH=/app/data/tamiya.sqlite`
- `GOOGLE_CLIENT_ID=<configured_id>`
- `SUPER_ADMIN_EMAIL=tropicans@gmail.com`
- Express serves REST APIs, WebSocket streams, and compiled SPA assets from `client/dist/`.

## Webhooks & Real-Time Event Engine

**WebSocket (Socket.IO) Events:**

**Client to Server:**
- `GET_STATE` - Requests immediate full tournament state snapshot.

**Server to Client Broadcasts:**
- `STATE_UPDATE` - Emitted whenever tournament state changes (registration, ready, lock, times, scrutineer result, top-up, bracket update). Carries full state payload: active race, BTO leaderboard, upcoming queue, scrutineer queue, bracket matches, sync status.
- `RACE_LOCKED` - Emitted when RD locks the heat. Triggers hydraulic lock audio, haptic vibration on phones, and changes TV banner to `READY - LINTASAN SIAP!`.
- `RACE_STARTED` - Emitted when physical race begins. Updates TV to `BALAPAN BERLANGSUNG`.
- `RACE_FINISHED_PENDING_SCRUTINEER` - Emitted when finish times are submitted. Sends winner to Scrutineering desk and updates TV status to `VERIFIKASI MEJA SCRUTINEER`.
- `NEW_BTO_RECORD` - Emitted when a racer clocks the fastest verified lap time of the day. Triggers golden confetti explosion, siren sound, and takeover celebration modal across all connected screens.
- `COUNTDOWN_STARTED` - Starts 10-second vocal countdown for Round 2.
- `COUNTDOWN_TICK` - Emitted every second with number name, triggering Indonesian speech and haptic ticks.
- `COUNTDOWN_COMPLETE` - Emitted at zero, triggering `GO! LEPAS MOBIL!` signal.
- `COUNTDOWN_STOPPED` - Emitted when RD aborts countdown early with "SIAP / STOP", immediately playing start tone and flashing `RACE READY - LEPAS!`.
- `BRACKET_AUTO_SWITCH` - Emitted when all heats of a round complete, notifying client dashboards to advance view to next round.

---

*Integration audit: 2026-09-20*
*Update when adding/removing external services*
