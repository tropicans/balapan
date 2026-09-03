# Requirements: Milestone v1.1 — UI/UX & Arena Visual Showcase Polish

Spesifikasi kebutuhan untuk Milestone v1.1, menerapkan rekomendasi perbaikan dari audit sistem UI Designer untuk meningkatkan ergonomi komando Race Director dan dramatisasi visual arena TV HUD.

## Requirements

### Race Director Ergonomics & Visual Shimmer (Phase 3)

- [ ] **UI-01**: Form input catatan waktu finish pada Dasbor Race Director (`RaceDirectorDashboard.jsx`) disusun dalam grid horizontal 3-kolom sejajar (`Jalur A` Pink di kiri, `Jalur B` Cyan di tengah, `Jalur C` Green di kanan) dengan indikator nama dan tag pembalap di dalam masing-masing kartu input.
  - Memudahkan RD membaca display stopwatch fisik sirkuit tanpa salah baris.
  - Tetap responsif di layar mobile/tablet dengan fallback 1-kolom pada viewport sempit.
- [ ] **UI-02**: Kartu rekor Best Time Overall (BTO #1) pada TV HUD (`RealtimeTV.jsx`) dan kartu pemenang di dashboard pembalap (`ParticipantDashboard.jsx`) memiliki efek visual pendar emas dinamis (*cyber shimmer animation* / *golden glow border*) untuk mengagungkan pencapaian rekor turnamen.

### Fullscreen Dynamic Countdown HUD Overlay (Phase 4)

- [ ] **UI-03**: Layar TV Sirkuit 16:9 (`RealtimeTV.jsx`) menampilkan visual overlay hitungan mundur dramatis di tengah layar saat countdown aktif:
  - Angka hitungan mundur raksasa berdenyut (10 s.d. 1) dengan efek scanline dan ring pendar neon.
  - Tampilan visual "GO! LEPAS MOBIL!" saat waktu mencapai nol.
  - Terhubung langsung dengan socket event `COUNTDOWN_TICK`, `COUNTDOWN_COMPLETE`, dan `COUNTDOWN_STOPPED`.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 4 | Pending |

**Coverage:**
- v1.1 requirements: 3 total
- Mapped to phases: 3
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-03*  
*Milestone: v1.1 — UI/UX & Arena Visual Showcase Polish*
