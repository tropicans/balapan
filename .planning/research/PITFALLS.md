# Pitfalls Research

**Domain:** Physical Coupon & Marshal-Driven Tournament System
**Researched:** 2026-09-04
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Start Box Line-Up Bottleneck (Track Idle Time)

**What goes wrong:**
Marshal menghabiskan waktu >20 detik per race mencari nama pembalap di dropdown panjang, menyebabkan lintasan sepi dan peserta mengantre frustrasi.

**Why it happens:**
UI dirancang seperti form biasa dengan dropdown standar tanpa search instan, tanpa kartu sentuh cepat, atau tanpa scan barcode serial lembar kupon.

**How to avoid:**
1. Desain Dasbor Marshal Start Box dengan tombol besar per Jalur (A, B, C).
2. Sediakan input pencarian instan (ketik 2 huruf langsung filter nama) + opsi kamera / barcode scanner untuk tap langsung barcode lembar kupon.
3. 1-tap assign untuk langsung mengunci kupon ke jalur yang ditunjuk.

**Phase to address:**
Phase 08 (Marshal Start Box Rapid Entry UI)

---

### Pitfall 2: Desinkronisasi Antara Coretan Kupon Kertas dan Saldo Digital

**What goes wrong:**
Marshal mencoret kotak ke-9 di kertas, tetapi di sistem tombol lupa ditekan atau koneksi putus, sehingga saldo sistem masih 50 sedangkan kertas sudah dicoret 9. Atau sebaliknya: di sistem terpotong tapi kertas tidak tercoret.

**Why it happens:**
Tidak ada indikator nomor kupon yang jelas di layar Marshal yang cocok dengan angka yang harus dicoret ("CORET NOMOR 9").

**How to avoid:**
Tampilkan dengan huruf raksasa di layar Marshal: **"SILAKAN CORET KOTAK #9 PADA KUPON"** dengan tombol konfirmasi "SUDAH DICORET". Sistem tidak mengizinkan start sebelum Marshal mengonfirmasi nomor kupon tersebut.

**Phase to address:**
Phase 08 (Marshal Start Box Rapid Entry UI)

---

### Pitfall 3: Duplikasi / Salah Pembagian Tiket Babak Berikutnya Saat Finish

**What goes wrong:**
Ketika mobil finish, Race Director menekan Finish dua kali atau salah memilih nama, mengakibatkan tiket Babak 2 terbit ganda atau masuk ke pembalap yang klontang.

**Why it happens:**
Logic auto-advance tidak memiliki constraint idempotency dan validasi status mobil.

**How to avoid:**
Gunakan transaksi database atomic dengan unique constraint pada tiket per race (`source_match_id` + `lane_position`) dan validasi ketat status harus `FINISH` (waktu valid > 0 detik), bukan `DNF` / `CO`.

**Phase to address:**
Phase 09 (Automated Ticket Engine & Bracket Placement)

---

### Pitfall 4: Rusak / Terpotongnya Layout Cetak Lembar Kupon di Berbagai Printer

**What goes wrong:**
Saat kasir menekan tombol Cetak Kupon, layout 50 kotak terpotong menjadi 2 halaman atau barcode terlalu kecil/buram sehingga tidak bisa dibaca scanner.

**Why it happens:**
Menggunakan CSS default tanpa `@page { size: A4; margin: 10mm; }` dan `page-break-inside: avoid`.

**How to avoid:**
Terapkan CSS `@media print` murni dengan grid 5 kolom x 10 baris (atau 10x5) berdimensi fix, warna hitam-putih kontras tinggi (`#000` di atas kertas putih), dan barcode SVG high-res.

**Phase to address:**
Phase 07 (Printable Physical Coupon Generator & Cashier Management)

---
*Pitfalls research for: Physical Coupon & Marshal-Driven Tournament System*
*Researched: 2026-09-04*
