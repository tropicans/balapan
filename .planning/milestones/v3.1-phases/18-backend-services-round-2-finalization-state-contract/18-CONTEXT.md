# Phase 18: Backend Services, Round 2 Finalization & State Contract - Context

**Gathered:** 2026-09-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Menyediakan backend domain logic, REST API endpoints, proteksi mutasi match, perhitungan progres ronde, serta event WebSocket real-time untuk penguncian dan finalisasi Babak 2 (`round2_status`). Menjamin Babak 2 dapat dikunci secara aman setelah seluruh heat selesai sebelum Babak 3 dimulai, dengan proteksi match dan fitur buka kunci darurat.

</domain>

<decisions>
## Implementation Decisions

### Aturan Validasi Penguncian Babak 2
- **D-01:** **Wajib 100% Selesai Sebelum Kunci:** Penguncian Babak 2 (`POST /api/bracket/lock-round`) hanya diizinkan jika SEMUA heat di Babak 2 telah memiliki pemenang (`status === 'completed'`). Jika ada heat walkover / peserta tunggal, Race Director harus memilih pemenang di heat tersebut terlebih dahulu. Percobaan mengunci Babak 2 saat masih ada heat pending akan ditolak dengan error 400: `Masih ada [N] heat Babak 2 yang belum selesai`.
  — **Reversibility:** reversible — dapat diubah jika turnamen menghendaki auto-bye otomatis.

### Proteksi Mutasi & Emergency Unlock
- **D-02:** **Proteksi Mutasi Match Terkunci:** Saat `round2_status === 'locked'`, percobaan pemanggilan `advanceBracketWinner` pada pertandingan Babak 2 ditolak mutlak dengan error: `Babak 2 telah difinalisasi dan dikunci. Buka kunci Babak 2 terlebih dahulu jika ingin merevisi hasil.`
  — **Reversibility:** reversible.
- **D-03:** **Emergency Unlock:** Tersedia endpoint `POST /api/bracket/unlock-round` untuk membuka kembali status Babak 2 (`round2_status = 'open'`) jika Race Director perlu melakukan koreksi atau revisi darurat terhadap pemenang heat Babak 2.
  — **Reversibility:** reversible.

### Metadata Progres Ronde & Kontrak State
- **D-04:** **Perhitungan Metadata Progres Ronde:** Server menghitung metadata status per-ronde (khususnya Babak 2): `{ total_heats, completed_heats, pending_heats, is_locked, can_finalize }` di mana `can_finalize = (total_heats > 0 && pending_heats === 0)`. Metadata ini disertakan dalam `stateService.getFullState()` dan `RaceManager.getFullState()`, serta dapat diakses via endpoint status.
  — **Reversibility:** reversible.
- **D-05:** **Penyimpanan State:** Status penguncian disimpan dalam tabel `tournament_settings` dengan key `round2_status` (`'open'` | `'locked'`), konsisten dengan pola `qualifying_status`.
  — **Reversibility:** reversible.

### Sinkronisasi Real-Time WebSocket
- **D-06:** **Event WebSocket Real-time:** Setiap perubahan status penguncian Babak 2 memicu broadcast WebSocket:
  - `round2:locked` saat Babak 2 difinalisasi/dikunci.
  - `round2:unlocked` saat Babak 2 dibuka kuncinya.
  - `bracket_updated` dan `state_updated` agar seluruh klien (`/director`, `/tv`, `/bracket`) memperbarui tampilan secara instan.
  — **Reversibility:** reversible.

### the agent's Discretion
- Penamaan parameter endpoint (`round: 2`).
- Penambahan helper fungsi di `raceManager.js` atau modul service terkait untuk validasi kelayakan finalisasi ronde.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Domain & State
- `server/raceManager.js` — Logika `advanceBracketWinner`, pencarian/penyisipan match bracket, dan `getFullState()`
- `server/ticketEngine.js` — Pola penyimpanan `tournament_settings` untuk `qualifying_status` ('open'/'locked')
- `server/services/winnerService.js` — Pola validasi status kualifikasi sebelum registrasi
- `server/services/stateService.js` — Skema canonical state turnamen
- `server/index.js` — REST endpoint registration dan Socket.IO broadcast handlers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tabel `tournament_settings` (`key`, `value`, `updated_at`): Sudah ada dan siap digunakan untuk key `round2_status`.
- `RaceManager.advanceBracketWinner(matchId, winnerId)`: Logika sentral auto-advance bracket yang perlu diberi guard pengecekan status round lock.
- Socket.IO instance `io`: Digunakan untuk broadcast event `round2:locked`, `round2:unlocked`, `bracket_updated`.

### Established Patterns
- Pola check-and-throw error deskriptif dalam REST handlers (`server/index.js`).
- Pola broadcast event WebSocket ganda (spesifik action event + broad state update) untuk reaktivitas instan UI.

### Integration Points
- `POST /api/bracket/lock-round` dan `POST /api/bracket/unlock-round` ditambahkan ke `server/index.js`.
- Pengecekan guard `round2_status` di `RaceManager.advanceBracketWinner`.
- Penambahan field `round2_status` dan metadata progress ke payload `getFullState()`.

</code_context>

<specifics>
## Specific Ideas

- Penolakan ramah jika RD mencoba mengunci sebelum semua heat selesai: pesan mencantumkan jumlah heat yang masih pending.
- Tombol Emergency Unlock di UI (Phase 19) bergantung pada ketersediaan endpoint unlock dari Phase 18.

</specifics>

<deferred>
## Deferred Ideas

- Penguncian otomatis bertahap untuk Babak 3, semifinal, dan final (akan dipertimbangkan setelah Babak 2 selesai teruji).

</deferred>

---

*Phase: 18-backend-services-round-2-finalization-state-contract*
*Context gathered: 2026-09-18*
