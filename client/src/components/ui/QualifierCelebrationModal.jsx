import React, { useEffect, useState } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from './CyberButton.jsx';
import { Ticket, Zap, X, ShieldAlert, Award, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export function QualifierCelebrationModal() {
  const { newQualifierModal, setNewQualifierModal } = useRace();
  const [progress, setProgress] = useState(100);

  const ticket = newQualifierModal?.ticket;

  // Auto-dismiss countdown timer (7 seconds)
  useEffect(() => {
    if (!newQualifierModal) return;

    setProgress(100);
    const duration = 7000;
    const intervalMs = 50;
    const step = (intervalMs / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= step) {
          clearInterval(timer);
          setNewQualifierModal(null);
          return 0;
        }
        return prev - step;
      });
    }, intervalMs);

    // Keyboard ESC listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNewQualifierModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [newQualifierModal, setNewQualifierModal]);

  if (!newQualifierModal || !ticket) return null;

  const ticketNum = ticket.ticket_number || 1;
  const ticketCode = ticket.ticket_code || `TKT-B2-${String(ticketNum).padStart(3, '0')}`;
  const racerLabel = ticket.racer_label || ticket.user_name || 'Pembalap';
  const teamName = ticket.team_name || 'INDIVIDUAL';
  const lane = ticket.lane || 'A';
  const matchNum = ticket.bracket_match_number;

  const laneColors = {
    A: { bg: 'bg-neonPink/20', text: 'text-neonPink', border: 'border-neonPink', label: 'JALUR A' },
    B: { bg: 'bg-neonCyan/20', text: 'text-neonCyan', border: 'border-neonCyan', label: 'JALUR B' },
    C: { bg: 'bg-neonGreen/20', text: 'text-neonGreen', border: 'border-neonGreen', label: 'JALUR C' },
  };
  const activeLaneColor = laneColors[lane] || laneColors.A;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
        onClick={() => setNewQualifierModal(null)}
      >
        <motion.div
          initial={{ scale: 0.75, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.75, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="relative max-w-xl w-full p-6 md:p-8 text-center bg-obsidian/95 border-2 border-neonAmber shadow-[0_0_50px_rgba(255,170,0,0.6)] clip-cyber-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Close Button */}
          <button
            onClick={() => setNewQualifierModal(null)}
            className="absolute top-4 right-4 text-cyberSilver/60 hover:text-neonAmber transition-colors"
            title="Tutup (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Top Flashing Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-orbitron font-black tracking-widest uppercase mb-3 bg-neonAmber/20 text-neonAmber border border-neonAmber clip-cyber animate-pulse shadow-glowAmber">
            <Sparkles className="w-4 h-4 text-neonAmber animate-spin" />
            <span>NEW QUALIFIER! TIKET BABAK 2 DIAMANKAN!</span>
          </div>

          {/* Holographic Big Ticket Number Badge */}
          <div className="relative mx-auto my-3 w-28 h-28 flex items-center justify-center">
            {/* Glow outer ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-neonAmber/40 via-yellow-400/20 to-neonCyan/40 animate-pulse-fast blur-md" />
            
            <div className="relative w-24 h-24 rounded-2xl bg-black/90 border-2 border-neonAmber flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,170,0,0.8)] clip-cyber">
              <span className="text-[10px] font-mono text-neonAmber tracking-widest uppercase -mt-1">
                TIKET NO.
              </span>
              <span className="text-4xl md:text-5xl font-orbitron font-black text-yellow-300 text-glow-gold leading-none">
                #{ticketNum}
              </span>
            </div>
          </div>

          {/* Racer Identity & Tag */}
          <div className="my-3">
            <h2 className="text-3xl md:text-4xl font-orbitron font-black text-white tracking-wide text-glow-cyan">
              {racerLabel}
            </h2>
            <div className="text-sm font-mono text-neonPink tracking-widest uppercase mt-1">
              [{teamName}]
            </div>
          </div>

          {/* Ticket Specs Grid */}
          <div className="my-4 grid grid-cols-2 gap-3 p-3 bg-black/70 border border-neonAmber/30 clip-cyber">
            <div className="text-left">
              <div className="text-[10px] font-mono text-cyberSilver/60 uppercase">KODE TIKET RESMI</div>
              <div className="text-lg font-orbitron font-bold text-neonAmber flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-neonAmber shrink-0" />
                <span>{ticketCode}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono text-cyberSilver/60 uppercase">JALUR KEMENANGAN</div>
              <div className="flex items-center justify-end gap-1.5">
                <span className={clsx(
                  "px-2.5 py-0.5 text-xs font-orbitron font-black clip-cyber border",
                  activeLaneColor.bg,
                  activeLaneColor.text,
                  activeLaneColor.border
                )}>
                  {activeLaneColor.label}
                </span>
              </div>
            </div>

            {matchNum && (
              <div className="col-span-2 pt-2 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
                <span className="text-cyberSilver/70">PENEMPATAN BAGAN ROUND 2:</span>
                <span className="font-orbitron font-bold text-neonCyan">MATCH #{matchNum}</span>
              </div>
            )}
          </div>

          {/* Auto-Dismiss Progress Bar Timer */}
          <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden my-4 border border-gray-800">
            <div 
              className="bg-gradient-to-r from-neonAmber via-yellow-400 to-neonCyan h-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dismiss Action Button */}
          <CyberButton
            variant="amber"
            size="md"
            className="w-full font-orbitron font-black tracking-wider"
            onClick={() => setNewQualifierModal(null)}
          >
            TUTUP SEKARANG [ESC]
          </CyberButton>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
