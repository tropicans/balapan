# Requirements: NEO-TAMIYA Racing System

**Defined:** 2026-09-18  
**Core Value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.

## Current Milestone: v3.2 Google OAuth Authentication & Admin Approval System

Mengamankan akses operasional sistem balap dengan autentikasi Google OAuth 2.0, menetapkan `tropicans@gmail.com` sebagai Super Admin, memberlakukan alur persetujuan (approval) oleh admin bagi pengguna Google baru, serta menyediakan dasbor kontrol hak akses/peran (Role) dengan tetap menjaga layar publik (/tv dan /bracket) dapat diakses bebas.

### Google OAuth Authentication (AUTH)

- [ ] **AUTH-01**: User dapat login menggunakan akun Google (Google Sign-In) melalui tombol resmi Google di antarmuka web
- [x] **AUTH-02**: Backend memverifikasi Google ID Token dengan aman (memvalidasi signature, audience Client ID, dan payload profile/email)
- [x] **AUTH-03**: Akun dengan email `tropicans@gmail.com` otomatis berstatus `approved` dengan role `super_admin` saat login
- [x] **AUTH-04**: Backend menerbitkan token sesi aman (JWT / bearer token) setelah verifikasi Google berhasil untuk autentikasi endpoint API
- [ ] **AUTH-05**: User dapat logout dengan aman yang menghapus sesi lokal dan mengembalikan status ke guest/public
- [ ] **AUTH-06**: Pengunjung tetap dapat melihat layar publik (`/tv` Layar TV Sirkuit dan `/bracket` Bagan Turnamen) secara bebas tanpa login

### Admin Approval & Access Control (APPR)

- [x] **APPR-01**: User Google baru selain super admin otomatis tercatat dengan status `pending` (menunggu persetujuan)
- [ ] **APPR-02**: User dengan status `pending` melihat layar penahan "Menunggu Persetujuan Admin" dan dicegah mengakses dasbor operasional (`/cashier`, `/director`, `/winners`, `/events`, `/admin`)
- [ ] **APPR-03**: Super Admin (`tropicans@gmail.com`) memiliki akses ke Dasbor Manajemen Pengguna (`/admin`) untuk melihat daftar akun pending, approved, dan rejected/suspended
- [ ] **APPR-04**: Super Admin dapat menyetujui (approve) akun pending serta menentukan Peran/Role (`cashier`, `race_director`, `scrutineer`, `admin`, `viewer`)
- [ ] **APPR-05**: Super Admin dapat mengubah role atau mencabut (revoke/suspend) akses pengguna terdaftar sewaktu-waktu
- [ ] **APPR-06**: Dasbor operasional dan API backend memvalidasi hak akses berdasarkan role pengguna yang disetujui (Role-Based Access Control / RBAC) dan menolak request tanpa otorisasi yang sah

---

## Future Requirements

- **NOTIF-01**: Notifikasi email otomatis atau WebPush kepada admin saat ada permintaan login akun baru
- **AUDIT-01**: Catatan riwayat (audit log) setiap persetujuan dan perubahan peran pengguna

---

## Out of Scope

- Registrasi akun via email/password manual — *Hanya menggunakan Google OAuth resmi untuk kecepatan dan keamanan verifikasi identitas*.
- Kunci total pada layar TV `/tv` dan bagan `/bracket` — *Layar sirkuit dan bagan publik harus tetap terbuka bagi penonton dan pembalap tanpa perlu login*.
- Sistem OAuth pihak ketiga selain Google (GitHub, Facebook, Apple) — *Fokus eksklusif pada akun Google/Gmail sesuai kebutuhan pengguna*.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 22 | Pending |
| AUTH-02 | Phase 20 | Satisfied |
| AUTH-03 | Phase 20 | Satisfied |
| AUTH-04 | Phase 20 | Satisfied |
| AUTH-05 | Phase 22 | Pending |
| AUTH-06 | Phase 22 | Pending |
| APPR-01 | Phase 20 | Satisfied |
| APPR-02 | Phase 22 | Pending |
| APPR-03 | Phase 21, 23 | Pending |
| APPR-04 | Phase 21, 23 | Pending |
| APPR-05 | Phase 21, 23 | Pending |
| APPR-06 | Phase 21, 23 | Pending |

---

## Validated Requirements (Completed in Earlier Milestones)

<details>
<summary>v3.1 Race Director Elimination Command Center (Shipped 2026-09-18)</summary>

- [x] **RDELIM-01**: Race Director dapat melihat kontrol eliminasi terpadu (Bracket Babak 2 ke atas sampai Grand Final) langsung di `/director`
- [x] **RDELIM-02**: Race Director dapat memilih pemenang heat 1-klik (Jalur A, B, C) yang otomatis menandai heat selesai & auto-advance
- [x] **RDELIM-03**: Indikator status visual heat menampilkan heat mana yang selesai (completed) vs pending/ready dengan counter progres ronde
- [x] **RDELIM-04**: Tombol & modal konfirmasi "Finalisasi / Kunci Babak 2" ketika seluruh heat Babak 2 selesai sebelum melangkah ke Babak 3
- [x] **RDELIM-05**: Sinkronisasi real-time status heat bracket dan penguncian babak via WebSocket ke `/director`, `/tv`, dan `/bracket`

</details>

<details>
<summary>v3.0 Alur Balap Fisik Tanpa Scan Kupon (Shipped 2026-09-17)</summary>

### Event Management
- [x] **EVNT-01**: Panitia dapat membuat event/turnamen baru (nama, tanggal)
- [x] **EVNT-02**: Panitia dapat memilih event aktif
- [x] **EVNT-03**: Nomor peserta reset dari 1 pada event baru
- [x] **EVNT-04**: Data peserta/bracket/BTO terpisah per event

### Participant Registry & Numbering
- [x] **PARN-01**: Kasir dapat mendaftarkan peserta (nama, tim) tanpa kupon/serial/saldo
- [x] **PARN-02**: App otomatis memberi nomor peserta unik berurutan dalam event aktif
- [x] **PARN-03**: Panitia dapat mencari peserta via nomor atau nama
- [x] **PARN-04**: Nomor peserta ditampilkan untuk ditulis panitia di kupon fisik
- [x] **PARN-05**: Import roster CSV mendaftarkan peserta + nomor ke event aktif

### Winner Registration (Panel Registrasi)
- [x] **WREG-01**: Panitia input nomor peserta → app menampilkan nama
- [x] **WREG-02**: Panitia konfirmasi pendaftaran pemenang ke Babak 2
- [x] **WREG-03**: App menolak nomor tak dikenal
- [x] **WREG-04**: App cegah pendaftaran ganda peserta yang sama ke Babak 2
- [x] **WREG-05**: Panitia dapat undo pendaftaran terakhir
- [x] **WREG-06**: Pemenang otomatis menempati slot Babak 2 (A→B→C, heat baru bila penuh)

### Bracket
- [x] **BRKT-01**: Bracket 3-jalur Babak 2+ tanpa lock/start/countdown
- [x] **BRKT-02**: Panitia pilih pemenang heat manual → auto-advance babak berikutnya
- [x] **BRKT-03**: Navigasi/filter babak + pencarian peserta

### Manual BTO
- [x] **BTO-01**: Panitia input waktu terbaik per peserta (personal-best)
- [x] **BTO-02**: Input baru menggantikan waktu lama bila lebih cepat
- [x] **BTO-03**: Leaderboard BTO top-N realtime
- [x] **BTO-04**: Deteksi rekor baru + selebrasi

### Monitoring & Display
- [x] **MON-01**: Race Director pantau daftar peserta Babak 2 + status heat
- [x] **MON-02**: Race Director pantau/kelola BTO
- [x] **MON-03**: TV Sirkuit tampilkan bracket/peserta Babak 2
- [x] **MON-04**: TV Sirkuit tampilkan leaderboard BTO
- [x] **MON-05**: Sinkronisasi realtime via WebSocket

### Migration & Data Safety
- [x] **MIG-01**: Migrasi schema dalam transaksi nyata + backup DB sebelum langkah destruktif
- [x] **MIG-02**: Skema event + `participant_number` (+index) & normalisasi nomor kanonik
- [x] **MIG-03**: Query state dibersihkan dari JOIN kupon sebelum drop tabel
- [x] **MIG-04**: Drop tabel kupon/race lama setelah arsip DB & verifikasi

### Removal & Cleanup
- [x] **REM-01**: Hapus layar Marshal, Scrutineer, Peserta HP, QR stencil + rute/nav
- [x] **REM-02**: Hapus modul kupon digital, Ticket Engine, race engine, countdown
- [x] **REM-03**: Hapus dependency scanner (`html5-qrcode`, `qrcode.react`, `tailwind-merge`)
- [x] **REM-04**: Perbarui test suite & seed/demo (tanpa tabel kupon) tetap hijau

</details>

## Future Requirements

### Tournament Extra
- **EXTR-01**: Cetak daftar seeding per heat
- **EXTR-02**: Heat konsolasi / perebutan juara 3
- **EXTR-03**: Operator PIN untuk registrasi pemenang

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sensor hardware RFID/NFC | Desain sistem 100% paperless & zero-hardware untuk menekan biaya |
| Stopwatch digital otomatis | Babak 1 manual di sirkuit; BTO dicatat manual; Babak 2 eliminasi murni pemenang heat |
| Buzzer / pelepas start otomatis | Pelepasan mobil dilakukan manual oleh marshal lintasan demi keamanan |
| Self-service scanning peserta | Panitia yang mengoperasikan sistem demi menghindari antrean lambat |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RDELIM-01 | Phase 19 | Pending |
| RDELIM-02 | Phase 19 | Pending |
| RDELIM-03 | Phase 19 | Pending |
| RDELIM-04 | Phase 18, Phase 19 | Phase 18 Complete / Phase 19 Pending |
| RDELIM-05 | Phase 18, Phase 19 | Phase 18 Complete / Phase 19 Pending |
| EVNT-01..04 | Phase 11 | Complete (v3.0) |
| PARN-01..05 | Phase 12 | Complete (v3.0) |
| BTO-01..04 | Phase 13 | Complete (v3.0) |
| WREG-01..06 | Phase 14 | Complete (v3.0) |
| BRKT-01..03 | Phase 14 | Complete (v3.0) |
| MON-01..05 | Phase 15, 16 | Complete (v3.0) |
| MIG-01..04 | Phase 11, 15, 17 | Complete (v3.0) |
| REM-01..04 | Phase 15, 16, 17 | Complete (v3.0) |

**Coverage:**
- v3.1 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 18: 2 (RDELIM-04, RDELIM-05 backend)
- Phase 19: 5 (RDELIM-01, RDELIM-02, RDELIM-03, RDELIM-04 UI, RDELIM-05 frontend)

---
*Requirements defined: 2026-09-18*
*Last updated: 2026-09-18 for Milestone v3.1*
