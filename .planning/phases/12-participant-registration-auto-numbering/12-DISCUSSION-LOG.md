# Phase 12: Participant Registration & Auto-Numbering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-17
**Phase:** 12-Participant Registration & Auto-Numbering
**Areas discussed:** Tampilan Konfirmasi Nomor Peserta di Kasir, Kebijakan Nama Peserta Kembar / Multi-Entry, Mekanisme Import Roster CSV, Transisi Layout Dasbor Kasir

---

## Tampilan Konfirmasi Nomor Peserta di Kasir

| Option | Description | Selected |
|--------|-------------|----------|
| Modal Pop-up Raksasa Kontras Tinggi | Nomor tampil sangat besar (mis. #42) dengan nama pembalap/tim, tombol 'Selesai / Lanjut Daftar' (Enter), sangat jelas dibaca sekilas saat menulis kupon fisik. | ✓ |
| Banner / Kartu Feedback Inline di Atas Form | Nomor muncul di atas form tanpa modal pop-up, form langsung reset untuk pendaftaran berikutnya. | |
| Terserah sistem (builder discretion) | Ikuti standar desain cyberpunk yang paling cepat bagi operator kasir. | |

**User's choice:** Modal Pop-up Raksasa Kontras Tinggi
**Notes:** Kasir memerlukan angka raksasa agar dapat membaca sekilas dan menyalin nomor ke kupon fisik pembalap dengan cepat dan tanpa salah baca.

| Option | Description | Selected |
|--------|-------------|----------|
| Format Tanda Pagar '#42' (Angka Asli Tanpa Padding) | Menegaskan bahwa ini adalah nomor entri/kupon fisik (#1, #2, #42), konsisten dengan penyimpanan INTEGER D-04. | ✓ |
| Format Angka Polos '42' (Tanpa Simbol Apapun) | Murni angka tanpa tanda pagar atau prefix apapun. | |
| Format Padding '#007' / '#042' | Khusus di tampilan visual UI saja (database tetap INTEGER 7, 42). | |

**User's choice:** Format Tanda Pagar '#42' (Angka Asli Tanpa Padding)
**Notes:** Menjaga keselarasan dengan penyimpanan tipe data integer polos tanpa zero-padding buatan.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-focus ke input Nama | Setelah modal ditutup (klik tombol atau tekan Enter/Space/Esc), form langsung siap diketik untuk peserta berikutnya tanpa perlu sentuh mouse. | ✓ |
| Tetap di modal sampai kasir klik tombol 'Tutup' manual | Tidak otomatis auto-focus, kasir harus klik form lagi. | |
| Terserah sistem (builder discretion) | Terapkan kenyamanan ergonomi kasir yang paling optimal. | |

**User's choice:** Auto-focus ke input Nama
**Notes:** Memungkinkan alur kerja tanpa sentuh mouse (keyboard-only flow).

---

## Kebijakan Nama Peserta Kembar / Multi-Entry

| Option | Description | Selected |
|--------|-------------|----------|
| Izinkan Langsung & Beri Nomor Baru | Satu pembalap biasa punya banyak entri/mobil (multi-entry); sistem tetap otomatis memberi nomor urut baru tanpa blokir. | ✓ |
| Beri Peringatan/Modal Konfirmasi Duplikasi Nama | Beri tahu kasir bahwa nama sudah ada sebelum menerbitkan nomor. | |
| Tolak Nama Duplikat | Nama harus unik dalam satu event. | |

**User's choice:** Izinkan Langsung & Beri Nomor Baru
**Notes:** Nomor peserta merupakan identitas tiket/entri mobil, bukan akun personal. Satu peserta berhak mendaftarkan lebih dari satu mobil.

| Option | Description | Selected |
|--------|-------------|----------|
| Nama Tim Bersifat Opsional | Jika dikosongkan, simpan sebagai NULL / tampilkan '-' di UI tabel; kasir bisa mendaftarkan hanya dengan Nama. | ✓ |
| Nama Tim Wajib Diisi | Harus diisi atau otomatis default 'INDIVIDUAL / PRIVATEER'. | |
| Terserah sistem (builder discretion) | Nama tim opsional, default string kosong/NULL di database. | |

**User's choice:** Nama Tim Bersifat Opsional
**Notes:** Mempercepat pendaftaran di meja kasir jika pembalap tidak memiliki tim atau perseorangan.

| Option | Description | Selected |
|--------|-------------|----------|
| Single Omni-Search Bar | Satu kolom input cerdas: ketik angka langsung filter nomor peserta, ketik huruf filter nama atau tim (dengan debounce 200ms). | ✓ |
| Dua Kolom Pencarian Terpisah | Satu kolom khusus 'Cari Nomor', satu kolom khusus 'Cari Nama/Tim'. | |
| Terserah sistem (builder discretion) | Terapkan omni-search responsif sesuai standar aplikasi. | |

**User's choice:** Single Omni-Search Bar
**Notes:** Sangat intuitif bagi kasir dan panitia saat mencari peserta di lapangan.

---

## Mekanisme Import Roster CSV

| Option | Description | Selected |
|--------|-------------|----------|
| Keduanya (Web UI Upload + CLI Script) | Tombol 'Import CSV' di Web UI Kasir/Event dengan modal preview hasil, plus skrip CLI 'scripts/import-roster.js' diperbarui untuk otomasi/batch. | ✓ |
| Hanya Web UI Upload di Layar Kasir | Tidak perlu terminal; operator langsung drag & drop file CSV di browser. | |
| Hanya Skrip CLI Terminal | Cukup 'node scripts/import-roster.js' tanpa menambahkan UI upload di browser. | |

**User's choice:** Keduanya (Web UI Upload + CLI Script)
**Notes:** Fleksibel untuk panitia yang menggunakan antarmuka web maupun administrator yang mengeksekusi data awal via command line.

| Option | Description | Selected |
|--------|-------------|----------|
| Format Standar Simpel (Nama, Tim) + Kompatibilitas STC Vol 8 | Parser otomatis mengenali CSV simpel header 'name,team' (atau nama,tim) dan juga tetap mampu membaca baris file roster STC Vol 8 lama. | ✓ |
| Format Strict 'name,team' saja | Header wajib memiliki kolom 'name' dan 'team'. | |
| Terserah sistem (builder discretion) | Buat parser adaptif yang menangani kedua format dengan aman. | |

**User's choice:** Format Standar Simpel (Nama, Tim) + Kompatibilitas STC Vol 8
**Notes:** Menjaga kompatibilitas mundur dengan data turnamen yang sudah ada sebelumnya.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-Sequence Berkelanjutan | Nomor selalu di-assign otomatis berurutan (MAX + 1) ke dalam event aktif agar bebas konflik dan konsisten dengan D-05. | ✓ |
| Gunakan Nomor dari CSV Jika Ada, Fallback ke Auto-Sequence | Gunakan nomor CSV jika belum terpakai. | |
| Terserah sistem (builder discretion) | Prioritaskan integritas data dan urutan tanpa celah nomor. | |

**User's choice:** Auto-Sequence Berkelanjutan
**Notes:** Menjamin integritas penomoran urut tanpa tumpang tindih.

---

## Transisi Layout Dasbor Kasir

| Option | Description | Selected |
|--------|-------------|----------|
| Jadikan 'Registrasi Peserta (v3.0)' sebagai Tab Default / Utama | Menempatkan tab baru 'Registrasi Peserta' di posisi pertama (default), sementara tab lama 'Paket Kupon (v2.0)' dan 'Top Up Digital' tetap bisa diakses sebagai tab sekunder/arsip. | ✓ |
| Tambahkan Tab 'Registrasi v3.0' di samping tab yang ada tanpa mengubah default tab saat ini. | Tab lama tetap default. | |
| Gantikan Seluruh Layar Kasir langsung dengan Registrasi Peserta Bernomor | Sembunyikan tab kupon seketika. | |

**User's choice:** Jadikan 'Registrasi Peserta (v3.0)' sebagai Tab Default / Utama
**Notes:** Sesuai filosofi strict add -> switch -> remove: fitur baru menjadi fokus utama tanpa merusak modul lama sebelum waktunya dihapus.

| Option | Description | Selected |
|--------|-------------|----------|
| Header Lengkap (Event Aktif, Total Peserta, Nomor Terakhir #N, Tombol Import CSV & Refresh) | Memberi kasir visibilitas penuh situasi antrean saat ini. | ✓ |
| Header Minimal: Hanya Nama Event & Total Peserta | Tampilan lebih ringkas tanpa nomor terakhir. | |
| Terserah sistem (builder discretion) | Rancang header informatif dengan gaya cyberpunk HUD. | |

**User's choice:** Header Lengkap
**Notes:** Visibilitas terhadap nomor terakhir `#N` sangat berguna bagi kasir untuk mengecek sinkronisasi dengan fisik kupon.

| Option | Description | Selected |
|--------|-------------|----------|
| Kolom Nomor (#N), Nama, Tim, Waktu Daftar + Aksi Edit Nama/Tim | Kasir dapat memperbaiki typo nama/tim tanpa mengubah nomor peserta yang sudah tertulis di kupon fisik. | ✓ |
| Tabel Read-Only Tanpa Fitur Edit | Hanya menampilkan daftar tanpa tombol edit. | |
| Terserah sistem (builder discretion) | Kolom standar dengan aksi perbaikan typo sederhana. | |

**User's choice:** Kolom Nomor (#N), Nama, Tim, Waktu Daftar + Aksi Edit Nama/Tim
**Notes:** Fitur edit hanya untuk nama/tim; nomor peserta tidak boleh diubah karena sudah dipegang pembalap.

---

## the agent's Discretion

- Rancang modal preview import CSV yang informatif dengan ringkasan jumlah peserta baru yang akan didaftarkan.
- Penamaan spesifik endpoint REST API `/api/participants` atau `/api/users` dengan validasi payload.
- Desain visual animasi modal pop-up angka raksasa agar nyaman dipandang dan cepat dioperasikan.

## Deferred Ideas

- Tidak ada penundaan fitur baru di luar scope Phase 12. Pendaftaran pemenang ke Babak 2 ditangani di Phase 14.
