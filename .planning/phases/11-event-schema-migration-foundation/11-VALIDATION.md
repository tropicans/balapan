---
phase: 11
slug: event-schema-migration-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-17
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in (`node:assert` + `node <file>.test.js`) |
| **Config file** | none — each test bootstraps `process.env.DB_PATH` + `SEED_DEMO_DATA` |
| **Quick run command** | `node server/tests/migration-foundation.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15–30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node server/tests/migration-foundation.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + boot against a v2.0-shaped DB fixture
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Task IDs are provisional until the planner writes `*-PLAN.md`; re-map to actual task IDs at plan time. Requirement coverage below is authoritative.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | TBD | 1 | MIG-01 | T-11-04 | Destructive step skipped unless `ALLOW_DESTRUCTIVE_MIGRATION=true` | unit | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-01-02 | TBD | 1 | MIG-01 | — | `db.transaction()` rolls back all statements on throw | unit | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-01-03 | TBD | 1 | MIG-01 | — | Nested `transaction()` does not throw (`issueTicket` path) | integration | `node server/tests/migration-foundation.test.js` + `node server/tests/marshal-flow.test.js` | ❌ W0 | ⬜ pending |
| 11-01-04 | TBD | 1 | MIG-01 | T-11-02 | Timestamped backup at `data/backups/tamiya-<ts>.sqlite` before destructive step | unit | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-01-05 | TBD | 1 | MIG-01 | — | Migration idempotent: 2nd run applies 0 steps, `schema_version` count = 1 | integration | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-02-01 | TBD | 1 | MIG-02 | — | `participant_number` column + `UNIQUE(event_id, participant_number)` index exist | schema assertion | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-02-02 | TBD | 1 | MIG-02 | T-11-01 | `normalizeParticipantNumber('007'/' 7 '/'7') === 7`; invalid → null | unit | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-02-03 | TBD | 1 | MIG-02 | — | Unique index rejects duplicate `(event_id, n)`, allows same `n` on other events | integration | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-02-04 | TBD | 1 | MIG-02 | — | No numbered row has NULL `event_id` | integration | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-03-01 | TBD | 1 | EVNT-01 | T-11-01 | `POST /api/events` creates event with nama/tanggal (bound params, length-validated) | integration | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-03-02 | TBD | 1 | EVNT-02 | — | Exactly one active event; activating another archives previous | integration | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-03-03 | TBD | 1 | EVNT-04 | T-11-06 | All participants/bracket/BTO rows carry `event_id`; reads filter by active event | integration | `node server/tests/migration-foundation.test.js` | ❌ W0 | ⬜ pending |
| 11-03-04 | TBD | 1 | MIG-01 | — | v2.0 DB boots; `/api/health` + `/api/state` return 200 | smoke | `node server/tests/race-flow.test.js` + `node server/tests/bracket-3lane.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Regression suite (must stay green):** `race-flow.test.js`, `bracket-3lane.test.js`, `bracket-dashboard-render.test.js`, `camera-scanner.test.js`, `coupon-package.test.js`, `marshal-flow.test.js`, `ticket-engine-flow.test.js`. The transaction fix changes runtime behaviour globally (real rollback + real `changes` counts) — run these immediately after the wrapper change, before continuing migration work.

---

## Wave 0 Requirements

- [ ] `server/tests/migration-foundation.test.js` — covers MIG-01, MIG-02, EVNT-01/02/04
- [ ] `server/backup.js`, `server/migrations.js`, `server/services/eventService.js`, `server/utils/participantNumber.js` — modules the test imports
- [ ] `package.json` `test` script — append `&& node server/tests/migration-foundation.test.js` (script currently hardcodes 6 files and omits `bracket-3lane.test.js`)
- [ ] No framework install needed (Node `assert`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manajemen Event screen create/select/archive | EVNT-01, EVNT-02 | UI interaction; no browser test harness in repo | Boot app, open Manajemen Event, create event, verify it becomes active and previous becomes archived |
| Backup file physically present & restorable | MIG-01 | Filesystem/operator action | After a migration run, confirm `data/backups/tamiya-<ts>.sqlite` exists and opens with the SQLite CLI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending