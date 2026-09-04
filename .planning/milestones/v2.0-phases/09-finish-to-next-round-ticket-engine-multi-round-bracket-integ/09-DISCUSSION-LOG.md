# Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 09-Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration
**Areas discussed:** Multi-Ticket Policy per Racer, Format & Metadata Nomor Tiket, Dual-Source Trigger & Pembatalan (Undo/Void), Mekanisme Auto-Placement & Kuota Bracket

---

## Multi-Ticket Policy per Racer

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-Ticket Diperbolehkan | Setiap kemenangan menerbitkan tiket baru Babak 2 (budaya "borong tiket") | ✓ |
| Batasi 1 Tiket per Pembalap | Maksimal 1 tiket per orang | |

**User's choice:** Ya, Multi-Ticket Diperbolehkan.
**Notes:** Pembalap bebas mengumpulkan tiket sebanyak kemampuan mobilnya memenangkan kualifikasi tanpa batas kuota individu.

| Option | Description | Selected |
|--------|-------------|----------|
| Proteksi Anti-Same-Heat | Mencari match berbeda agar mobil sendiri tidak saling bertanding di ronde awal | |
| Sequential Murni Tanpa Proteksi | Slot diisi berurutan sesuai urutan tiket terbit (Match 1 Slot A -> B -> C -> Match 2...) | ✓ |

**User's choice:** Sequential Murni Tanpa Proteksi.
**Notes:** Penempatan tiket langsung mengisi slot kosong berikutnya. Jika ketiga jalur dalam satu heat diisi pembalap yang sama, diberlakukan aturan All-3-Same-Lane Auto-Advance.

| Option | Description | Selected |
|--------|-------------|----------|
| Nama Pembalap + Nomor Tiket / Tag | Contoh: "Budi #1", "Budi #2" pada kartu match bracket | ✓ |
| Hanya Nama Pembalap Standar | Tanpa pembeda indeks tiket | |

**User's choice:** Nama Pembalap + Nomor Tiket / Tag Mobil.

---

## Format & Metadata Nomor Tiket

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential Global Sederhana | Format kode TKT-B2-001 | |
| Format Komposit Serial Kupon | Menggabungkan kode paket dan nomor kotak | |
| Nomor Urut Angka Sederhana | Hanya angka nomor saja (tiket nomor 1, 2, 3...) | ✓ |

**User's choice:** "biasanya hanya nomor saja"
**Notes:** Di lapangan menggunakan nomor urut tiket sederhana (1, 2, 3...) yang ditampilkan dengan simbol hash ringkas (`#1`, `#2`, `#3`) di TV HUD dan Dasbor.

| Option | Description | Selected |
|--------|-------------|----------|
| Lengkap Terintegrasi | Nomor tiket, user_id, package_id, serial_number, lane, source, status, bracket_match_id, created_at | ✓ |
| Minimal Sederhana | Hanya tiket dan user | |

**User's choice:** Lengkap Terintegrasi.
**Notes:** Status tiket cukup dilacak via status `bracket_matches`.

---

## Dual-Source Trigger & Pembatalan (Undo/Void)

| Option | Description | Selected |
|--------|-------------|----------|
| Service Terpusat (TicketEngine.issueTicket) | /marshal dan /race-director memanggil satu engine backend yang sama | ✓ |
| Logika Terpisah | Alur dipisah independen | |

**User's choice:** Service Terpusat (TicketEngine.issueTicket).

| Option | Description | Selected |
|--------|-------------|----------|
| Zero-Input untuk Babak 1 Mekanis, Catat DNF jika di Dasbor RD | Kupon hangus tanpa tiket; zero input jika semua mobil CO di meja finish | ✓ |
| Wajib Catat DNF di Semua Dasbor | Harus tekan tombol khusus | |

**User's choice:** Zero-Input untuk Babak 1 Mekanis, Catat DNF jika di Dasbor RD.

| Option | Description | Selected |
|--------|-------------|----------|
| Rollback Otomatis & Bersihkan Slot Bracket | Tandai tiket void, kosongkan slot bracket, pulihkan kupon (+1) | ✓ |
| Hanya Tandai Void Tiket | Tanpa mengubah slot bracket | |

**User's choice:** Rollback Otomatis & Bersihkan Slot Bracket.

| Option | Description | Selected |
|--------|-------------|----------|
| Payload Lengkap untuk Broadcast TV & Dasbor | Nomor tiket, pembalap, tim, kupon, jalur, status kuota arena | ✓ |
| Payload Ringkas | Nomor dan id tiket saja | |

**User's choice:** Payload Lengkap untuk Broadcast TV & Dasbor.

---

## Mekanisme Auto-Placement & Kuota Bracket

| Option | Description | Selected |
|--------|-------------|----------|
| Kuota Tetap Berdasarkan Slot | Kuota dibatasi sesuai slot heat yang dibuka | |
| Dinamis Otomatis Memperbesar Bracket | Kuota tiket tidak dibatasi di awal | |
| Fleksibel Berbasis Waktu / Keputusan Panitia | Kualifikasi berjalan sesuai durasi waktu atau target jumlah race dari panitia | ✓ |

**User's choice:** "biasanya ini manual dan lihat waktu sih..misal masih ada waktu biasanya lomba babak 1 masih diteruskan sampe waktu yang ditentukan panitia berakhir, atau dari panitia menentukan sendiri akan ada berapa race di babak 2"
**Notes:** Sistem mendukung mode fleksibel: panitia bisa menentukan target kuota tiket Babak 2 atau membiarkan kualifikasi berjalan sampai waktu berakhir.

| Option | Description | Selected |
|--------|-------------|----------|
| Sistem Bye / Slot Kosong | Heat terakhir tetap jalan dengan 1-2 mobil jika total tiket bukan kelipatan 3 | ✓ |
| Penyesuaian Manual RD | RD merapikan bracket | |

**User's choice:** Sistem Bye / Slot Kosong.

| Option | Description | Selected |
|--------|-------------|----------|
| Tombol 'Kunci Kualifikasi & Finalisasi Babak 2' di Dasbor RD | Panitia secara eksplisit mengunci kualifikasi dan memulai Babak 2 | ✓ |
| Timer Countdown Otomatis | Countdown otomatis mengunci | |

**User's choice:** Tombol 'Kunci Kualifikasi & Finalisasi Babak 2' di Dasbor RD.

| Option | Description | Selected |
|--------|-------------|----------|
| All-3-Same-Lane Auto-Advance | Jika ketiga jalur terisi oleh pembalap yang sama, mobil otomatis melaju ke babak berikutnya tanpa balapan fisik | ✓ |

**User's choice:** "jika di satu race adalah ketiga line nya adalah pembalap yang sama, maka pembalap tersebut auto ke babak selanjutnya (tidak perlu race di babak tersebut)"
**Notes:** Menghilangkan keharusan balap fisik internal bagi pembalap yang menguasai seluruh jalur di satu heat.

---

## the agent's Discretion

- Penataan komponen visual modal konfirmasi Undo di dasbor `/marshal` dan `/race-director`.
- Efek Web Audio synthesizer bernada kemenangan (*double high beep*) saat event `ticket:granted` diterima.
- Desain query transaksional SQLite WASM yang atomic dan tahan benturan konkurensi.

## Deferred Ideas

- None — seluruh pembahasan tetap berada dalam ruang lingkup Phase 09.
