# Project Research Summary

**Project:** NEO-TAMIYA Racing System (Milestone v2.0)
**Domain:** Physical Coupon & Marshal-Driven Tournament System
**Researched:** 2026-09-04
**Confidence:** HIGH

## Executive Summary

Riset milestone v2.0 mengkaji transisi operasional dari sistem *digital QR scan oleh peserta* menuju alur *Kupon Fisik Berisi 50 Kotak* yang dikelola 100% oleh Panitia (Kasir, Marshal Start Box, dan Race Director). Perubahan ini menyelaraskan aplikasi dengan kultur turnamen Mini 4WD nyata di lapangan: peserta membeli paket kupon kertas, Marshal di garis start mencoret kotak kupon (misal coret angka 9 pada balapan ke-9), dan sistem secara otomatis menerbitkan tiket Babak Berikutnya saat mobil berhasil FINISH.

Pendekatan teknis yang direkomendasikan mengandalkan kemampuan cetak bawaan browser (`@media print`) beresolusi tinggi tanpa server-side PDF overhead, Dasbor Marshal Start Box berbasis sentuhan kilat dengan pencarian instan dan pemindaian barcode seri lembar kupon, serta engine otomatisasi penerbitan tiket Babak 2 yang langsung terhubung ke skema bracket eliminasi 3-jalur (v1.2).

Risiko utama yang berhasil diidentifikasi adalah *start box line-up bottleneck* (Marshal terlalu lama menginput nama peserta) dan *desinkronisasi nomor coretan fisik dengan counter kupon digital*. Hal ini dimitigasi dengan instruksi visual raksasa di layar Marshal ("CORET KOTAK #N") dan tombol konfirmasi 1-tap.

## Key Findings

### Recommended Stack

Memaksimalkan stack Node.js ESM + Vite React + sql.js (SQLite WASM) yang sudah ada:
- **Print Engine:** CSS `@media print` murni untuk format A4/A5 lembar kupon 50 kotak dan thermal print tiket.
- **Barcode & Serial:** SVG vector barcode/QR generator di sisi klien untuk cetak tajam 300-600 DPI.
- **Real-Time Sync:** Socket.IO event channels (`marshal:lineup`, `race:finish`, `ticket:granted`) berlatensi rendah (<30ms).

### Expected Features

**Must have (table stakes):**
- **COUP-01 (Printable Coupon Sheet):** Generator lembar kupon fisik berisi barcode seri, identitas pembalap, dan grid 50 kotak untuk dicoret Marshal.
- **COUP-02 (Marshal Start Box Dashboard):** Dasbor touch-first bagi Marshal di samping lintasan untuk memilih pembalap di Jalur A, B, C dan mengonfirmasi pencoretan nomor kupon.
- **COUP-03 (Automated Ticket Engine):** Saat mobil Finish, sistem otomatis mencatat tiket Babak Berikutnya dan menempatkannya ke bracket eliminasi (v1.2). Jika Klontang/CO, kupon hangus tanpa tiket.
- **COUP-04 (TV HUD Ticket Showcase):** Papan pengumuman real-time di layar TV Sirkuit untuk menampilkan daftar pembalap yang memegang tiket Babak Berikutnya.

### Architecture Approach

Penambahan 2 tabel baru di SQLite (`coupon_packages` dan `next_round_tickets`) yang terintegrasi secara ACID dengan tabel `users`, `matches`, dan `race_logs`. Tidak ada ketergantungan hardware baru; semua peran (Kasir, Marshal, Race Director, Scrutineer) dijalankan melalui web browser responsif di perangkat masing-masing melalui jaringan LAN sirkuit.

### Critical Pitfalls

1. **Start Box Bottleneck:** Ditangani dengan kartu peserta berukuran besar, auto-complete 2 karakter, dan opsi scan barcode lembar fisik.
2. **Desinkronisasi Coretan Kertas vs Sistem:** Ditangani dengan prompt instruksi jelas "CORET KOTAK #N" pada layar Marshal sebelum mobil start.
3. **Tiket Ganda Saat Finish:** Ditangani dengan validasi atomic transaksi per match ID dan status mobil harus FINISH.

## Implications for Roadmap

Berdasarkan dependensi arsitektur dan kelanjutan penomoran dari Milestone v1.2 (Phase 06):

### Phase 07: Printable Physical Coupon Generator & Cashier Management
**Rationale:** Fondasi data paket kupon fisik (`coupon_packages`) dan template cetak 50 kotak harus ada sebelum Marshal bisa menggunakannya di lintasan.  
**Delivers:** Backend paket kupon, UI Kasir pendaftaran & cetak lembar kupon fisik CSS A4/A5.  
**Addresses:** `COUP-01`  
**Avoids:** Layout cetak terpotong di printer (Pitfall 4).

### Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard
**Rationale:** Membutuhkan data paket kupon dari Phase 07 untuk mengantrekan mobil di Jalur A, B, C sebelum race dimulai.  
**Delivers:** Dasbor Marshal mobile/tablet, 1-tap jalur assignment, instruksi "Coret Kotak #N", dan sinkronisasi ke Race Director.  
**Addresses:** `COUP-02`  
**Avoids:** Start box bottleneck dan desinkronisasi kupon (Pitfall 1 & 2).

### Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration
**Rationale:** Menghubungkan eksekusi race Race Director dengan tabel `next_round_tickets` dan bagan eliminasi multi-round (v1.2).  
**Delivers:** Auto-generation tiket Babak Berikutnya saat mobil finish, status Klontang (kupon hangus), dan auto-seed ke Babak 2 bracket.  
**Addresses:** `COUP-03`  
**Avoids:** Duplikasi tiket atau salah pembagian tiket (Pitfall 3).

### Phase 10: Realtime Circuit TV Ticket HUD Showcase & Polish
**Rationale:** Mengonsumsi data tiket dari Phase 09 untuk disiarkan di layar TV Sirkuit 16:9 secara spektakuler.  
**Delivers:** Marquee/ticker pemegang tiket Babak Berikutnya di layar TV, kartu selebrasi finish, dan audit kesiapan operasional akhir.  
**Addresses:** `COUP-04`  

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Menggunakan native browser print dan SQLite WASM yang sudah terbukti di codebase |
| Features | HIGH | Sesuai dengan spesifikasi detail alur turnamen kupon dari user |
| Architecture | HIGH | Relasi tabel `coupon_packages` dan `next_round_tickets` melengkapi modul v1.2 |
| Pitfalls | HIGH | Praktik lapangan turnamen Tamiya di Indonesia telah dipetakan secara detail |

**Overall confidence:** HIGH

---
*Research completed: 2026-09-04*
*Ready for roadmap: yes*
