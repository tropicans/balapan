# Phase 18: Backend Services, Round 2 Finalization & State Contract - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-18
**Phase:** 18-backend-services-round-2-finalization-state-contract
**Areas discussed:** Syarat Penguncian Babak 2 & Penanganan Heat Belum Lengkap/Bye, Proteksi Mutasi & Emergency Unlock

---

## Syarat Penguncian Babak 2 & Penanganan Heat Belum Lengkap/Bye

| Option | Description | Selected |
|--------|-------------|----------|
| Wajib 100% Selesai | Kunci Babak 2 hanya bisa dipicu jika SEMUA heat Babak 2 sudah ada pemenang (status completed). Jika ada walkover/peserta tunggal, RD pilih pemenang di heat tsb lebih dulu. | ✓ |
| Fleksibel dengan Konfirmasi Auto-Bye | Jika masih ada heat tersisa dengan 1 pembalap saat kunci ditekan, sistem otomatis memajukannya (Auto-Bye) ke Babak 3. | |
| Bebas Kapan Saja | RD dapat mengunci kapan saja tanpa memvalidasi kelengkapan heat Babak 2. | |

**User's choice:** Wajib 100% Selesai: Kunci Babak 2 hanya bisa dipicu jika SEMUA heat Babak 2 sudah ada pemenang (status completed).
**Notes:** Menjamin tidak ada heat yang tertinggal atau terlewati tanpa keputusan pemenang sebelum Babak 3 dimulai.

---

## Proteksi Mutasi & Emergency Unlock

| Option | Description | Selected |
|--------|-------------|----------|
| Proteksi Penuh dengan Emergency Unlock | Match Babak 2 beku (tidak bisa diubah pemenangnya). RD tetap bisa membuka kunci (Buka Kunci Babak 2) jika perlu revisi darurat. | ✓ |
| Kunci Permanen | Sekali Babak 2 dikunci, hasil Babak 2 tidak dapat diubah sama sekali dan tidak ada tombol buka kunci. | |

**User's choice:** Proteksi Penuh dengan Emergency Unlock: Match Babak 2 beku (tidak bisa diubah pemenangnya). RD tetap bisa membuka kunci (Buka Kunci Babak 2) jika perlu revisi darurat.
**Notes:** Menyeimbangkan keamanan data bracket dari ketidaksengajaan klik dengan fleksibilitas operasional jika terjadi human error di lapangan.

---

## the agent's Discretion

- Perhitungan metadata progres ronde `{ total_heats, completed_heats, pending_heats, can_finalize }` di backend.
- Format parameter REST request dan error handling standar Express.

## Deferred Ideas

- Penguncian berjenjang untuk Babak 3 dan seterusnya.
