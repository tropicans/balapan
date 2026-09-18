# Phase 22: Frontend Google Login, Pending Gate & Public Route Bypass — Discussion Log

**Phase:** 22  
**Milestone:** v3.2 Google OAuth Authentication & Admin Approval System  
**Date:** 2026-09-18  

---

## 1. Design Decisions (Adaptive Socratic Selection)

### Decision 1: Public Route Handling vs Operational Gate
- **Choice:** Explicit route bypass. Screens `/tv` and `/bracket` are unconditionally public and never show a login prompt or gate modal.
- **Rationale:** Spectators and racers in the pit arena need to see race positions and the bracket tree without distraction. Operational dashboards (`/cashier`, `/director`, `/winners`, `/events`, `/admin`) require an active, approved session.

### Decision 2: Pending Approval Experience
- **Choice:** Dedicated inline screen within protected route area, equipped with WebSocket real-time reactivity.
- **Rationale:** When an operator signs in with their Google account before the Super Admin approves them, they see a clear explanation: "Akun Anda sedang menunggu persetujuan dari Super Admin (`tropicans@gmail.com`)". When the Super Admin approves them on their `/admin` dashboard, the server emits `user:updated`, the client state switches immediately to `approved`, and the screen unlocks automatically.

### Decision 3: Google Identity Services (GIS) & Offline/Dev Fallback
- **Choice:** Standard Google Identity Services client script loaded in `index.html`. If Google Client ID is configured, render official GIS One-Tap/Button. In addition, support quick login in development/testing mode so developers and automated tests can authenticate without external Google credentials.

### Decision 4: Role-Based Display in Navbar
- **Choice:** Replace the participant selector button in Navbar with an operator identity badge displaying Google avatar, name, and Role badge (`SUPER ADMIN`, `ADMIN`, `KASIR`, `RACE DIRECTOR`, `SCRUTINEER`, `VIEWER`, or `PENDING`). Provide a dropdown with user details and a "Keluar (Logout)" button.
