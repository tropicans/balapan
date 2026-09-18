---
phase: 26
plan: 1
title: Critical Bug Fixes & Public Bracket Security Gate
wave: 1
dependencies: []
requirements:
  - FIX-01
  - FIX-02
  - FIX-03
  - FIX-04
  - SEC-01
files_modified:
  - .env
  - .env.example
  - package.json
  - client/src/components/director/BtoManager.jsx
  - client/src/screens/RealtimeTV.jsx
  - client/src/screens/BracketDashboard.jsx
must_haves:
  truths:
    - VITE_GOOGLE_CLIENT_ID matches legitimate Google Client ID and no client secret is exposed to browser
    - BtoManager cleans up STATE_UPDATE listener on unmount and directly consumes state.btoLeaderboard
    - RealtimeTV circuit HUD displays active event name from activeEvent.nama correctly
    - package.json test script runs all 21 test suites including google-sheet-sync.test.js
    - BracketDashboard hides MENANG button and winner registration tab when accessed without race_director/admin role
---

# Plan 26-01: Critical Bug Fixes & Public Bracket Security Gate

## Context
See `.planning/phases/26-critical-bug-fixes-public-bracket-security-gate/26-CONTEXT.md`.

## Tasks

### Task 1: Fix OAuth Client ID in `.env` & Complete Test Script (`FIX-01`, `FIX-04`)
- **files**: `.env`, `.env.example`, `package.json`
- **action**:
  1. In `.env` and `.env.example`, set `VITE_GOOGLE_CLIENT_ID=1073832156942-hakmkecmpdntp2kvr56r63v89ofong0n.apps.googleusercontent.com` (matching `GOOGLE_CLIENT_ID`).
  2. In `package.json`, append `&& node server/tests/google-sheet-sync.test.js` to the `"test"` script.
- **verify**: Run `npm test` and verify that all 21 test suites execute and pass 100% green.
- **done**: Both `.env` files carry the correct Client ID and `npm test` runs 21 test suites.

### Task 2: Fix Memory Leak in `BtoManager.jsx` & Event Name in `RealtimeTV.jsx` (`FIX-02`, `FIX-03`)
- **files**: `client/src/components/director/BtoManager.jsx`, `client/src/screens/RealtimeTV.jsx`
- **action**:
  1. In `BtoManager.jsx`, add `socket.off('STATE_UPDATE', handleStateUpdate)` in the `useEffect` cleanup return function.
  2. In `BtoManager.jsx`, handle `STATE_UPDATE` by setting `setLeaderboard(state.btoLeaderboard)` directly when `state?.btoLeaderboard` is an array, eliminating redundant HTTP GET `/api/bto/leaderboard` calls.
  3. In `RealtimeTV.jsx`, change `activeEvent?.name` to `(activeEvent?.nama || activeEvent?.name || 'DGDASH RACING SYSTEM').toUpperCase()`.
- **verify**: Run `npm run build` to verify frontend compiles with zero errors.
- **done**: `BtoManager.jsx` has clean unmount logic and `RealtimeTV.jsx` renders `activeEvent.nama`.

### Task 3: Secure Public Route `/bracket` as Read-Only for Spectators (`SEC-01`)
- **files**: `client/src/screens/BracketDashboard.jsx`
- **action**:
  1. Import `useAuth` from `../context/AuthContext.jsx`.
  2. Derive `isDirectorOrAdmin = Boolean(user && ['race_director', 'admin', 'super_admin'].includes(user.role));`.
  3. In `renderContestantRow`, hide the `MENANG` button if `!isDirectorOrAdmin`.
  4. In the tab bar, hide the `REGISTRASI PEMENANG BABAK 2 (v3.0)` button if `!isDirectorOrAdmin`.
  5. If `!isDirectorOrAdmin` and `activeTab === 'winners'`, automatically fallback `activeTab` to `'bracket'`.
- **verify**: Run `npm run build` and check that public bracket renders cleanly without interactive jury controls.
- **done**: Public visitors at `/bracket` see a clean read-only tournament bracket without mutation controls.
