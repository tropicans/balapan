# Requirements: NEO-TAMIYA Racing System

**Defined:** 2026-09-17
**Core Value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.

## v1 Requirements

Requirements for milestone v3.0 (Alur Balap Fisik Tanpa Scan Kupon). Each maps to roadmap phases.

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
| EVNT-01 | Phase 11 | Complete |
| EVNT-02 | Phase 11 | Complete |
| EVNT-03 | Phase 12 | Complete |
| EVNT-04 | Phase 11 | Complete |
| PARN-01 | Phase 12 | Complete |
| PARN-02 | Phase 12 | Complete |
| PARN-03 | Phase 12 | Complete |
| PARN-04 | Phase 12 | Complete |
| PARN-05 | Phase 12 | Complete |
| WREG-01 | Phase 14 | Complete |
| WREG-02 | Phase 14 | Complete |
| WREG-03 | Phase 14 | Complete |
| WREG-04 | Phase 14 | Complete |
| WREG-05 | Phase 14 | Complete |
| WREG-06 | Phase 14 | Complete |
| BRKT-01 | Phase 14 | Complete |
| BRKT-02 | Phase 14 | Complete |
| BRKT-03 | Phase 14 | Complete |
| BTO-01 | Phase 13 | Complete |
| BTO-02 | Phase 13 | Complete |
| BTO-03 | Phase 13 | Complete |
| BTO-04 | Phase 13 | Complete |
| MON-01 | Phase 16 | Complete |
| MON-02 | Phase 16 | Complete |
| MON-03 | Phase 16 | Complete |
| MON-04 | Phase 16 | Complete |
| MON-05 | Phase 15 | Complete |
| MIG-01 | Phase 11 | Complete |
| MIG-02 | Phase 11 | Complete |
| MIG-03 | Phase 15 | Complete |
| MIG-04 | Phase 17 | Complete |
| REM-01 | Phase 16 | Complete |
| REM-02 | Phase 15 | Complete |
| REM-03 | Phase 17 | Complete |
| REM-04 | Phase 17 | Complete |

**Coverage:**

- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

**Phase distribution:**

- Phase 11: 5 (EVNT-01, EVNT-02, EVNT-04, MIG-01, MIG-02)
- Phase 12: 6 (EVNT-03, PARN-01..05)
- Phase 13: 4 (BTO-01..04)
- Phase 14: 9 (WREG-01..06, BRKT-01..03)
- Phase 15: 3 (MIG-03, MON-05, REM-02)
- Phase 16: 5 (MON-01..04, REM-01)
- Phase 17: 3 (MIG-04, REM-03, REM-04)

---
*Requirements defined: 2026-09-17*
*Last updated: 2026-09-17 after v3.0 roadmap creation (Phases 11-17)*
