import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { Trophy, Zap, Clock, ShieldCheck, Flag, Radio, Crown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export function RealtimeTV() {
  const { raceState, bannerAlert, countdown } = useRace();
  const [timeClock, setTimeClock] = useState('');

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

  const activeRace = raceState.activeRace;
  const activeRaceNum = activeRace?.race_number || 1;
  const raceStatus = activeRace?.status || 'draft';
  const registrations = activeRace?.registrations || [];

  const laneA = registrations.find(r => r.lane === 'A');
  const laneB = registrations.find(r => r.lane === 'B');
  const laneC = registrations.find(r => r.lane === 'C');

  const btoLeaderboard = raceState.btoLeaderboard || [];
  const upcomingRaces = raceState.upcomingRaces || [];

  // Determine Dynamic Header Status
  let statusText = "MENUNGGU ANTRIAN";
  let statusStyle = "bg-neonAmber/20 text-neonAmber border-neonAmber";

  if (raceStatus === 'pre-start') {
    statusText = "READY - LINTASAN SIAP!";
    statusStyle = "bg-neonGreen/20 text-neonGreen border-neonGreen animate-pulse shadow-glowGreen";
  } else if (raceStatus === 'locked') {
    statusText = "BALAPAN BERLANGSUNG";
    statusStyle = "bg-red-500/20 text-red-500 border-red-500 animate-pulse-fast shadow-[0_0_20px_rgba(239,68,68,0.7)]";
  } else if (raceStatus === 'completed') {
    const isAllCO = !activeRace?.winner_id && registrations.some(r => r.status === 'dnf_co');
    if (isAllCO) {
      statusText = "SEMUA CO / DNF (NO WINNER)";
      statusStyle = "bg-red-950/80 text-red-400 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)]";
    } else {
      statusText = "VERIFIKASI MEJA SCRUTINEER";
      statusStyle = "bg-neonCyan/20 text-neonCyan border-neonCyan shadow-glowCyan";
    }
  }

  // Construct Marquee text for upcoming heats
  let marqueeText = "Turnamen DGDash Racing System • ";
  if (upcomingRaces.length > 0) {
    const parts = upcomingRaces.map(r => {
      const racerNames = r.racers?.map(rac => `${rac.user_name} (${rac.lane})`).join(', ') || 'Belum Terisi';
      return `Antrean Race ${r.race_number}: [${racerNames}]`;
    });
    marqueeText += parts.join(' ••• ');
  } else {
    marqueeText += "Scan QR Code di meja pit start untuk mendaftar ke antrean Race berikutnya!";
  }

  return (
    <div className="min-h-[calc(100vh-70px)] bg-gradient-to-br from-midnight via-obsidian to-black text-cyberSilver cyber-grid p-4 md:p-6 flex flex-col justify-between select-none">
      {/* 1. Header HUD */}
      <div className="border-b-2 border-neonCyan/40 pb-4 flex flex-wrap items-center justify-between gap-4 bg-obsidian/80 px-6 py-4 clip-cyber">
        {/* Left: Tournament & Heat Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-neonCyan/20 border-2 border-neonCyan flex items-center justify-center clip-cyber shadow-glowCyan">
            <span className="font-orbitron font-black text-neonCyan text-2xl">DG</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-orbitron font-black text-white tracking-widest text-glow-cyan">
                DGDASH RACING SYSTEM
              </h1>
              <span className="px-3 py-1 text-sm font-orbitron font-black bg-neonPink/20 text-neonPink border border-neonPink clip-cyber shadow-glowPink">
                HEAT #{activeRaceNum}
              </span>
            </div>
            <div className="text-xs font-mono text-neonCyan tracking-widest uppercase mt-0.5">
              CIRCUIT BROADCAST HUD // PAPERLESS TOURNAMENT ENGINE
            </div>
          </div>
        </div>

        {/* Right: Dynamic Status Bar & Digital Clock */}
        <div className="flex items-center gap-4">
          <div className={clsx(
            "px-6 py-2.5 text-base md:text-lg font-orbitron font-black uppercase tracking-wider clip-cyber border-2",
            statusStyle
          )}>
            {statusText}
          </div>
          <div className="px-4 py-2 bg-black/80 border border-gray-800 clip-cyber text-xl font-orbitron font-bold text-cyberSilver">
            {timeClock}
          </div>
        </div>
      </div>

      {/* Emergency Broadcast Alert (Re-Race / All CO / Record) */}
      {bannerAlert && (
        <div className={clsx(
          "my-3 p-3.5 border-2 clip-cyber flex items-center justify-center gap-3 text-center transition-all animate-pulse",
          bannerAlert.type === 'rerace' && "bg-neonAmber/20 border-neonAmber text-neonAmber shadow-glowAmber",
          bannerAlert.type === 'error' && "bg-red-950/90 border-red-500 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.8)]",
          bannerAlert.type !== 'rerace' && bannerAlert.type !== 'error' && "bg-neonCyan/20 border-neonCyan text-neonCyan shadow-glowCyan"
        )}>
          <Zap className="w-6 h-6 shrink-0 animate-bounce" />
          <span className="font-orbitron font-black text-base md:text-xl tracking-wider uppercase">
            {bannerAlert.message}
          </span>
        </div>
      )}

      {/* 2. Main 16:9 Screen Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1">
        {/* Main Left Column (60% width = 7/12 cols): Lines A, B, C Giant Status Cards */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          {/* Lane A (Neon Pink) */}
          <div className="flex-1 bg-obsidian/90 border-2 border-neonPink shadow-glowPink p-5 clip-cyber flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-neonPink/20 border-2 border-neonPink flex items-center justify-center clip-cyber">
                <span className="font-orbitron font-black text-neonPink text-3xl">A</span>
              </div>
              <div>
                <div className="text-xs font-orbitron text-neonPink tracking-widest">JALUR 1 (LANE A)</div>
                <div className="text-2xl md:text-3xl font-orbitron font-black text-white">
                  {laneA ? laneA.user_name : '(MENUNGGU SCAN)'}
                </div>
                {laneA?.team_name && (
                  <div className="text-xs font-mono text-neonPink tracking-widest mt-0.5">
                    [{laneA.team_name}]
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              {laneA?.finish_time ? (
                <div>
                  <div className="text-[10px] font-mono text-cyberSilver/60">TIME</div>
                  <div className="text-3xl md:text-4xl font-orbitron font-black text-neonPink animate-pulse text-glow-pink">
                    {parseFloat(laneA.finish_time).toFixed(3)}s
                  </div>
                </div>
              ) : (
                <span className={clsx(
                  "px-4 py-1.5 text-xs md:text-sm font-orbitron font-black uppercase clip-cyber",
                  !laneA && "bg-gray-800/80 text-gray-500",
                  laneA && laneA.status === 'dnf_co' && "bg-red-950/80 text-red-400 border border-red-500",
                  laneA && laneA.status !== 'ready' && laneA.status !== 'dnf_co' && "bg-neonAmber/20 text-neonAmber border border-neonAmber",
                  laneA && laneA.status === 'ready' && "bg-neonGreen/20 text-neonGreen border border-neonGreen animate-pulse shadow-glowGreen"
                )}>
                  {!laneA ? 'EMPTY' : laneA.status === 'dnf_co' ? 'DNF / CO' : laneA.status === 'ready' ? 'READY' : 'PENDING'}
                </span>
              )}
            </div>
          </div>

          {/* Lane B (Neon Cyan) */}
          <div className="flex-1 bg-obsidian/90 border-2 border-neonCyan shadow-glowCyan p-5 clip-cyber flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-neonCyan/20 border-2 border-neonCyan flex items-center justify-center clip-cyber">
                <span className="font-orbitron font-black text-neonCyan text-3xl">B</span>
              </div>
              <div>
                <div className="text-xs font-orbitron text-neonCyan tracking-widest">JALUR 2 (LANE B)</div>
                <div className="text-2xl md:text-3xl font-orbitron font-black text-white">
                  {laneB ? laneB.user_name : '(MENUNGGU SCAN)'}
                </div>
                {laneB?.team_name && (
                  <div className="text-xs font-mono text-neonCyan tracking-widest mt-0.5">
                    [{laneB.team_name}]
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              {laneB?.finish_time ? (
                <div>
                  <div className="text-[10px] font-mono text-cyberSilver/60">TIME</div>
                  <div className="text-3xl md:text-4xl font-orbitron font-black text-neonCyan animate-pulse text-glow-cyan">
                    {parseFloat(laneB.finish_time).toFixed(3)}s
                  </div>
                </div>
              ) : (
                <span className={clsx(
                  "px-4 py-1.5 text-xs md:text-sm font-orbitron font-black uppercase clip-cyber",
                  !laneB && "bg-gray-800/80 text-gray-500",
                  laneB && laneB.status === 'dnf_co' && "bg-red-950/80 text-red-400 border border-red-500",
                  laneB && laneB.status !== 'ready' && laneB.status !== 'dnf_co' && "bg-neonAmber/20 text-neonAmber border border-neonAmber",
                  laneB && laneB.status === 'ready' && "bg-neonGreen/20 text-neonGreen border border-neonGreen animate-pulse shadow-glowGreen"
                )}>
                  {!laneB ? 'EMPTY' : laneB.status === 'dnf_co' ? 'DNF / CO' : laneB.status === 'ready' ? 'READY' : 'PENDING'}
                </span>
              )}
            </div>
          </div>

          {/* Lane C (Neon Green) */}
          <div className="flex-1 bg-obsidian/90 border-2 border-neonGreen shadow-glowGreen p-5 clip-cyber flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-neonGreen/20 border-2 border-neonGreen flex items-center justify-center clip-cyber">
                <span className="font-orbitron font-black text-neonGreen text-3xl">C</span>
              </div>
              <div>
                <div className="text-xs font-orbitron text-neonGreen tracking-widest">JALUR 3 (LANE C)</div>
                <div className="text-2xl md:text-3xl font-orbitron font-black text-white">
                  {laneC ? laneC.user_name : '(MENUNGGU SCAN)'}
                </div>
                {laneC?.team_name && (
                  <div className="text-xs font-mono text-neonGreen tracking-widest mt-0.5">
                    [{laneC.team_name}]
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              {laneC?.finish_time ? (
                <div>
                  <div className="text-[10px] font-mono text-cyberSilver/60">TIME</div>
                  <div className="text-3xl md:text-4xl font-orbitron font-black text-neonGreen animate-pulse text-glow-green">
                    {parseFloat(laneC.finish_time).toFixed(3)}s
                  </div>
                </div>
              ) : (
                <span className={clsx(
                  "px-4 py-1.5 text-xs md:text-sm font-orbitron font-black uppercase clip-cyber",
                  !laneC && "bg-gray-800/80 text-gray-500",
                  laneC && laneC.status === 'dnf_co' && "bg-red-950/80 text-red-400 border border-red-500",
                  laneC && laneC.status !== 'ready' && laneC.status !== 'dnf_co' && "bg-neonAmber/20 text-neonAmber border border-neonAmber",
                  laneC && laneC.status === 'ready' && "bg-neonGreen/20 text-neonGreen border border-neonGreen animate-pulse shadow-glowGreen"
                )}>
                  {!laneC ? 'EMPTY' : laneC.status === 'dnf_co' ? 'DNF / CO' : laneC.status === 'ready' ? 'READY' : 'PENDING'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Right Column (40% width = 5/12 cols): Top 5 Leaderboard (BTO) */}
        <div className="lg:col-span-5 bg-obsidian/95 border-2 border-neonAmber/60 shadow-glowAmber p-5 clip-cyber flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neonAmber/30 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-neonAmber" />
                <h2 className="text-xl font-orbitron font-black text-white tracking-wider text-glow-amber">
                  TOP 5 BEST TIME OVERALL
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-neonAmber/20 text-neonAmber px-2 py-0.5 clip-cyber">
                VERIFIED BTO
              </span>
            </div>

            {/* Leaderboard Rows */}
            <div className="space-y-2.5">
              {btoLeaderboard.length === 0 ? (
                <div className="text-center py-10 text-xs font-mono text-cyberSilver/40">
                  Belum ada catatan waktu yang lolos Scrutineer.
                </div>
              ) : (
                btoLeaderboard.map((item, idx) => {
                  const rankColors = [
                    'text-neonAmber border-neonAmber bg-neonAmber/20 shadow-glowAmber', // Gold #1
                    'text-cyberSilver border-cyberSilver bg-white/10', // Silver #2
                    'text-amber-600 border-amber-600 bg-amber-700/20', // Bronze #3
                    'text-neonCyan border-gray-700 bg-black/40', // #4
                    'text-neonPink border-gray-700 bg-black/40', // #5
                  ];

                  return (
                    <div
                      key={item.id}
                      className={clsx(
                        "p-3 clip-cyber flex items-center justify-between transition-all",
                        idx === 0
                          ? "gold-shimmer-border bg-gradient-to-r from-amber-950/40 via-black/80 to-black/90 shadow-[0_0_25px_rgba(255,215,0,0.35)]"
                          : "bg-black/60 border border-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-9 h-9 flex items-center justify-center font-orbitron font-black text-sm clip-cyber border",
                          idx === 0
                            ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-pulse"
                            : (rankColors[idx] || rankColors[3])
                        )}>
                          {idx === 0 ? <Crown className="w-5 h-5 text-black" /> : `#${idx + 1}`}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={clsx(
                              "font-orbitron font-black text-base",
                              idx === 0 ? "text-yellow-300 text-glow-gold" : "text-white"
                            )}>
                              {item.user_name}
                            </div>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 text-[9px] font-orbitron font-black bg-yellow-400 text-black clip-cyber uppercase tracking-wider">
                                RECORD BTO #1
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-neonPink">
                            [{item.team_name || 'NO TAG'}] • Race #{item.race_number}
                          </div>
                        </div>
                      </div>

                      <div className={clsx(
                        "text-2xl font-orbitron font-black",
                        idx === 0 ? "text-yellow-300 text-glow-gold" : "text-neonGreen text-glow-green"
                      )}>
                        {parseFloat(item.finish_time).toFixed(3)}s
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] font-mono text-cyberSilver/50 text-center uppercase">
            HANYA CATATAN WAKTU YANG DINYATAKAN LOLOS UJI FISIK MEJA SCRUTINEER
          </div>
        </div>
      </div>

      {/* 3. Footer Marquee Scrolling Ticker (Teks Berjalan) */}
      <div className="bg-black/90 border-t-2 border-neonCyan/50 py-2.5 px-4 overflow-hidden clip-cyber flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-orbitron font-black bg-neonCyan text-black uppercase clip-cyber whitespace-nowrap">
          QUEUE LIVE
        </span>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="inline-block animate-marquee text-xs md:text-sm font-mono text-neonCyan tracking-wider">
            {marqueeText}
          </div>
        </div>
      </div>

      {/* 4. Fullscreen Dynamic Countdown HUD Overlay (UI-03) */}
      {countdown?.active && (
        <div 
          className={clsx(
            "fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-12 select-none overflow-hidden transition-all duration-300 backdrop-blur-xl border-4",
            countdown.status === 'complete' && "countdown-radial-bg-complete border-neonGreen shadow-[inset_0_0_100px_rgba(57,255,20,0.5)]",
            countdown.status === 'stopped' && "countdown-radial-bg-stopped border-neonCyan shadow-[inset_0_0_80px_rgba(0,240,255,0.4)]",
            countdown.status !== 'complete' && countdown.status !== 'stopped' && "countdown-radial-bg-running border-neonPink shadow-[inset_0_0_120px_rgba(255,0,85,0.5)]"
          )}
        >
          {/* Scanline texture */}
          <div className="absolute inset-0 pointer-events-none countdown-scanlines opacity-40" />

          {/* Top Decorative Header */}
          <div className="relative z-10 flex items-center justify-between border-b-2 border-white/20 pb-4 bg-black/40 px-6 py-3 clip-cyber">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-500 clip-cyber">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-orbitron font-black text-red-400 tracking-wider">
                  LIVE LAUNCH CONTROL
                </span>
              </div>
              <span className="text-sm font-mono text-cyberSilver tracking-widest uppercase hidden sm:inline">
                BABAK 2 ELIMINASI // HEAT #{activeRaceNum}
              </span>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono text-neonCyan tracking-widest uppercase">
                CIRCUIT STATUS // COUNTDOWN HUD
              </div>
              <div className="text-sm font-orbitron font-bold text-white tracking-widest">
                TIME: {timeClock}
              </div>
            </div>
          </div>

          {/* Center Stage: Giant Countdown Visual */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-4">
            {countdown.status === 'running' && (
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* 10-Segment Progress Ring / Bar Indicator */}
                <div className="flex items-center gap-2 mb-2">
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((seg) => {
                    const isPassed = seg <= countdown.seconds;
                    return (
                      <div
                        key={seg}
                        className={clsx(
                          "w-4 md:w-6 h-2 md:h-3 clip-cyber transition-all duration-300",
                          isPassed
                            ? "bg-neonPink shadow-[0_0_10px_rgba(255,0,85,0.8)]"
                            : "bg-gray-800/80 border border-gray-700/50"
                        )}
                      />
                    );
                  })}
                </div>

                {/* Giant Numeral */}
                <div className="relative flex items-center justify-center">
                  <span className="text-9xl sm:text-[13rem] md:text-[17rem] lg:text-[21rem] font-orbitron font-black text-white text-glow-countdown countdown-number-pulse tracking-tighter leading-none select-none">
                    {countdown.seconds}
                  </span>
                </div>

                {/* Spelled Indonesian Word */}
                <div className="px-8 py-2 bg-black/60 border-2 border-neonAmber/80 clip-cyber shadow-glowAmber">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-orbitron font-black text-neonAmber tracking-[0.25em] uppercase text-glow-amber">
                    {countdown.word || `DETIK ${countdown.seconds}`}
                  </span>
                </div>

                {/* Instructions */}
                <p className="text-xs sm:text-sm md:text-base font-mono text-cyberSilver/90 tracking-widest uppercase mt-3">
                  PERSIAPAN AKHIR BOX START • MARSHAL & PEMBALAP POSISIKAN MOBIL
                </p>
              </div>
            )}

            {countdown.status === 'complete' && (
              <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
                <div className="flex items-center justify-center gap-4 text-neonGreen">
                  <Flag className="w-16 h-16 md:w-24 md:h-24 animate-bounce" />
                  <Zap className="w-16 h-16 md:w-24 md:h-24 animate-ping" />
                  <Flag className="w-16 h-16 md:w-24 md:h-24 animate-bounce" />
                </div>

                <h2 className="text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] font-orbitron font-black text-neonGreen text-glow-go tracking-tight leading-none">
                  {countdown.message || "GO! LEPAS MOBIL!"}
                </h2>

                <div className="px-10 py-4 bg-neonGreen/20 border-2 border-neonGreen clip-cyber shadow-[0_0_50px_rgba(57,255,20,0.8)]">
                  <span className="text-xl sm:text-3xl md:text-4xl font-orbitron font-black text-white tracking-widest uppercase">
                    MARSHAL: LEPAS KETIGA MOBIL SEKARANG!
                  </span>
                </div>

                <div className="text-sm md:text-base font-mono text-neonGreen/90 tracking-widest uppercase">
                  STATUS: GREEN FLAG CONFIRMED // RACE TIME RUNNING
                </div>
              </div>
            )}

            {countdown.status === 'stopped' && (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="flex items-center justify-center gap-3 text-neonCyan">
                  <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 animate-pulse" />
                </div>

                <h2 className="text-6xl sm:text-8xl md:text-9xl font-orbitron font-black text-neonCyan text-glow-cyan tracking-tight leading-none">
                  {countdown.message || "READY - SIAP LEPAS!"}
                </h2>

                <div className="px-8 py-3 bg-neonCyan/20 border-2 border-neonCyan clip-cyber shadow-glowCyan">
                  <span className="text-lg sm:text-2xl md:text-3xl font-orbitron font-black text-white tracking-widest uppercase">
                    INTERUPSI RACE DIRECTOR: KETIGA PEMBALAP TELAH SIAP
                  </span>
                </div>

                <div className="text-sm font-mono text-neonCyan/80 tracking-widest uppercase">
                  MARSHAL SEGERA LEPAS MOBIL PADA ABA-ABA MANUAL
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid: 3 Track Lanes Lineup at the Start Box */}
          <div className="relative z-10 border-t-2 border-white/20 pt-4 bg-black/50 px-6 py-4 clip-cyber">
            <div className="text-[11px] font-mono text-cyberSilver/70 uppercase tracking-widest mb-2 text-center">
              KENDARAAN PADA BOX START SIRKUIT:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lane A */}
              <div className="p-3 bg-neonPink/10 border-2 border-neonPink/70 clip-cyber flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-orbitron font-black bg-neonPink text-black clip-cyber">
                    JALUR A
                  </span>
                  <div>
                    <div className="font-orbitron font-bold text-white text-sm">
                      {laneA?.user_name || 'BELUM TERISI'}
                    </div>
                    <div className="text-[10px] font-mono text-neonPink">
                      [{laneA?.team_name || 'NO TAG'}]
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono text-cyberSilver">
                  {laneA?.status ? laneA.status.toUpperCase() : 'GRID #1'}
                </div>
              </div>

              {/* Lane B */}
              <div className="p-3 bg-neonCyan/10 border-2 border-neonCyan/70 clip-cyber flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-orbitron font-black bg-neonCyan text-black clip-cyber">
                    JALUR B
                  </span>
                  <div>
                    <div className="font-orbitron font-bold text-white text-sm">
                      {laneB?.user_name || 'BELUM TERISI'}
                    </div>
                    <div className="text-[10px] font-mono text-neonCyan">
                      [{laneB?.team_name || 'NO TAG'}]
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono text-cyberSilver">
                  {laneB?.status ? laneB.status.toUpperCase() : 'GRID #2'}
                </div>
              </div>

              {/* Lane C */}
              <div className="p-3 bg-neonGreen/10 border-2 border-neonGreen/70 clip-cyber flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-orbitron font-black bg-neonGreen text-black clip-cyber">
                    JALUR C
                  </span>
                  <div>
                    <div className="font-orbitron font-bold text-white text-sm">
                      {laneC?.user_name || 'BELUM TERISI'}
                    </div>
                    <div className="text-[10px] font-mono text-neonGreen">
                      [{laneC?.team_name || 'NO TAG'}]
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono text-cyberSilver">
                  {laneC?.status ? laneC.status.toUpperCase() : 'GRID #3'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
