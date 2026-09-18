# Phase 27 Context: End-to-End RBAC Hardening & Mutation Protection

## Overview
Phase 27 closes the security loop in DGDash Racing System by enforcing server-side mutation protection (RBAC), automatic JWT/Bearer token forwarding from frontend fetch clients, and client-side UI navigation and route filtering based on authenticated user roles.

## Requirements Covered
- **SEC-02**: Apply role-based authorization (`requireApproved`, `requireRole`) to all state-mutating endpoints in `server/index.js` (`/api/participants`, `/api/events`, `/api/bto`, `/api/winners`, `/api/bracket`).
- **SEC-03**: Implement automatic Bearer token injection (`fetchWithAuth`) in frontend `RaceContext.jsx` for all mutation API calls using stored authentication credentials.
- **SEC-04**: Implement role-based navigation filtering in `Navbar.jsx` and route-level protection in `App.jsx` matching assigned operational permissions (Race Director, Cashier, Marshal, Scrutineer, Admin).

## Recommended Decisions (Auto-Selected)
1. **Endpoint Access Mapping (`SEC-02`)**:
   - `/api/events` (create, setActive, archive): `requireRole('admin', 'super_admin')`
   - `/api/participants` (register, update, import, sync-sheet): `requireRole('cashier', 'admin', 'super_admin')`
   - `/api/bto` (record, delete): `requireRole('scrutineer', 'race_director', 'admin', 'super_admin')`
   - `/api/winners` (register, undo): `requireRole('marshal', 'race_director', 'admin', 'super_admin')`
   - `/api/bracket` (advance, reset): `requireRole('race_director', 'admin', 'super_admin')`
   - All read GET endpoints remain publicly accessible so spectators, monitors, and circuit TVs function seamlessly without authentication.
2. **Frontend Token Forwarding (`SEC-03`)**:
   - In `RaceContext.jsx`, standardize a `fetchWithAuth(url, options)` helper that retrieves `localStorage.getItem('dg_auth_token')` and appends `Authorization: Bearer <token>` to request headers.
   - All mutation API functions (`apiAdvanceBracket`, `apiResetBracketMatch`, `apiRecordBtoTime`, etc.) will utilize `fetchWithAuth`.
3. **Route & Tab Guarding (`SEC-04`)**:
   - Public tabs: `/tv` (Circuit TV), `/leaderboard` (BTO Leaderboard), `/bracket` (Spectator Bracket).
   - Staff tabs:
     - `/race` & `/director`: `race_director`, `admin`, `super_admin`
     - `/cashier`: `cashier`, `admin`, `super_admin`
     - `/marshal`: `marshal`, `race_director`, `admin`, `super_admin`
     - `/scrutineer`: `scrutineer`, `race_director`, `admin`, `super_admin`
     - `/admin`: `admin`, `super_admin`
   - Non-authenticated or pending users attempting to navigate to staff routes are shown an intuitive unauthorized / pending-approval banner or redirected to `/tv`.
