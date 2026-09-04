---
phase: "08"
slug: "marshal-start-box-rapid-line-up-coupon-check-off-dashboard"
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-09-04"
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:assert` & ES module test runner |
| **Config file** | `package.json` |
| **Quick run command** | `node server/tests/marshal-flow.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node server/tests/marshal-flow.test.js`
- **After every plan wave:** Run `npm test` && `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | MRSH-02, MRSH-03 | T-08-01 | Skema database `marshal_winner_logs` & atomic winner recording with quota debit | unit/db | `node server/tests/marshal-flow.test.js` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | MRSH-03, MRSH-04 | T-08-02 | REST API `/api/marshal/record-winner`, validation of unregistered/depleted coupons, and 60s rollback endpoint `/api/marshal/undo-last-winner` | integration | `node server/tests/marshal-flow.test.js` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | MRSH-02, MRSH-04 | T-08-03 | Round 2 active bracket match query `/api/marshal/active-bracket-match` and 1-tap bracket winner advance endpoint | integration | `node server/tests/marshal-flow.test.js` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | MRSH-01, MRSH-02 | — | HUD tablet-first layout `/marshal`, Giant 3-Lane buttons (A Pink, B Cyan, C Green), touch on-screen numpad, and Web Audio API chime synthesis | UI / unit | `npm run build` | ❌ W1 | ⬜ pending |
| 08-02-02 | 02 | 2 | MRSH-03, MRSH-04 | — | Live winner banner, 60s undo timer countdown, dual-mode Babak 1 / Babak 2 switch, and WebSocket live sync | UI / unit | `npm run build` | ❌ W1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/marshal-flow.test.js` — comprehensive test suite covering schema, atomic winner recording with coupon quota debit, unregistered serial rejection, 60s undo window enforcement, bracket match lookup, and 1-tap winner advance.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Touch Numpad & Giant Lane Buttons on Tablet | MRSH-01, MRSH-02 | Physical touch screen UX and audio feedback | Buka `/marshal` pada layar tablet/smartphone, sentuh Jalur A (Pink), tekan numpad angka `012`, tekan "Catat Pemenang Heat", verifikasi bunyi harmonic chime Web Audio dan input ter-reset. |
| 60-Second Undo Progress Bar Countdown | MRSH-03 | Visual timer animation and button expiration | Setelah mencatat pemenang, amati tombol "Batalkan Kemenangan Terakhir ({seconds}s)" berkurang dari 60 ke 0 detik dan otomatis disable saat waktu habis. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-09-04
