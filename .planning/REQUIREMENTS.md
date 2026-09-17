# Requirements: NEO-TAMIYA Racing System

**Defined:** 2026-09-17
**Core Value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.

## v1 Requirements

Requirements for milestone v3.0 (Alur Balap Fisik Tanpa Scan Kupon). Each maps to roadmap phases.

### Event Management

- [ ] **EVNT-01**: Panitia dapat membuat event/turnamen baru (nama, tanggal)
- [ ] **EVNT-02**: Panitia dapat memilih event aktif
- [ ] **EVNT-03**: Nomor peserta reset dari 1 pada event baru
- [ ] **EVNT-04**: Data peserta/bracket/BTO terpisah per event

### Participant Registry & Numbering

- [ ] **PARN-01**: Kasir dapat mendaftarkan peserta (nama, tim) tanpa kupon/serial/saldo
- [ ] **PARN-02**: App otomatis memberi nomor peserta unik berurutan dalam event aktif
- [ ] **PARN-03**: Panitia dapat mencari peserta via nomor atau nama
- [ ] **PARN-04**: Nomor peserta ditampilkan untuk ditulis panitia di kupon fisik
- [ ] **PARN-05**: Import roster CSV mendaftarkan peserta + nomor ke event aktif

### Winner Registration (Panel Registrasi)

- [ ] **WREG-01**: Panitia input nomor peserta → app menampilkan nama
- [ ] **WREG-02**: Panitia konfirmasi pendaftaran pemenang ke Babak 2
- [ ] **WREG-03**: App menolak nomor tak dikenal
- [ ] **WREG-04**: App cegah pendaftaran ganda peserta yang sama ke Babak 2
- [ ] **WREG-05**: Panitia dapat undo pendaftaran terakhir
- [ ] **WREG-06**: Pemenang otomatis menempati slot Babak 2 (A→B→C, heat baru bila penuh)

### Bracket

- [ ] **BRKT-01**: Bracket 3-jalur Babak 2+ tanpa lock/start/countdown
- [ ] **BRKT-02**: Panitia pilih pemenang heat manual → auto-advance babak berikutnya
- [ ] **BRKT-03**: Navigasi/filter babak + pencarian peserta

### Manual BTO

- [ ] **BTO-01**: Panitia input waktu terbaik per peserta (personal-best)
- [ ] **BTO-02**: Input baru menggantikan waktu lama bila lebih cepat
- [ ] **BTO-03**: Leaderboard BTO top-N realtime
- [ ] **BTO-04**: Deteksi rekor baru + selebrasi

### Monitoring & Display

- [ ] **MON-01**: Race Director pantau daftar peserta Babak 2 + status heat
- [ ] **MON-02**: Race Director pantau/kelola BTO
- [ ] **MON-03**: TV Sirkuit tampilkan bracket/peserta Babak 2
- [ ] **MON-04**: TV Sirkuit tampilkan leaderboard BTO
- [ ] **MON-05**: Sinkronisasi realtime via WebSocket

### Migration & Data Safety

- [ ] **MIG-01**: Migrasi schema dalam transaksi nyata + backup DB sebelum langkah destruktif
- [ ] **MIG-02**: Skema event + `participant_number` (+index) & normalisasi nomor kanonik
- [ ] **MIG-03**: Query state dibersihkan dari JOIN kupon sebelum drop tabel
- [ ] **MIG-04**: Drop tabel kupon/race lama setelah arsip DB & verifikasi

### Removal & Cleanup

- [ ] **REM-01**: Hapus layar Marshal, Scrutineer, Peserta HP, QR stencil + rute/nav
- [ ] **REM-02**: Hapus modul kupon digital, Ticket Engine, race engine, countdown
- [ ] **REM-03**: Hapus dependency scanner (`html5-qrcode`, `qrcode.react`, `tailwind-merge`)
- [ ] **REM-04**: Perbarui test suite & seed/demo (tanpa tabel kupon) tetap hijau

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Tournament Extra

- **EXTR-01**: Cetak daftar seeding per heat
- **EXTR-02**: Heat konsolasi / perebutan juara 3
- **EXTR-03**: Operator PIN untuk registrasi pemenang

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Babak 1 digital (heat/jalur/waktu) | Babak 1 sepenuhnya manual di lintasan; app mulai dari Babak 2 |
| Scanning kupon / QR jalur | Digantikan input nomor manual; memperlambat antrean |
| Saldo & serial kupon digital | Kupon murni fisik; panitia coret manual |
| Auto-seed Babak 2 by ranking BTO | Pemenang ditentukan manual, bukan ranking waktu |
| Integrasi stopwatch digital | BTO diinput manual oleh panitia |
| App self-service peserta (HP) | Peserta tak memakai HP; identitas via nomor |
| Auth / login / peran | Asumsi LAN tertutup tepercaya (pre-existing) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVNT-01 | TBD | Pending |
| EVNT-02 | TBD | Pending |
| EVNT-03 | TBD | Pending |
| EVNT-04 | TBD | Pending |
| PARN-01 | TBD | Pending |
| PARN-02 | TBD | Pending |
| PARN-03 | TBD | Pending |
| PARN-04 | TBD | Pending |
| PARN-05 | TBD | Pending |
| WREG-01 | TBD | Pending |
| WREG-02 | TBD | Pending |
| WREG-03 | TBD | Pending |
| WREG-04 | TBD | Pending |
| WREG-05 | TBD | Pending |
| WREG-06 | TBD | Pending |
| BRKT-01 | TBD | Pending |
| BRKT-02 | TBD | Pending |
| BRKT-03 | TBD | Pending |
| BTO-01 | TBD | Pending |
| BTO-02 | TBD | Pending |
| BTO-03 | TBD | Pending |
| BTO-04 | TBD | Pending |
| MON-01 | TBD | Pending |
| MON-02 | TBD | Pending |
| MON-03 | TBD | Pending |
| MON-04 | TBD | Pending |
| MON-05 | TBD | Pending |
| MIG-01 | TBD | Pending |
| MIG-02 | TBD | Pending |
| MIG-03 | TBD | Pending |
| MIG-04 | TBD | Pending |
| REM-01 | TBD | Pending |
| REM-02 | TBD | Pending |
| REM-03 | TBD | Pending |
| REM-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 0
- Unmapped: 34 ⚠️ (to be mapped during roadmap creation)

---
*Requirements defined: 2026-09-17*
*Last updated: 2026-09-17 after initial definition*