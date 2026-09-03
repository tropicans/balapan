import React, { useState, useMemo, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
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
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

export function BracketDashboard() {
  const { raceState, apiAdvanceBracket } = useRace();
  const matches = raceState.bracketMatches || [];

  // 1. Determine all unique rounds present in matches (sorted numerically)
  const availableRounds = useMemo(() => {
    const roundSet = new Set(matches.map(m => m.round_number));
    // If no rounds exist yet, default to Round 2 & 3
    if (roundSet.size === 0) return [2, 3];
    return Array.from(roundSet).sort((a, b) => a - b);
  }, [matches]);

  const highestRound = useMemo(() => {
    return availableRounds.length > 0 ? Math.max(...availableRounds) : 3;
  }, [availableRounds]);

  // Round Selector State (defaults to first available round, usually Round 2)
  const [selectedRound, setSelectedRound] = useState(availableRounds[0] || 2);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [currentPage, setCurrentPage] = useState(1);
  const [advancingMatchId, setAdvancingMatchId] = useState(null);

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

      return false;
    });
  }, [currentRoundMatches, searchQuery, statusFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE) || 1;
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMatches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMatches, currentPage]);

  // Handle advancing winner
  const handleSelectWinner = async (match, winnerId) => {
    if (!winnerId || match.status === 'completed' || advancingMatchId) return;
    setAdvancingMatchId(match.id);
    try {
      const isFinal = match.is_final === 1 || match.round_number === highestRound;
      await apiAdvanceBracket(match.id, winnerId, { isFinal });
    } catch (err) {
      alert(err.message || 'Gagal memajukan pemenang bracket');
    } finally {
      setAdvancingMatchId(null);
    }
  };

  // Helper to format tab label
  const getRoundLabel = (roundNum) => {
    if (roundNum === highestRound && highestRound > 2) {
      return `GRAND FINAL (BABAK ${roundNum})`;
    }
    if (roundNum === 2) {
      return `BABAK 2 // PENYISIHAN 3-JALUR`;
    }
    if (roundNum === 3 && highestRound > 3) {
      return `BABAK 3 // PEREMPAT FINAL`;
    }
    if (roundNum === 3 && highestRound === 3) {
      return `GRAND FINAL (BABAK 3)`;
    }
    return `BABAK ${roundNum} // ELIMINASI`;
  };

  // Stats for the round
  const roundStats = useMemo(() => {
    const total = currentRoundMatches.length;
    const completed = currentRoundMatches.filter(m => m.status === 'completed').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [currentRoundMatches]);

  // Single Contestant Row inside a 3-lane match card
  const renderContestantRow = (match, lane, userId, userName, userTeam) => {
    const isCompleted = match.status === 'completed';
    const isWinner = match.winner_id === userId && !!userId;
    const hasContestant = !!userName;

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

    const cfg = laneConfigs[lane];

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
            <div className={clsx(
              "text-xs font-orbitron truncate",
              hasContestant ? (isWinner ? "text-neonGreen font-black" : "text-white") : "text-gray-600 italic text-[11px]"
            )}>
              {userName || (selectedRound === 2 ? 'Menunggu Lolos Babak 1...' : 'Menunggu Pemenang Heat...')}
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
          {hasContestant && !isCompleted && (
            <button
              onClick={() => handleSelectWinner(match, userId)}
              disabled={advancingMatchId === match.id}
              className="px-2.5 py-1 text-[10px] font-orbitron font-bold bg-neonGreen/20 text-neonGreen hover:bg-neonGreen hover:text-black clip-cyber border border-neonGreen transition-all active:scale-95 disabled:opacity-50"
            >
              MENANG
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

  // Render Match Card for a 3-lane match
  const renderMatchCard = (match) => {
    const isCompleted = match.status === 'completed';
    const isFinalMatch = match.is_final === 1 || match.round_number === highestRound;

    return (
      <div
        key={match.id}
        className={clsx(
          "p-4 bg-obsidian border clip-cyber space-y-2.5 relative transition-all duration-200",
          isCompleted 
            ? "border-neonGreen/50 bg-neonGreen/5 shadow-glowGreen" 
            : isFinalMatch 
              ? "border-neonAmber/60 bg-neonAmber/5 shadow-glowAmber" 
              : "border-gray-800 hover:border-neonCyan/50"
        )}
      >
        {/* Match Header */}
        <div className="flex items-center justify-between text-[11px] font-orbitron border-b border-gray-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold tracking-wider">
              HEAT #{match.match_number}
            </span>
            {isFinalMatch && (
              <span className="px-1.5 py-0.2 bg-neonAmber/20 text-neonAmber border border-neonAmber clip-cyber text-[9px] font-black flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                GRAND FINAL
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-neonGreen font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                SELESAI
              </span>
            ) : (
              <span className="flex items-center gap-1 text-neonAmber font-bold">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                PENDING
              </span>
            )}
          </div>
        </div>

        {/* 3 Lane Competitor Rows */}
        <div className="space-y-2">
          {renderContestantRow(match, 'A', match.user_id_1, match.user_1_name, match.user_1_team)}
          {renderContestantRow(match, 'B', match.user_id_2, match.user_2_name, match.user_2_team)}
          {renderContestantRow(match, 'C', match.user_id_3, match.user_3_name, match.user_3_team)}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Title & Status Header Banner */}
      <div className="bg-obsidian border border-neonPink/40 p-5 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(255,0,85,0.15)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-neonPink/20 border border-neonPink flex items-center justify-center clip-cyber flex-shrink-0 shadow-glowPink">
            <GitBranch className="w-7 h-7 text-neonPink" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-orbitron font-black tracking-wider text-white">
                BABAK ELIMINASI // TOURNAMENT BRACKET
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-neonCyan/20 text-neonCyan border border-neonCyan clip-cyber text-[10px] font-orbitron font-bold">
                3-LANE SYSTEM
              </span>
            </div>
            <p className="text-xs font-mono text-cyberSilver/80 mt-1">
              Sistem Gugur 3-Jalur (Line A Pink, Line B Cyan, Line C Green) • Auto-Advance Berjenjang 3:1 ke Grand Final
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-[10px] font-mono text-cyberSilver/60">TOTAL MATCH TERDATA</div>
            <div className="text-base font-orbitron font-black text-neonCyan">{matches.length} Pertandingan</div>
          </div>
          <span className="px-3 py-1.5 bg-neonPink/20 text-neonPink border border-neonPink clip-cyber text-xs font-orbitron font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-neonPink animate-spin" style={{ animationDuration: '6s' }} />
            LIVE ENGINE
          </span>
        </div>
      </div>

      {/* 1. Dynamic Round Selector Tabs (ELIM-04) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800 scrollbar-none">
        {availableRounds.map(roundNum => {
          const roundMatches = matches.filter(m => m.round_number === roundNum);
          const totalCount = roundMatches.length;
          const completedCount = roundMatches.filter(m => m.status === 'completed').length;
          const isActive = selectedRound === roundNum;
          const isGrandFinal = roundNum === highestRound && highestRound > 2;

          return (
            <button
              key={roundNum}
              onClick={() => setSelectedRound(roundNum)}
              className={clsx(
                "px-4 py-2.5 clip-cyber font-orbitron text-xs md:text-sm font-bold flex items-center gap-2.5 transition-all whitespace-nowrap select-none",
                isActive 
                  ? (isGrandFinal 
                      ? "bg-neonAmber/20 text-white border-2 border-neonAmber shadow-glowAmber" 
                      : "bg-neonCyan/20 text-white border-2 border-neonCyan shadow-glowCyan")
                  : "bg-midnight/70 text-cyberSilver/70 border border-gray-800 hover:border-gray-700 hover:text-white"
              )}
            >
              {isGrandFinal ? (
                <Trophy className={clsx("w-4 h-4", isActive ? "text-neonAmber" : "text-cyberSilver/60")} />
              ) : (
                <Zap className={clsx("w-4 h-4", isActive ? "text-neonCyan" : "text-cyberSilver/60")} />
              )}
              <span>{getRoundLabel(roundNum)}</span>
              <span className={clsx(
                "px-2 py-0.5 text-[10px] font-mono clip-cyber ml-1",
                isActive ? "bg-black/80 text-neonCyan border border-neonCyan/60 font-bold" : "bg-black/50 text-gray-400"
              )}>
                {totalCount} Heat ({completedCount} ✓)
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Search, Filter & Quick Stats Toolbar (ELIM-06) */}
      <div className="bg-midnight/90 border border-gray-800 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-cyberSilver/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor heat (#12), nama pembalap, atau tim..."
            className="w-full pl-9 pr-8 py-2 bg-black/60 border border-gray-700 clip-cyber text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-neonCyan focus:ring-1 focus:ring-neonCyan"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 border border-gray-800 clip-cyber text-xs font-orbitron">
          <button
            onClick={() => setStatusFilter('all')}
            className={clsx(
              "px-3 py-1.5 clip-cyber transition-all",
              statusFilter === 'all' ? "bg-neonCyan/20 text-neonCyan font-bold border border-neonCyan/60" : "text-gray-400 hover:text-white"
            )}
          >
            SEMUA ({roundStats.total})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={clsx(
              "px-3 py-1.5 clip-cyber transition-all",
              statusFilter === 'pending' ? "bg-neonAmber/20 text-neonAmber font-bold border border-neonAmber/60" : "text-gray-400 hover:text-white"
            )}
          >
            PENDING ({roundStats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={clsx(
              "px-3 py-1.5 clip-cyber transition-all",
              statusFilter === 'completed' ? "bg-neonGreen/20 text-neonGreen font-bold border border-neonGreen/60" : "text-gray-400 hover:text-white"
            )}
          >
            SELESAI ({roundStats.completed})
          </button>
        </div>

        {/* Quick Stats Counter */}
        <div className="text-xs font-mono text-cyberSilver/70 flex items-center gap-2">
          <span>Menampilkan <strong className="text-white font-orbitron">{filteredMatches.length}</strong> heat</span>
          {filteredMatches.length > ITEMS_PER_PAGE && (
            <span className="text-gray-500">• Halaman {currentPage} dari {totalPages}</span>
          )}
        </div>
      </div>

      {/* 3. Heat Grid (ELIM-05 & ELIM-06) */}
      {filteredMatches.length === 0 ? (
        <div className="bg-obsidian border border-gray-800 p-12 clip-cyber text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-gray-900 border border-gray-700 flex items-center justify-center clip-cyber text-gray-500">
            <Search className="w-6 h-6" />
          </div>
          <div className="text-base font-orbitron font-bold text-white">
            TIDAK ADA HEAT DITEMUKAN
          </div>
          <p className="text-xs font-mono text-gray-400 max-w-md mx-auto">
            {searchQuery 
              ? `Tidak ada heat di babak ini yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain atau reset filter.` 
              : 'Belum ada heat yang dialokasikan di babak ini. Selesaikan pertandingan babak sebelumnya atau loloskan pembalap dari Scrutineer.'}
          </p>
          {searchQuery && (
            <CyberButton size="sm" variant="cyan" onClick={() => setSearchQuery('')}>
              Reset Pencarian
            </CyberButton>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {paginatedMatches.map(match => renderMatchCard(match))}
        </div>
      )}

      {/* 4. Cyberpunk Pagination Controls (ELIM-06) */}
      {totalPages > 1 && (
        <div className="bg-midnight border border-gray-800 p-3 clip-cyber flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-obsidian border border-gray-700 clip-cyber text-xs font-orbitron font-bold text-white flex items-center gap-1.5 hover:border-neonCyan disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>SEBELUMNYA</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyberSilver/70">
              HALAMAN <strong className="text-neonCyan font-orbitron">{currentPage}</strong> DARI <strong className="text-white font-orbitron">{totalPages}</strong>
            </span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-obsidian border border-gray-700 clip-cyber text-xs font-orbitron font-bold text-white flex items-center gap-1.5 hover:border-neonCyan disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span>BERIKUTNYA</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
