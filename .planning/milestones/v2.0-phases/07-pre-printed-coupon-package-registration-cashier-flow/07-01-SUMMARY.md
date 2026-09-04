---
phase: 07-pre-printed-coupon-package-registration-cashier-flow
plan: "01"
subsystem: database, api, testing
tags: [sqlite, express, coupons, rest-api, tdd]

requires:
  - phase: 06-hardware-qr-camera-scanner-station
    provides: Tournament foundation and robust test infrastructure
provides:
  - SQLite WASM schema `coupon_packages` with UNIQUE serial constraint and sequential quota tracking
  - REST API endpoint `POST /api/coupon-packages` supporting dual-mode racer picker and balance synchronization
  - REST API endpoint `GET /api/coupon-packages` with multi-criteria search and status filtering
  - REST API endpoint `GET /api/coupon-packages/next-serial` with monotonic serial increment suggestion
  - REST API endpoint `POST /api/coupon-packages/:id/void` for atomic coupon quota transfer
  - Comprehensive automated test suite `server/tests/coupon-package.test.js`
affects:
  - 07-02-PLAN.md (Cashier frontend dashboard and components)
  - Phase 08 (Marshal dashboard)

actuals:
  tokens: 18500
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - Dual mode racer creation (lookup vs. on-the-fly) during physical coupon registration
    - Atomic quota and balance synchronization using SQLite wrapper transactions
    - Monotonic serial auto-increment logic based on numeric suffix parsing

key-files:
  created:
    - server/tests/coupon-package.test.js
  modified:
    - server/db.js
    - server/index.js
    - package.json

key-decisions:
  - "Constraint UNIQUE(serial_number) diterapkan pada level schema tabel dan index SQLite WASM untuk pencegahan pendaftaran ganda di seluruh turnamen (D-03)."
  - "Dual Mode pemilihan pembalap: sistem mendukung pencarian ID pembalap terdaftar ATAU pembuatan instan pembalap baru dengan saldo kupon awal di tabel coupons (D-06)."
  - "Alur darurat Void & Ganti Lembar mentransfer seluruh sisa kuota ke lembar seri baru tanpa memodifikasi saldo kupon digital pembalap di tabel coupons (D-08)."
  - "Endpoint next-serial menggunakan rowid DESC untuk mendeteksi nomor seri terakhir secara deterministik dalam eksekusi berkecepatan tinggi."

patterns-established:
  - "Atomic transaction: pendaftaran paket kupon selalu menyinkronkan total kuota ke saldo digital di tabel coupons dalam satu transaksi."
  - "Void replacement: paket lama ditandai 'void' dan paket baru merujuk paket lama via void_from_id dengan payment_method='transfer_void'."

requirements-completed:
  - CPN-01
  - CPN-02
  - CPN-03

coverage:
  - id: D1
    description: "Skema database coupon_packages dan constraint UNIQUE(serial_number)"
    requirement: "CPN-01"
    verification:
      - kind: unit
        ref: "server/tests/coupon-package.test.js"
        status: pass
  - id: D2
    description: "REST API registrasi paket kupon baru dengan sinkronisasi saldo kupon dan deteksi nomor seri duplikat 409"
    requirement: "CPN-01"
    verification:
      - kind: integration
        ref: "server/tests/coupon-package.test.js"
        status: pass
  - id: D3
    description: "REST API alur darurat Void & Ganti Lembar dengan pemindahan sisa kuota tanpa mengubah saldo digital pembalap"
    requirement: "CPN-03"
    verification:
      - kind: integration
        ref: "server/tests/coupon-package.test.js"
        status: pass
  - id: D4
    description: "Endpoint pencarian multi-kriteria dan saran nomor seri otomatis"
    requirement: "CPN-02"
    verification:
      - kind: integration
        ref: "server/tests/coupon-package.test.js"
        status: pass
---

# Phase 07 Plan 01: Pre-Printed Coupon Packages Backend & Test Suite Summary

Membangun fondasi backend dan model data untuk pengelolaan kupon fisik 50-kotak turnamen balap Tamiya, mencakup skema database SQLite WASM, REST API CRUD & alur darurat, serta test suite otomatis komprehensif.

## What Was Done

1. **Skema Database `coupon_packages` (`server/db.js`)**:
   - Menambahkan tabel `coupon_packages` dengan constraint `UNIQUE(serial_number)`, `CHECK(status IN ('active', 'completed', 'void'))`, kolom tracking kuota (`total_quota`, `used_quota`, `remaining_quota`), relasi foreign key ke `users` dan referensi `void_from_id` ke dirinya sendiri.
   - Menambahkan index `idx_coupon_packages_serial`.

2. **REST API Endpoints (`server/index.js`)**:
   - `POST /api/coupon-packages`: Pendaftaran paket kupon fisik 50-kotak dengan sanitasi nomor seri, dual-mode (racer terdaftar atau racer baru on-the-fly), deteksi nomor seri duplikat (HTTP 409 Conflict), dan sinkronisasi saldo kupon digital pembalap.
   - `GET /api/coupon-packages`: Pencarian instan berdasarkan nomor seri, nama pembalap, atau nama tim dengan filter status (`all`, `active`, `completed`, `void`).
   - `GET /api/coupon-packages/next-serial`: Saran nomor seri increment otomatis berdasarkan nomor seri fisik terakhir.
   - `POST /api/coupon-packages/:id/void`: Alur darurat penonaktifan lembaran kupon rusak/robek/hilang dengan pemindahan sisa kuota ke nomor seri baru dan invariansi saldo digital pembalap.
   - Realtime WebSocket broadcast (`coupon_package_updated`) dan `broadcastFullState()`.

3. **Test Suite Otomatis (`server/tests/coupon-package.test.js`)**:
   - 100% green unit & integration testing untuk schema, constraint, registrasi, dual-mode, 409 conflict duplicate, auto-increment, pencarian, dan alur darurat void & replace.
   - Terintegrasi penuh ke dalam `npm test`.

## Verification Results
- `node server/tests/coupon-package.test.js` -> PASS
- `npm test` -> PASS (All 3 test suites passed: `race-flow.test.js`, `camera-scanner.test.js`, `coupon-package.test.js`)
