import React, { useState, useEffect } from 'react';
import { GitBranch, Trophy, Loader2, RefreshCw, AlertCircle, CheckCircle2, User, XCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { playSuccessChime, playErrorBuzz, playActionClick } from '../../utils/audioChime.js';

export function Round2BracketExecution({ activeMatch, onRefresh, loading }) {
  const [submitting, setSubmitting] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showNoRaceConfirm, setShowNoRaceConfirm] = useState(false);

  const handleSelectWinner = async (contestantId, contestantName, lane) => {
    if (!activeMatch || submitting) return;
    playActionClick();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/marshal/record-bracket-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: activeMatch.id,
          winner_id: contestantId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mencatat pemenang bracket');
      }

      playSuccessChime();
      setLastAction({
        winnerName: contestantName,
        lane,
        matchNumber: activeMatch.match_number
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      playErrorBuzz();
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclareNoRace = async () => {
    if (!activeMatch || submitting) return;
    playActionClick();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/marshal/record-bracket-no-race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: activeMatch.id
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mendeklarasikan No Race');
      }

      playErrorBuzz();
      setLastAction({
        noRace: true,
        matchNumber: activeMatch.match_number
      });
      setShowNoRaceConfirm(false);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      playErrorBuzz();
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const contestants = [
    {
      lane: 'A',
      laneName: 'JALUR A',
      sublabel: 'PINK NEON',
      color: '#ff007f',
      border: 'border-[#ff007f]/50 hover:border-[#ff007f]',
      btnBg: 'bg-[#ff007f] hover:bg-[#ff007f]/90 text-white shadow-[0_0_20px_rgba(255,0,127,0.5)]',
      id: activeMatch?.user_id_1,
      name: activeMatch?.user_1_name,
      team: activeMatch?.user_1_team
    },
    {
      lane: 'B',
      laneName: 'JALUR B',
      sublabel: 'CYAN NEON',
      color: '#00f0ff',
      border: 'border-[#00f0ff]/50 hover:border-[#00f0ff]',
      btnBg: 'bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-black shadow-[0_0_20px_rgba(0,240,255,0.5)]',
      id: activeMatch?.user_id_2,
      name: activeMatch?.user_2_name,
      team: activeMatch?.user_2_team
    },
    {
      lane: 'C',
      laneName: 'JALUR C',
      sublabel: 'GREEN NEON',
      color: '#00ff66',
      border: 'border-[#00ff66]/50 hover:border-[#00ff66]',
      btnBg: 'bg-[#00ff66] hover:bg-[#00ff66]/90 text-black shadow-[0_0_20px_rgba(0,255,102,0.5)]',
      id: activeMatch?.user_id_3,
      name: activeMatch?.user_3_name,
      team: activeMatch?.user_3_team
    }
  ];

  if (loading) {
    return (
      <div className="w-full bg-obsidian border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-neonCyan mb-3" />
        <div className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
          Memuat Pertandingan Bracket Aktif...
        </div>
      </div>
    );
  }

  if (!activeMatch) {
    return (
      <div className="w-full bg-obsidian border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-neonPink">
          <GitBranch className="w-6 h-6" />
        </div>
        <div className="text-base font-orbitron font-bold text-white uppercase tracking-wider">
          Bagan Babak 2 Belum Dimulai / Semua Match Selesai
        </div>
        <p className="text-xs font-mono text-cyberSilver/70 max-w-md">
          Belum ada jadwal pertandingan eliminasi yang berstatus pending. Pastikan kualifikasi Babak 1 sudah selesai atau Race Director telah mengaktifkan bracket.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-2 px-4 py-2 bg-midnight border border-neonCyan/40 text-neonCyan text-xs font-orbitron font-bold rounded hover:border-neonCyan flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Bracket</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Active Match Header HUD */}
      <div className="bg-obsidian border-2 border-neonPink/50 rounded-lg p-4 relative overflow-hidden shadow-[0_0_25px_rgba(255,0,127,0.15)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-neonPink/20 border border-neonPink flex items-center justify-center text-neonPink">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-orbitron font-bold text-neonPink uppercase tracking-widest">
                BABAK 2: BRACKET ELIMINASI 3-JALUR
              </div>
              <div className="text-lg font-orbitron font-black text-white">
                Match #{activeMatch.match_number} &bull; Putaran {activeMatch.round_number}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 bg-midnight border border-gray-700 hover:border-gray-500 text-cyberSilver hover:text-white text-xs font-mono rounded flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500 rounded flex items-center gap-2 text-xs font-mono text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Confirmation Toast */}
        {lastAction && (
          <div className={clsx(
            "mb-4 p-3 border rounded flex items-center gap-2 text-xs font-mono",
            lastAction.noRace 
              ? "bg-rose-950/80 border-rose-500 text-rose-200" 
              : "bg-green-950/80 border-green-500 text-green-200"
          )}>
            {lastAction.noRace ? (
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            )}
            <span>
              {lastAction.noRace ? (
                `Match #${lastAction.matchNumber} berhasil dinyatakan NO RACE (Semua peserta gugur). Slot babak berikutnya menjadi BYE.`
              ) : (
                `Pemenang Match #${lastAction.matchNumber} (${lastAction.winnerName} - Jalur ${lastAction.lane}) berhasil dimajukan ke putaran berikutnya!`
              )}
            </span>
          </div>
        )}

        {/* 3 Contestants Lanes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {contestants.map((c) => {
            const hasRacer = Boolean(c.id);
            return (
              <div
                key={c.lane}
                className={clsx(
                  "p-4 rounded-lg bg-midnight/80 border-2 transition-all duration-150 flex flex-col justify-between",
                  c.border,
                  !hasRacer && "opacity-50 border-dashed border-gray-800"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-orbitron font-bold"
                      style={{ color: c.color, backgroundColor: `${c.color}20`, border: `1px solid ${c.color}` }}
                    >
                      {c.laneName}
                    </span>
                    <span className="text-[10px] font-mono text-cyberSilver/60">{c.sublabel}</span>
                  </div>

                  {hasRacer ? (
                    <div className="py-2">
                      <div className="text-base sm:text-lg font-orbitron font-black text-white truncate">
                        {c.name}
                      </div>
                      <div className="text-xs font-mono text-cyberSilver/70 truncate mt-0.5">
                        {c.team || '[INDIVIDUAL]'}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <span className="text-xs font-mono text-gray-500 tracking-wider">
                        [BYE / KOSONG]
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!hasRacer || submitting}
                  onClick={() => handleSelectWinner(c.id, c.name, c.lane)}
                  className={clsx(
                    "mt-4 w-full min-h-[48px] rounded font-orbitron font-black text-xs sm:text-sm uppercase tracking-wider transition-all select-none flex items-center justify-center gap-1.5",
                    hasRacer && !submitting
                      ? `${c.btnBg} cursor-pointer active:scale-95`
                      : "bg-gray-800/40 text-gray-500 cursor-not-allowed border border-gray-800"
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                  ) : hasRacer ? (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>Pilih Pemenang</span>
                    </>
                  ) : (
                    <span>Slot Kosong</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* No Race / All Kelontang Action Button */}
        <div className="mt-4 pt-3 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-cyberSilver/60 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-cyberSilver/50" />
            <span>Jika semua mobil kelontang / CO / mogok sebelum finis:</span>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setShowNoRaceConfirm(true)}
            className="w-full sm:w-auto px-4 py-2 rounded font-orbitron font-bold text-xs uppercase tracking-wider transition-all select-none flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-600/60 hover:border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] active:scale-95 cursor-pointer disabled:opacity-50"
            title="Deklarasikan semua peserta gugur (No Race) tanpa pemenang"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>NO RACE / SEMUA KELONTANG (CO)</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for No Race */}
      {showNoRaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-obsidian border-2 border-rose-500/80 rounded-lg p-5 shadow-[0_0_30px_rgba(244,63,94,0.3)] space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-orbitron font-black text-white uppercase tracking-wider">
                  Konfirmasi No Race (CO Semua)
                </h3>
                <p className="text-[11px] font-mono text-rose-300/80">
                  Heat #{activeMatch.match_number} &bull; Putaran {activeMatch.round_number}
                </p>
              </div>
            </div>

            <p className="text-xs font-mono text-cyberSilver/90 leading-relaxed">
              Apakah Anda yakin mendeklarasikan <strong className="text-rose-400">NO RACE</strong> untuk heat ini? 
              Seluruh mobil peserta dinyatakan gugur dan <strong className="text-white">tidak ada pemenang</strong> yang maju ke babak berikutnya (slot babak berikutnya otomatis menjadi BYE).
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowNoRaceConfirm(false)}
                className="px-4 py-2 bg-midnight border border-gray-700 hover:border-gray-500 text-cyberSilver hover:text-white text-xs font-mono rounded"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeclareNoRace}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-orbitron font-black uppercase tracking-wider rounded shadow-[0_0_15px_rgba(244,63,94,0.5)] flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Ya, Tetapkan No Race</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
