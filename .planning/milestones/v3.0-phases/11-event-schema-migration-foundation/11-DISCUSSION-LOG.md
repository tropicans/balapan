# Phase 11: Event & Schema Migration Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-17
**Phase:** 11-Event & Schema Migration Foundation
**Areas discussed:** Model scope event, Format nomor peserta, Keamanan migrasi, Siklus hidup event

---

## Model Scope Event

| Option | Description | Selected |
|--------|-------------|----------|
| event_id FK | Tambah kolom `event_id` ke tabel existing; filter by event aktif | ✓ |
| Tabel per-event | Nama tabel dinamis per event | |
| Reset-only | Satu set tabel global, event baru = reset | |

| Question | Options | Selected |
|----------|---------|----------|
| Tabel wajib `event_id` | users / bracket_matches / bto_records / tournament_settings | Ketiga tabel (`users`, `bracket_matches`, `bto_records`) |
| Entitas peserta | Lanjutkan `users` / tabel `participants` baru | Lanjutkan `users` |
| Multi-event aktif | Hanya event aktif / multi-event bersamaan | Hanya event aktif |

**User's choice:** `event_id` FK di ketiga tabel; reuse `users`; hanya event aktif dikelola.
**Notes:** Awalnya user memilih `users` saja; setelah dijelaskan bahwa EVNT-04 menuntut bracket & BTO terpisah per event, user setuju memberi `event_id` ke ketiga tabel.

---

## Format Nomor Peserta

| Question | Options | Selected |
|----------|---------|----------|
| Tipe | Integer polos / Teks zero-padded / Integer + tampil 001 | Integer polos |
| Alokasi | Auto MAX+1 / Input manual / Auto + override | Auto MAX+1 |
| Normalisasi | Trim + strip 0 / Angka murni / Tanpa normalisasi | Trim + strip 0 |
| Keunikan | Unik per event / Unik global | Unik per event |

**User's choice:** INTEGER polos, auto `MAX+1`, normalize trim+strip leading zero, `UNIQUE(event_id, participant_number)`.
**Notes:** Nomor sengaja sederhana (1, 2, 3, ...) agar mudah ditulis panitia di kupon fisik.

---

## Keamanan Migrasi

| Question | Options | Selected |
|----------|---------|----------|
| Backup | Folder `data/backups/` / File arsip tunggal / Manual | Folder `data/backups/` |
| Versi skema | Tabel `schema_version` / key di `tournament_settings` | Tabel `schema_version` |
| Transaksi | Perbaiki global `SqliteWrapper.transaction()` / helper khusus migrasi | Perbaiki global |
| Gerbang hapus | Env flag default aman / otomatis saat startup | Env flag default aman |

**User's choice:** backup bertimestamp, `schema_version` table, perbaiki transaksi global, gerbang `ALLOW_DESTRUCTIVE_MIGRATION`.
**Notes:** Riset menemukan `SqliteWrapper.transaction()` tidak mengirim BEGIN/COMMIT/ROLLBACK — diperbaiki global karena memengaruhi integritas semua operasi.

---

## Siklus Hidup Event

| Question | Options | Selected |
|----------|---------|----------|
| Field | nama / tanggal / status / catatan / jumlah lap | nama, tanggal, status, catatan, jumlah lap |
| Default event | Auto-buat `Event 1` / wajib buat manual | Auto-buat `Event 1` |
| Hapus event | Arsip saja / boleh hapus permanen | Arsip saja |
| UI event | Layar baru / panel di Kasir / panel di RD | Layar baru |

**User's choice:** field lengkap (termasuk jumlah lap), auto-buat Event 1, arsip saja, layar Manajemen Event baru.
**Notes:** —

---

## the agent's Discretion

- Struktur persis tabel `events`, tipe data, dan constraint.
- Backfill `participant_number`/`event_id` untuk data `users` lama (v2.0).
- Penamaan/urutan migrasi di `schema_version`.
- Penetapan `PRAGMA foreign_keys` setelah audit orphan.

## Deferred Ideas

- Cetak daftar seeding per heat (EXTR-01).
- Heat konsolasi juara 3 (EXTR-02).
- Operator PIN registrasi pemenang (EXTR-03).
- Drop tabel kupon/race lama — Phase 17.
- Rewrite `import-roster.js` jadi peserta — Phase 12.
- `PRAGMA foreign_keys = ON` — setelah audit orphan.