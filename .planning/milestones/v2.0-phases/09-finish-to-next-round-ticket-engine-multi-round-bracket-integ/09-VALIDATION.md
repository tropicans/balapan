---
phase: "09"
slug: "finish-to-next-round-ticket-engine-multi-round-bracket-integ"
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-09-04"
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:assert` & ES module test runner |
| **Config file** | `package.json` |
| **Quick run command** | `node server/tests/ticket-engine-flow.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node server/tests/ticket-engine-flow.test.js`
- **After every plan wave:** Run `npm test` && `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | TKET-01, TKET-02 | T-09-01 | Skema `next_round_tickets`, indeks serial & user, serta alter kolom `bracket_matches` (`ticket_id_1/2/3`, `is_auto_advanced`) | unit/db | `node server/tests/ticket-engine-flow.test.js` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | TKET-01, TKET-02 | T-09-02 | Centralized `TicketEngine` service dengan sequential ticket issuing, multi-ticket naming (`Budi #1`, `Budi #2`), auto-placement bracket, dan All-3-Same-Lane Auto-Advance | unit/engine | `node server/tests/ticket-engine-flow.test.js` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | TKET-01, TKET-02, TKET-03 | T-09-03 | Dual-source trigger integration (`/api/marshal/record-winner`, `RaceManager.submitFinishTimes`), zero-ticket DNF/CO guarantee, dan 60s rollback void ticket | integration | `node server/tests/ticket-engine-flow.test.js` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | TKET-01, TKET-02 | T-09-04 | REST API `/api/tickets` (list & stats), `/api/tickets/lock-qualifying`, dan WebSocket event emissions (`ticket:granted`, `ticket:voided`, `qualifying:locked`) | integration/api | `node server/tests/ticket-engine-flow.test.js` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | TKET-01, TKET-02 | — | UI multi-ticket display (`Budi #1`, `#2`) pada `BracketDashboard.jsx`, visual badge AUTO-ADVANCE, Web Audio victory chime synthesizer, dan kontrol Kunci Kualifikasi di RD | UI / build | `npm run build` | ❌ W1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/ticket-engine-flow.test.js` — comprehensive test suite covering schema, atomic sequential ticket issuance, multi-ticket per user (`Budi #1`, `Budi #2`), Round 2 bracket slot auto-placement, All-3-Same-Lane Auto-Advance rule, 60s undo ticket voiding, DNF zero-ticket enforcement, and qualifying lock API.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Web Audio Victory Chime Playback | TKET-01 | Browser audio context requirement | Buka `/tv` atau `/marshal`, catat pemenang heat, dengarkan double-tone high pitch beep sintetis tanpa delay. |
| Multi-Ticket Visual Badge in Bracket UI | TKET-02 | Visual presentation in bracket card | Masukkan 2 kemenangan untuk pembalap yang sama (Budi), buka `/bracket`, amati teks `Budi #1` dan `Budi #2` tampil rapi pada kartu match. |
| All-3-Same-Lane Auto-Advance Visual HUD | TKET-02 | Match status card visual transition | Simulasikan 3 tiket kemenangan untuk pembalap yang sama mengisi satu heat Round 2, amati badge emas/hijau `AUTO-ADVANCE // LANGSUNG LOLOS` menyala dan slot pembalap otomatis bertambah di Round 3. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-09-04
