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

### Active

- [ ] **EXCP-01**: Race Director dapat menutup balapan dengan sekali klik "SEMUA CO / DNF (No Winner)" jika seluruh mobil crash (kupon kualifikasi tetap hangus).
- [ ] **EXCP-02**: Race Director dapat mendeklarasikan "DEKLARASI RE-RACE" dengan modal centang jalur A/B/C untuk balap ulang gratis tanpa potong kupon dan tanpa scan QR ulang.
- [ ] **SCRUT-01**: Meja Scrutineer menampilkan Active Alert (Lapis 2) kuning berkedip jika race aktif selesai di trek namun belum disubmit oleh RD.
- [ ] **SCRUT-02**: Meja Scrutineer memiliki tombol darurat "Ambil Alih Hasil (Override)" (Lapis 3) untuk memilih pemenang langsung dari meja juri.

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
*Last updated: 2026-09-03 after Milestone v1.0 initialization*
