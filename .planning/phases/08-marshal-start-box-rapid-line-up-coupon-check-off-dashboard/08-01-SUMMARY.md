---
phase: 08-marshal-start-box-rapid-line-up-coupon-check-off-dashboard
plan: "01"
subsystem: database, api, testing
tags: [sqlite, express, marshal, coupons, bracket, rest-api, tdd]

requires:
  - phase: 07-pre-printed-coupon-package-registration-cashier-flow
    provides: Pre-printed physical coupon package registry and atomic balance synchronization
provides:
  - SQLite schema `marshal_winner_logs` with foreign keys, lane checks, and status tracking
  - REST API endpoint `POST /api/marshal/record-winner` with 404 validation, atomic quota debit, and auto-seeding to Round 2 bracket
  - REST API endpoint `POST /api/marshal/undo-last-winner` with strict 60s correction window and quota reversal
  - REST API endpoint `GET /api/marshal/recent-winners` providing audit trail of last 5 heat winners
  - REST API endpoints `GET /api/marshal/active-bracket-match` and `POST /api/marshal/record-bracket-winner` for 1-tap Round 2 elimination progression
  - Comprehensive automated test suite `server/tests/marshal-flow.test.js`
affects:
  - 08-02-PLAN.md (Marshal tablet HUD dashboard and components)

actuals:
  tokens: 22000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - Atomic coupon quota debit and log creation in SQLite transactions
    - 60-second time-bounded rollback/undo mechanism for finish-line human errors
    - Automatic seeding of heat winners into Round 2 elimination bracket matches
    - Real-time WebSocket broadcasting for marshal actions and state sync

key-files:
  created:
    - server/tests/marshal-flow.test.js
  modified:
    - server/db.js
    - server/index.js
    - package.json

key-decisions:
  - "Tabel `marshal_winner_logs` mencatat package_id, serial_number, user_id, lane ('A','B','C'), box_number, dan status ('active'/'undone') dengan index created_at (D-03, D-05)."
  - "Validasi nomor seri kupon mengembalikan HTTP 404 KUPON BELUM TERDAFTAR DI KASIR jika kupon fisik belum dibeli di kasir (D-10)."
  - "Pencatatan pemenang yang sah mendebit 1 kuota paket kupon, mengurangi saldo coupons pembalap, mencatat log pemenang, dan melakukan auto-seeding ke bracket Babak 2 (D-05, D-06)."
  - "Pembatalan kemenangan (undo) dibatasi ketat maksimum 60 detik sejak pencatatan untuk mencegah manipulasi, mengembalikan 1 kuota kupon dan saldo pembalap secara atomic (D-09)."
  - "Endpoint Babak 2 menyajikan kontestan aktif pada Jalur A, B, C dan mengizinkan seleksi pemenang 1-tap yang langsung memajukan pemenang ke ronde berikutnya (D-11, D-12)."

patterns-established:
  - "Atomic winner logging: Debit coupon_packages + debit coupons + insert marshal_winner_logs + seedIntoBracket executed within a single db.transaction()."
  - "Time-bounded undo: Verifies (Date.now() - createdAt) <= 60000 before reversing quota and marking status='undone'."

requirements-completed:
  - MRSH-02
  - MRSH-03
  - MRSH-04

coverage:
  - id: D1
    description: "Skema database marshal_winner_logs dengan constraint foreign key dan enum status"
    requirement: "MRSH-02"
    verification:
      - kind: unit
        ref: "server/tests/marshal-flow.test.js"
        status: pass
  - id: D2
    description: "REST API pencatatan pemenang kualifikasi Babak 1 dengan debit kuota atomic dan auto-seeding bracket"
    requirement: "MRSH-02"
    verification:
      - kind: integration
        ref: "server/tests/marshal-flow.test.js"
        status: pass
  - id: D3
    description: "REST API pembatalan kemenangan cepat (undo) dengan batas waktu 60 detik dan pengembalian kuota"
    requirement: "MRSH-03"
    verification:
      - kind: integration
        ref: "server/tests/marshal-flow.test.js"
        status: pass
  - id: D4
    description: "REST API match aktif Babak 2 dan seleksi pemenang 1-tap eliminasi bracket"
    requirement: "MRSH-04"
    verification:
      - kind: integration
        ref: "server/tests/marshal-flow.test.js"
        status: pass
---

# Phase 08 Plan 01: Marshal Rapid Line-up & Check-off Backend Summary

Mengimplementasikan skema database `marshal_winner_logs`, REST API endpoints untuk pencatatan pemenang Babak 1, pembatalan 60 detik, serta eksekusi bracket eliminasi Babak 2 1-tap yang didukung pengujian otomatis komprehensif.

## What Was Done

1. **Skema Database `marshal_winner_logs` (`server/db.js`)**:
   - Menambahkan tabel `marshal_winner_logs` untuk audit trail pencatatan juri meja finish dengan foreign keys ke `coupon_packages` dan `users`, enum check lane (`A`, `B`, `C`), status (`active`, `undone`), nomor kotak kupon (`box_number`), dan index pada `created_at`.

2. **REST API Endpoints (`server/index.js`)**:
   - `POST /api/marshal/record-winner`: Validasi nomor seri kupon terhadap paket aktif kasir (HTTP 404 KUPON BELUM TERDAFTAR DI KASIR jika tidak ditemukan). Melakukan transaksi atomik penambahan `used_quota`, pengurangan `remaining_quota`, sinkronisasi saldo tabel `coupons`, pencatatan log pemenang, dan auto-seeding pemenang ke Babak 2 melalui `RaceManager.seedIntoBracket()`.
   - `POST /api/marshal/undo-last-winner`: Membatalkan pencatatan kemenangan terakhir atau berdasarkan `log_id` dalam rentang waktu <= 60 detik. Mengembalikan 1 kuota kupon dan saldo pembalap, serta mengubah status log menjadi `undone`. Menolak jika selisih waktu > 60 detik dengan HTTP 400 'Koreksi Kedaluwarsa (>60s)'.
   - `GET /api/marshal/recent-winners`: Mengambil 5 riwayat pemenang terakhir untuk ringkasan dasbor.
   - `GET /api/marshal/active-bracket-match`: Mengambil pertandingan bracket Babak 2 berstatus `pending` pertama yang siap bertanding lengkap dengan nama dan tim pembalap di Jalur A, B, dan C.
   - `POST /api/marshal/record-bracket-winner`: Merekam pemenang match bracket Babak 2 secara 1-tap menggunakan `RaceManager.advanceBracketWinner()`.
   - WebSocket broadcasting (`marshal:winner-recorded`, `marshal:winner-undone`, `bracket_updated`, `STATE_UPDATE`).

3. **Test Suite Otomatis (`server/tests/marshal-flow.test.js`)**:
   - Menambahkan test suite komprehensif yang menguji validasi skema, 404 kupon tak terdaftar, debit kuota & auto-seeding, pembatalan dalam 60s, penolakan undo >60s, recent winners, active bracket match, dan seleksi 1-tap pemenang Babak 2.
   - Terintegrasi penuh ke dalam `package.json` test script.

## Verification Results
- `node server/tests/marshal-flow.test.js` -> PASS
- `npm test` -> PASS (Semua 4 test suite lulus 100% tanpa regresi)
