<!-- generated-by: gsd-doc-writer -->
# Getting Started with DGDash Racing System

Panduan langkah-demi-langkah bagi panitia dan pengembang untuk menyiapkan, menjalankan, dan mengoperasikan DGDash Racing System untuk pertama kali.

## Prerequisites

Sebelum memulai, pastikan perangkat keras dan lingkungan Anda memenuhi persyaratan berikut:
- **Node.js**: Versi `20.0.0` atau yang lebih baru (`node -v`)
- **NPM**: Versi `10.0.0` atau yang lebih baru
- **Docker & Docker Compose**: (Opsional, sangat direkomendasikan untuk turnamen di sirkuit)
- **Browser Web**: Google Chrome, Edge, Safari, atau Firefox modern yang mendukung HTML5 MediaDevices (Kamera) dan Web Audio API.

## Installation Steps

1. **Clone repositori**:
   ```bash
   git clone <repository-url>
   cd balapan
   ```

2. **Salin template konfigurasi lingkungan**:
   ```bash
   cp .env.example .env
   ```

3. **Install dependensi root (backend) dan frontend**:
   ```bash
   npm install
   npm --prefix client install
   ```

## First Run

### Opsi A: Menjalankan Menggunakan Docker (Rekomendasi Cepat)

Cara tercepat dan paling stabil adalah menjalankan kontainer produksi:

```bash
docker compose up -d --build
```

Setelah perintah selesai, sistem sudah aktif di:
- **Aplikasi Web**: [http://localhost:3050](http://localhost:3050)
- **Health Check**: [http://localhost:3050/api/health](http://localhost:3050/api/health)

### Opsi B: Menjalankan Menggunakan Node.js Lokal

Untuk pengujian cepat atau pengembangan tanpa Docker:

```bash
# 1. Build frontend client
npm run build

# 2. Jalankan server terintegrasi
npm start
```
Aplikasi akan aktif di **http://localhost:3000**.

## Panduan Alur Operasional Turnamen

1. **Buka Layar TV Sirkuit**:
   Buka `http://localhost:3050/tv` di monitor besar/TV arena balap dalam mode fullscreen (`F11`).
2. **Buka Meja Kasir**:
   Buka `http://localhost:3050/cashier` di PC/Tablet kasir untuk mendaftarkan paket kupon fisik 50-kotak pembalap.
3. **Buka Dasbor Marshal Start Box**:
   Buka `http://localhost:3050/marshal` di tablet panitia start box untuk input kontestan Jalur A, B, C dan pencatatan pemenang.
4. **Buka Komando Race Director**:
   Buka `http://localhost:3050/rd` untuk mengunci balapan, memicu countdown suara manusia, dan input waktu stopwatch.
5. **Buka Bagan Eliminasi**:
   Buka `http://localhost:3050/bracket` untuk memantau pemenang yang lolos tiket ke Babak 2 dan eliminasi hingga Grand Final.

## Common Setup Issues

### 1. Kamera HP Tidak Aktif saat Scan QR di IP LAN (`http://192.168.x.x`)
- **Penyebab**: Browser modern (Chrome/Safari) membatasi akses kamera (`getUserMedia`) hanya pada *Secure Context* (`localhost` atau `https://`).
- **Solusi**:
  1. Sistem telah dilengkapi dengan fallback input foto / manual selection jika kamera terblokir.
  2. Untuk mengaktifkan kamera penuh di jaringan lokal tanpa SSL, buka `chrome://flags/#unsafely-treat-insecure-origin-as-secure` di browser HP, masukkan URL LAN server (contoh: `http://192.168.1.100:3050`), lalu aktifkan (*Enabled*) dan restart browser.

### 2. Port Konflik (`EADDRINUSE: port 3000 / 3050`)
- **Penyebab**: Layanan lain di komputer menggunakan port yang sama.
- **Solusi**: Ubah nilai `HOST_PORT` di berkas `.env` (misal `HOST_PORT=3080`), lalu jalankan kembali `docker compose up -d`.

### 3. Masalah Izin Volume Docker di Linux
- **Penyebab**: Docker named volume memerlukan kepemilikan user `node` (UID 1000).
- **Solusi**: Dockerfile proyek telah mengonfigurasi `chown -R node:node /app/data`. Jika menggunakan bind-mount lokal, pastikan direktori data memiliki izin tulis untuk user non-root.

## Next Steps

- Pelajari arsitektur sistem di [ARCHITECTURE.md](ARCHITECTURE.md).
- Simak alur kerja pengembang di [DEVELOPMENT.md](DEVELOPMENT.md).
- Jalankan test otomatis dengan panduan di [TESTING.md](TESTING.md).
- Pelajari seluruh endpoint di [API.md](API.md).
- Konfigurasi environment di [CONFIGURATION.md](CONFIGURATION.md).
