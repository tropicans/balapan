import React from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from './CyberButton.jsx';
import { Trophy, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BtoCelebrationModal() {
  const { newBtoModal, setNewBtoModal } = useRace();

  if (!newBtoModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.7, opacity: 0 }}
          className="relative max-w-xl w-full p-8 md:p-10 text-center bg-obsidian border-2 border-neonAmber shadow-glowAmber clip-cyber-lg overflow-hidden"
        >
          <button
            onClick={() => setNewBtoModal(null)}
            className="absolute top-4 right-4 text-cyberSilver/60 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Golden Trophy Icon */}
          <div className="mx-auto w-20 h-20 mb-4 rounded-full bg-neonAmber/20 flex items-center justify-center border-2 border-neonAmber shadow-glowAmber animate-bounce">
            <Trophy className="w-10 h-10 text-neonAmber" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1 text-xs font-orbitron font-bold tracking-widest uppercase mb-3 bg-neonAmber/20 text-neonAmber border border-neonAmber">
            <Zap className="w-4 h-4 animate-spin" />
            REKOR HARIAN BARU // BEST TIME OVERALL
          </div>

          <h2 className="text-4xl md:text-5xl font-black font-orbitron text-white tracking-wider my-2 text-glow-amber">
            NEW RECORD BTO!
          </h2>

          <div className="my-6 p-4 bg-black/60 border border-neonAmber/40 clip-cyber">
            <div className="text-2xl md:text-3xl font-orbitron font-bold text-neonCyan text-glow-cyan">
              {newBtoModal.userName}
            </div>
            {newBtoModal.teamName && (
              <div className="text-sm font-mono text-neonPink tracking-widest mt-1">
                [{newBtoModal.teamName}]
              </div>
            )}
            <div className="text-5xl md:text-6xl font-black font-orbitron text-neonGreen tracking-tight mt-4 text-glow-green">
              {parseFloat(newBtoModal.time).toFixed(3)}s
            </div>
          </div>

          <p className="text-xs text-cyberSilver/70 font-mono mb-6">
            Pemeriksaan Scrutineer LOLOS. Rekor otomatis dicatat ke TV HUD Board & Tiket Babak 2 Diamankan!
          </p>

          <CyberButton
            variant="amber"
            size="lg"
            className="w-full"
            onClick={() => setNewBtoModal(null)}
          >
            LANJUTKAN TURNAMEN
          </CyberButton>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
