# Project Milestones

## v3.4 System Hardening, Security & Operational Reliability (Shipped: 2026-09-20)

**Phases completed:** 3 phases, 3 plans, 0 tasks

**Key accomplishments:**

- Completed
- Completed

---

## v3.4: System Hardening, Security & Operational Reliability

- **Shipped:** 2026-09-18
- **Phases:** 3 (Phases 26-28)
- **Plans:** 3
- **Requirements Satisfied:** 12/12 (`FIX-01`..`04`, `SEC-01`..`04`, `ENH-01`..`04`)
- **Key Accomplishments:**
  - Penambalan celah keamanan kredensial `.env` Google OAuth (sanitasi secret), perbaikan socket listener leak `BtoManager`, perbaikan nama event TV HUD, dan integrasi test runner CI.
  - Pengamanan layar publik `/bracket` menjadi mode read-only untuk penonton (tombol mutasi & form registrasi disembunyikan).
  - Penegakan middleware RBAC ketat (`requireRole`, `requireApproved`) di seluruh endpoint backend (`/api/events`, `/api/participants`, `/api/bto`, `/api/winners`, `/api/bracket`).
  - Implementasi fetch helper terpusat (`fetchWithAuth`) yang menyuntikkan token Bearer secara otomatis pada seluruh mutasi frontend.
  - Filtering dinamis menu navigasi di `Navbar.jsx` serta proteksi pembatasan rute di `App.jsx` berbasis role pengguna.
  - Reset otomatis status kunci dinamis (`qualifying_status`, `round*_status`) saat pergantian event aktif agar status tidak bocor antar turnamen.
  - Generalisasi pengecekan round-lock di `advanceBracketWinner` dan `resetBracketMatch` untuk seluruh babak bertingkat (`round_number >= 2`).
  - Penyediaan tombol akses darurat offline lokal di `LoginScreen.jsx` untuk menjamin operasional turnamen tanpa koneksi internet stadion.
  - Opsi Multi-Entry pada sinkronisasi Google Sheets untuk mendukung pembalap dengan banyak pendaftaran mobil.
- **Verification:** 23/23 test suites passing (100% green), Vite client build clean (0 errors), Docker auto-rebuild verified.
- **Audit Report:** [.planning/v3.4-MILESTONE-AUDIT.md](.planning/v3.4-MILESTONE-AUDIT.md)

---

## v3.3: Google Sheets Racer Sync & Admin Integration

- **Shipped:** 2026-09-18
- **Phases:** 2 (Phases 24-25)
- **Plans:** 2
- **Requirements Satisfied:** 10/10 (`SYNC-01`..`10`)
- **Key Accomplishments:**
  - Service backend live fetch & URL normalizer yang otomatis mengonversi link Google Sheets ke format export CSV (dengan deteksi tab `gid`).
  - Logika sinkronisasi idempotent (anti-duplikat pembalap aktif) dan penomoran otomatis berurutan atomik (`MAX + 1`).
  - Endpoint REST `/api/participants/sync-sheet` dan `/api/participants/sync-sheet/status` diproteksi role panitia (`cashier`/`admin`).
  - Komponen modal interaktif `GoogleSheetSyncModal.jsx` dengan umpan balik visual instan (jumlah baru vs dilewati, detail pembalap).
  - Tombol "SYNC GOOGLE SHEET" terpasang di header Dasbor Kasir (`/cashier`) dan Panel Manajemen Admin (`/admin`).
  - Broadcast real-time Socket.IO `participants_imported` dan `STATE_UPDATE` yang memicu pembaruan otomatis di seluruh layar tanpa refresh manual.
- **Verification:** 20/20 test suites passing (100% green), Vite client build clean (0 errors), Docker auto-rebuild verified.
- **Roadmap Archive:** [milestones/v3.3-ROADMAP.md](milestones/v3.3-ROADMAP.md)
- **Requirements Archive:** [milestones/v3.3-REQUIREMENTS.md](milestones/v3.3-REQUIREMENTS.md)
- **Audit Report:** [milestones/v3.3-MILESTONE-AUDIT.md](milestones/v3.3-MILESTONE-AUDIT.md)

---

## v3.2: Google OAuth Authentication & Admin Approval System

- **Shipped:** 2026-09-18
- **Phases:** 4 (Phases 20-23)
- **Plans:** 4
- **Requirements Satisfied:** 12/12 (`AUTH-01`..`06`, `APPR-01`..`06`)
- **Key Accomplishments:**
  - Login resmi Google OAuth 2.0 / Google Identity Services (GIS) terintegrasi pada frontend dan backend.
  - Penugasan otomatis akun `tropicans@gmail.com` sebagai Super Admin dengan status approved dan kekebalan sistem (Immunity).
  - Alur persetujuan (approval gate) untuk seluruh pengguna Google baru dengan penahan layar "Menunggu Persetujuan Admin".
  - Dasbor Manajemen Pengguna (`/admin`) dengan metrik KPI real-time, filter pencarian, dan modal penetapan peran (`cashier`, `race_director`, `scrutineer`, `admin`, `viewer`).
  - Penangguhan/pencabutan akses seketika (suspend) dengan pemutusan sesi token aktif.
  - Akses bebas tanpa login untuk layar publik penonton (`/tv` Layar TV Sirkuit dan `/bracket` Bagan Turnamen).
  - Sinkronisasi real-time via Socket.IO antara aksi approval Super Admin dan layar operator.
- **Verification:** 19/19 test suites passing (100% green), Vite production build clean (0 errors).
- **Roadmap Archive:** [milestones/v3.2-ROADMAP.md](milestones/v3.2-ROADMAP.md)
- **Requirements Archive:** [milestones/v3.2-REQUIREMENTS.md](milestones/v3.2-REQUIREMENTS.md)
- **Audit Report:** [milestones/v3.2-MILESTONE-AUDIT.md](milestones/v3.2-MILESTONE-AUDIT.md)

---

## v3.1: Race Director Elimination Command Center

- **Shipped:** 2026-09-18
- **Phases:** 2 (Phases 18-19)
- **Plans:** 2
- **Requirements Satisfied:** 5/5 (`RDELIM-01`..`05`)
- **Key Accomplishments:**
  - Kontrol Eliminasi Terpadu di `/director` menggantikan digital race control lama dengan panel eliminasi Babak 2 ke atas.
  - Penandaan pemenang 1-klik di heat Babak 2+ dengan mahkota visual instan dan kemajuan otomatis ke babak berikutnya.
  - Progress bar status heat selesai vs pending secara reaktif.
  - Mekanisme "Finalisasi / Kunci Babak 2" saat seluruh heat Babak 2 selesai untuk mengamankan bagan babak berikutnya.
  - Sinkronisasi real-time via WebSocket ke `/director`, `/tv`, dan `/bracket`.
- **Verification:** 17/17 test suites passing, Vite production build clean (0 errors).
- **Roadmap Archive:** [milestones/v3.1-ROADMAP.md](milestones/v3.1-ROADMAP.md)
- **Requirements Archive:** [milestones/v3.1-REQUIREMENTS.md](milestones/v3.1-REQUIREMENTS.md)

---

## v3.0: Alur Balap Fisik Tanpa Scan Kupon

- **Shipped:** 2026-09-17
- **Phases:** 7 (Phases 11-17)
- **Plans:** 10
- **Requirements Satisfied:** 35/35 (`EVNT-01`..`04`, `PARN-01`..`05`, `WREG-01`..`06`, `BRKT-01`..`03`, `BTO-01`..`04`, `MON-01`..`05`, `REM-01`..`04`, `MIG-01`..`04`)
- **Key Accomplishments:**
  - Alur turnamen bebas scanning barcode/QR dengan nomor urut peserta (#1, #2...) otomatis per event.
  - Sistem pencatatan personal-best BTO (Best Time Overall) manual dengan leaderboard real-time.
  - Registrasi pemenang Babak 2 kilat (nomor ke nama) dengan penempatan otomatis slot 3-jalur (A->B->C).
  - Isolasi data turnamen multi-event dan penghapusan aman modul scanning lama.
- **Verification:** 13/13 test suites passing, Vite production build clean.
- **Roadmap Archive:** [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- **Audit Report:** [v3.0-MILESTONE-AUDIT.md](v3.0-MILESTONE-AUDIT.md)

---

## v2.0: Physical Coupon & Marshal-Driven Tournament System

- **Shipped:** 2026-09-04
- **Phases:** 4 (Phases 07-10)
- **Plans:** 8
- **Requirements Satisfied:** 12/12 (`CPN-01`..`03`, `MRSH-01`..`04`, `TKET-01`..`03`, `TV-HUD-01`..`02`)
- **Key Accomplishments:**
  - Registrasi paket kupon fisik pre-printed (50 kotak) di Kasir (`/cashier`) dengan validasi nomor seri unik anti-duplikasi, pelacakan sisa kuota, dan pemindaian barcode cepat.
  - Dasbor khusus Marshal Start Box (`/marshal`) tablet-friendly dengan touch target 64px+, pengisian kilat Jalur A (Pink), B (Cyan), C (Green), prompt instruksi coret kupon fisik atomic, sinkronisasi WebSocket ke Race Director, dan window undo 60 detik.
  - Finish-to-Next-Round Ticket Engine otomatis menerbitkan tiket Babak 2 (`TKT-B2-XXX`) saat mobil FINISH dan menempatkannya ke slot kosong bracket eliminasi 3-jalur (dan hangus kupon tanpa tiket jika Klontang/CO).
  - Layar TV Sirkuit 16:9 (`/tv`) dilengkapi running ticker siaran langsung pembalap peraih tiket Babak 2 dan neon progress widget pemantau sisa kuota tiket arena.
  - Integrasi quick task perbaikan pemindaian barcode kamera smartphone (`260904-smartphone-camera-scanner-fix`).
- **Verification:** 35/35 tests passing (6 suites), Vite production build clean (0 errors).
- **Roadmap Archive:** [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- **Requirements Archive:** [milestones/v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)
- **Audit Report:** [milestones/v2.0-MILESTONE-AUDIT.md](milestones/v2.0-MILESTONE-AUDIT.md)

---

## v1.2: Multi-Round 3-Lane Elimination System

- **Shipped:** 2026-09-03
- **Phases:** 2 (Phases 5-6)
- **Plans:** 2
- **Requirements Satisfied:** 3/3 (`ELIM-01`, `ELIM-02`, `ELIM-03`)
- **Key Accomplishments:**
  - Multi-Round 3-Lane Bracket schema with `user_id_3` support in matches table and auto-advance promotion engine.
  - Multi-round hierarchical elimination dashboard UI (`EliminationDashboard.jsx`) with dynamic round switching, 3-lane heat cards, search filter, and instant advancement indicators.
  - Real-time Race Director & TV Circuit HUD integration for seamless multi-round elimination heats.
- **Verification:** 13/13 test suites passed, Vite production build clean.
- **Roadmap Archive:** [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- **Requirements Archive:** [milestones/v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md)

---

## v1.1: UI/UX & Arena Visual Showcase Polish

- **Shipped:** 2026-09-03
- **Phases:** 2 (Phases 3-4)
- **Plans:** 2
- **Requirements Satisfied:** 3/3 (`UI-01`, `UI-02`, `UI-03`)
- **Key Accomplishments:**
  - Reorganized Race Director finish time input into 3-column horizontal grid aligned with track lanes (Pink Lane A, Cyan Lane B, Green Lane C) with driver and team tags.
  - Added golden cyber shimmer border (`.gold-shimmer-border`) with breathing pulse animation for Best Time Overall (BTO #1) on Realtime TV HUD and participant Round 2 ticket cards.
  - Implemented 16:9 fullscreen dynamic countdown HUD overlay on Realtime TV featuring giant pulsing digits, CRT scanlines, 10-segment cyber LED bar, Indonesian voice text (`SEPULUH`, etc.), and explosive "GO! LEPAS MOBIL!" celebration banner.
- **Verification:** 12/12 test suites passed, Vite production build clean (0 errors).
- **Roadmap Archive:** [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- **Requirements Archive:** [milestones/v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0: Full SRS & Blueprint Compliance

- **Shipped:** 2026-09-03
- **Phases:** 2 (Phases 1-2)
- **Plans:** 2
- **Requirements Satisfied:** 4/4 (`EXCP-01`, `EXCP-02`, `SCRUT-01`, `SCRUT-02`)
- **Key Accomplishments:**
  - Implemented "SEMUA CO / DNF (No Winner)" emergency handling with coupon integrity retention.
  - Implemented "DEKLARASI RE-RACE" free permit modal with lane checklist and zero redundant QR scans.
  - Implemented Scrutineer Active Alert Lapis 2 banner indicator for locked races.
  - Implemented Scrutineer Emergency Override Lapis 3 with instant bracket auto-placement.
- **Verification:** 12/12 test suites passed, Vite production build clean.
- **Roadmap Archive:** [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- **Requirements Archive:** [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
