import React from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { GitBranch, Trophy, Zap, Crown, UserCheck } from 'lucide-react';
import clsx from 'clsx';

export function BracketDashboard() {
  const { raceState, apiAdvanceBracket } = useRace();
  const matches = raceState.bracketMatches || [];

  const round1Matches = matches.filter(m => m.round_number === 1);
  const round2Matches = matches.filter(m => m.round_number === 2);
  const round3Matches = matches.filter(m => m.round_number === 3);

  const handleSelectWinner = async (matchId, winnerId) => {
    if (!winnerId) return;
    try {
      await apiAdvanceBracket(matchId, winnerId);
    } catch (err) {
      alert(err.message);
    }
  };

  const renderMatchCard = (match, label) => {
    const isCompleted = match.status === 'completed';
    const winnerId = match.winner_id;

    return (
      <div
        key={match.id}
        className={clsx(
          "p-3.5 bg-obsidian border clip-cyber space-y-2 relative transition-all",
          isCompleted ? "border-neonGreen/60 bg-neonGreen/5 shadow-glowGreen" : "border-gray-800 hover:border-neonPink/50"
        )}
      >
        <div className="flex items-center justify-between text-[10px] font-orbitron text-cyberSilver/60 border-b border-gray-800 pb-1">
          <span>{label} • MATCH #{match.match_number}</span>
          <span className={clsx(isCompleted ? "text-neonGreen font-bold" : "text-neonAmber")}>
            {isCompleted ? 'SELESAI' : 'PENDING'}
          </span>
        </div>

        {/* Competitor 1 */}
        <div className={clsx(
          "p-2 bg-black/60 border clip-cyber flex items-center justify-between",
          match.user_1_name ? "text-white" : "text-gray-600",
          winnerId === match.user_id_1 ? "border-neonGreen text-neonGreen font-bold" : "border-gray-800"
        )}>
          <div>
            <div className="text-xs font-orbitron truncate max-w-[140px]">
              {match.user_1_name || 'Menunggu Pemenang Babak 1...'}
            </div>
            {match.user_1_team && (
              <div className="text-[10px] font-mono text-neonPink">[{match.user_1_team}]</div>
            )}
          </div>
          {match.user_1_name && !isCompleted && (
            <button
              onClick={() => handleSelectWinner(match.id, match.user_id_1)}
              className="px-2 py-0.5 text-[10px] font-orbitron bg-neonGreen/20 text-neonGreen hover:bg-neonGreen hover:text-black clip-cyber border border-neonGreen"
            >
              MENANG
            </button>
          )}
          {winnerId === match.user_id_1 && <Crown className="w-4 h-4 text-neonGreen" />}
        </div>

        {/* Competitor 2 */}
        <div className={clsx(
          "p-2 bg-black/60 border clip-cyber flex items-center justify-between",
          match.user_2_name ? "text-white" : "text-gray-600",
          winnerId === match.user_id_2 ? "border-neonGreen text-neonGreen font-bold" : "border-gray-800"
        )}>
          <div>
            <div className="text-xs font-orbitron truncate max-w-[140px]">
              {match.user_2_name || 'Menunggu Pemenang Babak 1...'}
            </div>
            {match.user_2_team && (
              <div className="text-[10px] font-mono text-neonPink">[{match.user_2_team}]</div>
            )}
          </div>
          {match.user_2_name && !isCompleted && (
            <button
              onClick={() => handleSelectWinner(match.id, match.user_id_2)}
              className="px-2 py-0.5 text-[10px] font-orbitron bg-neonGreen/20 text-neonGreen hover:bg-neonGreen hover:text-black clip-cyber border border-neonGreen"
            >
              MENANG
            </button>
          )}
          {winnerId === match.user_id_2 && <Crown className="w-4 h-4 text-neonGreen" />}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="bg-obsidian border border-neonPink/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonPink/20 border border-neonPink flex items-center justify-center clip-cyber">
            <GitBranch className="w-6 h-6 text-neonPink" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-orbitron font-black text-white">
              BRACKET TURNAMEN BABAK 2 // SINGLE ELIMINATION
            </h2>
            <p className="text-xs font-mono text-neonPink">
              Pemenang Babak 1 yang Lolos Scrutineer Masuk Otomatis Tanpa Kupon
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-neonPink/20 text-neonPink border border-neonPink clip-cyber text-xs font-orbitron font-bold">
          TOURNAMENT TREE
        </span>
      </div>

      {/* Bracket Tree Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Round 1: Quarterfinals */}
        <div className="space-y-4">
          <div className="text-sm font-orbitron font-bold text-neonCyan flex items-center gap-2 border-b border-gray-800 pb-2">
            <Zap className="w-4 h-4" />
            <span>QUARTERFINALS (4 MATCHES)</span>
          </div>
          <div className="space-y-3">
            {round1Matches.map((m, idx) => renderMatchCard(m, `QF ${idx + 1}`))}
          </div>
        </div>

        {/* Round 2: Semifinals */}
        <div className="space-y-4">
          <div className="text-sm font-orbitron font-bold text-neonAmber flex items-center gap-2 border-b border-gray-800 pb-2">
            <Zap className="w-4 h-4" />
            <span>SEMIFINALS (2 MATCHES)</span>
          </div>
          <div className="space-y-3 md:pt-12">
            {round2Matches.map((m, idx) => renderMatchCard(m, `SF ${idx + 1}`))}
          </div>
        </div>

        {/* Round 3: Grand Final */}
        <div className="space-y-4">
          <div className="text-sm font-orbitron font-bold text-neonGreen flex items-center gap-2 border-b border-gray-800 pb-2">
            <Trophy className="w-4 h-4 text-neonAmber" />
            <span>GRAND FINAL (CHAMPIONSHIP)</span>
          </div>
          <div className="space-y-3 md:pt-28">
            {round3Matches.map((m) => renderMatchCard(m, 'GRAND FINAL'))}
          </div>
        </div>
      </div>
    </div>
  );
}
