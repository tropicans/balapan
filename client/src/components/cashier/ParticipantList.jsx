import React, { useState, useEffect } from 'react';
import { Search, Edit3, X, RefreshCw, Loader2, Users } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';

export function ParticipantList({
  participants = [],
  loading = false,
  searchQuery = '',
  onSearchChange,
  onEditParticipant,
  onRefresh
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync prop changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // 200ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const handleClear = () => {
    setLocalSearch('');
    if (onSearchChange) onSearchChange('');
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-obsidian border border-neonCyan/40 clip-cyber p-4 md:p-5 space-y-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-neonCyan" />
          <h3 className="text-sm md:text-base font-orbitron font-black text-white tracking-wider">
            DAFTAR PESERTA // LIVE ROSTER
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <CyberButton
            variant="dark"
            size="sm"
            onClick={onRefresh}
            icon={loading ? Loader2 : RefreshCw}
            disabled={loading}
          >
            {loading ? 'MEMUAT...' : 'REFRESH'}
          </CyberButton>
        </div>
      </div>

      {/* Omni-Search Bar (D-06) */}
      <div className="relative">
        <Search className="w-4 h-4 text-neonCyan/70 absolute left-3 top-3.5" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Cari #nomor atau nama/tim (omni-search)..."
          className="w-full bg-black/80 border border-neonCyan/60 pl-9 pr-9 py-2.5 text-xs md:text-sm font-mono text-white clip-cyber focus:outline-none focus:border-neonCyan focus:ring-1 focus:ring-neonCyan"
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="border border-gray-800 bg-black/50 clip-cyber overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/90 text-gray-400 uppercase text-[11px] font-orbitron tracking-wider sticky top-0 border-b border-gray-800 z-10">
              <tr>
                <th className="py-2.5 px-3"># No</th>
                <th className="py-2.5 px-3">Nama Pembalap</th>
                <th className="py-2.5 px-3">Tim / Tag</th>
                <th className="py-2.5 px-3 text-right">Waktu</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading && participants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-neonCyan mx-auto" />
                    <div>Memuat daftar peserta...</div>
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 space-y-1">
                    <div className="font-orbitron text-gray-300">TIDAK ADA DATA PESERTA</div>
                    <div className="text-[11px] text-gray-500">
                      {localSearch ? 'Tidak ada peserta yang cocok dengan kata kunci pencarian.' : 'Belum ada peserta terdaftar pada event aktif.'}
                    </div>
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-neonCyan/5 transition-colors group"
                  >
                    {/* Column #: D-02 giant bold cyan */}
                    <td className="py-2.5 px-3 font-orbitron font-black text-neonCyan text-sm md:text-base">
                      #{p.participant_number}
                    </td>

                    {/* Column Nama */}
                    <td className="py-2.5 px-3 font-bold text-white uppercase truncate max-w-[180px]">
                      {p.name}
                    </td>

                    {/* Column Tim: D-05 */}
                    <td className="py-2.5 px-3 font-mono text-neonPink">
                      {p.team_name ? `[${p.team_name}]` : '-'}
                    </td>

                    {/* Column Waktu */}
                    <td className="py-2.5 px-3 text-right text-gray-400 whitespace-nowrap">
                      {formatTime(p.created_at)}
                    </td>

                    {/* Column Aksi: D-12 */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTone(600, 'sine', 0.05, 0.1);
                          if (onEditParticipant) onEditParticipant(p);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/60 border border-gray-700 hover:border-neonCyan hover:text-neonCyan text-gray-300 font-orbitron text-[10px] tracking-wider uppercase transition-colors clip-cyber"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
