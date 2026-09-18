---
phase: 12-participant-registration-auto-numbering
plan: 01
subsystem: backend / participant registration & auto-numbering
tags:
  - participants
  - auto-numbering
  - transactions
  - csv-parser
  - rest-api
  - websocket
requires: [PARN-01, PARN-02, PARN-03, PARN-05, EVNT-03]
provides:
  - participant-csv-parser
  - participant-domain-service
  - participant-rest-api
  - participant-websocket-broadcasts
  - cli-roster-import
  - participant-test-suite
affects:
  - server/utils/csvParser.js
  - server/services/participantService.js
  - server/index.js
  - scripts/import-roster.js
  - server/tests/participant-registration.test.js
  - package.json
tech-stack:
  added: []
  patterns:
    - atomic-sequential-allocation
    - composite-unique-event-isolation
    - rfc4180-csv-tokenizer
    - omni-search-query-filter
key-files:
  created:
    - server/utils/csvParser.js
    - server/services/participantService.js
    - server/tests/participant-registration.test.js
  modified:
    - server/index.js
    - scripts/import-roster.js
    - package.json
key-decisions:
  - "D-04: Multi-entry permitted with identical racer names by storing email = NULL, avoiding unique constraint violations."
  - "D-05: Team name is optional (max 50 chars); empty string stored as NULL in database."
  - "D-06: Omni-search differentiates numeric query (exact participant_number or substring) vs textual query (name/team)."
  - "D-07 & D-09: CSV import and CLI script sequentially allocate contiguous numbers continuing from MAX(participant_number) + 1 in a single transaction."
  - "D-08: CSV parser supports standard headers (name/nama, team/tim), STC Vol 8 format with Lunas/comp detection, and headerless fallback."
  - "D-12: Typo updates modify only name and team_name, strictly protecting participant_number and event_id from mutation."
requirements: [PARN-01, PARN-02, PARN-03, PARN-05, EVNT-03]
coverage:
  - deliverable: "Participant registration without coupons with sequential number allocation"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-01, T-PARN-02"
      status: pass
    human_judgment: false
  - deliverable: "Event isolation and reset to #1 upon switching active event"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-EVNT-03"
      status: pass
    human_judgment: false
  - deliverable: "Omni-search by numeric number and name/team text"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-03A, T-PARN-03B"
      status: pass
    human_judgment: false
  - deliverable: "Multi-entry allowed without collision and optional team NULL storage"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-04, T-PARN-05"
      status: pass
    human_judgment: false
  - deliverable: "Typo update protecting participant_number and event_id"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-06"
      status: pass
    human_judgment: false
  - deliverable: "CSV parser supporting standard and STC Vol 8 formats"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-07, T-PARN-08"
      status: pass
    human_judgment: false
  - deliverable: "Active event guard throwing 400 when no active event exists"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-09"
      status: pass
    human_judgment: false
  - deliverable: "CLI roster script importing into active event with auto-numbering"
    verification:
      kind: test
      ref: "server/tests/participant-registration.test.js#T-PARN-10"
      status: pass
    human_judgment: false
duration: "10 min"
completed: "2026-09-17T18:24:00+07:00"
---

# Phase 12 Plan 01: Participant Registration & Auto-Numbering Backend Summary

**Substantive Deliverable:** Complete backend domain engine for v3.0 physical racing participant management: RFC4180-compliant flexible CSV parser, event-scoped sequential auto-numbering domain service, REST API endpoints (`/api/participants*`), real-time WebSocket broadcasts, modernized CLI roster import script (`scripts/import-roster.js`), and 10-point automated test suite registered in `package.json`.

## Accomplishments

1. **CSV Parser Utility (`server/utils/csvParser.js`):**
   - Implemented `tokenizeCsv(text)` without external npm dependencies, fully supporting RFC4180 escaped quotes, multiline cells, and cross-platform newlines (`\r\n` / `\n`).
   - Implemented `parseParticipantCsv(csvText)`: detects standard headers (`name`/`nama`, `team`/`tim`), STC Vol 8 section-based format (extracting paid `Lunas` entries and comp `Rp0` entries while skipping headers and empty placeholders), and headerless fallback (`col 0 = name`, `col 1 = team`).

2. **Participant Domain Service (`server/services/participantService.js`):**
   - `registerParticipant`: executes inside atomic `db.transaction()`, computing `COALESCE(MAX(participant_number), 0) + 1` scoped to the active `event_id`. Persists `email = NULL` to safely enable identical-name multi-entries (D-04) without triggering unique constraint collisions.
   - `getParticipants`: returns paginated participant lists ordered by `participant_number DESC`, including `total`, `latest_number`, and `active_event`. Implements omni-search logic differentiating numeric search (`participant_number = ?`) vs string substring matching on `name` or `team_name`.
   - `updateParticipant`: allows correcting typos in `name` and `team_name`, strictly protecting `participant_number` and `event_id` from tampering.
   - `importParticipants`: batch inserts participant lists inside a single transaction, continuing sequentially from the current maximum number.

3. **REST APIs & WebSocket Broadcasts (`server/index.js`):**
   - Registered endpoints:
     - `POST /api/participants` (201 Created / 400 Bad Request) + `io.emit('participant_registered')`
     - `GET /api/participants` (200 OK) with omni-search query parameters
     - `PUT /api/participants/:id` (200 OK / 400 / 404) + `io.emit('participant_updated')`
     - `POST /api/participants/import-preview` (200 OK) returning parsed valid/skipped counts
     - `POST /api/participants/import` (201 Created) + `io.emit('participants_imported')`
   - Added `express.text({ type: ['text/plain', 'text/csv'] })` for flexible CSV upload payloads.

4. **CLI Roster Script Modernization (`scripts/import-roster.js`):**
   - Modernized script to target the active event (or explicit `--event <id>`).
   - Supports `--dry` dry-run inspection, logging valid racers (34 from `stc-vol8-roster.csv`) and skipped row reasons.
   - Allocates sequential numbers without touching legacy coupon packages or balances.

5. **Automated Test Suite & Regression Verification (`server/tests/participant-registration.test.js` & `package.json`):**
   - Wrote 10 automated test scenarios (T-PARN-01 through T-PARN-10).
   - Appended test runner to `"test"` script in `package.json`.
   - Executed test suite and all 10 project test suites: 100% green with zero regressions.

## Verification

```powershell
$env:PATH = "C:\Users\yudhiar\AppData\Local\Programs\cursor\resources\app\resources\helpers;" + $env:PATH
node server/tests/participant-registration.test.js
```
All 10 tests passed:
- T-PARN-01: Participant Registration without Coupons (PARN-01) - Pass
- T-PARN-02: Sequential Auto-Numbering (PARN-02) - Pass
- T-EVNT-03: Event Isolation and Reset to #1 (EVNT-03) - Pass
- T-PARN-03A: Omni-search by Number (PARN-03, D-06) - Pass
- T-PARN-03B: Omni-search by Text (PARN-03, D-06) - Pass
- T-PARN-04: Multi-entry with Identical Name (D-04) - Pass
- T-PARN-05: Optional Team Name Stores NULL (D-05) - Pass
- T-PARN-06: Typo Edit Protections (D-12) - Pass
- T-PARN-07: CSV Import Preview & Execution (PARN-05, D-07, D-09) - Pass
- T-PARN-08: STC Vol 8 Format Compatibility (D-08) - Pass
- T-PARN-09: Rejection on Missing Active Event (EVNT-03) - Pass
- T-PARN-10: CLI Script scripts/import-roster.js (D-07) - Pass
