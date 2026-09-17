import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { UserPlus, AlertCircle, Loader2, Trophy, Users } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';

export const ParticipantForm = forwardRef(function ParticipantForm({ onSuccess, onRefreshStats }, ref) {
  const nameInputRef = useRef(null);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Expose focus helper for parent/modal close
  useImperativeHandle(ref, () => ({
    focusNameInput: () => {
      nameInputRef.current?.focus();
    }
  }));

  // Auto-focus on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Nama pembalap wajib diisi.');
      nameInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          team_name: teamName.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal mendaftarkan peserta.');
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      // Audio success tone
      sound.playTone(880, 'sine', 0.08, 0.1);

      // Clear input fields
      setName('');
      setTeamName('');

      // Notify parent with the created participant object to show giant modal
      if (onSuccess) {
        onSuccess(data.data);
      }
      if (onRefreshStats) {
        onRefreshStats();
      }
    } catch (err) {
      setError('Gagal menghubungi server database turnamen.');
      sound.playTone(250, 'sawtooth', 0.2, 0.2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-obsidian border-2 border-neonCyan clip-cyber p-5 space-y-4 shadow-[0_0_20px_rgba(0,240,255,0.15)] relative">
      {/* HUD Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-neonCyan" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-neonCyan" />

      {/* Form Header */}
      <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
        <div className="w-8 h-8 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber">
          <UserPlus className="w-4 h-4 text-neonCyan" />
        </div>
        <div>
          <h3 className="text-sm font-orbitron font-black text-white tracking-wider">
            REGISTRASI PESERTA // AUTO-NUMBER
          </h3>
          <p className="text-[11px] font-mono text-neonCyan">
            Penomoran otomatis berurutan per event aktif
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-neonPink/20 border border-neonPink text-neonPink text-xs font-mono clip-cyber flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-orbitron text-gray-300 font-bold mb-1 tracking-wider">
            NAMA PEMBALAP <span className="text-neonCyan">*</span>
          </label>
          <div className="relative">
            <input
              ref={nameInputRef}
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ketik nama pembalap..."
              className="w-full bg-black/80 border border-neonCyan/80 focus:border-neonCyan focus:ring-2 focus:ring-neonCyan/50 text-white font-mono text-base font-bold px-3 py-2.5 outline-none tracking-wide uppercase clip-cyber"
            />
          </div>
          <p className="text-[10px] font-mono text-gray-400 mt-1">
            * Tekan Enter untuk langsung mendaftar & melihat nomor kupon.
          </p>
        </div>

        <div>
          <label className="block text-xs font-orbitron text-gray-300 font-bold mb-1 tracking-wider">
            NAMA TIM / RACER TAG (OPSIONAL)
          </label>
          <input
            type="text"
            maxLength={50}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Contoh: RED RACING TEAM (boleh kosong)"
            className="w-full bg-black/80 border border-gray-700 focus:border-neonPink focus:ring-2 focus:ring-neonPink/50 text-white font-mono text-sm px-3 py-2 outline-none uppercase clip-cyber"
          />
        </div>

        {/* Quick Helper Note */}
        <div className="p-2.5 bg-black/50 border border-gray-800 text-[11px] font-mono text-gray-400 clip-cyber space-y-1">
          <div className="text-gray-300 font-bold">ALUR CEPAT KASIR (KEYBOARD ONLY):</div>
          <div>1. Ketik Nama Pembalap & Tim &rarr; Tekan <kbd className="px-1.5 py-0.5 bg-gray-800 text-neonCyan font-bold text-[10px] rounded">ENTER</kbd></div>
          <div>2. Modal angka raksasa muncul &rarr; Catat nomor di kupon</div>
          <div>3. Tekan <kbd className="px-1.5 py-0.5 bg-gray-800 text-neonCyan font-bold text-[10px] rounded">ENTER / ESC</kbd> &rarr; Kursor kembali ke input nama</div>
        </div>

        {/* Submit Button */}
        <CyberButton
          type="submit"
          variant="cyan"
          size="lg"
          className="w-full justify-center"
          disabled={submitting || !name.trim()}
          icon={submitting ? Loader2 : Trophy}
        >
          {submitting ? 'MENDAFTARKAN...' : 'DAFTARKAN PESERTA (ENTER)'}
        </CyberButton>
      </form>
    </div>
  );
});
