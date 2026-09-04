# Stack Research

**Domain:** Tamiya Mini 4WD Tournament — Physical Coupon & Marshal-Driven Operations
**Researched:** 2026-09-04
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React + Vite | 18.x / Vite 6.x | Frontend UI & Print Templates | Zero-dependency high-DPI browser rendering with instantaneous HMR and component modularity |
| Node.js ESM + Express | 20.x LTS / Express 4.21.x | Server runtime & REST API | Lightweight, asynchronous, already validated in v1.0-v1.2 baseline |
| Socket.IO | 4.8.x | Real-time bi-directional messaging | Latency <30ms between Marshal Start Box, Race Director, and TV HUD |
| sql.js (SQLite WASM) | 1.14.x | Local single-file database engine | Zero external DB process, persistent disk sync to `tamiya.sqlite`, acid transactions |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native CSS `@media print` | W3C Standard | Printable 50-Box Coupon Sheets | Direct browser printing to A4 / A5 / Thermal printers without external heavy dependencies |
| `qrcode` / SVG Vector | Native SVG / canvas | Compact QR / Barcode for Coupon ID | Rapid scanning by Marshal using existing camera or USB 1D/2D barcode reader |
| Lucide React | Existing | UI icons for start box, print, ticket, checkmark | Touch-friendly marshal controls and cashier modals |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Chrome DevTools Emulate Print Media | Previewing print layout without physical paper | Emulate CSS media type `print` |
| Native File/Camera scanner | Camera / USB Barcode reader input | Fast barcode input via keyboard emulation or camera |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Browser `@media print` CSS | Puppeteer / PDFKit server PDF | Only if strict server-side PDF archiving is required. For local tournament venues, browser print dialog is 10x faster and requires zero server CPU load. |
| SVG/Canvas QR Barcode | Heavy Barcode image binaries | SVG renders crisply at any DPI (300-600 DPI) on physical printers without pixelation. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Server-side Puppeteer PDF rendering | Extremely heavy on RAM/CPU, slow response time (1-3s per print), fragile on Docker Alpine | Client-side `window.print()` with `@media print` styled template |
| Participant Phone-bound Registration Gate | Hinders high-speed tournament queue when participants have spotty internet or uncharged phones | Cashier-issued physical coupon sheets with Marshal quick-select |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 18.3 | Tailwind CSS 3.4 / Native CSS print | Tailwind `@media print` utilities and custom print stylesheet blend seamlessly |
| Socket.IO 4.8 | Express 4.21 | Fully backwards-compatible with existing race channels |

## Sources

- W3C CSS Paged Media Module Level 3 specification
- Modern Web Printing Guidelines (high-DPI vector barcodes & print layout control)
- Indonesian Mini 4WD Tournament Operational Rulebooks (Standard Kupon Balap & Marshal Start Box)

---
*Stack research for: Physical Coupon & Marshal-Driven Tournament System*
*Researched: 2026-09-04*
