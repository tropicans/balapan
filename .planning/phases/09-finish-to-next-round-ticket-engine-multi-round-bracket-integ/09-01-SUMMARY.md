---
phase: 09-finish-to-next-round-ticket-engine-multi-round-bracket-integ
plan: "01"
subsystem: database, api, engine, testing
tags: [sqlite, express, tickets, multi-ticket, auto-advance, bracket, tdd]

requires:
  - phase: 07-pre-printed-coupon-package-registration-cashier-flow
    provides: Pre-printed physical coupon package registry and serial tracking
  - phase: 08-marshal-start-box-rapid-line-up-coupon-check-off-dashboard
    provides: Marshal winner logging and 60s undo pipeline
provides:
  - SQLite schema `next_round_tickets` with sequential ticket numbers, codes, racer ticket indexes, and bracket references
  - Schema extension for `bracket_matches` with `ticket_id_1`, `ticket_id_2`, `ticket_id_3`, and `is_auto_advanced`
  - Centralized `TicketEngine.issueTicket()` service for sequential ticket generation and automatic Round 2 bracket slot placement
  - Multi-ticket per racer support (`Budi #1`, `Budi #2`, `Budi #3`)
  - All-3-Same-Lane Auto-Advance rule (`status='completed'`, `is_auto_advanced=1`, auto-advance to next round)
  - `TicketEngine.voidTicket()` with bracket slot vacation and coupon quota restoration
  - Integration of dual-source trigger (`POST /api/marshal/record-winner` and Scrutineer pass in `RaceManager`)
  - Guaranteed zero-ticket behavior for DNF/CO races (`declareAllCO`)
  - Test suite `server/tests/ticket-engine-flow.test.js`
affects:
  - 09-02-PLAN.md (Ticket API endpoints, WebSocket listeners, UI bracket indicators, and RD lock button)

actuals:
  tokens: 24000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - Centralized TicketEngine with atomic SQLite transaction handling
    - Sequential auto-seeding into 3-lane elimination bracket matches
    - Multi-ticket indexing per racer with distinct display labels
    - All-3-same-lane automatic advance for elimination tournaments
    - 60-second rollback with bracket slot cleaning and coupon recovery

key-files:
  created:
    - server/ticketEngine.js
    - server/tests/ticket-engine-flow.test.js
  modified:
    - server/db.js
    - server/index.js
    - server/raceManager.js
    - package.json

key-decisions:
  - "Tabel `next_round_tickets` mencatat nomor tiket sequential (1, 2, 3...), kode tiket TKT-B2-XXX, user_id, racer_ticket_index, serial_number, lane, status, dan referensi slot bracket match (D-05, D-06)."
  - "Tabel `bracket_matches` diperluas dengan kolom `ticket_id_1`, `ticket_id_2`, `ticket_id_3`, dan `is_auto_advanced`."
  - "Pembalap diperbolehkan memiliki lebih dari satu tiket Babak 2 tanpa batas, ditandai dengan format 'Nama Pembalap #N' (D-01, D-03)."
  - "Penempatan tiket ke bracket Babak 2 berjalan secara sequential murni ke slot terbuka match_number ASC (D-02)."
  - "Jika 3 tiket dari pembalap yang sama mengisi satu match Round 2, sistem otomatis menandai match selesai dengan `is_auto_advanced=1` dan meloloskan pembalap ke ronde berikutnya (D-04)."
  - "Dual-source trigger (/marshal dan Race Director) memanggil TicketEngine.issueTicket() secara konsisten (D-08)."
  - "Pembatalan kemenangan (undo) memanggil TicketEngine.voidTicket() yang membebaskan slot bracket match dan mengembalikan kuota kupon (D-10)."
  - "Mobil yang berstatus Klontang / CO (DNF) tidak menerbitkan tiket apa pun, kupon tetap terpotong (D-09, TKET-03)."

requirements-completed:
  - TKET-01
  - TKET-02
  - TKET-03

verification:
  - `node server/tests/ticket-engine-flow.test.js` passed 100%
  - `npm test` passed 100% across all 5 test suites
---

# Phase 09 Plan 01: Backend Ticket Engine Foundation & Multi-Round Bracket Integration Summary

Sistem Ticket Engine terpusat (`server/ticketEngine.js`) dan skema database `next_round_tickets` telah berhasil dibangun dan diintegrasikan secara penuh ke dalam arsitektur backend turnamen Mini 4WD.

## Inti Implementasi

1. **Skema Database & Migrasi Defensif:**
   - Tabel `next_round_tickets` dibuat di SQLite dengan constraint UNIQUE pada `ticket_number` dan `ticket_code`, serta indexing pada `user_id`, `serial_number`, dan `status`.
   - Tabel `bracket_matches` diperluas dengan kolom `ticket_id_1`, `ticket_id_2`, `ticket_id_3`, dan `is_auto_advanced`.
   - Tabel `marshal_winner_logs` diperluas dengan kolom `ticket_id`.
   - Tabel `tournament_settings` dibuat untuk menyimpan status kualifikasi terbuka/terkunci (`qualifying_status`).

2. **Centralized Ticket Engine (`server/ticketEngine.js`):**
   - `issueTicket()`: Mengalokasikan nomor tiket berurutan secara serial (`#1`, `#2` / `TKT-B2-001`), menghitung nomor indeks tiket pembalap (`Budi #1`, `Budi #2`), melakukan auto-seeding ke slot terbuka Round 2 (user_id_1 -> user_id_2 -> user_id_3), dan mendeteksi kondisi **All-3-Same-Lane Auto-Advance**.
   - **All-3-Same-Lane Auto-Advance**: Jika satu heat Round 2 diisi penuh oleh pembalap yang sama, match ditandai `completed`, `is_auto_advanced = 1`, dan otomatis memajukan pembalap ke babak Grand Final (Round 3) via `RaceManager.advanceBracketWinner()`.
   - `voidTicket()`: Membatalkan tiket (`status = 'void'`), mengosongkan kembali slot pada `bracket_matches` (mereset auto-advance jika match sempat auto-advanced), memulihkan kuota lembar kupon fisik (+1) dan saldo kupon digital pembalap (+1).
   - `lockQualifyingStage()` & `isQualifyingLocked()`: Mengunci penerbitan tiket dan menangani sistem Bye otomatis jika jumlah kontestan heat terakhir tidak genap 3.
   - `getTicketStats()`: Mengembalikan statistik tiket terbit, void, dan rekap pemegang tiket.

3. **Dual-Source Trigger & DNF Zero-Ticket Guarantee:**
   - Endpoint Meja Finish `POST /api/marshal/record-winner` kini memanggil `TicketEngine.issueTicket()` dalam transaksi ACID dan menyiarkan event WebSocket `ticket:granted`.
   - Endpoint `POST /api/marshal/undo-last-winner` memanggil `TicketEngine.voidTicket()` dan menyiarkan `ticket:voided`.
   - Scrutineer pass pada Race Director memanggil `TicketEngine.issueTicket()`.
   - Deklarasi All CO (`declareAllCO`) dan DNF menutup race tanpa pemenang dan menjamin nol tiket yang diterbitkan (TKET-03).
