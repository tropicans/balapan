---
phase: "19"
slug: "race-director-elimination-command-center-ui"
status: approved
shadcn_initialized: false
preset: none
created: "2026-09-18"
---

# Phase 19 — UI Design Contract: Race Director Elimination Command Center

> Visual and interaction contract for Phase 19 frontend implementation in `RaceDirectorDashboard.jsx`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (TailwindCSS custom cyber theme) |
| Preset | Cyberpunk Neo-Racing |
| Component library | Custom React components (`CyberButton`, `CyberCard`) |
| Icon library | `lucide-react` |
| Font | Orbitron (headers/display) + JetBrains Mono / Inter (body/labels) |

---

## Component Inventory

| Component | Import path | Notes |
|-----------|-------------|-------|
| `CyberButton` | `../components/ui/CyberButton.jsx` | Tombol cyberpunk dengan clip-corner dan glow |
| `CyberCard` | `../components/ui/CyberCard.jsx` | Container kartu cyberpunk dengan border aksen |
| `BtoManager` | `../components/director/BtoManager.jsx` | Tab manajemen BTO manual yang tetap dipertahankan |
| `EliminationManager` / `MatchCard` | Inline / Embedded in `RaceDirectorDashboard.jsx` | Kartu heat 3-jalur (A/B/C) dengan tombol 1-klik `MENANG` |

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps between tags, inline icons |
| sm | 8px | Spacing between lane rows, compact padding |
| md | 16px | Padding match card, default component spacing |
| lg | 24px | Section padding, grid gap between heats |
| xl | 32px | Major container gaps |
| 2xl | 48px | Page section breaks |

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 12px (text-xs) | 400 (font-mono) | 1.4 |
| Label | 10px-11px | 700 (font-orbitron) | 1.2 |
| Heading | 16px-20px | 800 (font-orbitron font-black) | 1.2 |
| Display | 24px-30px | 900 (font-orbitron font-black) | 1.1 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0a0b10` (`bg-obsidian`) / `#000000` | Background utama dan kanvas layar |
| Secondary (30%) | `#12131a` (`bg-midnight`) / `#1a1b26` | Card background, tab bar background |
| Accent Cyan (10%) | `#00f0ff` (`neonCyan`) | Tab aktif ronde, search highlight, Jalur B |
| Accent Pink | `#ff0055` (`neonPink`) | Jalur A, border aksen eliminasi |
| Accent Green | `#39ff14` (`neonGreen`) | Tombol `MENANG`, badge `SELESAI`, Jalur C |
| Accent Amber/Gold | `#ffb700` (`neonAmber`) | Tombol `FINALISASI / KUNCI BABAK 2`, mahkota `JUARA`, Grand Final |
| Destructive | `#ef4444` (`red-500`) | Tombol Emergency Unlock, badge `TERKUNCI` |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary Tab 1 | `PUSAT KOMANDO ELIMINASI` |
| Primary Tab 2 | `MANAJEMEN BTO MANUAL (v3.0)` |
| Finalize Button (Active) | `FINALISASI / KUNCI BABAK 2` |
| Finalize Button (Disabled) | `KUNCI BABAK 2 (SISA [N] HEAT PENDING)` |
| Unlock Button | `BUKA KUNCI BABAK 2 (EMERGENCY UNLOCK)` |
| Finalize Modal Title | `FINALISASI & KUNCI BABAK 2` |
| Finalize Modal Body | `Seluruh [N] heat Babak 2 telah selesai. Mengunci Babak 2 akan membekukan hasil heat dan mengamankan bagan Babak 3 sebelum pertandingan dimulai. Lanjutkan?` |
| Unlock Modal Title | `BUKA KUNCI BABAK 2 (DARURAT)` |
| Unlock Modal Body | `Yakin membuka kembali kunci Babak 2? Ini memungkinkan revisi pemenang heat Babak 2 jika terjadi kesalahan input lapangan.` |
| 1-Click Winner Button | `MENANG` |
| Winner Crown Badge | `JUARA` |
| Heat Status Completed | `SELESAI` |
| Heat Status Pending | `PENDING` |
| Empty State Heading | `TIDAK ADA HEAT DITEMUKAN` |
| Empty State Body | `Tidak ada heat di babak ini yang cocok dengan kriteria pencarian.` |

---

## UI Considerations

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| Populated | Match Grid | ✅ covered | Menampilkan heat 3-jalur dengan info Jalur A (Pink), B (Cyan), C (Green), nomor peserta, dan tim |
| Completed State | Match Card | ✅ covered | Heat selesai ber-border hijau neon `border-neonGreen/60` dengan pemenang bermahkota emas |
| Pending State | Match Card | ✅ covered | Heat pending ber-border abu-abu/amber dengan badge `PENDING` berkedip halus |
| Locked State | Round 2 Heats | ✅ covered | Saat Babak 2 terkunci, tombol `MENANG` di Babak 2 disembunyikan/dibekukan untuk mencegah salah klik |
| Progress Bar | Round 2 Toolbar | ✅ covered | Menampilkan counter `X / Y Heat Selesai` dan status `TERBUKA` vs `TERKUNCI` |
| Filter & Search | Toolbar | ✅ covered | Omni-search instan nomor heat/nama/tim dan filter status (Semua, Pending, Selesai) |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** approved 2026-09-18
