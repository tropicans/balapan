# Phase 10: Realtime Circuit TV Ticket HUD Showcase & Polish - Research

**Researched:** 2026-09-04  
**Domain:** Realtime Circuit TV HUD, 16:9 Broadcast Overlay, Running Ticker Animation, Ticket Quota Telemetry, Operational Tournament Navigation, End-to-End Lifecycle Integration Testing  
**Confidence:** HIGH  

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Format & Penempatan Ticker Tiket di Layar TV (/tv)
- **D-01:** Hybrid Ticker + Pop-up Showcase — Running ticker horizontal di footer Layar TV (`RealtimeTV.jsx`) terus berputar menampilkan urutan pemegang tiket Babak 2. Ketika ada tiket baru yang terbit (`ticket:granted` socket event), muncul flash pop-up overlay modal/banner animasi Cyberpunk emas "NEW QUALIFIER!" selama 6–8 detik di layar TV, kemudian menutup otomatis dan masuk ke antrean running ticker.

#### Visualisasi Kuota Tiket Babak 2 & Status Kualifikasi
- **D-02:** Neon Progress Bar & Badge Kuota di Header TV — Menampilkan status kuota tiket Babak 2 (misal "24/32 TIKET TERISI • SISA 8"), dengan efek denyut merah (pulsing red alert) jika sisa tiket kritis (<= 4 tiket tersisa).
- **D-03:** Banner Status Kunci Kualifikasi — Saat Race Director mengunci kualifikasi (`POST /api/tickets/lock-qualifying` / socket `qualifying:locked`), TV menampilkan banner dramatis: "KUALIFIKASI RESMI DITUTUP - BRACKET BABAK 2 SIAP DIMULAI".

#### Navigasi & Operasional Kupon
- **D-04:** Kupon Sudah Dicetak Sebelumnya (Pre-Printed) — Lembar kupon fisik 50 kotak dicetak massal sebelum hari-H perlombaan (*pre-printed*), sehingga tidak memerlukan menu cetak kupon yang memakan tempat di navbar utama. Navbar difokuskan murni pada alur operasional perlombaan: Kasir Kupon (`/cashier`), Marshal Start Box (`/marshal`), Race Director (`/director`), Scrutineer (`/scrutineer`), TV Sirkuit (`/tv`), dan Babak Eliminasi (`/bracket`).

#### Audio & Efek Perayaan TV
- **D-05:** Synthetic Cyberpunk Victory Chime — Menggunakan Web Audio API bawaan (`playTicketChime` di `client/src/utils/audio.js`) tanpa ketergantungan file MP3/WAV eksternal, dipadukan dengan animasi Glitch Glow Neon Gold di TV saat peraih tiket baru diumumkan.

#### End-to-End Integration Testing
- **D-06:** Automated Full Tournament Lifecycle Test Suite — Membangun suite pengujian E2E integrasi (`server/tests/e2e-tournament-lifecycle.test.js`) yang memvalidasi rantai lengkap: Kasir aktifkan kupon pre-printed -> Marshal start box masukkan pembalap Jalur A/B/C dan debit nomor kotak -> RD/Timer selesaikan balapan -> Tiket Babak 2 terbit otomatis -> Winner ter-seed ke slot Round 2 bracket -> All-3-same-lane auto-advance (jika relevan) -> Kunci kualifikasi.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TV-HUD-01 | Layar TV Sirkuit (`RealtimeTV.jsx`) menyiarkan pemegang tiket Babak 2 secara live via running ticker horizontal di footer dan pop-up showcase perayaan emas saat tiket baru diterbitkan, lengkap dengan audio chime kemenangan. | Implementasi komponen `TicketTickerStrip` dan `QualifierShowcaseModal` pada `RealtimeTV.jsx` yang mendengarkan event socket `ticket:granted` dan memanggil `sound.playTicketChime()`. |
| TV-HUD-02 | Layar TV Sirkuit menampilkan widget kuota tiket Babak 2 (`X/Y TIKET TERISI • SISA Z`) dengan peringatan kritis jika sisa tiket <= 4, serta broadcast banner kualifikasi ditutup ketika babak kualifikasi dikunci. | Penyempurnaan Header HUD pada `RealtimeTV.jsx` dengan neon progress bar kuota dan banner peringatan penutupan kualifikasi berbasis state `ticketStats` dan socket `qualifying:locked`. |
| TV-NAV-01 | Navigasi `Navbar.jsx` dirampingkan untuk mencerminkan alur operasional sirkuit Tamiya nyata (Kasir Kupon, Marshal Start Box, Race Director, Scrutineer, TV Sirkuit, Babak Eliminasi). | Penataan ulang array `screens` di `Navbar.jsx` dan penyelarasan rute hash/path di `App.jsx`. |
| E2E-TEST-01 | Pengujian E2E integrasi alur turnamen lengkap (`server/tests/e2e-tournament-lifecycle.test.js`) memvalidasi dari aktivasi kupon kasir hingga kunci kualifikasi bracket babak eliminasi. | Suite pengujian Node.js mandiri tanpa mock eksternal yang mengeksekusi lifecycle lengkap via HTTP & database transactions. |
</phase_requirements>

## Summary

Phase 10 adalah puncak visual dan jaminan kualitas (*showcase & polish*) dari sistem turnamen NEO-TAMIYA Racing System. Seluruh fondasi backend yang kokoh dari Phase 07 (Kupon Fisik 50 Kotak), Phase 08 (Meja Finish & Marshal Workflow), dan Phase 09 (Ticket Engine & Multi-Round Bracket) kini dihubungkan secara mulus ke Layar TV Sirkuit 16:9 (`RealtimeTV.jsx`) untuk memberikan pengalaman menonton yang menggelegar di area sirkuit dan pit stop.

Komponen utama yang dibangun:
1. **Footer Running Ticker (`TicketTickerStrip`)**:
   - Menampilkan daftar tiket Babak 2 (`#1 TKT-B2-001 BUDI SANTOSO [GTR]`, `#2 TKT-B2-002 ANDI PRATAMA [RRT]`) dengan infinite CSS marquee scroll yang halus.
   - Penanganan empty state: "BELUM ADA PEMEGANG TIKET BABAK 2 • KUALIFIKASI SEDANG BERLANGSUNG".
2. **New Qualifier Holographic Showcase Modal (`QualifierShowcaseModal`)**:
   - Overlay cyberpunk neon gold yang memukau saat event `ticket:granted` tiba.
   - Menampilkan nama pembalap, nama tim, nomor tiket `#X`, dan jalur kemenangan.
   - Memutar synthesizer audio chime kemenangan (`playTicketChime`) dan auto-dismiss setelah 6-8 detik.
3. **Ticket Quota Telemetry Widget**:
   - Menampilkan kuota tiket Babak 2 di Header HUD (`X/Y TIKET TERISI • SISA Z`).
   - Memicu efek denyut merah (`animate-pulse text-neonPink border-neonPink shadow-glowPink`) saat kuota tersisa <= 4 tiket.
4. **Qualifying Locked Broadcast Banner**:
   - Banner melintang dramatis saat kualifikasi dikunci oleh RD: "KUALIFIKASI RESMI DITUTUP • BRACKET BABAK 2 SIAP DIMULAI".
5. **Operational Navbar Refinement**:
   - Menata ulang menu navigasi utama agar murni berfokus pada alur operasional sirkuit (Kasir, Marshal, RD, Scrutineer, TV, Bracket).
6. **End-to-End Tournament Lifecycle Test Suite**:
   - Memastikan tidak ada regresi di seluruh alur dari kasir hingga babak eliminasi.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ticket Telemetry State in `getFullState()` | Backend Service (`raceManager.js`, `ticketEngine.js`) | Express API | Menjamin data `ticketStats` (kuota, target, remaining, list tiket) selalu sinkron dalam `STATE_UPDATE` tanpa memerlukan polling terpisah. |
| Layar TV Ticket HUD & Showcase | Frontend UI (`RealtimeTV.jsx`) | React Context (`RaceContext.jsx`) | Menampilkan ticker berjalan, progress bar kuota, banner kunci kualifikasi, dan modal perayaan kualifikasi baru. |
| Audio Chime Perayaan TV | Web Audio API (`client/src/utils/audio.js`) | Browser Client | Synthesizer zero-dependency yang memutar chime nada tinggi ganda saat tiket baru terbit. |
| Navigasi Operasional Turnamen | Frontend UI (`Navbar.jsx`, `App.jsx`) | React Router / Hash State | Merapikan tab peran petugas arena balap dan menyelaraskan navigasi rute. |
| E2E Tournament Lifecycle Test Suite | Automated Test Runner (`server/tests/e2e-tournament-lifecycle.test.js`) | SQLite Engine | Menguji integrasi end-to-end tanpa hardware fisik: Kasir -> Marshal -> RD -> Ticket -> Bracket -> Lock. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI Framework | [VERIFIED: client/package.json:18] Frontend framework aktif. |
| TailwindCSS | ^3.4.17 | Styling & Animasi Cyberpunk | [VERIFIED: client/package.json:29] Utilitas styling dan animasi marquee. |
| Lucide React | ^0.468.0 | Ikonografi UI | [VERIFIED: client/package.json:20] Set ikon standar (Trophy, Ticket, Flag, Tv, dll). |
| Socket.IO Client | ^4.8.1 | Realtime Synchronization | [VERIFIED: client/package.json:21] Sinkronisasi WebSocket dua arah. |
| Node.js Test Runner | Built-in | Integration Testing | [VERIFIED: server/package.json] Eksekusi test cepat dan deterministik. |

## Validation Architecture

### Automated Verification Commands
1. **E2E Integration Test Suite**:
   `node server/tests/e2e-tournament-lifecycle.test.js`
   - Memvalidasi siklus hidup turnamen penuh:
     - 1. Kasir mendaftarkan peserta dan mengaktifkan paket kupon 50 kotak.
     - 2. Marshal finish mencatat balapan, mendebit kotak kupon peserta, dan mencatat pemenang.
     - 3. TicketEngine otomatis menerbitkan tiket digital Babak 2 (`TKT-B2-001`, `#1`).
     - 4. Tiket ter-seeding secara sequential ke slot match Round 2 bracket.
     - 5. Multiple tickets untuk satu pembalap diformat dengan benar (`Budi #1`, `Budi #2`).
     - 6. All-3-Same-Lane Auto-Advance rule terpicu saat ketiga slot diisi pembalap yang sama.
     - 7. Race Director mengunci kualifikasi, bye slot diterapkan jika peserta tidak kelipatan 3, dan status arena terkunci.
2. **Existing Ticket Engine Unit & Integration Tests**:
   `node server/tests/ticket-engine-flow.test.js`
   - Memastikan backward compatibility tetap 100% lulus.
3. **Frontend Production Build**:
   `npm run build` (di direktori `client`)
   - Memvalidasi seluruh sintaks JSX, CSS, TailwindCSS, dan bundle packaging tanpa error.
