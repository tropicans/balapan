# Roadmap: NEO-TAMIYA Racing System

## Milestones

- ✅ **v3.4 System Hardening, Security & Operational Reliability** — Phases 26-28 (shipped 2026-09-18)
- ✅ **v3.3 Google Sheets Racer Sync & Admin Integration** — Phases 24-25 (shipped 2026-09-18) — [Archive](milestones/v3.3-ROADMAP.md)
- ✅ **v3.2 Google OAuth Authentication & Admin Approval System** — Phases 20-23 (shipped 2026-09-18) — [Archive](milestones/v3.2-ROADMAP.md)
- ✅ **v3.1 Race Director Elimination Command Center** — Phases 18-19 (shipped 2026-09-18) — [Archive](milestones/v3.1-ROADMAP.md)
- ✅ **v3.0 Alur Balap Fisik Tanpa Scan Kupon** — Phases 11-17 (shipped 2026-09-17) — [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v2.0 Physical Coupon & Marshal-Driven Tournament System** — Phases 07-10 (shipped 2026-09-04) — [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v1.2 Multi-Round 3-Lane Elimination System** — Phases 5-6 (shipped 2026-09-03) — [Archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.1 UI/UX & Arena Visual Showcase Polish** — Phases 3-4 (shipped 2026-09-03) — [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.0 Full SRS & Blueprint Compliance** — Phases 1-2 (shipped 2026-09-03) — [Archive](milestones/v1.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v3.4 System Hardening, Security & Operational Reliability (Phases 26-28) — SHIPPED 2026-09-18</summary>

- [x] **Phase 26: Critical Bug Fixes & Public Bracket Security Gate** (1/1 plan) — completed 2026-09-18
  - Goal: Resolve immediate security leak, memory leak, TV display bug, public bracket mutation vulnerability, and test coverage gap.
  - Requirements: FIX-01, FIX-02, FIX-03, FIX-04, SEC-01
- [x] **Phase 27: End-to-End RBAC Backend Protection & Frontend Role Guarding** (1/1 plan) — completed 2026-09-18
  - Goal: Secure all backend mutation endpoints with role middleware, integrate token forwarding across all frontend fetch requests, and enforce role-based UI access control.
  - Requirements: SEC-02, SEC-03, SEC-04
- [x] **Phase 28: Multi-Round Lock Hardening, Event Isolation & Offline Capabilities** (1/1 plan) — completed 2026-09-18
  - Goal: Prevent cross-event settings leakage, generalize dynamic round locks to all elimination rounds, enable local offline admin login, and enhance Google Sheets multi-entry support.
  - Requirements: ENH-01, ENH-02, ENH-03, ENH-04

</details>

<details>
<summary>✅ v3.3 Google Sheets Racer Sync & Admin Integration (Phases 24-25) — SHIPPED 2026-09-18</summary>

- [x] Phase 24: Google Sheets Live Fetch, Idempotent Sync Service & API Endpoints (1/1 plan) — completed 2026-09-18
- [x] Phase 25: Cashier & Admin Dashboard UI Integration (1/1 plan) — completed 2026-09-18

</details>

<details>
<summary>✅ v3.2 Google OAuth Authentication & Admin Approval System (Phases 20-23) — SHIPPED 2026-09-18</summary>

- [x] Phase 20: Database Schema, Google Auth Verification & Session Backend (1/1 plan) — completed 2026-09-18
- [x] Phase 21: Admin Approval Engine & RBAC Middleware (1/1 plan) — completed 2026-09-18
- [x] Phase 22: Frontend Google Login, Pending Gate & Public Route Bypass (1/1 plan) — completed 2026-09-18
- [x] Phase 23: Admin Approval Dashboard UI & Role-Based UI Controls (1/1 plan) — completed 2026-09-18

</details>

<details>
<summary>✅ v3.1 Race Director Elimination Command Center (Phases 18-19) — SHIPPED 2026-09-18</summary>

- [x] Phase 18: Backend Services, Round 2 Finalization & State Contract (1/1 plan) — completed 2026-09-18
- [x] Phase 19: Race Director Elimination Command Center UI (1/1 plan) — completed 2026-09-18

</details>

<details>
<summary>✅ v3.0 Alur Balap Fisik Tanpa Scan Kupon (Phases 11-17) — SHIPPED 2026-09-17</summary>

- [x] Phase 11: Event & Schema Migration Foundation (3/3 plans) — completed 2026-09-17
- [x] Phase 12: Participant Registration & Auto-Numbering (2/2 plans) — completed 2026-09-17
- [x] Phase 13: Manual BTO Backend & Leaderboard (1/1 plan) — completed 2026-09-17
- [x] Phase 14: Winner Registration & Bracket Execution (1/1 plan) — completed 2026-09-17
- [x] Phase 15: State Contract Switch & Backend Decoupling/Removal (1/1 plan) — completed 2026-09-17
- [x] Phase 16: Frontend Rewrite & Monitoring Screens (1/1 plan) — completed 2026-09-17
- [x] Phase 17: Destructive Cleanup, Tests & Seed (1/1 plan) — completed 2026-09-17

</details>

<details>
<summary>✅ v2.0 Physical Coupon & Marshal-Driven Tournament System (Phases 07-10) — SHIPPED 2026-09-04</summary>

- [x] Phase 07: Pre-Printed Coupon Package Registration & Cashier Flow (2/2 plans) — completed 2026-09-04
- [x] Phase 08: Marshal Start Box Rapid Line-Up & Coupon Check-off Dashboard (2/2 plans) — completed 2026-09-04
- [x] Phase 09: Finish-to-Next-Round Ticket Engine & Multi-Round Bracket Integration (2/2 plans) — completed 2026-09-04
- [x] Phase 10: Realtime Circuit TV Ticket HUD Showcase & Polish (2/2 plans) — completed 2026-09-04

</details>

---

## Progress

**Execution Order:**
Phases execute in numeric order: 26 → 27 → 28

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 26. Critical Bug Fixes & Public Bracket Security Gate | v3.4 | 1/1 | Complete | 2026-09-18 |
| 27. End-to-End RBAC Backend Protection & Frontend Role Guarding | v3.4 | 1/1 | Complete | 2026-09-18 |
| 28. Multi-Round Lock Hardening, Event Isolation & Offline Capabilities | v3.4 | 1/1 | Complete | 2026-09-18 |

---
*Roadmap updated: 2026-09-18 for Milestone v3.4 completion*
