---
last_mapped_commit: 21efbc37dda385cbc40d8a4c3005807cc187705f
---

# Coding Conventions

**Analysis Date:** 2026-09-20

## Naming Patterns

**Files:**
- React Screens & Components: `PascalCase.jsx` (e.g., `BracketDashboard.jsx`, `AdminUserDashboard.jsx`, `SyncStatusBadge.jsx`, `CyberButton.jsx`).
- Backend Modules, Services, & Utilities: `camelCase.js` (e.g., `googleSheetService.js`, `sheetSyncScheduler.js`, `authMiddleware.js`, `raceManager.js`).
- Hooks: `camelCase.js` prefixed with `use` (e.g., `useHaptic.js`).
- Test Files: `kebab-case.test.js` under `server/tests/` (e.g., `babak3-21heats-cap.test.js`, `in-app-results-protection.test.js`).

**Functions & Methods:**
- Functions and static methods: `camelCase` (e.g., `advanceBracketWinner`, `syncBracketFromSheet`, `verifyGoogleToken`, `normalizeGoogleSheetUrl`).
- Event Handlers: Prefixed with `handle` in React components (e.g., `handleDeclareNoRace`, `handleResetHeat`, `handleLockRace`, `handleSyncNow`).
- React Hook Functions: Prefixed with `use` (e.g., `useRace()`, `useAuth()`, `useHaptic()`).

**Variables & Constants:**
- Variables and state variables: `camelCase` (e.g., `activeRace`, `currentUser`, `isSyncInProgress`, `lastRunAt`).
- Constants: `UPPER_SNAKE_CASE` for global immutable configurations (e.g., `DEFAULT_SHEET_URL`, `DEFAULT_BRACKET_SHEET_URL`, `DEFAULT_SUPER_ADMIN`, `INDONESIAN_NUMBERS`).
- Database Columns: `snake_case` in SQLite tables and SQL queries (e.g., `finish_time`, `user_id`, `is_no_race`, `race_number`, `scrutineer_status`).

**Component Props:**
- `camelCase` for props (e.g., `activeScreen`, `setActiveScreen`, `variant`, `glow`, `onSelectWinner`).

## Code Style

**Formatting & Modules:**
- Pure ECMAScript Modules (`import` / `export`) throughout both frontend and backend (`"type": "module"` in `package.json`).
- Semicolons: Consistently present at the end of statements.
- Quotes: Single quotes (`'...'`) for JavaScript string literals; double quotes in JSON and HTML/JSX attributes; template literals (`` `...` ``) for interpolated strings and SQL statements.
- Indentation: 2 spaces throughout all `.js`, `.jsx`, `.json`, and `.html` files.

**Styling & Design Tokens:**
- Tailwind CSS utility classes used for styling.
- Dynamic classes assembled using `clsx` or template literals.
- Cyberpunk palette colors strictly used:
  - Background: `bg-midnight` (`#0a0b10`), `bg-obsidian` (`#0e1017`)
  - Accent Pink: `text-neonPink` / `border-neonPink` / `shadow-glowPink` (`#ff0055`)
  - Accent Cyan: `text-neonCyan` / `border-neonCyan` / `shadow-glowCyan` (`#00f0ff`)
  - Accent Green: `text-neonGreen` / `border-neonGreen` / `shadow-glowGreen` (`#39ff14`)
  - Accent Amber: `text-neonAmber` / `border-neonAmber` / `shadow-glowAmber` (`#ffaa00`)
  - Fonts: `font-orbitron` for headings, heat numbers, and badges; `font-mono` for metrics and terminal bodies.
- Angular Chamfer Cuts: `clip-cyber` class applied via `clip-path` in `client/src/index.css` for futuristic chamfered card and button corners.

## Import Organization

**Order:**
1. Node.js built-ins (`fs`, `path`, `http`, `crypto`)
2. Core external packages (`express`, `socket.io`, `react`, `uuid`, `clsx`, `lucide-react`)
3. Internal database and configuration (`./db.js`, `dotenv/config`)
4. Domain services and middleware (`./services/...`, `./middleware/...`)
5. React Context and hooks (`../context/...`, `../hooks/...`)
6. UI components and utilities (`../components/...`, `../utils/...`)

**Example:**
```javascript
import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
```

## Error Handling

**Backend Strategy:**
- Business logic throws standard `Error` objects with informative Indonesian messages:
  ```javascript
  if (!user) {
    throw new Error('Peserta tidak ditemukan.');
  }
  ```
- Express route controllers wrap handlers in `try/catch` and return standardized JSON envelopes:
  - Success: `res.json({ success: true, data: ... })` or `res.status(200).json(result)`
  - Error: `res.status(status || 400).json({ success: false, code: 'ERROR_CODE', error: err.message })`
- Multi-step database updates use `db.transaction(() => { ... })` to ensure atomic rollback if any query fails.

**Frontend Strategy:**
- Async operations wrapped in `try/catch/finally` setting local `loading` and `feedback` states:
  ```javascript
  setLoading(true);
  setFeedback(null);
  try {
    const res = await apiDeclareNoRace(matchId);
    setFeedback({ type: 'success', text: res.message || 'Berhasil mendeklarasikan No Race' });
  } catch (err) {
    setFeedback({ type: 'error', text: err.message });
  } finally {
    setLoading(false);
  }
  ```

## Logging & Observability

- Console output uses standardized emoji prefixes to distinguish event domains:
  - `🏎️` Application lifecycle & server boot
  - `⏱️` Google Sheet sync scheduler intervals
  - `🛑` Scheduler halt / stop events
  - `⚡` WebSocket real-time events
  - `⚠️` Warning conditions & non-critical errors
  - `🎉` Test suite completion & success markers

## Comments & Documentation

- JSDoc docstrings precede service functions describing parameter types and return contracts.
- Complex tournament business rules (e.g. Babak 3 21 heats capping, sequential slot repacking after NO RACE, duplicate participant reconciliation) include explanatory comments detailing the rationale.

---

*Conventions analysis: 2026-09-20*
*Update when conventions change*
