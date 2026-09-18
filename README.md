<!-- generated-by: gsd-doc-writer -->
# 🏎️ DGDash Racing System v3.0 (Cyberpunk / Neo-Racing HUD)

[![Version](https://img.shields.io/badge/version-3.0.0-ff0055.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-00f0ff.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-39ff14.svg)](package.json)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)

Sistem manajemen turnamen balap Tamiya Mini 4WD 3-jalur (*3-lane racetrack*) berkecepatan tinggi dengan alur balap fisik **bebas scanning kupon / barcode**. Aplikasi fokus pada registrasi peserta bernomor urut per event, pencatatan manual rekor Best Time Overall (BTO) dengan pergantian rekor pribadi, pendaftaran pemenang Babak 2 berdasarkan nomor urut, dan eksekusi bracket eliminasi berjenjang 3:1.

---

## ⚡ Modul & Fitur Utama v3.0

### 1. 📋 Registrasi Peserta & Auto-Numbering (`/cashier`)
- **Penomoran Urut Otomatis**: Peserta mendapatkan nomor urut permanen (`#1`, `#2`, `#3`, ...) per event aktif.
- **Dukungan Multi-Entry**: Peserta yang sama dapat didaftarkan berulang kali dengan nomor urut berbeda sesuai regulasi lomba.
- **Import Roster CSV**: Impor cepat daftar peserta dari spreadsheet/CSV dengan kompatibilitas format STC Vol 8.
- **Omni-Search Instan**: Pencarian kilat berdasarkan nomor urut, nama pembalap, maupun nama tim.

### 2. ⏱️ Manajemen Manual BTO (`/director`)
- **Pencatatan Waktu Lap Cepat**: Input catatan waktu lap manual tanpa stopwatch digital atau hardware khusus.
- **Pergantian Rekor Pribadi (*Personal Best Replacement*)**: Hanya catatan waktu terbaik per pembalap yang dipertahankan di leaderboard.
- **Selebrasi Juara BTO #1**: Peringatan visual dan efek confetti otomatis saat rekor tercepat sirkuit dipecahkan.

### 3. 🏁 Registrasi Pemenang Babak 2 (`/winners`)
- **Pendaftaran Pemenang Cepat Berdasarkan Nomor**: Cukup masukkan nomor peserta (`#X`), sistem langsung menampilkan pratinjau nama & tim serta mengalokasikan slot heat.
- **Auto-Slotting Heats (Jalur A → B → C)**: Penempatan otomatis kontestan ke heat Babak 2 dengan pembentukan heat baru secara dinamis.
- **Proteksi Duplikasi & Koreksi Undo**: Mencegah nomor yang sama didaftarkan ganda dan tombol undo 1-klik untuk pembatalan instan.

### 4. 🏆 Eksekusi Bracket Eliminasi 3-Jalur (`/bracket`)
- **Bagan Eliminasi 3:1**: Mendukung Babak 2, Babak 3, hingga Grand Final.
- **Pemilihan Pemenang 1-Klik**: Panitia memilih mobil pemenang di tiap heat untuk otomatis memajukan kontestan ke babak berikutnya.
- **Bagan Real-Time**: Sinkronisasi instan antar perangkat via WebSocket.

### 5. 📺 Layar TV Sirkuit Realtime HUD (16:9 Cyberpunk, `/tv`)
- **Visualisasi Heat Babak 2**: Tampilan status heat eliminasi yang sedang berlangsung.
- **Top 5 BTO Leaderboard**: Papan rekor Best Time Overall terverifikasi dengan pendar emas (*gold shimmer*) untuk ranking #1.
- **Ticker Marquee Informasi**: Berita berjalan menampilkan jumlah peserta dan perkembangan turnamen.

### 6. 📅 Manajemen Event & Isolasi Data (`/events`)
- **Pemisahan Event**: Tiap event lomba memiliki nomor urut peserta, catatan BTO, dan bagan bracket terisolasi.
- **Beralih & Mengarsipkan Event**: Penggantian event aktif aman tanpa menghapus histori lomba sebelumnya.

---

## 🚀 Panduan Menjalankan

### Persyaratan Sistem
- Node.js >= 20.0.0
- SQLite / SQL.js

### Instalasi & Menjalankan
```bash
# Instal dependensi
npm install
npm --prefix client install

# Menjalankan server dan client bersamaan
npm run dev

# Menjalankan test suite
npm test

# Build aplikasi frontend
npm run build
```

---

## 🐳 Docker & CI/CD Auto-Rebuild

### 1. Auto-Rebuild Lokal (Docker Compose Watch & Git Hook)

Aplikasi telah dilengkapi fitur otomatisasi agar setiap perubahan kode langsung memicu build ulang kontainer secara otomatis:

```bash
# Opsi A: Live Auto-Rebuild saat file di-edit (Docker Compose Watch)
npm run docker:watch

# Opsi B: Setup Git Hook (Otomatis rebuild setiap "git commit" atau "git merge")
npm run setup:hooks

# Opsi C: Rebuild manual satu baris
npm run docker:rebuild
```

### 2. Cloud CI/CD (GitHub Actions)

Alur kerja CI/CD otomatis berjalan pada setiap `push` dan `pull request` ke branch `main`:
- **Automated Tests**: Menjalankan seluruh test suite (`npm test`) dan build check frontend.
- **Docker Image Build & Push**: Membangun Docker image dengan GitHub layer caching (`type=gha`) dan mempublikasikan otomatis ke GitHub Container Registry (`ghcr.io/tropicans/balapan:latest`).

