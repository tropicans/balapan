# Roadmap: Milestone v2.0 — Physical Coupon & Marshal-Driven Tournament System

## Milestone Summary

Mengadaptasi operasional turnamen Mini 4WD ke sistem kupon fisik (lembar 50 kotak) yang lazim di lapangan, di mana 100% alur registrasi, pencoretan kupon di garis start, dan eksekusi balapan dijalankan oleh Panitia (Kasir, Marshal Start Box, dan Race Director), serta tiket Babak Berikutnya diterbitkan secara otomatis saat mobil berhasil finish.

---

## Phases

### Phase 07: Pre-Printed Coupon Package Registration & Cashier Flow

**Goal**: Menyediakan skema data paket kupon fisik (`coupon_packages`), validasi nomor seri lembar kupon pre-printed (50 kotak), dan antarmuka pendaftaran kasir cepat dengan input barcode atau manual.

- **Requirements**: `CPN-01`, `CPN-02`, `CPN-03`
- **Deliverables**:
  1. Tabel database `coupon_packages` dan API endpoint pembuatan, pelacakan, serta pencarian paket kupon pre-printed.
  2. Form pendaftaran kasir cepat (`CashierRegistration.jsx`) untuk mengaitkan nama pembalap/tim dengan nomor seri kupon fisik pre-printed.
  3. Validasi keunikan nomor seri kupon untuk mencegah duplikasi pemakaian kupon di lapangan.
  4. Form pencarian dan pelacakan sisa kuota paket kupon berdasarkan nama pembalap atau scan barcode fisik.
- **Success Criteria**:
  1. Kasir dapat mendaftarkan peserta dan mengaitkan nomor seri kupon pre-printed (50 kotak) dalam waktu <10 detik.
  2. Sistem secara tegas menolak pendaftaran jika nomor seri kupon fisik sudah pernah terdaftar sebelumnya.
  3. Pencarian paket kupon melalui nama atau nomor seri mengembalikan data paket dan sisa kuota secara instan.
- **Plans**: 0/1 plans executed

---

### Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard

**Goal**: Membangun dasbor mobile/tablet khusus Marshal di area Start Box (`/marshal`) untuk line-up cepat 3 pembalap di Jalur A, B, dan C serta instruksi visual pencoretan kupon fisik.

- **Requirements**: `MRSH-01`, `MRSH-02`, `MRSH-03`, `MRSH-04`
- **Deliverables**:
  1. Rute dan halaman baru `/marshal` (`MarshalDashboard.jsx`) dengan tata letak sentuh cepat berukuran besar.
  2. Komponen seleksi 3-jalur (Jalur A Pink, Jalur B Cyan, Jalur C Green) dengan auto-complete instan dan opsi scan barcode lembar kupon.
  3. Indikator visual raksasa nomor kupon yang harus dicoret (misal: "CORET KOTAK #9 PADA LEMBAR KUPON") dengan tombol 1-tap konfirmasi debit kupon.
  4. WebSocket broadcasting (`marshal:lineup-ready`) ke Dasbor Race Director (`/race-director`).
- **Success Criteria**:
  1. Marshal dapat mengisi 3 pembalap ke jalur A, B, C dalam waktu <15 detik tanpa lag.
  2. Nomor urut kupon yang harus dicoret tampil jelas dan saldo kupon terpotong 1 secara atomic.
  3. Dasbor Race Director menerima data line-up dari Marshal secara real-time tanpa perlu refresh.
- **Plans**: 0/1 plans executed

---

### Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration

**Goal**: Mengintegrasikan hasil finish balapan dengan engine penerbitan Tiket Babak Berikutnya secara otomatis dan menempatkan pemenang langsung ke bracket eliminasi multi-round (v1.2).

- **Requirements**: `TKET-01`, `TKET-02`, `TKET-03`
- **Deliverables**:
  1. Tabel database `next_round_tickets` dan service penerbitan tiket ber-ID unik (`TKT-B2-XXX`).
  2. Integrasi aksi FINISH di Race Director: jika lolos, generate tiket Babak 2 dan auto-seed ke slot kosong Babak 2 di tabel `matches`.
  3. Penanganan Klontang / CO (DNF): kupon terpakai tetap hangus, tidak ada tiket babak berikutnya yang diterbitkan.
  4. WebSocket event `ticket:granted` untuk memberitahukan seluruh terminal arena.
- **Success Criteria**:
  1. Mobil yang mencatatkan waktu finish valid otomatis mendapatkan tiket Babak 2 dan namanya muncul di bracket eliminasi.
  2. Mobil yang mengalami CO/Klontang dicatat hangus kuponnya dan tidak mendapatkan tiket.
  3. Tidak terjadi duplikasi tiket atau race condition saat beberapa mobil finish berurutan.
- **Plans**: 0/1 plans executed

---

### Phase 10: Realtime Circuit TV Ticket HUD Showcase & Polish

**Goal**: Menghadirkan siaran langsung running ticker pemegang tiket Babak 2 di Layar TV Sirkuit 16:9 (`/tv`), penghitung sisa kuota tiket arena, dan pengujian integrasi menyeluruh.

- **Requirements**: `TV-HUD-01`, `TV-HUD-02`
- **Deliverables**:
  1. Running ticker / ticker strip dinamis di bagian bawah atau overlay TV Sirkuit (`RealtimeTV.jsx`) yang menyiarkan peraih tiket Babak 2 terbaru.
  2. Widget sisa kuota tiket Babak Berikutnya di layar TV untuk memicu atmosfer kompetisi di pit area.
  3. Navigasi navbar baru untuk menu "Marshal Start Box" dan cetak kupon.
  4. End-to-end integration test untuk memvalidasi alur: Registrasi Kasir -> Cetak Kupon 50 Kotak -> Marshal Line-Up -> Finish Race Director -> Tiket Terbit -> Masuk Bracket Babak 2.
- **Success Criteria**:
  1. Layar TV Sirkuit secara dramatis menyiarkan pembalap yang baru lolos mengamankan tiket Babak 2.
  2. Seluruh alur turnamen dari pendaftaran hingga bracket eliminasi bekerja tanpa kendala tanpa memerlukan scan smartphone oleh peserta.
  3. Seluruh unit test suite lulus 100% dan build produksi Vite sukses.
- **Plans**: 0/1 plans executed

---

## Milestone Traceability Matrix

| Requirement | Phase | Goal |
|-------------|-------|------|
| `CPN-01` | Phase 07 | Kasir daftarkan peserta & kaitkan nomor seri lembar kupon pre-printed (50 kotak) |
| `CPN-02` | Phase 07 | Form pendaftaran cepat & validasi nomor seri kupon fisik unik anti-duplikasi |
| `CPN-03` | Phase 07 | Pencarian cepat paket kupon via nama pembalap atau barcode nomor seri fisik |
| `MRSH-01` | Phase 08 | Dasbor khusus Marshal Start Box touch-friendly (`/marshal`) |
| `MRSH-02` | Phase 08 | Pemilihan cepat 3 pembalap Jalur A, B, C di garis start |
| `MRSH-03` | Phase 08 | Prompt raksasa nomor kotak yang dicoret & debit kupon atomic |
| `MRSH-04` | Phase 08 | Sinkronisasi real-time antrean start box ke Dasbor Race Director |
| `TKET-01` | Phase 09 | Auto-generate Tiket Babak Berikutnya saat mobil dinyatakan FINISH |
| `TKET-02` | Phase 09 | Auto-placement pemegang tiket ke slot Babak 2 bracket eliminasi |
| `TKET-03` | Phase 09 | Penanganan Klontang/CO: kupon tetap hangus tanpa tiket |
| `TV-HUD-01` | Phase 10 | Siaran real-time nama peraih tiket Babak 2 di Layar TV Sirkuit |
| `TV-HUD-02` | Phase 10 | Indikator sisa kuota tiket Babak 2 di HUD TV arena |

---
*Roadmap created: 2026-09-04*
