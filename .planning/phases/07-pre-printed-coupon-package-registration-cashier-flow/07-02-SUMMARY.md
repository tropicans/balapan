---
phase: 07-pre-printed-coupon-package-registration-cashier-flow
plan: "02"
subsystem: ui, cashier
tags: [react, tailwindcss, cashier, cyberpunk, pre-printed-coupons]

requires:
  - phase: 07-pre-printed-coupon-package-registration-cashier-flow
    provides: REST APIs and database schema for coupon packages
provides:
  - Cashier navigation tabs ("Paket Kupon Fisik (Pre-Printed)" and "Top Up Saldo Digital")
  - Cyberpunk 2-column split layout for rapid tournament cashier workflows
  - Form registrasi kupon fisik autofocus dengan dual-mode racer picker dan auto-increment shortcut
  - Live package feed dengan pencarian instan multi-kriteria dan visual gauge kuota sisa
  - Dialog modal darurat Void & Ganti Lembar dengan perlindungan aksi destruktif
affects:
  - Phase 08 (Marshal dashboard and physical coupon hole punch verification)

actuals:
  tokens: 21000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - Split 2-column layout (40% registration form / 60% live feed) with midnight background (#0a0b10) and obsidian cards (#0e1017)
    - Autofocus serial input with neonAmber ring (#ffaa00) for instant cashier barcode/number entry
    - Real-time Socket.IO synchronization on `coupon_package_updated` event
    - Chamfer badge and dynamic color-coded quota depletion progress bar

key-files:
  created:
    - client/src/components/cashier/CouponRegistrationForm.jsx
    - client/src/components/cashier/CouponPackageList.jsx
    - client/src/components/cashier/VoidPackageModal.jsx
  modified:
    - client/src/screens/CashierDashboard.jsx

key-decisions:
  - "Tab Paket Kupon Fisik (Pre-Printed) dijadikan default active tab saat membuka /cashier untuk mendukung turnamen berbasis lembaran fisik 50-kotak (D-13)."
  - "Field nomor seri di form registrasi otomatis menerima fokus kursor (autofocus) saat tab dibuka maupun sesaat setelah submit berhasil (D-02, D-14)."
  - "Error nomor seri duplikat (409 Conflict) ditampilkan menggunakan banner neonPink (#ff0055) tebal yang menyertakan nama pemilik lembar sebelumnya (D-03)."
  - "Shortcut batch '+1 Lembar' memungkinkan pendaftaran bundel nomor seri berurutan tanpa klik mouse berulang (D-16)."
  - "Modal Void & Ganti Lembar mewajibkan pengisian nomor seri lembar baru sebelum konfirmasi dapat diproses (D-08)."

patterns-established:
  - "Dual-mode racer input: opsi memilih pembalap terdaftar ATAU langsung mendaftarkan nama pembalap baru on-the-fly."
  - "Color-coded depletion bar: >50% hijau/cyan, 20-50% amber, <20% pink, 0% gray."

requirements-completed:
  - CPN-01
  - CPN-02
  - CPN-03

coverage:
  - id: D1
    description: "Tab navigasi Kasir dan layout split 2-kolom cyberpunk"
    requirement: "CPN-01"
    verification:
      - kind: automated_ui
        ref: "npm run build"
        status: pass
  - id: D2
    description: "Form registrasi kupon fisik autofocus dengan dual-mode racer picker dan auto-increment shortcut"
    requirement: "CPN-01"
    verification:
      - kind: automated_ui
        ref: "npm run build"
        status: pass
  - id: D3
    description: "Live feed kartu paket kupon terdaftar dengan search bar instan, filter chip, dan visual progress kuota"
    requirement: "CPN-02"
    verification:
      - kind: automated_ui
        ref: "npm run build"
        status: pass
  - id: D4
    description: "Dialog konfirmasi darurat Void & Ganti Lembar"
    requirement: "CPN-03"
    verification:
      - kind: automated_ui
        ref: "npm run build"
        status: pass
---

# Phase 07 Plan 02: Pre-Printed Coupon Package Cashier Dashboard Frontend Summary

Membangun antarmuka kasir cepat terintegrasi pada `CashierDashboard.jsx` (`/cashier`) dengan sistem Tab Navigasi, Layout Split 2-Kolom Cyberpunk, formulir registrasi kupon fisik autofocus dengan dual-mode racer picker, shortcut auto-increment, pencarian instan multi-kriteria, pelacakan visual sisa kuota paket, dan dialog darurat Void & Ganti Lembar sesuai kontrak desain `07-UI-SPEC.md`.

## What Was Done

1. **Komponen Form Registrasi Cepat (`CouponRegistrationForm.jsx`)**:
   - Autofocus kursor langsung pada field Nomor Seri Kupon dengan outline neonAmber glow (`#ffaa00`).
   - Tombol helper "Generate Seri Berikutnya" yang terhubung ke endpoint `GET /api/coupon-packages/next-serial`.
   - Dual-Mode racer selector: Autocomplete pembalap terdaftar ATAU input nama & tim pembalap baru on-the-fly.
   - Shortcut batch "Daftarkan Lembar Berikutnya (+1)" untuk auto-increment nomor seri berikutnya secara instan.
   - Banner alert neonPink (`#ff0055`) tebal saat terdeteksi nomor seri duplikat (HTTP 409) dengan detail pemilik terdaftar.

2. **Komponen Live Feed Paket Kupon (`CouponPackageList.jsx`)**:
   - Counter dinamis: "{N} Lembar Terdaftar" pada header.
   - Search bar instan multi-kriteria (nomor seri, nama pembalap, nama tim) dan filter chip status ("Semua", "Aktif", "Habis", "Void").
   - Kartu paket kupon dengan nomor seri chamfer badge mono, tag tim atau badge `[NO TAG]`, status badge AKTIF/HABIS/VOID, dan bar visual sisa kuota (misal: 42 / 50 Kotak).
   - Tombol aksi darurat "Void / Ganti" pada paket aktif.
   - Penanganan lengkap status: loading skeleton HUD, feed kosong, pencarian nihil, dan error HUD.

3. **Komponen Modal Darurat Void & Ganti Lembar (`VoidPackageModal.jsx`)**:
   - Modal konfirmasi pemindahan kuota lembaran rusak/hilang ke lembar nomor seri baru.
   - Menampilkan detail lembar lama dan sisa kuota yang akan dipindahkan.
   - Validasi nomor seri baru dan konfirmasi permanen ber-aksen neonPink.

4. **Dasbor Kasir Terintegrasi (`CashierDashboard.jsx`)**:
   - Tab Navigasi: Tab 1 "Paket Kupon Fisik (Pre-Printed)" (default aktif) dan Tab 2 "Top Up Saldo Digital" (legacy v1.0).
   - Integrasi split 2-kolom pada Tab 1.
   - Sinkronisasi real-time WebSocket melalui event `coupon_package_updated` dan `STATE_UPDATE`.

## Verification Results
- `npm run build` -> PASS (Vite production build sukses tanpa error kompilasi)
- `npm test` -> PASS (Semua 3 test suites backend & scanner 100% green)
