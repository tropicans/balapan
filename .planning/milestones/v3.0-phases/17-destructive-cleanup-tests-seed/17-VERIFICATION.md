# Phase 17 Verification: Destructive Cleanup, Tests & Seed

## Summary
- Destructive migration 2 added in `server/migrations.js` safely gated by `ALLOW_DESTRUCTIVE_MIGRATION === 'true'` with automatic pre-drop backup in `data/backups/`.
- `server/db.js` `seedInitialData` hardened to verify table existence before attempting inserts into legacy tables.
- `server/raceManager.js` updated to verify table existence before querying legacy tables, preventing SQL exceptions.
- Pruned scanning dependencies (`html5-qrcode`, `qrcode.react`, `tailwind-merge`) from `client/package.json`.
- `client` production build verified clean with Vite v6.4.3.
- All 13 test suites run 100% green without regressions (`npm test`).
- Documentation (`README.md`) updated to reflect v3.0 physical flow without scanning.
