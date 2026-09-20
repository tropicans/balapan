# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Physical Coupon & Marshal-Driven Tournament System

**Shipped:** 2026-09-04  
**Phases:** 4 | **Plans:** 8 | **Requirements:** 12/12  

### What Was Built
- Registrasi paket kupon fisik pre-printed 50 kotak di Kasir (`/cashier`) dengan pencegahan nomor seri ganda.
- Dasbor tablet khusus Marshal Start Box (`/marshal`) dengan tombol sentuh jempol raksasa (64px+), line-up kilat Jalur A/B/C, instruksi coret kupon fisik atomic, dan 60s undo window.
- Finish-to-Next-Round Ticket Engine otomatis menerbitkan tiket Babak 2 (`TKT-B2-XXX`) saat mobil FINISH dan menempatkannya ke bracket 3-jalur (serta hangus kupon tanpa tiket saat Klontang/CO).
- Layar TV Sirkuit 16:9 (`/tv`) running ticker real-time dan circular gauge sisa kuota tiket arena.

### What Worked
- Model operasional panitia-sentris (Kasir + Marshal + Race Director) mengeliminasi kebutuhan peserta membuka HP saat antre di pit/start, melipatgandakan kecepatan line-up.
- Automated sequential auto-seeding ke bracket multi-round v1.2 tanpa merombak arsitektur eliminasi yang telah terbukti di v1.2.
- Testing integrasi menyeluruh (`e2e-tournament-lifecycle.test.js`) memvalidasi seluruh rantai pendaftaran $\rightarrow$ race $\rightarrow$ tiket $\rightarrow$ bracket $\rightarrow$ TV HUD.

### What Was Inefficient
- Kamera pemindaian barcode pada smartphone memerlukan izin dan penyesuaian library HTML5 QR code scanner yang sempat memerlukan quick fix.

### Patterns Established
- Atomic debit kupon dengan window undo 60 detik sebagai pola standar transaksi panitia lapangan.
- Web Audio Chime sintetis tanpa dependensi file audio eksternal untuk feedback instan di tablet Marshal.
- Event broadcasting terpadu `TICKET_ISSUED` via WebSocket untuk multi-screen sync (TV, RD, Marshal, Kasir).

### Key Lessons
1. Mengintegrasikan artefak fisik (kupon kertas pre-printed) dengan sistem digital memberikan adopsi 10x lebih cepat dibanding memaksa 100% paperless murni di komunitas balap lokal.
2. Touch target minimum 60-64px sangat krusial untuk perangkat tablet/smartphone panitia di area sirkuit yang bergerak cepat.

## Milestone: v3.4 — System Hardening, Security & Operational Reliability

**Shipped:** 2026-09-20  
**Phases:** 3 | **Plans:** 3 | **Requirements:** 12/12  

### What Was Built
- Pembersihan kredensial OAuth (penghapusan client secret dari bundle), perbaikan memory leak Socket.IO pada BTO Manager, dan koreksi display judul event aktif di TV sirkuit.
- Proteksi read-only pada rute publik `/bracket`, menyembunyikan tombol jury `MENANG` dan tab pendaftaran pemenang dari viewer tak terotentikasi.
- Middleware RBAC backend (`requireApproved`, `requireRole`) pada seluruh endpoint mutasi, dengan otomatisasi penyertaan Bearer token via `fetchWithAuth` di client.
- Dynamic round-lock validation untuk semua ronde eliminasi, isolasi reset status kunci saat pergantian event aktif, dan mode darurat login offline di `LoginScreen.jsx`.
- Dukungan registrasi multi-entry pembalap pada Google Sheet Sync modal dan backend.

### What Worked
- Arsitektur middleware bertingkat (`requireAuth` $\rightarrow$ `requireApproved` $\rightarrow$ `requireRole`) memberikan keamanan menyeluruh tanpa mengganggu endpoint read publik.
- Dukungan mock token deterministik pada test runner (`mock-token:*`, `mock-google-token:*`) memungkinkan pengujian otomatis cepat (31 test suites) tanpa dependensi jaringan internet luar.
- Verifikasi multi-source (Traceability, VERIFICATION, SUMMARY) menjamin konsistensi audit 100%.

### Key Lessons
1. Fitur venue offline darurat sangat esensial untuk turnamen fisik karena sirkuit sering kali berada di basement mall atau area dengan penetrasi sinyal seluler/Wi-Fi yang tidak stabil.
2. Endpoint publik seperti `/bracket` dan `/tv` harus selalu dirancang aman secara read-only sejak awal, bukan hanya disembunyikan navigasinya.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Requirements | Key Focus |
|-----------|--------|-------|--------------|-----------|
| v1.0 | 2 | 2 | 4 | Full SRS & Blueprint Compliance (SEMUA CO, RE-RACE, Scrutineer) |
| v1.1 | 2 | 2 | 3 | UI/UX & Arena Visual Showcase (Stopwatch 3-kolom, BTO Shimmer, TV Countdown) |
| v1.2 | 2 | 2 | 3 | Multi-Round 3-Lane Elimination System (Auto-advance bracket & dashboard) |
| v2.0 | 4 | 8 | 12 | Physical Coupon & Marshal-Driven Tournament System (Cashier, Marshal, Ticket Engine, TV HUD) |
| v3.0 | 7 | 10 | 26 | Alur Balap Fisik Tanpa Scan Kupon (Multi-Event, Nomor Urut, BTO Manual, Winner Reg) |
| v3.1 | 2 | 2 | 6 | Race Director Elimination Command Center (Babak 2 Auto-Advance, RD UI) |
| v3.2 | 4 | 4 | 12 | Google OAuth & Admin Approval System (GIS Auth, RBAC Middleware, User Mgmt) |
| v3.3 | 2 | 2 | 10 | Google Sheets Racer Sync & Admin Integration (Idempotent Sync, Admin & Cashier UI) |
| v3.4 | 3 | 3 | 12 | System Hardening, Security & Operational Reliability (RBAC Hardening, Event Reset, Offline Mode) |

### Cumulative Quality

| Milestone | Test Suites | Tests Passed | Build Status |
|-----------|-------------|--------------|--------------|
| v1.0 | 5 | 18 | Clean |
| v1.1 | 5 | 18 | Clean |
| v1.2 | 6 | 21 | Clean |
| v2.0 | 6 | 35 | Clean |
| v3.0 | 17 | 100% | Clean |
| v3.1 | 19 | 100% | Clean |
| v3.2 | 20 | 100% | Clean |
| v3.3 | 21 | 100% | Clean |
| v3.4 | 31 | 100% | Clean |

### Top Lessons (Verified Across Milestones)

1. Zero-external-hardware (memaksimalkan web & audio sintetis) menghemat jutaan rupiah biaya turnamen Mini 4WD.
2. Sinkronisasi WebSocket real-time terbukti andal mengelola puluhan heat dan multi-screen tanpa latency lag.
3. Arsitektur modular services mempermudah ekspansi fitur (seperti background cron scheduler dan Google Sheet sync) tanpa regresi pada core race engine.

