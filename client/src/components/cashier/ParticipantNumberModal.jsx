import React, { useEffect, useRef } from 'react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { CheckCircle2, Hash } from 'lucide-react';

export function ParticipantNumberModal({ participant, onClose }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!participant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-obsidian border-2 border-neonCyan p-6 md:p-8 clip-cyber shadow-[0_0_50px_rgba(0,240,255,0.3)] text-center space-y-5">
        <div className="flex items-center justify-center gap-2 text-xs font-orbitron font-bold text-neonCyan tracking-widest uppercase">
          <CheckCircle2 className="w-4 h-4 text-neonGreen" />
          <span>REGISTRASI BERHASIL // TERCATAT</span>
        </div>

        {/* D-01, D-02: Giant Number Format '#42' */}
        <div className="py-2">
          <div className="text-xs font-mono text-gray-400 mb-1">NOMOR PESERTA KUPON:</div>
          <div className="text-7xl md:text-8xl font-black font-orbitron text-neonCyan tracking-wider drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]">
            #{participant.participant_number}
          </div>
        </div>

        <div className="border-t border-b border-gray-800 py-3 space-y-1">
          <div className="text-xl md:text-2xl font-orbitron font-black text-white uppercase truncate">
            {participant.name}
          </div>
          <div className="text-xs font-mono text-neonPink">
            TIM: {participant.team_name || '-'}
          </div>
        </div>

        <p className="text-xs font-mono text-gray-400">
          Tulis nomor ini pada lembar kupon fisik peserta.
        </p>

        {/* D-03: Close & Auto-focus back to Name input */}
        <CyberButton
          ref={buttonRef}
          variant="cyan"
          size="lg"
          className="w-full justify-center"
          onClick={onClose}
        >
          SELESAI / LANJUT DAFTAR (ENTER)
        </CyberButton>
      </div>
    </div>
  );
}
