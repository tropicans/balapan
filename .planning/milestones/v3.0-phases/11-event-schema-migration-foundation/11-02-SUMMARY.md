---
phase: 11-event-schema-migration-foundation
plan: 02
subsystem: event domain / api
tags:
  - events
  - domain-service
  - rest-api
  - scoped-reads
requires:
  - 11-01
provides:
  - event-domain-service
  - event-rest-endpoints
  - event-scoped-bracket-reads
  - additive-active-event-state
affects:
  - server/services/eventService.js
  - server/index.js
  - server/raceManager.js
tech-stack:
  added: []
  patterns:
    - archive-before-promote-transaction
    - indonesian-error-response
    - event-scoped-query
key-files:
  created:
    - server/services/eventService.js
  modified:
    - server/index.js
    - server/raceManager.js
    - server/tests/migration-foundation.test.js
key-decisions:
  - "D-01: Filtered bracket_matches reads in RaceManager.getFullState() by activeEventId, preventing cross-event leakage."
  - "D-02: Reused existing users table across events."
  - "D-03: Enforced exactly one active event via setActiveEvent archive-before-promote transaction."
  - "D-12: Validated and stored event fields nama, tanggal, catatan, and jumlah_lap."
  - "D-14: Archive-only lifecycle implemented with archiveEvent (never deletes)."
  - "D-15: Exposed GET /api/events, POST /api/events, POST /api/events/:id/activate, and POST /api/events/:id/archive."
requirements: [EVNT-01, EVNT-02, EVNT-04]
coverage:
  - deliverable: "Event domain service (create, list, activate, archive, getActiveEvent)"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#4.1, 4.2, 4.3, 4.4, 4.5"
      status: pass
    human_judgment: false
  - deliverable: "/api/events REST endpoints with validation, standard envelope, and broadcastFullState"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#4.1..4.5"
      status: pass
    human_judgment: false
  - deliverable: "Event-scoped bracket reads and additive activeEvent in getFullState (EVNT-04)"
    verification:
      kind: test
      ref: "server/tests/migration-foundation.test.js#4.6"
      status: pass
    human_judgment: false
duration: "5 min"
completed: "2026-09-17T17:47:35Z"
---

# Phase 11 Plan 02: Event Domain Service, REST API, and Scoped Bracket Reads Summary

**Substantive Deliverable:** Event domain service `server/services/eventService.js` enforcing one-active-event and archive-only lifecycle, 4 REST endpoints under `/api/events` with WebSocket broadcast, and scoped bracket reads preventing cross-event leakage in `RaceManager.getFullState()`.

## Accomplishments

1. **Event Domain Service (`server/services/eventService.js`):**
   - Implemented `createEvent({ nama, tanggal, catatan, jumlah_lap })` with strict validation (nama required & <=100 chars, catatan <=500 chars, jumlah_lap positive integer). Automatically marks the event `active` if no active event exists, or `archived` otherwise.
   - Implemented `setActiveEvent(id)` with single-transaction archive-before-promote logic to satisfy the partial unique index `idx_events_single_active`.
   - Implemented `archiveEvent(id)` setting `status='archived'` without deletion.
   - Implemented `listEvents()`, `getActiveEvent()`, and `getActiveEventId()`.

2. **REST Endpoints (`server/index.js`):**
   - Added `GET /api/events`: lists all active and archived events.
   - Added `POST /api/events`: validates input, creates event, calls `broadcastFullState()`, and returns HTTP 201.
   - Added `POST /api/events/:id/activate`: activates event, archives previous, broadcasts full state, returns HTTP 200 (or 404 if not found).
   - Added `POST /api/events/:id/archive`: archives event, broadcasts full state, returns HTTP 200 (or 404 if not found).

3. **Event-Scoped Bracket Reads (EVNT-04, `server/raceManager.js`):**
   - Scoped bracket matches in `RaceManager.getFullState()` with bound parameter `WHERE bm.event_id = ?`.
   - Added `activeEvent: getActiveEvent()` additively to the `getFullState()` return payload without removing or mutating any legacy keys (`activeRace`, `ticketStats`, `scrutineerQueue`).

4. **Integration Verification:**
   - Appended assertions 17-22 to `server/tests/migration-foundation.test.js`.
   - All 9 test suites in `npm test` are 100% green.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
- `server/services/eventService.js` exists on disk: YES
- `/api/events` routes wired in `server/index.js`: YES
- Bracket reads scoped in `server/raceManager.js`: YES
- `server/tests/migration-foundation.test.js` passes: YES
- `npm test` passes: YES
