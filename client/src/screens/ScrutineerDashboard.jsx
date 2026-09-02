import React, { useState } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { ShieldCheck, Check, X, Trophy, AlertTriangle, UserCheck } from 'lucide-react';
import clsx from 'clsx';

export function ScrutineerDashboard() {
  const { raceState, apiScrutineerAction } = useRace();
  const [selectedRacer, setSelectedRacer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const queue = raceState.scrutineerQueue || [];

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
    </div>
  );
}
