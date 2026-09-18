# Requirements: Milestone v3.4 System Hardening, Security & Operational Reliability

## Overview

Milestone v3.4 focuses on eliminating security vulnerabilities, fixing operational bugs, hardening RBAC across both backend and frontend, preventing cross-event setting leakage, and providing local tournament venue offline capabilities.

## v3.4 Requirements

### Critical Bug Fixes & Security (FIX & SEC)

- [ ] **FIX-01**: Remove Google Client Secret from `.env` and configure `VITE_GOOGLE_CLIENT_ID` with the genuine Google Client ID to ensure secure and functional Google Identity Services (GIS) initialization.
- [ ] **FIX-02**: Clean up `STATE_UPDATE` socket event listener upon unmount in `BtoManager.jsx` and consume `state.btoLeaderboard` directly from the payload to stop memory leaks and duplicate HTTP requests.
- [ ] **FIX-03**: Fix Circuit TV HUD (`RealtimeTV.jsx`) to display the active event name from `activeEvent.nama` (with fallback to `activeEvent.name` and default text).
- [ ] **FIX-04**: Add `google-sheet-sync.test.js` to the `package.json` `"test"` script to ensure 100% test suite execution in CI/CD.
- [ ] **SEC-01**: Secure `/bracket` public route into read-only display mode for unauthenticated viewers by hiding the `MENANG` action button and removing the `WinnerRegistrationPanel` tab.

### RBAC Backend Hardening & API Token Automation (SEC & AUTH)

- [ ] **SEC-02**: Enforce `requireApproved` and `requireRole` middleware across backend mutation endpoints (`/api/participants`, `/api/events`, `/api/bto`, `/api/winners`, `/api/bracket`).
- [ ] **SEC-03**: Automatically attach `Authorization: Bearer <token>` from `AuthContext` to all frontend API mutation requests via a centralized API fetch helper.
- [ ] **SEC-04**: Filter frontend navigation tabs in `Navbar.jsx` and enforce route boundaries in `App.jsx` based on user roles (`cashier`, `race_director`, `admin`, `viewer`).

### Tournament Operational Reliability & Enhancements (ENH)

- [ ] **ENH-01**: Isolate tournament lock settings (`qualifying_status`, `round_status`) per `event_id` or reset them upon active event transition to prevent cross-event status leakage.
- [ ] **ENH-02**: Generalize round-lock enforcement in `RaceManager.advanceBracketWinner` and `resetBracketMatch` to dynamically validate lock status for any round (`round_number >= 2`) instead of hardcoded Round 2.
- [ ] **ENH-03**: Provide an emergency offline/local tournament venue login toggle in `LoginScreen.jsx` allowing organizers to log in with admin privileges without an internet connection.
- [ ] **ENH-04**: Support multi-entry car registrations in Google Sheets Sync modal so racers with multiple entries are not prematurely rejected as duplicates.

## Future Requirements

- **PERF-01**: Async debounced disk writing or native SQLite driver for WASM `sql.js` to eliminate synchronous disk I/O blocking during heavy traffic.
- **TV-01**: Real-time audio and visual cheer celebration on `/tv` when a heat winner is crowned in the elimination round.
- **CLEAN-01**: Safe deprecation and removal of unused legacy v1/v2 screens (`MarshalDashboard.jsx`, `ScrutineerDashboard.jsx`, etc.).

## Out of Scope

- Cloud database migration (PostgreSQL / MySQL): SQLite WASM remains the active local-first engine for ease of single-machine sirkuit deployment.
- Native RFID/NFC hardware integration: Tournament remains 100% web-based and paperless.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 26 | Planned |
| FIX-02 | Phase 26 | Planned |
| FIX-03 | Phase 26 | Planned |
| FIX-04 | Phase 26 | Planned |
| SEC-01 | Phase 26 | Planned |
| SEC-02 | Phase 27 | Planned |
| SEC-03 | Phase 27 | Planned |
| SEC-04 | Phase 27 | Planned |
| ENH-01 | Phase 28 | Planned |
| ENH-02 | Phase 28 | Planned |
| ENH-03 | Phase 28 | Planned |
| ENH-04 | Phase 28 | Planned |
