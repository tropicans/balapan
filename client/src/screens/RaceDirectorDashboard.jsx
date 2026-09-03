import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { 
  Lock, 
  Play, 
  CheckCircle, 
  RotateCcw, 
  Square, 
  UserPlus, 
  Trash2, 
  Timer, 
  Zap, 
  Users, 
  AlertCircle,
  Clock,
  Search
} from 'lucide-react';
import clsx from 'clsx';

export function RaceDirectorDashboard() {
  const {
    raceState,
    apiLockRace,
    apiStartRace,
    apiSubmitFinish,
    apiDeclareAllCO,
    apiDeclareReRace,
    apiAdminOverride,
    apiStartCountdown,
    apiResetCountdown,
    apiStopCountdown
  } = useRace();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Finish times input state
  const [finishTimes, setFinishTimes] = useState({ A: '', B: '', C: '' });

  // Re-Race Modal State
  const [reRaceModalOpen, setReRaceModalOpen] = useState(false);
  const [selectedReRaceLanes, setSelectedReRaceLanes] = useState({ A: true, B: true, C: true });

  // Admin Override Modal
  const [overrideLane, setOverrideLane] = useState(null); // 'A', 'B', or 'C'
  const [userList, setUserList] = useState([]);
  const [searchUser, setSearchUser] = useState('');

  const activeRace = raceState.activeRace;
  const activeRaceId = activeRace?.id;
  const activeRaceNum = activeRace?.race_number || 1;
  const raceStatus = activeRace?.status || 'draft';
  const registrations = activeRace?.registrations || [];

  const laneA = registrations.find(r => r.lane === 'A');
  const laneB = registrations.find(r => r.lane === 'B');
  const laneC = registrations.find(r => r.lane === 'C');

  // Fetch users for admin override
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUserList(data.data);
      })
      .catch(() => {});
  }, [overrideLane]);

  // Handle Finish Time Submission
  const handleSubmitFinish = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiSubmitFinish(activeRaceId, finishTimes);
      setSuccessMsg(`Hasil Heat #${activeRaceNum} berhasil dicatat! Pemenang dikirim ke Meja Scrutineer.`);
      setFinishTimes({ A: '', B: '', C: '' });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lock Race ("KUNCI BALAPAN")
  const handleLockRace = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiLockRace(activeRaceId);
      setSuccessMsg(`Race #${activeRaceNum} BERHASIL DIKUNCI! Kupon terdebet & TV di-update.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start Race
  const handleStartRace = async () => {
    setLoading(true);
    try {
      await apiStartRace(activeRaceId);
      setSuccessMsg(`Race #${activeRaceNum} BALAPAN BERLANGSUNG!`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Declare All CO / DNF (No Winner)
  const handleDeclareAllCO = async () => {
    if (!window.confirm(`Yakin menyatakan SEMUA MOBIL CO / DNF untuk Heat #${activeRaceNum}? Heat akan ditutup tanpa pemenang dan kupon kualifikasi peserta tetap terpotong.`)) {
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiDeclareAllCO(activeRaceId);
      setSuccessMsg(res.message || `Heat #${activeRaceNum} ditutup (Semua CO/DNF).`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Re-Race Modal
  const openReRaceModal = () => {
    const initial = {};
    registrations.forEach(r => {
      initial[r.lane] = true;
    });
    setSelectedReRaceLanes(initial);
    setReRaceModalOpen(true);
  };

  // Confirm Re-Race
  const handleConfirmReRace = async () => {
    const lanesToRerun = Object.keys(selectedReRaceLanes).filter(l => selectedReRaceLanes[l]);
    if (lanesToRerun.length === 0) {
      setErrorMsg('Pilih minimal 1 jalur untuk balap ulang.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiDeclareReRace(activeRaceId, lanesToRerun);
      setSuccessMsg(res.message || `Balap ulang aktif untuk Jalur [${lanesToRerun.join(', ')}].`);
      setReRaceModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin Override Actions
  const handleOverrideAssign = async (userId) => {
    try {
      await apiAdminOverride('assign', { raceId: activeRaceId, lane: overrideLane, userId });
      setOverrideLane(null);
      setSuccessMsg(`Pembalap berhasil dimasukkan ke Jalur ${overrideLane}`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOverrideForceReady = async (lane) => {
    try {
      await apiAdminOverride('force_ready', { raceId: activeRaceId, lane });
      setSuccessMsg(`Jalur ${lane} diubah menjadi SIAP`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOverrideKick = async (lane) => {
    try {
      await apiAdminOverride('kick', { raceId: activeRaceId, lane });
      setSuccessMsg(`Jalur ${lane} di-reset / kick`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Filtered users for override
  const filteredUsers = userList.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.team_name && u.team_name.toLowerCase().includes(searchUser.toLowerCase()))
  );

  const renderLaneCard = (laneLetter, regData, colorTheme) => {
    const isOccupied = !!regData;
    const isReady = regData?.status === 'ready';

    return (
      <div className={clsx(
        "p-4 border-2 clip-cyber transition-all flex flex-col justify-between min-h-[190px]",
        !isOccupied && "bg-black/40 border-gray-800 text-gray-500",
        isOccupied && !isReady && "bg-neonAmber/10 border-neonAmber text-neonAmber shadow-glowAmber",
        isOccupied && isReady && `${colorTheme.bg} ${colorTheme.border} ${colorTheme.text} ${colorTheme.glow}`
      )}>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-orbitron font-black tracking-widest">
              LANE {laneLetter}
            </span>
            <span className={clsx(
              "px-2 py-0.5 text-[10px] font-orbitron font-bold uppercase clip-cyber",
              !isOccupied && "bg-gray-800 text-gray-400",
              isOccupied && !isReady && "bg-neonAmber text-black",
              isOccupied && isReady && "bg-neonGreen text-black"
            )}>
              {!isOccupied ? 'KOSONG' : isReady ? 'SIAP' : 'PENDING'}
            </span>
          </div>

          {isOccupied ? (
            <div className="mt-3">
              <div className="text-lg font-orbitron font-bold text-white truncate">
                {regData.user_name}
              </div>
              <div className="text-xs font-mono text-neonPink tracking-wider">
                {regData.team_name || 'NO TAG'}
              </div>
              <div className="text-[11px] font-mono text-cyberSilver/60 mt-1">
                Kupon: {regData.coupon_balance ?? 0}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs font-mono text-cyberSilver/40 text-center py-3">
              Menunggu peserta scan QR...
            </div>
          )}
        </div>

        {/* Lane Override Buttons */}
        <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center gap-1.5">
          {!isOccupied ? (
            <button
              onClick={() => setOverrideLane(laneLetter)}
              className="flex-1 py-1 px-2 text-[10px] font-orbitron uppercase bg-white/5 hover:bg-neonCyan/20 hover:text-neonCyan border border-gray-700 clip-cyber"
            >
              + ASSIGN MANUAL
            </button>
          ) : (
            <>
              {!isReady && (
                <button
                  onClick={() => handleOverrideForceReady(laneLetter)}
                  className="flex-1 py-1 text-[10px] font-orbitron uppercase bg-neonGreen/20 text-neonGreen hover:bg-neonGreen/40 border border-neonGreen clip-cyber"
                >
                  FORCE READY
                </button>
              )}
              <button
                onClick={() => handleOverrideKick(laneLetter)}
                className="py-1 px-2 text-[10px] font-orbitron uppercase bg-red-950/40 text-red-400 hover:bg-red-900 border border-red-500 clip-cyber"
                title="Kick / Reset Slot"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* 1. Header Banner & Status Bar */}
      <div className="bg-obsidian border border-neonCyan/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-orbitron text-neonCyan tracking-widest uppercase">
            PUSAT KOMANDO // RACE DIRECTOR COMMAND DESK
          </div>
          <h2 className="text-2xl md:text-3xl font-orbitron font-black text-white">
            ACTIVE HEAT #{activeRaceNum}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyberSilver/70">STATUS LINTASAN:</span>
          <span className={clsx(
            "px-3 py-1 text-xs font-orbitron font-extrabold uppercase clip-cyber",
            raceStatus === 'draft' && "bg-neonAmber/20 text-neonAmber border border-neonAmber",
            raceStatus === 'pre-start' && "bg-neonCyan/20 text-neonCyan border border-neonCyan animate-pulse",
            raceStatus === 'locked' && "bg-red-500/20 text-red-400 border border-red-500",
            raceStatus === 'completed' && "bg-neonGreen/20 text-neonGreen border border-neonGreen"
          )}>
            {raceStatus === 'draft' && 'ANTREAN TERBUKA (DRAFT)'}
            {raceStatus === 'pre-start' && 'TERKUNCI - SIAP START (PRE-START)'}
            {raceStatus === 'locked' && 'BALAPAN BERLANGSUNG (LOCKED)'}
            {raceStatus === 'completed' && 'SELESAI (COMPLETED)'}
          </span>
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

      {/* 2. Lanes Grid & Lock Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderLaneCard('A', laneA, {
          bg: 'bg-neonPink/15',
          border: 'border-neonPink',
          text: 'text-neonPink',
          glow: 'shadow-glowPink'
        })}
        {renderLaneCard('B', laneB, {
          bg: 'bg-neonCyan/15',
          border: 'border-neonCyan',
          text: 'text-neonCyan',
          glow: 'shadow-glowCyan'
        })}
        {renderLaneCard('C', laneC, {
          bg: 'bg-neonGreen/15',
          border: 'border-neonGreen',
          text: 'text-neonGreen',
          glow: 'shadow-glowGreen'
        })}
      </div>

      {/* 3. Primary RD Action Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Giant Lock / Start Button */}
        <CyberCard variant="cyan" title="KONTROL LINTASAN DIGITAL">
          <div className="space-y-3">
            {raceStatus === 'draft' && (
              <button
                onClick={handleLockRace}
                disabled={loading || registrations.length === 0}
                className="w-full py-6 bg-neonCyan text-black font-orbitron font-black text-xl md:text-2xl clip-cyber-lg shadow-[0_0_30px_rgba(0,240,255,0.8)] hover:bg-neonCyan/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
              >
                <Lock className="w-7 h-7" />
                <span>KUNCI BALAPAN (LOCK HEAT)</span>
              </button>
            )}

            {raceStatus === 'pre-start' && (
              <button
                onClick={handleStartRace}
                disabled={loading}
                className="w-full py-6 bg-neonGreen text-black font-orbitron font-black text-xl md:text-2xl clip-cyber-lg shadow-[0_0_30px_rgba(57,255,20,0.8)] hover:bg-neonGreen/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Play className="w-7 h-7" />
                <span>MULAI BALAPAN (START)</span>
              </button>
            )}

            {raceStatus === 'locked' && (
              <div className="space-y-3">
                <div className="p-4 bg-red-950/40 border border-red-500 clip-cyber text-center">
                  <div className="text-lg font-orbitron font-black text-red-400 animate-pulse">
                    MOBIL SEDANG DI LINTASAN...
                  </div>
                  <p className="text-xs text-cyberSilver/70 font-mono mt-1">
                    Baca waktu di display stopwatch fisik track, lalu masukkan di panel input finish bawah.
                  </p>
                </div>

                {/* Emergency Exception Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDeclareAllCO}
                    disabled={loading}
                    className="py-3 px-4 bg-red-600/90 hover:bg-red-600 text-white font-orbitron font-black text-xs uppercase clip-cyber shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 text-white" />
                    <span>SEMUA CO / DNF (NO WINNER)</span>
                  </button>

                  <button
                    type="button"
                    onClick={openReRaceModal}
                    disabled={loading}
                    className="py-3 px-4 bg-neonAmber/90 hover:bg-neonAmber text-black font-orbitron font-black text-xs uppercase clip-cyber shadow-glowAmber flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4 text-black" />
                    <span>DEKLARASI RE-RACE</span>
                  </button>
                </div>
              </div>
            )}

            {raceStatus === 'completed' && (
              <div className="p-4 bg-neonGreen/10 border border-neonGreen clip-cyber text-center">
                <div className="text-lg font-orbitron font-black text-neonGreen">
                  HEAT #{activeRaceNum} SELESAI
                </div>
                <p className="text-xs text-cyberSilver/70 font-mono mt-1">
                  Menunggu verifikasi scrutineer atau antrean race selanjutnya otomatis bergulir.
                </p>
              </div>
            )}
          </div>
        </CyberCard>

        {/* Module 7: Babak Kedua Voice Countdown Widget */}
        <CyberCard variant="pink" title="TIMER KONTROL BABAK KEDUA (VOICE COUNTDOWN)">
          <div className="space-y-3">
            <p className="text-xs font-mono text-cyberSilver/70">
              Sinkronisasi suara hitungan mundur manusia ("Sepuluh... Sembilan... Satu!") + getaran HP.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <CyberButton
                variant="pink"
                size="md"
                onClick={apiStartCountdown}
                className="py-3 text-xs"
              >
                MULAI COUNTDOWN
              </CyberButton>
              <CyberButton
                variant="amber"
                size="md"
                onClick={apiResetCountdown}
                className="py-3 text-xs"
              >
                RESET / KE-2
              </CyberButton>
              <CyberButton
                variant="green"
                size="md"
                onClick={apiStopCountdown}
                className="py-3 text-xs"
              >
                SIAP / STOP SEKARANG
              </CyberButton>
            </div>
          </div>
        </CyberCard>
      </div>

      {/* 4. Module 4: Finish Input Panel (Scenario B) */}
      <CyberCard variant="amber" title="INPUT WAKTU FINISH JURI / RD (SCENARIO B)">
        <form onSubmit={handleSubmitFinish} className="space-y-4">
          <p className="text-xs font-mono text-cyberSilver/70">
            Ketik waktu yang terbaca dari layar LED timer sirkuit (misal: <code className="text-neonCyan">11.450</code>). Pemenang dengan waktu terendah akan otomatis dikirim ke Meja Scrutineer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['A', 'B', 'C'].map(laneLetter => {
              const reg = registrations.find(r => r.lane === laneLetter);
              return (
                <div key={laneLetter} className="p-3 bg-black/60 border border-gray-800 clip-cyber">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-orbitron font-bold text-sm text-neonCyan">JALUR {laneLetter}</span>
                    <span className="text-xs font-mono text-white truncate max-w-[120px]">
                      {reg ? reg.user_name : '(Kosong)'}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Contoh: 11.450"
                    disabled={!reg}
                    value={finishTimes[laneLetter]}
                    onChange={(e) => setFinishTimes({ ...finishTimes, [laneLetter]: e.target.value })}
                    className="w-full bg-obsidian border border-neonAmber/50 px-3 py-2 text-lg font-orbitron font-bold text-neonAmber focus:outline-none focus:border-neonAmber clip-cyber disabled:opacity-30"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <CyberButton
              type="submit"
              variant="amber"
              size="lg"
              disabled={loading || registrations.length === 0}
            >
              SIMPAN WAKTU & KIRIM KE SCRUTINEER
            </CyberButton>
          </div>
        </form>
      </CyberCard>

      {/* Admin Override Modal */}
      {overrideLane && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-obsidian border border-neonCyan p-6 clip-cyber shadow-glowCyan">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <h3 className="font-orbitron font-bold text-neonCyan">
                ASSIGN PEMBALAP KE JALUR {overrideLane}
              </h3>
              <button
                onClick={() => setOverrideLane(null)}
                className="text-cyberSilver/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-cyberSilver/60 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Cari nama atau tag..."
                className="w-full bg-black/80 border border-gray-700 pl-9 pr-3 py-2 text-xs font-mono text-white clip-cyber focus:outline-none focus:border-neonCyan"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleOverrideAssign(u.id)}
                  className="w-full text-left p-2 bg-black/40 hover:bg-neonCyan/20 hover:border-neonCyan border border-transparent clip-cyber flex items-center justify-between text-xs font-mono transition-all"
                >
                  <div>
                    <div className="font-orbitron font-bold text-white">{u.name}</div>
                    <div className="text-[10px] text-neonPink">{u.team_name || 'NO TAG'} {u.is_virtual ? '(Tamu)' : ''}</div>
                  </div>
                  <span className="text-neonAmber font-bold">{u.coupon_balance} Kupon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Re-Race Declaration Modal */}
      {reRaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-obsidian border-2 border-neonAmber p-6 clip-cyber shadow-glowAmber space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-neonAmber" />
                <h3 className="font-orbitron font-black text-white text-base">
                  DEKLARASI RE-RACE // HEAT #{activeRaceNum}
                </h3>
              </div>
              <button
                onClick={() => setReRaceModalOpen(false)}
                className="text-cyberSilver/60 hover:text-white font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-neonAmber/10 border border-neonAmber/50 clip-cyber text-xs font-mono text-neonAmber space-y-1">
              <p className="font-bold">⚡ FREE RE-RUN PERMIT (BEBAS KUPON & TANPA SCAN ULANG)</p>
              <p className="text-cyberSilver/80 text-[11px]">
                Pilih jalur yang berhak melakukan balap ulang. Status jalur terpilih akan di-reset menjadi SIAP tanpa memotong kupon tambahan.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-orbitron text-cyberSilver/80 uppercase">
                Pilih Jalur yang Balap Ulang:
              </div>
              {['A', 'B', 'C'].map(laneLetter => {
                const reg = registrations.find(r => r.lane === laneLetter);
                if (!reg) return null;
                const isChecked = !!selectedReRaceLanes[laneLetter];

                return (
                  <label
                    key={laneLetter}
                    className={clsx(
                      "p-3 border clip-cyber flex items-center justify-between cursor-pointer transition-all",
                      isChecked 
                        ? "bg-black/80 border-neonAmber text-white shadow-[0_0_10px_rgba(255,170,0,0.3)]" 
                        : "bg-black/40 border-gray-800 text-cyberSilver/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setSelectedReRaceLanes({
                          ...selectedReRaceLanes,
                          [laneLetter]: e.target.checked
                        })}
                        className="w-4 h-4 accent-neonAmber cursor-pointer"
                      />
                      <div>
                        <span className="font-orbitron font-bold text-sm text-neonCyan mr-2">
                          JALUR {laneLetter}:
                        </span>
                        <span className="font-orbitron font-bold text-white text-sm">
                          {reg.user_name}
                        </span>
                        <span className="text-xs font-mono text-neonPink ml-1.5">
                          [{reg.team_name || 'NO TAG'}]
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setReRaceModalOpen(false)}
                className="flex-1 py-3 bg-black/60 hover:bg-black/90 border border-gray-700 text-cyberSilver font-orbitron font-bold text-xs uppercase clip-cyber"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleConfirmReRace}
                disabled={loading}
                className="flex-1 py-3 bg-neonAmber hover:bg-neonAmber/90 text-black font-orbitron font-black text-xs uppercase clip-cyber shadow-glowAmber"
              >
                MULAI BALAP ULANG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
