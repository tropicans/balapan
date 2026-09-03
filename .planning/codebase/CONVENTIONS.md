---
last_mapped_commit: 4a0ecd0fb9bf40dcd255e5b0c93e66d817bc1289
---

# Coding Conventions

**Analysis Date:** 2026-09-03

## Naming Patterns

**Files:**
- React Components & Screens: `PascalCase.jsx` (e.g., `ParticipantDashboard.jsx`, `CyberButton.jsx`, `Navbar.jsx`).
- Backend Modules & Utilities: `camelCase.js` (e.g., `raceManager.js`, `db.js`, `audio.js`).
- Hooks: `camelCase.js` prefixed with `use` (e.g., `useHaptic.js`).
- Test Files: `kebab-case.test.js` under `server/tests/` (e.g., `race-flow.test.js`).

**Functions & Methods:**
- Functions and static methods: `camelCase` (e.g., `registerLane`, `lockRace`, `submitFinishTimes`, `handleScrutineerAction`).
- Event Handlers: Prefixed with `handle` in React components (e.g., `handleQRScan`, `handleSubmitFinish`, `handleLockRace`, `handleTopUp`).
- React Hook Functions: Prefixed with `use` (e.g., `useRace()`, `useHaptic()`).

**Variables & Constants:**
- Variables and state variables: `camelCase` (e.g., `activeRace`, `currentUser`, `countdownRemaining`, `feedback`).
- Constants: `UPPER_SNAKE_CASE` for global immutable arrays or values (e.g., `INDONESIAN_NUMBERS`).
- Database Columns: `snake_case` in SQLite tables and SQL queries (e.g., `race_number`, `user_id`, `finish_time`, `scrutineer_status`, `is_virtual`).

**Component Props:**
- `camelCase` for props (e.g., `activeScreen`, `setActiveScreen`, `variant`, `glow`, `icon`).

## Code Style

**Formatting & Modules:**
- Pure ECMAScript Modules (`import` / `export`) throughout both frontend and backend (`"type": "module"` in `package.json`).
- Semicolons: Consistently present at the end of statements.
- Quotes: Single quotes (`'...'`) for JavaScript string literals; double quotes in JSON and HTML/JSX attributes; template literals (`` `...` ``) for interpolated strings and multi-line SQL statements.
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
  - Fonts: `font-orbitron` for headings, timers, and badges; `font-mono` for metrics and terminal bodies.
- Angular Chamfer Cuts: `clip-cyber` class applied via `clip-path` in `client/src/index.css` for futuristic chamfered card and button corners.

## Import Organization

**Order:**
1. Core external packages (`react`, `express`, `socket.io`, `socket.io-client`, `uuid`, `clsx`, `lucide-react`)
2. Internal database / service modules (`./db.js`, `./raceManager.js`)
3. Context and hooks (`../context/RaceContext.jsx`, `../hooks/useHaptic.js`)
4. Reusable UI components (`../components/ui/CyberButton.jsx`, `../components/ui/CyberCard.jsx`)
5. Utilities (`../utils/audio.js`)

**Example:**
```javascript
import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { Lock, Play, Timer } from 'lucide-react';
import clsx from 'clsx';
```

## Error Handling

**Backend Strategy:**
- Business logic in `RaceManager` throws standard `Error` objects with descriptive Indonesian messages:
  ```javascript
  if (!coupon || coupon.balance < 1) {
    throw new Error('Saldo Kupon Habis! Silakan top up di meja kasir.');
  }
  ```
- Express route controllers wrap calls in `try/catch` and return standardized JSON envelopes:
  - Success: `res.json({ success: true, data: ... })` or `res.json(result)`
  - Failure: `res.status(400).json({ success: false, error: err.message })`
- Multi-step database operations use `db.transaction(() => { ... })` to ensure atomic rollback if any query fails.

**Frontend Strategy:**
- Async operations wrapped in `try/catch/finally` setting local `loading` and `feedback` states:
  ```javascript
  setLoading(true);
  setFeedback(null);
  try {
    const res = await apiScanLane(currentUser.id, lane);
    setFeedback({ type: 'success', text: res.message });
  } catch (err) {
    setFeedback({ type: 'error', text: err.message });
  } finally {
    setLoading(false);
  }
  ```

## Logging & Observability

- Console output used for server startup banners and test execution reports:
  ```javascript
  console.log(`🏎️ TAMIYA DIGITAL RACING SYSTEM BACKEND ACTIVE`);
  console.log(`📍 Listening on: http://localhost:${PORT}`);
  ```
- Audio / speech synthesis errors wrapped in try-catch with non-fatal `console.warn`.

---

*Conventions analysis: 2026-09-03*
*Update when establishing new coding patterns*
