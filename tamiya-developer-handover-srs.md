# SOFTWARE REQUIREMENT SPECIFICATION (SRS)
## Project Name: "NEO-TAMIYA" Racing System
## Prepared For: Antigravity Coding Team
**Document Version:** 1.0 (Final Handover Specification)  
**Target Platform:** 100% Web-Based (Responsive Mobile & Desktop HUD)  
**UI/UX Theme:** Cyberpunk / Neo-Racing (High-Contrast Neon-on-Dark)

---

## 1. PENDAHULUAN & ARSITEKTUR UTAMA

Sistem ini dirancang untuk mendigitalisasi turnamen balap Tamiya secara *paperless* dan *frictionless*, menghilangkan 100% ketergantungan pada hardware RFID/NFC fisik yang mahal. 

### Arsitektur Sistem
*   **Backend Server**: Node.js (Express) atau Python (FastAPI) dengan dukungan **WebSocket (Socket.io)** wajib untuk komunikasi waktu-nyata (*real-time* latency < 50ms).
*   **Database**: PostgreSQL atau MySQL untuk konsistensi data transaksi (ACID Compliant).
*   **Frontend**: React.js, Vue.js, atau HTML5/TailwindCSS murni dengan rendering responsif.
*   **Metode Autentikasi**: Google OAuth 2.0 (Google Sign-In) sebagai metode login instan bawaan tanpa email/password tradisional.

---

## 2. AKSES PENGGUNA (USER ROLES & PERMISSIONS)

Aplikasi memiliki **3 Peran Digital Utama** di dalam sistem, serta mendukung **1 Peran Fisik** di lintasan tanpa gadget:

```
+---------------------------------------------------------------------------------------------------+
|                                     SISTEM UTAMA (DATABASE & SERVER)                              |
+-------------------+--------------------------------+----------------------------+-----------------+
                    |                                |                            |
                    ▼                                ▼                            ▼
          [ 1. PESERTA (HP) ]            [ 2. RACE DIRECTOR (Laptop) ]     [ 3. SCRUTINEER (Tablet) ]
          - Google Sign-In               - Pusat kendali turnamen          - Verifikasi mobil pemenang
          - Scan QR Jalur                - Input waktu balapan             - Lolos/DQ sekali ketuk
          - Konfirmasi "Siap Balap"      - Trigger countdown 10s           - Auto-bracket babak kedua
          - Pantau Saldo Kupon           - Hak override darurat            - Nol QR Code di meja
```

1.  **Peserta (Participant)**: Akses via HP pribadi. Berfungsi untuk registrasi mandiri, memantau saldo kupon, melakukan scan QR antrean jalur, menekan tombol kesiapan balap, serta memantau jadwal bagan dan peringkat *Best Time Overall* (BTO).
2.  **Admin Utama / Race Director (RD)**: Akses via Laptop/Desktop di pusat komando sirkuit. Memiliki kendali penuh untuk pendaftaran kasir manual, pengisian kupon peserta, mengunci *race* kualifikasi, menginput hasil catatan waktu, dan mengontrol pemicu serta interupsi *countdown* Babak Kedua.
3.  **Juri Pemeriksa (Scrutineer)**: Akses via Tablet di meja pemeriksaan fisik. Berfungsi memantau daftar pemenang, melakukan pemeriksaan kelayakan regulasi mobil secara fisik, serta menetapkan keputusan "Lolos" atau "DQ".
4.  **Juri Start / Marshal (Physical-Only)**: **Bebas gadget 100%**. Berfokus penuh di dekat box start untuk menyelaraskan mobil secara fisik dan melepaskannya menggunakan **Timer Fisik Standalone (Offline)**.

---

## 3. ALUR KERJA DETAIL (FUNCTIONAL WORKFLOWS)

### A. Registrasi Jalur Ganda & Top-Up Kupon (Dual-Track Registration)
Sistem memisahkan pendaftaran menjadi dua metode untuk mencegah penumpukan antrean kasir:

```
[Mulai Registrasi]
       │
       ├─► [Jalur 1: Mandiri] ──► Scan QR Banner Sirkuit ──► Google Sign-In ──► Set Nama Tim ──► Aktif!
       │
       └─► [Jalur 2: Terbantu] ──► Kasir Input Manual ──► Auto-Email Dummy ──► Aktif (Tanpa HP)!
```

1.  **Jalur 1: Mandiri (Self-Service) — *Rekomendasi Utama (90% Pembalap)***
    *   Peserta memindai QR Code pendaftaran yang terpajang di banner sirkuit.
    *   Aplikasi terbuka di browser HP. Peserta mengeklik tombol **"Masuk dengan Google"**.
    *   Sistem menyinkronkan profil Google secara instan tanpa OTP atau sandi.
    *   Peserta mengisi kolom singkat: **Nama Tim / Singkatan Nama Pembalap** (Maksimal 10 karakter, contoh: `ANDI [RRT]`). Profil aktif dengan kupon = 0.
2.  **Jalur 2: Terbantu (Bagi Peserta Lansia/Anak-anak/Tanpa HP)**
    *   Peserta mendatangi meja kasir.
    *   Kasir membuka menu **"Tambah Peserta Baru (Manual/Tamu)"** di dasbor pusat.
    *   Kasir menginput Nama Pembalap dan Tim.
    *   Sistem membuatkan akun dengan **Email Virtual / Dummy** secara otomatis (misalnya: `tamu102@tamiya.local`) agar riwayat tanding tersimpan sah di database.
3.  **Top-up Saldo Kupon (Kassa)**
    *   Peserta melakukan pembayaran tunai/QRIS ke kasir.
    *   Kasir mencari Nama/Tim peserta di dasbor, lalu memasukkan jumlah kupon (contoh: `+50 Kupon`). Sisa kupon peserta langsung ter-update di database dan layar HP peserta secara *real-time*.

---

### B. Babak Pertama (Kualifikasi & Antrean Bebas)
Pembalap secara mandiri mengantre dan memilih jalur balap menggunakan sistem QR Code:

1.  **Memasuki Antrean (*Waiting Zone*)**: 
    *   Peserta berdiri di dekat jalur fisik sirkuit yang kosong (Jalur A, B, atau C).
    *   Peserta memindai QR Code fisik yang ditempel di masing-masing meja antrean jalur (contoh: QR Code stiker "JALUR A").
2.  **Pencegahan Balapan Ganda (Race Condition - DB Lock)**:
    *   Jika dua peserta memindai QR jalur yang sama pada milidetik yang sama, sistem harus melakukan *Database Transaction Lock* (ACID).
    *   Pemindai pertama berhasil masuk slot. Pemindai kedua otomatis digeser secara halus ke nomor *race* berikutnya dengan notifikasi: *"Jalur ini baru saja terisi, Anda otomatis dipindahkan ke nomor Race selanjutnya."*
3.  **Konfirmasi "Siap Balap" & Potong Kupon**:
    *   Layar HP peserta menampilkan konfirmasi: *"Anda terdaftar di Jalur A untuk Race ini. Saldo kupon terpotong 1 poin."*
    *   Peserta menekan tombol hijau raksasa **"SIAP BALAP"**. Status jalur di TV sirkuit berubah menjadi **READY** (Hijau).
4.  **Tombol Batal Mandiri**:
    *   Jika salah memindai, sebelum balapan dikunci oleh Race Director, peserta bisa menekan tombol merah raksasa **"Batal / Salah Jalur"** di HP.
    *   Sistem mengembalikan saldo kupon (+1) dan mengosongkan jalur di sistem.

---

### C. Pusat Komando Race Director (Admin Utama) & Pelepasan Start
Kontrol digital turnamen dipusatkan sepenuhnya di laptop kontrol Race Director (RD):

```
[Peserta Terisi A, B, C] ──► [RD klik "KUNCI BALAPAN"] ──► HP Peserta Kunci (Tombol Batal Hilang)
                                                                     │
[Mobil Lepas & Finish] ◄── [Marshal Picu Timer Offline] ◄─── TV Sirkuit Tampil "READY"
```

1.  **Kunci Balapan (Locking State)**:
    *   Begitu melihat baris jalur di layar kontrol pusat sudah terisi penuh (atau terisi seadanya saat sirkuit sepi), RD mengeklik tombol **"KUNCI BALAPAN"**.
    *   Sistem mengubah status balapan menjadi `PRE-START` lalu `LOCKED`.
    *   Seketika, tombol "Batal" di HP peserta **hilang secara instan** dan saldo kupon mereka resmi didebit di database.
    *   Layar TV sirkuit berkedip hijau menampilkan tulisan raksasa: **"READY - LINTASAN SIAP!"**.
2.  **Pelepasan Mobil**:
    *   Marshal di box start yang melirik layar TV sirkuit langsung menata mobil di lintasan.
    *   Marshal menekan tombol fisik **Timer Standalone / Offline** (Christmas Tree start lights) sirkuit untuk memulai hitung mundur offline (*3... 2... 1... GO!*).
    *   Marshal melepas ketiga mobil secara adil tepat saat lampu hijau timer menyala.

---

### D. Input Hasil Catatan Waktu (Skenario B - Semi Manual & Anti-Error)
Untuk menekan biaya hardware integrasi IoT dan menjamin akurasi 100%:

1.  **Pencatatan Waktu**: Balapan selesai. Catatan waktu putaran (3 lap penuh) muncul di layar LED fisik sirkuit.
2.  **Input Manual oleh Admin**: 
    *   Admin Utama / Juri Finish melihat layar LED fisik, lalu mengetik catatan waktu di kolom waktu pada laptop kontrol (contoh Jalur A: `11.450`).
    *   Nama pembalap (Andi) sudah otomatis terikat di kolom Jalur A sejak pemindaian QR di awal, sehingga Admin **tidak perlu mengetik nama pembalap**, hanya angkanya saja.
3.  **Klarifikasi Crash / CO**: Jika semua mobil keluar lintasan (Crash/Course Out), Admin cukup mengeklik satu tombol merah besar: **"SEMUA CO / DNF (No Winner)"**. Balapan ditutup, slot pemenang dikosongkan, namun kupon kualifikasi para peserta tetap hangus secara regulasi.
4.  **Konfirmasi Pemenang**: Setelah angka diinput, Admin mengeklik tombol **"Kirim ke Scrutineer"**.

---

### E. Meja Pemeriksaan (Scrutineering) — *Sistem "Tanya Nama" Tanpa QR*
Menghilangkan kerepotan memindai QR Code di meja pemeriksaan fisik yang sibuk:

1.  **Pencocokan Verbal**: Pemenang membawa mobilnya ke meja juri. Juri bertanya: *"Nama siapa, Mas?"*. Peserta menjawab: *"Andi"*.
2.  **Auto-Suggest & Keamanan Tinggi**:
    *   Layar tablet juri secara bawaan **hanya menampilkan 1 hingga 3 nama pemenang yang baru saja menyelesaikan race** dan status pemeriksaannya masih *pending*.
    *   Juri cukup menyentuh kartu nama **"Andi"** yang terpampang besar di layar tablet.
    *   Jika pembalap yang kalah mencoba memotong antrean dan berbohong menyebutkan namanya, namanya tidak akan muncul di opsi layar juri, sehingga manipulasi hasil terdeteksi secara otomatis.
3.  **Keputusan Pemeriksaan**:
    *   **Opsi A: LOLOS (Pass)**: Juri mengeklik tombol **"Lolos Scrutineer"**.
        *   *Dampak*: Catatan waktu Andi resmi masuk ke database. Jika catatan waktu tersebut merupakan yang tercepat, sistem secara otomatis meng-update papan peringkat **Best Time Overall (BTO)** di layar TV utama sirkuit. Pada Babak Kedua, nama Andi otomatis diposisikan ke dalam Bagan Turnamen (Bracket) secara *real-time*.
    *   **Opsi B: DISKUALIFIKASI (DQ)**: Juri mengeklik tombol **"Diskualifikasi (DQ)"**.
        *   *Dampak*: Peserta ditandai gugur. Saldo kupon kualifikasi tetap hangus terpotong. Catatan waktu mereka dianulir dan dihapus secara otomatis dari papan peringkat BTO.

---

### F. Babak Kedua (Sistem Gugur / Tournament Bracket)
Pada Babak Kedua, sirkulasi tidak lagi menggunakan kupon atau scan QR. Bagan berjalan otomatis:

1.  **Skema Bagan Otomatis (Bracket Auto-Placement)**:
    *   Peserta yang dinyatakan lolos dari babak kualifikasi kualifikasi otomatis ditempatkan pada posisi bagan (*bracket tree*) babak gugur.
    *   Peserta cukup memantau posisi tanding dan lawan mereka (misalnya: *Andi vs Budi di Race 1 Babak Kedua*) melalui TV utama sirkuit atau layar HP mereka.
2.  **Sistem Countdown Suara Manusia (10 s.d. 1)**:
    *   Di dasbor pusat, Race Director memiliki tombol: **"MULAI COUNTDOWN"**, **"RESET/COUNTDOWN KE-2"**, dan **"SIAP / STOP SEKARANG"**.
    *   Saat pembalap dipanggil ke box start, RD mengeklik **"Mulai Countdown"**.
    *   Layar TV sirkuit menampilkan angka hitung mundur raksasa **10 s.d 1** berlatar merah.
    *   Audio sirkuit memutar rekaman **suara manusia asli menghitung mundur secara tegas dari "Sepuluh" s.d. "Satu"** secara berurutan dan sinkron untuk membangun atmosfer ketegangan yang dramatis dan realistis di sirkuit (menggantikan bunyi bip sintetis biasa). HP peserta yang bertanding akan ikut bergetar berkala (*haptic feedback*) seirama hitungan.
3.  **Interupsi & Pengulangan (Reset & Early Stop)**:
    *   **Interupsi Berhenti Awal (Stop Early)**: Jika ketiga pembalap ternyata sudah meletakkan mobilnya secara rapi di box start sebelum hitungan mundur selesai (misalnya pada detik ke-5), RD mengeklik tombol **"SIAP / STOP SEKARANG"**. Countdown visual dan audio suara manusia otomatis berhenti seketika, layar TV langsung berubah hijau menampilkan status **"READY"**, memberi tanda ke Marshal untuk segera melepas mobil.
    *   **Reset Darurat (Max 2x Countdown)**: Jika salah satu peserta mengalami kendala teknis (misal ban copot di box start) dan juri menyepakati penundaan, RD mengeklik tombol **"RESET/COUNTDOWN KE-2"**. Sistem mengulang hitungan mundur suara manusia kembali ke angka 10.

---

### G. Alur Penanganan Balap Ulang (Re-Race)
Jika terjadi insiden eksternal tidak sah di tengah perlombaan (tabrakan puing, trek rusak):

1.  RD mengeklik tombol **"DEKLARASI RE-RACE"** pada laptop kontrol.
2.  Sistem menampilkan jendela pop-up daftar pembalap aktif di *race* tersebut beserta kotak centang (*checkbox* jalur):
    *   `[ ] Jalur A: [Nama Peserta A]`
    *   `[ ] Jalur B: [Nama Peserta B]`
    *   `[ ] Jalur C: [Nama Peserta C]`
3.  RD mencentang jalur mana saja yang berhak melakukan balap ulang (bisa 1 peserta saja, 2 peserta, atau seluruh peserta).
4.  **Bebas Kupon & Tanpa Scan Ulang**: Sistem **tidak mendebit kupon baru** bagi peserta terpilih, dan mereka **tidak perlu mengeluarkan HP untuk melakukan scan QR lagi**. Status jalur terpilih di sistem otomatis di-reset menjadi *ready*, dan RD tinggal memicu kembali pelepasan balap ulang.

---

## 4. FILOSOFI UI/UX & PANDUAN VISUAL (CYBERPUNK / NEO-RACING)

Antarmuka seluruh aplikasi wajib mengadopsi estetika **Cyberpunk / Neo-Racing** dengan tingkat keterbacaan tinggi di sirkuit:

```
+----------------------------------------------------------------------------------------+
|                                  PANDUAN DESIGN TEMA                                   |
+----------------------------------------------------------------------------------------+
|                                                                                        |
|  [BG: Midnight Obsidian (#0a0b10)]   ──► Gelap, hemat baterai, pola serat karbon        |
|                                                                                        |
|  [JALUR A: Neon Pink (#ff0055)]      ──► Glowing neon magenta                          |
|                                                                                        |
|  [JALUR B: Electric Cyan (#00f0ff)]  ──► Glowing ice blue                              |
|                                                                                        |
|  [JALUR C: Neon Green (#39ff14)]     ──► Glowing acid green                            |
|                                                                                        |
|  [BUTTONS: 45-Degree Angular Cuts]   ──► Sudut tajam bergaya militer/HUD               |
|                                                                                        |
|  [TYPOGRAPHY: Orbitron / Monospaced] ──► Angka presisi tinggi gaya telemetri F1        |
|                                                                                        |
+----------------------------------------------------------------------------------------+
```

### A. Palet Warna Utama (Neo-Racing Palette)
*   **Latar Belakang**: *Midnight Obsidian* (`#0a0b10` s.d. `#0e1017`) dengan tambahan pola tekstur serat karbon halus (*carbon fiber*) semi-transparan.
*   **Aksen Jalur Pendar (Glowing Neon Lines)**:
    *   *Jalur A (Line A)*: **Cyberpunk Neon Pink / Magenta** (`#ff0055`) dengan bayangan pendar berpendar (*neon glow shadow*).
    *   *Jalur B (Line B)*: **Electric Cyan / Ice Blue** (`#00f0ff`) dengan efek berpendar.
    *   *Jalur C (Line C)*: **Acid Neon Green / Lime** (`#39ff14`) dengan efek berpendar.
*   **Peringatan / Status Menunggu**: **Chamber Amber / Neon Orange** (`#ffaa00`).

### B. Tipografi & Gaya HUD (Heads-Up Display)
*   **Font Judul & Angka**: Menggunakan font monospaced futuristik seperti **Orbitron** atau **Share Tech Mono**. Angka-angka catatan waktu dan countdown harus terlihat seperti instrumen dasbor mobil balap *hypercar* (*telemetry style*).
*   **Bentuk Tombol & Kartu**: Menghindari sudut membulat (*rounded corners*). Gunakan potongan sudut tajam 45 derajat (*angular tech cuts / chamfered corners*).
*   **Layar TV Utama sirkuit**: Dihiasi dengan garis pindai horizontal (*scanlines*) semi-transparan tipis dan pola kisi-kisi nirkabel halus (*grids HUD*) sebagai ornamen estetika.

### C. Desain Tombol "Anti-Clutter" di HP Peserta
*   Tombol aksi kritis **"SIAP BALAP"** (Hijau Neon) dan **"BATAL / SALAH JALUR"** (Merah Neon) dibuat berukuran raksasa (mencakup minimal 30% area layar HP) agar mudah ditekan menggunakan jempol pembalap yang sedang gemetar atau kotor terkena minyak ban.
*   Teks instruksi panjang dilarang keras dipajang di layar HP pembalap. Hanya tampilkan informasi tebal berukuran besar: **NOMOR RACE (RACE 15)**, **JALUR TERPILIH (LINE B)**, dan **SISA KUPON (KUPON: 12)**.

---

## 5. SKEMA DATABASE RELASIONAL (DATABASE SCHEMA)

Berikut adalah struktur tabel SQL teroptimasi yang wajib diimplementasikan untuk mendukung seluruh fungsionalitas di atas:

### 1. Tabel `users` (Data Pengguna)
Mencatat seluruh data akun pembalap, kasir, dan admin utama:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Nama lengkap / Nama pendaftaran
    nickname VARCHAR(10) DEFAULT NULL, -- Nama pendek sirkuit (Maks 10 karakter, contoh: 'ANDI [RRT]')
    email VARCHAR(255) UNIQUE NOT NULL, -- Email Google untuk Google Sign-In, atau Email Dummy (.local)
    google_sub_id VARCHAR(255) DEFAULT NULL, -- ID sub unik dari Google Auth OAuth 2.0
    role VARCHAR(50) DEFAULT 'participant', -- ENUM: 'admin', 'scrutineer', 'participant'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_google_sub ON users(google_sub_id);
```

### 2. Tabel `coupons` (Saldo Kupon Babak 1)
Mengelola sisa jatah kualifikasi peserta:
```sql
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    balance INT DEFAULT 0, -- Sisa saldo e-coupon aktif kualifikasi
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Tabel `races` (Data Putaran Balap)
Mencatat informasi status keseluruhan putaran balapan aktif:
```sql
CREATE TABLE races (
    id SERIAL PRIMARY KEY,
    race_number INT NOT NULL, -- Nomor urutan race sirkuit (misal: Race 15)
    status VARCHAR(50) DEFAULT 'draft', -- ENUM: 'draft', 'pre-start', 'locked', 'completed'
    winner_id INT REFERENCES users(id) ON DELETE SET NULL, -- Juara race kualifikasi ini
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_races_status ON races(status);
```

### 4. Tabel `race_registrations` (Registrasi Detail Jalur & Scrutineer)
Menghubungkan peserta dengan nomor race, pembagian jalur, hasil waktu, dan validasi pemeriksaan fisik:
```sql
CREATE TABLE race_registrations (
    id SERIAL PRIMARY KEY,
    race_id INT REFERENCES races(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    lane VARCHAR(5) NOT NULL, -- ENUM: 'A', 'B', 'C'
    status VARCHAR(50) DEFAULT 'pending', -- ENUM: 'pending', 'ready' (setelah klik Siap Balap)
    finish_time DECIMAL(6,3) DEFAULT NULL, -- Format pencatatan waktu putaran (misal: 11.450)
    scrutineer_status VARCHAR(50) DEFAULT 'pending', -- ENUM: 'pending', 'pass', 'disqualified'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_unique_race_lane ON race_registrations(race_id, lane); -- Cegah race condition duplikasi jalur
```

### 5. Tabel `bracket_matches` (Bagan Babak Kedua - Sistem Gugur)
Mengelola pohon turnamen sistem gugur dan penempatan kontestan otomatis:
```sql
CREATE TABLE bracket_matches (
    id SERIAL PRIMARY KEY,
    round_number INT NOT NULL, -- Babak keberapa (misal: Babak Gugur 1, Perempat Final, Semifinal, Final)
    match_number INT NOT NULL, -- Nomor pertandingan di babak tersebut
    user_id_1 INT REFERENCES users(id) ON DELETE SET NULL, -- Slot Kontestan Jalur A
    user_id_2 INT REFERENCES users(id) ON DELETE SET NULL, -- Slot Kontestan Jalur B
    user_id_3 INT REFERENCES users(id) ON DELETE SET NULL, -- Slot Kontestan Jalur C (jika 3-lane bracket)
    winner_id INT REFERENCES users(id) ON DELETE SET NULL, -- Pemenang yang lolos scrutineer
    parent_match_id INT REFERENCES bracket_matches(id) ON DELETE SET NULL, -- Relasi ke pertandingan lanjutan di babak atasnya
    status VARCHAR(50) DEFAULT 'scheduled' -- ENUM: 'scheduled', 'live', 'completed'
);
```

---

## 6. LOGIKA TRANSISI NEGARA (STATE MACHINE & WEBSOCKET EVENTS)

Demi mencegah eksploitasi pembatalan kualifikasi, backend wajib mengimplementasikan transisi status yang ketat menggunakan WebSocket:

```
[Status: DRAFT] ──► (Peserta klik "Batal") ──► Saldo Kembali, Slot Kosong di Layar TV sirkuit.
       │
 (Race Director klik "KUNCI BALAPAN")
       ▼
[Status: PRE-START] ──► Kirim Event 'LOCK_UI' via WebSocket ke HP peserta ──► Tombol "Batal" disembunyikan.
       │
 (Marshal lepas mobil & selesai finish)
       ▼
[Status: LOCKED] ──► Antarmuka terkunci total, Admin menginput data catatan waktu.
       │
 (Juri Scrutineer klik "Lolos / DQ")
       ▼
[Status: COMPLETED] ──► Saldo kupon kualifikasi resmi terpotong permanen di tabel coupons.
```

### Saluran Komunikasi Real-time (WebSocket Channels):
1.  `join_race_room(race_id)`: Peserta, TV, dan Admin bergabung ke dalam ruangan WebSocket khusus sesuai nomor race berjalan.
2.  `update_lane_status`: Dikirimkan dari HP peserta ke server setiap kali terjadi scanning atau klik tombol kesiapan, untuk memperbarui tampilan TV sirkuit secara instan tanpa memuat ulang browser.
3.  `trigger_lock`: Dikirimkan oleh server ke seluruh klien di ruangan saat RD mengunci balapan untuk mematikan tombol interaksi peserta.
4.  `trigger_countdown_voice`: Dikirimkan oleh server untuk menyinkronkan pemutaran audio hitung mundur suara manusia di TV sirkuit dan memicu getaran berkala di HP peserta yang bertanding.

---
