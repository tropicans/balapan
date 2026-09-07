<!-- generated-by: gsd-doc-writer -->
# 🏎️ DGDash Racing System (Cyberpunk / Neo-Racing HUD)

[![Version](https://img.shields.io/badge/version-2.0.0-ff0055.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-00f0ff.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-39ff14.svg)](package.json)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)

Sistem manajemen turnamen balap Tamiya Mini 4WD 3-jalur (*3-lane racetrack*) 100% web yang dirancang nir-kertas (*paperless*) dan bebas hardware RFID/NFC fisik dengan sinkronisasi real-time berbasis WebSocket, kupon fisik pre-printed, kontrol Race Director, dan broadcast HUD TV Sirkuit.

---

## ⚡ Modul & Fitur Utama

### 1. 📱 Modul Peserta & Scan Jalur (Kualifikasi Babak 1)
- **Registrasi Mandiri & Tamu**: Login nama tim/pembalap (maks 10 karakter, misal `ANDI [RRT]`).
- **Scanner Kamera QR Mobile**: Pindai stensil `LINE A`, `LINE B`, `LINE C` di meja lintasan dengan deteksi secure context.
- **Validasi Kupon & Optimistic Concurrency**: Memastikan saldo kupon $\ge 1$, otomatis mengalihkan peserta ke heat berikutnya bila slot terisi.
- **Tombol "SIAP BALAP" Raksasa & Batal**: Konfirmasi haptic touch; tombol batal otomatis terkunci saat balapan dikunci Race Director.

### 2. 🎛️ Dasbor Komando Pusat (Race Director / RD)
- **Monitoring Jalur Real-Time**: Status *Kosong*, *Pending Scan*, dan *Siap Balap* per jalur.
- **Kunci Balapan**: Debit otomatis 1 kupon per peserta, penguncian status race, dan sinkronisasi ke seluruh layar.
- **Stopwatch Input 3-Kolom**: Layout ergonomis sejajar Jalur A, B, C untuk memasukkan catatan waktu finish fisik.
- **Prosedur Pengecualian**: Tombol "SEMUA CO / DNF (No Winner)" dan "DEKLARASI RE-RACE" dengan free permit zero-debit.

### 3. 🛡️ Meja Pemeriksaan Fisik (Scrutineer — "Tanya Nama")
- **Antarmuka Tablet Zero-Keyboard**: Verifikasi fisik mobil pemenang heat (LOLOS / DQ).
- **Active Alert & Emergency Override**: Peringatan visual saat race dikunci dan tombol pengambilalihan darurat untuk auto-seeding bracket.
- **Rekor Best Time Overall (BTO)**: Pendar emas dinamis (*cyber shimmer*) dan confetti perayaan untuk rekor tercepat baru.

### 4. 💳 Meja Kasir & Paket Kupon Fisik (Cashier)
- **Registrasi Paket Kupon Pre-Printed**: Registrasi paket kupon 50-kotak dengan nomor seri barcode fisik unik anti-duplikasi.
- **Pencarian Kilat & Pelacakan Sisa Kuota**: Pelacakan kuota kupon aktif berdasarkan serial kupon atau nama peserta.
- **Emergency Void & Replacement**: Pembatalan lembar kupon rusak dan transfer sisa kuota ke serial pengganti.

### 5. 🏁 Dasbor Marshal Meja Start Box (`/marshal`)
- **Antarmuka Tablet Cepat (Touch Target 64px+)**: Pengisian cepat 3 kontestan via barcode scanner / pencarian instan.
- **Check-off Kupon Fisik & Atomic Debit**: Instruksi nomor kotak kupon yang harus dicoret panitia beserta toleransi koreksi undo 60 detik.
- **Eksekusi Bracket Eliminasi Babak 2**: Mode ganda untuk mencatat pemenang heat kualifikasi maupun pemenang pertandingan bracket eliminasi 1-tap.

### 6. 🏆 Bracket Eliminasi Berjenjang 3-Jalur (`/bracket`)
- **Skema 3-Jalur Berjenjang**: Mendukung turnamen skala besar (Babak 2, Babak 3, hingga Grand Final).
- **Auto-Advance 3:1**: Pemenang tiap heat otomatis melaju mengisi slot pertandingan babak berikutnya.
- **Filter & Navigasi**: Tab babak, pencarian nomor heat/pembalap/tim, dan filter status (Semua / Pending / Selesai).

### 7. 🎟️ Ticket Engine (Finish-to-Next-Round)
- **Penerbitan Tiket Otomatis**: Setiap mobil yang FINISH sah otomatis diterbitkan tiket babak berikutnya (`next_round_tickets`).
- **Sequential Bracket Seeding**: Tiket otomatis dialokasikan ke slot kosong bracket Babak 2 secara berurutan dan adil.
- **Kunci Kualifikasi**: Race Director dapat mengunci kualifikasi saat kuota tiket Babak 2 terpenuhi.

### 8. 📺 Layar TV Sirkuit Realtime HUD (16:9 Cyberpunk)
- **Status Antrean & Live Race**: Visualisasi cockpit futuristik Jalur A (Pink), B (Cyan), C (Green).
- **Ticket Quota Bar & Critical Pulse**: Status sisa kuota tiket Babak 2 dengan efek berkedip saat kritis ($\le 4$ tiket).
- **Running Ticker Marquee**: Teks berjalan menampilkan daftar pembalap yang lolos tiket Babak 2.
- **Holographic Gold Celebration Modal**: Pop-up selebrasi fullscreen saat pembalap baru mengamankan tiket Babak 2.
- **Suara Manusia & Countdown Overlay**: Hitung mundur dramatis 10 detik bahasa Indonesia sinkron dengan visual.

---

## 🗺️ Peta Navigasi Rute

| Rute URL | Layar / Peran | Deskripsi |
|----------|---------------|-----------|
| `/` | Peserta (Participant) | Pendaftaran jalur, scan QR kamera HP, konfirmasi siap balap |
| `/rd` | Race Director | Kontrol start, stopwatch finish, status jalur, re-race, kunci kualifikasi |
| `/scrutineer` | Scrutineer | Verifikasi fisik mobil pemenang, status LOLOS/DQ, BTO override |
| `/cashier` | Kasir (Cashier) | Registrasi paket kupon 50-kotak, topup kupon digital, void kupon |
| `/marshal` | Marshal Meja Start | Rapid line-up kontestan, pencatatan pemenang, check-off nomor kupon |
| `/bracket` | Bagan Eliminasi | Manajemen dan monitoring bracket turnamen 3-jalur multi-round |
| `/tv` | Layar TV Sirkuit | Tampilan publik 16:9 HUD, papan BTO, ticket bar, countdown overlay |
| `/stencil` | Stensil Meja Lintasan | Format cetak QR Code meja start untuk Jalur A, Jalur B, Jalur C |

---

## 🚀 Panduan Instalasi & Menjalankan

### Kebutuhan Sistem
- **Node.js**: `>= 20.0.0`
- **Docker & Docker Compose** (opsional, direkomendasikan untuk deployment sirkuit)

### Opsi 1: Menjalankan via Docker Compose (Direkomendasikan)
```bash
# 1. Salin konfigurasi environment
cp .env.example .env

# 2. Build dan jalankan container produksi
docker compose up -d --build

# 3. Cek status container (healthy)
docker compose ps
```
Aplikasi aktif di: **[http://localhost:3050](http://localhost:3050)**

### Opsi 2: Menjalankan secara Lokal
```bash
# 1. Install dependencies server & client
npm install
npm --prefix client install

# 2. Build bundle frontend produksi
npm run build

# 3. Jalankan server
npm start

# Atau jalankan mode development (hot-reload client & server):
npm run dev
```

---

## 🧪 Menjalankan Pengujian (Testing)

Jalankan seluruh rangkaian test otomatis logika turnamen, API, tiket, scanner, dan rendering antarmuka:
```bash
npm test
```

---

## 📚 Dokumentasi Lengkap

- [Arsitektur Sistem (ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Panduan Mulai Cepat (GETTING-STARTED.md)](docs/GETTING-STARTED.md)
- [Panduan Pengembangan (DEVELOPMENT.md)](docs/DEVELOPMENT.md)
- [Spesifikasi & Panduan Testing (TESTING.md)](docs/TESTING.md)
- [Konfigurasi & Variabel Lingkungan (CONFIGURATION.md)](docs/CONFIGURATION.md)
- [Dokumentasi REST & WebSocket API (API.md)](docs/API.md)
- [Panduan Deployment Sirkuit & Docker (DEPLOYMENT.md)](docs/DEPLOYMENT.md)

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi ISC.
