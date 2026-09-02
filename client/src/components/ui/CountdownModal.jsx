import React from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export function CountdownModal() {
  const { countdown } = useRace();

  if (!countdown.active) return null;

  const isStopped = countdown.status === 'stopped';
  const isComplete = countdown.status === 'complete';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        {/* Glowing background pulse */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          isStopped || isComplete ? 'bg-neonGreen/10 animate-pulse' : 'bg-red-600/15 animate-pulse-fast'
        }`} />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={`relative max-w-2xl w-full p-8 md:p-12 text-center clip-cyber-lg border-2 shadow-2xl ${
            isStopped || isComplete
              ? 'bg-obsidian border-neonGreen shadow-glowGreen text-neonGreen'
              : 'bg-obsidian border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)] text-red-500'
          }`}
        >
          {/* Header Badge */}
          <div className="inline-block px-4 py-1 text-xs md:text-sm font-orbitron font-bold tracking-widest uppercase mb-4 border border-current bg-black/60">
            {isStopped || isComplete ? 'MARSHALL LEPAS MOBIL' : 'BABAK KEDUA // COUNTDOWN ELIMINASI'}
          </div>

          {/* Number / Status Display */}
          {!isStopped && !isComplete ? (
            <div>
              <div className="text-8xl md:text-9xl font-black font-orbitron tracking-tighter my-2 animate-bounce">
                {countdown.seconds}
              </div>
              <div className="text-3xl md:text-4xl font-orbitron font-extrabold uppercase tracking-widest text-cyberSilver mt-2 text-glow-pink">
                "{countdown.word.toUpperCase()}"
              </div>
              <p className="text-sm text-cyberSilver/60 mt-4 font-mono">
                Pembalap siap di garis start...
              </p>
            </div>
          ) : (
            <div>
              <div className="text-5xl md:text-7xl font-black font-orbitron tracking-tight my-4 text-glow-green animate-pulse">
                {countdown.message || 'RACE READY - LEPAS!'}
              </div>
              <p className="text-lg md:text-xl font-orbitron text-cyberSilver mt-2">
                MARSHALL TAP TIMER & RELEASE!
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
