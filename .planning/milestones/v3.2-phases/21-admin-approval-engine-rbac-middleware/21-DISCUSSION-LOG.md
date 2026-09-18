# Phase 21 Discussion Log: Admin Approval Engine & RBAC Middleware

**Date:** 2026-09-18
**Participants:** Antigravity AI Orchestrator & User

## Summary of Discussed Areas

1. **Hak Akses Endpoint Admin**:
   - Keputusan: Hanya `super_admin` dan `admin` yang berwenang mengakses endpoint manajemen user (`/api/admin/*`).
2. **Pilihan Role**:
   - Keputusan: Role didukung: `cashier`, `race_director`, `scrutineer`, `admin`, `viewer`.
3. **Proteksi Super Admin**:
   - Keputusan: Akun `tropicans@gmail.com` kebal dari suspend atau downgrade role.
4. **Middleware RBAC Hierarchy**:
   - Keputusan: `requireAuth` -> `requireApproved` -> `requireRole`.
   - User `pending` mendapat pesan edukatif bahwa akun menunggu persetujuan `tropicans@gmail.com`.

Status: Decisions locked. Ready for planning.
