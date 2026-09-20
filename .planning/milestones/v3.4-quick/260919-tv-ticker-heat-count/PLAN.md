# Quick Task: Tampilkan Jumlah Heat di Running Text Circuit TV

## Objective
Menampilkan jumlah total heat, heat selesai, dan heat menunggu di running text (footer marquee ticker) pada layar Circuit TV (`RealtimeTV.jsx`).

## Changes
- Hitung `totalHeats`, `completedHeats`, dan `pendingHeats` dari `round2Matches`.
- Tambahkan informasi ke teks berjalan `INFO TURNAMEN`.
- Gandakan elemen dalam `.animate-marquee` agar looping `-50%` CSS berjalan mulus tanpa lompatan.
