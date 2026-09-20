# Phase 31: Redis Socket Adapter & API Rate Limiting Infrastructure - Discussion Log

**Date:** 2026-09-20
**Phase:** 31

## Overview
Phase 31 mengintegrasikan `@socket.io/redis-adapter` untuk scaling horizontal real-time WebSocket pub/sub serta middleware API Rate Limiting.

## Decisions Summary
1. **Redis Socket Adapter**: Menggunakan `ioredis` dan `@socket.io/redis-adapter` saat `REDIS_URL` ada.
2. **Auto Fallback**: Menggunakan in-memory Socket.IO adapter saat offline / tanpa `REDIS_URL`.
3. **API Rate Limiting**: Middleware rate limiter di `/api/auth/*`, `/api/participants/*`, `/api/winners/*`, dan `/api/bracket/*` dengan respon HTTP 429 dan header terstandar.
