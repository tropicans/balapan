---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# Codebase Concerns

**Analysis Date:** 2026-09-03

## Tech Debt

**1. Synchronous WASM SQLite Disk Export:**
- **Issue:** `SqliteWrapper` in `server/db.js` exports the full database byte array (`this.rawDb.export()`) and writes it synchronously to disk (`fs.writeFileSync`) on every write query (`.run()`, `.exec()`, and `.transaction()`).
- **Why:** `sql.js` is a pure WebAssembly compilation of SQLite that keeps the entire database in memory; persistence requires explicit buffer serialization to the filesystem.
- **Impact:** While fast for a typical tournament (<5MB database, dozens of heats), high-frequency write operations during peak registration could introduce synchronous disk I/O latency spikes.
- **Fix approach:** Implement debounced writes (`saveTimeout` / write-ahead log flush) or replace with `better-sqlite3` in environments where native C++ compilation is permitted.

**2. Client-Side Role Enforcement & Unprotected REST APIs:**
- **Issue:** The API endpoints (`/api/race/lock`, `/api/race/finish`, `/api/race/scrutineer`, `/api/coupons/topup`, `/api/race/override`) do not validate authorization headers, bearer tokens, or admin session cookies.
- **Why:** Designed for zero-friction assisted tournament operations on a local closed venue network (LAN / Wi-Fi hotspot) where the Race Director and Cashier operate trusted devices.
- **Impact:** Any user connected to the same local network who inspects network traffic could theoretically send HTTP POST requests to lock races, modify finish times, or top up their own coupons.
- **Fix approach:** Introduce lightweight bearer token / PIN-code middleware on sensitive operator endpoints (e.g., `X-Operator-PIN` or session cookies for `admin` / `scrutineer` / `cashier`).

**3. Mock User Switching in Production Frontend:**
- **Issue:** `RaceContext.jsx` includes hardcoded demo user switching (`switchUser`) and defaults to `Andi Pratama`.
- **Why:** Allowed rapid prototype testing of all roles from a single browser instance without requiring multi-device Google OAuth logins.
- **Impact:** Real participants accessing the URL might inadvertently stay logged in as Andi or use the user switcher to impersonate others.
- **Fix approach:** Add a dedicated landing page for Google OAuth sign-in or racer registration that stores authenticated session credentials before opening the dashboard.

## Known Bugs & Edge Cases

**1. iOS Safari Vibration & Speech Autoplay Policy:**
- **Symptoms:** Haptic vibrations do not fire on iOS devices; Speech Synthesis countdown may remain silent on initial tick if user hasn't explicitly tapped the screen.
- **Trigger:** iOS WebKit does not implement `navigator.vibrate` (reserved for native haptics). Safari also blocks audio/speech synthesis before an explicit user gesture.
- **Workaround:** Audio synthesis class (`CyberAudioEngine`) attempts to resume `AudioContext` on user interaction. Visual countdown and TV display remain the primary source of truth.
- **Root cause:** Apple WebKit platform limitations.

**2. In-Memory Countdown State Volatility:**
- **Symptoms:** If the backend server restarts during an active 10-second vocal countdown, the countdown immediately vanishes.
- **Trigger:** Server crash or restart during `/api/countdown/start`.
- **Workaround:** Race Director can click "MULAI COUNTDOWN" again from the console.
- **Root cause:** `countdownInterval` and `countdownRemaining` are kept in Node.js process memory rather than in the database.

## Security Considerations

**1. Cross-Site Scripting & Racer Tag Sanitization:**
- **Risk:** Racers can configure their team name / racer tag (`team_name`, up to 10 characters). If rendered unsanitized, malicious markup could be injected.
- **Current mitigation:** Tags are truncated to 10 characters and uppercase-forced (`.substring(0, 10).toUpperCase()`). React auto-escapes string content by default in JSX.
- **Recommendations:** Enforce strict alphanumeric regex validation on team tags (e.g., `/^[A-Z0-9\s\[\]\-]+$/`).

**2. Non-Atomic File Writes on Disk:**
- **Risk:** If the server host experiences an abrupt power failure exactly during `fs.writeFileSync(this.currentPath, buffer)`, the SQLite file on disk could be left corrupted or truncated.
- **Current mitigation:** Node writes directly to `data/tamiya.sqlite`.
- **Recommendations:** Write to a temporary file (`data/tamiya.sqlite.tmp`) and perform an atomic rename (`fs.renameSync`) to guarantee database file consistency.

## Performance Bottlenecks

**1. Full State Broadcast on Every Action (`broadcastFullState()`):**
- **Problem:** Every minor state change queries 5 relational tables (`races`, `race_registrations`, `users`, `coupons`, `bracket_matches`), parses JSON racer arrays, and serializes the entire tree to every connected Socket.IO client.
- **Measurement:** ~2KB–5KB per broadcast payload.
- **Cause:** Monolithic state architecture chosen for guaranteed client-server state synchronization.
- **Improvement path:** Differentiate broadcasts: emit targeted delta events (`LANE_UPDATED`, `COUPON_UPDATED`) for high-frequency actions, and reserve `STATE_UPDATE` for major phase transitions.

## Fragile Areas

**1. Single Database File Volume Mounting in Docker:**
- **Why fragile:** Docker Compose maps volume `tamiya_data:/app/data`. If file permissions in the container differ from the host or volume is cleared without backup, tournament history and bracket standings are lost.
- **Safe modification:** Always export SQLite data before updating Docker containers or running database schema changes. Add automated backup snapshots.
- **Test coverage:** Covered by `server/tests/race-flow.test.js` using isolated test SQLite files.

**2. Auto-Bracket Slot Assignment (`placeIntoBracket`):**
- **Why fragile:** Automatically finds the first open slot in Round 1 (`user_id_1` then `user_id_2`). If a racer is disqualified after having been seeded, removing them without breaking parent bracket matches requires careful manual correction.
- **Safe modification:** Ensure Race Director override tool has an explicit "Replace Bracket Racer" command.
- **Test coverage:** Verified in step 8 of `server/tests/race-flow.test.js`.

## Scaling Limits

**1. Single-Node Socket.IO Server:**
- **Current capacity:** ~500–1,000 concurrent mobile browser WebSocket connections on a single 1-vCPU container.
- **Limit:** Cannot scale horizontally across multiple instances without configuring Redis adapter (`@socket.io/redis-adapter`) for event distribution.
- **Symptoms at limit:** CPU spikes on WebSocket connection handshakes; latency in real-time TV HUD updates.

---

*Concerns analysis: 2026-09-03*
*Update after resolving concerns or discovering new issues*
