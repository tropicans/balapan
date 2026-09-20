# Phase 29: Standalone Decoupled System & Local CSV Import/Export - Discussion Log

**Date:** 2026-09-20
**Phase:** 29

## Overview
Phase 29 bertugas melepaskan ketergantungan Google Sheets dan menyediakan impor/ekspor data CSV/JSON lokal secara mandiri di Kasir dan Admin.

## Decisions Summary
1. **Local CSV/JSON Data Import & Export**: Menambahkan endpoint `/api/participants/export` & `/api/participants/import`, serta BTO & Winners export/import. Menambahkan UI Import/Export modal di `/cashier` dan `/admin`.
2. **Decouple Google Sheets**: Google Sheets API bersifat opsional dan tidak menghalangi alur kerja lokal server.
3. **Auth Strategy**: Google OAuth 2.0 dipertahankan sebagai auth utama + Emergency Offline Login untuk venue offline.
