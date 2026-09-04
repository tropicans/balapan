---
id: 260904-smartphone-camera-scanner-fix
slug: smartphone-camera-scanner-fix
date: 2026-09-04
status: complete
---

# Quick Task Summary: Fix Smartphone Camera QR Scanner

## What Was Done
1. **Dibuat Test Reproduksi & Diagnostik** (`server/tests/camera-scanner.test.js`):
   - Mereproduksi skenario pembukaan kamera di smartphone via insecure HTTP LAN (`isSecureContext = false`, `navigator.mediaDevices = undefined`).
   - Memvalidasi pendeteksian dini agar aplikasi tidak crash dan memberikan solusi yang jelas.
   - Memvalidasi parsing berbagai variasi teks QR Code (huruf tunggal, prefix 'LINE X'/'LANE_X', query string URL `?lane=B`, dsb).
2. **Dibuat Scanner Helper** (`client/src/utils/qrScannerHelper.js`):
   - Menyediakan `checkCameraSupport()` untuk mengecek kesiapan live kamera vs insecure context.
   - Menyediakan `parseLaneCode()` yang tahan banting terhadap berbagai format payload QR Code.
3. **Penyempurnaan UI Pemindai di Participant Dashboard** (`client/src/screens/ParticipantDashboard.jsx`):
   - Beralih dari widget bawaan `Html5QrcodeScanner` ke low-level API `Html5Qrcode` dengan direct rear-camera constraint `{ facingMode: "environment" }`.
   - Menambahkan **Solusi Instan untuk Smartphone HTTP**: Tombol **"AMBIL FOTO QR (KAMERA HP)"** menggunakan native input `<input type="file" capture="environment">` yang langsung membuka kamera bawaan smartphone untuk memotret QR Code meja dan didecode via Canvas tanpa memerlukan koneksi HTTPS.
   - Menambahkan kartu diagnostik Cyberpunk ramah pengguna jika browser menolak izin kamera atau dibuka via HTTP non-secure origin.
   - Menjaga tombol simulator 1-tap (LINE A, LINE B, LINE C) tetap mudah diakses.
4. **Konfigurasi Vite Network** (`client/vite.config.js`):
   - Menambahkan `server.host: true` sehingga Vite otomatis membuka port pada `0.0.0.0` untuk akses LAN smartphone.
5. **Verifikasi**:
   - `npm test` menjalankan kedua test suite (`race-flow.test.js` dan `camera-scanner.test.js`) dengan hasil lulus 100%.
   - `npm run build` berhasil dikompilasi tanpa error.
