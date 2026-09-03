# Roadmap: NEO-TAMIYA Racing System

## Overview

Milestone v1.0 berfokus pada penyelesaian sisa gap fungsional agar sistem mencapai 100% kepatuhan terhadap dokumen spesifikasi `tamiya-developer-handover-srs.md` dan `tamiya-web-app-blueprint-v20.md`. Pekerjaan dibagi ke dalam 2 fase eksekusi: penanganan kondisi darurat balapan (Semua CO/DNF & Re-Race), diikuti dengan penguatan peringatan meja scrutineer dan override darurat juri.

## Phases

- [ ] **Phase 1: Race Exceptions & Recovery** - Penanganan kondisi Semua Crash/CO (No Winner) dan Alur Deklarasi Re-Race (Permit Gratis, Zero Rescan).
- [ ] **Phase 2: Scrutineer Desk Alerts & Emergency Override** - Indikator berkedip Active Alert Lapis 2 dan Tombol Ambil Alih Hasil (Override) Lapis 3 di tablet juri.

## Phase Details

### Phase 1: Race Exceptions & Recovery
**Goal**: Race Director dapat menangani kondisi darurat lintasan tanpa merusak integritas kupon dan tanpa memaksa peserta mengulang pendaftaran manual.
**Depends on**: Nothing (first phase)
**Requirements**: EXCP-01, EXCP-02
**Success Criteria** (what must be TRUE):
  1. Race Director dapat menekan tombol merah "SEMUA CO / DNF (No Winner)" di Dasbor Komando; balapan ditutup dengan status `completed` tanpa pemenang dan kupon peserta tetap hangus terpotong secara sah.
  2. Race Director dapat menekan tombol "DEKLARASI RE-RACE" dan memilih jalur A/B/C via modal pop-up; jalur terpilih otomatis kembali ke status `ready` tanpa saldo kupon terpotong ganda dan tanpa peserta perlu scan QR ulang.
  3. TV Sirkuit dan HP peserta menampilkan status notifikasi khusus saat Semua CO atau Re-Race dideklarasikan.
  4. Pengujian otomatis alur balapan (`tests`) memverifikasi kedua alur kondisi darurat ini.
**Plans**: 1 plan

Plans:
- [ ] 01-01: Implementasi backend endpoint dan UI Dasbor RD untuk Semua CO/DNF dan Deklarasi Re-Race

### Phase 2: Scrutineer Desk Alerts & Emergency Override
**Goal**: Meja pemeriksaan fisik (Scrutineering) memiliki sistem peringatan aktif dan kemampuan darurat mengambil alih hasil perlombaan jika terjadi kendala komunikasi dengan Race Director.
**Depends on**: Phase 1
**Requirements**: SCRUT-01, SCRUT-02
**Success Criteria** (what must be TRUE):
  1. Tablet Scrutineer menampilkan Active Alert (Lapis 2) berupa banner/kartu berkedip kuning *"Race Aktif Belum Disubmit Admin"* jika balapan aktif berstatus `locked` dan peserta sudah tiba di meja juri.
  2. Tablet Scrutineer menyediakan tombol "Ambil Alih Hasil (Override)" (Lapis 3) yang memungkinkan juri memilih pemenang langsung dan menetapkan status LOLOS/DQ saat laptop RD mengalami masalah koneksi.
  3. Pemenang yang disetujui melalui override juri otomatis terhubung ke pencatatan BTO dan bracket Babak Kedua.
**Plans**: 1 plan

Plans:
- [ ] 02-01: Implementasi UI Alert Lapis 2 dan Emergency Override Lapis 3 pada Scrutineer Dashboard

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Race Exceptions & Recovery | 0/1 | Not started | - |
| 2. Scrutineer Desk Alerts & Emergency Override | 0/1 | Not started | - |

---
*Roadmap defined: 2026-09-03*  
*Last updated: 2026-09-03 after Milestone v1.0 initialization*
