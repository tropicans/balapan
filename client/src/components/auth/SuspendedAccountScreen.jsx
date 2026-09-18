import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldX, LogOut, Tv } from 'lucide-react';

export function SuspendedAccountScreen({ onNavigatePublic }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-obsidian/95 border border-red-500/60 clip-cyber p-6 sm:p-8 shadow-[0_0_25px_rgba(239,68,68,0.3)] relative backdrop-blur-xl text-center">
        <div className="w-14 h-14 bg-red-500/20 border-2 border-red-500 clip-cyber flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
          Akses Ditangguhkan
        </h2>

        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500 text-red-400 text-xs font-orbitron font-bold clip-cyber">
          STATUS: {user?.status?.toUpperCase() || 'SUSPENDED'}
        </div>

        <p className="text-xs font-mono text-cyberSilver/80 my-5 leading-relaxed">
          Akun Google (<span className="text-white font-bold">{user?.email}</span>) telah dinonaktifkan atau ditolak oleh administrator. Hubungi Super Admin (<span className="text-neonCyan">tropicans@gmail.com</span>) jika ini merupakan kekeliruan.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => logout()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-orbitron font-bold clip-cyber transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>KELUAR (LOGOUT)</span>
          </button>
          <button
            onClick={() => onNavigatePublic?.('tv')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-950/40 border border-cyan-500/40 text-neonCyan hover:bg-neonCyan hover:text-black text-xs font-orbitron font-bold clip-cyber transition"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>LAYAR TV SIRKUIT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
