import React from 'react';
import clsx from 'clsx';
import { playActionClick } from '../../utils/audioChime.js';

export function LaneSelector({ selectedLane, onSelectLane, showError }) {
  const lanes = [
    {
      id: 'A',
      name: 'Jalur A (Pink)',
      label: 'JALUR A',
      sublabel: 'PINK NEON',
      activeColor: 'bg-[#ff007f] text-white shadow-[0_0_25px_rgba(255,0,127,0.7)] border-[#ff007f]',
      inactiveColor: 'bg-[#ff007f]/10 text-[#ff007f] border-[#ff007f]/40 hover:bg-[#ff007f]/20 hover:border-[#ff007f]',
      glowBorder: 'border-[#ff007f]'
    },
    {
      id: 'B',
      name: 'Jalur B (Cyan)',
      label: 'JALUR B',
      sublabel: 'CYAN NEON',
      activeColor: 'bg-[#00f0ff] text-black shadow-[0_0_25px_rgba(0,240,255,0.7)] border-[#00f0ff]',
      inactiveColor: 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/40 hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]',
      glowBorder: 'border-[#00f0ff]'
    },
    {
      id: 'C',
      name: 'Jalur C (Green)',
      label: 'JALUR C',
      sublabel: 'GREEN NEON',
      activeColor: 'bg-[#00ff66] text-black shadow-[0_0_25px_rgba(0,255,102,0.7)] border-[#00ff66]',
      inactiveColor: 'bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/40 hover:bg-[#00ff66]/20 hover:border-[#00ff66]',
      glowBorder: 'border-[#00ff66]'
    }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-cyberSilver/80">
          Pilih Jalur Pemenang Heat
        </label>
        {showError && !selectedLane && (
          <span className="text-xs font-orbitron font-bold text-[#ff0055] animate-pulse">
            ⚠️ PILIH JALUR TERLEBIH DAHULU
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {lanes.map((lane) => {
          const isSelected = selectedLane === lane.id;
          return (
            <button
              key={lane.id}
              type="button"
              aria-label={`Pilih ${lane.name}`}
              onClick={() => {
                playActionClick();
                onSelectLane(lane.id);
              }}
              className={clsx(
                "min-h-[76px] sm:min-h-[84px] p-3 rounded flex flex-col items-center justify-center transition-all duration-150 relative overflow-hidden select-none active:scale-[0.98] border-2",
                isSelected ? lane.activeColor : lane.inactiveColor,
                showError && !selectedLane && "animate-pulse border-red-500/80 bg-red-500/10"
              )}
            >
              {/* Corner tech notch */}
              <div className="absolute top-0 right-0 w-3 h-3 bg-white/20 clip-cyber transform rotate-45 pointer-events-none" />

              <span className="text-xl sm:text-2xl font-orbitron font-black tracking-wider leading-none">
                {lane.label}
              </span>
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest opacity-85 mt-1">
                {lane.sublabel}
              </span>

              {isSelected && (
                <div className="absolute bottom-1 w-8 h-1 bg-current rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
