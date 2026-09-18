# Phase 22: Frontend Google Login, Pending Gate & Public Route Bypass — Context

**Phase:** 22  
**Milestone:** v3.2 Google OAuth Authentication & Admin Approval System  
**Created:** 2026-09-18  

---

## 1. Background & Scope
Phase 20 implemented the database schema and backend Google token verification.
Phase 21 established the admin approval logic and RBAC middleware.

Phase 22 bridges these systems to the client interface:
1. Providing a centralized React `AuthContext` to store JWT/Bearer tokens in `localStorage`, manage authentication state, fetch `/api/auth/me`, and react to real-time `user:updated` WebSocket broadcasts.
2. Integrating Google Identity Services (GIS) button and secure token exchange to `POST /api/auth/google`.
3. Protecting operational dashboards (`/cashier`, `/director`, `/winners`, `/events`, `/admin`) while explicitly bypassing public spectator screens (`/tv` and `/bracket`).
4. Displaying a dedicated cyber-themed Pending Approval Gate screen for unapproved Google users with automatic real-time unlock when approved by Super Admin.
5. Providing user profile display (avatar, email, role badge) and secure Logout in the Navbar.

---

## 2. Requirements Addressed
- **AUTH-01**: User can log in with Google account (Google Sign-In button via Google Identity Services) in web interface.
- **AUTH-05**: User can log out securely (clears local token and resets state to guest/public).
- **AUTH-06**: Visitors can view public screens (`/tv` Circuit TV and `/bracket` Tournament Bracket) freely without login or blocking modals.
- **APPR-02**: User with `pending` status sees a clear gate screen "Menunggu Persetujuan Admin" explaining that the account is awaiting approval from `tropicans@gmail.com`, blocking them from operational dashboards.

---

## 3. Architecture & Technical Design

### A. AuthContext (`client/src/context/AuthContext.jsx`)
- State: `user` (id, email, name, avatar, role, status), `token`, `loading`, `error`.
- Persists `auth_token` in `localStorage`.
- Automatically calls `GET /api/auth/me` on mount with `Authorization: Bearer <token>`.
- Real-time reactivity: subscribes to Socket.IO event `user:updated`. If updated user ID equals current user's ID, updates status/role in state immediately without requiring page reload.
- Methods: `loginWithGoogleToken(idToken)`, `mockLogin(email, name)`, `logout()`.

### B. Routing & Gate Architecture (`client/src/App.jsx`)
- Screen classification:
  - `PUBLIC_SCREENS`: `['tv', 'bracket']`
  - `PROTECTED_SCREENS`: `['cashier', 'rd', 'winners', 'events', 'admin']`
- Flow logic:
  1. If `activeScreen` is in `PUBLIC_SCREENS`: render dashboard directly, no login gate.
  2. If `activeScreen` is in `PROTECTED_SCREENS`:
     - If `loading`: render cyber spinner / loader.
     - If `!user` (not logged in): render `LoginScreen` with Google Sign-In prompt.
     - If `user.status === 'pending'`: render `PendingApprovalScreen` (noting `tropicans@gmail.com` must approve).
     - If `user.status === 'suspended'` or `rejected`: render `SuspendedAccountScreen`.
     - If `user.status === 'approved'`: render the operational dashboard.

### C. UI Components
- `client/src/components/auth/LoginScreen.jsx`: Cyber-themed login portal with Google Sign-In button and quick test sign-in helper.
- `client/src/components/auth/PendingApprovalScreen.jsx`: Status banner, avatar, message, and direct link to watch public TV screen while waiting.
- `client/src/components/ui/Navbar.jsx`: Authenticated user profile, role badge, login/logout actions.
