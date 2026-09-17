# Roadmap: NEO-TAMIYA Racing System

## Milestones

- ✅ **v1.0 Full SRS & Blueprint Compliance** — Phases 1-2 (shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 UI/UX & Arena Visual Showcase Polish** — Phases 3-4 (shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Multi-Round 3-Lane Elimination System** — Phases 5-6 (shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v2.0 Physical Coupon & Marshal-Driven Tournament System** — Phases 07-10 (shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Alur Balap Fisik Tanpa Scan Kupon** — Phases 11-17 (shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)

## Phases

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

### 🚧 v3.0 Alur Balap Fisik Tanpa Scan Kupon (In Progress)

**Milestone Goal:** Hilangkan seluruh proses scanning (kupon & QR jalur) serta modul kupon digital; aplikasi fokus pada registrasi peserta bernomor, pendaftaran pemenang Babak 2 berdasarkan nomor, dan manajemen bracket eliminasi. Strict **add → switch → remove** order: migration/data-safety and backend de-coupling land before UI removal; manual BTO replacement before deleting race engine; destructive drops last.

- [x] **Phase 11: Event & Schema Migration Foundation** - Safe, reversible schema foundation with events and participant numbering
- [x] **Phase 12: Participant Registration & Auto-Numbering** - Cashier registers numbered participants per active event
- [x] **Phase 13: Manual BTO Backend & Leaderboard** - Manual best-time entry, personal-best replacement, realtime leaderboard
- [x] **Phase 14: Winner Registration & Bracket Execution** - Number→name winner seeding + manual heat winner auto-advance
- [x] **Phase 15: State Contract Switch & Backend Decoupling/Removal** - New state payload, coupon query de-coupling, delete race/ticket/coupon modules
- [x] **Phase 16: Frontend Rewrite & Monitoring Screens** - RD & TV display bracket/BTO; delete obsolete screens/routes
- [x] **Phase 17: Destructive Cleanup, Tests & Seed** - Gated table drops, dependency prune, green test suite

## Phase Details

### Phase 11: Event & Schema Migration Foundation

**Goal**: Panitia can manage tournament events on a safe, versioned schema where `participant_number` is the new identity primitive — with a timestamped backup and real transactions before any destructive step.
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: MIG-01, MIG-02, EVNT-01, EVNT-02, EVNT-04
**Success Criteria** (what must be TRUE):

  1. Panitia dapat membuat event/turnamen baru (nama, tanggal) dan memilihnya sebagai event aktif
  2. Data peserta/bracket/BTO tersimpan terpisah per event (event-scoped)
  3. Migrasi berjalan dalam transaksi nyata (BEGIN/COMMIT/ROLLBACK) dengan baris `schema_version` dan backup `data/tamiya.sqlite` bertimestamp sebelum langkah destruktif
  4. Kolom `participant_number` (+ UNIQUE index) ada pada `users` dengan normalisasi nomor kanonik (`"7"` == `"007"`)
  5. Basis data v2.0 tetap terbaca dan server tetap boot — belum ada drop tabel

**Plans:** 3/3 plans complete
Plans:
**Wave 1**

- [x] 11-01-PLAN.md — Real transactions, timestamped backup, versioned migration runner, event schema + participant_number backfill

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-02-PLAN.md — Event service + `/api/events` routes + event-scoped bracket reads

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 11-03-PLAN.md — Manajemen Event screen + v2.0 boot-safety regression

### Phase 12: Participant Registration & Auto-Numbering

**Goal**: Kasir dapat mendaftarkan peserta (nama, tim) tanpa kupon/serial/saldo dan aplikasi otomatis memberi nomor peserta unik berurutan per event aktif.
**Depends on**: Phase 11
**Requirements**: PARN-01, PARN-02, PARN-03, PARN-04, PARN-05, EVNT-03
**Success Criteria** (what must be TRUE):

  1. Kasir can register a participant (nama, tim) tanpa kupon/serial/saldo
  2. App otomatis memberi nomor peserta unik berurutan dalam event aktif; nomor reset dari 1 pada event baru
  3. Panitia dapat mencari peserta via nomor atau nama
  4. Nomor peserta ditampilkan jelas untuk ditulis panitia di kupon fisik
  5. Import roster CSV mendaftarkan peserta + nomor ke event aktif

**Plans**: 2/2 plans complete
**UI hint**: yes

**Wave 1**
- [x] 12-01-PLAN.md — Backend Domain Service, REST API, WebSocket, CLI Roster Import, and Test Suite

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 12-02-PLAN.md — Cashier UI Sub-components, High-Contrast Modal #42, Omni-Search, and Cashier Dashboard Integration

### Phase 13: Manual BTO Backend & Leaderboard

**Goal**: Waktu terbaik per peserta dapat diinput manual oleh panitia, menggantikan stopwatch/race engine lama sebagai sumber BTO.
**Depends on**: Phase 12
**Requirements**: BTO-01, BTO-02, BTO-03, BTO-04
**Success Criteria** (what must be TRUE):

  1. Panitia dapat menginput waktu terbaik per peserta (personal-best) secara manual
  2. Input baru menggantikan waktu lama hanya bila lebih cepat
  3. Leaderboard BTO top-N tampil realtime
  4. Deteksi rekor baru + selebrasi berjalan saat waktu tercepat dikalahkan

**Plans**: TBD
**UI hint**: yes

### Phase 14: Winner Registration & Bracket Execution

**Goal**: Panitia mendaftarkan pemenang Babak 2 cukup dengan nomor peserta (nama ter-resolve otomatis) dan mengeksekusi heat 3-jalur dengan pilih pemenang manual + auto-advance, tanpa lock/start/countdown.
**Depends on**: Phase 13
**Requirements**: WREG-01, WREG-02, WREG-03, WREG-04, WREG-05, WREG-06, BRKT-01, BRKT-02, BRKT-03
**Success Criteria** (what must be TRUE):

  1. Panitia input nomor peserta → app menampilkan nama untuk konfirmasi pendaftaran ke Babak 2
  2. App menolak nomor tak dikenal dan mencegah pendaftaran ganda peserta yang sama
  3. Pemenang otomatis menempati slot Babak 2 (A→B→C, heat baru bila penuh); undo pendaftaran terakhir tersedia
  4. Panitia pilih pemenang heat manual → auto-advance ke babak berikutnya tanpa lock/start/countdown
  5. Navigasi/filter babak + pencarian peserta bracket berfungsi

**Plans**: TBD
**UI hint**: yes

### Phase 15: State Contract Switch & Backend Decoupling/Removal

**Goal**: Backend berhenti bergantung pada kupon/tiket/race engine: kontrak state baru (participants/bracket/BTO) disiarkan realtime, query coupon JOIN dibersihkan, lalu modul lama dihapus.
**Depends on**: Phase 14
**Requirements**: MIG-03, MON-05, REM-02
**Success Criteria** (what must be TRUE):

  1. Server boot tanpa `ticketEngine.js`/race engine/modul kupon — tanpa crash circular import; `/api/state` mengembalikan 200
  2. `getFullState()` mengirim `participants[]`, `bracketMatches[]`, `btoLeaderboard[]`, `settings`; tanpa `ticketStats`/`activeRace`/`scrutineerQueue`
  3. Sinkronisasi realtime via WebSocket (`STATE_UPDATE` + event `participant_registered`, `bto_updated`) berjalan
  4. Semua query yang sebelumnya JOIN kupon berjalan tanpa tabel kupon

**Plans**: TBD

### Phase 16: Frontend Rewrite & Monitoring Screens

**Goal**: Race Director dan TV Sirkuit menampilkan peserta Babak 2 + BTO dari kontrak state baru; seluruh layar/rute scanning lama dihapus.
**Depends on**: Phase 15
**Requirements**: MON-01, MON-02, MON-03, MON-04, REM-01
**Success Criteria** (what must be TRUE):

  1. Race Director dapat memantau daftar peserta Babak 2 + status heat
  2. Race Director dapat memantau/mengelola BTO
  3. TV Sirkuit menampilkan bracket/peserta Babak 2 dan leaderboard BTO
  4. Layar Marshal, Scrutineer, Peserta HP, QR stencil beserta rute/nav-nya dihapus; tidak ada link mati dan bookmark lama dialihkan

**Plans**: TBD
**UI hint**: yes

### Phase 17: Destructive Cleanup, Tests & Seed

**Goal**: Tabel kupon/race lama di-drop secara terkendali setelah arsip & verifikasi; dependency scanner dipangkas; test suite & seed tetap hijau tanpa tabel kupon.
**Depends on**: Phase 16
**Requirements**: MIG-04, REM-03, REM-04
**Success Criteria** (what must be TRUE):

  1. Drop tabel kupon/race lama hanya berjalan setelah arsip DB + verifikasi, digerbangi flag env (default: tahan)
  2. Dependency scanner (`html5-qrcode`, `qrcode.react`, `tailwind-merge`) hilang dari package.json & build
  3. Test suite hijau tanpa tabel kupon; seed/demo boot dengan `SEED_DEMO_DATA=true`
  4. Dokumentasi (PROJECT.md, SRS, README) tidak lagi menyebut scanning/kupon sebagai alur aktif

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13 → 14 → 15 → 16 → 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 11. Event & Schema Migration Foundation | v3.0 | 3/3 | Complete    | 2026-09-17 |
| 12. Participant Registration & Auto-Numbering | v3.0 | 2/2 | Complete    | 2026-09-17 |
| 13. Manual BTO Backend & Leaderboard | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 14. Winner Registration & Bracket Execution | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 15. State Contract Switch & Backend Decoupling/Removal | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 16. Frontend Rewrite & Monitoring Screens | v3.0 | 1/1 | Complete    | 2026-09-17 |
| 17. Destructive Cleanup, Tests & Seed | v3.0 | 1/1 | Complete    | 2026-09-17 |
