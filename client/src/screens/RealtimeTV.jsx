import React, { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { Trophy, Zap, Crown, Ticket, Sparkles, GitBranch, Users, CheckCircle, Play, Pause } from 'lucide-react';
import { BtoCelebrationModal } from '../components/ui/BtoCelebrationModal.jsx';
import clsx from 'clsx';

export function RealtimeTV() {
  const { raceState, bannerAlert } = useRace();
  const [timeClock, setTimeClock] = useState('');

  // Auto-scroll state for heat board
  const heatContainerRef = useRef(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeClock(now.toLocaleTimeString('id-ID', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeEvent = raceState.activeEvent;
  const btoLeaderboard = raceState.btoLeaderboard || [];
  const bracketMatches = raceState.bracketMatches || [];
  const participants = raceState.participants || [];

  // Round 2 matches (or first round in elimination)
  const round2Matches = bracketMatches.filter(m => m.round_number === 2 || m.round_number === 1);

  // Auto-scroll loop for elimination heats on circuit TV
  useEffect(() => {
    if (!autoScrollEnabled) return;

    let pauseTimeout = null;
    let isWaiting = false;

    const interval = setInterval(() => {
      const el = heatContainerRef.current;
      if (!el || isHovered || isWaiting) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 5) return; // All heats fit without scrolling

      if (el.scrollTop >= maxScroll - 2) {
        // Reached bottom: pause 3.5s, then return to top and pause 3.5s before restarting
        isWaiting = true;
        pauseTimeout = setTimeout(() => {
          if (el) {
            el.scrollTo({ top: 0, behavior: 'smooth' });
          }
          pauseTimeout = setTimeout(() => {
            isWaiting = false;
          }, 3500);
        }, 3500);
      } else {
        el.scrollTop += 1;
      }
    }, 45);

    return () => {
      clearInterval(interval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [autoScrollEnabled, isHovered, round2Matches.length]);
  const totalSlots = round2Matches.length * 3;
  const totalHeats = round2Matches.length;
  const completedHeats = round2Matches.filter(m => !!m.winner_id).length;
  const pendingHeats = totalHeats - completedHeats;
  const filledSlots = round2Matches.reduce((acc, m) => {
    let count = 0;
    if (m.user_id_1) count++;
    if (m.user_id_2) count++;
    if (m.user_id_3) count++;
    return acc + count;
  }, 0);

  return (
    <div className="min-h-[calc(100vh-70px)] bg-gradient-to-br from-midnight via-obsidian to-black text-cyberSilver cyber-grid p-4 md:p-6 flex flex-col justify-between select-none">
      {/* 1. Header HUD */}
      <div className="border-b-2 border-neonCyan/40 pb-4 flex flex-wrap items-center justify-between gap-4 bg-obsidian/80 px-6 py-4 clip-cyber">
        {/* Left: Tournament & Event Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-neonCyan/20 border-2 border-neonCyan flex items-center justify-center clip-cyber shadow-glowCyan">
            <span className="font-orbitron font-black text-neonCyan text-2xl">DG</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-orbitron font-black text-white tracking-widest text-glow-cyan">
                {(activeEvent?.nama || activeEvent?.name || 'DGDASH RACING SYSTEM').toUpperCase()}
              </h1>
              <span className="px-3 py-1 text-sm font-orbitron font-black bg-neonPink/20 text-neonPink border border-neonPink clip-cyber shadow-glowPink">
                CIRCUIT TV
              </span>
            </div>
            <div className="text-xs font-mono text-neonCyan tracking-widest uppercase mt-0.5">
              {activeEvent?.track_name ? `TRACK: ${activeEvent.track_name.toUpperCase()} // ` : ''}LIVE TOURNAMENT HUD
            </div>
          </div>
        </div>

        {/* Right: Round 2 Progress & Clock */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col justify-center px-3.5 py-1.5 clip-cyber border bg-black/70 border-neonAmber/60 text-cyberSilver shadow-glowAmber min-w-[190px]">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-neonAmber shrink-0" />
                <span className="font-bold text-white">PESERTA BABAK 2</span>
              </span>
              <span className="font-orbitron font-black text-neonAmber">
                {filledSlots} TERDAFTAR
              </span>
            </div>
            <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden mt-1 flex border border-gray-800">
              <div 
                className="h-full bg-gradient-to-r from-neonAmber to-neonCyan transition-all duration-500"
                style={{ width: `${totalSlots > 0 ? Math.min(100, (filledSlots / totalSlots) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="px-5 py-2 text-sm md:text-base font-orbitron font-black uppercase tracking-wider clip-cyber border-2 bg-neonCyan/20 text-neonCyan border-neonCyan shadow-glowCyan">
            BABAK ELIMINASI & BTO
          </div>
          <div className="px-3.5 py-1.5 bg-black/80 border border-gray-800 clip-cyber text-lg md:text-xl font-orbitron font-bold text-cyberSilver">
            {timeClock}
          </div>
        </div>
      </div>

      {/* Emergency Broadcast Alert */}
      {bannerAlert && (
        <div className={clsx(
          "my-3 p-3.5 border-2 clip-cyber flex items-center justify-center gap-3 text-center transition-all animate-pulse",
          bannerAlert.type === 'error' && "bg-red-950/90 border-red-500 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.8)]",
          bannerAlert.type !== 'error' && "bg-neonCyan/20 border-neonCyan text-neonCyan shadow-glowCyan"
        )}>
          <Zap className="w-6 h-6 shrink-0 animate-bounce" />
          <span className="font-orbitron font-black text-base md:text-xl tracking-wider uppercase">
            {bannerAlert.message}
          </span>
        </div>
      )}

      {/* 2. Main 16:9 Screen Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1">
        {/* Main Left Column (8/12 cols): Round 2 Elimination Bracket / Heat Status */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          <div className="bg-obsidian/90 border-2 border-neonCyan/40 shadow-glowCyan p-5 clip-cyber flex flex-col flex-1">
            <div className="flex items-center justify-between border-b border-neonCyan/30 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-neonCyan" />
                <h2 className="text-xl font-orbitron font-black text-white tracking-wider text-glow-cyan">
                  SKEMA HEAT BABAK 2 (ELIMINASI)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoScrollEnabled(prev => !prev)}
                  className={clsx(
                    "text-[10px] font-mono px-2 py-0.5 clip-cyber border flex items-center gap-1.5 transition-colors cursor-pointer",
                    autoScrollEnabled
                      ? "bg-neonCyan/20 text-neonCyan border-neonCyan/60 shadow-glowCyan"
                      : "bg-black/60 text-gray-400 border-gray-700 hover:text-white"
                  )}
                  title={autoScrollEnabled ? "Klik untuk jeda auto-scroll" : "Klik untuk aktifkan auto-scroll"}
                >
                  {autoScrollEnabled ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-neonCyan animate-ping" />
                      <span>AUTO-SCROLL ON</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 text-gray-400" />
                      <span>AUTO-SCROLL OFF</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] font-mono bg-neonCyan/20 text-neonCyan px-2 py-0.5 clip-cyber">
                  3-LANE BRACKET
                </span>
              </div>
            </div>

            <div
              ref={heatContainerRef}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={() => setIsHovered(true)}
              onTouchEnd={() => setIsHovered(false)}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[500px] pr-1 scroll-smooth"
            >
              {round2Matches.length === 0 ? (
                <div className="col-span-2 text-center py-16 text-sm font-mono text-cyberSilver/40">
                  Belum ada heat Babak 2 yang dibentuk. Menunggu pendaftaran pemenang dari Babak 1.
                </div>
              ) : (
                round2Matches.map((m) => {
                  const isCompleted = !!m.winner_id;
                  return (
                    <div 
                      key={m.id}
                      className={clsx(
                        "p-3.5 border-2 clip-cyber transition-all flex flex-col justify-between",
                        isCompleted ? "bg-black/60 border-gray-800 opacity-80" : "bg-black/80 border-neonCyan/50 shadow-glowCyan"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-orbitron font-bold text-xs text-neonCyan">
                          HEAT #{m.match_number}
                        </span>
                        <span className={clsx(
                          "px-2 py-0.5 text-[9px] font-orbitron font-bold uppercase clip-cyber",
                          isCompleted ? "bg-neonGreen/20 text-neonGreen border border-neonGreen" : "bg-neonAmber/20 text-neonAmber border border-neonAmber"
                        )}>
                          {isCompleted ? 'SELESAI' : 'MENUNGGU START'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-mono">
                        {/* Racer 1 */}
                        <div className={clsx(
                          "p-1.5 clip-cyber flex items-center justify-between",
                          m.winner_id === m.user_id_1 ? "bg-neonGreen/20 text-neonGreen font-bold border border-neonGreen" : "bg-white/5 text-cyberSilver"
                        )}>
                          <span>[A] #{m.participant_number_1 || '-'} {m.user_1_name || 'Empty'}</span>
                          {m.winner_id === m.user_id_1 && <Crown className="w-3.5 h-3.5 text-neonGreen" />}
                        </div>
                        {/* Racer 2 */}
                        <div className={clsx(
                          "p-1.5 clip-cyber flex items-center justify-between",
                          m.winner_id === m.user_id_2 ? "bg-neonGreen/20 text-neonGreen font-bold border border-neonGreen" : "bg-white/5 text-cyberSilver"
                        )}>
                          <span>[B] #{m.participant_number_2 || '-'} {m.user_2_name || 'Empty'}</span>
                          {m.winner_id === m.user_id_2 && <Crown className="w-3.5 h-3.5 text-neonGreen" />}
                        </div>
                        {/* Racer 3 */}
                        <div className={clsx(
                          "p-1.5 clip-cyber flex items-center justify-between",
                          m.winner_id === m.user_id_3 ? "bg-neonGreen/20 text-neonGreen font-bold border border-neonGreen" : "bg-white/5 text-cyberSilver"
                        )}>
                          <span>[C] #{m.participant_number_3 || '-'} {m.user_3_name || 'Empty'}</span>
                          {m.winner_id === m.user_id_3 && <Crown className="w-3.5 h-3.5 text-neonGreen" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Main Right Column (4/12 cols): Top 5 Leaderboard (BTO) */}
        <div className="lg:col-span-4 bg-obsidian/95 border-2 border-neonAmber/60 shadow-glowAmber p-4 md:p-5 clip-cyber flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neonAmber/30 pb-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-neonAmber shrink-0" />
                <h2 className="text-lg md:text-xl font-orbitron font-black text-white tracking-wider text-glow-amber truncate">
                  TOP 5 BEST TIME
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-neonAmber/20 text-neonAmber px-2 py-0.5 clip-cyber shrink-0">
                MANUAL BTO
              </span>
            </div>

            {/* Leaderboard Rows */}
            <div className="space-y-2.5">
              {btoLeaderboard.length === 0 ? (
                <div className="text-center py-10 text-xs font-mono text-cyberSilver/40">
                  Belum ada catatan waktu BTO yang dicatat.
                </div>
              ) : (
                btoLeaderboard.slice(0, 5).map((item, idx) => {
                  const rankColors = [
                    'text-neonAmber border-neonAmber bg-neonAmber/20 shadow-glowAmber', // Gold #1
                    'text-cyberSilver border-cyberSilver bg-white/10', // Silver #2
                    'text-amber-600 border-amber-600 bg-amber-700/20', // Bronze #3
                    'text-neonCyan border-gray-700 bg-black/40', // #4
                    'text-neonPink border-gray-700 bg-black/40', // #5
                  ];

                  return (
                    <div
                      key={item.id || idx}
                      className={clsx(
                        "p-2.5 md:p-3 clip-cyber flex items-center justify-between transition-all gap-2",
                        idx === 0
                          ? "gold-shimmer-border bg-gradient-to-r from-amber-950/40 via-black/80 to-black/90 shadow-[0_0_25px_rgba(255,215,0,0.35)]"
                          : "bg-black/60 border border-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={clsx(
                          "w-8 h-8 md:w-9 md:h-9 shrink-0 flex items-center justify-center font-orbitron font-black text-xs md:text-sm clip-cyber border",
                          idx === 0
                            ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-pulse"
                            : (rankColors[idx] || rankColors[3])
                        )}>
                          {idx === 0 ? <Crown className="w-4 h-4 md:w-5 md:h-5 text-black" /> : `#${idx + 1}`}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={clsx(
                              "font-orbitron font-black text-sm md:text-base truncate",
                              idx === 0 ? "text-yellow-300 text-glow-gold" : "text-white"
                            )}>
                              #{item.participant_number} {item.user_name || item.participant_name || item.name || ''}
                            </div>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 text-[8px] font-orbitron font-black bg-yellow-400 text-black clip-cyber uppercase tracking-wider shrink-0">
                                #1
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-neonPink truncate">
                            [{item.team_name || 'INDIVIDUAL'}]
                          </div>
                        </div>
                      </div>

                      <div className={clsx(
                        "text-xl md:text-2xl font-orbitron font-black shrink-0 pl-1",
                        idx === 0 ? "text-yellow-300 text-glow-gold" : "text-neonGreen text-glow-green"
                      )}>
                        {parseFloat(item.finish_time ?? item.best_time ?? 0).toFixed(3)}s
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] font-mono text-cyberSilver/50 text-center uppercase">
            CATATAN WAKTU BTO TERVERIFIKASI MEJA PANITIA
          </div>
        </div>
      </div>

      {/* 3. Footer Marquee Scrolling Ticker */}
      <div className="bg-black/95 border-t-2 border-neonAmber/50 py-2 px-4 overflow-hidden clip-cyber flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-orbitron font-black bg-neonAmber text-black uppercase clip-cyber whitespace-nowrap shadow-glowAmber">
          <Ticket className="w-3.5 h-3.5 shrink-0" />
          <span>INFO TURNAMEN</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap flex-1 relative">
          <div className="animate-marquee flex items-center">
            <div className="flex items-center shrink-0">
              <div className="inline-flex items-center gap-2 text-neonAmber font-orbitron text-xs md:text-sm tracking-wider uppercase px-4">
                <Sparkles className="w-4 h-4 text-neonAmber animate-spin" />
                <span>
                  {activeEvent?.nama ? activeEvent.nama.toUpperCase() : 'TURNAMEN NEO-TAMIYA'} // TOTAL: {totalHeats} HEAT ({completedHeats} SELESAI • {pendingHeats} MENUNGGU) • PESERTA TERDAFTAR: {participants.length} PEMBALAP • RACER TERSEEDING: {filledSlots}/{totalSlots} SLOT • SISTEM BALAP FISIK TANPA SCAN KUPON
                </span>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <div className="inline-flex items-center gap-2 text-neonAmber font-orbitron text-xs md:text-sm tracking-wider uppercase px-4">
                <Sparkles className="w-4 h-4 text-neonAmber animate-spin" />
                <span>
                  {activeEvent?.nama ? activeEvent.nama.toUpperCase() : 'TURNAMEN NEO-TAMIYA'} // TOTAL: {totalHeats} HEAT ({completedHeats} SELESAI • {pendingHeats} MENUNGGU) • PESERTA TERDAFTAR: {participants.length} PEMBALAP • RACER TERSEEDING: {filledSlots}/{totalSlots} SLOT • SISTEM BALAP FISIK TANPA SCAN KUPON
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Global Modals */}
      <BtoCelebrationModal />
    </div>
  );
}
