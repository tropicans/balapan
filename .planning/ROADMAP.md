# Roadmap: NEO-TAMIYA Racing System

## Milestones

- ✅ **v1.0 Full SRS & Blueprint Compliance** — Phases 1-2 (shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UI/UX & Arena Visual Showcase Polish** — Phases 3-4 (shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Multi-Round 3-Lane Elimination System** — Phases 5-6 (shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v2.0 Physical Coupon & Marshal-Driven Tournament System** — Phases 07-10 (shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Alur Balap Fisik Tanpa Scan Kupon** — Phases 11-17 (shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v3.1 Race Director Elimination Command Center** — Phases 18-19 (shipped 2026-09-18) — [Archive](milestones/v3.1-ROADMAP.md)
- 🟡 **v3.2 Google OAuth Authentication & Admin Approval System** — Phases 20-23 (in progress)

## Phases

<details>
<summary>✅ v3.1 Race Director Elimination Command Center (Phases 18-19) — SHIPPED 2026-09-18</summary>

- [x] Phase 18: Backend Services, Round 2 Finalization & State Contract (1/1 plan) — completed 2026-09-18
- [x] Phase 19: Race Director Elimination Command Center UI (1/1 plan) — completed 2026-09-18

</details>

<details>
<summary>✅ v3.0 Alur Balap Fisik Tanpa Scan Kupon (Phases 11-17) — SHIPPED 2026-09-17</summary>

- [x] Phase 11: Event & Schema Migration Foundation (3/3 plans) — completed 2026-09-17
- [x] Phase 12: Participant Registration & Auto-Numbering (2/2 plans) — completed 2026-09-17
- [x] Phase 13: Manual BTO Backend & Leaderboard (1/1 plan) — completed 2026-09-17
- [x] Phase 14: Winner Registration & Bracket Execution (1/1 plan) — completed 2026-09-17
- [x] Phase 15: State Contract Switch & Backend Decoupling/Removal (1/1 plan) — completed 2026-09-17
- [x] Phase 16: Frontend Rewrite & Monitoring Screens (1/1 plan) — completed 2026-09-17
- [x] Phase 17: Destructive Cleanup, Tests & Seed (1/1 plan) — completed 2026-09-17

</details>

<details>
<summary>✅ v2.0 Physical Coupon & Marshal-Driven Tournament System (Phases 07-10) — SHIPPED 2026-09-04</summary>

- [x] Phase 07: Pre-Printed Coupon Package Registration & Cashier Flow (2/2 plans) — completed 2026-09-04
- [x] Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard (2/2 plans) — completed 2026-09-04
- [x] Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration (2/2 plans) — completed 2026-09-04
- [x] Phase 10: Realtime Circuit TV Ticket HUD Showcase & Polish (2/2 plans) — completed 2026-09-04

</details>

### 🟡 v3.2 Google OAuth Authentication & Admin Approval System (Phases 20-23)

- [x] **Phase 20: Database Schema, Google Auth Verification & Session Backend** - SQLite users table, token verification, tropicans@gmail auto-admin, and session tokens (completed 2026-09-18)
- [x] **Phase 21: Admin Approval Engine & RBAC Middleware** - Approval status management, role assignment, admin endpoints, and route protection middleware (completed 2026-09-18)
- [ ] **Phase 22: Frontend Google Login, Pending Gate & Public Route Bypass** - Google Sign-In button, AuthContext, pending approval gate, and /tv & /bracket public bypass
- [ ] **Phase 23: Admin Approval Dashboard UI & Role-Based UI Controls** - /admin user management page, approve modal with role picker, and role-scoped navigation

---

## Phase Details

### Phase 20: Database Schema, Google Auth Verification & Session Backend

**Goal**: Membangun fondasi autentikasi di backend meliputi skema tabel `app_users` & `auth_sessions`, verifikasi Google ID Token dengan aman, mekanisme otomatis `tropicans@gmail.com` sebagai Super Admin dengan status approved, penerbitan session token, serta endpoint autentikasi dasar.
**Depends on**: Phase 19
**Requirements**: AUTH-02, AUTH-03, AUTH-04, APPR-01
**Success Criteria** (what must be TRUE):
1. Skema database SQLite memiliki tabel pengguna (`app_users`) dan sesi/token dengan field id, google_id, email, name, avatar, role, status (`pending`/`approved`/`suspended`), created_at, approved_at, approved_by.
2. Endpoint `POST /api/auth/google` dapat memverifikasi ID Token Google dan mengembalikan profile pengguna beserta token sesi JWT/Bearer yang valid.
3. Login pertama kali dengan email `tropicans@gmail.com` (atau email yang di-set di env `SUPER_ADMIN_EMAIL`) otomatis mendapat role `super_admin` dan status `approved`.
4. Login pertama kali dengan email Google lainnya otomatis mencatat user baru dengan status `pending` dan role `pending`.
5. Automated test suite hijau memverifikasi verifikasi token, auto-admin untuk tropicans@gmail, pembuatan user pending, dan penolakan token invalid.

**Plans**: 1 plan
- [x] 20-01-PLAN.md — Schema migration, Google auth verification service, auto-super-admin logic, session token generator, and test suite. (completed 2026-09-18)

---

### Phase 21: Admin Approval Engine & RBAC Middleware

**Goal**: Menyediakan domain logic dan REST API bagi Super Admin untuk mengelola status persetujuan akun (approve, reject, suspend), memilih role pengguna, serta middleware pengamanan API (RBAC) pada endpoint operasional.
**Depends on**: Phase 20
**Requirements**: APPR-03, APPR-04, APPR-05, APPR-06
**Success Criteria** (what must be TRUE):
1. Endpoint `GET /api/admin/users` hanya dapat diakses oleh admin/super_admin dan mengembalikan daftar user yang difilter berdasarkan status (pending, approved, suspended).
2. Endpoint `POST /api/admin/users/:id/approve` memungkinkan admin menyetujui akun pending dan menetapkan peran (`cashier`, `race_director`, `scrutineer`, `admin`, `viewer`).
3. Endpoint `POST /api/admin/users/:id/role` dan `POST /api/admin/users/:id/status` memungkinkan admin mengubah peran atau mencabut akses user.
4. Middleware `requireAuth`, `requireApproved`, dan `requireRole` menolak akses pengguna yang belum login, belum di-approve (pending), atau tidak memiliki role yang diizinkan (HTTP 401/403).
5. Automated test suite hijau memvalidasi alur approve, penetapan role, dan penolakan akses tidak berizin pada endpoint operasional.

**Plans**: 1 plan
- [x] 21-01-PLAN.md — Admin user management service, approval & role endpoints, RBAC middleware protection, and API unit tests. (completed 2026-09-18)

---

### Phase 22: Frontend Google Login, Pending Gate & Public Route Bypass

**Goal**: Mengintegrasikan tombol login Google di frontend, state autentikasi React (`AuthContext`), proteksi rute dasbor operasional dengan penahan layar "Menunggu Persetujuan Admin", serta menjamin layar `/tv` dan `/bracket` tetap dapat dilihat bebas tanpa login.
**Depends on**: Phase 20
**Requirements**: AUTH-01, AUTH-05, AUTH-06, APPR-02
**Success Criteria** (what must be TRUE):
1. Tombol resmi Google Sign-In muncul di modal/halaman login dan berhasil memicu alur autentikasi Google.
2. Pengunjung tanpa login tetap dapat membuka dan menonton layar `/tv` (Layar TV Sirkuit) dan `/bracket` (Bagan Turnamen) tanpa terhalang prompt login.
3. User yang login namun berstatus `pending` ditampilkan layar penahan "Menunggu Persetujuan Admin" dengan pesan bahwa akun sedang menunggu persetujuan `tropicans@gmail.com`.
4. User yang sudah `approved` dapat mengakses dasbor operasional sesuai perannya.
5. Tombol Logout tersedia di Navbar yang menghapus sesi dan mengembalikan user ke tampilan publik.

**Plans**: 1 plan
- 22-01-PLAN.md — Google Identity Services integration, AuthContext, PendingGate component, Navbar user profile & public route exemption.

---

### Phase 23: Admin Approval Dashboard UI & Role-Based UI Controls

**Goal**: Membangun antarmuka Dasbor Manajemen Pengguna (`/admin`) untuk Super Admin (`tropicans@gmail.com`) untuk melihat daftar permohonan login baru, menyetujui akun dengan pemilihan role, mengelola user aktif, serta menyesuaikan navigasi Navbar berdasarkan hak akses role.
**Depends on**: Phase 21, Phase 22
**Requirements**: APPR-03, APPR-04, APPR-05, APPR-06
**Success Criteria** (what must be TRUE):
1. Halaman `/admin` hanya dapat dibuka oleh akun dengan role `admin` / `super_admin` (`tropicans@gmail.com`).
2. Dasbor menampilkan antrean "Permintaan Persetujuan" (Pending) dengan tombol "Setujui" yang memunculkan pilihan role (Kasir, Race Director, Scrutineer, Co-Admin, Viewer).
3. Dasbor menampilkan daftar akun aktif yang sudah disetujui beserta opsi untuk mengubah role atau mencabut akses (suspend).
4. Top Navbar menampilkan menu navigasi yang disesuaikan secara dinamis berdasarkan role user yang aktif (misal tombol Admin hanya terlihat oleh admin).
5. Verifikasi end-to-end menyeluruh (semua test suite lulus dan Vite build clean).

**Plans**: 1 plan
- 23-01-PLAN.md — AdminUserDashboard component, role selector modal, dynamic Navbar navigation, and production build verification.

---

## Progress

**Execution Order:**
Phases execute in numeric order: 20 → 21 → 22 → 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 18. Backend Services, Round 2 Finalization & State Contract | v3.1 | 1/1 | Complete | 2026-09-18 |
| 19. Race Director Elimination Command Center UI | v3.1 | 1/1 | Complete | 2026-09-18 |
| 20. Database Schema, Google Auth Verification & Session Backend | v3.2 | 1/1 | Complete | 2026-09-18 |
| 21. Admin Approval Engine & RBAC Middleware | v3.2 | 0/1 | Not Started | — |
| 22. Frontend Google Login, Pending Gate & Public Route Bypass | v3.2 | 0/1 | Not Started | — |
| 23. Admin Approval Dashboard UI & Role-Based UI Controls | v3.2 | 0/1 | Not Started | — |

---
*Roadmap updated: 2026-09-18 for Milestone v3.2*
