---
requirements-completed:
  - SEC-02
  - SEC-03
  - SEC-04
---

# Phase 27 Summary: End-to-End RBAC Hardening & Mutation Protection

**Status:** Completed
**Date:** 2026-09-18
**Requirements Covered:** SEC-02, SEC-03, SEC-04

## Accomplishments

1. **Server Mutation Protection & RBAC Middleware (`SEC-02`)**:
   - Attached `requireRole` and `requireApproved` middleware to all state-mutating endpoints in `server/index.js`:
     - `/api/events`, `/api/events/:id/activate`, `/api/events/:id/archive`: restricted to `admin`, `super_admin`.
     - `/api/participants`, `/api/participants/:id`, `/api/participants/import-preview`, `/api/participants/import`, `/api/participants/sync-sheet`: restricted to `cashier`, `admin`, `super_admin`.
     - `/api/bto`, `/api/bto/:id`: restricted to `scrutineer`, `race_director`, `admin`, `super_admin`.
     - `/api/winners/register`, `/api/winners/undo`: restricted to `marshal`, `race_director`, `admin`, `super_admin`.
     - `/api/bracket/advance`, `/api/bracket/lock-round`, `/api/bracket/unlock-round`, `/api/bracket/reset`: restricted to `race_director`, `admin`, `super_admin`.
   - Verified that all read endpoints (`/api/participants`, `/api/events`, `/api/bto/leaderboard`, `/api/winners`, `/api/bracket/progress`, etc.) remain fully open for public screens and monitors.
   - Added `server/tests/phase-27-mutation-rbac.test.js` verifying 401 on missing auth, 403 on role mismatch, and 200/201 on authorized roles.

2. **Client Auto-Bearer Token Forwarding (`SEC-03`)**:
   - Created `client/src/utils/api.js` exporting `fetchWithAuth(url, options)` that retrieves `localStorage.getItem('dg_auth_token')` and automatically adds the `Authorization: Bearer <token>` header to all outgoing requests.
   - Migrated all mutation API calls across `client/src/context/RaceContext.jsx`, `client/src/components/bracket/WinnerRegistrationPanel.jsx`, `client/src/components/director/BtoManager.jsx`, `client/src/components/cashier/ParticipantEditModal.jsx`, `client/src/components/cashier/CouponRegistrationForm.jsx`, and `client/src/components/sync/GoogleSheetSyncModal.jsx` to use `fetchWithAuth`.

3. **Client Navigation & Route Guarding (`SEC-04`)**:
   - Updated `client/src/components/ui/Navbar.jsx` to dynamically filter navigation tabs according to authenticated user role:
     - Anonymous users only see public spectator tabs: `Babak Eliminasi` (`/bracket`) and `Layar TV Sirkuit` (`/tv`).
     - Staff members only see tabs matching their approved roles (Cashier, Race Director, Marshal/Winner, Admin).
   - Enforced route-level permission checks in `client/src/App.jsx`: direct URL access to unauthorized operational screens renders a branded Cyberpunk Access Denied shield with navigation back to `/tv`.

## Verification
- `npm test`: All 22 test suites passed 100% green.
- `npm run build`: Frontend build compiled without errors.
