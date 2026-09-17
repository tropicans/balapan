import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Save, Loader2, AlertCircle } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';

export function ParticipantEditModal({ participant, onClose, onSuccess }) {
  const nameInputRef = useRef(null);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (participant) {
      setName(participant.name || '');
      setTeamName(participant.team_name || '');
      setError(null);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [participant]);

  if (!participant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Nama pembalap wajib diisi.');
      nameInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/participants/${participant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          team_name: teamName.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal memperbarui data peserta.');
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      sound.playTone(880, 'sine', 0.1, 0.15);
      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      setError('Terjadi kendala jaringan ke server turnamen.');
      sound.playTone(250, 'sawtooth', 0.2, 0.2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-obsidian border-2 border-neonCyan clip-cyber p-5 md:p-6 shadow-[0_0_30px_rgba(0,240,255,0.3)]">
        {/* HUD Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neonCyan" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neonCyan" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neonCyan" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neonCyan" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3 mb-4">
          <div className="w-9 h-9 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber">
            <Lock className="w-5 h-5 text-neonCyan" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-orbitron font-black text-white tracking-wider">
              EDIT DATA PESERTA // TYPO FIX
            </h3>
            <p className="text-xs font-mono text-neonCyan">
              Perbaikan nama atau tim tanpa mengubah nomor kupon
            </p>
          </div>
        </div>

        {/* Locked Participant Number Badge (D-12) */}
        <div className="bg-black/60 border border-gray-800 p-3 mb-4 clip-cyber flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400">NOMOR PESERTA (PERMANEN):</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neonCyan/10 border border-neonCyan text-neonCyan font-orbitron font-black text-sm">
            <Lock className="w-3.5 h-3.5 text-neonCyan/70" />
            <span>#{participant.participant_number}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 bg-neonPink/20 border border-neonPink text-neonPink text-xs font-mono clip-cyber flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
              NAMA LENGKAP PEMBALAP <span className="text-neonCyan">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: ANDI PRATAMA"
              className="w-full bg-black/70 border border-neonCyan/80 focus:border-neonCyan focus:ring-2 focus:ring-neonCyan/50 text-white font-mono text-sm px-3 py-2 outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
              NAMA TIM (OPSIONAL)
            </label>
            <input
              type="text"
              maxLength={50}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Contoh: RED RACING TEAM"
              className="w-full bg-black/70 border border-gray-700 focus:border-neonPink focus:ring-2 focus:ring-neonPink/50 text-white font-mono text-sm px-3 py-2 outline-none uppercase"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <CyberButton
              type="button"
              variant="dark"
              size="md"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </CyberButton>

            <CyberButton
              type="submit"
              variant="cyan"
              size="md"
              disabled={submitting || !name.trim()}
              icon={submitting ? Loader2 : Save}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
}
