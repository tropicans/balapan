---
id: 260907-b5c
title: Fix ReferenceError cfg is not defined in BracketDashboard
status: complete
date: 2026-09-07
---

# Quick Task Summary: 260907-b5c

## Bug Identified
When accessing `http://localhost:3050/bracket`, the client crashed with:
```
ReferenceError: cfg is not defined
    at ee (index-BR04EaZv.js:343:160015)
    at te (index-BR04EaZv.js:343:163566)
```

## Reproduction & Verification
1. Created reproduction test `server/tests/bracket-dashboard-render.test.js` using esbuild & React server rendering.
2. Verified initial failure: caught `ReferenceError: cfg is not defined` when rendering `<BracketDashboard />` with mock bracket matches.
3. Implemented fix in `client/src/screens/BracketDashboard.jsx` by assigning `const cfg = laneConfigs[lane] || laneConfigs.A;`.
4. Reran test: passed with 100% green output.
5. Rebuilt and restarted production container `dgdash-racing-system`. Tested `/api/health` and verified updated bundle is served.
