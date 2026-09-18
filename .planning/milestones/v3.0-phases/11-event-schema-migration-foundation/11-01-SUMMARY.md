---
phase: 11-event-schema-migration-foundation
plan: 01
subsystem: database / migration foundation
tags:
  - sqlite
  - migrations
  - transactions
  - backup
  - participant-number
requires: []
provides:
  - real-reentrant-transactions
  - timestamped-backup-utility
  - versioned-migration-runner
  - event-schema-foundation
  - participant-number-normalization
affects:
  - server/db.js
  - server/migrations.js
  - server/backup.js
  - server/utils/participantNumber.js
tech-stack:
  added: []
  patterns:
    - reentrant-transaction-closure
    - pragma-table-info-guard
    - set-based-window-backfill
key-files:
  created:
    - server/utils/participantNumber.js
    - server/backup.js
    - server/migrations.js
    - server/tests/migration-foundation.test.js
  modified:
    - server/db.js
    - package.json
    - .gitignore
    - .env.example
    - docker-compose.yml
key-decisions:
  - "D-01: Added event_id to users and bracket_matches; created bto_records table with event_id."
  - "D-02: Reused users table for participants (no separate table)."
  - "D-04: participant_number stored as INTEGER."
  - "D-06: normalizeParticipantNumber() trims, validates numeric-only, and strips leading zeros."
  - "D-07: Enforced UNIQUE(event_id, participant_number) via partial/table index."
  - "D-08: Timestamped DB backup at data/backups/tamiya-<YYYYMMDD-HHmmss>.sqlite prior to applying pending migrations on an existing DB file."
  - "D-09: schema_version table tracks applied migrations."
  - "D-10: SqliteWrapper.transaction() emits genuine reentrant BEGIN/COMMIT/ROLLBACK with deferred save()."
  - "D-11: Destructive migration steps gated behind ALLOW_DESTRUCTIVE_MIGRATION environment flag."
  - "D-13: Default Event 1 seeded with fixed UUID 00000000-0000-4000-8000-000000000001."
requirements: [MIG-01, MIG-02, EVNT-04]
coverage:
  - deliverable: "Real reentrant transactions with deferred save in SqliteWrapper"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#Task 2"
      status: pass
    human_judgment: false
  - deliverable: "Timestamped backup utility and automated backup on pending migrations"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#1.4, 3.6"
      status: pass
    human_judgment: false
  - deliverable: "Versioned migration runner and schema_version idempotency"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#3.4"
      status: pass
    human_judgment: false
  - deliverable: "Event & participant schema, indexes, and legacy column preservation"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#3.1, 3.2, 3.3"
      status: pass
    human_judgment: false
  - deliverable: "Participant numbering backfill and bracket match event scoping"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#3.5"
      status: pass
    human_judgment: false
  - deliverable: "Destructive migration environment gate"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#3.7"
      status: pass
    human_judgment: false
duration: "7 min"
completed: "2026-09-17T17:45:00Z"
---

# Phase 11 Plan 01: Event & Schema Migration Foundation Summary

**Substantive Deliverable:** Reentrant `BEGIN`/`COMMIT`/`ROLLBACK` transactions with deferred SQLite save, automated timestamped file backups in `data/backups/`, versioned migration runner with `schema_version` idempotency, and the `events`/`bto_records` schema with participant number backfill.

## Accomplishments

1. **Reentrant Transaction Support (D-10):**
   - Rebuilt `SqliteWrapper.transaction()` to count nesting depth (`_txDepth`). Outermost invocation issues `BEGIN`, innermost calls participate in the flat transaction without re-opening, outer success commits and exports once, and any uncaught exception rolls back all uncommitted writes.
   - Guarded `save()` so `rawDb.export()` is deferred until transaction completion.
   - Updated `prepare().run()` to read `rawDb.getRowsModified()` immediately before calling `save()`.

2. **Timestamped DB Backup Utility (D-08, MIG-01):**
   - Created `server/backup.js` with `timestampTag()` formatting `YYYYMMDD-HHmmss` and `createTimestampedBackup(dbPath)` copying existing files to `data/backups/tamiya-<timestamp>.sqlite`.
   - Ignored `data/backups/` in `.gitignore`.

3. **Versioned Migration Runner (D-09, D-11, MIG-02):**
   - Created `server/migrations.js` with `MIGRATIONS` array and `runMigrations(db)`.
   - Migration 1 (`event_schema_and_participant_number`):
     - Creates `events` table with partial unique index `idx_events_single_active` enforcing exactly one active event.
     - Creates `bto_records` table with index `idx_bto_event_time`.
     - Adds `event_id`, `participant_number`, and `side_event_gta` to `users`.
     - Adds `event_id`, `is_final`, `ticket_id_1..3`, and `is_auto_advanced` to `bracket_matches`.
     - Adds `ticket_id` to `marshal_winner_logs` and `package_type` to `coupon_packages`.
     - Seeds fixed default `Event 1` (`00000000-0000-4000-8000-000000000001`).
     - Backfills existing participants with sequential `participant_number` partitioned by `event_id` and offset by `MAX(participant_number)` to guarantee unique constraint safety on re-runs.
     - Creates `idx_users_event_participant_number` and `idx_bracket_matches_event`.
   - Wired `ALLOW_DESTRUCTIVE_MIGRATION` check in the runner, defaulting to false in `.env.example` and `docker-compose.yml`.

4. **Test Suite Expansion & Verification:**
   - Wired `bracket-3lane.test.js`, `e2e-tournament-lifecycle.test.js`, and `migration-foundation.test.js` into `npm test`.
   - All 9 test suites execute cleanly and pass 100% green.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
- `server/utils/participantNumber.js` exists on disk: YES
- `server/backup.js` exists on disk: YES
- `server/migrations.js` exists on disk: YES
- `server/tests/migration-foundation.test.js` exists on disk: YES
- `git log` contains `11-01` commits: YES
- `npm test` passes: YES
