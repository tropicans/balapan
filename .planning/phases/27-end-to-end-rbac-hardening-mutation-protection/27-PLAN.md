---
phase: 27
plan: 1
title: End-to-End RBAC Hardening & Mutation Protection
wave: 1
dependencies: []
requirements:
  - SEC-02
  - SEC-03
  - SEC-04
files_modified:
  - server/middleware/authMiddleware.js
  - server/index.js
  - client/src/utils/api.js
  - client/src/context/RaceContext.jsx
  - client/src/components/bracket/WinnerRegistrationPanel.jsx
  - client/src/components/director/BtoManager.jsx
  - client/src/components/cashier/ParticipantEditModal.jsx
  - client/src/components/cashier/CouponRegistrationForm.jsx
  - client/src/components/sync/GoogleSheetSyncModal.jsx
  - client/src/components/ui/Navbar.jsx
  - client/src/App.jsx
  - server/tests/phase-27-mutation-rbac.test.js
  - package.json
must_haves:
  truths:
    - All state mutation endpoints in server/index.js require valid authenticated session and proper roles (SEC-02)
    - Frontend client automatically sends Authorization Bearer token with every mutation request (SEC-03)
    - Navigation bar and client routing filter accessible screens by authenticated user role (SEC-04)
    - Automated test phase-27-mutation-rbac.test.js verifies 401/403/200 authorization contracts
---

# Plan 27-01: End-to-End RBAC Hardening & Mutation Protection

## Context
See `.planning/phases/27-end-to-end-rbac-hardening-mutation-protection/27-CONTEXT.md`.

## Tasks

### Task 1: Server Mutation Protection & RBAC Middleware Application (`SEC-02`)
- **files**: `server/middleware/authMiddleware.js`, `server/index.js`
- **action**:
  1. In `server/middleware/authMiddleware.js`, support `mock-super-admin-token` for deterministic testing.
  2. In `server/index.js`, attach `requireRole` middleware to all mutation endpoints:
     - `/api/events`, `/api/events/:id/activate`, `/api/events/:id/archive`: `requireRole('admin', 'super_admin')`
     - `/api/participants`, `/api/participants/:id`, `/api/participants/import`, `/api/participants/sync-sheet`: `requireRole('cashier', 'admin', 'super_admin')`
     - `/api/bto`, `/api/bto/:id`: `requireRole('scrutineer', 'race_director', 'admin', 'super_admin')`
     - `/api/winners/register`, `/api/winners/undo`: `requireRole('marshal', 'race_director', 'admin', 'super_admin')`
     - `/api/bracket/advance`, `/api/bracket/lock-round`, `/api/bracket/unlock-round`, `/api/bracket/reset`: `requireRole('race_director', 'admin', 'super_admin')`
  3. Ensure read (GET) endpoints remain open for public viewers, monitors, and leaderboard TVs.
- **verify**: Run new test `server/tests/phase-27-mutation-rbac.test.js` asserting 401 without auth, 403 on role mismatch, and 200 on authorized role.
- **done**: Mutation endpoints are strictly guarded by role-based authorization.

### Task 2: Client Auto-Bearer Token Forwarding (`SEC-03`)
- **files**: `client/src/utils/api.js`, `client/src/context/RaceContext.jsx`, `client/src/components/bracket/WinnerRegistrationPanel.jsx`, `client/src/components/director/BtoManager.jsx`, `client/src/components/cashier/ParticipantEditModal.jsx`, `client/src/components/sync/GoogleSheetSyncModal.jsx`
- **action**:
  1. Create `client/src/utils/api.js` exporting `fetchWithAuth(url, options)` that reads `localStorage.getItem('dg_auth_token')` and attaches `Authorization: Bearer <token>`.
  2. Replace raw `fetch` calls with `fetchWithAuth` across `RaceContext.jsx` mutation methods, `WinnerRegistrationPanel.jsx`, `BtoManager.jsx`, `ParticipantEditModal.jsx`, `GoogleSheetSyncModal.jsx`.
- **verify**: Run `npm run build` to verify clean frontend compilation.
- **done**: Frontend automatically sends bearer authentication tokens on all mutation requests.

### Task 3: Client Route & Navbar Role Guarding (`SEC-04`)
- **files**: `client/src/components/ui/Navbar.jsx`, `client/src/App.jsx`
- **action**:
  1. In `Navbar.jsx`, import `useAuth`. Filter navigation links dynamically based on user role:
     - Public tabs (`/tv`, `/leaderboard`, `/bracket`) visible to everyone.
     - Operational tabs (`/race`, `/director`, `/cashier`, `/marshal`, `/scrutineer`, `/admin`) visible only if user is approved and has the corresponding role (or `super_admin`).
  2. In `App.jsx`, wrap sensitive operational views with a role check: if an unauthenticated or non-permitted user attempts to access a protected route directly via URL, display an unauthorized notice or fallback to `/tv`.
- **verify**: Run `npm run build` and run test suite.
- **done**: Client navigation and routes are cleanly secured based on authenticated roles.
