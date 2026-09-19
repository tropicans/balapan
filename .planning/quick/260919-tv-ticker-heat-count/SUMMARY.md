---
status: complete
date: 2026-09-19
slug: tv-ticker-heat-count
---

# Quick Task Summary: Tampilkan Jumlah Heat di Running Text Circuit TV

## Hasil Pengerjaan
1. Menambahkan kalkulasi jumlah heat di `client/src/screens/RealtimeTV.jsx`:
   - `totalHeats`: total match pada babak eliminasi (`round2Matches.length`)
   - `completedHeats`: heat yang sudah ada juaranya (`!!m.winner_id`)
   - `pendingHeats`: heat yang masih menunggu start
2. Menampilkan informasi heat secara dinamis di marquee running text:
   `{nama_event} // TOTAL: {totalHeats} HEAT ({completedHeats} SELESAI • {pendingHeats} MENUNGGU) • PESERTA TERDAFTAR: {participants.length} PEMBALAP • RACER TERSEEDING: {filledSlots}/{totalSlots} SLOT • SISTEM BALAP FISIK TANPA SCAN KUPON`
3. Menyempurnakan scrolling CSS marquee agar berjalan mulus tanpa celah atau jeda kosong.
4. Melakukan build client dan restart container Docker `dgdash-racing-system` (healthy).
5. Perubahan di-commit dan di-push ke branch `main`.
