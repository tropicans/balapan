import React, { useState, useEffect } from 'react';
import { Award, RotateCcw, CheckSquare, Clock, Users, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { playActionClick, playSuccessChime } from '../../utils/audioChime.js';

export function WinnerBanner({
  latestWinner,
  recentWinners,
  onUndoWinner,
  undoLoading
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  // 60-Second Countdown Timer for latestWinner
  useEffect(() => {
    if (!latestWinner || !latestWinner.created_at) {
      setRemainingSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const createdTime = new Date(latestWinner.created_at).getTime();
      const elapsed = Math.floor((Date.now() - createdTime) / 1000);
      const left = Math.max(0, 60 - elapsed);
      return left;
    };

    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const left = calculateRemaining();
      setRemainingSeconds(left);
      if (left <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [latestWinner]);

  const canUndo = remainingSeconds > 0 && !undoLoading && latestWinner && latestWinner.status !== 'undone';

  const getLaneBadge = (lane) => {
    switch (lane) {
      case 'A':
        return <span className="px-2 py-0.5 rounded bg-[#ff007f]/20 text-[#ff007f] border border-[#ff007f] font-orbitron font-bold text-xs">JALUR A (PINK)</span>;
      case 'B':
        return <span className="px-2 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff] font-orbitron font-bold text-xs">JALUR B (CYAN)</span>;
      case 'C':
        return <span className="px-2 py-0.5 rounded bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66] font-orbitron font-bold text-xs">JALUR C (GREEN)</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-800 text-cyberSilver font-orbitron text-xs">JALUR -</span>;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Latest Winner Card Banner */}
      <div className="w-full bg-obsidian border-2 border-neonCyan/40 rounded-lg p-4 sm:p-5 relative overflow-hidden shadow-[0_0_25px_rgba(0,240,255,0.15)]">
        {/* Visual Glow Backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-neonCyan/5 rounded-full blur-3xl pointer-events-none" />

        {latestWinner && latestWinner.status !== 'undone' ? (
          <div className="space-y-4">
            {/* Header: Winner Title and Lane */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-neonCyan/20 border border-neonCyan flex items-center justify-center text-neonCyan">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-orbitron font-bold text-neonCyan uppercase tracking-widest">
                    Pemenang Heat Terakhir
                  </div>
                  <div className="text-lg sm:text-xl font-orbitron font-black text-white flex items-center gap-2">
                    <span className="truncate max-w-[220px] sm:max-w-md">{latestWinner.user_name}</span>
                    {latestWinner.team_name ? (
                      <span className="text-xs font-mono px-2 py-0.5 bg-white/10 text-cyberSilver rounded border border-gray-700">
                        {latestWinner.team_name}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                        [INDIVIDUAL]
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>{getLaneBadge(latestWinner.lane)}</div>
            </div>

            {/* Giant Physical Coupon Check-Off Instruction Box */}
            <div className="p-3.5 bg-neonAmber/10 border-2 border-neonAmber/80 rounded flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(255,170,0,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-neonAmber text-black font-black font-orbitron text-xl flex items-center justify-center flex-shrink-0">
                  #{latestWinner.box_number}
                </div>
                <div>
                  <div className="text-[11px] font-orbitron font-bold text-neonAmber uppercase tracking-wider">
                    Instruksi Meja Juri Finish
                  </div>
                  <div className="text-base sm:text-lg font-orbitron font-black text-white">
                    CORET KOTAK <span className="text-neonAmber underline decoration-2">#{latestWinner.box_number}</span> PADA LEMBAR KUPON
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0 self-end sm:self-center">
                <div className="text-[10px] font-mono text-cyberSilver/70">NO. SERI KUPON FISIK</div>
                <div className="text-sm font-orbitron font-bold text-white">
                  #{latestWinner.serial_number}
                </div>
                <div className="text-xs font-mono text-neonCyan mt-0.5">
                  Sisa Kuota: {latestWinner.remaining_quota} / {latestWinner.total_quota || 50}
                </div>
              </div>
            </div>

            {/* 60-Second Undo Action Bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-cyberSilver/75">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neonPink" />
                  Batas Waktu Koreksi Cepat:
                </span>
                <span className={clsx(
                  "font-orbitron font-bold",
                  remainingSeconds > 10 ? "text-neonCyan" : "text-[#ff0055] animate-pulse"
                )}>
                  {remainingSeconds > 0 ? `${remainingSeconds} Detik Tersisa` : 'Koreksi Kedaluwarsa (>60s)'}
                </span>
              </div>

              {/* Countdown Progress Bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                <div
                  className={clsx(
                    "h-full transition-all duration-1000",
                    remainingSeconds > 15 ? "bg-neonCyan" : "bg-[#ff0055]"
                  )}
                  style={{ width: `${(remainingSeconds / 60) * 100}%` }}
                />
              </div>

              {/* Destructive Undo Button */}
              <button
                type="button"
                onClick={() => {
                  playActionClick();
                  onUndoWinner(latestWinner.log_id);
                }}
                disabled={!canUndo}
                className={clsx(
                  "w-full py-2.5 px-4 rounded flex items-center justify-center gap-2 font-orbitron font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 border select-none",
                  canUndo
                    ? "bg-[#ff0055]/20 text-white border-[#ff0055] hover:bg-[#ff0055]/30 shadow-[0_0_15px_rgba(255,0,85,0.4)] active:scale-[0.99] cursor-pointer"
                    : "bg-gray-800/30 text-gray-500 border-gray-800 cursor-not-allowed"
                )}
              >
                {undoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>MEMBATALKAN KEMENANGAN...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 text-[#ff0055]" />
                    <span>
                      {remainingSeconds > 0
                        ? `Batalkan Kemenangan Terakhir (${remainingSeconds}s)`
                        : 'Koreksi Kedaluwarsa (>60s)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Empty Standby State */
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-neonCyan mb-1">
              <CheckSquare className="w-6 h-6 opacity-75" />
            </div>
            <div className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
              Menunggu Pemenang Heat Berikutnya
            </div>
            <p className="text-xs font-mono text-cyberSilver/70 max-w-md leading-relaxed">
              Pilih jalur mobil yang berhasil finish (A, B, atau C) lalu masukkan nomor seri kupon fisik pemenang menggunakan numpad sentuh.
            </p>
          </div>
        )}
      </div>

      {/* Mini Recent Winners Log (Last 3-5 entries) */}
      {recentWinners && recentWinners.length > 0 && (
        <div className="w-full bg-obsidian/70 border border-gray-800 rounded-lg p-3">
          <div className="text-[11px] font-orbitron font-bold text-cyberSilver/80 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Riwayat Pemenang Terakhir (Finish Table Log)</span>
            <span className="text-[10px] font-mono text-neonCyan">{recentWinners.length} Terdata</span>
          </div>

          <div className="space-y-1.5">
            {recentWinners.slice(0, 4).map((w, idx) => (
              <div
                key={w.id || idx}
                className={clsx(
                  "flex items-center justify-between p-2 rounded text-xs font-mono border transition-colors",
                  w.status === 'undone'
                    ? "bg-red-950/20 border-red-900/40 opacity-60 line-through"
                    : "bg-midnight/60 border-gray-800/80 hover:border-gray-700"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded font-orbitron font-bold text-[10px]",
                    w.lane === 'A' && "bg-[#ff007f]/20 text-[#ff007f]",
                    w.lane === 'B' && "bg-[#00f0ff]/20 text-[#00f0ff]",
                    w.lane === 'C' && "bg-[#00ff66]/20 text-[#00ff66]"
                  )}>
                    {w.lane}
                  </span>
                  <span className="font-bold text-white">{w.user_name}</span>
                  {w.team_name && <span className="text-cyberSilver/60 text-[11px]">[{w.team_name}]</span>}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-neonAmber text-[11px]">Kotak #{w.box_number}</span>
                  <span className="text-cyberSilver/70 text-[11px]">#{w.serial_number}</span>
                  {w.status === 'undone' && (
                    <span className="text-[10px] font-orbitron text-red-400 no-underline px-1 bg-red-950/60 rounded">
                      BATAL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
