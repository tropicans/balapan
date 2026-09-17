---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Alur Balap Fisik Tanpa Scan Kupon
status: planning
stopped_at: Phase 11 context gathered
last_updated: "2026-09-17T10:08:28.780Z"
last_activity: 2026-09-17 — Roadmap created for v3.0 (Phases 11-17)
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-17)

**Core value:** Operasional turnamen balap Mini 4WD Tamiya yang cepat, adil, bebas antrean, dan nol biaya hardware tambahan melalui alur digital real-time terintegrasi.
**Current focus:** v3.0 Alur Balap Fisik Tanpa Scan Kupon — Phase 11 ready to plan

## Current Position

Phase: 11 of 17 (Event & Schema Migration Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-17 — Roadmap created for v3.0 (Phases 11-17)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v3.0)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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

Last session: 2026-09-17T10:08:28.767Z
Stopped at: Phase 11 context gathered
Resume file: .planning/phases/11-event-schema-migration-foundation/11-CONTEXT.md
