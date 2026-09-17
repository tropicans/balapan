---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Alur Balap Fisik Tanpa Scan Kupon
current_phase: 12
current_phase_name: Participant Registration & Auto-Numbering
status: ready_to_execute
stopped_at: Phase 12 planned (2 plans)
last_updated: "2026-09-17T11:19:30.000Z"
last_activity: 2026-09-17
last_activity_desc: Phase 12 planned, ready for execution
state_head: 29befb1a43fd0a21ce34609ae778b2b55ac28e9b
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 5
  completed_plans: 3
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-17)

**Core value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.
**Current focus:** Phase 12 — Participant Registration & Auto-Numbering (Ready to Execute)

## Current Position

Phase: 12 — Participant Registration & Auto-Numbering
Plan: 2 plans ready (Wave 1: 12-01, Wave 2: 12-02)
Status: Ready to execute
Last activity: 2026-09-17 — Phase 12 planned, ready for execution

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**

- Total plans completed: 3 (v3.0)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v3.0 roadmap]: Strict add → switch → remove order — migration/data-safety + backend de-coupling before any UI removal; manual BTO replacement before deleting race engine; destructive drops last
- [v3.0 roadmap]: Zero new runtime deps — prune only (`html5-qrcode`, `qrcode.react`, dead `tailwind-merge`)
- [v3.0 roadmap]: Bracket subsystem (`bracket_matches` + `advanceBracketWinner` + `seedIntoBracket` + `BracketDashboard.jsx`) preserved verbatim

### Pending Todos

None.

### Blockers/Concerns

- **Pitfall risk**: schema resurrection via `CREATE TABLE IF NOT EXISTS` / silent `ALTER` in `db.js` `initDatabase()` — must be removed in same commit as feature
- **Pitfall risk**: `SqliteWrapper.transaction()` fake transactions (no BEGIN/COMMIT/ROLLBACK) + `DROP TABLE` on startup → irreversible loss of live coupon/financial data
- **Pitfall risk**: two-way circular ESM dep `ticketEngine.js` ↔ `raceManager.js` — naive deletion = boot crash
- **Open decision**: BTO policy personal-best-per-participant (recommended) vs every-logged-run — confirm in Phase 13
- **Open decision**: data-retention tier (stop-storing / archive / drop) must be explicit in Phase 11 & Phase 17 release notes

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-09-17T11:08:30.000Z
Stopped at: Phase 12 context gathered, ready to plan Phase 12
Resume file: .planning/phases/12-participant-registration-auto-numbering/12-CONTEXT.md
