# Requirements: NEO-TAMIYA Racing System

**Defined:** 2026-09-04
**Core Value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi yang diselaraskan dengan sistem kupon fisik di lapangan.

## v2.0 Requirements

### Physical Coupon Management & Print (CPN)

- [ ] **CPN-01**: Kasir dapat mendaftarkan peserta dan menerbitkan paket kupon fisik (`coupon_packages`) dengan nomor seri unik (misal `PKG-001`) dan kuota race (default 50 kotak).
- [ ] **CPN-02**: Kasir dapat mencetak lembar kupon fisik standar ukuran A4/A5 yang berisi identitas pembalap/tim, barcode seri paket, dan grid 50 kotak bernomor urut (1-50) via browser print CSS.
- [ ] **CPN-03**: Sistem mendukung pencarian data paket kupon berdasarkan nama pembalap atau pemindaian barcode seri lembar kupon.

### Marshal Start Box & Track Operations (MRSH)

- [ ] **MRSH-01**: Marshal memiliki antarmuka khusus Start Box (`/marshal`) yang dioptimalkan untuk tablet/smartphone dengan tombol sentuh besar.
- [ ] **MRSH-02**: Marshal dapat memasukkan 3 peserta ke Jalur A (Pink), Jalur B (Cyan), dan Jalur C (Green) dengan cepat melalui pencarian instan atau scan barcode lembar kupon.
- [ ] **MRSH-03**: Sebelum mobil dilepas, Dasbor Marshal menampilkan nomor kupon yang harus dicoret (misal "CORET KOTAK #9") dan tombol konfirmasi yang mendebit 1 kupon secara atomic.
- [ ] **MRSH-04**: Status mobil siap di Start Box otomatis tersinkronisasi secara real-time via WebSocket ke Dasbor Race Director (`/race-director`).

### Finish & Ticket Engine Integration (TKET)

- [ ] **TKET-01**: Ketika mobil dinyatakan FINISH oleh Race Director, sistem secara otomatis menerbitkan record Tiket Babak Berikutnya (`next_round_tickets`) dengan ID tiket unik (misal `TKT-B2-001`).
- [ ] **TKET-02**: Pemenang tiket Babak Berikutnya secara otomatis ditempatkan ke slot kosong Babak 2 pada bracket eliminasi 3-jalur (v1.2 `matches`).
- [ ] **TKET-03**: Jika mobil dinyatakan Klontang / CO (DNF), kupon yang dipakai tetap hangus dan tidak ada tiket babak berikutnya yang diterbitkan.

### Arena Circuit TV HUD Showcase (TV-HUD)

- [ ] **TV-HUD-01**: Layar TV Sirkuit 16:9 (`/tv`) menampilkan running ticker / widget real-time yang menyiarkan peserta yang baru saja mengamankan tiket Babak Berikutnya.
- [ ] **TV-HUD-02**: Layar TV Sirkuit menampilkan total sisa kuota tiket Babak 2 yang masih diperebutkan di arena.

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
| CPN-01 | Phase 07 | Pending |
| CPN-02 | Phase 07 | Pending |
| CPN-03 | Phase 07 | Pending |
| MRSH-01 | Phase 08 | Pending |
| MRSH-02 | Phase 08 | Pending |
| MRSH-03 | Phase 08 | Pending |
| MRSH-04 | Phase 08 | Pending |
| TKET-01 | Phase 09 | Pending |
| TKET-02 | Phase 09 | Pending |
| TKET-03 | Phase 09 | Pending |
| TV-HUD-01 | Phase 10 | Pending |
| TV-HUD-02 | Phase 10 | Pending |

**Coverage:**
- v2.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-04*
*Last updated: 2026-09-04 after Milestone v2.0 definition*
