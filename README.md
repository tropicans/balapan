# 🏎️ DGDash Racing System (Cyberpunk / Neo-Racing HUD)

Sistem manajemen turnamen digital nir-kertas (*paperless*) untuk sirkuit balap Tamiya Mini 4WD 3-jalur (*3-lane racetrack*) tanpa memerlukan hardware RFID fisik. Menggunakan teknologi *self-scanning* peserta (QR Code), sinkronisasi real-time berbasis WebSocket, dan kontrol terpusat oleh Race Director (RD).

---

## ⚡ Fitur Utama & Modul Sistem

### 1. 📱 Modul Peserta & Scan Jalur (Babak 1)
- **Dual-Track Registrasi**: Login Google / Akun Peserta Mandiri dengan pengaturan Racer Tag / Nama Tim (Maks 10 karakter, misal: `ANDI [RRT]`).
- **Scanner Kamera QR**: Scan stensil `LINE A`, `LINE B`, `LINE C` di meja lintasan.
- **Validasi Kupon & Optimistic Concurrency**: Memastikan saldo kupon $\ge 1$. Jika jalur sudah terisi atau balapan sudah berjalan, sistem otomatis mengalihkan peserta ke antrean Heat berikutnya.
- **Tombol "SIAP BALAP" Raksasa**: Mengisi 30% layar dengan konfirmasi getaran (*haptic vibration* via `navigator.vibrate`).
- **Tombol "BATAL / SALAH JALUR"**: Pengembalian kupon instan jika balapan masih berstatus *draft*. Begitu Race Director mengunci balapan, tombol batal otomatis dinonaktifkan di HP peserta.

### 2. 🎛️ Dasbor Komando Pusat (Race Director / RD)
- **Status 3 Jalur Real-Time**: Status *Grey* (Kosong), *Yellow* (Pending Scan), *Green* (Siap Balap dengan nama pembalap).
- **Tombol "KUNCI BALAPAN"**: Mengunci antrean lintasan, memotong 1 kupon permanen dari seluruh peserta pada heat tersebut, menonaktifkan tombol batal di HP peserta, dan memperbarui status Layar TV menjadi `READY - LINTASAN SIAP!`.
- **Panel Input Waktu Finish (Skenario B)**: Memasukkan waktu stopwatch track fisik (misal: `11.450` detik). Pemenang dengan waktu tercepat otomatis dikirim ke antrean Meja Scrutineer.
- **Panel Override RD**: RD dapat melakukan *assign* peserta manual/tamu, *force-ready*, atau *kick/reset* slot dengan refund kupon dalam 1 tap tanpa perlu mengetik keyboard.

### 3. 🛡️ Meja Pemeriksaan Fisik (Scrutineering - "Tanya Nama")
- **Mode Tablet Zero-Keyboard**: Menampilkan kartu pemenang heat yang menunggu verifikasi fisik mobil.
- **Aksi LOLOS (PASS)**: Mobil memenuhi regulasi $\rightarrow$ otomatis meloloskan pembalap ke Bracket Turnamen Babak Kedua (*Single Elimination*) tanpa perlu scan QR atau kupon lagi. Memperbarui papan Best Time Overall (BTO).
- **Aksi DISKUALIFIKASI (DQ)**: Membatalkan kemenangan dan mencabut dari papan rekor BTO.
- **Animasi Takeover Rekor BTO**: Jika catatan waktu merupakan yang tercepat hari itu, Layar TV otomatis menampilkan layar selebrasi emas *NEW RECORD BTO!* disertai sirene dan konfeti.

### 4. 💳 Dasbor Kasir Kupon (Assisted Track)
- **Tambah Peserta Tamu / Anak**: Mendaftarkan akun virtual (`guest101@tamiya.local`) secara instan dengan saldo awal kupon.
- **Top Up Kupon Kilat**: Tombol instan `+10`, `+50`, `+100` kupon atau input custom dengan pencarian cepat nama/tag peserta.

### 5. 📺 Layar TV Publik Sirkuit (16:9 Neo-Racing HUD)
- **Aesthetic Cyberpunk Cockpit HUD**: Tekstur carbon, scanline CRT, border neon glowing (*Neon Pink* Jalur A, *Electric Cyan* Jalur B, *Acid Green* Jalur C).
- **Status Bar Dinamis**: *MENUNGGU ANTRIAN* $\rightarrow$ *READY - LINTASAN SIAP!* $\rightarrow$ *BALAPAN BERLANGSUNG* $\rightarrow$ *VERIFIKASI MEJA*.
- **Kolom Kiri (60%)**: Blok raksasa Jalur A, B, C dengan nama pembalap dan display catatan waktu real-time.
- **Kolom Kanan (40%)**: Papan peringkat **Top 5 Best Time Overall (BTO)** dengan medali emas, perak, dan perunggu.
- **Footer Marquee**: Teks berjalan (*ticker*) menampilkan antrean heat selanjutnya secara real-time.

### 6. 🔊 Hitungan Mundur Suara Manusia Babak Kedua (Voice Countdown)
- Hitungan mundur 10 detik interaktif dengan suara manusia berbahasa Indonesia: *"Sepuluh... Sembilan... Delapan... Tujuh... Enam... Lima... Empat... Tiga... Dua... Satu!"*.
- Tombol **"SIAP / STOP SEKARANG"** dari RD: Menghentikan audio secara instan dan mengubah TV menjadi banner hijau berkedip `RACE READY - LEPAS!` serta memicu getaran serentak di HP peserta.
- **Bagan Turnamen Babak 2**: Pohon eliminasi dari Perempat Final (Quarterfinals) $\rightarrow$ Semifinal $\rightarrow$ Grand Final.

### 7. 🖨️ Stensil QR Code Meja Start
- Halaman cetak/display stensil siap pakai untuk `LINE A`, `LINE B`, dan `LINE C`.

---

## 🚀 Panduan Menjalankan Aplikasi

### Opsi 1: Menjalankan via Docker (Production Hardened — Direkomendasikan)
Sistem telah dilengkapi dengan *multi-stage Docker build* berbasis Alpine Linux yang aman, ringan (~80MB), non-root user (`node`), dan dilengkapi *Docker Healthcheck* otomatis.

```bash
# 1. Salin template konfigurasi environment (opsional)
cp .env.example .env

# 2. Build dan jalankan container production di latar belakang
npm run docker:up
# atau: docker compose up --build -d

# 3. Cek status kesehatan container (healthy)
docker compose ps

# 4. Pantau live server logs
npm run docker:logs
# atau: docker compose logs -f

# 5. Hentikan container secara aman (graceful shutdown)
npm run docker:down
# atau: docker compose down
```

Akses sistem di browser:
- **Aplikasi Web**: [http://localhost:3050](http://localhost:3050)
- **Health Check Monitor**: [http://localhost:3050/api/health](http://localhost:3050/api/health)
- **State Snapshot API**: [http://localhost:3050/api/state](http://localhost:3050/api/state)

> 💡 **Data Persistence**: Seluruh data SQLite dan histori turnamen disimpan secara persisten di Docker Named Volume `dgdash_racing_data` pada `/app/data/tamiya.sqlite`, sehingga data tetap aman meskipun container di-restart atau di-update.

### Opsi 2: Menjalankan secara Lokal (Node.js)
```bash
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Build frontend production
npm run build

# 3. Jalankan backend & frontend terintegrasi
npm start

# Atau mode development hot-reload:
# npm run dev
```

---

## 🧪 Pengujian Otomatis (Automated Test Suite)
Jalankan pengujian logika state machine, pemotongan kupon, konkurensi antrean, dan auto-bracket:
```bash
npm test
```

---

## 📐 Arsitektur & Teknologi
- **Frontend**: React 18, Vite, Tailwind CSS (Cyberpunk Theme), Lucide Icons, Canvas Confetti, Framer Motion, HTML5 QR Code.
- **Backend**: Node.js, Express, Socket.IO (Real-time Event Engine).
- **Database**: SQLite (Pure JS/WASM `sql.js` dengan persistensi file otomatis dan ACID transaction support).
- **Audio & Haptics**: Web Audio API Sound Synthesizer, Indonesian Speech Synthesis, Navigator Vibration API.
- **DevOps**: Multi-stage `Dockerfile`, `docker-compose.yml`.
