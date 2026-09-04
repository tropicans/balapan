# Phase 10: Realtime Circuit TV Ticket HUD Showcase & Polish - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Menghadirkan siaran langsung running ticker pemegang tiket Babak 2 di Layar TV Sirkuit 16:9 (`/tv` / `RealtimeTV.jsx`), visualisasi widget kuota tiket arena (misal: "X/Y Tiket Terisi" untuk memanaskan tensi di pit area), penyempurnaan navigasi Navbar (fokus operasional arena balap), serta pengujian integrasi End-to-End turnamen (Kasir → Kupon Fisik → Marshal → Race Director → Tiket Terbit → Bracket Babak 2).

</domain>

<decisions>
## Implementation Decisions

### Format & Penempatan Ticker Tiket di Layar TV (/tv)
- **D-01:** Hybrid Ticker + Pop-up Showcase — Running ticker horizontal di footer Layar TV (`RealtimeTV.jsx`) terus berputar menampilkan urutan pemegang tiket Babak 2. Ketika ada tiket baru yang terbit (`ticket:granted` socket event), muncul flash pop-up overlay modal/banner animasi Cyberpunk emas "NEW QUALIFIER!" selama 6–8 detik di layar TV, kemudian menutup otomatis dan masuk ke antrean running ticker.

### Visualisasi Kuota Tiket Babak 2 & Status Kualifikasi
- **D-02:** Neon Progress Bar & Badge Kuota di Header TV — Menampilkan status kuota tiket Babak 2 (misal "24/32 TIKET TERISI • SISA 8"), dengan efek denyut merah (pulsing red alert) jika sisa tiket kritis (<= 4 tiket tersisa).
- **D-03:** Banner Status Kunci Kualifikasi — Saat Race Director mengunci kualifikasi (`POST /api/tickets/lock-qualifying` / socket `qualifying:locked`), TV menampilkan banner dramatis: "KUALIFIKASI RESMI DITUTUP - BRACKET BABAK 2 SIAP DIMULAI".

### Navigasi & Operasional Kupon
- **D-04:** Kupon Sudah Dicetak Sebelumnya (Pre-Printed) — Lembar kupon fisik 50 kotak dicetak massal sebelum hari-H perlombaan (*pre-printed*), sehingga tidak memerlukan menu cetak kupon yang memakan tempat di navbar utama. Navbar difokuskan murni pada alur operasional perlombaan: Kasir Kupon (`/cashier`), Marshal Start Box (`/marshal`), Race Director (`/director`), Scrutineer, TV Sirkuit (`/tv`), dan Babak Eliminasi (`/bracket`).

### Audio & Efek Perayaan TV
- **D-05:** Synthetic Cyberpunk Victory Chime — Menggunakan Web Audio API bawaan (`playTicketChime` di `client/src/utils/audio.js`) tanpa ketergantungan file MP3/WAV eksternal, dipadukan dengan animasi Glitch Glow Neon Gold di TV saat peraih tiket baru diumumkan.

### End-to-End Integration Testing
- **D-06:** Automated Full Tournament Lifecycle Test Suite — Membangun suite pengujian E2E integrasi (`server/tests/e2e-tournament-lifecycle.test.js`) yang memvalidasi rantai lengkap: Kasir aktifkan kupon pre-printed -> Marshal start box masukkan pembalap Jalur A/B/C dan debit nomor kotak -> RD/Timer selesaikan balapan -> Tiket Babak 2 terbit otomatis -> Winner ter-seed ke slot Round 2 bracket -> All-3-same-lane auto-advance (jika relevan) -> Kunci kualifikasi.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Architecture
- `.planning/REQUIREMENTS.md` — TV-HUD-01, TV-HUD-02
- `.planning/ROADMAP.md` §Phase 10 — Scope and success criteria for Circuit TV HUD & Polish
- `server/ticketEngine.js` — Ticket engine API: `getTicketStats()`, `issueTicket()`, `voidTicket()`
- `client/src/screens/RealtimeTV.jsx` — Existing 16:9 Circuit TV HUD screen
- `client/src/utils/audio.js` — `playTicketChime()` and Web Audio synthetic sounds
- `client/src/components/ui/Navbar.jsx` — Main navigation header component

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `playTicketChime()` in `client/src/utils/audio.js`: Synthesizer Web Audio yang sudah diimplementasikan di Phase 09, siap dipanggil saat `ticket:granted` diterima oleh TV.
- `useRace()` in `client/src/context/RaceContext.jsx`: Sudah memiliki event listener socket `ticket:granted`, `ticket:voided`, dan `qualifying:locked`.
- `server/ticketEngine.js`: Memiliki method `getTicketStats(db)` yang mengembalikan `{ totalIssued, targetQuota, remainingQuota, isLocked }`.

### Integration Points
- `RealtimeTV.jsx`: Tambahkan bar status kuota di area atas/header, banner popup "NEW QUALIFIER!" saat ada event tiket baru, dan running ticker di footer.
- `Navbar.jsx`: Perjelas rute navigasi untuk alur kerja operasional sirkuit (Kasir, Marshal Start Box, RD, Scrutineer, TV, Bracket).
- `server/tests/e2e-tournament-lifecycle.test.js`: Suite integrasi end-to-end tanpa mock hardware.

</code_context>

<specifics>
## Specific Ideas
- Layar TV bergaya Cyberpunk 16:9 dark theme dengan aksen neon gold untuk status tiket/qualifier.
- Footer running ticker menggunakan scrolling animation CSS horizontal yang halus (marquee modern tanpa jitter).

</specifics>

<deferred>
## Deferred Ideas
- None — Semua keputusan berada di dalam cakupan Phase 10.

</deferred>

---

*Phase: 10-Realtime Circuit TV Ticket HUD Showcase & Polish*
*Context gathered: 2026-09-04*
