import React from 'react';
import { Delete, RotateCcw, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { playActionClick } from '../../utils/audioChime.js';

export function OnScreenNumpad({
  serialNumber,
  setSerialNumber,
  onSubmit,
  disabled,
  loading,
  errorBanner,
  selectedLane
}) {
  const handleDigit = (digit) => {
    if (disabled || loading) return;
    if (serialNumber.length >= 12) return;
    playActionClick();
    setSerialNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    if (disabled || loading) return;
    playActionClick();
    setSerialNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled || loading) return;
    playActionClick();
    setSerialNumber('');
  };

  const keys = [
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: 'C', action: handleClear, special: 'clear', icon: RotateCcw },
    { label: '0', action: () => handleDigit('0') },
    { label: '⌫', action: handleBackspace, special: 'backspace', icon: Delete },
  ];

  const hasContent = serialNumber.length > 0;
  const canSubmit = hasContent && selectedLane && !loading;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Serial Number Display HUD */}
      <div className="w-full mb-3">
        <div className="flex items-center justify-between text-xs font-orbitron font-bold text-cyberSilver/70 mb-1 px-1">
          <span>NOMOR SERI KUPON FISIK</span>
          <span className="font-mono text-[11px] text-neonCyan">MAX 12 DIGIT</span>
        </div>

        <div className={clsx(
          "w-full h-16 sm:h-20 bg-midnight/90 border-2 rounded flex items-center justify-between px-4 sm:px-6 transition-all duration-200 relative overflow-hidden",
          hasContent ? "border-neonAmber shadow-[0_0_20px_rgba(255,170,0,0.25)]" : "border-gray-800"
        )}>
          {/* Visual tech grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          <div className="flex items-baseline gap-2 z-10">
            <span className="text-xs font-mono text-neonAmber/60 select-none">#</span>
            <span className={clsx(
              "font-orbitron font-black tracking-widest transition-all",
              serialNumber.length > 6 ? "text-2xl sm:text-3xl text-neonAmber" : "text-3xl sm:text-4xl text-neonAmber",
              !hasContent && "text-gray-600 tracking-widest"
            )}>
              {hasContent ? serialNumber : '---'}
            </span>
          </div>

          {hasContent && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-mono text-cyberSilver/60 hover:text-white px-2 py-1 bg-white/5 rounded border border-gray-700 z-10 transition-colors"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Error Alert Banner (if 404/400) */}
      {errorBanner && (
        <div className="w-full mb-3 p-3 bg-red-950/80 border-2 border-[#ff0055] rounded flex items-start gap-2.5 animate-shake">
          <AlertTriangle className="w-5 h-5 text-[#ff0055] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
              {errorBanner.title || 'Kupon Belum Terdaftar Di Kasir'}
            </div>
            <div className="text-xs font-mono text-red-200/90 mt-0.5 leading-relaxed">
              {errorBanner.message}
            </div>
          </div>
        </div>
      )}

      {/* 3x4 Numpad Touch Grid (Minimal 64px x 64px buttons) */}
      <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {keys.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              type="button"
              aria-label={`Tombol ${k.label}`}
              onClick={k.action}
              disabled={disabled || loading}
              className={clsx(
                "min-h-[64px] sm:min-h-[72px] rounded flex items-center justify-center font-orbitron font-black text-2xl transition-all duration-100 select-none border active:scale-95",
                k.special === 'clear' && "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 active:bg-red-500/30",
                k.special === 'backspace' && "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 active:bg-amber-500/30",
                !k.special && "bg-obsidian/90 text-white border-gray-800 hover:border-neonCyan/50 hover:bg-neonCyan/5 active:bg-neonCyan/20"
              )}
            >
              {Icon ? <Icon className="w-6 h-6" /> : k.label}
            </button>
          );
        })}
      </div>

      {/* Primary CTA Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={clsx(
          "w-full min-h-[58px] sm:min-h-[64px] rounded flex items-center justify-center gap-2 font-orbitron font-black text-lg sm:text-xl uppercase tracking-wider transition-all duration-150 border-2 select-none",
          canSubmit
            ? "bg-neonAmber text-black border-neonAmber hover:bg-amber-400 shadow-[0_0_30px_rgba(255,170,0,0.5)] active:scale-[0.99] cursor-pointer"
            : "bg-gray-800/40 text-gray-500 border-gray-800 cursor-not-allowed"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-black" />
            <span>MEMVALIDASI KUPON...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-6 h-6" />
            <span>Catat Pemenang Heat</span>
          </>
        )}
      </button>
    </div>
  );
}
