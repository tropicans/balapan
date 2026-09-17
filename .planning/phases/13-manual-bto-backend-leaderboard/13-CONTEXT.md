# Phase 13: Manual BTO Backend & Leaderboard - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fase ini menghadirkan pencatatan dan leaderboard Best Time Overall (BTO) manual untuk turnamen v3.0:
- Panitia (Race Director / Admin) dapat menginput catatan waktu terbaik per peserta secara manual via nomor peserta (`participant_number`) atau ID peserta.
- Kebijakan personal-best: Waktu baru hanya menggantikan waktu lama peserta jika lebih cepat (personal best).
- Leaderboard top-N BTO dihitung secara realtime dari tabel `bto_records` yang ter-scope ke `event_id` aktif.
- Deteksi rekor baru (ketika waktu baru mengalahkan peringkat #1 tercepat di event aktif) memicu selebrasi WebSocket (`NEW_BTO_RECORD`, event pendar emas/confetti).
- Sinkronisasi realtime via WebSocket (`bto_updated`, `STATE_UPDATE`) ke Dasbor RD dan TV Sirkuit.
- Tabel `bto_records` (sudah dibuat di migration Phase 11) menjadi sumber data kanonik BTO, menggantikan query `race_registrations` lama yang bergantung pada flow race/scrutineer v1/v2.

Fase ini **tidak** mengubah pendaftaran pemenang Babak 2 (itu Phase 14), **tidak** menghapus kode race engine lama secara prematur (Phase 15/17), dan **tidak** mengubah alur registrasi kasir (Phase 12). Basis data v2.0 tetap aman.

</domain>

<decisions>
## Implementation Decisions

### Kebijakan Pencatatan Waktu (BTO Policy)
- **D-01 (Personal Best Replacement):** Satu peserta hanya memiliki 1 catatan waktu terbaik (personal best) aktif di tabel/leaderboard per event. Jika catatan baru dimasukkan:
  - Jika peserta belum punya catatan: simpan catatan baru.
  - Jika catatan baru LEBIH CEPAT (`new_time < existing_time`): perbarui catatan peserta dengan waktu baru.
  - Jika catatan baru LEBIH LAMBAT atau SAMA: tolak pembaruan atau beri respons informasi bahwa waktu tidak lebih cepat dari personal best (`existing_time`).
- **D-02 (Input Format & Presisi):** Input waktu menerima detik hingga 3 angka di belakang koma (mis. `12.345`). Input divalidasi harus angka positif (> 0 dan < 300 detik). Format string atau float dinormalisasi menjadi float presisi 3 desimal.
- **D-03 (Input Peserta via Nomor atau Picker):** Form input BTO di panel RD / Panitia mendukung pencarian/input instan via nomor peserta (`participant_number`), menampilkan preview nama pembalap dan tim, serta menampilkan personal best peserta saat ini sebelum submit.

### Deteksi Rekor Baru & Selebrasi
- **D-04 (Top #1 Record Celebration):** Rekor baru (`NEW_BTO_RECORD`) didefinisikan jika waktu yang baru diinput lebih cepat daripada waktu ranking #1 di event aktif sebelumnya (atau menjadi ranking #1 pertama). Saat terjadi, server memancarkan event WebSocket `NEW_BTO_RECORD` dengan payload `{ userName, teamName, time, participantNumber, rank: 1 }`, memicu modal selebrasi pendar emas + confetti di TV dan layar terhubung.
- **D-05 (Broadcast Event Realtime):** Setiap perubahan/penambahan BTO memancarkan event WebSocket `bto:updated` (dan memperbarui `btoLeaderboard` pada snapshot state) agar leaderboard di semua client terupdate instan tanpa refresh.

### Integrasi State & Scope Event
- **D-06 (Event Scoped BTO):** Semua data BTO diikat ke `event_id` aktif. Endpoint `GET /api/bto` dan helper `getBtoLeaderboard(limit)` hanya membaca `bto_records` untuk event aktif.
- **D-07 (Tabel bto_records Kanonik):** Gunakan tabel `bto_records` (`id`, `event_id`, `user_id`, `participant_number`, `finish_time`, `recorded_by`, `created_at`) yang telah disiapkan di Phase 11 sebagai storage kanonik.
- **D-08 (Top-N Configurable / Default 5 atau 10):** Leaderboard BTO mendukung limit default (mis. top 5 untuk TV HUD, top 10/semua untuk Race Director panel).

### the agent's Discretion
- Struktur detail service `btoService.js` (method: `recordTime`, `getLeaderboard`, `deleteRecord`, `getParticipantBest`).
- Desain komponen UI BTO Manager di Dasbor Race Director (modal input cepat / tab BTO dengan tabel dan form input ergonomis).
- Kompatibilitas `RaceManager.getFullState()` untuk menyuplai `btoLeaderboard` dari `btoService`.

</decisions>

<canonical_refs>
## Canonical References

### Phase Scope & Requirements
- `.planning/ROADMAP.md` §"Phase 13: Manual BTO Backend & Leaderboard"
- `.planning/REQUIREMENTS.md` — BTO-01, BTO-02, BTO-03, BTO-04
- `.planning/PROJECT.md` — v3.0 milestone goal & key decisions
- `server/migrations.js` — skema `bto_records`
- `server/services/participantService.js` — referensi peserta & nomor

</canonical_refs>
