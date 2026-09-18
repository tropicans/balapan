# Phase 23: Admin Approval Dashboard UI & Role-Based UI Controls — Discussion Log

**Phase:** 23  
**Milestone:** v3.2 Google OAuth Authentication & Admin Approval System  
**Date:** 2026-09-18  

---

## 1. Design Decisions (Adaptive Socratic Selection)

### Decision 1: Navigation Scoping for Admin Features
- **Choice:** Only expose `/admin` (Admin Approval) in the top Navbar when the authenticated user has role `super_admin` or `admin`.
- **Rationale:** Minimizes UI clutter for standard operators (cashier, race director, scrutineer) and visitors, while securing the administrative route both visually on client and strictly on backend RBAC middleware.

### Decision 2: Approval Flow & Role Assignment UI
- **Choice:** Prominent green "SETUJUI" button on pending rows opening an intuitive Cyber-themed Role Picker Modal.
- **Rationale:** The admin must explicitly choose what the operator will be allowed to do (`cashier`, `race_director`, `scrutineer`, `admin`, `viewer`) with clear descriptive labels before granting access.

### Decision 3: Super Admin Immunity UI Safeguard
- **Choice:** The row for `tropicans@gmail.com` displays an `IMMUNE` badge and disables role change and suspension buttons.
- **Rationale:** Enforces fail-safe system integrity so the root Super Admin cannot accidentally lock themselves out of the system.

### Decision 4: Real-time Socket.IO Sync
- **Choice:** `AdminUserDashboard` listens to `user:updated` from the server and auto-refreshes user listings.
- **Rationale:** When another admin approves a user or a user signs in, all open admin dashboards stay synchronized in real time without requiring manual refreshes.
