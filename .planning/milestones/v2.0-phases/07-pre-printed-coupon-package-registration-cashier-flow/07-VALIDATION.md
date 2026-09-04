---
phase: "07"
slug: "pre-printed-coupon-package-registration-cashier-flow"
status: approved
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-04"
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:assert` & ES module test runner |
| **Config file** | `package.json` |
| **Quick run command** | `node server/tests/coupon-package.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node server/tests/coupon-package.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | CPN-01, CPN-02 | T-07-01 | Enforce unique serial_number in schema & verify coupon package insertion | unit/db | `node server/tests/coupon-package.test.js` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | CPN-01, CPN-02, CPN-03 | T-07-02 | API endpoints for registration, duplicate check (409), balance sync, and search listing | integration | `node server/tests/coupon-package.test.js` | ✅ | ✅ green |
| 07-01-03 | 01 | 1 | CPN-01 (Void) | T-07-03 | Void & Replace transfer preserving remaining quota and locking old serial | integration | `node server/tests/coupon-package.test.js` | ✅ | ✅ green |
| 07-02-01 | 02 | 2 | CPN-01, CPN-02 | — | Cashier dashboard navigation tabs, 2-column cyberpunk split layout, and autofocus | UI / unit | `npm run build` | ✅ | ✅ green |
| 07-02-02 | 02 | 2 | CPN-02, CPN-03 | — | Live feed package list, instant multi-criteria search, quota progress gauge, and void modal | UI / unit | `npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `server/tests/coupon-package.test.js` — comprehensive test suite covering schema, atomic registration, duplicate serial rejection, search/filter queries, and void/replace flows.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Numpad autofocus & continuous sheet entry (+1) | CPN-01 | Physical keyboard interaction & cursor focus | Open `/cashier` tab "Paket Kupon Fisik", input serial "001", submit, verify cursor automatically autofocuses for next entry and (+1) increments serial. |
| Duplicate serial red alert banner | CPN-02 | Visual alert and owner detail banner | Input already registered serial, submit, verify neonPink banner displays registered owner and remaining quota. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-09-04
