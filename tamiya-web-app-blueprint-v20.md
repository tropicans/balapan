# CETAK BIRU APLIKASI WEB BALAP TAMIYA DIGITAL V20
## Sistem Turnamen Paperless Teroptimasi (Nol Biaya RFID, Timer Standalone, Fast UX & Cyberpunk/Neo-Racing UI)

Dokumen ini merinci arsitektur, alur kerja, logika sistem, filosofi UI/UX, dan skema basis data untuk **Sistem Balap Tamiya Digital berbasis Web App**. Sistem ini dirancang sebagai alternatif mandiri yang tangguh, mempertahankan seluruh efisiensi paperless dan otomatisasi waktu-nyata, namun **menghilangkan 100% ketergantungan pada hardware RFID/NFC fisik** guna meminimalkan biaya operasional sirkuit di seluruh Indonesia.

---

## 1. Arsitektur Sistem (100% Web-Based)

Sistem ini beroperasi sepenuhnya di atas komputasi awan (*cloud-based*) atau server lokal yang diakses via peramban web (*browser*). Tidak diperlukan instalasi aplikasi melalui Play Store atau App Store, sehingga kompatibel dengan semua jenis perangkat (Android, iOS, Windows, macOS).

*   **Platform Peserta**: Web App Responsif (Mobile-friendly).
*   **Platform Juri Teknis (Scrutineer)**: Web App Responsif (dioptimalkan untuk Tablet/HP murah).
*   **Platform Admin Utama / Race Director (RD)**: Dasbor Desktop (Laptop/PC Panitia di Pusat Komando).
*   **Layar Publik**: Tampilan Klasemen & Status Balapan (di-render ke Layar TV/Monitor besar sirkuit menggunakan Google Chromecast atau koneksi kabel HDMI).

---

## 2. Alur Pengguna Mendalam (User Workflows)

### A. Alur Peserta & Pendaftaran (Participant & Registration Flow)
```
[Registrasi Mandiri via HP] ──> [Masuk Sekali Ketuk via Akun Google (Google Sign-In)] 
                                                                 │
[Pantau Giliran & Status di HP/TV] <── [Tunggu Giliran Balap] <──┴── [Beli/Top-Up Saldo Kupon di Kasir]
          │
[Scan QR Code Jalur Antrean (A/B/C)] ──> [Tekan "Siap Balap"] ──> (Sistem Potong Kupon & Update TV)
          │                                      │
          │ <── (Salah Jalur? Tekan "BATAL" sebelum Balapan Dikunci)
          ▼
[Mobil Lepas & Finish] ──> [Pantau Update Waktu & Jadwal Berikutnya secara Real-Time]
```

Sistem dirancang untuk mengeleminasi kemacetan antrean di meja pendaftaran sirkuit melalui dual-track registration flow yang sangat cepat, praktis, dan 100% paperless:

#### Jalur 1: Pendaftaran Mandiri HP (Self-Service) — Sangat Direkomendasikan (90% Pembalap)
Untuk peserta yang melek teknologi dan membawa smartphone pribadi, pendaftaran diselesaikan secara mandiri dalam waktu kurang dari 10 detik tanpa perlu antre panjang:
1.  **Pindai QR Pendaftaran**: Di area sirkuit, panitia memajang banner berdesain Cyberpunk futuristik dengan kode QR besar: **"SCAN UNTUK MENDAFTAR (NOL ANTRI)"**.
2.  **Masuk Satu Langkah (One-Tap Google Sign-In)**: Begitu memindai QR, HP peserta akan membuka peramban Web App. Peserta cukup mengetuk tombol **"Masuk dengan Google"**. Sistem otomatis menyinkronkan nama lengkap, email, dan foto profil mereka secara instan dari akun Google tanpa perlu mengetik sandi atau menunggu kode OTP.
3.  **Kustomisasi Profil Tamiya**: Peserta hanya perlu mengisi satu kolom opsional yang sangat krusial bagi balap Tamiya: **Nama Tim / Singkatan Nama Pembalap** (Maksimal 10 karakter, contoh: `ANDI [RRT]`) untuk mempermudah identifikasi nama mereka di layar TV sirkuit.
4.  **Top-Up Saldo e-Coupon di Kasir**: Setelah akun aktif (dengan saldo awal = 0), peserta mendatangi meja panitia (kasir) hanya untuk menunjukkan layar profil HP mereka dan melakukan pembayaran (Cash/QRIS). Panitia tinggal mengetik nama tim peserta pada tablet admin pusat dan menambah saldo kupon mereka (misal: +60 kupon). Saldo langsung bertambah secara real-time di layar HP peserta dengan efek pendaran neon hijau Cyberpunk.

#### Jalur 2: Pendaftaran Terbantu Panitia (Bagi Peserta Lansia / Anak-Anak / Tanpa HP)
Jika ada kalangan peserta tertentu yang tidak membawa smartphone, tidak memiliki akun Google, atau kesulitan menggunakan perangkat digital:
1.  **Pendaftaran Manual di Kasir**: Peserta mendatangi meja panitia. Panitia di meja pendaftaran langsung membuka laptop dasbor admin utama, memilih menu **"Tambah Peserta Baru (Manual/Tamu)"**.
2.  **Penciptaan Akun Virtual**: Panitia menginput nama pembalap dan nama tim mereka. Sistem secara otomatis akan membuatkan **Email Dummy/Virtual** khusus (misalnya: `tamu102@tamiya.local`) di database untuk mengunci data kepesertaan mereka secara sah.
3.  **Pengelolaan Antrean Berbantuan (Admin Override)**: Peserta kategori ini tidak perlu memegang HP untuk memindai jalur. Saat giliran balap tiba, mereka cukup meletakkan mobil di jalur yang diinginkan, dan Admin Utama dari meja pusat yang akan memasukkan akun tamu mereka ke dalam antrean *race* aktif lewat laptop panitia (*Admin Override*). Ini memastikan turnamen tetap berjalan 100% paperless dan tertib bagi semua kategori peserta!

---

#### Alur Berjalan di Lintasan (Kualifikasi & Antrean)
1.  **Memasuki Antrean & Scanning Jalur (Khusus Kualifikasi Babak 1)**:
    *   Peserta melihat status antrean di layar TV atau HP mereka. Ketika giliran tiba untuk maju ke area persiapan balap (*Waiting Zone*), peserta berdiri di jalur masing-masing (Line A, B, atau C).
    *   Peserta menggunakan kamera HP mereka untuk **memindai QR Code unik** yang ditempel di meja antrean masing-masing jalur (misalnya stiker QR Code "JALUR A").
    *   **Pencegahan Tabrakan Antrean (Race Condition)**: Jika dua peserta memindai QR Code jalur yang sama pada milidetik yang sama, server database akan menggunakan skema transaksi *ACID/Strict Locking* untuk meloloskan pemindai pertama. Pemindai kedua otomatis dialihkan ke nomor *race* berikutnya yang masih kosong secara halus dengan notifikasi: *"Jalur Anda telah terisi, Anda otomatis masuk ke Race berikutnya."*
2.  **Konfirmasi Kesiapan ("Siap Balap")**:
    *   Setelah memindai QR, layar HP peserta akan berubah menjadi konfirmasi jalur: *"Anda terdaftar di Jalur A untuk Race ini. Saldo kupon terpotong 1 poin."*
    *   Peserta menekan tombol besar hijau **"SIAP BALAP"**.
3.  **Mitigasi Salah Scan (Tombol Batal Mandiri)**:
    *   Jika peserta tidak sengaja memindai QR Jalur B (padahal seharusnya Jalur A), mereka dapat menekan tombol merah **"Batal / Salah Jalur"** di layar HP mereka.
    *   Jika ditekan (dan balapan belum dikunci oleh Admin Utama), sistem otomatis mengembalikan saldo kupon (+1) dan mengosongkan slot jalur tersebut di layar juri dan TV utama.

---

### B. Alur Marshal (Pelepas Mobil) & Sinergi Timer Standalone (Marshal & Offline Timer Flow)
```
[Peserta Scan QR di Waiting Zone] ──> [Admin Kunci Balapan di Pusat]
                                                 │
[Marshal Fokus Lepas Mobil di Start] <── [Marshal Aktifkan Timer Fisik Offline (3, 2, 1, GO)]
```

Untuk memaksimalkan fokus dan efisiensi di lapangan, **Marshal di Box Start dibebaskan 100% dari tugas memegang gadget/tablet**. Tangan Marshal harus sepenuhnya bebas untuk memegang, meluruskan, dan melepas mobil peserta secara adil. Fungsi kontrol digital dialihkan ke **Admin Utama (Race Director)** di pusat komando, sementara start fisik menggunakan timer standalone:

1.  **Peran Marshal (Pelepas Mobil)**:
    *   Marshal bertugas secara fisik di dekat box start tanpa memegang perangkat digital apa pun.
    *   Tugas utamanya adalah menyejajarkan mobil peserta di jalurnya masing-masing secara adil.
2.  **Peran Perangkat Timer Fisik Standalone (Offline Starting Timer)**:
    *   Sirkuit dilengkapi **Starting Timer Standalone (Offline)** (Christmas Tree / Lampu Start standar sirkuit) yang tidak perlu terhubung secara digital ke sistem internet/panitia. 
    *   Timer ini sepenuhnya dikendalikan manual oleh Marshal menggunakan tombol fisik/remote di box start setelah lintasan dinyatakan siap.
3.  **Alur Sinkronisasi Pelepasan Manual**:
    *   **Langkah 1 (Verifikasi & Penguncian)**: Admin Utama memantau layar kontrol pusat. Begitu melihat status jalur (Line A, B, C) sudah berwarna **Hijau (Ready)**, Admin menekan tombol **"KUNCI BALAPAN"** dari laptop panitia pusat.
    *   **Langkah 2 (Kupon Terkunci)**: Sistem mengunci tombol batal peserta, memotong sisa kupon, dan merender status visual **"RACE READY - LINTASAN SIAP!"** di layar TV utama sirkuit sebagai isyarat bagi Marshal.
    *   **Langkah 3 (Eksekusi Lepas)**: Marshal di box start melirik layar TV utama sirkuit. Setelah status terkunci, Marshal menata mobil, mengaktifkan timer fisik standalone (tanpa buzzer awal yang bising), dan melepas ketiga mobilan secara adil tepat saat lampu countdown timer offline berubah menjadi hijau.

---

### C. Alur Admin Utama / Race Director (Admin/Organizer Flow)
1.  **Pengelolaan Data Master**:
    *   Admin mengontrol data sirkuit, pendaftaran peserta baru, dan melakukan pengisian saldo kupon digital.
2.  **Manajemen Bracket & Jadwal**:
    *   Sistem secara otomatis mengelompokkan peserta ke dalam *race bracket* digital berdasarkan kualifikasi.
3.  **Kontrol Darurat (*Admin Override*)**:
    *   Admin memiliki dasbor pengawasan penuh. Jika terjadi kendala seperti peserta salah jalur dan HP mereka mati (tidak bisa klik Batal), Admin dapat mengeklik tombol **"Kick / Reset"** pada jalur tersebut untuk mengosongkan jalur dan mengembalikan kupon peserta secara paksa.
4.  **Pencatatan Waktu Skenario B (Manual Input dengan Pemetaan Otomatis)**:
    *   Sistem web menggunakan Skenario B yang sangat taktis: catatan waktu dibaca dari layar LED sirkuit oleh Admin Utama, lalu diinput secara manual pada kolom samping nama peserta yang **sudah otomatis terpetakan oleh sistem sejak mereka scan QR di antrean**.
    *   Hasil klasemen sementara, *Best Race*, dan papan *Best Time Overall* (BTO) ter-update secara otomatis di layar monitor TV besar secara waktu-nyata tanpa memerlukan papan tulis fisik.

---

## 3. Manajemen Kondisi Setelah Mobil Lepas (Post-Launch Race Conditions)

Ketika Admin Utama (Race Director) mengubah status race dari `PRE-START` ke `LOCKED` (mengklik tombol **"KUNCI BALAPAN"**), sistem mengunci seluruh tombol pembatalan peserta. Setelah mobil dilepas di lintasan, terdapat tiga kondisi fisik yang harus ditangani secara taktis oleh Web App tanpa mengganggu jalannya perlombaan:

### Kondisi 1: Ada Pemenang (3 Lap Finish) + Validasi Scrutineer & Auto-Placement Babak Kedua (Bracket)
*   **Skenario**: Minimal ada satu mobil yang berhasil menyelesaikan 3 putaran (laps) penuh dan menyentuh garis finish.
*   **Alur Web App & Fisik (Pencegahan Loophole Sensor)**:
    1.  **Pencatatan Finish & Validasi Juri**: Walaupun sensor trek mencatat waktu secara otomatis, keputusan akhir pemenang tetap berada di bawah kendali Juri Finish/Admin Utama. Hal ini untuk menghindari kesalahan sensor jika mobil keluar trek (CO) pada lap terakhir namun terlempar melewati garis sensor. Admin Utama harus mengeklik tombol **"Konfirmasi Pemenang: [Nama Peserta] (Jalur)"** di dasbor sebelum data dikirim ke meja scrutineering.
    2.  **Pemeriksaan Mobil (Scrutineering)**: Setelah dikonfirmasi oleh Admin Utama, nama pemenang akan langsung muncul di tablet Scrutineer. Pemenang membawa mobilnya ke meja panitia untuk dilakukan **scrutineering**.
    3.  **Keputusan Scrutineer & Auto-Placement (Bebas e-Coupon & Bebas Scan QR di Babak 2)**:
        *   **Opsi A: LOLOS (Pass)**: Jika mobil memenuhi regulasi, Scrutineer menekan tombol **"Lolos Scrutineer"** di dasbor.
            *   *Dampak Sistem*: Sistem secara otomatis **memasukkan nama peserta ke dalam Bagan Turnamen Babak Kedua (Bracket Babak 2) secara real-time** pada posisi slot pertandingan yang telah ditentukan sistem (*Fixed Bracket*). Peserta **TIDAK PERLU** mengantre dan melakukan *scan* QR lagi menggunakan e-coupon di Babak Kedua.
            *   Status race diubah menjadi `COMPLETED`.
        *   **Opsi B: GUGUR / DISKUALIFIKASI (DQ)**: Jika mobil melanggar regulasi, Scrutineer menekan tombol **"Diskualifikasi (DQ)"**.
            *   *Dampak Sistem*: Peserta ditandai gugur/DQ. Saldo kupon awal mereka tetap terpotong (hangus). Slot mereka di Bracket Babak Kedua otomatis dikosongkan atau diberikan kepada *runner-up* (tergantung regulasi turnamen).
*   **Konsekuensi Kupon Awal**: Kupon seluruh peserta yang berlaga di race tersebut resmi terpotong secara permanen karena mereka telah menggunakan jatah tanding mereka di lintasan.

### Kondisi 2: Tidak Ada yang Menang (Semua Crash / Course Out - CO)
*   **Skenario**: Semua mobil yang berlaga keluar dari lintasan (*Course Out* / CO), patah part, atau mogok sebelum menyelesaikan 3 putaran penuh. Tidak ada satu pun mobil yang menyentuh garis finish.
*   **Alur Web App**:
    *   Admin Utama menekan tombol merah **"Semua CO / DNF (No Winner)"** pada dasbor kontrol.
    *   Sistem langsung memproses penutupan race dengan status khusus ini.
    *   **Konsekuensi Kupon**: Sesuai dengan regulasi turnamen Tamiya standar, kupon peserta **tetap terpotong/hangus** karena mobil mereka sudah sempat dilepas ke lintasan dan menggunakan slot balapan. Saldo kupon tidak dikembalikan.

### Kondisi 3: Terjadi Kecelakaan yang Mengakibatkan Balap Ulang (Re-Race)
*   **Skenario**: Terjadi insiden eksternal yang tidak sah, misalnya ada puing mobil lain yang menghalangi lintasan, juri salah lepas, dll. Balap ulang (*re-race*) dideklarasikan.
*   **Alur Web App yang Efisien (Tanpa Scan QR Ulang)**:
    *   Pembalap sedang berada di area sirkuit memegang mobil. **Peserta TIDAK PERLU mengeluarkan HP dan memindai QR Code lagi.**
    *   Admin Utama menekan tombol **"DEKLARASI RE-RACE"** pada laptop panitia.
    *   Sistem menampilkan menu pop-up berisi daftar peserta di race aktif tersebut dengan kotak centang (*checkbox*):
        *   `[ ] Jalur A: [Nama Peserta A]`
        *   `[ ] Jalur B: [Nama Peserta B]`
        *   `[ ] Jalur C: [Nama Peserta C]`
    *   Admin memilih jalur mana saja yang harus melakukan balap ulang. Jalur terpilih statusnya di-reset menjadi "Ready to Re-Run" tanpa memotong saldo kupon baru bagi peserta. Transaksi ditandai sebagai *"Re-Race Free Permit"*.

---

## 4. Alur Meja Scrutineer Teroptimasi & Logika Best Time Overall (BTO)

### A. Alur Kerja Meja Scrutineer: Sistem "Tanya Nama & Auto-Suggest" (Nol QR Code)
Untuk menyederhanakan peralatan di meja scrutineering, menghindari antrean menumpuk, serta mengatasi kekhawatiran operasional juri lupa mengeklik hasil balapan, sistem Web App menerapkan metode berikut:

1.  **Tanya Nama (Nol QR Code Meja)**:
    *   Pemenang langsung membawa mobilnya ke meja scrutineering tanpa perlu membawa HP atau melakukan *scan* QR lagi.
    *   Juri scrutineer bertanya: *"Nama siapa, Mas?"* -> Peserta menjawab: *"Andi"*.
2.  **Lookup Pintar & Auto-Suggest (Keamanan Tinggi)**:
    *   Layar tablet juri secara default **hanya menampilkan 1-3 nama peserta yang berstatus sebagai pemenang dari race yang baru saja diselesaikan** dan berstatus `pending_scrutineering`. Juri tidak perlu mengetik nama lengkap, cukup mengeklik kartu nama **"Andi"** yang terpampang besar di layar.
    *   **Keamanan Sistem**: Jika ada orang lain mencoba menyela dan menyebut namanya, juri bisa melihat di layar tablet bahwa nama orang tersebut tidak terdaftar sebagai pemenang *race* aktif, sehingga salah input otomatis dicegah secara instan.
3.  **Antrean Pintar (Bila Terjadi Penumpukan)**:
    *   Jika terjadi antrean beberapa pemenang sekaligus di meja scrutineer, sistem akan mengurutkan kartu nama pemenang tersebut berdasarkan urutan *finish* waktu balapan mereka (*FIFO - First In First Out*).
4.  **Mitigasi Error: Solusi Jika Juri Lepas Start (Marshal) Lupa Klik Pemenang**:
    *   **Lapis 1: Admin Utama Command Center**: Kendali digital penuh berada di tangan Admin Utama yang memonitor seluruh layar dari pusat komando. Race berikutnya tidak bisa dibuka sebelum data dimasukkan.
    *   **Lapis 2: Active Alert**: Jika juri scrutineer melihat ada pemenang datang membawa mobil, tetapi di layar tabletnya kosong, sistem Web App akan menampilkan tombol berkedip kuning: **"Race Aktif Belum Disubmit Admin"**.
    *   **Lapis 3: Scrutineer Override**: Jika terjadi kondisi darurat, juri scrutineer memiliki tombol **"Ambil Alih Hasil (Override)"** di tablet mereka untuk memilih pemenang secara manual langsung dari meja scrutineer dan meloloskannya saat itu juga.

### B. Aturan Validasi Best Time Overall (BTO)
Pencatatan BTO dikelola secara ketat, otomatis, dan terintegrasi dengan keputusan meja scrutineering:
1.  **Syarat Keabsahan**: Catatan waktu tercepat seorang peserta **hanya akan diakui sebagai rekor BTO jika hasil scrutineering mereka berstatus LOLOS (`pass`)**.
2.  **Mitigasi Diskualifikasi**: Jika sebuah mobil mencetak rekor waktu baru yang luar biasa tetapi dinyatakan **DISKUALIFIKASI (DQ)** oleh panitia di meja scrutineering karena melanggar regulasi sasis/motor, maka **sistem akan otomatis membatalkan catatan waktu tersebut dari papan peringkat BTO** dan mengembalikan rekor BTO ke pemegang rekor sah sebelumnya.
3.  **Koneksi WebSocket Real-Time**: Begitu admin menekan tombol "Lolos Scrutineer" untuk pemenang yang memecahkan rekor sirkuit hari itu, layar monitor TV utama akan langsung memicu visual animasi khusus: **"NEW RECORD BTO! [Nama Peserta] - [Catatan Waktu] detik!"** untuk memicu sorak-sorai penonton.

### C. Sistem Countdown Interaktif Babak Kedua (Hitungan Mundur Manual 10 s.d. 1)
Pada Babak Kedua (fase gugur/bracket), manajemen waktu pelepasan mobil sangatlah ketat. Peserta biasanya diberikan batas waktu 10 detik untuk melakukan persiapan akhir dan meletakkan mobil di box start. Sistem Web App membantu menyelenggarakan countdown ini secara otomatis, fleksibel, dan interaktif:

1.  **Kontrol Terpusat & Intervensi Race Director (Admin Utama)**:
    *   Di dasbor Race Director, terdapat widget **"Timer Kontrol Babak Kedua"** dengan tombol besar yang mudah ditekan: **"MULAI COUNTDOWN"**, **"RESET/COUNTDOWN KE-2"**, dan **"SIAP / STOP SEKARANG"**.
    *   **Fitur Stop Awal (Stop Early)**: Jika ketiga peserta ternyata sudah siap meletakkan mobilnya di box start sebelum hitungan mundur mencapai angka 1 (misalnya pada detik ke-5), Race Director tidak perlu menunggu hitungan selesai. Race Director dapat langsung mengeklik tombol **"SIAP / STOP SEKARANG"** untuk menghentikan countdown seketika dan menginstruksikan Marshal untuk melepas mobil secara manual.
2.  **Sistem Hitung Mundur 2 Tahap (Double Countdown / Loopable)**:
    *   Dalam praktiknya, sirkuit sering kali membutuhkan **maksimal 2x hitung mundur**. 
    *   *Hitung Mundur Pertama*: Dilakukan untuk pemanggilan dan persiapan awal di lintasan.
    *   *Hitung Mundur Kedua*: Jika ada kendala teknis mendadak pada salah satu peserta, Race Director mengeklik tombol **"RESET/COUNTDOWN KE-2"** untuk memulai kembali hitungan dari angka 10. Sistem dirancang agar dapat diulang berkali-kali secara fleksibel guna menjamin kepuasan dan sportivitas peserta.
3.  **Visualisasi Raksasa di Layar TV Utama**:
    *   Begitu countdown diaktifkan, Layar TV Utama sirkuit otomatis memampang angka hitungan mundur raksasa dari **10 s.d. 1** dengan latar belakang merah menyala yang sangat kontras (high-contrast).
4.  **Efek Suara Sinkron (Suara Manusia Asli Tanpa Buzzer)**:
    *   Setiap detak angka akan diiringi oleh **efek suara rekaman manusia asli (voice-over) yang menghitung mundur secara tegas dari "Sepuluh" s.d. "Satu"** (menggantikan bip bip sintetis bising biasa).
    *   **Penting**: Sistem ini **TIDAK menggunakan Buzzer Pelepas Start** otomatis di akhir countdown. Keputusan pelepasan mobil murni diserahkan secara manual kepada Marshal di lapangan setelah countdown berhenti atau dihentikan awal oleh Race Director.
5.  **Getaran Sinkron (Haptic) di HP Peserta**:
    *   Layar HP milik peserta yang bertanding akan berkedip merah dan mengeluarkan getaran berkala seirama dengan countdown di TV, memberikan sinyal fisik yang kuat agar mereka segera merapikan mobil.

---

## 5. Filosofi UI/UX & Tema Visual: Cyberpunk / Neo-Racing

Untuk memberikan pengalaman visual yang memicu adrenalin, antarmuka seluruh aplikasi Web App ini (baik HP Peserta, Tablet Panitia, maupun Layar TV Sirkuit) wajib menerapkan estetika **Cyberpunk / Neo-Racing**. Tema ini menggabungkan kontras gelap yang ekstrem dengan aksen neon berpendar khas sirkuit balap malam hari.

### A. Palet Warna Utama (Neo-Racing Palette)
Sistem menggunakan skema warna kontras tinggi (*high-contrast*) untuk memastikan keterbacaan mutlak di bawah lampu sirkuit yang terang:
*   **Latar Belakang Utama**: *Midnight Obsidian* (`#0a0b10` s.d. `#0e1017`) dengan tekstur halus serat karbon (*carbon fiber pattern*) semi-transparan. Sangat ramah baterai HP dan mengurangi kelelahan mata panitia.
*   **Warna Jalur A (Line A)**: *Cyberpunk Neon Pink / Magenta* (`#ff0055`) dengan efek pendaran (*glowing neon shadow*).
*   **Warna Jalur B (Line B)**: *Electric Cyan / Ice Blue* (`#00f0ff`) dengan efek pendaran.
*   **Warna Jalur C (Line C)**: *Acid Neon Green / Lime* (`#39ff14`) dengan efek pendaran.
*   **Warna Peringatan & Pending**: *Chamber Amber / Neon Orange* (`#ffaa00`).
*   **Teks Utama**: *Pure White* (`#ffffff`) dan *High-Tech Silver* (`#cbd5e1`) untuk label sekunder.

### B. Tipografi & Elemen Visual Futuristik
*   **Font Judul & Angka Timer**: Menggunakan font sans-serif monospaced futuristik seperti **Orbitron**, **Share Tech Mono**, atau **JetBrains Mono**. Angka-angka catatan waktu dan countdown harus terlihat seperti instrumen dasbor mobil balap hypercar (*telemetry style*).
*   **Bingkai & Pemisah (Borders)**: Menggunakan sudut-sudut tajam bersudut 45 derajat (*angular tech cuts* / *chamfered corners*) alih-alih sudut membulat standar. Batas kotak dihiasi garis neon tipis 1px yang berpendar tipis.
*   **Ornamen Efek HUD (Heads-Up Display)**: Penambahan garis pindai (*scanlines*) semi-transparan tipis dan grid futuristik secara halus di latar belakang layar TV besar untuk memperkuat nuansa digital-racing.

### C. Pembagian Pengalaman Pengguna (Frictionless UX)
*   **Antarmuka HP Peserta (Pembalap) - "Maximum 2-Clicks"**:
    *   **Tombol Raksasa (Thumb-Friendly)**: Tombol aksi utama seperti "SIAP BALAP" dan "BATAL" mencakup minimal 30% area layar HP agar mudah ditekan saat jempol bergetar karena tegang atau kotor terkena minyak ban.
    *   **Bebas Clutter**: Menampilkan info krusial saja (Race No, Line, Sisa Kupon) tanpa paragraf teks yang mengganggu.
    *   **Konfirmasi Fisik**: Getaran singkat (*Haptic*) setiap kali tombol ditekan.
*   **Antarmuka Tablet Scrutineer & Dasbor Race Director - "No-Keyboard Field Operations"**:
    *   **Operasional Bebas Ketik**: Selama balapan berlangsung, panitia dilarang keras dipaksa untuk mengetik (seluruh pengoperasian bersifat *point-and-click* atau sentuhan pada kartu visual peserta).
*   **Antarmuka Super Admin - "Analytical Center"**:
    *   Pengecualian khusus untuk mengelola data master, audit finansial transaksi kupon, konfigurasi algoritma, dan manajemen basis data dengan informasi detail yang padat.

---

## 6. Rancangan Detail & Tata Letak Layar TV Besar (Public TV Screen Display)

Layar TV besar di sirkuit adalah **pusat perhatian utama** bagi seluruh penonton, pembalap, dan juri di lokasi. Layar ini harus didesain dengan tingkat keterbacaan yang sangat tinggi dari jarak jauh (minimal 5-10 meter), kontras warna yang tajam, serta layout informasi yang sangat padat namun tetap bersih (clutter-free).

Berikut adalah rancangan layout pembagian area layar TV Besar (Rasio 16:9):

```
+---------------------------------------------------------------------------------------+
|  LOGO EVENT |  NAMA TURNAMEN TAMIYA DIGITAL  |  STATUS Sirkuit: READY - LINTASAN SIAP! | Header (10%)
+------------------------------------------------------+--------------------------------+
|                                                      |                                |
|  [RACE ACTIVE: 15]                                   |  KLASEMEN BEST TIME OVERALL   |
|  Jalur A: [ HIJAU / READY ]                          |  (BTO - TOP 5)                 |
|  * ANDI (Avante Red)   - 11.450 detik                |                                |
|                                                      |  1. BUDI  (10.123 detik) - R8  | Main Content
|  Jalur B: [ HIJAU / READY ]                          |  2. ANDI  (11.450 detik) - R15 | Left (60%)
|  * IWAN (Aero Avante)  - 11.890 detik                |  3. TONI  (12.010 detik) - R4  | Right (40%)
|                                                      |  4. CACA  (12.250 detik) - R12 |
|  Jalur C: [ KOSONG (Scanning...) ]                   |  5. DEWI  (12.450 detik) - R9  |
|  * -                                                 |                                |
|                                                      |                                |
+------------------------------------------------------+--------------------------------+
|  Running Text: Antrean Berikutnya -> Race 16: Doni (A), Eko (B), Fandi (C)            | Footer (10%)
+---------------------------------------------------------------------------------------+
```

### A. Pembagian Area Informasi TV Utama
1.  **Header (Atas - 10% Tinggi Layar)**:
    *   **Kiri**: Logo Event / Penyelenggara.
    *   **Tengah**: Nama Turnamen Aktif yang sedang berlangsung.
    *   **Kanan (Status Sirkuit)**: Menampilkan status berjalan dari server utama yang dikontrol oleh Race Director:
        *   `KUNING (MENUNGGU ANTRIAN)`: Jika slot jalur masih belum terisi penuh atau peserta masih dalam proses scan QR.
        *   `HIJAU KEDIP (LINTASAN SIAP!)`: Begitu Race Director menekan tombol "KUNCI BALAPAN". Sinyal visual bagi Marshal dan Pembalap untuk bersiap di box start.
        *   `MERAH (BALAPAN BERLANGSUNG)`: Saat mobil dilepas dan timer sedang berjalan.
        *   `BIRU (VERIFIKASI MEJA)`: Balapan selesai, menunggu hasil scrutineering juri.
2.  **Sektor Kiri (Status Race Aktif - 60% Lebar Layar)**:
    *   Menampilkan detail dari nomor race berjalan (misalnya: **RACE 15**).
    *   **Tiga Baris Jalur (Line A, B, C)** dengan kotak visual berukuran sangat besar:
        *   *Jika Kosong*: Berwarna abu-abu redup dengan tulisan *"JALUR KOSONG"*.
        *   *Jika Peserta Scan*: Berwarna kuning (*PENDING*) dan memunculkan nama panggilan peserta yang mendaftar.
        *   *Jika Klik Siap Balap*: Berwarna hijau terang (*READY*) dengan indikator checklist raksasa.
        *   *Setelah Finish*: Menampilkan catatan waktu putaran hingga 3 angka di belakang koma (misalnya: `11.450` detik) secara berkedip-kedip.
3.  **Sektor Kanan (Papan Peringkat BTO - 40% Lebar Layar)**:
    *   Menampilkan **Top 5 Catatan Waktu Tercepat Hari Ini** yang sah secara regulasi (lolos scrutineering).
    *   Informasi yang ditampilkan: Peringkat (1-5), Nama Peserta, Catatan Waktu Terbaik, dan dari nomor *Race* berapa catatan waktu tersebut dicetak.
4.  **Footer (Bawah - 10% Tinggi Layar)**:
    *   **Running Text (Teks Berjalan)**: Menampilkan antrean *Race* berikutnya secara berurutan (misal: *"Antrean Selanjutnya: Race 16 - Doni (Jalur A), Eko (Jalur B), Fandi (Jalur C). Harap bersiap di Waiting Zone!"*). Ini sangat efektif untuk mempercepat sirkulasi peserta agar tidak ada jeda waktu kosong antar-race.

### B. Animasi Pop-Up Interaktif & Efek Suara (WebSocket-Driven)
Layar TV besar ini terhubung langsung ke server pusat menggunakan protokol WebSocket untuk menghasilkan efek interaktif tanpa perlu melakukan *refresh* browser:
*   **Efek "NEW RECORD BTO"**:
    Begitu juri scrutineer mengeklik tombol "Lolos Scrutineer" untuk peserta yang memecahkan rekor waktu tercepat, layar TV akan **menghentikan sementara tampilan utama** dan menampilkan animasi *Pop-Up Full Screen* yang dramatis dengan warna keemasan dan confetti bergerak: 
    > **"NEW RECORD BTO! 🏆 [Nama Peserta] - [Catatan Waktu] detik!"**
*   **Efek Suara (Buzzer)**:
    Jika TV dihubungkan ke sistem pengeras suara (*sound system*) sirkuit, Web App akan otomatis memutar suara efek khusus:
    *   Suara terompet/selebrasi saat rekor BTO baru pecah.
    *   Suara bel peringatan jika terjadi deklarasi *Re-Race* dari Race Director.

---

## 7. Logika Transisi State & Pengamanan (State Machine)

Untuk mencegah eksploitasi sistem (seperti pembatalan kupon secara sepihak saat mobil kalah balapan), sistem menerapkan transisi status (*state*) yang ketat:

```
[State: DRAFT] ──(Peserta klik "Batal")──> Saldo Kembali, Slot Kosong
       │
(Admin Utama klik "KUNCI BALAPAN")
       ▼
[State: PRE-START] ──> Tombol "Batal" di HP Peserta Mati/Hilang ──> Sisa Kupon Terpotong
       │
(Countdown Mulai / Timer Offline Berjalan)
       ▼
[State: LOCKED] ──> Balapan Berjalan & Sensor Siap Menerima Input
       │
(Input Waktu Manual Skenario B oleh Admin)
       ▼
[State: COMPLETED] ──> Data Waktu Disimpan Secara Sah & Sifat Transaksi Permanen
```

---

## 8. Desain Skema Basis Data Sederhana (Update v17) (Database Schema)

Berikut adalah struktur tabel inti yang dibutuhkan untuk mengimplementasikan Web App ini:

### 1. Tabel `users` (Data Peserta & Admin)
| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | INT (PK) | ID Unik pengguna |
| `name` | VARCHAR | Nama lengkap peserta |
| `email` | VARCHAR (Unique) | Email Google peserta (untuk autentikasi OAuth 2.0) |
| `google_sub_id`| VARCHAR | ID unik Google (Subject ID) untuk verifikasi login aman |
| `role` | ENUM | 'admin', 'scrutineer', 'participant' |
| `created_at` | TIMESTAMP | Waktu pendaftaran akun |

### 2. Tabel `coupons` (Manajemen Saldo Kupon Babak 1)
| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | INT (PK) | ID Kupon |
| `user_id` | INT (FK) | Relasi ke tabel `users` |
| `balance` | INT | Jumlah saldo kupon kualifikasi aktif yang dimiliki |
| `updated_at` | TIMESTAMP | Terakhir kali saldo diperbarui |

### 3. Tabel `races` (Manajemen Jalur Balapan Aktif)
| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | INT (PK) | ID Unik balapan |
| `race_number`| INT | Nomor antrean race saat ini (misal: Race 15) |
| `status` | ENUM | 'draft', 'pre-start', 'locked', 'completed' |
| `winner_id` | INT (FK) | Relasi ke `users` untuk juara race |
| `created_at` | TIMESTAMP | Waktu pembuatan race |

### 4. Tabel `race_registrations` (Pencatatan Jalur, Scan QR & Status Scrutineer)
| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | INT (PK) | ID Unik registrasi jalur |
| `race_id` | INT (FK) | Relasi ke tabel `races` |
| `user_id` | INT (FK) | Relasi ke tabel `users` |
| `lane` | ENUM | 'A', 'B', 'C' |
| `status` | ENUM | 'pending', 'ready' (klik Siap Balap) |
| `finish_time`| DECIMAL | Catatan waktu putaran dalam detik (misal: 11.450) |
| `scrutineer_status` | ENUM | 'pending', 'pass', 'disqualified' (Default NULL. Diisi untuk pemenang) |

### 5. Tabel `bracket_matches` (Manajemen Skema Bagan/Tournament Tree Babak Kedua)
*Tabel baru untuk mengotomatiskan penempatan pemenang secara langsung di Babak Kedua tanpa kupon.*
| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | INT (PK) | ID Unik pertandingan bagan |
| `round_number`| INT | Babak ke-berapa (misal: 1 untuk Babak Gugur awal, 2 untuk Semi-Final, dsb) |
| `match_number`| INT | Nomor pertandingan dalam babak tersebut |
| `user_id_1` | INT (FK) | Kontestan 1 (Relasi ke tabel `users`, auto-filled dari pemenang Babak 1 yang Lolos Scrutineer) |
| `user_id_2` | INT (FK) | Kontestan 2 (Relasi ke tabel `users`) |
| `user_id_3` | INT (FK) | Kontestan 3 (Relasi ke tabel `users`) |
| `winner_id`  | INT (FK) | ID pemenang pertandingan ini |
| `parent_match_id` | INT (FK) | Relasi ke `bracket_matches` berikutnya untuk kontestan yang lolos |

---

## 9. Keunggulan Finansial & Operasional Sistem Web App

1.  **Nol Investasi Hardware Pembaca**:
    *   *Sistem RFID*: Membutuhkan pembelian alat pembaca RFID per jalur, kabel panjang, kartu RFID untuk setiap peserta, dan instalasi mikrokontroler. Biaya bisa berkisar antara Rp 1.500.000 - Rp 4.000.000 per sirkuit.
    *   *Sistem Web App*: **Rp 0 untuk hardware**. Panitia cukup mencetak QR Code di selembar kertas dan menempelkannya di meja. Kamera HP peserta bertindak sebagai perangkat keras pemindai gratis.
2.  **Kemudahan Adopsi Komunitas**:
    *   Karena tidak ada perangkat keras khusus yang harus dikirimkan ke sirkuit mitra, sistem Web App ini dapat dipasarkan ke berbagai kota dengan model berlangganan software (SaaS). Panitia di kota manapun tinggal mendaftar ke web Anda, mencetak PDF QR Code yang disediakan sistem, dan langsung menggelar kompetisi digital.
3.  **Skalabilitas Jalur Tanpa Batas**:
    *   Jika sirkuit ingin menambah jalur (misalnya dari 3 jalur menjadi 5 jalur), sistem RFID memerlukan pembelian hardware sensor tambahan. Pada sistem Web App Anda, panitia cukup mencetak stiker QR Code "Jalur D" dan "Jalur E" dari sistem, tanpa perlu mengeluarkan biaya hardware tambahan sepeser pun.
