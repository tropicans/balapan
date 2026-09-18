import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from '../ui/CyberButton.jsx';
import { CyberCard } from '../ui/CyberCard.jsx';
import {
  Trophy,
  UserCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  Search,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

export function WinnerRegistrationPanel() {
  const { raceState, socket } = useRace();
  const [selectedRound, setSelectedRound] = useState(2);
  const [participantInput, setParticipantInput] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [eligibilityInfo, setEligibilityInfo] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [winnersList, setWinnersList] = useState([]);

  const inputRef = useRef(null);
  const activeEvent = raceState?.activeEvent;
  const matches = raceState?.bracketMatches || [];

  // Determine available rounds dynamically (at least [2, 3], expands as matches complete)
  const availableRounds = useMemo(() => {
    const rSet = new Set([2, 3]);
    matches.forEach(m => {
      if (m.round_number) {
        rSet.add(m.round_number);
        if (m.status === 'completed') {
          rSet.add(m.round_number + 1);
        }
      }
    });
    return Array.from(rSet).sort((a, b) => a - b);
  }, [matches]);

  // Round label generator
  const getRoundLabel = (rNum) => {
    const roundMatches = matches.filter(m => m.round_number === rNum);
    const isSingleFinalHeat = roundMatches.length === 1 && Boolean(roundMatches[0].is_final);
    if (isSingleFinalHeat) return `GRAND FINAL (BABAK ${rNum})`;
    if (rNum === 2) return 'BABAK 2 // PENYISIHAN';
    if (rNum === 3) return 'BABAK 3 // PEREMPAT FINAL';
    if (rNum === 4) return 'BABAK 4 // SEMIFINAL';
    return `BABAK ${rNum} // ELIMINASI`;
  };

  // Fetch registered winners for selected round
  const fetchWinners = useCallback(async () => {
    try {
      const res = await fetch(`/api/winners?round=${selectedRound}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setWinnersList(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch winners list:', e);
    }
  }, [selectedRound]);

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

  // Lookup participant & check eligibility for selectedRound
  useEffect(() => {
    const clean = participantInput.trim().replace(/^#/, '');
    if (!clean || isNaN(clean)) {
      setSelectedParticipant(null);
      setEligibilityInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // 1. Participant details
        const resP = await fetch(`/api/participants?search=${encodeURIComponent(clean)}`);
        const dataP = await resP.json();
        let foundUser = null;
        if (dataP.success && dataP.data?.participants) {
          foundUser = dataP.data.participants.find(p => String(p.participant_number) === clean);
          setSelectedParticipant(foundUser || null);
        }

        // 2. Eligibility for selectedRound
        if (foundUser) {
          const resE = await fetch(`/api/winners/eligibility?participant_number=${encodeURIComponent(clean)}&round=${selectedRound}`);
          const dataE = await resE.json();
          if (dataE.success && dataE.data) {
            setEligibilityInfo(dataE.data);
          } else {
            setEligibilityInfo(null);
          }
        } else {
          setEligibilityInfo(null);
        }
      } catch (e) {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [participantInput, selectedRound]);

  // Handle register winner
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);

    const cleanNum = participantInput.trim().replace(/^#/, '');
    if (!cleanNum) {
      setErrorMsg(`Masukkan nomor peserta pemenang untuk Babak ${selectedRound}`);
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/winners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_number: cleanNum, round: selectedRound })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Gagal mendaftarkan pemenang ke Babak ${selectedRound}`);
      }

      setFeedbackMsg(data.message || `Peserta #${cleanNum} berhasil didaftarkan ke Babak ${selectedRound}!`);
      setParticipantInput('');
      setSelectedParticipant(null);
      setEligibilityInfo(null);
      fetchWinners();
      inputRef.current?.focus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Undo Last for active round
  const handleUndo = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setUndoing(true);
    try {
      const res = await fetch('/api/winners/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: selectedRound })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Gagal membatalkan pendaftaran terakhir Babak ${selectedRound}`);
      }
      setFeedbackMsg(data.message || `Pendaftaran pemenang Babak ${selectedRound} terakhir berhasil di-undo!`);
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
      {/* Dynamic Round Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {availableRounds.map(rNum => {
          const isSelected = selectedRound === rNum;
          return (
            <button
              key={rNum}
              onClick={() => {
                setSelectedRound(rNum);
                setErrorMsg(null);
                setFeedbackMsg(null);
              }}
              className={clsx(
                "px-4 py-2 font-orbitron text-xs font-bold uppercase clip-cyber flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer",
                isSelected
                  ? "bg-neonCyan text-black shadow-glowCyan"
                  : "bg-black/60 text-cyberSilver/60 hover:text-white border border-gray-800"
              )}
            >
              <GitBranch className="w-4 h-4" />
              <span>{getRoundLabel(rNum)}</span>
            </button>
          );
        })}
      </div>

      {/* Header Banner */}
      <div className="bg-obsidian/90 border border-neonCyan/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-glowCyan">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-neonCyan" />
          </div>
          <div>
            <h2 className="text-lg font-orbitron font-black text-white tracking-wider flex items-center gap-2">
              <span>PENDAFTARAN & SCRUTINEERING: BABAK {selectedRound}</span>
              <span className="px-2 py-0.5 bg-neonCyan/20 text-neonCyan border border-neonCyan/50 text-[10px] font-mono clip-cyber">
                v3.2
              </span>
            </h2>
            <div className="text-xs font-mono text-neonCyan/80">
              Event: {activeEvent?.nama || 'Event Default'} • {selectedRound === 2 ? 'Kupon Fisik Babak 1' : `Kupon Fisik Pemenang Babak ${selectedRound - 1}`} • Auto-Seeding Jalur A → B → C
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-black/60 border border-neonCyan/40 text-neonCyan text-xs font-mono clip-cyber">
            Total Babak {selectedRound}: {winnersList.length} Terdaftar
          </span>
          <CyberButton
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoing || winnersList.length === 0}
            className="text-neonAmber border-neonAmber/50 hover:bg-neonAmber/20 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {undoing ? 'MEMBATALKAN...' : `UNDO BABAK ${selectedRound}`}
          </CyberButton>
        </div>
      </div>

      {/* Main Grid: Input Form (Left 5) + Registered Winners List (Right 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <CyberCard title={`INPUT PEMENANG LOLOS SCRUT // BABAK ${selectedRound}`} glowColor="cyan">
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
                      Mencari & validasi...
                    </span>
                  )}
                </div>
              </div>

              {/* Resolved Card & Eligibility Status Preview */}
              {selectedParticipant ? (
                <div className="space-y-2">
                  <div className="p-3 bg-black/70 border border-neonGreen/50 clip-cyber text-xs font-mono space-y-1 shadow-[0_0_15px_rgba(57,255,20,0.15)]">
                    <div className="text-cyberSilver/60 text-[10px] uppercase tracking-wider">
                      Pembalap Teridentifikasi:
                    </div>
                    <div className="text-lg font-orbitron font-black text-neonGreen">
                      #{selectedParticipant.participant_number} — {selectedParticipant.name}
                    </div>
                    {selectedParticipant.team_name && (
                      <div className="text-neonPink font-bold text-xs">
                        Tim: [{selectedParticipant.team_name}]
                      </div>
                    )}
                  </div>

                  {/* Scrutineering & Eligibility Status Alert */}
                  {eligibilityInfo && (
                    <div className={clsx(
                      "p-3 border text-xs font-mono clip-cyber flex items-start gap-2.5",
                      eligibilityInfo.eligible
                        ? "bg-neonGreen/10 border-neonGreen/60 text-neonGreen"
                        : "bg-red-950/60 border-red-500 text-red-300"
                    )}>
                      {eligibilityInfo.eligible ? (
                        <ShieldCheck className="w-4 h-4 text-neonGreen shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold uppercase tracking-wider text-[10px]">
                          {eligibilityInfo.eligible ? 'STATUS SCRUT: MEMENUHI SYARAT' : 'STATUS SCRUT: TIDAK MEMENUHI SYARAT'}
                        </div>
                        <div className="text-[11px] mt-0.5">{eligibilityInfo.reason}</div>
                      </div>
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
                disabled={submitting || (eligibilityInfo && !eligibilityInfo.eligible)}
                className="w-full cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'MENDAFTARKAN...' : `DAFTARKAN KE BABAK ${selectedRound}`}
              </CyberButton>
            </form>
          </CyberCard>
        </div>

        {/* Right List Card */}
        <div className="lg:col-span-7">
          <CyberCard title={`RIWAYAT SEEDING BABAK ${selectedRound}`} glowColor="cyan">
            {winnersList.length === 0 ? (
              <div className="text-center py-12 text-cyberSilver/40 font-mono text-xs">
                Belum ada pemenang yang didaftarkan ke Babak {selectedRound}.
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
                            Babak {w.round_number} Heat #{w.match_number} (Jalur {w.lane})
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
