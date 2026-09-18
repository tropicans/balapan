# Roadmap: NEO-TAMIYA Racing System

## Milestones

- ✅ **v1.0 Full SRS & Blueprint Compliance** — Phases 1-2 (shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UI/UX & Arena Visual Showcase Polish** — Phases 3-4 (shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Multi-Round 3-Lane Elimination System** — Phases 5-6 (shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v2.0 Physical Coupon & Marshal-Driven Tournament System** — Phases 07-10 (shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Alur Balap Fisik Tanpa Scan Kupon** — Phases 11-17 (shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)
- 🚧 **v3.1 Race Director Elimination Command Center** — Phases 18-19 (in progress)

## Phases

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

<details>
<summary>✅ v1.2 Multi-Round 3-Lane Elimination System (Phases 5-6) — SHIPPED 2026-09-03</summary>

- [x] Phase 5: Multi-Round 3-Lane Bracket Schema & Promotion Engine (1/1 plan) — completed 2026-09-03
- [x] Phase 6: Multi-Round Elimination Dashboard & UI Polish (1/1 plan) — completed 2026-09-03

</details>

<details>
<summary>✅ v1.1 UI/UX & Arena Visual Showcase Polish (Phases 3-4) — SHIPPED 2026-09-03</summary>

- [x] Phase 3: Ergonomic Stopwatch Inputs & Gold BTO Shimmer (1/1 plan) — completed 2026-09-03
- [x] Phase 4: Fullscreen Dynamic TV Countdown Overlay (1/1 plan) — completed 2026-09-03

</details>

<details>
<summary>✅ v1.0 Full SRS & Blueprint Compliance (Phases 1-2) — SHIPPED 2026-09-03</summary>

- [x] Phase 1: Exception Flows (SEMUA CO & RE-RACE) (1/1 plan) — completed 2026-09-03
- [x] Phase 2: Scrutineer Hardening (Active Alert & Emergency Override) (1/1 plan) — completed 2026-09-03

</details>

### 🚧 v3.1 Race Director Elimination Command Center (In Progress)

- [x] **Phase 18: Backend Services, Round 2 Finalization & State Contract** - Endpoints, round locking logic, bracket protections, and WebSocket events (completed 2026-09-18)
- [ ] **Phase 19: Race Director Elimination Command Center UI** - Modern elimination dashboard at `/director`, 1-click winner selection, progress indicators, and lock modal

---

## Phase Details

### Phase 18: Backend Services, Round 2 Finalization & State Contract

**Goal**: Menyediakan backend domain logic, REST APIs, dan WebSocket events untuk penguncian/finalisasi Babak 2 (`round2_status`), validasi status heat, pencegahan modifikasi pada babak terkunci, serta integrasi state real-time.
**Depends on**: Phase 17
**Requirements**: RDELIM-04, RDELIM-05
**Success Criteria** (what must be TRUE):

  1. Endpoint `POST /api/bracket/lock-round` dan `POST /api/bracket/unlock-round` dapat mengunci dan membuka kunci status Babak 2 di `tournament_settings`.
  2. Saat Babak 2 terkunci, percobaan pemanggilan `advanceBracketWinner` pada match Babak 2 dicegah dengan error yang jelas.
  3. `round2_status` disertakan dalam `getFullState()` dan disiarkan secara real-time via WebSocket (`round2:locked`, `round2:unlocked`, `bracket_updated`).
  4. Backend menyediakan status progres per ronde (total heat, heat selesai, heat pending) dan validasi kelayakan finalisasi.
  5. Automated test suite hijau memverifikasi alur lock/unlock Babak 2, pencegahan mutasi saat locked, dan broadcast WebSocket.

**Plans**: 1 plan

**Wave 1**
- [x] 18-01-PLAN.md — Round lock & unlock logic, mutation protection, progress calculations, REST API endpoints, and automated tests (completed 2026-09-18)

---

### Phase 19: Race Director Elimination Command Center UI

**Goal**: Menggantikan kontrol race digital lawas di `/director` dengan antarmuka Dasbor Eliminasi terpadu yang menampilkan bagan Babak 2 sampai Grand Final, penandaan pemenang 1-klik, ringkasan progres heat, dan modal Finalisasi/Kunci Babak 2.
**Depends on**: Phase 18
**Requirements**: RDELIM-01, RDELIM-02, RDELIM-03, RDELIM-04, RDELIM-05
**Success Criteria** (what must be TRUE):

  1. Halaman `/director` menampilkan kontrol eliminasi modern Babak 2 ke atas dengan navigasi tab babak (Babak 2, Babak 3 / Perempat Final, Grand Final).
  2. Race Director dapat memilih pemenang heat dengan 1-klik langsung dari dasbor `/director`, dengan penanda visual instan status SELESAI dan pemenang bermahkota.
  3. Banner progres menampilkan jumlah heat yang sudah selesai vs pending secara visual dan reaktif.
  4. Tombol "Finalisasi / Kunci Babak 2" aktif ketika seluruh heat Babak 2 selesai, membuka modal konfirmasi penguncian dan mengubah state menjadi Terkunci.
  5. Perubahan pemenang atau penguncian babak tersinkronisasi real-time ke layar `/tv` dan `/bracket` tanpa perlu refresh halaman.

**Plans**: 1 plan

**Wave 1**
- [ ] 19-01-PLAN.md — RaceContext extensions, EliminationManager component, RaceDirectorDashboard refactor, and build verification
**UI hint**: yes

---

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 11. Event & Schema Migration Foundation | v3.0 | 3/3 | Complete    | 2026-09-17 |
| 12. Participant Registration & Auto-Numbering | v3.0 | 2/2 | Complete    | 2026-09-17 |
| 13. Manual BTO Backend & Leaderboard | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 14. Winner Registration & Bracket Execution | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 15. State Contract Switch & Backend Decoupling/Removal | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 16. Frontend Rewrite & Monitoring Screens | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 17. Destructive Cleanup, Tests & Seed | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 18. Backend Services, Round 2 Finalization & State Contract | v3.1 | 1/1 | Complete | 2026-09-18 |
| 19. Race Director Elimination Command Center UI | v3.1 | 0/1 | In Progress | — |

---
*Roadmap updated: 2026-09-18 for Milestone v3.1*
