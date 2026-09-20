---
phase: 29-standalone-decoupled-system-local-csv-import-export
plan: "01"
subsystem: backend/ui
tags: [decoupled, standalone, csv-export, csv-import, json-export, json-import]

requires:
  - phase: 28-lock-generalization-event-settings-offline-mode-multi-entry-sync
    provides: Round lock generalization, offline mode, and multi-entry sync

provides:
  - Local standalone CSV & JSON import and export REST APIs for Participants, BTO, and Winners
  - Total decoupling from mandatory Google Sheets sync
  - Preserved Google OAuth 2.0 & Emergency Offline Login
  - Verified tournament operational capability without internet or external Google dependencies

affects: [cashier, admin-dashboard, server-core]

actuals:
  tasks: 4
  commits: 1

tech-stack:
  added: []
  patterns: [Standalone local REST data transfer, fallback grace for offline venue operations]

key-files:
  created:
    - server/tests/standalone-import-export.test.js
    - .planning/phases/29-standalone-decoupled-system-local-csv-import-export/29-SUMMARY.md
  modified:
    - server/index.js

key-decisions:
  - "Decoupled Google Sheets sync into an optional background task, making all tournament operations 100% self-hosted and standalone."
  - "Provided REST export endpoints for participants, BTO leaderboard, and registered winners supporting both CSV and JSON download formats."
  - "Added batch import API endpoints for participants and BTO with line-by-line validation and graceful fallback."

requirements-completed: [STANDALONE-01, STANDALONE-02, STANDALONE-03, STANDALONE-04]

completed: 2026-09-20
status: complete
---

# Phase 29 Plan 01: Standalone Decoupled System & Local CSV/JSON Import/Export Summary

**Completed Phase 29: Decoupled tournament system from mandatory Google Sheets sync with standalone CSV & JSON import/export APIs and venue fallback capabilities.**

## Accomplishments

1. **Standalone REST Import & Export Endpoints:**
   - Added `GET /api/participants/export` for CSV and JSON format export.
   - Added `POST /api/participants/import` for CSV/JSON batch participant import.
   - Added `GET /api/bto/export` and `POST /api/bto/import` for BTO record export and import.
   - Added `GET /api/winners/export` for Winners export.

2. **Google Sheets Decoupling:**
   - Ensured system runs 100% standalone without Google Sheets configured or without internet connection.
   - Preserved Google OAuth 2.0 and Emergency Offline Login.

3. **Verification:**
   - Unit test suite `server/tests/standalone-import-export.test.js` passed.
   - Full test suite (`npm test`) executed and passed 100% green.
