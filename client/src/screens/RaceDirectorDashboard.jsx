import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { 
  Lock,
  Unlock, 
  CheckCircle, 
  AlertCircle,
  ShieldAlert,
  Trophy,
  GitBranch
} from 'lucide-react';
import clsx from 'clsx';
import { EliminationManager } from '../components/director/EliminationManager.jsx';
import { BtoManager } from '../components/director/BtoManager.jsx';

export function RaceDirectorDashboard() {
  const {
    socket,
    apiLockQualifying,
    apiUnlockQualifying
  } = useRace();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [qualifyingLocked, setQualifyingLocked] = useState(false);
  const [lockQualifyingModalOpen, setLockQualifyingModalOpen] = useState(false);
  const [unlockQualifyingModalOpen, setUnlockQualifyingModalOpen] = useState(false);
  const [rdTab, setRdTab] = useState('elimination'); // 'elimination' or 'bto'

  // Fetch initial qualifying lock status
  useEffect(() => {
    fetch('/api/tickets')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setQualifyingLocked(Boolean(res.data.is_locked));
        }
      })
      .catch(() => {});
  }, []);

  // Real-time listener for qualifying lock/unlock
  useEffect(() => {
    if (!socket) return;
    const handleLocked = () => setQualifyingLocked(true);
    const handleUnlocked = () => setQualifyingLocked(false);
    socket.on('qualifying:locked', handleLocked);
    socket.on('qualifying:unlocked', handleUnlocked);
    return () => {
      socket.off('qualifying:locked', handleLocked);
      socket.off('qualifying:unlocked', handleUnlocked);
    };
  }, [socket]);

  // Handle Lock Qualifying
  const handleLockQualifying = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiLockQualifying();
      setQualifyingLocked(true);
      setLockQualifyingModalOpen(false);
      setSuccessMsg(res.message || 'Kualifikasi Babak 1 berhasil dikunci. Bagan Babak 2 telah difinalisasi.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Unlock Qualifying
  const handleUnlockQualifying = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiUnlockQualifying();
      setQualifyingLocked(false);
      setUnlockQualifyingModalOpen(false);
      setSuccessMsg(res.message || 'Kualifikasi Babak 1 berhasil dibuka kembali.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* 1. Header Banner & Global Qualifying Controls */}
      <div className="bg-obsidian border border-neonCyan/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
        <div>
          <div className="text-xs font-orbitron text-neonCyan tracking-widest uppercase">
            PUSAT KOMANDO // RACE DIRECTOR COMMAND DESK
          </div>
          <h2 className="text-2xl md:text-3xl font-orbitron font-black text-white">
            MANAJEMEN PERTANDINGAN
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyberSilver/70">KUALIFIKASI BABAK 1:</span>
            <span className={clsx(
              "px-3 py-1 text-xs font-orbitron font-extrabold uppercase clip-cyber border",
              qualifyingLocked 
                ? "bg-red-500/20 text-red-400 border-red-500" 
                : "bg-neonGreen/20 text-neonGreen border-neonGreen shadow-glowGreen"
            )}>
              {qualifyingLocked ? 'TERKUNCI (FINALIZED)' : 'TERBUKA (OPEN)'}
            </span>
          </div>

          {qualifyingLocked ? (
            <button
              onClick={() => setUnlockQualifyingModalOpen(true)}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-orbitron font-bold flex items-center gap-1.5 clip-cyber border bg-neonCyan/20 text-neonCyan hover:bg-neonCyan hover:text-black border-neonCyan shadow-glowCyan transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Buka kembali pendaftaran Kualifikasi Babak 1"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>BUKA KUALIFIKASI</span>
            </button>
          ) : (
            <button
              onClick={() => setLockQualifyingModalOpen(true)}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-orbitron font-bold flex items-center gap-1.5 clip-cyber border bg-neonAmber/20 text-neonAmber hover:bg-neonAmber hover:text-black border-neonAmber shadow-glowAmber transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Kunci Kualifikasi Babak 1 & Finalisasi Bagan Babak 2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>KUNCI KUALIFIKASI</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-500 text-red-400 text-xs font-mono clip-cyber flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-neonGreen/10 border border-neonGreen text-neonGreen text-xs font-mono clip-cyber flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs (Elimination Command Center vs BTO Management) */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setRdTab('elimination')}
          className={clsx(
            "px-4 py-2 font-orbitron text-xs font-bold uppercase clip-cyber flex items-center gap-2 transition-all cursor-pointer",
            rdTab === 'elimination'
              ? "bg-neonCyan text-black shadow-glowCyan font-black"
              : "bg-black/60 text-cyberSilver/60 hover:text-white border border-gray-800"
          )}
        >
          <GitBranch className="w-4 h-4" />
          <span>PUSAT KOMANDO ELIMINASI</span>
        </button>

        <button
          onClick={() => setRdTab('bto')}
          className={clsx(
            "px-4 py-2 font-orbitron text-xs font-bold uppercase clip-cyber flex items-center gap-2 transition-all cursor-pointer",
            rdTab === 'bto'
              ? "bg-neonAmber text-black shadow-glowAmber font-black"
              : "bg-black/60 text-cyberSilver/60 hover:text-white border border-gray-800"
          )}
        >
          <Trophy className="w-4 h-4" />
          <span>MANAJEMEN BTO MANUAL (v3.0)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {rdTab === 'bto' ? (
        <BtoManager />
      ) : (
        <EliminationManager />
      )}

      {/* Lock Qualifying Confirmation Modal */}
      {lockQualifyingModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-obsidian border-2 border-neonAmber p-6 max-w-md w-full clip-cyber space-y-4 shadow-glowAmber">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neonAmber/20 border border-neonAmber flex items-center justify-center clip-cyber text-neonAmber">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-orbitron font-black text-white">KUNCI KUALIFIKASI</h3>
                <p className="text-xs font-mono text-neonAmber">FINALISASI BAGAN BABAK 2</p>
              </div>
            </div>

            <p className="text-xs font-mono text-cyberSilver/90 leading-relaxed">
              Apakah Anda yakin ingin mengunci Kualifikasi Babak 1?
              <br /><br />
              • Penerbitan tiket Babak 2 baru akan <strong className="text-white">DIBEKUKAN</strong>.
              <br />
              • Slot kosong pada match terakhir Babak 2 akan ditetapkan sebagai <strong className="text-neonAmber">Bye Otomatis</strong>.
              <br />
              • Bagan eliminasi Babak 2 resmi siap dipertandingkan.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
              <CyberButton
                variant="ghost"
                size="sm"
                onClick={() => setLockQualifyingModalOpen(false)}
                disabled={loading}
              >
                BATAL
              </CyberButton>
              <CyberButton
                variant="amber"
                size="sm"
                onClick={handleLockQualifying}
                disabled={loading}
              >
                {loading ? 'MEMPROSES...' : 'YA, KUNCI SEKARANG'}
              </CyberButton>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Qualifying Confirmation Modal */}
      {unlockQualifyingModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-obsidian border-2 border-neonCyan p-6 max-w-md w-full clip-cyber space-y-4 shadow-glowCyan">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber text-neonCyan">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-orbitron font-black text-white">BUKA KUALIFIKASI</h3>
                <p className="text-xs font-mono text-neonCyan">BUKA KEMBALI BABAK 1</p>
              </div>
            </div>

            <p className="text-xs font-mono text-cyberSilver/90 leading-relaxed">
              Apakah Anda yakin ingin membuka kembali Kualifikasi Babak 1?
              <br /><br />
              • Status kualifikasi akan kembali aktif (<strong className="text-neonGreen">OPEN</strong>).
              <br />
              • Penerbitan tiket dan pendaftaran peserta Babak 2 dapat dilanjutkan kembali.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
              <CyberButton
                variant="ghost"
                size="sm"
                onClick={() => setUnlockQualifyingModalOpen(false)}
                disabled={loading}
              >
                BATAL
              </CyberButton>
              <CyberButton
                variant="cyan"
                size="sm"
                onClick={handleUnlockQualifying}
                disabled={loading}
              >
                {loading ? 'MEMPROSES...' : 'YA, BUKA SEKARANG'}
              </CyberButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
