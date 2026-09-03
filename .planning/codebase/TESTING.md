---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# Testing Patterns

**Analysis Date:** 2026-09-03

## Test Framework

**Runner:**
- Node.js native script runner (ES Modules) via `node server/tests/race-flow.test.js`.
- Root npm script alias: `npm test`.
- Zero external testing dependencies (no Jest or Vitest required).

**Assertion Library:**
- Node.js built-in `node:assert`:
  - `assert.ok(value, [message])`
  - `assert.strictEqual(actual, expected, [message])`

**Run Commands:**
```bash
# Run full tournament regression test suite
npm test

# Direct node execution
node server/tests/race-flow.test.js
```

## Test File Organization

**Location:**
- Dedicated tests directory inside backend: `server/tests/`.

**Naming:**
- Integration & Flow Tests: `*.test.js` (e.g., `server/tests/race-flow.test.js`).

**Structure:**
```
balapan/
├── server/
│   ├── raceManager.js
│   ├── db.js
│   └── tests/
│       └── race-flow.test.js    # Comprehensive tournament state machine test
```

## Test Structure & Patterns

**Test Isolation & Database Sandboxing:**
- Tests run against an isolated SQLite database file generated dynamically per run using timestamps:
  ```javascript
  const uniqueTestDb = path.join(__dirname, `../../data/test_${Date.now()}.sqlite`);
  process.env.DB_PATH = uniqueTestDb;
  ```
- After all assertions pass, the test teardown cleanly deletes the sandbox SQLite database:
  ```javascript
  if (fs.existsSync(uniqueTestDb)) {
    try { fs.unlinkSync(uniqueTestDb); } catch(e) {}
  }
  ```

**Step-by-Step Flow Execution Pattern:**
The integration test executes a 9-stage sequential flow matching the physical racetrack operations:
```javascript
async function runTests() {
  // [1/9] Database initialization & seeding
  await initDatabase();

  // [2/9] Initial state query
  const state = RaceManager.getFullState();
  assert.strictEqual(state.activeRace.race_number, 1);

  // [3/9] Participant QR lane registration
  const regC = RaceManager.registerLane(chandra.id, 'C');
  assert.strictEqual(regC.success, true);

  // [4/9] Concurrency handling (Lane taken -> push to next race)
  const regDoni = RaceManager.registerLane(doni.id, 'A');
  assert.strictEqual(regDoni.pushedToNext, true);
  assert.strictEqual(regDoni.raceNumber, 2);

  // [5/9] Set ready on all lanes
  assert.strictEqual(RaceManager.setReady(andi.id).success, true);

  // [6/9] Lock race & verify atomic coupon deduction
  const before = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
  RaceManager.lockRace(state.activeRace.id);
  const after = db.prepare('SELECT balance FROM coupons WHERE user_id = ?').get(andi.id).balance;
  assert.strictEqual(after, before - 1);

  // [7/9] Submit finish times & verify lowest time wins
  const finishRes = RaceManager.submitFinishTimes(state.activeRace.id, { A: 11.230, B: 11.890, C: 12.450 });
  assert.strictEqual(finishRes.winner.userId, andi.id);

  // [8/9] Scrutineering inspection pass -> BTO update & Round 2 bracket auto-placement
  const activeWinnerReg = db.prepare("SELECT id FROM race_registrations WHERE user_id = ?").get(andi.id);
  const scrutRes = RaceManager.handleScrutineerAction(activeWinnerReg.id, 'pass');
  assert.strictEqual(scrutRes.isNewBTO, true);
  const bracket = db.prepare("SELECT * FROM bracket_matches WHERE user_id_1 = ? OR user_id_2 = ?").get(andi.id, andi.id);
  assert.ok(bracket, 'Auto-placed into bracket');

  // [9/9] Cashier coupon top-up & guest registration
  const topUp = RaceManager.topUpCoupons(andi.id, 50);
  assert.strictEqual(topUp.newBalance, after + 50);
}
```

## Mocking

- **Database Mocking:** None. Uses real SQLite in-memory/disk instance with zero external dependencies to ensure 100% fidelity with production database behavior.
- **Hardware Mocking:** Web Audio API, Camera QR, and Navigator Haptic feedback are verified client-side; backend tests focus purely on the deterministic state engine.

## Coverage Gaps & Recommended Expansions

- **Client Component Unit Tests:** Currently, no frontend component test suite (such as Vitest + React Testing Library) is configured in `client/`.
- **WebSocket Event Unit Tests:** Integration tests call `RaceManager` methods directly rather than connecting real Socket.IO client instances over TCP.
- **Disqualification / Edge Flow Tests:** Testing what happens when Scrutineer disqualifies (`action = 'disqualified'`) and verifying winner nullification in `races` table.

---

*Testing analysis: 2026-09-03*
*Update when adding test frameworks or testing strategies*
