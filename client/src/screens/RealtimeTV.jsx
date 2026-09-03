import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { Trophy, Zap, Clock, ShieldCheck, Flag, Radio } from 'lucide-react';
import clsx from 'clsx';

export function RealtimeTV() {
  const { raceState, bannerAlert } = useRace();
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
  let marqueeText = "Turnamen Mini 4WD Tamiya Digital • ";
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
            <span className="font-orbitron font-black text-neonCyan text-2xl">4D</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-orbitron font-black text-white tracking-widest text-glow-cyan">
                TAMIYA DIGITAL RACING SYSTEM
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
                      className="p-3 bg-black/60 border border-gray-800 clip-cyber flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-8 h-8 flex items-center justify-center font-orbitron font-black text-sm clip-cyber border",
                          rankColors[idx] || rankColors[3]
                        )}>
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-orbitron font-bold text-white text-base">
                            {item.user_name}
                          </div>
                          <div className="text-xs font-mono text-neonPink">
                            [{item.team_name || 'NO TAG'}] • Race #{item.race_number}
                          </div>
                        </div>
                      </div>

                      <div className="text-2xl font-orbitron font-black text-neonGreen text-glow-green">
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
    </div>
  );
}
