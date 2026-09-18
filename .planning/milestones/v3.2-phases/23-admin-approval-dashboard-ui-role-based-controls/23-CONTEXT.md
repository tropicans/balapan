# Phase 23: Admin Approval Dashboard UI & Role-Based UI Controls — Context

**Phase:** 23  
**Milestone:** v3.2 Google OAuth Authentication & Admin Approval System  
**Created:** 2026-09-18  

---

## 1. Background & Scope
Milestone v3.2 requires that any user signing in with Google (other than `tropicans@gmail.com`) is placed into a pending state and must be approved by `tropicans@gmail.com`.

In Phase 21, the backend approval logic and RBAC endpoints (`/api/admin/users/*`) were implemented.
In Phase 22, the Google Sign-In flow, client session management, and pending approval gate were established.

Phase 23 delivers the final user experience:
1. Building and polishing the User Management Dashboard (`/admin`) for Super Admin and Admin operators.
2. Providing a real-time list of pending requests, approved operators, and suspended accounts.
3. Enabling instant role assignment (`cashier`, `race_director`, `scrutineer`, `admin`, `viewer`) with interactive modal dialogs.
4. Enabling instant status revocation / suspension (`suspended` or `approved`) with session invalidation.
5. Dynamic Navbar controls: only authorized admins see the "Admin Approval" tab.
6. Real-time updates via Socket.IO: when a new user signs in or an approval occurs, the admin dashboard updates live without manual page refresh.

---

## 2. Requirements Addressed
- **APPR-03**: Super Admin (`tropicans@gmail.com`) has access to User Management Dashboard (`/admin`) to view pending, approved, and suspended user accounts.
- **APPR-04**: Super Admin can approve pending accounts and assign operational roles (`cashier`, `race_director`, `scrutineer`, `admin`, `viewer`).
- **APPR-05**: Super Admin can change user roles or revoke/suspend access at any time.
- **APPR-06**: Operational dashboards and API backend enforce role-based access control (RBAC), blocking unauthorized requests.

---

## 3. Implementation Plan
- Enhance `client/src/screens/AdminUserDashboard.jsx` with search filter, real-time Socket.IO synchronization on `user:updated`, clear badge styling, and Super Admin immunity guards.
- Ensure Vite build and full test suites pass 100%.
