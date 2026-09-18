# Roadmap: NEO-TAMIYA Racing System

## Milestones

- 🟡 **v3.3 Google Sheets Racer Sync & Admin Integration** — Phases 24-25 (in progress)
- ✅ **v3.2 Google OAuth Authentication & Admin Approval System** — Phases 20-23 (shipped 2026-09-18) — [Archive](milestones/v3.2-ROADMAP.md)
- ✅ **v3.1 Race Director Elimination Command Center** — Phases 18-19 (shipped 2026-09-18) — [Archive](milestones/v3.1-ROADMAP.md)
- ✅ **v3.0 Alur Balap Fisik Tanpa Scan Kupon** — Phases 11-17 (shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v2.0 Physical Coupon & Marshal-Driven Tournament System** — Phases 07-10 (shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v1.2 Multi-Round 3-Lane Elimination System** — Phases 5-6 (shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.1 UI/UX & Arena Visual Showcase Polish** — Phases 3-4 (shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.0 Full SRS & Blueprint Compliance** — Phases 1-2 (shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)

## Phases

### 🟡 v3.3 Google Sheets Racer Sync & Admin Integration (Phases 24-25)

- [ ] **Phase 24: Google Sheets Live Fetch, Idempotent Sync Service & API Endpoints**
  - **Goal:** Bangun service backend untuk download live CSV Google Sheets, validasi parse, deduping nama pembalap aktif, penomoran berurutan atomik, dan endpoint `/api/participants/sync-sheet`.
  - **Requirements:** `SYNC-01`, `SYNC-02`, `SYNC-03`, `SYNC-04`, `SYNC-05`, `SYNC-06`, `SYNC-07`
  - **Success Criteria:**
    1. Helper backend mampu mengonversi dokumen Google Sheets URL menjadi URL export CSV secara otomatis.
    2. Eksekusi sync secara idempotence: peserta baru ditambahkan dengan nomor urut berikutnya (`MAX + 1`), peserta yang sudah terdaftar dilewati tanpa duplikasi nomor.
    3. Endpoint `POST /api/participants/sync-sheet` mengembalikan metrik `{ totalFound, addedCount, skippedCount }` dan mem-broadcast update via Socket.IO.
    4. Unit test suite mencakup skenario sinkronisasi pertama kali, sinkronisasi berulang (0 data baru), penambahan pembalap baru di sheet, dan penanganan status Lunas vs Belum Lunas.

- [ ] **Phase 25: Cashier & Admin Dashboard UI Integration**
  - **Goal:** Integrasikan tombol "SYNC GOOGLE SHEET" pada antarmuka Kasir (`/cashier`) dan Panel Admin (`/admin`) lengkap dengan modal dialog status sync dan opsi konfigurasi URL sheet.
  - **Requirements:** `SYNC-08`, `SYNC-09`, `SYNC-10`
  - **Success Criteria:**
    1. Kasir memiliki tombol aksi "SYNC GOOGLE SHEET" di header telemetry bersebelahan dengan tombol "IMPORT CSV".
    2. Dasbor Admin memiliki kartu/tombol aksi sync dengan penanda waktu terakhir sync dan URL sheet aktif.
    3. Modal dialog konfirmasi menampilkan ringkasan aksi sebelum dan sesudah sync (jumlah pembalap baru ditambahkan vs dilewati).
    4. Seluruh komponen reaktif terhadap event WebSocket `participants_imported` dan memperbarui counter peserta seketika.

---

<details>
<summary>✅ v3.2 Google OAuth Authentication & Admin Approval System (Phases 20-23) — SHIPPED 2026-09-18</summary>

- [x] Phase 20: Database Schema, Google Auth Verification & Session Backend (1/1 plan) — completed 2026-09-18
- [x] Phase 21: Admin Approval Engine & RBAC Middleware (1/1 plan) — completed 2026-09-18
- [x] Phase 22: Frontend Google Login, Pending Gate & Public Route Bypass (1/1 plan) — completed 2026-09-18
- [x] Phase 23: Admin Approval Dashboard UI & Role-Based UI Controls (1/1 plan) — completed 2026-09-18

</details>

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

---

## Progress

**Execution Order:**
Phases execute in numeric order: 24 → 25

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 24. Google Sheets Live Fetch, Idempotent Sync Service & API Endpoints | v3.3 | 0/1 | Planned | — |
| 25. Cashier & Admin Dashboard UI Integration | v3.3 | 0/1 | Planned | — |

---
*Roadmap updated: 2026-09-18 for Milestone v3.3*
