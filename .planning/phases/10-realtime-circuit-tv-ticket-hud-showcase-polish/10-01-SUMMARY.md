---
phase: 10-realtime-circuit-tv-ticket-hud-showcase-polish
plan: "01"
subsystem: testing, api, engine, telemetry
tags: [sqlite, express, e2e, tickets, telemetry, tv-hud, tournament-lifecycle]

requires:
  - phase: 08-marshal-start-box-rapid-line-up-coupon-check-off-dashboard
    provides: Marshal start box check-off and winner recording
  - phase: 09-finish-to-next-round-ticket-engine-multi-round-bracket-integ
    provides: TicketEngine issuing, multi-ticket seeding, auto-advance, and qualifying lock
provides:
  - Comprehensive E2E tournament lifecycle test suite (`server/tests/e2e-tournament-lifecycle.test.js`)
  - Extended `TicketEngine.getTicketStats()` with `target_quota`, `remaining_quota`, and `is_critical`
  - Integration of `ticketStats` into `RaceManager.getFullState()` for real-time TV HUD and client broadcasts
  - Added `/api/cashier/packages/activate` and `/api/marshal/register-box` endpoints for end-to-end tournament flow
affects:
  - 10-02-PLAN.md (Realtime Circuit TV HUD, Ticket Quota Bar, and Showcase Overlay)

actuals:
  tokens: 18000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - End-to-end integration test covering full tournament lifecycle (Cashier -> Marshal Box -> Finish -> Tickets -> Auto-Advance -> Lock)
    - Structured ticket quota telemetry in full state snapshot
    - Real-time ticket stats emission on ticket granting and state broadcasting

key-files:
  created:
    - server/tests/e2e-tournament-lifecycle.test.js
  modified:
    - server/ticketEngine.js
    - server/raceManager.js
    - server/index.js
    - server/tests/ticket-engine-flow.test.js

key-decisions:
  - "`TicketEngine.getTicketStats()` kini mengembalikan `target_quota`, `remaining_quota`, dan `is_critical` (true jika remaining_quota <= 4 dan !is_locked)."
  - "`RaceManager.getFullState()` menyertakan `ticketStats: TicketEngine.getTicketStats()` sehingga seluruh WebSocket client dan TV HUD langsung menerima telemetri tiket real-time."
  - "Endpoint `/api/cashier/packages/activate` dan `/api/marshal/register-box` disediakan untuk memastikan kelengkapan alur turnamen dari kasir hingga start box."
  - "Test suite E2E `server/tests/e2e-tournament-lifecycle.test.js` memverifikasi 9 langkah alur turnamen end-to-end dengan 100% pass."

requirements-completed:
  - E2E-TEST-01
  - TV-HUD-02

verification:
  - `node server/tests/e2e-tournament-lifecycle.test.js` -> 100% PASS
  - `node server/tests/ticket-engine-flow.test.js` -> 100% PASS
  - All existing backend test suites continue to pass 100%
---

# Phase 10 Plan 01: End-to-End Tournament Lifecycle Test Suite & Ticket Telemetry Service Summary

Test suite E2E komprehensif (`server/tests/e2e-tournament-lifecycle.test.js`) dan layanan telemetri kuota tiket terstruktur (`TicketEngine.getTicketStats()`) telah berhasil dibangun dan diintegrasikan ke dalam `RaceManager.getFullState()`.

## Inti Implementasi

1. **Test Suite Integrasi E2E Lifecycle Turnamen (`server/tests/e2e-tournament-lifecycle.test.js`):**
   - Menguji secara terprogram alur 9 langkah turnamen lengkap:
     - **Langkah 1 (Kasir)**: Aktivasi paket kupon fisik 50 kotak via `POST /api/cashier/packages/activate`.
     - **Langkah 2 (Marshal Start Box)**: Pendaftaran pembalap ke Jalur A, B, dan C serta pemotongan kupon via `POST /api/marshal/register-box`.
     - **Langkah 3 & 4 (Finish & Tiket)**: Pencatatan pemenang heat (`POST /api/marshal/record-winner`) dan penerbitan tiket digital `#1` (`TKT-B2-001`).
     - **Langkah 5 & 6 (Multi-Ticket)**: Kemenangan kedua untuk pembalap yang sama menghasilkan label `Nama #2` (`TKT-B2-002`) dan auto-seeding ke match Round 2.
     - **Langkah 7 (All-3-Same-Lane Auto-Advance)**: Kemenangan ketiga melengkapi seluruh slot satu match Round 2 untuk pembalap yang sama, memicu `is_auto_advanced = 1`, menandai match `completed`, dan otomatis memajukan pembalap ke babak Grand Final.
     - **Langkah 8 (Telemetri Tiket)**: Memverifikasi `ticketStats` pada `RaceManager.getFullState()` dan `GET /api/state`.
     - **Langkah 9 (Kunci Kualifikasi & Penolakan Tiket)**: Mengunci kualifikasi via `POST /api/tickets/lock-qualifying` dan memastikan penolakan tiket baru setelah lock (400 Bad Request).

2. **Telemetri Tiket Terstruktur (`TicketEngine.getTicketStats()`):**
   - Menghitung `target_quota` secara dinamis dari slot Round 2 (`bracket_matches`) atau `tournament_settings` (default 24 atau 9).
   - Menghitung `remaining_quota = Math.max(0, target_quota - total_issued)`.
   - Menghitung `is_critical` (flag peringatan kuota tersisa <= 4 dan belum terkunci).
   - Memastikan emit socket `ticket:granted` menyertakan objek `stats` lengkap.

3. **Integrasi Telemetri ke `RaceManager.getFullState()`:**
   - Menambahkan properti `ticketStats: TicketEngine.getTicketStats()` pada payload `getFullState()`.
   - Menjamin TV HUD dan seluruh klien mendapatkan data kuota tiket dan status kunci kualifikasi terkini di setiap event `STATE_UPDATE`.
