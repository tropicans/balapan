# Phase 31: Redis Socket Adapter & API Rate Limiting Infrastructure - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Mengintegrasikan `@socket.io/redis-adapter` untuk scaling horizontal real-time WebSocket pub/sub serta mengimplementasikan API Rate Limiting middleware (Redis & in-memory backed).
</domain>

<decisions>
## Implementation Decisions

### Redis Socket.IO Adapter
- **D-01:** Gunakan `@socket.io/redis-adapter` dan `ioredis` saat environment variable `REDIS_URL` terdefinisi. — **Reversibility:** costly — menyentuh abstraksi WebSocket pub/sub
- **D-02:** Sediakan auto-fallback ke in-memory adapter saat `REDIS_URL` tidak diset atau server Redis tidak dapat dijangkau, sehingga server tetap berjalan normal pada venue offline / single node.

### API Rate Limiting Middleware
- **D-03:** Terapkan rate limiter middleware (`server/middleware/rateLimiter.js`) pada endpoint sensitif (`/api/auth/*`, `/api/participants/*`, `/api/winners/*`, `/api/bracket/*`). — **Reversibility:** costly — proteksi HTTP API endpoints
- **D-04:** Gunakan Redis store jika `REDIS_URL` aktif, dan gunakan sliding window in-memory store sebagai fallback.
- **D-05:** Kembalikan HTTP `429 Too Many Requests` dengan header `RateLimit-Limit`, `RateLimit-Remaining`, dan `Retry-After` serta pesan JSON terstandar.

### Agent's Discretion
- Batas rate limit standar disesuaikan per kategori endpoint (misal: Auth 10 req/menit, Mutation APIs 60 req/menit).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — Section 2 & 3: Redis Socket Adapter & API Rate Limiting (REDIS-01 s/d REDIS-03, RATELIM-01 s/d RATELIM-03)
- `.planning/ROADMAP.md` — Phase 31 specifications
- `server/index.js` — Tempat inisialisasi Socket.IO dan middleware Express
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Express middleware pattern di `server/middleware/authMiddleware.js`.
- Inisialisasi Socket.IO server di `server/index.js`.

### Integration Points
- Express App Middleware (`app.use('/api/...', rateLimiter)`)
- Socket.IO Server configuration (`io.adapter(...)`)
</code_context>

<specifics>
## Specific Ideas
- `REDIS_URL` menentukan koneksi Redis (misal `redis://localhost:6379`).
- Jika Redis offline, log warning dan lanjut menggunakan in-memory mode tanpa crash.
</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope.
</deferred>

---
*Phase: 31-Redis Socket Adapter & API Rate Limiting Infrastructure*
*Context gathered: 2026-09-20*
