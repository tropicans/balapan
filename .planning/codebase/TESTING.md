---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# Testing Patterns

**Analysis Date:** 2026-09-20

## Test Framework

**Runner:**
- Node.js native script runner and `node --test` test runner (ES Modules).
- Root npm script alias: `npm test` runs all 31 automated test suites sequentially.
- Zero heavyweight external test framework dependencies (no Jest or Mocha installation required).

**Assertion Library:**
- Node.js built-in `node:assert`:
  - `assert.ok(value, [message])`
  - `assert.strictEqual(actual, expected, [message])`
  - `assert.deepStrictEqual(actual, expected, [message])`
  - `assert.throws(fn, [error], [message])`

**Run Commands:**
```bash
# Run entire test suite (all 31 test suites)
npm test

# Run a single standalone test file
node server/tests/babak3-21heats-cap.test.js

# Run tests using Node.js native test runner
node --test server/tests/no-race-sequential-advance.test.js
node --test server/tests/phase-28-enhancements.test.js
```

## Test File Organization

**Location:**
- Dedicated tests directory: `server/tests/`.

**Test Files (31 Suites):**
- `server/tests/race-flow.test.js`: Core tournament state machine & qualifying lifecycle.
- `server/tests/babak3-21heats-cap.test.js`: Babak 3 21 heats max limit enforcement.
- `server/tests/no-race-sequential-advance.test.js`: Slot repacking (Lane C filling) after NO RACE heats.
- `server/tests/in-app-results-protection.test.js`: Preserving in-app winners during background sheet syncs.
- `server/tests/multi-entry-auto-advance.test.js`: Multi-entry advancement across elimination rounds.
- `server/tests/google-sheet-sync.test.js`: Participant roster sync and reconciliation.
- `server/tests/google-sheet-bracket-sync.test.js`: Elimination bracket sync and scheduler intervals.
- `server/tests/phase-27-mutation-rbac.test.js`: REST API role authorization guards.
- `server/tests/admin-approval-rbac.test.js`: Super Admin approval workflow.
- `server/tests/auth-service.test.js`: Google token verification and session issuance.
- `server/tests/bto-service.test.js`: BTO lap time recording and leaderboard ranking.
- `server/tests/winner-registration.test.js`: Winner registration desk and eligibility checking.
- `server/tests/ticket-engine-flow.test.js`: Ticket package purchasing and coupon ledgering.
- `server/tests/migration-foundation.test.js`: Schema migrations and table evolution.
- `server/tests/bracket-reset-heat.test.js`: RESET HEAT state rollback.
- `server/tests/bracket-no-race.test.js`: NO RACE match closure.
- `server/tests/camera-scanner.test.js`: Optical scanner helper validation.
- `server/tests/reproduce-participant-search.test.js`: Omni-search isolation and token matching.
- `server/tests/reproduce-navbar-overflow.test.js`: Responsive navigation bar overflow protection.

## Test Structure & Patterns

**Test Isolation & Database Sandboxing:**
- Tests operate against a sandboxed SQLite database file created dynamically per test run using unique timestamps:
  ```javascript
  const uniqueTestDb = path.join(__dirname, `../../data/test_${Date.now()}_${Math.random().toString(36).substring(2)}.sqlite`);
  process.env.DB_PATH = uniqueTestDb;
  ```
- Tests initialize the schema via `await initDatabase()` or fresh table creation.
- At test teardown, the sandbox database is cleanly unlinked:
  ```javascript
  if (fs.existsSync(uniqueTestDb)) {
    try { fs.unlinkSync(uniqueTestDb); } catch(e) {}
  }
  ```

**Mocking Patterns:**

**1. Fast Offline Google OAuth Token Mocking:**
- The backend `verifyGoogleToken` supports deterministic mock tokens formatted as `mock-google-token:<email>:<name>:<subId>`:
  ```javascript
  const token = 'mock-google-token:superadmin@gmail.com:Super Admin:google-sub-superadmin';
  const profile = await verifyGoogleToken(token);
  ```
- Strictly forbidden in `NODE_ENV=production`.

**2. Bearer Session Token Mocking:**
- Auth middleware (`authMiddleware.js`) supports fast mock tokens for test execution:
  - `mock-super-admin-token` injects super_admin session.
  - `mock-token:<role>:<status>:<email>` injects arbitrary role and approval states.

**3. Google Sheet CSV Mocking:**
- Bracket and participant sync functions accept raw CSV strings directly, allowing comprehensive unit tests without requiring real Google Sheet network connectivity:
  ```javascript
  const sampleCsv = `NO,NAMA,TEAM,KUPON\n1,Om Sandi,Team Alpha,10\n2,Superzen,Team Beta,5`;
  await syncParticipantsFromSheet(sampleCsv);
  ```

## Coverage & Verification

- 100% passing automated test suite with 31 individual test files.
- Critical tournament guarantees verified:
  - Atomic coupon deduction during race lock.
  - Multi-round bracket single-elimination progression.
  - Sequential slot packing preventing lane gaps.
  - Hard cap at 21 heats for Babak 3.
  - Protection against Google Sheet sync overwriting completed matches.
  - RBAC protection on all state-mutating endpoints.

---

*Testing analysis: 2026-09-20*
*Update when test patterns change*
