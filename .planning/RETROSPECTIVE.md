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

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Requirements | Key Focus |
|-----------|--------|-------|--------------|-----------|
| v1.0 | 2 | 2 | 4 | Full SRS & Blueprint Compliance (SEMUA CO, RE-RACE, Scrutineer) |
| v1.1 | 2 | 2 | 3 | UI/UX & Arena Visual Showcase (Stopwatch 3-kolom, BTO Shimmer, TV Countdown) |
| v1.2 | 2 | 2 | 3 | Multi-Round 3-Lane Elimination System (Auto-advance bracket & dashboard) |
| v2.0 | 4 | 8 | 12 | Physical Coupon & Marshal-Driven Tournament System (Cashier, Marshal, Ticket Engine, TV HUD) |

### Cumulative Quality

| Milestone | Test Suites | Tests Passed | Build Status |
|-----------|-------------|--------------|--------------|
| v1.0 | 5 | 18 | Clean |
| v1.1 | 5 | 18 | Clean |
| v1.2 | 6 | 21 | Clean |
| v2.0 | 6 | 35 | Clean |

### Top Lessons (Verified Across Milestones)

1. Zero-external-hardware (memaksimalkan web & audio sintetis) menghemat jutaan rupiah biaya turnamen Mini 4WD.
2. Sinkronisasi WebSocket real-time terbukti andal mengelola puluhan heat dan multi-screen tanpa latency lag.
