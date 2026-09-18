---
phase: "12"
slug: "12-participant-registration-auto-numbering"
status: ready
nyquist_compliant: true
wave_0_complete: false
created: "2026-09-17"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js native assert test runner (`node server/tests/...`) |
| **Config file** | `package.json` ("test" script) |
| **Quick run command** | `node server/tests/participant-registration.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node server/tests/participant-registration.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green & client build green (`npm --prefix client run build`)
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | PARN-01, PARN-02 | — | Atomic sequential auto-numbering within transaction | unit | `node server/tests/participant-registration.test.js` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | EVNT-03, D-04, D-05 | — | Event isolation, reset to #1, multi-entry allowed | unit | `node server/tests/participant-registration.test.js` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | PARN-03, D-06, D-12 | — | Omni-search by number/name & typo editing without number mutation | integration | `node server/tests/participant-registration.test.js` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | PARN-05, D-07, D-08, D-09 | — | CSV import preview and execution (Web API & CLI script) | integration | `node server/tests/participant-registration.test.js` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | PARN-01, PARN-04, D-01, D-02, D-03 | — | Cashier UI registration tab, giant modal #42 & keyboard flow | e2e / build | `npm --prefix client run build` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | PARN-03, PARN-05, D-06, D-10, D-11, D-12 | — | Cashier header, omni-search table, edit modal, CSV upload modal | e2e / build | `npm --prefix client run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/participant-registration.test.js` — test suite covering all 10 test cases in RESEARCH.md
- [ ] Update `package.json` script `test` to include `node server/tests/participant-registration.test.js`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| High-contrast giant number modal visual appearance | PARN-04, D-01, D-02 | Visual verification of layout contrast & font rendering | Register participant in Cashier UI, verify modal pop-up shows `#<number>` in giant 7xl font with Cyan glow. |
| Keyboard-only flow auto-focus | D-03 | Focus trap and hardware keystroke behavior | Submit form with Enter, press Enter/Esc on modal, verify cursor returns to Name input without mouse click. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-09-17
