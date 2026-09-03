# Roadmap: NEO-TAMIYA Racing System (DGDash)

## Milestones

- ✅ **[v1.0: Full SRS & Blueprint Compliance](milestones/v1.0-ROADMAP.md)** — Shipped 2026-09-03 (Phases 1-2, 100% SRS & Blueprint verified)
- 🚀 **v1.1: UI/UX & Arena Visual Showcase Polish** — In Progress (Phases 3-4)

---

## Milestone v1.1: UI/UX & Arena Visual Showcase Polish

Menerapkan seluruh rekomendasi hasil audit mendalam sistem UI Designer untuk menyempurnakan ergonomi antarmuka Pusat Komando Race Director serta memberikan pengalaman visual sirkuit bertaraf *showcase* arcade modern.

### Phases

- [x] **Phase 3: Race Director 3-Column Ergonomics & BTO Shimmer** - Reorganisasi layout input waktu RD menjadi 3-kolom horizontal sejajar lintasan + pendar animasi emas BTO #1.
- [x] **Phase 4: Fullscreen Dynamic Countdown HUD Overlay** - Visual pop-up hitungan mundur raksasa di layar TV 16:9 saat 10 detik menuju pelepasan mobil.

---

## Phase Details

### Phase 3: Race Director 3-Column Ergonomics & BTO Shimmer
**Goal**: Race Director dapat menginput waktu stopwatch fisik 3-jalur secara cepat dan bebas salah baris, serta pemegang rekor BTO #1 mendapatkan elevasi visual pendar emas di TV HUD dan mobile.  
**Depends on**: Milestone v1.0  
**Requirements**: UI-01, UI-02  
**Success Criteria** (what must be TRUE):
  1. Panel input finish time di Dasbor RD tersusun dalam 3 kolom horizontal berdampingan (Jalur A Pink, Jalur B Cyan, Jalur C Green) lengkap dengan nama dan tag pembalap di tiap kartu.
  2. Kartu BTO #1 pada leaderboard TV HUD memancarkan animasi pendar emas berputar (*cyber golden shimmer border*) untuk menegaskan rekor tercepat.
  3. Kartu tiket lolos babak kedua pada dashboard pembalap memiliki pendar emas eksklusif.
**Plans**: 1 plan

Plans:
- [x] 03-01: Implementasi layout 3-kolom finish time di RD Dashboard & border shimmer BTO emas di TV/Mobile

### Phase 4: Fullscreen Dynamic Countdown HUD Overlay
**Goal**: Layar TV Sirkuit 16:9 menampilkan visual hitungan mundur raksasa yang menyatu dengan audio suara manusia saat 10 detik menuju start.  
**Depends on**: Phase 3  
**Requirements**: UI-03  
**Success Criteria** (what must be TRUE):
  1. Saat RD memulai hitungan mundur babak kedua, TV HUD memunculkan overlay dramatis dengan angka raksasa berdenyut (10 s.d. 1) di tengah layar.
  2. Saat countdown selesai, overlay meledak dengan animasi teks "GO! LEPAS MOBIL!" berlatar pendar neon hijau.
  3. Overlay tertutup otomatis atau saat countdown dihentikan oleh RD.
**Plans**: 1 plan

Plans:
- [x] 04-01: Implementasi fullscreen dynamic countdown overlay pada RealtimeTV.jsx

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 3. RD 3-Column Ergonomics & BTO Shimmer | 1/1 | Complete | 2026-09-03 |
| 4. Fullscreen Dynamic Countdown HUD Overlay | 1/1 | Complete | 2026-09-03 |

---
*Roadmap defined: 2026-09-03*  
*Last updated: 2026-09-03 after Milestone v1.1 Phase 4 completion*
