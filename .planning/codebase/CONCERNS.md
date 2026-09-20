---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# Codebase Concerns

**Analysis Date:** 2026-09-20

## Tech Debt

**1. Synchronous WASM SQLite Disk Serialization:**
- **Issue:** `SqliteWrapper` in `server/db.js` exports the full database byte array (`this.rawDb.export()`) and writes it synchronously to disk (`fs.writeFileSync`) on every write query (`.run()`, `.exec()`, and `.transaction()`).
- **Why:** `sql.js` is a pure WebAssembly compilation of SQLite that operates in memory. Disk persistence requires serializing the entire memory buffer to the filesystem.
- **Impact:** While fast for a typical tournament (<10MB database, hundreds of heats), high-frequency write operations during peak registration could introduce synchronous disk I/O latency.
- **Fix approach:** Implement debounced writes (`saveTimeout` / deferred flush) or replace with `better-sqlite3` in environments where native C++ compilation is permitted.

**2. Anonymous Mutation Bypass in Non-Strict Environments:**
- **Issue:** `server/middleware/authMiddleware.js` contains fallback logic granting `super_admin` access if `ALLOW_ANONYMOUS_MUTATIONS === 'true'` or when `NODE_ENV === 'test'` without `TEST_STRICT_AUTH`.
- **Why:** Ensures seamless offline testing and backward compatibility for automated tests and local LAN venue setups without internet access.
- **Impact:** If `ALLOW_ANONYMOUS_MUTATIONS=true` is inadvertently deployed to production, unauthenticated users could execute admin mutations.
- **Fix approach:** Ensure production Docker container enforces `NODE_ENV=production` and `ALLOW_ANONYMOUS_MUTATIONS=false`.

**3. In-Memory Process State (Countdown & Scheduler):**
- **Issue:** Active countdown timers (`countdownInterval`) and background cron scheduler state (`sheetSyncScheduler.js`) live in Node.js process memory.
- **Why:** Simple implementation without external Redis/Bull queue dependencies.
- **Impact:** A server restart during a live countdown immediately resets the countdown.
- **Fix approach:** Store countdown target timestamp (`ends_at`) in `tournament_settings` table so reconnecting clients can resume timer state automatically.

## Known Bugs & Edge Cases

**1. iOS Safari Vibration & Speech Autoplay Policy:**
- **Symptoms:** Haptic vibrations do not trigger on iOS devices; Speech Synthesis countdown may remain silent on initial tick if user has not interacted with the screen.
- **Trigger:** iOS WebKit does not implement the standard `navigator.vibrate` API. Mobile Safari also enforces strict autoplay policies requiring user gestures before audio/speech plays.
- **Workaround:** Audio synthesis class (`CyberAudioEngine`) attempts to resume `AudioContext` on user touch gestures. The visual countdown modal and Circuit TV display remain the primary source of truth.
- **Root cause:** Apple WebKit platform constraints.

**2. Google Sheet Header / Tab ID Drift:**
- **Symptoms:** Roster or bracket sync fails or imports empty rows.
- **Trigger:** Tournament organizers renaming columns (e.g. changing `NAMA` to `RACER`) or duplicating sheet tabs (changing `gid`).
- **Workaround:** Omni-tokenizer and column alias resolver in `server/services/googleSheetService.js` handle common column name variations.
- **Root cause:** Uncontrolled schema modifications in external Google Sheets.

## Security Considerations

**1. Default Super Admin Fallback:**
- **Risk:** `server/services/authService.js` defaults `DEFAULT_SUPER_ADMIN` to `tropicans@gmail.com`.
- **Current mitigation:** Environment variable `SUPER_ADMIN_EMAIL` overrides default if set.
- **Recommendations:** Ensure production deployment specifies `SUPER_ADMIN_EMAIL` in the container environment.

**2. Non-Atomic Disk Replacement on Crash:**
- **Risk:** If the server host experiences an abrupt power failure during `fs.writeFileSync(this.currentPath, buffer)`, the SQLite file on disk could theoretically be corrupted.
- **Current mitigation:** Automated timestamped backups are generated in `data/backups/`.
- **Recommendations:** Write to a temporary file (`data/tamiya.sqlite.tmp`) and perform atomic rename (`fs.renameSync`) to guarantee disk consistency.

## Performance Bottlenecks

**1. Full State Broadcast on Mutations (`broadcastFullState()`):**
- **Problem:** Every minor state change queries relational tables (`races`, `race_registrations`, `users`, `bracket_matches`, `bto_records`), constructs the JSON payload, and emits `STATE_UPDATE` to all connected clients.
- **Measurement:** ~5KB–25KB per broadcast payload depending on tournament size.
- **Cause:** Monolithic state architecture chosen for guaranteed synchronization across displays.
- **Improvement path:** Emit lightweight delta events for minor actions (e.g. `LANE_STATUS_CHANGED`), reserving full `STATE_UPDATE` for major heat transitions.

## Fragile Areas

**1. Single Database File Volume Mounting in Docker:**
- **Why fragile:** Docker Compose maps volume `tamiya_data:/app/data`. If the named volume is removed with `docker volume rm`, tournament history is lost.
- **Safe modification:** Periodic database snapshots are stored in `data/backups/`. Always backup before `docker compose down -v`.
- **Test coverage:** Verified across all automated test suites using isolated test databases.

**2. In-App Results Protection against External Google Sheet Sync:**
- **Why fragile:** If organizers manually delete or reorder rows in the Google Sheet while heats are actively running in the web app, sync reconciliation must cleanly differentiate completed in-app matches from remote updates.
- **Safe modification:** Safeguarded by logic in `server/services/googleSheetService.js` preserving finished matches, in-progress heats, and NO RACE entries.
- **Test coverage:** Rigorously tested by `server/tests/in-app-results-protection.test.js`.

## Scaling Limits

**1. Single-Node Socket.IO Server:**
- **Current capacity:** ~500–1,000 concurrent mobile browser WebSocket connections on a single container.
- **Limit:** Cannot scale horizontally across multiple instances without configuring Redis adapter (`@socket.io/redis-adapter`).
- **Symptoms at limit:** CPU spikes on WebSocket connection handshakes; latency in real-time TV HUD updates.

## Dependencies at Risk

**1. `sql.js` (WebAssembly SQLite):**
- **Risk:** Pure WASM implementation lacks WAL mode (Write-Ahead Logging) and multi-threaded disk concurrency.
- **Impact:** Sufficient for single-venue physical tournaments, but would need migration to `better-sqlite3` or PostgreSQL if scaling to cloud multi-tenant hosting.
- **Migration plan:** The persistence interface in `server/db.js` wraps standard SQLite SQL, allowing seamless drop-in replacement if needed.

---

*Concerns analysis: 2026-09-20*
*Update after resolving concerns or discovering new issues*
