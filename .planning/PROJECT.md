# NEO-TAMIYA Racing System

## What This Is

Sistem manajemen turnamen balap Tamiya Mini 4WD berbasis 100% web, mandiri (*standalone*), berkinerja tinggi, dan bebas scanning: registrasi peserta bernomor, pendaftaran pemenang Babak 2 berdasarkan nomor kupon fisik, manajemen bracket eliminasi 3-jalur, kontrol pusat Race Director, siaran HUD real-time ke layar TV sirkuit, dukungan dual database (PostgreSQL & SQLite WASM), serta scaling horizontal Redis. Seluruh alur Babak 1, verifikasi fisik, dan kupon berjalan manual di lapangan tanpa pemindaian.

## Core Value

Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, mandiri tanpa ketergantungan cloud/sheets eksternal, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.

## Business Context

- **Customer**: Penyelenggara turnamen Tamiya, sirkuit/toko hobi Mini 4WD se-Indonesia.
- **Revenue model**: SaaS berlangganan untuk sirkuit/penyelenggara turnamen atau lisensi per-event.
- **Success metric**: 100% pergantian race tanpa jeda manual dan nol kesalahan pencatatan waktu/kupon.
- **Strategy notes**: Mengacu pada `tamiya-developer-handover-srs.md` dan `tamiya-web-app-blueprint-v20.md`.

## Requirements

### Validated

- ✓ Arsitektur 100% Web App (Vite React + Express Socket.IO + SQLite WASM) — baseline
- ✓ Dual-Track Registration (Pendaftaran mandiri + Registrasi manual kasir tamu/anak) — baseline
- ✓ Top-up saldo kupon kualifikasi & sinkronisasi real-time — baseline
- ✓ Scan QR jalur (LINE A, B, C) via kamera HP & stensil meja pit — baseline
- ✓ Pencegahan Race Condition dengan database lock & pergeseran halus antrean — baseline
- ✓ Tombol jempol raksasa "SIAP BALAP" & "BATAL" (refund kupon otomatis) — baseline
- ✓ Pusat Komando Race Director (Kunci Balapan & debit kupon, input waktu Skenario B) — baseline
- ✓ Meja Scrutineer model tablet "Tanya Nama" (LOLOS / DQ) — baseline
- ✓ Validasi rekor Best Time Overall (BTO) & animasi confetti emas — baseline
- ✓ Babak 2 Single Elimination Bracket & auto-placement pemenang tanpa kupon/QR — baseline
- ✓ Hitung mundur suara manusia 10 s.d. 1 bahasa Indonesia + haptic HP — baseline
- ✓ Layar TV Sirkuit HUD 16:9 real-time + running text antrean race — baseline
- ✓ **EXCP-01**: Tombol "SEMUA CO / DNF (No Winner)" menutup race tanpa pemenang, kupon tetap terpotong — Shipped in v1.0
- ✓ **EXCP-02**: "DEKLARASI RE-RACE" modal checklist jalur, permit gratis, zero rescan — Shipped in v1.0
- ✓ **SCRUT-01**: Active Alert Lapis 2 (banner kuning berkedip) di tablet Scrutineer saat race locked — Shipped in v1.0
- ✓ **SCRUT-02**: Tombol darurat "Ambil Alih Hasil (Override)" Lapis 3 di tablet Scrutineer — Shipped in v1.0
- ✓ **UI-01**: Layout input finish time horizontal 3-kolom di Dasbor Race Director (`RaceDirectorDashboard.jsx`) sejajar jalur A, B, C — Shipped in v1.1
- ✓ **UI-02**: Efek visual pendar emas dinamis (*cyber shimmer border*) pada pemegang rekor BTO #1 dan kartu pemenang — Shipped in v1.1
- ✓ **UI-03**: Overlay visual hitungan mundur raksasa dramatis di layar TV Sirkuit 16:9 (`RealtimeTV.jsx`) sinkron dengan audio & GO — Shipped in v1.1
- ✓ **ELIM-01**: Skema data & backend logic eliminasi 3-jalur (Jalur A, B, C) dengan auto-advance pemenang antar ronde — Shipped in v1.2
- ✓ **ELIM-02**: Antarmuka Dasbor Eliminasi Berjenjang multi-babak (Babak 2, 3, dst.) dengan heat card 3-pembalap dan filter navigasi — Shipped in v1.2
- ✓ **ELIM-03**: Integrasi Race Director & Layar TV Sirkuit untuk eksekusi heat babak eliminasi real-time — Shipped in v1.2
- ✓ **CPN-01**: Kasir daftarkan peserta & kaitkan nomor seri lembar kupon fisik pre-printed (50 kotak) — Shipped in v2.0
- ✓ **CPN-02**: Form pendaftaran kilat dengan validasi unik nomor seri anti-duplikasi — Shipped in v2.0
- ✓ **CPN-03**: Pencarian data paket kupon & pelacakan sisa kuota via nama atau pemindaian serial — Shipped in v2.0
- ✓ **MRSH-01**: Antarmuka khusus Start Box (`/marshal`) dioptimalkan tablet dengan touch target 64px+ — Shipped in v2.0
- ✓ **MRSH-02**: Pengisian kilat 3 kontestan Jalur A/B/C via pencarian instan / scan barcode — Shipped in v2.0
- ✓ **MRSH-03**: Dasbor Marshal menampilkan instruksi nomor kupon dicoret & debit atomic — Shipped in v2.0
- ✓ **MRSH-04**: Status mobil di Start Box tersinkronisasi real-time via WebSocket ke Race Director — Shipped in v2.0
- ✓ **TKET-01**: Mobil FINISH otomatis menerbitkan tiket Babak Berikutnya (`next_round_tickets`) — Shipped in v2.0
- ✓ **TKET-02**: Pemenang tiket otomatis ditempatkan ke slot kosong Babak 2 bracket 3-jalur — Shipped in v2.0
- ✓ **TKET-03**: Mobil Klontang/CO menghanguskan kupon tanpa menerbitkan tiket babak berikutnya — Shipped in v2.0
- ✓ **TV-HUD-01**: Layar TV Sirkuit 16:9 (`/tv`) menampilkan running ticker real-time tiket Babak Berikutnya — Shipped in v2.0
- ✓ **TV-HUD-02**: Layar TV Sirkuit menampilkan total sisa kuota tiket Babak 2 yang diperebutkan — Shipped in v2.0
- ✓ **EVNT-01..04**: Manajemen multi-event dan isolasi data per event aktif — Shipped in v3.0
- ✓ **PARN-01..05**: Registrasi peserta bernomor urut (#1, #2..) & impor CSV — Shipped in v3.0
- ✓ **BTO-01..04**: Input manual BTO & personal-best replacement — Shipped in v3.0
- ✓ **WREG-01..06**: Registrasi pemenang Babak 2 via nomor & auto-slotting (A→B→C) — Shipped in v3.0
- ✓ **BRKT-01..03**: Eksekusi bracket eliminasi 3-jalur manual advance — Shipped in v3.0
- ✓ **MON-01..05**: TV sirkuit HUD & race director monitoring dari state v3.0 — Shipped in v3.0
- ✓ **AUTH-01..06, APPR-01..06**: Google OAuth 2.0 Sign-In, `tropicans@gmail.com` Super Admin auto-provisioning & immunity, Pending Approval Gate, Dasbor Manajemen Pengguna (`/admin`), RBAC middleware, dan public route bypass (`/tv`, `/bracket`) — Shipped in v3.2
- ✓ **SYNC-01..10**: Google Sheets Live Fetch, Idempotent Racer Deduplication, Sequential Numbering, Protected Endpoints, dan Tombol Sync di Kasir & Admin — Shipped in v3.3
- ✓ **FIX-01..04, SEC-01..04, ENH-01..04**: Client ID OAuth security, BTO memory leak fix, TV event title fix, public bracket read-only protection, backend RBAC middleware & auto-bearer injection, event setting isolation, dynamic round locking, emergency offline login, and multi-entry sync — Shipped in v3.4
- ✓ **STANDALONE-01..04**: Decoupled standalone system with local CSV/JSON import/export, preserved Google OAuth & offline fallback — Shipped in v4.0
- ✓ **PG-01..04**: Switchable dual database driver (`DB_DRIVER=postgres|sqlite`), PostgreSQL DDL schema, ACID transactions & health check — Shipped in v4.0
- ✓ **REDIS-01..03, RATELIM-01..03**: Redis Socket.IO adapter horizontal pub/sub scaling, auto-fallback, and API rate limiting middleware — Shipped in v4.0

### Active

*Planning next milestone.*

## Current State: v4.0 Shipped (2026-09-20)

Sistem telah bertransformasi menjadi arsitektur enterprise & standalone berkinerja tinggi:
1. **Decoupled Standalone Data Management**: Pelepasan total ketergantungan dari Google Sheets dengan modul Impor/Ekspor CSV & JSON lokal di Kasir (`/cashier`) dan Admin (`/admin`), sembari mempertahankan Google OAuth 2.0 & Emergency Offline Login.
2. **Dual Database Driver Abstraction**: Penggunaan abstraksi database switchable (`DB_DRIVER=postgres|sqlite`) yang mendukung PostgreSQL connection pool (`pg`) dan SQLite WASM fallback otomatis, dilengkapi skema DDL PostgreSQL lengkap (`server/schemas/postgres-schema.sql`), ACID transaction guard, dan database health check endpoint (`/api/health`).
3. **Redis Socket.IO Scaling & Rate Limiting**: Integrasi `@socket.io/redis-adapter` dan `ioredis` untuk pub/sub WebSocket real-time lintas multi-container node, auto-fallback ke in-memory socket adapter untuk venue offline, serta proteksi API Rate Limiting middleware (`authRateLimiter`, `apiRateLimiter`) dengan response HTTP 429 & header `RateLimit-*` standar.

### Out of Scope

- Integrasi sensor perangkat keras RFID/NFC fisik — *Desain sistem sengaja 100% paperless & zero-hardware untuk menekan biaya sirkuit*.
- Buzzer pelepas start otomatis di akhir countdown — *Pelepasan mobil diserahkan manual kepada Marshal di lapangan agar aman dan adil*.
- Smartphone scan mandiri oleh peserta saat antre race — *Dialihkan 100% ke operasional panitia (Marshal Start Box) agar alur antrean fisik tidak macet*.
- Direct Google Sheets Real-time Two-Way Sync — *Digantikan 100% oleh Local DB & CSV/JSON Import/Export mandiri untuk independensi total*.

## Context

- Beroperasi di jaringan tertutup sirkuit (LAN / Wi-Fi Hotspot) atau multi-container cloud cluster.
- WebSocket latensi rendah (<50ms) dengan dukungan Redis Pub/Sub scaling.
- Estetika Cyberpunk / Neo-Racing: Midnight Obsidian (`#0a0b10`), Neon Pink (`#ff0055`), Electric Cyan (`#00f0ff`), Acid Green (`#39ff14`).

## Constraints

- **Tech Stack**: Node.js ESM + Express, Socket.IO + Redis Adapter, PostgreSQL / sql.js (WASM SQLite) di backend; React 18, Vite, TailwindCSS di frontend.
- **UI/UX**: Keterbacaan kontras tinggi, tombol aksi mobile thumb-friendly (>30% tinggi layar).
- **Integritas Transaksi**: Saldo kupon tidak boleh terpotong ganda atau hilang saat re-race/batal valid, dilindungi transaksi ACID database.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web App QR Code pengganti RFID | Nol biaya alat, fleksibel tambah jalur hanya cetak kertas | ✓ Good |
| Skenario B (Input Waktu Semi-Manual) | Mencegah loophole mobil terlempar lewat garis sensor | ✓ Good |
| Sistem "Tanya Nama" di Meja Scrutineer | Menghilangkan kerumitan scan QR kedua kali di meja juri | ✓ Good |
| Suara Manusia Asli untuk Countdown | Meningkatkan ketegangan atmosfer sirkuit tanpa buzzer bising | ✓ Good |
| Kupon kualifikasi Semua CO/DNF | Hangus sesuai regulasi turnamen (slot balapan terpakai) | ✓ Shipped v1.0 |
| Re-Race Free Permit | Balap ulang tanpa potong saldo kupon baru & tanpa scan ulang | ✓ Shipped v1.0 |
| Scrutineer Emergency Override | Fail-safe Lapis 3 di meja juri untuk auto-placement bagan | ✓ Shipped v1.0 |
| Ergonomi 3-Kolom Stopwatch | Menyamai tata letak 3 stopwatch fisik di meja Race Director | ✓ Shipped v1.1 |
| Cyber Golden Shimmer BTO | Animasi pendar hangat untuk membedakan rekor puncak BTO #1 | ✓ Shipped v1.1 |
| Fullscreen Countdown HUD Overlay | Overlay 16:9 fixed z-50 sinkron WebSocket audio & selebrasi GO | ✓ Shipped v1.1 |
| Multi-Round 3-Lane Bracket Schema | Mendukung turnamen besar 100+ heat dengan `user_id_3` | ✓ Shipped v1.2 |
| Physical Coupon Sheet & Marshal-Driven Flow | Menghilangkan resistensi adopsi di lapangan & mempercepat antrean start box | ✓ Shipped v2.0 |
| Atomic Coupon Debit & 60s Undo Window | Menjamin integritas pemotongan kupon fisik dan toleransi salah klik panitia | ✓ Shipped v2.0 |
| Automatic Sequential Ticket Seeding | Menempatkan pemenang tiket Babak 2 secara adil dan otomatis tanpa manipulasi | ✓ Shipped v2.0 |
| Realtime Neon TV Ticker & Progress HUD | Memacu atmosfer kompetitif dan transparansi sisa tiket turnamen | ✓ Shipped v2.0 |
| Decoupled Standalone Rest Data Transfer | Melepaskan 100% ketergantungan dari Google Sheets dengan REST import/export CSV/JSON lokal | ✓ Shipped v4.0 |
| Dual-Database Driver Abstraction | Mendukung DB_DRIVER=postgres\|sqlite dengan WASM SQLite fallback saat Postgres tidak dikonfigurasi | ✓ Shipped v4.0 |
| Redis Socket Adapter & API Rate Limiting | Horizontal WebSocket scaling & sliding-window IP rate limiting untuk proteksi DDoS | ✓ Shipped v4.0 |

## Shipped Milestones

- **v4.0**: Postgres DB Driver + Redis Socket Adapter & API Rate Limiting (Standalone Decoupled) (Shipped 2026-09-20) — [Archive](milestones/v4.0-ROADMAP.md)
- **v3.4**: System Hardening, Security & Operational Reliability (Shipped 2026-09-20) — [Archive](milestones/v3.4-ROADMAP.md)
- **v3.3**: Google Sheets Racer Sync & Admin Integration (Shipped 2026-09-18) — [Archive](milestones/v3.3-ROADMAP.md)
- **v3.2**: Google OAuth Authentication & Admin Approval System (Shipped 2026-09-18) — [Archive](milestones/v3.2-ROADMAP.md)
- **v3.1**: Race Director Elimination Command Center (Shipped 2026-09-18) — [Archive](milestones/v3.1-ROADMAP.md)
- **v3.0**: Alur Balap Fisik Tanpa Scan Kupon (Shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)
- **v2.0**: Physical Coupon & Marshal-Driven Tournament System (Shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- **v1.2**: Multi-Round 3-Lane Elimination System (Shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- **v1.1**: UI/UX & Arena Visual Showcase Polish (Shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- **v1.0**: Full SRS & Blueprint Compliance (Shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-09-20 after v4.0 milestone*
