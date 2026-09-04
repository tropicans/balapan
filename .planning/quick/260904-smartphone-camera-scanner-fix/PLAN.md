---
id: 260904-smartphone-camera-scanner-fix
slug: smartphone-camera-scanner-fix
date: 2026-09-04
status: complete
---

# Quick Plan: Fix Smartphone Camera QR Scanner

## Problem
Ketika aplikasi dibuka di smartphone (melalui Wi-Fi local network IP misalnya `http://192.168.x.x:5173`), kamera pemindai QR di Participant Dashboard tidak muncul / gagal terbuka.

### Akar Masalah:
1. **Insecure Context (HTTP LAN)**: Browser modern pada smartphone (Chrome Android & Safari iOS) membatasi `navigator.mediaDevices.getUserMedia` hanya pada Secure Context (`https://` atau `localhost`). Ketika diakses via IP LAN HTTP, `navigator.mediaDevices` bernilai `undefined`, memicu unhandled TypeError pada scanner.
2. **Library initialization**: Menggunakan `Html5QrcodeScanner` UI widget bawaan yang tidak mengkonfigurasi `facingMode: "environment"` secara otomatis untuk kamera belakang smartphone, dan tidak menangani error permission/koneksi secara informatif.
3. **Ketiadaan Fallback**: Tidak ada opsi pengambilan foto langsung (`capture="environment"`) yang dapat berjalan 100% pada HTTP tanpa memerlukan HTTPS.

## Tasks
1. [x] **Reproduction Test**: Buat unit test `server/tests/camera-scanner.test.js` untuk mereproduksi kegagalan konteks HTTP mobile dan validasi helper diagnostik.
2. [x] **Helper & Parsing**: Buat `client/src/utils/qrScannerHelper.js` untuk memeriksa dukungan kamera browser dan parsing format QR code yang fleksibel (URL query param, hash, kode jalur).
3. [x] **UI & Direct Camera Implementation**: Migrasi ke `Html5Qrcode` dengan rear camera constraint `{ facingMode: "environment" }`, tambah opsi "Ambil Foto QR (Kamera HP)" (`capture="environment"` via native phone camera), dan tampilkan kartu diagnostik ramah pengguna jika diakses via HTTP.
4. [x] **Vite Network Configuration**: Tambah `server.host: true` pada `client/vite.config.js`.
