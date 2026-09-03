---
phase: "6"
slug: "multi-round-scalable-elimination-dashboard-ui"
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-09-03"
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vite Build Compiler + Node.js Assert Integration Suite |
| **Config file** | `client/vite.config.js` |
| **Quick run command** | `npm --prefix client run build` |
| **Full suite command** | `npm --prefix client run build; & "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3\node.exe" server/tests/bracket-3lane.test.js` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm --prefix client run build`
- **After every plan wave:** Run full test suite (`npm --prefix client run build` + `bracket-3lane.test.js` + `race-flow.test.js`)
- **Before `/gsd-verify-work`:** Full build & backend tests must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ELIM-07 | — | Update label tab navigasi di Navbar | build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | ELIM-04 | — | Round Selector Tabs dengan counter heat | build | `npm --prefix client run build` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 2 | ELIM-05 | — | Kartu heat 3-baris (Line A/B/C) + tombol MENANG & mahkota | build/component | `npm --prefix client run build` | ✅ | ⬜ pending |
| 06-01-04 | 01 | 2 | ELIM-06 | — | Filter search & pagination untuk 100+ heat | build/component | `npm --prefix client run build` | ✅ | ⬜ pending |
| 06-01-05 | 01 | 3 | Regression | — | Verifikasi bundle build & integritas socket flow | regression | `npm --prefix client run build; & "C:\Users\yudhiar\AppData\Local\nvm\v22.22.3\node.exe" server/tests/bracket-3lane.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Why Manual | Verification Procedure |
|----------|------------|------------------------|
| Visual Cyberpunk Aesthetic | Contrast & color harmony check | Buka UI di browser, pastikan Jalur A Pink, B Cyan, dan C Green memiliki kontras tinggi dan tidak bertabrakan |
| Pagination Usability | UX feel pada 100+ heat | Beralih antar halaman pagination, pastikan transisi lancar 60fps tanpa lompatan scroll yang kasar |
