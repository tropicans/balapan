# Requirements: NEO-TAMIYA Racing System

**Defined:** 2026-09-04
**Core Value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi yang diselaraskan dengan sistem kupon fisik di lapangan.

## v2.0 Requirements

### Physical Pre-Printed Coupon Management (CPN)

- [x] **CPN-01**: Kasir dapat mendaftarkan peserta dan mengaitkan nomor seri lembar kupon fisik pre-printed (misal scan barcode atau input nomor seri kertas fisik) dengan kuota race (default 50 kotak).
- [x] **CPN-02**: Kasir memiliki form pendaftaran kilat dengan validasi unik nomor seri pre-printed guna mencegah nomor kupon ganda/terdaftar ulang.
- [x] **CPN-03**: Sistem mendukung pencarian data paket kupon pre-printed & pelacakan sisa kuota berdasarkan nama pembalap atau pemindaian nomor seri.

### Marshal Start Box & Track Operations (MRSH)

- [x] **MRSH-01**: Marshal memiliki antarmuka khusus Start Box (`/marshal`) yang dioptimalkan untuk tablet/smartphone dengan tombol sentuh besar.
- [x] **MRSH-02**: Marshal dapat memasukkan 3 peserta ke Jalur A (Pink), Jalur B (Cyan), dan Jalur C (Green) dengan cepat melalui pencarian instan atau scan barcode lembar kupon.
- [x] **MRSH-03**: Sebelum mobil dilepas, Dasbor Marshal menampilkan nomor kupon yang harus dicoret (misal "CORET KOTAK #9") dan tombol konfirmasi yang mendebit 1 kupon secara atomic.
- [x] **MRSH-04**: Status mobil siap di Start Box otomatis tersinkronisasi secara real-time via WebSocket ke Dasbor Race Director (`/race-director`).

### Finish & Ticket Engine Integration (TKET)

- [x] **TKET-01**: Ketika mobil dinyatakan FINISH oleh Race Director, sistem secara otomatis menerbitkan record Tiket Babak Berikutnya (`next_round_tickets`) dengan ID tiket unik (misal `TKT-B2-001`).
- [x] **TKET-02**: Pemenang tiket Babak Berikutnya secara otomatis ditempatkan ke slot kosong Babak 2 pada bracket eliminasi 3-jalur (v1.2 `matches`).
- [x] **TKET-03**: Jika mobil dinyatakan Klontang / CO (DNF), kupon yang dipakai tetap hangus dan tidak ada tiket babak berikutnya yang diterbitkan.

### Arena Circuit TV HUD Showcase (TV-HUD)

- [x] **TV-HUD-01**: Layar TV Sirkuit 16:9 (`/tv`) menampilkan running ticker / widget real-time yang menyiarkan peserta yang baru saja mengamankan tiket Babak Berikutnya.
- [x] **TV-HUD-02**: Layar TV Sirkuit menampilkan total sisa kuota tiket Babak 2 yang masih diperebutkan di arena.

## Future Requirements (v2.x+)

- **TKT-PRINT**: Opsi cetak struk tiket fisik Babak 2 pada mini thermal printer (58mm/80mm) di meja Scrutineer/Race Director.
- **RACE-STATS**: Analitik rasio Klontang vs Finish per paket kupon pembalap.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Smartphone scan mandiri oleh peserta saat antre race | Ditiadakan untuk mencegah kemacetan di start box fisik; dialihkan 100% ke lembar kupon fisik & Dasbor Marshal |
| Hardware RFID/NFC fisik | Menghindari biaya alat mahal bagi komunitas dan sirkuit lokal |
| Pelepasan mobil dengan buzzer otomatis | Menjaga keamanan mobil dan tangan peserta dengan pelepasan manual oleh Marshal |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CPN-01 | Phase 07 | Complete |
| CPN-02 | Phase 07 | Complete |
| CPN-03 | Phase 07 | Complete |
| MRSH-01 | Phase 08 | Complete |
| MRSH-02 | Phase 08 | Complete |
| MRSH-03 | Phase 08 | Complete |
| MRSH-04 | Phase 08 | Complete |
| TKET-01 | Phase 09 | Complete |
| TKET-02 | Phase 09 | Complete |
| TKET-03 | Phase 09 | Complete |
| TV-HUD-01 | Phase 10 | Complete |
| TV-HUD-02 | Phase 10 | Complete |

**Coverage:**
- v2.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-04*
*Last updated: 2026-09-04 after Milestone v2.0 definition*
