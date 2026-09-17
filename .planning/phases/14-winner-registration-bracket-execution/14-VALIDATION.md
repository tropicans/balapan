---
phase: 14
slug: winner-registration-bracket-execution
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-17
---

# Phase 14 — Validation Strategy

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in (`node:assert` + `node <file>.test.js`) |
| **Config file** | none |
| **Quick run command** | `node server/tests/winner-registration.test.js` |
| **Full suite command** | `npm test` |

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| T-WREG-01 | WREG-01, WREG-02 | Resolve name & confirm registration | unit/integration | `node server/tests/winner-registration.test.js` | pending |
| T-WREG-02 | WREG-03 | Reject invalid / unknown participant number | unit/integration | `node server/tests/winner-registration.test.js` | pending |
| T-WREG-03 | WREG-04 | Prevent duplicate registration in Round 2 | unit/integration | `node server/tests/winner-registration.test.js` | pending |
| T-WREG-04 | WREG-06 | Auto-placement slot A->B->C & new heat creation | unit/integration | `node server/tests/winner-registration.test.js` | pending |
| T-WREG-05 | WREG-05 | Undo last winner registration | unit/integration | `node server/tests/winner-registration.test.js` | pending |
| T-BRKT-01 | BRKT-01, BRKT-02 | Advance bracket winner without lock/start | unit/integration | `node server/tests/winner-registration.test.js` | pending |
