import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from '../ui/CyberButton.jsx';
import { CyberCard } from '../ui/CyberCard.jsx';
import {
  Trophy,
  Zap,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  X
} from 'lucide-react';
import clsx from 'clsx';

export function BtoManager() {
  const { raceState, socket } = useRace();
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form input state
  const [participantInput, setParticipantInput] = useState('');
  const [finishTimeInput, setFinishTimeInput] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchingParticipant, setSearchingParticipant] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const timeInputRef = useRef(null);
  const participantInputRef = useRef(null);

  const activeEvent = raceState?.activeEvent;

  // Fetch BTO leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/bto/leaderboard?limit=15');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLeaderboard(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch BTO leaderboard:', e);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Listen to WebSocket events for instant updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchLeaderboard();
    socket.on('bto:updated', handleUpdate);
    socket.on('NEW_BTO_RECORD', handleUpdate);
    socket.on('STATE_UPDATE', (state) => {
      if (state?.btoLeaderboard) {
        fetchLeaderboard();
      }
    });

    return () => {
      socket.off('bto:updated', handleUpdate);
      socket.off('NEW_BTO_RECORD', handleUpdate);
    };
  }, [socket, fetchLeaderboard]);

  // Lookup participant by number or name on input change
  useEffect(() => {
    const query = participantInput.trim();
    if (!query) {
      setSelectedParticipant(null);
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // If already selected and input matches display format, don't re-search
    if (selectedParticipant && (
      query === `#${selectedParticipant.participant_number}` ||
      query === String(selectedParticipant.participant_number) ||
      query === `#${selectedParticipant.participant_number} - ${selectedParticipant.name}`
    )) {
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingParticipant(true);
      try {
        const cleanQuery = query.replace(/^#/, '');
        const res = await fetch(`/api/participants?search=${encodeURIComponent(cleanQuery)}&limit=8`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.participants)) {
          const list = data.data.participants;
          setSuggestions(list);

          const exactByNum = list.find(p => String(p.participant_number) === cleanQuery);
          const exactByName = list.find(p => p.name.toLowerCase() === cleanQuery.toLowerCase());

          if (exactByNum) {
            setSelectedParticipant(exactByNum);
            setShowDropdown(false);
            setErrorMsg(null);
          } else if (exactByName && list.length === 1) {
            setSelectedParticipant(exactByName);
            setShowDropdown(false);
            setErrorMsg(null);
          } else {
            setShowDropdown(list.length > 0);
          }
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (e) {
        setSuggestions([]);
      } finally {
        setSearchingParticipant(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [participantInput, selectedParticipant]);

  const handleSelectParticipant = (p) => {
    setSelectedParticipant(p);
    setParticipantInput(`#${p.participant_number} - ${p.name}`);
    setShowDropdown(false);
    setErrorMsg(null);
    timeInputRef.current?.focus();
  };

  const handleClearParticipant = () => {
    setParticipantInput('');
    setSelectedParticipant(null);
    setSuggestions([]);
    setShowDropdown(false);
    participantInputRef.current?.focus();
  };

  // Handle record submit
  const handleRecordTime = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);

    const cleanNum = participantInput.trim().replace(/^#/, '').split(' - ')[0];
    const targetNumber = selectedParticipant ? selectedParticipant.participant_number : (isNaN(cleanNum) ? null : parseInt(cleanNum, 10));
    const targetUserId = selectedParticipant?.id;

    if (!targetNumber && !targetUserId) {
      setErrorMsg('Pilih atau masukkan nomor/nama pembalap terdaftar');
      participantInputRef.current?.focus();
      return;
    }

    const timeNum = parseFloat(finishTimeInput);
    if (isNaN(timeNum) || timeNum <= 0 || timeNum >= 300) {
      setErrorMsg('Catatan waktu harus angka positif antara 0.001 dan 299.999 detik');
      timeInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_number: targetNumber,
          user_id: targetUserId,
          finish_time: timeNum
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan catatan BTO');
      }

      setFeedbackMsg(data.data?.message || 'Catatan waktu berhasil diproses!');
      setParticipantInput('');
      setFinishTimeInput('');
      setSelectedParticipant(null);
      setSuggestions([]);
      setShowDropdown(false);
      fetchLeaderboard();
      participantInputRef.current?.focus();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete record
  const handleDeleteRecord = async (recordId, racerName) => {
    if (!window.confirm(`Hapus catatan BTO untuk ${racerName}?`)) return;
    try {
      const res = await fetch(`/api/bto/${recordId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal menghapus');
      setFeedbackMsg(`Catatan BTO untuk ${racerName} telah dihapus.`);
      fetchLeaderboard();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header telemetry banner */}
      <div className="bg-obsidian/90 border border-neonAmber/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-glowAmber">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-neonAmber/20 border border-neonAmber flex items-center justify-center">
            <Trophy className="w-5 h-5 text-neonAmber" />
          </div>
          <div>
            <h2 className="text-lg font-orbitron font-black text-white tracking-wider">
              PANEL PENCATATAN MANUAL BTO (BEST TIME OVERALL)
            </h2>
            <div className="text-xs font-mono text-neonAmber/80">
              Event Aktif: {activeEvent?.nama || 'Event Default'} • Mode: Personal Best Replacement
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1 bg-black/60 border border-neonAmber/40 text-neonAmber clip-cyber">
            Total Entri BTO: {leaderboard.length}
          </span>
          {leaderboard.length > 0 && (
            <span className="px-3 py-1 bg-neonGreen/20 border border-neonGreen text-neonGreen clip-cyber">
              Rekor Puncak: {parseFloat(leaderboard[0].finish_time).toFixed(3)}s (#{leaderboard[0].participant_number} {leaderboard[0].user_name})
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Form Entry (Left) + Live Leaderboard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <CyberCard title="INPUT WAKTU PESERTA" glowColor="amber">
            <form onSubmit={handleRecordTime} className="space-y-4">
              {/* Feedback Alert */}
              {feedbackMsg && (
                <div className="p-3 bg-neonGreen/10 border border-neonGreen text-neonGreen text-xs font-mono clip-cyber flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{feedbackMsg}</div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-400 text-xs font-mono clip-cyber flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Participant Number or Name Input (Omni-Search) */}
              <div>
                <label className="block text-xs font-mono text-cyberSilver/80 uppercase mb-1">
                  Cari Nomor (#) atau Nama Pembalap
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-cyberSilver/50 absolute left-3 top-3 pointer-events-none" />
                  <input
                    ref={participantInputRef}
                    type="text"
                    value={participantInput}
                    onChange={(e) => {
                      setParticipantInput(e.target.value);
                      if (selectedParticipant) setSelectedParticipant(null);
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0 && !selectedParticipant) setShowDropdown(true);
                    }}
                    placeholder="Ketik nomor (#12) atau nama pembalap..."
                    className="w-full bg-black/70 border border-cyberSilver/30 focus:border-neonAmber pl-9 pr-8 py-2 text-white font-mono text-base focus:outline-none clip-cyber"
                  />
                  {participantInput && (
                    <button
                      type="button"
                      onClick={handleClearParticipant}
                      className="absolute right-2.5 top-2.5 text-cyberSilver/50 hover:text-white"
                      title="Hapus pencarian"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {searchingParticipant && (
                    <span className="absolute right-8 top-2.5 text-xs text-cyberSilver/50 font-mono">
                      Mencari...
                    </span>
                  )}

                  {/* Autocomplete Suggestions Dropdown */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-obsidian border border-neonAmber/60 shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-50 max-h-56 overflow-y-auto divide-y divide-gray-800 clip-cyber">
                      {suggestions.map((p) => (
                        <div
                          key={p.id}
                          onMouseDown={() => handleSelectParticipant(p)}
                          className="p-2.5 hover:bg-neonAmber/20 cursor-pointer transition-colors flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron font-bold text-neonAmber">
                              #{p.participant_number}
                            </span>
                            <span className="text-white font-bold">{p.name}</span>
                            {p.team_name && (
                              <span className="text-neonPink text-[11px]">[{p.team_name}]</span>
                            )}
                          </div>
                          <span className="text-[10px] text-neonAmber uppercase font-bold">PILIH</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Participant resolved card */}
                {selectedParticipant ? (
                  <div className="mt-2 p-2.5 bg-black/60 border border-neonCyan/40 clip-cyber text-xs font-mono flex items-center justify-between">
                    <div>
                      <div className="text-neonCyan font-bold text-sm">
                        #{selectedParticipant.participant_number} — {selectedParticipant.name}
                      </div>
                      {selectedParticipant.team_name && (
                        <div className="text-neonPink text-[11px] mt-0.5">
                          Tim: {selectedParticipant.team_name}
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-neonCyan/20 text-neonCyan text-[10px] font-bold clip-cyber border border-neonCyan/40">
                      TERPILIH
                    </span>
                  </div>
                ) : participantInput.trim() && !showDropdown && !searchingParticipant ? (
                  <div className="mt-1 text-[11px] font-mono text-neonAmber/80">
                    Pembalap tidak ditemukan. Masukkan nomor # atau nama yang terdaftar.
                  </div>
                ) : null}
              </div>

              {/* Finish Time Input */}
              <div>
                <label className="block text-xs font-mono text-cyberSilver/80 uppercase mb-1">
                  Waktu Lap (Detik)
                </label>
                <div className="relative">
                  <input
                    ref={timeInputRef}
                    type="number"
                    step="0.001"
                    min="0.001"
                    max="299.999"
                    value={finishTimeInput}
                    onChange={(e) => setFinishTimeInput(e.target.value)}
                    placeholder="Contoh: 14.825"
                    className="w-full bg-black/70 border border-cyberSilver/30 focus:border-neonGreen px-3 py-2 text-neonGreen font-orbitron font-bold text-2xl focus:outline-none clip-cyber"
                  />
                  <Clock className="w-5 h-5 text-cyberSilver/40 absolute right-3 top-3" />
                </div>
                <div className="text-[10px] font-mono text-cyberSilver/60 mt-1">
                  Format: detik desimal hingga 3 angka di belakang koma (mis. 12.345)
                </div>
              </div>

              {/* Submit button */}
              <CyberButton
                type="submit"
                variant="amber"
                size="lg"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'MEMPROSES...' : 'CATAT WAKTU BTO'}
              </CyberButton>
            </form>
          </CyberCard>
        </div>

        {/* Leaderboard Table Card (7 cols) */}
        <div className="lg:col-span-7">
          <CyberCard title="LEADERBOARD BTO REALTIME" glowColor="amber">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-cyberSilver/40 font-mono text-xs">
                Belum ada catatan waktu BTO yang dicatat pada event ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-cyberSilver/20 text-cyberSilver/60 uppercase">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Pembalap</th>
                      <th className="py-2.5 px-3">Tim</th>
                      <th className="py-2.5 px-3 text-right">Waktu</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyberSilver/10">
                    {leaderboard.map((item) => {
                      const isGold = item.rank === 1;
                      const isSilver = item.rank === 2;
                      const isBronze = item.rank === 3;

                      return (
                        <tr
                          key={item.id}
                          className={clsx(
                            "hover:bg-white/5 transition-colors",
                            isGold && "bg-neonAmber/10 font-bold"
                          )}
                        >
                          <td className="py-3 px-3">
                            <span
                              className={clsx(
                                "inline-flex items-center justify-center w-6 h-6 rounded-none text-xs font-orbitron font-bold clip-cyber",
                                isGold && "bg-neonAmber text-black shadow-glowAmber",
                                isSilver && "bg-white/30 text-white",
                                isBronze && "bg-amber-700 text-white",
                                !isGold && !isSilver && !isBronze && "text-cyberSilver/60"
                              )}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-neonCyan font-bold">
                            #{item.participant_number || '-'}
                          </td>
                          <td className="py-3 px-3 text-white">
                            {item.user_name}
                          </td>
                          <td className="py-3 px-3 text-neonPink">
                            {item.team_name ? `[${item.team_name}]` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={clsx(
                              "font-orbitron font-bold text-sm",
                              isGold ? "text-neonAmber text-glow-amber" : "text-neonGreen"
                            )}>
                              {parseFloat(item.finish_time).toFixed(3)}s
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord(item.id, item.user_name)}
                              title="Hapus / Koreksi Catatan"
                              className="text-cyberSilver/40 hover:text-red-400 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

export default BtoManager;
