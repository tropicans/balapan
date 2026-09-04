---
phase: "10"
slug: "realtime-circuit-tv-ticket-hud-showcase-polish"
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-09-04"
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:assert` & ES module test runner |
| **Config file** | `package.json` |
| **Quick run command** | `node server/tests/e2e-tournament-lifecycle.test.js` |
| **Full suite command** | `node server/tests/ticket-engine-flow.test.js && node server/tests/e2e-tournament-lifecycle.test.js` |
| **Frontend build command** | `npm run build` (dalam direktori `client`) |
| **Estimated runtime** | ~4 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command or build
- **After every plan wave:** Run full suite && client build
- **Before `/gsd-verify-work`:** Full suite must be green & build passing
- **Max feedback latency:** 6 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | E2E-TEST-01 | T-10-01 | E2E lifecycle test suite: Kasir -> Kupon 50 Kotak -> Marshal -> Finish -> Tiket Babak 2 -> Seeding Bracket -> Auto-Advance -> Kunci Kualifikasi | E2E / integration | `node server/tests/e2e-tournament-lifecycle.test.js` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | TV-HUD-02 | T-10-02 | Telemetri `ticketStats` pada `RaceManager.getFullState()` (total issued, target quota, remaining quota, locked state) | backend / unit | `node server/tests/e2e-tournament-lifecycle.test.js` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | TV-HUD-01, TV-HUD-02 | T-10-03 | Layar TV Sirkuit: Ticket Running Ticker di footer (`TicketTickerStrip`), Quota Bar di header HUD, dan Qualifying Locked Banner di `RealtimeTV.jsx` | UI / frontend | `npm run build` (client) | ❌ W1 | ⬜ pending |
| 10-02-02 | 02 | 2 | TV-HUD-01 | T-10-04 | Pop-up Showcase Modal New Qualifier Cyberpunk Gold dengan auto-dismiss 6-8s dan Web Audio Chime `playTicketChime()` | UI / audio | `npm run build` (client) | ❌ W1 | ⬜ pending |
| 10-02-03 | 02 | 2 | TV-NAV-01 | — | Perampingan navigasi operasional arena di `Navbar.jsx` & `App.jsx` (Kasir, Marshal, RD, Scrutineer, TV, Bracket) | UI / nav | `npm run build` (client) | ❌ W1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/e2e-tournament-lifecycle.test.js` — comprehensive E2E test suite covering:
  1. Cashier registration & pre-printed coupon package activation (50 boxes).
  2. Marshal start box racer registration & box deduction.
  3. Race Director / Scrutineer finish timing recording.
  4. Automatic ticket issuance (`next_round_tickets`) with sequential numbering (`#1`, `#2`).
  5. Bracket match auto-placement (Round 2 matches).
  6. All-3-Same-Lane Auto-Advance rule validation.
  7. Qualifying lock with Bye slot handling for non-multiple-of-3 tickets.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Realtime TV Running Ticker Animation | TV-HUD-01 | Visual continuous marquee check | Buka `/tv` di browser, perhatikan teks ticker bergerak mulus di footer layar tanpa jitter atau clipping. |
| New Qualifier Pop-up Showcase & Audio Chime | TV-HUD-01 | Web Audio autoplay & modal display | Buka `/tv`, selesaikan race di `/marshal`, dengarkan audio kemenangan dan amati modal emas berkedip 6-8 detik lalu dismiss otomatis. |
| Quota Bar Pulse & Lock Banner | TV-HUD-02 | Visual telemetry pulse & banner lock | Buat tiket hingga sisa <= 4, amati bar merah berkedip di header TV. Kunci kualifikasi di `/director`, amati banner penutupan kualifikasi muncul melintang di TV. |
| Operational Navbar Navigation | TV-NAV-01 | Navigation usability check | Klik seluruh tab di Navbar (`Kasir`, `Marshal`, `RD`, `Scrutineer`, `TV`, `Bracket`), pastikan berpindah layar secara instan. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 6s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-09-04
