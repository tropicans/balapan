# Requirements: NEO-TAMIYA Racing System

**Defined:** 2026-09-03  
**Milestone:** v1.0 — Full SRS & Blueprint Compliance  
**Core Value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.

## v1 Requirements

### Race Exceptions & Recovery (EXCP)

- [x] **EXCP-01**: Race Director dapat mengklik tombol "SEMUA CO / DNF (No Winner)" pada Dasbor Kontrol saat semua mobil keluar lintasan / patah part.
  - Balapan ditutup dengan status `completed` dan `winner_id` kosong.
  - Registrasi pembalap ditandai sebagai `DNF` / `CO`.
  - Kupon kualifikasi peserta tetap hangus terpotong sesuai regulasi turnamen.
  - Tampilan TV Sirkuit dan HP peserta memperbarui status bahwa heat berakhir tanpa pemenang.
- [x] **EXCP-02**: Race Director dapat mendeklarasikan "DEKLARASI RE-RACE" dengan modal pilihan checklist jalur (`[ ] Jalur A`, `[ ] Jalur B`, `[ ] Jalur C`).
  - Sistem menandai status jalur terpilih sebagai *Re-Race Free Permit*.
  - Kupon peserta tidak didebit ulang.
  - Peserta tidak perlu memindai QR ulang dengan HP.
  - Status jalur direset menjadi `ready` dan Race Director dapat langsung memicu pelepasan ulang.

### Scrutineer Desk Alerts & Emergency Override (SCRUT)

- [ ] **SCRUT-01**: Layar tablet Scrutineer menampilkan Active Alert Lapis 2 (banner/indikator berkedip kuning) bertuliskan *"Race Aktif Belum Disubmit Admin"* jika balapan sedang berlangsung (`locked`) dan pemenang sudah tiba membawa mobil ke meja pemeriksaan.
- [ ] **SCRUT-02**: Layar tablet Scrutineer menyediakan tombol darurat "Ambil Alih Hasil (Override)" Lapis 3 untuk memilih pemenang secara manual langsung dari meja scrutineer jika Race Director berhalangan / laptop admin mengalami kendala.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXCP-01 | Phase 1 | Complete |
| EXCP-02 | Phase 1 | Complete |
| SCRUT-01 | Phase 2 | Pending |
| SCRUT-02 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 4 total
- Mapped to phases: 4
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-03*  
*Last updated: 2026-09-03 after Milestone v1.0 initialization*
