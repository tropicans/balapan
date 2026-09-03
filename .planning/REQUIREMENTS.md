# Requirements: Milestone v1.2 — Multi-Round 3-Lane Elimination System

## Overview
Mengembangkan modul turnamen eliminasi berjenjang (Babak 2, Babak 3, dst.) dengan format 3-jalur (Jalur A, B, C) per heat dan kapasitas dinamis hingga 100+ heat, menggantikan skema kaku 2-peserta 8-slot.

## Functional Requirements

### 1. 3-Lane Elimination Backend Engine & Data Schema
- [x] **ELIM-01**: Sistem mendukung 3 pembalap per heat (`user_id_1`, `user_id_2`, `user_id_3` memetakan ke Jalur A Pink, Jalur B Cyan, Jalur C Green) pada tabel `bracket_matches`.
- [x] **ELIM-02**: Logika `seedIntoBracket` menempatkan peserta yang lolos Scrutineer Babak 1 ke slot kosong 3-jalur di Babak 2 secara berurutan dan mampu membuat heat baru secara dinamis hingga 100+ heat.
- [x] **ELIM-03**: Auto-Advance Engine secara otomatis mempromosikan 1 pemenang dari tiap heat di Babak $R$ ke slot kosong di Babak $R+1$ hingga mencapai Grand Final (3 mobil).

### 2. Scalable Multi-Round Dashboard & UI Experience
- [x] **ELIM-04**: Antarmuka dasbor eliminasi (`BracketDashboard.jsx`) mengadopsi navigasi berjenjang (*Round Selector Tabs*: Babak 2, Babak 3, Babak 4, Grand Final) dengan label jumlah heat aktif.
- [x] **ELIM-05**: Setiap kartu pertandingan menampilkan 3 baris pembalap ber-aksen warna jalur resmi (Line A Merah/Pink, Line B Cyan/Biru, Line C Hijau) dengan tombol "MENANG" dan ikon mahkota juara.
- [x] **ELIM-06**: Terdapat filter pencarian cepat (berdasarkan nomor heat atau nama/tim pembalap) serta pagination/virtual grouping agar 100+ heat dapat dijelajahi dengan lancar tanpa lag.
- [x] **ELIM-07**: Navigasi utama Navbar memperbarui tab dari *"Bracket Babak 2"* menjadi *"Babak Eliminasi"*.

## Future Requirements (Out of Scope for v1.2)
- Integrasi bagan double-elimination (repechage / loser bracket).
- Export bagan turnamen dalam format PDF diagram vektor pohon.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ELIM-01 | Phase 5 | Complete |
| ELIM-02 | Phase 5 | Complete |
| ELIM-03 | Phase 5 | Complete |
| ELIM-04 | Phase 6 | Complete |
| ELIM-05 | Phase 6 | Complete |
| ELIM-06 | Phase 6 | Complete |
| ELIM-07 | Phase 6 | Complete |
