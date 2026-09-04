import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCw, 
  AlertTriangle, 
  Tag, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { sound } from '../../utils/audio.js';
import clsx from 'clsx';

export function CouponPackageList({
  packages = [],
  loading = false,
  error = null,
  onRefresh,
  onOpenVoid
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed' | 'void'

  // Filter packages based on instant search query and status filter
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && pkg.status !== 'active') return false;
        if (statusFilter === 'completed' && pkg.status !== 'completed' && pkg.remaining_quota > 0) return false;
        if (statusFilter === 'void' && pkg.status !== 'void') return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchSerial = pkg.serial_number?.toLowerCase().includes(q);
      const matchRacer = pkg.user_name?.toLowerCase().includes(q);
      const matchTeam = pkg.team_name?.toLowerCase().includes(q);

      return matchSerial || matchRacer || matchTeam;
    });
  }, [packages, searchQuery, statusFilter]);

  // Zero-one-many dynamic counter per UI-SPEC
  const counterText = useMemo(() => {
    const count = packages.length;
    if (count === 0) return '0 Lembar Terdaftar';
    if (count === 1) return '1 Lembar Terdaftar';
    return `${count} Lembar Terdaftar`;
  }, [packages.length]);

  return (
    <div className="bg-obsidian border border-gray-800 p-4 md:p-5 clip-cyber relative flex flex-col space-y-4">
      {/* Header with dynamic counter and refresh button */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neonCyan/15 border border-neonCyan flex items-center justify-center clip-cyber">
            <Layers className="w-4 h-4 text-neonCyan" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-white text-sm md:text-base tracking-wider">
              LIVE FEED LEMBAR KUPON
            </h3>
            <p className="text-[11px] font-mono text-neonCyan font-bold">
              {counterText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playTone(600, 'sine', 0.04, 0.1);
            if (onRefresh) onRefresh();
          }}
          disabled={loading}
          title="Segarkan Data Lembar Kupon"
          aria-label="Segarkan Data Lembar Kupon"
          className="p-2 bg-black/40 border border-gray-700 hover:border-neonCyan text-gray-300 hover:text-neonCyan transition-all clip-cyber"
        >
          <RotateCw className={clsx("w-4 h-4", loading && "animate-spin text-neonCyan")} />
        </button>
      </div>

      {/* Instant Search Bar and Filter Chips */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor seri, nama pembalap, atau tim..."
            className="w-full bg-black/60 border border-gray-700 focus:border-neonCyan focus:ring-1 focus:ring-neonCyan text-white font-mono text-xs pl-9 pr-3 py-2.5 outline-none tracking-wide"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-gray-400 mr-1 hidden sm:inline">Filter:</span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'active', label: 'Aktif' },
            { id: 'completed', label: 'Habis' },
            { id: 'void', label: 'Void' },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setStatusFilter(chip.id);
                sound.playTone(500, 'sine', 0.03, 0.08);
              }}
              className={clsx(
                "px-2.5 py-1 transition-all clip-cyber font-bold",
                statusFilter === chip.id
                  ? "bg-neonAmber/25 text-neonAmber border border-neonAmber"
                  : "bg-black/40 text-gray-400 border border-gray-800 hover:text-white"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Package Card Feed List */}
      <div className="max-h-[580px] overflow-y-auto pr-1 space-y-2.5 scrollbar-cyber">
        {/* State: Loading Skeletons */}
        {loading && packages.length === 0 && (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3.5 bg-black/40 border border-gray-800 clip-cyber animate-pulse space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-24 bg-gray-800 rounded" />
                  <div className="h-5 w-16 bg-gray-800 rounded" />
                </div>
                <div className="h-4 w-40 bg-gray-800 rounded" />
                <div className="h-2 w-full bg-gray-800 rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* State: Error */}
        {error && (
          <div className="p-4 bg-neonPink/15 border border-neonPink text-white clip-cyber text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-neonPink mx-auto" />
            <p className="text-xs font-mono">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1 bg-neonPink/20 text-neonPink border border-neonPink text-xs font-orbitron font-bold hover:bg-neonPink/30 clip-cyber"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* State: Empty Feed (No packages registered at all) */}
        {!loading && !error && packages.length === 0 && (
          <div className="p-6 bg-black/40 border border-gray-800/80 clip-cyber text-center space-y-2 my-4">
            <FileText className="w-8 h-8 text-gray-600 mx-auto" />
            <h4 className="font-orbitron font-bold text-gray-300 text-sm tracking-wider">
              Belum Ada Paket Kupon Terdaftar
            </h4>
            <p className="text-xs font-mono text-gray-500 max-w-sm mx-auto leading-relaxed">
              Gunakan formulir registrasi di sisi kiri untuk mendaftarkan lembaran fisik kupon 50-kotak perdana peserta turnamen.
            </p>
          </div>
        )}

        {/* State: Search / Filter Empty */}
        {!loading && !error && packages.length > 0 && filteredPackages.length === 0 && (
          <div className="p-6 bg-black/40 border border-gray-800/80 clip-cyber text-center space-y-2 my-4">
            <Search className="w-8 h-8 text-gray-600 mx-auto" />
            <h4 className="font-orbitron font-bold text-gray-300 text-sm tracking-wider">
              Tidak Ditemukan Paket Kupon
            </h4>
            <p className="text-xs font-mono text-gray-500 max-w-sm mx-auto leading-relaxed">
              Tidak ada paket yang cocok dengan kriteria pencarian. Periksa ejaan nomor seri atau nama pembalap, atau reset filter status.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-3 py-1 bg-gray-800 text-gray-300 border border-gray-700 text-xs font-mono hover:text-white"
            >
              Reset Filter Pencarian
            </button>
          </div>
        )}

        {/* State: Populated Cards */}
        {filteredPackages.map(pkg => {
          const quotaPercent = Math.round((pkg.remaining_quota / pkg.total_quota) * 100) || 0;
          const isVoid = pkg.status === 'void';
          const isCompleted = pkg.status === 'completed' || pkg.remaining_quota <= 0;
          const isActive = pkg.status === 'active' && pkg.remaining_quota > 0;

          // Color coded quota depletion
          let barColor = "bg-neonCyan";
          if (quotaPercent <= 20) barColor = "bg-neonPink";
          else if (quotaPercent <= 50) barColor = "bg-neonAmber";
          if (isVoid) barColor = "bg-gray-600";

          return (
            <div
              key={pkg.id}
              className={clsx(
                "p-3.5 bg-black/60 border clip-cyber transition-all duration-200 relative group",
                isVoid
                  ? "border-gray-800 opacity-60"
                  : isActive
                  ? "border-gray-800 hover:border-neonAmber/60 hover:shadow-[0_0_12px_rgba(255,170,0,0.15)]"
                  : "border-gray-800/80 opacity-75"
              )}
            >
              {/* Card Header: Serial & Status Badge */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-neonAmber/15 border border-neonAmber/70 text-neonAmber font-mono font-black text-xs md:text-sm tracking-widest clip-cyber">
                    #{pkg.serial_number}
                  </span>

                  {/* Status Badge */}
                  {isActive && (
                    <span className="px-2 py-0.5 bg-neonCyan/15 border border-neonCyan/60 text-neonCyan font-orbitron font-bold text-[10px] tracking-wider clip-cyber">
                      AKTIF
                    </span>
                  )}
                  {isCompleted && !isVoid && (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 font-orbitron font-bold text-[10px] tracking-wider clip-cyber">
                      HABIS
                    </span>
                  )}
                  {isVoid && (
                    <span className="px-2 py-0.5 bg-neonPink/20 border border-neonPink/60 text-neonPink font-orbitron font-bold text-[10px] tracking-wider clip-cyber">
                      VOID
                    </span>
                  )}
                </div>

                {/* Emergency Void Button (only for active sheets with remaining quota) */}
                {isActive && (
                  <button
                    type="button"
                    onClick={() => onOpenVoid && onOpenVoid(pkg)}
                    title="Alur Darurat Void & Ganti Lembar"
                    aria-label="Alur Darurat Void & Ganti Lembar"
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-orbitron font-bold text-gray-400 hover:text-neonPink bg-black/40 border border-gray-800 hover:border-neonPink/60 transition-all clip-cyber"
                  >
                    <AlertTriangle className="w-3 h-3 text-neonPink" />
                    <span>Void / Ganti</span>
                  </button>
                )}
              </div>

              {/* Racer Name & Team Tag */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1.5 truncate max-w-[220px] sm:max-w-xs">
                  <span className="font-bold text-white font-mono truncate">
                    {pkg.user_name}
                  </span>
                  {pkg.team_name ? (
                    <span className="px-1.5 py-0.2 bg-gray-800 text-[10px] font-mono text-neonAmber border border-gray-700">
                      [{pkg.team_name}]
                    </span>
                  ) : (
                    <span className="px-1 py-0.2 bg-neonPink/10 text-[9px] font-mono text-neonPink border border-neonPink/30">
                      [NO TAG]
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono font-bold text-gray-300">
                  <span className={clsx(
                    isActive ? "text-neonAmber font-orbitron" : "text-gray-400"
                  )}>
                    {pkg.remaining_quota}
                  </span>
                  <span className="text-gray-500 font-normal"> / {pkg.total_quota} Kotak</span>
                </div>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full bg-gray-900 border border-gray-800 h-2 clip-cyber overflow-hidden">
                <div
                  className={clsx("h-full transition-all duration-500", barColor)}
                  style={{ width: `${Math.min(100, Math.max(0, quotaPercent))}%` }}
                />
              </div>

              {/* Void Reference tag if applicable */}
              {pkg.void_from_id && (
                <div className="mt-1.5 text-[10px] font-mono text-gray-500">
                  Transferred from previous voided sheet
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
