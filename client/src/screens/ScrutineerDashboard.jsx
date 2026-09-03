import React, { useState } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { ShieldCheck, Check, X, Trophy, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export function ScrutineerDashboard() {
  const { raceState, apiScrutineerAction, apiScrutineerOverride } = useRace();
  const [selectedRacer, setSelectedRacer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lapis 3 Emergency Override Modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedOverrideLane, setSelectedOverrideLane] = useState('A');
  const [manualFinishTime, setManualFinishTime] = useState('');

  const queue = raceState.scrutineerQueue || [];
  const activeRace = raceState.activeRace;
  const activeRegistrations = activeRace?.registrations || [];
  const hasActiveRaceInProgress = activeRace && (activeRace.status === 'locked' || activeRace.status === 'pre-start');

  const handleAction = async (registrationId, action) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiScrutineerAction(registrationId, action);
      if (res.status === 'pass') {
        setFeedback({
          type: 'success',
          text: `${res.userName} [${res.teamName || 'NO TAG'}] DINYATAKAN LOLOS! Tiket Babak 2 Aktif & BTO Diperbarui.`
        });
      } else {
        setFeedback({
          type: 'error',
          text: `${res.userName} DISKUALIFIKASI. Dicabut dari papan BTO.`
        });
      }
      setSelectedRacer(null);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteOverride = async (action) => {
    if (!selectedOverrideLane) {
      setFeedback({ type: 'error', text: 'Pilih jalur pemenang terlebih dahulu.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiScrutineerOverride({
        raceId: activeRace.id,
        lane: selectedOverrideLane,
        finishTime: manualFinishTime || null,
        action
      });

      setFeedback({
        type: action === 'pass' ? 'success' : 'error',
        text: res.message || `Emergency Override Berhasil: Heat #${activeRace.race_number} diproses [${action.toUpperCase()}].`
      });
      setOverrideModalOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-obsidian border border-neonGreen/40 p-4 clip-cyber flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonGreen/20 border border-neonGreen flex items-center justify-center clip-cyber">
            <ShieldCheck className="w-6 h-6 text-neonGreen" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-orbitron font-black text-white">
              MEJA SCRUTINEERING // PEMERIKSAAN FISIK
            </h2>
            <p className="text-xs font-mono text-neonGreen">
              Zero-Keyboard Tablet Mode: "Tanya Nama" & Tap Verifikasi
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-orbitron text-cyberSilver/60">Antrean Periksa</div>
          <div className="text-2xl font-orbitron font-black text-neonGreen">
            {queue.length} PEMENANG
          </div>
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className={clsx(
          "p-4 text-xs font-mono clip-cyber border flex items-center gap-2",
          feedback.type === 'success' ? "bg-neonGreen/10 border-neonGreen text-neonGreen font-bold" : "bg-red-950/40 border-red-500 text-red-400"
        )}>
          {feedback.type === 'success' ? <UserCheck className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Lapis 2 Active Alert: Race in progress but queue is empty */}
      {queue.length === 0 && hasActiveRaceInProgress && (
        <div className="p-5 bg-neonAmber/10 border-2 border-neonAmber clip-cyber shadow-[0_0_25px_rgba(255,170,0,0.25)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neonAmber font-orbitron font-black text-sm md:text-base">
              <AlertTriangle className="w-5 h-5 text-neonAmber animate-bounce" />
              <span>LAPIS 2 ACTIVE ALERT: RACE AKTIF BELUM DISUBMIT ADMIN</span>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-neonAmber text-black clip-cyber">
              HEAT #{activeRace.race_number}
            </span>
          </div>

          <p className="text-xs font-mono text-cyberSilver/80">
            Pembalap mungkin sudah tiba di meja inspeksi membawa mobil, namun Race Director belum menginput waktu finish dari lintasan.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                const firstLane = activeRegistrations[0]?.lane || 'A';
                setSelectedOverrideLane(firstLane);
                setManualFinishTime('');
                setOverrideModalOpen(true);
              }}
              className="w-full sm:w-auto py-3 px-5 bg-neonAmber text-black font-orbitron font-black text-xs md:text-sm uppercase clip-cyber shadow-glowAmber hover:bg-neonAmber/90 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-black" />
              <span>AMBIL ALIH HASIL (OVERRIDE DARI MEJA JURI)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Inspection Area */}
      {queue.length === 0 ? (
        <CyberCard variant="green" title="ANTREAN MEJA PEMERIKSAAN KOSONG">
          <div className="text-center py-12 space-y-3">
            <ShieldCheck className="w-16 h-16 text-cyberSilver/30 mx-auto" />
            <div className="text-lg font-orbitron text-cyberSilver/70">
              TIDAK ADA PEMENANG YANG MENUNGGU SCRUTINEER
            </div>
            <p className="text-xs font-mono text-cyberSilver/50 max-w-md mx-auto">
              Saat Race Director / Juri Finish menginput waktu balapan, pemenang heat akan langsung muncul di layar ini untuk pemeriksaan fisik dimensi & berat mobil.
            </p>
          </div>
        </CyberCard>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-orbitron text-cyberSilver/70 uppercase">
            Pilih nama pembalap yang membawa mobil ke meja:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queue.map(item => {
              const isSelected = selectedRacer?.registration_id === item.registration_id;

              return (
                <div
                  key={item.registration_id}
                  onClick={() => setSelectedRacer(item)}
                  className={clsx(
                    "p-5 bg-obsidian border-2 clip-cyber transition-all cursor-pointer",
                    isSelected
                      ? "border-neonGreen bg-neonGreen/10 shadow-glowGreen scale-[1.02]"
                      : "border-gray-800 hover:border-neonGreen/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-bold text-neonCyan">
                      RACE #{item.race_number} • LANE {item.lane}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-orbitron bg-neonAmber/20 text-neonAmber border border-neonAmber clip-cyber">
                      PENDING INSPEKSI
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="text-2xl font-orbitron font-black text-white">
                      {item.user_name}
                    </div>
                    <div className="text-sm font-mono text-neonPink tracking-wider">
                      [{item.team_name || 'NO TAG'}]
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <span className="text-xs font-mono text-cyberSilver/60">Catatan Waktu:</span>
                    <span className="text-xl font-orbitron font-black text-neonGreen">
                      {parseFloat(item.finish_time).toFixed(3)}s
                    </span>
                  </div>

                  {/* Expanded Action Buttons if Selected */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-neonGreen/30 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleAction(item.registration_id, 'pass')}
                        disabled={loading}
                        className="py-4 bg-neonGreen text-black font-orbitron font-black text-sm uppercase clip-cyber shadow-glowGreen hover:bg-neonGreen/90 flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        <span>LOLOS (PASS)</span>
                      </button>

                      <button
                        onClick={() => handleAction(item.registration_id, 'disqualified')}
                        disabled={loading}
                        className="py-4 bg-red-600 text-white font-orbitron font-black text-sm uppercase clip-cyber hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        <span>DISKUALIFIKASI (DQ)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lapis 3 Scrutineer Emergency Override Modal */}
      {overrideModalOpen && activeRace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="max-w-lg w-full bg-obsidian border-2 border-neonAmber p-6 clip-cyber shadow-glowAmber space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-neonAmber" />
                <h3 className="font-orbitron font-black text-white text-base">
                  AMBIL ALIH PEMENANG // HEAT #{activeRace.race_number}
                </h3>
              </div>
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="text-cyberSilver/60 hover:text-white font-mono"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-neonAmber/10 border border-neonAmber/50 clip-cyber text-xs font-mono text-neonAmber space-y-1">
              <p className="font-bold">⚠️ LAPIS 3 FAIL-SAFE OVERRIDE JURI</p>
              <p className="text-cyberSilver/80 text-[11px]">
                Gunakan saat laptop RD terputus atau terlambat submit. Pemenang yang disahkan otomatis dimasukkan ke Bagan Turnamen Babak 2 dan papan BTO.
              </p>
            </div>

            {/* Lane Selection */}
            <div className="space-y-2">
              <label className="text-xs font-orbitron text-cyberSilver uppercase">
                Pilih Jalur Pemenang yang Membawa Mobil:
              </label>
              <div className="space-y-2">
                {activeRegistrations.length === 0 ? (
                  <p className="text-xs font-mono text-red-400">Tidak ada pembalap terdaftar pada heat ini.</p>
                ) : (
                  activeRegistrations.map(reg => {
                    const isSelected = selectedOverrideLane === reg.lane;
                    return (
                      <div
                        key={reg.id}
                        onClick={() => setSelectedOverrideLane(reg.lane)}
                        className={clsx(
                          "p-3 border clip-cyber flex items-center justify-between cursor-pointer transition-all",
                          isSelected
                            ? "bg-black/90 border-neonAmber text-white shadow-[0_0_12px_rgba(255,170,0,0.35)]"
                            : "bg-black/40 border-gray-800 text-cyberSilver/60 hover:border-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="overrideLaneRadio"
                            checked={isSelected}
                            onChange={() => setSelectedOverrideLane(reg.lane)}
                            className="w-4 h-4 accent-neonAmber cursor-pointer"
                          />
                          <div>
                            <span className="font-orbitron font-bold text-sm text-neonCyan mr-2">
                              JALUR {reg.lane}:
                            </span>
                            <span className="font-orbitron font-bold text-white text-sm">
                              {reg.user_name}
                            </span>
                            <span className="text-xs font-mono text-neonPink ml-1.5">
                              [{reg.team_name || 'NO TAG'}]
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Finish Time Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-orbitron text-cyberSilver uppercase">
                Catatan Waktu Finish (Detik - Opsional dari Layar Track):
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="Contoh: 11.450 (kosongkan jika tidak tercatat)"
                value={manualFinishTime}
                onChange={(e) => setManualFinishTime(e.target.value)}
                className="w-full bg-black/90 border border-gray-700 p-3 font-mono text-neonGreen text-sm clip-cyber focus:outline-none focus:border-neonAmber"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleExecuteOverride('pass')}
                disabled={loading || activeRegistrations.length === 0}
                className="py-3.5 px-4 bg-neonGreen hover:bg-neonGreen/90 text-black font-orbitron font-black text-xs uppercase clip-cyber shadow-glowGreen flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>LOLOSKAN & SEED KE BAGAN</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteOverride('disqualified')}
                disabled={loading || activeRegistrations.length === 0}
                className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-orbitron font-black text-xs uppercase clip-cyber flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>DISKUALIFIKASI (DQ)</span>
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                className="text-xs font-mono text-cyberSilver/60 hover:text-cyberSilver"
              >
                Batal / Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

