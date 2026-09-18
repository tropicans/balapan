# Phase 19: Race Director Elimination Command Center UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-18
**Phase:** 19-race-director-elimination-command-center-ui
**Areas discussed:** Letak & Desain Tombol "Finalisasi / Kunci Babak 2", Konfirmasi vs Instant Action saat Klik Pemenang, Pembersihan Kontrol Digital Lama

---

## Letak & Desain Tombol "Finalisasi / Kunci Babak 2"

| Option | Description | Selected |
|--------|-------------|----------|
| Banner Progres Babak 2 (Atas Bagan) | Tombol berada di baris progres ronde Babak 2 ("X/Y Selesai"). Menyala aktif saat 100% heat selesai, memicu modal konfirmasi, dan menampilkan tombol Emergency Unlock saat terkunci. | ✓ |
| Header Utama Dasbor | Berdampingan langsung dengan tombol "Kunci Kualifikasi" di panel atas layar RD. | |
| Kombinasi Keduanya | Status ringkas di header atas, dan tombol aksi interaktif di atas bagan. | |

**User's choice:** Banner Progres Babak 2 (Atas Bagan)
**Notes:** Menjaga fokus Race Director langsung pada konteks bagan Babak 2 saat memeriksa kesiapan heat.

---

## Konfirmasi vs Instant Action saat Klik Pemenang

| Option | Description | Selected |
|--------|-------------|----------|
| 1-Klik Instan Tanpa Pop-up | Klik 'MENANG' langsung menetapkan juara heat seketika, heat langsung hijau SELESAI, pemenang bertanda mahkota dan auto-advance ke babak berikutnya. | ✓ |
| Konfirmasi Dialog | Klik 'MENANG' memunculkan modal konfirmasi singkat sebelum menetapkan pemenang. | |

**User's choice:** 1-Klik Instan Tanpa Pop-up
**Notes:** Prioritas kecepatan dan kenyamanan eksekusi di arena balap tanpa gangguan dialog popup berulang.

---

## Pembersihan Kontrol Digital Lama

| Option | Description | Selected |
|--------|-------------|----------|
| Ganti Penuh | Tab Kontrol Heat digantikan seutuhnya oleh Pusat Komando Eliminasi Babak 2 s/d Final, membersihkan kontrol digital & stopwatch lama yang sudah usang. | ✓ |
| Simpan Sebagai Sub-tab | Pindahkan kontrol digital lama ke sub-tab terpisah. | |

**User's choice:** Ganti Penuh
**Notes:** Membersihkan antarmuka dasbor `/director` dari kode lama yang tidak lagi dipakai dalam turnamen fisik v3.0+.

---

## the agent's Discretion

- Styling tema Cyberpunk (Dark Obsidian, Electric Cyan, Neon Green, Neon Pink, Neon Amber) konsisten dengan seluruh sistem balapan.
- Penyesuaian responsivitas layout kartu heat.

## Deferred Ideas

- Pintasan keyboard cepat (Hotkey) untuk memilih pemenang jalur A, B, C.
