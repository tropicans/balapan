import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from '../ui/CyberButton.jsx';
import { CyberCard } from '../ui/CyberCard.jsx';
import {
  Trophy,
  UserCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

export function WinnerRegistrationPanel() {
  const { raceState, socket } = useRace();
  const [participantInput, setParticipantInput] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [winnersList, setWinnersList] = useState([]);

  const inputRef = useRef(null);
  const activeEvent = raceState?.activeEvent;

  // Fetch registered winners
  const fetchWinners = useCallback(async () => {
    try {
      const res = await fetch('/api/winners');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setWinnersList(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch winners list:', e);
    }
  }, []);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchWinners();
    socket.on('winner_registered', handleUpdate);
    socket.on('winner_undone', handleUpdate);
    socket.on('bracket_updated', handleUpdate);
    return () => {
      socket.off('winner_registered', handleUpdate);
      socket.off('winner_undone', handleUpdate);
      socket.off('bracket_updated', handleUpdate);
    };
  }, [socket, fetchWinners]);

  // Lookup participant by number
  useEffect(() => {
    const clean = participantInput.trim().replace(/^#/, '');
    if (!clean || isNaN(clean)) {
      setSelectedParticipant(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/participants?search=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.success && data.data?.participants) {
          const found = data.data.participants.find(p => String(p.participant_number) === clean);
          if (found) {
            setSelectedParticipant(found);
            setErrorMsg(null);
          } else {
            setSelectedParticipant(null);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [participantInput]);

  // Handle register winner
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);

    const cleanNum = participantInput.trim().replace(/^#/, '');
    if (!cleanNum) {
      setErrorMsg('Masukkan nomor peserta pemenang Babak 1');
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/winners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_number: cleanNum })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mendaftarkan pemenang');
      }

      setFeedbackMsg(data.message || `Peserta #${cleanNum} berhasil didaftarkan ke Babak 2!`);
      setParticipantInput('');
      setSelectedParticipant(null);
      fetchWinners();
      inputRef.current?.focus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Undo Last
  const handleUndo = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setUndoing(true);
    try {
      const res = await fetch('/api/winners/undo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membatalkan pendaftaran terakhir');
      }
      setFeedbackMsg(data.message || 'Pendaftaran pemenang terakhir berhasil di-undo!');
      fetchWinners();
      inputRef.current?.focus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-obsidian/90 border border-neonCyan/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-glowCyan">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-neonCyan" />
          </div>
          <div>
            <h2 className="text-lg font-orbitron font-black text-white tracking-wider">
              PANEL REGISTRASI PEMENANG BABAK 2 (v3.0)
            </h2>
            <div className="text-xs font-mono text-neonCyan/80">
              Event Aktif: {activeEvent?.nama || 'Event Default'} • Auto-Seeding Jalur A → B → C
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-black/60 border border-neonCyan/40 text-neonCyan text-xs font-mono clip-cyber">
            Total Pemenang Terdaftar: {winnersList.length}
          </span>
          <CyberButton
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoing || winnersList.length === 0}
            className="text-neonAmber border-neonAmber/50 hover:bg-neonAmber/20"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {undoing ? 'MEMBATALKAN...' : 'UNDO TERAKHIR'}
          </CyberButton>
        </div>
      </div>

      {/* Main Grid: Input Form (Left 5) + Registered Winners List (Right 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <CyberCard title="INPUT NOMOR PEMENANG" glowColor="cyan">
            <form onSubmit={handleRegister} className="space-y-4">
              {feedbackMsg && (
                <div className="p-3 bg-neonGreen/10 border border-neonGreen text-neonGreen text-xs font-mono clip-cyber flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{feedbackMsg}</div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-400 text-xs font-mono clip-cyber flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-cyberSilver/80 uppercase mb-1">
                  Nomor Peserta (#)
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    placeholder="Ketik nomor: misal 7 atau #7"
                    className="w-full bg-black/70 border border-cyberSilver/30 focus:border-neonCyan px-3 py-2.5 text-white font-mono text-xl focus:outline-none clip-cyber"
                    autoFocus
                  />
                  {searching && (
                    <span className="absolute right-3 top-3 text-xs text-cyberSilver/50 font-mono">
                      Mencari...
                    </span>
                  )}
                </div>
              </div>

              {/* Resolved Card Preview */}
              {selectedParticipant ? (
                <div className="p-4 bg-black/70 border border-neonGreen/50 clip-cyber text-xs font-mono space-y-1 shadow-[0_0_15px_rgba(57,255,20,0.2)]">
                  <div className="text-cyberSilver/60 text-[10px] uppercase tracking-wider">
                    Pembalap Teridentifikasi:
                  </div>
                  <div className="text-xl font-orbitron font-black text-neonGreen">
                    #{selectedParticipant.participant_number} — {selectedParticipant.name}
                  </div>
                  {selectedParticipant.team_name && (
                    <div className="text-neonPink font-bold text-xs">
                      Tim: [{selectedParticipant.team_name}]
                    </div>
                  )}
                </div>
              ) : participantInput.trim() ? (
                <div className="text-[11px] font-mono text-neonAmber/80">
                  Mencari pembalap bernomor #{participantInput.replace(/^#/, '')}...
                </div>
              ) : null}

              <CyberButton
                type="submit"
                variant="cyan"
                size="lg"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'MENDAFTARKAN...' : 'DAFTARKAN KE BABAK 2'}
              </CyberButton>
            </form>
          </CyberCard>
        </div>

        {/* Right List Card */}
        <div className="lg:col-span-7">
          <CyberCard title="RIWAYAT SEEDING BABAK 2" glowColor="cyan">
            {winnersList.length === 0 ? (
              <div className="text-center py-12 text-cyberSilver/40 font-mono text-xs">
                Belum ada pemenang yang didaftarkan ke Babak 2.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-cyberSilver/20 text-cyberSilver/60 uppercase">
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">Nama Pembalap</th>
                      <th className="py-2 px-3">Tim</th>
                      <th className="py-2 px-3">Penempatan</th>
                      <th className="py-2 px-3 text-right">Waktu Daftar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyberSilver/10">
                    {winnersList.map((w, idx) => (
                      <tr key={w.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-neonCyan">
                          #{w.participant_number}
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">
                          {w.user_name}
                        </td>
                        <td className="py-2.5 px-3 text-neonPink">
                          {w.team_name ? `[${w.team_name}]` : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-neonCyan/20 text-neonCyan border border-neonCyan/40 text-[10px] font-orbitron clip-cyber">
                            Heat #{w.match_number} (Jalur {w.lane})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-cyberSilver/60 text-[10px]">
                          {w.created_at ? new Date(w.created_at).toLocaleTimeString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CyberCard>
        </div>
      </div>
    </div>
  );
}

export default WinnerRegistrationPanel;
