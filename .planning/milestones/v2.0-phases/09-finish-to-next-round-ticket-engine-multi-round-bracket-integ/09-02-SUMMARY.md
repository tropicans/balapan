---
phase: 09-finish-to-next-round-ticket-engine-multi-round-bracket-integ
plan: "02"
subsystem: api, websocket, audio, ui, testing
tags: [express, socket.io, react, web-audio, bracket-ui, race-director]

requires:
  - phase: 09-finish-to-next-round-ticket-engine-multi-round-bracket-integ
    provides: Centralized TicketEngine service and schema foundation (09-01)
provides:
  - REST API `GET /api/tickets` with ticket list, unique racers, and status stats
  - REST API `POST /api/tickets/lock-qualifying` to freeze tickets and finalize Round 2
  - REST API `POST /api/tickets/unlock-qualifying` for admin recovery
  - Real-time WebSocket broadcasting for `ticket:granted`, `ticket:voided`, and `qualifying:locked`
  - Synthetic Web Audio victory chime (`playTicketChime`) with dual high tones (880Hz -> 1318.5Hz)
  - `BracketDashboard.jsx` multi-ticket naming (`Budi #1`, `Budi #2`) and `#N` ticket badges
  - `BracketDashboard.jsx` prominent `AUTO-ADVANCE // 3 JALUR PEMBALAP SAMA` badge and notice
  - `RaceDirectorDashboard.jsx` action button "KUNCI KUALIFIKASI" and confirmation modal
affects: []

actuals:
  tokens: 25000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - Qualifying lockdown enforcement with automatic bye handling
    - Web Audio API dual-frequency melodic chime synthesizer
    - Responsive multi-ticket labeling and badge styling in bracket views
    - Defensive modal confirmation for critical tournament transition gates

key-files:
  created: []
  modified:
    - server/index.js
    - server/ticketEngine.js
    - server/raceManager.js
    - server/tests/ticket-engine-flow.test.js
    - client/src/utils/audio.js
    - client/src/context/RaceContext.jsx
    - client/src/screens/BracketDashboard.jsx
    - client/src/screens/RaceDirectorDashboard.jsx

key-decisions:
  - "Endpoint `GET /api/tickets` menyediakan data lengkap tiket aktif, status kualifikasi (open/locked), dan ringkasan pembalap (D-05, D-06)."
  - "Endpoint `POST /api/tickets/lock-qualifying` mengunci penerbitan tiket baru dan menyiarkan sinyal `qualifying:locked` ke seluruh terminal (D-12, D-13)."
  - "Saat event `ticket:granted` diterima, audio synthesizer membunyikan nada kemenangan ganda (880Hz -> 1318.5Hz) dan menampilkan banner notifikasi (D-14)."
  - "Komponen `BracketDashboard.jsx` menampilkan nama kontestan dengan format multi-tiket 'Nama #X' dan badge nomor tiket '#N'."
  - "Match card yang berstatus `is_auto_advanced = 1` menampilkan badge emas/amber mencolok 'AUTO-ADVANCE // 3 JALUR PEMBALAP SAMA' (D-04)."
  - "Dasbor Race Director dilengkapi tombol 'KUNCI KUALIFIKASI' dengan modal konfirmasi dan proteksi state (D-13)."

requirements-completed:
  - TKET-01
  - TKET-02

verification:
  - `node server/tests/ticket-engine-flow.test.js` passed 100%
  - `npm test` passed 100% across all 5 test suites
  - `npm run build` passed 100% with zero bundling/JSX errors
---

# Phase 09 Plan 02: Ticket API Endpoints, WebSocket Broadcasting & UI Integration Summary

Penerapan API pengelolaan tiket, mekanisme penguncian kualifikasi, penyiaran WebSocket real-time, audio chime sintetis, visualisasi multi-tiket di bagan eliminasi, serta tombol aksi Race Director telah selesai diimplementasikan secara komprehensif.

## Fitur & Komponen yang Direalisasikan

1. **REST API & Server Endpoints (`server/index.js` & `server/ticketEngine.js`):**
   - `GET /api/tickets`: Menyajikan data seluruh tiket yang diterbitkan secara sequential, status aktif/void, nama pembalap, tim, jalur, dan rekapitulasi kuota arena.
   - `POST /api/tickets/lock-qualifying`: Mengunci penerbitan tiket baru secara instan, menerapkan aturan Automatic Bye pada heat ganjil di Babak 2, dan menyiarkan event `qualifying:locked` ke seluruh terminal arena.
   - `POST /api/tickets/unlock-qualifying`: Endpoint darurat untuk membuka kembali pintu kualifikasi jika dibutuhkan panitia.
   - Penolakan ketat (`Error: Kualifikasi telah dikunci oleh Race Director`) pada upaya `issueTicket()` atau `/api/marshal/record-winner` saat status kualifikasi terkunci.
   - Perluasan query `bracketMatches` di `RaceManager.getFullState()` dengan `LEFT JOIN next_round_tickets` untuk menyuplai `ticket_number_1/2/3` dan `ticket_index_1/2/3` ke klien secara real-time.

2. **Web Audio Synthesizer (`client/src/utils/audio.js`):**
   - Method `playTicketChime()` menghasilkan nada kemenangan sintetis (*double high beep*): nada pertama 880Hz (sine, 0.12s) diikuti nada kedua 1318.51Hz (triangle, 0.25s) yang reaktif saat event `ticket:granted` tiba di browser.

3. **Sinkronisasi Context (`client/src/context/RaceContext.jsx`):**
   - Listener real-time untuk event `ticket:granted`, `ticket:voided`, dan `qualifying:locked`.
   - Mengintegrasikan banner alert yang menginformasikan nomor tiket, nama pembalap, dan nomor heat Babak 2 yang ditempati.
   - Mengekspos helper fungsi `apiLockQualifying()` dan `apiUnlockQualifying()`.

4. **Visualisasi Multi-Tiket & Auto-Advance (`client/src/screens/BracketDashboard.jsx`):**
   - Format penamaan multi-tiket `Nama Pembalap #X` (misal: "Budi #1", "Budi #2") ditampilkan dinamis pada setiap slot peserta.
   - Badge nomor tiket resmi `#{ticket_number}` berwarna neon cyan berbingkai cyberpunk tampil elegan di samping nama pembalap.
   - Banner indikator `⚡ AUTO-ADVANCE // 3 JALUR PEMBALAP SAMA` tampil mencolok dengan border emas/amber pada heat yang ketiga jalurnya terisi pembalap yang sama.

5. **Kontrol Race Director (`client/src/screens/RaceDirectorDashboard.jsx`):**
   - Tombol kontrol **"KUNCI KUALIFIKASI"** berdesain cyberpunk amber/merah pada header panel komando.
   - Dialog modal konfirmasi yang menjelaskan konsekuensi pembekuan tiket baru dan finalisasi bagan Babak 2 sebelum perintah dieksekusi.
