# Phase 07: Pre-Printed Coupon Package Registration & Cashier Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 07-Pre-Printed Coupon Package Registration & Cashier Flow
**Areas discussed:** Format Nomor Seri & Metode Input, Relasi Pembalap & Multi-Paket Kupon, Struktur Kuota & Pelacakan Pemakaian Kotak, Integrasi Antarmuka Kasir (UI/UX)

---

## Format Nomor Seri & Metode Input

| Option | Description | Selected |
|--------|-------------|----------|
| Format Alfanumerik Fleksibel | 4–32 karakter alfanumerik/numerik (misal: 001, 102, CPN-001) | ✓ |
| Format Strict / Pola Tetap | Wajib diawali prefix tertentu dengan validasi regex kaku | |
| Auto-detect Enter Barcode Wedge + Scan Kamera | Input cepat barcode wedge USB + opsi scan kamera | (Initial) |
| Hard block dengan alert merah tebal & detail pemilik | Menolak nomor ganda dan menampilkan info pemilik sebelumnya | ✓ |
| Generate Seri Otomatis | Tombol opsional untuk lembaran tanpa nomor cetak | ✓ |

**User's choice:** Format Alfanumerik/Numerik Fleksibel, Hard block duplikat dengan detail pemilik, Tombol Generate Seri Otomatis.
**Notes:** User secara khusus memberikan catatan bahwa kupon yang dicetak di lapangan hanya memiliki nomor cetak manual (angka) tanpa barcode atau QR code pada kertas fisik. Oleh karena itu, antarmuka kasir diprioritaskan untuk input manual keyboard / numpad dengan autofocus instan.

---

## Relasi Pembalap & Multi-Paket Kupon

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-lembar per Pembalap | Satu pembalap boleh memiliki lebih dari 1 paket kupon aktif sekaligus | ✓ |
| Single-lembar per Pembalap | Hanya 1 lembar aktif sampai kuotanya habis | |
| Dual Mode Autocomplete / New User | Pilih pembalap yang ada atau buat user baru inline | ✓ |
| Sinkronisasi ke Saldo Pembalap | Kuota dilacak per nomor seri dan total disinkronkan ke saldo kupon | ✓ |
| Fitur Ganti Lembar / Void | Nonaktifkan nomor lama dan pindahkan sisa kuota ke nomor baru jika rusak/hilang | ✓ |

**User's choice:** Multi-lembar diperbolehkan, Dual mode registrasi pembalap, Kuota dilacak per seri dan disinkronkan ke saldo pembalap, Sediakan aksi Ganti Lembar/Void jika lembaran fisik rusak/hilang.
**Notes:** Memungkinkan tim atau pembalap profesional membeli beberapa lembar 50-kotak sekaligus saat turnamen dimulai.

---

## Struktur Kuota & Pelacakan Pemakaian Kotak

| Option | Description | Selected |
|--------|-------------|----------|
| Default 50 kotak (editable) | Default 50 kotak sesuai standar sirkuit, namun bisa diubah jika ada paket khusus | ✓ |
| Fixed 50 kotak mutlak | Terkunci 50 kotak tanpa bisa diubah | |
| Penghitung Kuota Urut | total_quota (50), used_quota (0-50), next_box_number (1-50) | ✓ |
| Matriks Array 50 Kotak | Status individual per kotak (unused/used/void) | |
| Auto-switch ke status 'completed' | Begitu 50 kotak habis langsung berubah status ke completed | ✓ |
| Input Nominal Bayar & Metode Bayar | Catat nominal Rupiah & metode bayar untuk rekapitulasi kasir | ✓ |

**User's choice:** Default 50 kotak (editable), Penghitung kuota urut, Auto-switch status 'completed' saat habis, Sertakan pencatatan harga dan metode bayar.
**Notes:** Model penghitung kuota urut menyederhanakan instruksi visual bagi Marshal di Phase 08 ("Coret Kotak #X").

---

## Integrasi Antarmuka Kasir (UI/UX)

| Option | Description | Selected |
|--------|-------------|----------|
| Tab di CashierDashboard (/cashier) | Tab 1: Paket Kupon Fisik (Default), Tab 2: Top Up Saldo Digital | ✓ |
| Rute Baru Terpisah | Halaman /cashier-packages tersendiri | |
| Split 2-Kolom Cyberpunk | Kolom Kiri: Form Registrasi Cepat; Kolom Kanan: Live Feed Paket | ✓ |
| Search Bar Multi-Kriteria | Filter instan berdasarkan Nomor Seri, Nama Pembalap, atau Nama Tim | ✓ |
| Tombol Pintas Auto Seri +1 | Toast notifikasi sukses dengan tombol aksi cepat mendaftar lembar berikutnya | ✓ |

**User's choice:** Tab navigasi di CashierDashboard, Layout Split 2-Kolom Cyberpunk, Search bar multi-kriteria + filter status, Tombol pintas "Daftar Lembar Berikutnya (+1)".
**Notes:** Menghasilkan alur kerja kasir yang sangat cepat (<10 detik per pendaftaran).

---

## the agent's Discretion

- Penataan komponen visual, micro-interactions, dan skema border glow neon sesuai tema Cyberpunk yang sudah ada di aplikasi.

## Deferred Ideas

- None.
