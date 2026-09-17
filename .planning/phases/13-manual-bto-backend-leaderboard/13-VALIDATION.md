---
phase: 13
slug: manual-bto-backend-leaderboard
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-17
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in (`node:assert` + `node <file>.test.js`) |
| **Config file** | none — each test bootstraps test DB / memory / express server |
| **Quick run command** | `node server/tests/bto-service.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15–30 seconds |

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| T-BTO-01 | BTO-01 | Manual BTO input per participant | unit/integration | `node server/tests/bto-service.test.js` | pending |
| T-BTO-02 | BTO-02 | Personal-best replacement (only if faster) | unit/integration | `node server/tests/bto-service.test.js` | pending |
| T-BTO-03 | BTO-03 | Realtime Top-N leaderboard | unit/integration | `node server/tests/bto-service.test.js` | pending |
| T-BTO-04 | BTO-04 | New overall #1 record detection & event emission | unit/integration | `node server/tests/bto-service.test.js` | pending |
| T-BTO-05 | EVNT-04 | Event isolation for BTO records | unit/integration | `node server/tests/bto-service.test.js` | pending |
| T-BTO-06 | BTO-01/02 | REST API endpoints (`/api/bto*`) | HTTP integration | `node server/tests/bto-service.test.js` | pending |
