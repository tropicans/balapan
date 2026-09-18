import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Clock, ShieldAlert, LogOut, Tv, GitBranch, RefreshCw } from 'lucide-react';

export function PendingApprovalScreen({ onNavigatePublic }) {
  const { user, logout, refreshUser, loading } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-obsidian/95 border border-neonAmber/50 clip-cyber p-6 sm:p-8 shadow-glowAmber relative backdrop-blur-xl text-center">
        {/* Amber corner accent */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-neonAmber/20 border-t-2 border-r-2 border-neonAmber" />

        {/* Pulse / Status Icon */}
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-amber-500/15 border-2 border-neonAmber clip-cyber flex items-center justify-center mx-auto shadow-glowAmber">
            <Clock className="w-8 h-8 text-neonAmber animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-neonAmber rounded-full border-2 border-black animate-ping" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-orbitron font-black text-white tracking-wider uppercase">
          Menunggu Persetujuan Admin
        </h2>

        {/* Status Badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-neonAmber text-neonAmber text-xs font-orbitron font-bold clip-cyber">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>STATUS: PENDING APPROVAL</span>
        </div>

        {/* User Card */}
        <div className="my-6 p-4 bg-midnight/80 border border-gray-800 clip-cyber flex items-center gap-3.5 text-left">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full border border-neonAmber/60 object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-neonAmber/20 border border-neonAmber flex items-center justify-center text-neonAmber font-bold text-lg flex-shrink-0">
              {user?.name ? user.name[0] : 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-orbitron font-bold text-white text-sm truncate">
              {user?.name || 'Pengguna Baru'}
            </div>
            <div className="font-mono text-xs text-cyberSilver/80 truncate">
              {user?.email}
            </div>
            <div className="text-[10px] font-mono text-neonAmber mt-0.5">
              ID Akun Google: {user?.google_id || 'Tersambung'}
            </div>
          </div>
        </div>

        {/* Explanatory Message */}
        <div className="text-xs font-mono text-cyberSilver/90 leading-relaxed bg-black/40 border border-gray-800/80 p-3.5 clip-cyber text-left space-y-2">
          <p>
            Akun Google Anda telah berhasil diverifikasi, namun membutuhkan izin persetujuan operasional dari Super Admin:
          </p>
          <div className="font-bold text-neonCyan font-mono bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/50">
            tropicans@gmail.com
          </div>
          <p className="text-[11px] text-cyberSilver/70">
            Setelah disetujui dan diberikan peran (Kasir, Race Director, Scrutineer, atau Co-Admin), layar ini akan langsung terbuka secara otomatis tanpa perlu refresh.
          </p>
        </div>

        {/* Refresh & Logout Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => refreshUser()}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-neonCyan/20 border border-neonCyan text-neonCyan hover:bg-neonCyan hover:text-black text-xs font-orbitron font-bold clip-cyber transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>CEK STATUS TERKINI</span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-950/40 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white text-xs font-orbitron font-bold clip-cyber transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>KELUAR (LOGOUT)</span>
          </button>
        </div>

        {/* Public Screens Navigation */}
        <div className="mt-6 pt-5 border-t border-gray-800/80 text-center">
          <span className="text-[11px] font-mono text-cyberSilver/60 block mb-2.5">
            Sambil menunggu, Anda dapat memantau arena balap secara publik:
          </span>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onNavigatePublic?.('tv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/30 hover:border-neonCyan text-cyan-300 text-xs font-mono clip-cyber transition"
            >
              <Tv className="w-3.5 h-3.5 text-neonCyan" />
              <span>Layar TV Sirkuit</span>
            </button>
            <button
              onClick={() => onNavigatePublic?.('bracket')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-950/40 border border-pink-500/30 hover:border-neonPink text-pink-300 text-xs font-mono clip-cyber transition"
            >
              <GitBranch className="w-3.5 h-3.5 text-neonPink" />
              <span>Bagan Eliminasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
