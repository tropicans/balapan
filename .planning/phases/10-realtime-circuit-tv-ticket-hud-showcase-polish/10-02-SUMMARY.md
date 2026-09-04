---
phase: 10-realtime-circuit-tv-ticket-hud-showcase-polish
plan: "02"
subsystem: ui, tv-hud, ticker, modal, navigation
tags: [react, tailwind, tv-hud, ticket-quota, celebration-modal, marquee, operational-nav]

requires:
  - phase: 10-realtime-circuit-tv-ticket-hud-showcase-polish
    plan: "01"
    provides: Structured ticket telemetry (`ticketStats`) in RaceManager.getFullState()
provides:
  - Header Ticket Quota Bar with critical pulse state (`<= 4` tickets remaining) in `RealtimeTV.jsx`
  - Qualifying Locked Broadcast Banner in `RealtimeTV.jsx`
  - Running Ticker Strip of Round 2 Qualifiers with zero-one-many smooth looping in `RealtimeTV.jsx`
  - Holographic Gold "NEW QUALIFIER!" celebration modal (`QualifierCelebrationModal.jsx`) with Web Audio chime and 7s auto-dismiss
  - Streamlined operational navigation in `Navbar.jsx` with active route detection in `App.jsx`
affects: []

actuals:
  tokens: 22000
  tasks: 4
  commits: 1

tech-stack:
  added: []
  patterns:
    - Hardware-accelerated continuous 60fps horizontal marquee using CSS `translate3d(-50%, 0, 0)` and element duplication
    - Holographic gold cyberpunk celebration modal with auto-dismiss progress bar and keyboard ESC accessibility
    - Reactive ticket quota telemetry widget with progressive color status (normal, critical pulse, locked)
    - Clean operational role navigation with URL pushState history syncing

key-files:
  created:
    - client/src/components/ui/QualifierCelebrationModal.jsx
  modified:
    - client/src/screens/RealtimeTV.jsx
    - client/src/components/ui/Navbar.jsx
    - client/src/context/RaceContext.jsx
    - client/src/App.jsx
    - client/src/index.css

key-decisions:
  - "Header HUD pada `RealtimeTV.jsx` dilengkapi dengan widget Kuota Tiket Babak 2 yang berdenyut merah (`animate-pulse text-neonPink border-neonPink shadow-glowPink`) saat kuota tersisa kritis (<= 4 tiket) dan menampilkan banner broadcast kualifikasi ditutup saat terkunci."
  - "Running ticker di footer `RealtimeTV.jsx` menampilkan daftar pemegang tiket Babak 2 (`#X [KODE] NAMA [TIM] (HH:MM)`) dengan badge emas cyberpunk, fallback empty state yang informatif, dan duplikasi elemen jika jumlah tiket <= 2 untuk looping mulus tanpa jitter."
  - "Modal selebrasi `QualifierCelebrationModal.jsx` otomatis muncul saat event `ticket:granted` diterima, memainkan audio chime ganda Web Audio, menembakkan konfeti emas, memiliki progress bar auto-dismiss 7 detik, dan tombol interaktif [ESC]."
  - "Navigasi `Navbar.jsx` dirampingkan untuk memprioritaskan alur operasional perlombaan (Kasir Kupon, Marshal Finish, Race Director, Scrutineer, TV Sirkuit, Babak Eliminasi) dengan sinkronisasi URL `pushState`."

requirements-completed:
  - TV-HUD-01
  - TV-HUD-02
  - TV-NAV-01

verification:
  - `npm run build` di direktori `client` -> PASS (Vite build sukses 0 error)
  - `node server/tests/e2e-tournament-lifecycle.test.js` -> 100% PASS
  - Seluruh 6 suite pengujian backend lulus 100%
---

# Phase 10 Plan 02: Realtime Circuit TV Ticket HUD Showcase & Operational Navigation Polish Summary

Pengalaman siaran TV Sirkuit 16:9 (`RealtimeTV.jsx`) dan perampingan navigasi operasional turnamen Mini 4WD telah berhasil diimplementasikan secara komprehensif.

## Inti Implementasi

1. **Header Ticket Quota Bar & Qualifying Locked Banner (`RealtimeTV.jsx`):**
   - Mengambil `ticketStats` real-time dari `raceState.ticketStats`.
   - **Widget Kuota Tiket Babak 2 (E3)**: Menampilkan status kuota tiket dengan bar segmen kemajuan neon:
     - Normal (> 4 tiket tersisa): Format `{issued}/{target} TERISI • SISA {remaining}` dengan palet neon amber/cyan.
     - Kritis (<= 4 tiket tersisa): Format `PEREBUTAN KRITIS! SISA {remaining} TIKET TERAKHIR` dengan kelas denyut `animate-pulse text-neonPink border-neonPink shadow-glowPink`.
     - Terkunci: Format `KUALIFIKASI TERKUNCI • {issued} TIKET SAH`.
   - **Qualifying Locked Broadcast Banner (E4)**: Tampil melintang selebar layar saat kualifikasi dikunci dengan teks `KUALIFIKASI RESMI DITUTUP • BRACKET BABAK 2 SIAP DIMULAI` dan aksen gradien cyberpunk.

2. **Running Ticker Strip Pemegang Tiket Babak 2 di Footer TV (`RealtimeTV.jsx` & `index.css`):**
   - Menyiarkan antrean pemegang tiket Babak 2 dengan format `#X [TKT-B2-XXX] NAMA_PEMBALAP [TIM] (HH:MM)`.
   - Menggunakan animasi horizontal marquee berkecepatan 60fps dengan keyframe `translate3d(-50%, 0, 0)` dan duplikasi array jika tiket <= 2 untuk menjamin continuous loop tanpa jeda kosong pada layar 16:9.
   - Menyediakan empty state jika kualifikasi masih awal: `BELUM ADA PEMEGANG TIKET BABAK 2 • KUALIFIKASI SEDANG BERLANGSUNG`.

3. **Modal Pop-up Holografik Emas "NEW QUALIFIER!" (`QualifierCelebrationModal.jsx` & `RaceContext.jsx`):**
   - Saat event `ticket:granted` diterima, `RaceContext` menyalakan state `newQualifierModal`, memicu synthesizer Web Audio `sound.playTicketChime()`, dan menyemburkan partikel konfeti emas.
   - Modal pop-up menampilkan nomor tiket raksasa emas bercahaya (`#X`), nama pembalap, tag tim, badge jalur kemenangan (A/B/C), dan match placement Round 2.
   - Dilengkapi progress bar timer 7 detik untuk auto-dismiss, listener tombol `Escape`, dan tombol klik interaktif `TUTUP SEKARANG [ESC]`.

4. **Perampingan Navigasi Operasional (`Navbar.jsx` & `App.jsx`):**
   - Mengurutkan navigasi utama ke peran operasional perlombaan:
     - `Kasir Kupon` (`/cashier`)
     - `Marshal Finish` (`/marshal`)
     - `Race Director` (`/director`)
     - `Scrutineer` (`/scrutineer`)
     - `Layar TV Sirkuit` (`/tv`)
     - `Babak Eliminasi` (`/bracket`)
     - `Peserta (HP)` (`/participant`)
     - `QR Jalur Fisik` (`/qr-codes`)
   - Mengintegrasikan `window.history.pushState` dan routing deteksi rute URL pada `App.jsx` untuk deep linking langsung.
