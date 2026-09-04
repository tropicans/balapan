# Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 08-Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard
**Areas discussed:** Metode Input & Pemilihan 3 Pembalap di Jalur A, B, C; Alur Instruksi Visual Coret Kotak & Konfirmasi Debit Kupon; Sinkronisasi Real-Time & Handshake dengan Dasbor Race Director; Penanganan Kasus Khusus Garis Start & Meja Finish

---

## Metode Input & Pemilihan 3 Pembalap di Jalur A, B, C

| Option | Description | Selected |
|--------|-------------|----------|
| Quick Search & Auto-Suggest | Ketik 2-3 karakter nama pembalap/tim atau nomor seri | |
| Numpad Pop-up Nomor Seri | On-screen numpad besar di slot jalur | |
| Papan Pilihan Sentuh | Touch grid pembalap aktif | |
| User Insight (Physical Queue) | Pembalap sudah otomatis antre secara fisik di box start pada jalur yang diinginkan (A/B/C) membawa kupon fisik | ✓ |

**User's choice:** Pembalap sudah auto antri di box start pada jalur yang diinginkan (a/b/c).
**Notes:** Di Babak 1 (Kualifikasi), Marshal tidak perlu menginput nama 3 peserta per race; mobil dilepas secara cepat. Data pembalap HANYA diinput saat mobil MENANG / FINISH. Di Babak 2, data pembalap sudah otomatis dari bracket.

---

## Alur Instruksi Visual Coret Kotak & Konfirmasi Debit Kupon

| Option | Description | Selected |
|--------|-------------|----------|
| Alat digital di garis start | Marshal start box memegang tablet/ponsel | |
| Mekanis Murni di Start Box | Marshal start box tidak memegang alat digital apa pun; menunggu mobil di lintasan dan menarik tuas start mekanis | ✓ |
| Juri Finish / Scrutineer Input | Juri Finish / Scrutineer di garis finish memegang tablet/laptop untuk mencatat pemenang | ✓ |
| Input Nomor Seri Kupon (#012) | Juri cukup mengetik nomor seri kupon fisik pemenang untuk verifikasi paket dan debit kuota | ✓ |
| Dasbor Lapangan / Finish Marshal (`/marshal`) | Layar sentuh tablet di rute `/marshal` dengan counter otomatis dan tombol jalur A/B/C | ✓ |

**User's choice:** Di start box murni mekanis; pencatatan pemenang dilakukan oleh Juri Finish / Scrutineer di meja lintasan dengan memasukkan Nomor Seri Kupon pemenang pada rute `/marshal`.
**Notes:** Pengawasan 50 kotak kupon tetap dilihat secara visual di kertas fisik oleh panitia.

---

## Sinkronisasi Real-Time & Handshake dengan Dasbor Race Director

| Option | Description | Selected |
|--------|-------------|----------|
| Otomatis Masuk & Auto-Advance | Hasil langsung tersimpan via WebSocket, RD & TV update real-time tanpa approval manual | ✓ |
| Approval 1-Tap oleh RD | Menunggu konfirmasi kartu di Dasbor Race Director | |
| All-CO Handling di Babak 1 | Di Babak 1 jika semua mobil klontang, panitia tidak perlu menyentuh layar | ✓ |
| Feedback Visual & Audio | Banner hijau nama pemenang + audio chime sukses + tiket ID | ✓ |

**User's choice:** Otomatis Masuk & Auto-Advance. Jika semua mobil klontang di Babak 1, tidak perlu melakukan apa-apa di sistem.
**Notes:** Marshal di meja finish 100% fokus mencatat mobil pemenang.

---

## Penanganan Kasus Khusus Garis Start & Meja Finish

| Option | Description | Selected |
|--------|-------------|----------|
| Tombol Batal / Koreksi Terakhir (Undo) | Tombol undo cepat di layar `/marshal` jika salah ketik nomor kupon | ✓ |
| Alert Blokir & Arahkan ke Kasir | Jika nomor seri kupon belum terdaftar di kasir, tampilkan peringatan merah | ✓ |
| Kontrol Kuota Manual | Kuota 50 kotak diperiksa manual di kertas; yang ke meja finish adalah yang menang | ✓ |
| Tampilkan Match Bracket Terjadwal | Di Babak 2 sistem otomatis memuat 3 nama pembalap di Jalur A/B/C sesuai bracket eliminasi | ✓ |

**User's choice:** Sediakan tombol Undo di layar `/marshal`. Alert jika kupon belum terdaftar. Di Babak 2 otomatis tampilkan bracket match.

---

## the agent's Discretion

- Skema warna kontras Cyberpunk untuk Jalur A (Pink `#ff007f`), Jalur B (Cyan `#00f0ff`), Jalur C (Green `#00ff66`).
- Komponen on-screen touch numpad besar (0-9, Backspace, Clear, Submit).
- Web Audio API synthesizer untuk efek suara konfirmasi menang tanpa file audio eksternal.

## Deferred Ideas

- None — discussion stayed within phase scope.
