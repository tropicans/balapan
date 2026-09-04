# Feature Research

**Domain:** Physical Coupon & Marshal-Driven Tournament System
**Researched:** 2026-09-04
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Generator & Cetak Lembar Kupon Fisik (50 Kotak) | Panitia butuh lembar kupon fisik berisi 50 kotak nomor untuk dicoret Marshal saat turun race | MEDIUM | Template `@media print` A4/A5 dengan barcode seri paket, nama racer, dan grid 50 kotak rapi |
| Dasbor Marshal Start Box (Quick Line-up) | Marshal di lintasan harus bisa memilih pembalap di Jalur A, B, C dalam hitungan detik tanpa mengetik manual | MEDIUM | Tampilan mobile/tablet touch-first, kartu pembalap besar, filter cepat, dan tombol "KUPON TERPAKAI" |
| Pencatatan Kupon Terpakai (Run Increment) | Setiap kali pembalap masuk start box, angka kupon berjalan bertambah (misal race ke-9) dan sinkron ke database | LOW | Atomic counter per paket kupon, validasi sisa kupon tidak boleh minus |
| Auto-Issuance Kupon/Tiket Babak Berikutnya | Saat mobil dinyatakan FINISH (lolos), sistem otomatis menerbitkan tiket Babak 2/Berikutnya dan menempatkannya ke bracket | MEDIUM | Terhubung langsung dengan Race Director finish event dan modul bracket eliminasi v1.2 |
| Penanganan Klontang (Kupon Hangus) | Jika mobil Klontang / CO, kupon tetap hangus tanpa tiket babak berikutnya | LOW | Sinkron dengan state machine race status `ALL_DNF` atau per-jalur CO |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 1-Tap Barcode/Seri Package Scanner | Marshal bisa scan barcode di lembar kupon fisik peserta untuk auto-assign ke Jalur A, B, atau C | LOW | Mendukung kamera HP atau scanner USB portable |
| Live TV Leaderboard Pemegang Tiket Babak 2 | Menampilkan secara transparan di TV Sirkuit siapa saja racer yang sudah mengamankan tiket Babak Berikutnya | LOW | Motivasi tinggi untuk peserta di pit area melihat kuota tiket yang tersisa |
| Cetak Struk Tiket Babak 2 (Optional Slip) | Opsi cetak struk fisik kecil (tiket emas) untuk peserta yang lolos babak berikutnya sebagai cinderamata/bukti | LOW | Mini thermal print format (58mm/80mm) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Wajib Smartphone Scan di Start Box | Terkesan modern dan paperless | Antrean start box jadi macet parah jika HP peserta lowbat, layar retak, atau lag jaringan | Lembar kupon fisik dicoret manual oleh Marshal, aplikasi dipegang Marshal/RD |
| Input manual nomor kupon panjang di lintasan | Keinginan mencatat detail setiap kupon | Marshal tertekan dan rawan typo saat 3 mobil siap dilepas | Sistem counter otomatis (kupon ke-N otomatis bertambah saat slot diisi) |

## Feature Dependencies

```
[Registrasi Kasir & Beli Paket]
     └──creates──> [Paket Kupon & Printable 50-Box Sheet]
                       └──consumed by──> [Dasbor Marshal Start Box]
                                             └──launches──> [Race Director Run]
                                                                └──finish creates──> [Tiket Babak Berikutnya & Slot Bracket v1.2]
```

## MVP Definition (Milestone v2.0)

### Launch With (v2.0)

- [ ] **Printable Coupon Sheet Generator** — Cetak lembar 50 kotak nomor seri langsung dari browser.
- [ ] **Marshal Start Box Line-Up Dashboard** — Seleksi pembalap jalur A, B, C secepat kilat & debit kupon fisik.
- [ ] **Automated Finish-to-Next-Round Ticket Engine** — Tiket Babak Berikutnya otomatis terbit saat FINISH.
- [ ] **Realtime Circuit TV Ticket Showcase** — Papan pengumuman peserta pemegang tiket Babak 2 di HUD TV.

---
*Feature research for: Physical Coupon & Marshal-Driven Tournament System*
*Researched: 2026-09-04*
