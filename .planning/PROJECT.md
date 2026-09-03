# NEO-TAMIYA Racing System

## What This Is

Sistem manajemen turnamen balap Tamiya digital berbasis 100% web yang dirancang secara *paperless* dan *frictionless*, menghilangkan 100% ketergantungan pada hardware RFID/NFC fisik dengan memanfaatkan QR Code dinamis, pemetaan jalur otomatis, kontrol pusat Race Director, serta siaran klasemen HUD real-time.

## Core Value

Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.

## Business Context

- **Customer**: Penyelenggara turnamen Tamiya, sirkuit/toko hobi Mini 4WD se-Indonesia.
- **Revenue model**: SaaS berlangganan untuk sirkuit/penyelenggara turnamen atau lisensi per-event.
- **Success metric**: 100% pergantian race tanpa jeda manual dan nol kesalahan pencatatan waktu/kupon.
- **Strategy notes**: Mengacu pada `tamiya-developer-handover-srs.md` dan `tamiya-web-app-blueprint-v20.md`.

## Requirements

### Validated

- ✓ Arsitektur 100% Web App (Vite React + Express Socket.IO + SQLite WASM) — baseline
- ✓ Dual-Track Registration (Pendaftaran mandiri + Registrasi manual kasir tamu/anak) — baseline
- ✓ Top-up saldo kupon kualifikasi & sinkronisasi real-time — baseline
- ✓ Scan QR jalur (LINE A, B, C) via kamera HP & stensil meja pit — baseline
- ✓ Pencegahan Race Condition dengan database lock & pergeseran halus antrean — baseline
- ✓ Tombol jempol raksasa "SIAP BALAP" & "BATAL" (refund kupon otomatis) — baseline
- ✓ Pusat Komando Race Director (Kunci Balapan & debit kupon, input waktu Skenario B) — baseline
- ✓ Meja Scrutineer model tablet "Tanya Nama" (LOLOS / DQ) — baseline
- ✓ Validasi rekor Best Time Overall (BTO) & animasi confetti emas — baseline
- ✓ Babak 2 Single Elimination Bracket & auto-placement pemenang tanpa kupon/QR — baseline
- ✓ Hitung mundur suara manusia 10 s.d. 1 bahasa Indonesia + haptic HP — baseline
- ✓ Layar TV Sirkuit HUD 16:9 real-time + running text antrean race — baseline
- ✓ **EXCP-01**: Tombol "SEMUA CO / DNF (No Winner)" menutup race tanpa pemenang, kupon tetap terpotong — Shipped in v1.0
- ✓ **EXCP-02**: "DEKLARASI RE-RACE" modal checklist jalur, permit gratis, zero rescan — Shipped in v1.0
- ✓ **SCRUT-01**: Active Alert Lapis 2 (banner kuning berkedip) di tablet Scrutineer saat race locked — Shipped in v1.0
- ✓ **SCRUT-02**: Tombol darurat "Ambil Alih Hasil (Override)" Lapis 3 di tablet Scrutineer — Shipped in v1.0
- ✓ **UI-01**: Layout input finish time horizontal 3-kolom di Dasbor Race Director (`RaceDirectorDashboard.jsx`) sejajar jalur A, B, C — Shipped in v1.1
- ✓ **UI-02**: Efek visual pendar emas dinamis (*cyber shimmer border*) pada pemegang rekor BTO #1 dan kartu pemenang — Shipped in v1.1
- ✓ **UI-03**: Overlay visual hitungan mundur raksasa dramatis di layar TV Sirkuit 16:9 (`RealtimeTV.jsx`) sinkron dengan audio & GO — Shipped in v1.1

### Active

- [ ] **ELIM-01**: Skema data & backend logic eliminasi 3-jalur (Jalur A, B, C) dengan auto-advance pemenang antar ronde
- [ ] **ELIM-02**: Antarmuka Dasbor Eliminasi Berjenjang multi-babak (Babak 2, 3, dst.) dengan heat card 3-pembalap dan filter navigasi
- [ ] **ELIM-03**: Integrasi Race Director & Layar TV Sirkuit untuk eksekusi heat babak eliminasi real-time

## Current Milestone: v1.2 Multi-Round 3-Lane Elimination System

**Goal:** Mengupgrade modul bracket eliminasi dari skema kaku 2-peserta 8-slot menjadi sistem gugur berjenjang skala besar (Babak 2, Babak 3, dst.) dengan kapasitas 100+ heat dan 3 peserta per race (Line A, Line B, Line C).

**Target Features:**
1. **3-Lane Bracket Architecture**: Setiap match/heat eliminasi menampung 3 kontestan (Jalur A Pink, Jalur B Cyan, Jalur C Green) memanfaatkan `user_id_3`.
2. **Multi-Round Hierarchy**: Navigasi berjenjang dinamis (`Babak 2` -> `Babak 3` -> `Babak 4` ... -> `Grand Final 3 Mobil`).
3. **Scalable Heat Grid & Filter**: Navigasi responsif untuk 100+ heat per babak dengan pencarian nomor heat & nama pembalap.
4. **Auto-Advance Engine**: Pemenang tiap heat otomatis dipromosikan mengisi slot kosong babak selanjutnya tanpa input kupon ulang.

### Out of Scope

- Integrasi sensor perangkat keras RFID/NFC fisik — *Desain sistem sengaja 100% paperless & zero-hardware untuk menekan biaya sirkuit*.
- Buzzer pelepas start otomatis di akhir countdown — *Pelepasan mobil diserahkan manual kepada Marshal di lapangan agar aman dan adil*.

## Context

- Beroperasi di jaringan tertutup sirkuit (LAN / Wi-Fi Hotspot) atau cloud.
- WebSocket latensi rendah (<50ms) untuk sinkronisasi HP peserta, dasbor RD, tablet juri, dan TV sirkuit.
- Estetika Cyberpunk / Neo-Racing: Midnight Obsidian (`#0a0b10`), Neon Pink (`#ff0055`), Electric Cyan (`#00f0ff`), Acid Green (`#39ff14`).

## Constraints

- **Tech Stack**: Node.js ESM + Express, Socket.IO, sql.js (WASM SQLite) di backend; React 18, Vite, TailwindCSS di frontend.
- **UI/UX**: Keterbacaan kontras tinggi, tombol aksi mobile thumb-friendly (>30% tinggi layar).
- **Integritas Transaksi**: Saldo kupon tidak boleh terpotong ganda atau hilang saat re-race/batal valid.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web App QR Code pengganti RFID | Nol biaya alat, fleksibel tambah jalur hanya cetak kertas | ✓ Good |
| Skenario B (Input Waktu Semi-Manual) | Mencegah loophole mobil terlempar lewat garis sensor | ✓ Good |
| Sistem "Tanya Nama" di Meja Scrutineer | Menghilangkan kerumitan scan QR kedua kali di meja juri | ✓ Good |
| Suara Manusia Asli untuk Countdown | Meningkatkan ketegangan atmosfer sirkuit tanpa buzzer bising | ✓ Good |
| Kupon kualifikasi Semua CO/DNF | Hangus sesuai regulasi turnamen (slot balapan terpakai) | ✓ Shipped v1.0 |
| Re-Race Free Permit | Balap ulang tanpa potong saldo kupon baru & tanpa scan ulang | ✓ Shipped v1.0 |
| Scrutineer Emergency Override | Fail-safe Lapis 3 di meja juri untuk auto-placement bagan | ✓ Shipped v1.0 |
| Ergonomi 3-Kolom Stopwatch | Menyamai tata letak 3 stopwatch fisik di meja Race Director | ✓ Shipped v1.1 |
| Cyber Golden Shimmer BTO | Animasi pendar hangat untuk membedakan rekor puncak BTO #1 | ✓ Shipped v1.1 |
| Fullscreen Countdown HUD Overlay | Overlay 16:9 fixed z-50 sinkron WebSocket audio & selebrasi GO | ✓ Shipped v1.1 |

## Shipped Milestones

- **v1.0**: Full SRS & Blueprint Compliance (Shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1**: UI/UX & Arena Visual Showcase Polish (Shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-03 after Milestone v1.1 completion*
