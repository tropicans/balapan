# Roadmap: Milestone v1.2 — Multi-Round 3-Lane Elimination System

## Milestone Summary

Mengupgrade modul bracket eliminasi dari format kaku 2-peserta 8-slot menjadi sistem gugur berjenjang skala besar (Babak 2, Babak 3, dst.) dengan kapasitas 100+ heat dan 3 peserta per race (Line A, Line B, Line C).

---

## Phases

### Phase 5: 3-Lane Elimination Backend Engine & Auto-Advance Schema (Completed: 2026-09-03)

**Goal**: Mengembangkan backend engine eliminasi 3-jalur (Jalur A, B, C) dengan dukungan pembuatan heat dinamis hingga 100+ heat dan auto-advance pemenang antar ronde secara berjenjang.

- **Requirements**: `ELIM-01`, `ELIM-02`, `ELIM-03`
- **Deliverables**:
  1. Update fungsi `seedIntoBracket` di `server/raceManager.js` untuk mengisi 3 slot kontestan (`user_id_1`, `user_id_2`, `user_id_3`) per heat.
  2. Logika pembuatan heat otomatis jika kuota heat Babak 2 bertambah (skalabilitas hingga 100+ heat).
  3. Update `advanceBracketWinner` di `server/raceManager.js` untuk mempromosikan pemenang dari Babak $R$ ke slot kosong di Babak $R+1$ hingga Grand Final.
  4. Unit test suite untuk memvalidasi aliran seeding 3-jalur dan promosi multi-babak.
- **Success Criteria**:
  1. Kontestan yang lolos Scrutineer Babak 1 mengisi slot Jalur A, B, C secara bergantian dan adil di Babak 2.
  2. Memilih pemenang di Heat Babak 2 otomatis menempatkan pembalap tersebut ke Babak 3 tanpa duplikasi.
  3. Seluruh unit test backend (termasuk skenario 3-peserta per heat) lulus 100%.
- **Plans**: 1/1 plans executed (Complete)

Plans:

- [x] 05-01-PLAN.md
- [x] 05-01: Backend engine 3-jalur (ELIM-01..03), alokasi dinamis 100+ heat, & auto-advance multi-ronde

---

### Phase 6: Multi-Round Scalable Elimination Dashboard UI

**Goal**: Merombak antarmuka dasbor eliminasi (`BracketDashboard.jsx`) dan Navbar untuk mendukung navigasi multi-ronde, kartu heat 3-jalur, dan pagination/filter 100+ heat yang mulus.

- **Requirements**: `ELIM-04`, `ELIM-05`, `ELIM-06`, `ELIM-07`
- **Deliverables**:
  1. Navigasi tab babak berjenjang (`Babak 2`, `Babak 3`, `Babak 4`, `Grand Final`) di `BracketDashboard.jsx`.
  2. Kartu heat cyber 3-jalur (Line A Pink, Line B Cyan, Line C Green) dengan indikator pemenang & status PENDING/SELESAI.
  3. Fitur filter pencarian nomor heat atau nama pembalap serta pagination/grid grouping untuk menampung 100+ heat.
  4. Update tab navigasi di `client/src/components/ui/Navbar.jsx` menjadi **"Babak Eliminasi"**.
- **Success Criteria**:
  1. User dapat beralih antar babak (Babak 2, 3, 4, Grand Final) dengan satu klik.
  2. Setiap kartu heat menampilkan 3 pembalap lengkap dengan warna jalur yang kontras.
  3. Pencarian heat bekerja responsif dan 100+ heat dapat dijelajahi tanpa lag atau layout pecah.
  4. Navbar menampilkan label "Babak Eliminasi" secara konsisten.
- **Plans**: 0/1 plans executed

Plans:

- [ ] 06-01-PLAN.md
- [ ] 06-01: Multi-round scalable elimination dashboard UI & 3-lane bracket cards

---

## Milestone Traceability Matrix

| Requirement | Phase | Goal |
|-------------|-------|------|
| **ELIM-01** | Phase 5 | Slot 3 kontestan (Jalur A, B, C) per heat di backend |
| **ELIM-02** | Phase 5 | Seeding otomatis pemenang Babak 1 ke Babak 2 (skala 100+ heat) |
| **ELIM-03** | Phase 5 | Auto-Advance pemenang Babak $R$ ke Babak $R+1$ |
| **ELIM-04** | Phase 6 | Tab selector antar ronde di dasbor eliminasi |
| **ELIM-05** | Phase 6 | Kartu heat cyberpunk 3-baris warna jalur |
| **ELIM-06** | Phase 6 | Pencarian heat & pagination untuk 100+ heat |
| **ELIM-07** | Phase 6 | Rename navbar tab menjadi "Babak Eliminasi" |
