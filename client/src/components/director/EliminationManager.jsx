import React, { useState, useMemo, useEffect } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from '../ui/CyberButton.jsx';
import { 
  GitBranch, 
  Trophy, 
  Zap, 
  Crown, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Users, 
  X,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

export function EliminationManager() {
  const { raceState, apiAdvanceBracket, apiLockRound, apiUnlockRound } = useRace();
  const matches = raceState.bracketMatches || [];

  // Determine all unique rounds present in matches (sorted numerically)
  const availableRounds = useMemo(() => {
    const roundSet = new Set(matches.map(m => m.round_number));
    if (roundSet.size === 0) return [2, 3];
    return Array.from(roundSet).sort((a, b) => a - b);
  }, [matches]);

  const highestRound = useMemo(() => {
    return availableRounds.length > 0 ? Math.max(...availableRounds) : 3;
  }, [availableRounds]);

  // View state
  const [selectedRound, setSelectedRound] = useState(availableRounds[0] || 2);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [currentPage, setCurrentPage] = useState(1);
  const [advancingMatchId, setAdvancingMatchId] = useState(null);

  // Modals state
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const ITEMS_PER_PAGE = 12;

  // Ensure selectedRound remains valid if matches update
  useEffect(() => {
    if (!availableRounds.includes(selectedRound) && availableRounds.length > 0) {
      setSelectedRound(availableRounds[0]);
    }
  }, [availableRounds, selectedRound]);

  // Reset pagination on filter or round change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRound, searchQuery, statusFilter]);

  // Matches in the currently selected round
  const currentRoundMatches = useMemo(() => {
    return matches.filter(m => m.round_number === selectedRound);
  }, [matches, selectedRound]);

  // Round 2 progress metrics
  const round2Progress = useMemo(() => {
    const r2 = matches.filter(m => m.round_number === 2);
    const total = r2.length;
    const completed = r2.filter(m => m.status === 'completed').length;
    const pending = Math.max(0, total - completed);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isLocked = raceState.round2_status === 'locked' || Boolean(raceState.round2_progress?.is_locked);
    const canFinalize = total > 0 && pending === 0 && !isLocked;

    return { total, completed, pending, percent, isLocked, canFinalize };
  }, [matches, raceState.round2_status, raceState.round2_progress]);

  // Filtered matches based on search query & status filter
  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return currentRoundMatches.filter(m => {
      // Status filter
      if (statusFilter === 'pending' && m.status === 'completed') return false;
      if (statusFilter === 'completed' && m.status !== 'completed') return false;

      // Search query filter
      if (!q) return true;

      const matchNumStr = m.match_number ? m.match_number.toString() : '';
      if (matchNumStr.includes(q) || q === `#${matchNumStr}`) return true;

      if (m.user_1_name?.toLowerCase().includes(q)) return true;
      if (m.user_1_team?.toLowerCase().includes(q)) return true;
      if (m.user_2_name?.toLowerCase().includes(q)) return true;
      if (m.user_2_team?.toLowerCase().includes(q)) return true;
      if (m.user_3_name?.toLowerCase().includes(q)) return true;
      if (m.user_3_team?.toLowerCase().includes(q)) return true;

      if (m.ticket_number_1?.toLowerCase().includes(q)) return true;
      if (m.ticket_number_2?.toLowerCase().includes(q)) return true;
      if (m.ticket_number_3?.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [currentRoundMatches, searchQuery, statusFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE) || 1;
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMatches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMatches, currentPage]);

  // 1-Click Winner Selection (RDELIM-02, D-05)
  const handleSelectWinner = async (match, winnerId) => {
    if (!winnerId || match.status === 'completed' || advancingMatchId) return;

    // Prevent winner selection if Babak 2 is locked (RDELIM-04, D-06)
    if (match.round_number === 2 && round2Progress.isLocked) {
      setFeedbackMsg({ type: 'error', text: 'Babak 2 telah dikunci. Buka kunci terlebih dahulu untuk merevisi pemenang.' });
      setTimeout(() => setFeedbackMsg(null), 5000);
      return;
    }

    setAdvancingMatchId(match.id);
    try {
      const isFinal = match.is_final === 1 || match.round_number === highestRound;
      await apiAdvanceBracket(match.id, winnerId, { isFinal });
      setFeedbackMsg({ type: 'success', text: `Pemenang Heat #${match.match_number} berhasil ditentukan!` });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Gagal memajukan pemenang heat.' });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } finally {
      setAdvancingMatchId(null);
    }
  };

  // Lock Round 2 Action
  const handleConfirmLock = async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await apiLockRound(2);
      setLockModalOpen(false);
      setFeedbackMsg({ type: 'success', text: res.message || 'Babak 2 berhasil difinalisasi dan dikunci.' });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Unlock Round 2 Action (Emergency Unlock)
  const handleConfirmUnlock = async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await apiUnlockRound(2);
      setUnlockModalOpen(false);
      setFeedbackMsg({ type: 'success', text: res.message || 'Kunci Babak 2 berhasil dibuka.' });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Tab label helper
  const getRoundLabel = (roundNum) => {
    const roundMatches = matches.filter(m => m.round_number === roundNum);
    const isSingleFinalHeat = roundMatches.length === 1 && Boolean(roundMatches[0].is_final);
    if (isSingleFinalHeat) {
      return `GRAND FINAL (BABAK ${roundNum})`;
    }
    if (roundNum === 2) {
      return `BABAK 2 // PENYISIHAN 3-JALUR`;
    }
    if (roundNum === 3) {
      return `BABAK 3 // PEREMPAT FINAL`;
    }
    if (roundNum === 4) {
      return `BABAK 4 // SEMIFINAL`;
    }
    return `BABAK ${roundNum} // ELIMINASI`;
  };

  // Render individual contestant row in 3-lane match card
  const renderContestantRow = (match, lane, userId, userName, userTeam) => {
    const isCompleted = match.status === 'completed';
    const isWinner = match.winner_id === userId && Boolean(userId);
    const hasContestant = Boolean(userName);

    const laneConfigs = {
      A: {
        badgeText: 'JALUR A',
        badgeBg: 'bg-neonPink/20 text-neonPink border-neonPink/60',
        borderAccent: 'border-l-neonPink',
        teamText: 'text-neonPink',
        hoverBorder: 'hover:border-neonPink/60'
      },
      B: {
        badgeText: 'JALUR B',
        badgeBg: 'bg-neonCyan/20 text-neonCyan border-neonCyan/60',
        borderAccent: 'border-l-neonCyan',
        teamText: 'text-neonCyan',
        hoverBorder: 'hover:border-neonCyan/60'
      },
      C: {
        badgeText: 'JALUR C',
        badgeBg: 'bg-neonGreen/20 text-neonGreen border-neonGreen/60',
        borderAccent: 'border-l-neonGreen',
        teamText: 'text-neonGreen',
        hoverBorder: 'hover:border-neonGreen/60'
      }
    };

    const ticketNumber = lane === 'A' ? match.ticket_number_1 : (lane === 'B' ? match.ticket_number_2 : match.ticket_number_3);
    const ticketIndex = lane === 'A' ? match.ticket_index_1 : (lane === 'B' ? match.ticket_index_2 : match.ticket_index_3);
    const displayName = (userName && ticketIndex) ? `${userName} #${ticketIndex}` : userName;
    const cfg = laneConfigs[lane] || laneConfigs.A;

    // Check if winner selection is locked
    const isR2Locked = match.round_number === 2 && round2Progress.isLocked;

    return (
      <div
        className={clsx(
          "p-2.5 bg-black/60 border border-gray-800/80 border-l-4 clip-cyber flex items-center justify-between gap-3 transition-all",
          cfg.borderAccent,
          isWinner ? "border-neonGreen/90 bg-neonGreen/10 shadow-[0_0_12px_rgba(57,255,20,0.2)]" : cfg.hoverBorder
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={clsx("px-1.5 py-0.5 text-[9px] font-mono font-bold border clip-cyber flex-shrink-0", cfg.badgeBg)}>
            {cfg.badgeText}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={clsx(
                "text-xs font-orbitron truncate",
                hasContestant ? (isWinner ? "text-neonGreen font-black" : "text-white") : "text-gray-600 italic text-[11px]"
              )}>
                {displayName || (selectedRound === 2 ? 'Menunggu Lolos Babak 1...' : 'Menunggu Pemenang Heat...')}
              </span>
              {ticketNumber && (
                <span className="px-1.5 py-0.2 bg-neonCyan/20 text-neonCyan border border-neonCyan/60 font-mono font-bold text-[9px] clip-cyber">
                  #{ticketNumber}
                </span>
              )}
            </div>
            {userTeam && (
              <div className={clsx("text-[10px] font-mono truncate", cfg.teamText)}>
                [{userTeam}]
              </div>
            )}
          </div>
        </div>

        {/* Action / Winner Status */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {hasContestant && !isCompleted && !isR2Locked && (
            <button
              onClick={() => handleSelectWinner(match, userId)}
              disabled={advancingMatchId === match.id}
              className="px-2.5 py-1 text-[10px] font-orbitron font-black bg-neonGreen/20 text-neonGreen hover:bg-neonGreen hover:text-black clip-cyber border border-neonGreen shadow-glowGreen transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={`Tetapkan ${displayName} sebagai Pemenang Heat #${match.match_number}`}
            >
              {advancingMatchId === match.id ? '...' : 'MENANG'}
            </button>
          )}

          {isWinner && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-neonGreen/20 border border-neonGreen clip-cyber text-[10px] font-orbitron font-bold text-neonGreen animate-pulse">
              <Crown className="w-3.5 h-3.5 text-neonAmber" />
              <span>JUARA</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render individual 3-lane match card
  const renderMatchCard = (match) => {
    const isCompleted = match.status === 'completed';
    const isFinalMatch = match.is_final === 1 || match.round_number === highestRound;
    const isAutoAdvanced = match.is_auto_advanced === 1;

    return (
      <div
        key={match.id}
        className={clsx(
          "p-4 bg-obsidian border clip-cyber space-y-2.5 relative transition-all duration-200",
          isAutoAdvanced
            ? "border-neonAmber/80 bg-neonAmber/10 shadow-glowAmber"
            : isCompleted 
              ? "border-neonGreen/60 bg-neonGreen/5 shadow-glowGreen" 
              : isFinalMatch 
                ? "border-neonAmber/60 bg-neonAmber/5 shadow-glowAmber" 
                : "border-gray-800 hover:border-neonCyan/50"
        )}
      >
        {/* Match Header */}
        <div className="flex items-center justify-between text-[11px] font-orbitron border-b border-gray-800/80 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-black tracking-wider">
              HEAT #{match.match_number}
            </span>
            {isFinalMatch && (
              <span className="px-1.5 py-0.2 bg-neonAmber/20 text-neonAmber border border-neonAmber clip-cyber text-[9px] font-black flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                GRAND FINAL
              </span>
            )}
            {isAutoAdvanced && (
              <span className="px-2 py-0.5 bg-neonAmber/20 border border-neonAmber text-neonAmber font-orbitron font-black text-[9px] flex items-center gap-1 clip-cyber animate-pulse">
                <Zap className="w-3 h-3 text-neonAmber" />
                AUTO-ADVANCE
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-neonGreen font-bold px-2 py-0.5 bg-neonGreen/10 border border-neonGreen clip-cyber text-[10px]">
                <CheckCircle className="w-3.5 h-3.5" />
                SELESAI
              </span>
            ) : (
              <span className="flex items-center gap-1 text-neonAmber font-bold px-2 py-0.5 bg-neonAmber/10 border border-neonAmber clip-cyber text-[10px]">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                PENDING
              </span>
            )}
          </div>
        </div>

        {isAutoAdvanced && (
          <div className="px-2.5 py-1 bg-neonAmber/15 border border-neonAmber/60 text-neonAmber font-mono text-[10px] flex items-center gap-1.5 clip-cyber">
            <Zap className="w-3.5 h-3.5 text-neonAmber flex-shrink-0" />
            <span className="font-bold">⚡ AUTO-ADVANCE // 3 JALUR PEMBALAP SAMA</span>
          </div>
        )}

        {/* 3 Lane Rows */}
        <div className="space-y-2">
          {renderContestantRow(match, 'A', match.user_id_1, match.user_1_name, match.user_1_team)}
          {renderContestantRow(match, 'B', match.user_id_2, match.user_2_name, match.user_2_team)}
          {renderContestantRow(match, 'C', match.user_id_3, match.user_3_name, match.user_3_team)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert Toast */}
      {feedbackMsg && (
        <div className={clsx(
          "p-3 text-xs font-mono clip-cyber flex items-center gap-2 transition-all",
          feedbackMsg.type === 'success' 
            ? "bg-neonGreen/10 border border-neonGreen text-neonGreen shadow-glowGreen" 
            : "bg-red-950/40 border border-red-500 text-red-400"
        )}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Dynamic Round Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {availableRounds.map(rNum => {
          const isSelected = selectedRound === rNum;
          const isGF = rNum === highestRound && highestRound > 2;

          return (
            <button
              key={rNum}
              onClick={() => setSelectedRound(rNum)}
              className={clsx(
                "px-4 py-2 font-orbitron text-xs font-bold uppercase clip-cyber flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer",
                isSelected
                  ? isGF 
                    ? "bg-neonAmber text-black shadow-glowAmber"
                    : "bg-neonCyan text-black shadow-glowCyan"
                  : "bg-black/60 text-cyberSilver/60 hover:text-white border border-gray-800"
              )}
            >
              {isGF ? <Trophy className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
              <span>{getRoundLabel(rNum)}</span>
            </button>
          );
        })}
      </div>

      {/* Babak 2 Progress Banner (Sticky Toolbar when Babak 2 active) */}
      {selectedRound === 2 && (
        <div className="bg-obsidian border-2 border-neonCyan/50 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          {/* Left: Status Badge & Progress Counter */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-orbitron text-cyberSilver/70 uppercase tracking-widest">
                STATUS BABAK 2
              </div>
              <span className={clsx(
                "px-2.5 py-1 text-xs font-orbitron font-extrabold uppercase clip-cyber inline-flex items-center gap-1.5 mt-1 border",
                round2Progress.isLocked
                  ? "bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                  : "bg-neonCyan/20 text-neonCyan border-neonCyan shadow-glowCyan"
              )}>
                {round2Progress.isLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>STATUS: TERKUNCI (FINALIZED)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>STATUS: TERBUKA (OPEN)</span>
                  </>
                )}
              </span>
            </div>

            <div className="border-l border-gray-800 pl-4">
              <div className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
                <span>Progres: {round2Progress.completed} / {round2Progress.total} Heat Selesai</span>
                <span className="text-neonCyan">({round2Progress.percent}%)</span>
              </div>
              <div className="w-48 sm:w-64 h-2 bg-gray-900 border border-gray-700 clip-cyber overflow-hidden mt-1.5">
                <div 
                  className="h-full bg-gradient-to-r from-neonCyan via-neonGreen to-neonAmber transition-all duration-300"
                  style={{ width: `${round2Progress.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Lock / Emergency Unlock Button */}
          <div className="flex items-center gap-2">
            {!round2Progress.isLocked ? (
              <button
                onClick={() => setLockModalOpen(true)}
                disabled={!round2Progress.canFinalize}
                className={clsx(
                  "px-4 py-2.5 font-orbitron font-black text-xs uppercase clip-cyber flex items-center gap-2 transition-all cursor-pointer",
                  round2Progress.canFinalize
                    ? "bg-neonAmber text-black shadow-glowAmber hover:bg-neonAmber/90 animate-pulse active:scale-95"
                    : "bg-gray-800/80 text-cyberSilver/50 border border-gray-700 cursor-not-allowed opacity-60"
                )}
                title={round2Progress.canFinalize ? 'Finalisasi & Kunci Babak 2' : `Masih ada ${round2Progress.pending} heat pending`}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {round2Progress.canFinalize 
                    ? 'FINALISASI / KUNCI BABAK 2' 
                    : `KUNCI BABAK 2 (SISA ${round2Progress.pending} HEAT PENDING)`}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setUnlockModalOpen(true)}
                className="px-4 py-2.5 bg-red-600/30 hover:bg-red-600 hover:text-white text-red-400 border border-red-500 font-orbitron font-bold text-xs uppercase clip-cyber shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                title="Buka kembali kunci Babak 2 untuk revisi darurat"
              >
                <Unlock className="w-4 h-4" />
                <span>BUKA KUNCI BABAK 2 (EMERGENCY UNLOCK)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-obsidian/80 border border-gray-800 p-3 clip-cyber">
        {/* Instant Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-cyberSilver/60 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor heat (#12), nama pembalap, atau tim..."
            className="w-full bg-black/80 border border-gray-700 pl-9 pr-8 py-2 text-xs font-mono text-white clip-cyber focus:outline-none focus:border-neonCyan"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-cyberSilver/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'SEMUA' },
            { id: 'pending', label: 'PENDING' },
            { id: 'completed', label: 'SELESAI' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={clsx(
                "px-3 py-1.5 text-[11px] font-orbitron font-bold uppercase clip-cyber transition-all cursor-pointer",
                statusFilter === f.id
                  ? "bg-neonCyan text-black font-extrabold shadow-glowCyan"
                  : "bg-black/50 text-cyberSilver/60 hover:text-white border border-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Match Count Tag */}
        <div className="text-[11px] font-mono text-cyberSilver/70 hidden sm:block">
          Ditemukan: <strong className="text-neonCyan">{filteredMatches.length}</strong> Heat
        </div>
      </div>

      {/* 3-Lane Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="p-12 text-center bg-obsidian border border-gray-800 clip-cyber space-y-3">
          <AlertTriangle className="w-10 h-10 text-neonAmber mx-auto opacity-70" />
          <h3 className="text-lg font-orbitron font-black text-white">
            TIDAK ADA HEAT DITEMUKAN
          </h3>
          <p className="text-xs font-mono text-cyberSilver/70 max-w-md mx-auto">
            Tidak ada heat di babak ini yang cocok dengan kriteria pencarian.
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-1.5 bg-neonCyan/20 text-neonCyan border border-neonCyan clip-cyber text-xs font-orbitron uppercase hover:bg-neonCyan hover:text-black transition-all"
            >
              RESET PENCARIAN
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedMatches.map(match => renderMatchCard(match))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-800 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-black/60 hover:bg-neonCyan/20 text-cyberSilver hover:text-neonCyan border border-gray-800 clip-cyber font-orbitron text-xs flex items-center gap-1 disabled:opacity-40 disabled:hover:bg-black/60 disabled:hover:text-cyberSilver cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>SEBELUMNYA</span>
          </button>

          <span className="text-xs font-mono text-cyberSilver/70">
            Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong>
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 bg-black/60 hover:bg-neonCyan/20 text-cyberSilver hover:text-neonCyan border border-gray-800 clip-cyber font-orbitron text-xs flex items-center gap-1 disabled:opacity-40 disabled:hover:bg-black/60 disabled:hover:text-cyberSilver cursor-pointer"
          >
            <span>SELANJUTNYA</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lock Round 2 Confirmation Modal (RDELIM-04, D-04) */}
      {lockModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-obsidian border-2 border-neonAmber p-6 max-w-md w-full clip-cyber space-y-4 shadow-glowAmber">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neonAmber/20 border border-neonAmber flex items-center justify-center clip-cyber text-neonAmber">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-orbitron font-black text-white">
                  FINALISASI & KUNCI BABAK 2
                </h3>
                <p className="text-xs font-mono text-neonAmber">KONTRAK PENGAMANAN BAGAN</p>
              </div>
            </div>

            <p className="text-xs font-mono text-cyberSilver/90 leading-relaxed">
              Seluruh <strong className="text-neonCyan">{round2Progress.total}</strong> heat Babak 2 telah selesai. Mengunci Babak 2 akan membekukan hasil heat dan mengamankan bagan Babak 3 sebelum pertandingan dimulai. Lanjutkan?
            </p>

            {modalError && (
              <div className="p-2 bg-red-950/40 border border-red-500 text-red-400 text-xs font-mono clip-cyber">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
              <CyberButton
                variant="ghost"
                size="sm"
                onClick={() => setLockModalOpen(false)}
                disabled={modalLoading}
              >
                BATAL
              </CyberButton>
              <CyberButton
                variant="amber"
                size="sm"
                onClick={handleConfirmLock}
                disabled={modalLoading}
              >
                {modalLoading ? 'MEMPROSES...' : 'YA, KUNCI SEKARANG'}
              </CyberButton>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Unlock Round 2 Confirmation Modal (RDELIM-04, D-04) */}
      {unlockModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-obsidian border-2 border-red-500 p-6 max-w-md w-full clip-cyber space-y-4 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500 flex items-center justify-center clip-cyber text-red-400">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-orbitron font-black text-white">
                  BUKA KUNCI BABAK 2 (DARURAT)
                </h3>
                <p className="text-xs font-mono text-red-400">EMERGENCY OVERRIDE</p>
              </div>
            </div>

            <p className="text-xs font-mono text-cyberSilver/90 leading-relaxed">
              Yakin membuka kembali kunci Babak 2? Ini memungkinkan revisi pemenang heat Babak 2 jika terjadi kesalahan input lapangan.
            </p>

            {modalError && (
              <div className="p-2 bg-red-950/40 border border-red-500 text-red-400 text-xs font-mono clip-cyber">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
              <CyberButton
                variant="ghost"
                size="sm"
                onClick={() => setUnlockModalOpen(false)}
                disabled={modalLoading}
              >
                BATAL
              </CyberButton>
              <CyberButton
                variant="pink"
                size="sm"
                onClick={handleConfirmUnlock}
                disabled={modalLoading}
              >
                {modalLoading ? 'MEMPROSES...' : 'YA, BUKA SEKARANG'}
              </CyberButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
