import React, { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Coins, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Camera, 
  Flag, 
  Clock, 
  ShieldAlert, 
  UserCheck,
  Trophy,
  Upload,
  AlertCircle,
  Smartphone,
  HelpCircle
} from 'lucide-react';
import clsx from 'clsx';
import { parseLaneCode, checkCameraSupport } from '../utils/qrScannerHelper.js';

export function ParticipantDashboard() {
  const { 
    currentUser, 
    raceState, 
    apiScanLane, 
    apiSetReady, 
    apiCancelRegistration,
    switchUser 
  } = useRace();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warn', text: '' }
  const [cameraError, setCameraError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [teamTagInput, setTeamTagInput] = useState(currentUser?.team_name || '');
  const [editingProfile, setEditingProfile] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeRace = raceState.activeRace;
  const activeRaceNumber = activeRace?.race_number || 1;
  const raceStatus = activeRace?.status || 'draft';

  // Find user's current registration in active race or future queue
  const myActiveReg = activeRace?.registrations?.find(r => r.user_id === currentUser?.id);

  // Check if user is in an upcoming race
  const myUpcomingRace = raceState.upcomingRaces?.find(r => 
    r.racers?.some(rac => rac.user_name === currentUser?.name)
  );

  // Check device camera capability
  const cameraSupport = typeof window !== 'undefined' ? checkCameraSupport() : { supported: true, reason: 'READY' };

  // Stop camera helper
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop error:', err);
      }
      scannerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Setup HTML5 QR Scanner with rear camera and secure context handling
  useEffect(() => {
    let isCancelled = false;

    const startCamera = async () => {
      setCameraError(null);

      // Check if secure context
      const support = checkCameraSupport();
      if (!support.supported) {
        setCameraError(support.message);
        return;
      }

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (!isCancelled) {
              handleQRScan(decodedText);
              stopCamera();
              setScannerOpen(false);
            }
          },
          () => {
            // Scanning frame pass
          }
        );

        if (!isCancelled) {
          setIsStreaming(true);
        }
      } catch (err) {
        console.error("Camera start failed:", err);
        if (!isCancelled) {
          const errMsg = err?.message || '';
          if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied')) {
            setCameraError('Izin akses kamera ditolak oleh browser. Berikan izin kamera di pengaturan browser.');
          } else if (errMsg.toLowerCase().includes('secure') || !window.isSecureContext) {
            setCameraError('Kamera live membutuhkan koneksi HTTPS atau "localhost". Silakan gunakan opsi "Ambil Foto QR" atau tombol jalur.');
          } else {
            setCameraError(`Kamera tidak dapat dimulai: ${errMsg || 'Kamera sedang dipakai aplikasi lain atau tidak terdeteksi.'}`);
          }
        }
      }
    };

    if (scannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [scannerOpen]);

  // Handle QR Scan decoded result
  const handleQRScan = async (rawCode) => {
    const lane = parseLaneCode(rawCode);

    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiScanLane(currentUser.id, lane);
      if (res.pushedToNext) {
        setFeedback({ type: 'warn', text: res.message });
      } else {
        setFeedback({ type: 'success', text: res.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Scan QR from taken photo or uploaded image (works even without HTTPS!)
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFeedback(null);
    try {
      // Create temporary reader instance if needed
      const fileScanner = new Html5Qrcode("qr-file-temp-container");
      const decodedText = await fileScanner.scanFile(file, false);
      fileScanner.clear();
      handleQRScan(decodedText);
      setScannerOpen(false);
    } catch (err) {
      console.warn("File QR scan error:", err);
      setFeedback({ 
        type: 'error', 
        text: 'QR Code tidak terdeteksi pada foto. Pastikan posisi foto tegak lurus, fokus, dan pencahayaan cukup.' 
      });
    } finally {
      setLoading(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetReady = async () => {
    if (!myActiveReg) return;
    setLoading(true);
    try {
      await apiSetReady(currentUser.id, activeRace.id);
      setFeedback({ type: 'success', text: 'Status berhasil diubah: SIAP BALAP!' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await apiCancelRegistration(currentUser.id);
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!teamTagInput.trim()) return;
    const tag = teamTagInput.trim().substring(0, 10).toUpperCase();
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, teamName: tag })
      });
      const data = await res.json();
      if (data.success) {
        switchUser({ ...currentUser, team_name: tag });
        setEditingProfile(false);
        setFeedback({ type: 'success', text: `Racer Tag berhasil diubah ke: ${tag}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Gagal memperbarui profil' });
    }
  };

  // Determine HUD state
  const isRegisteredInActive = !!myActiveReg;
  const isReady = myActiveReg?.status === 'ready';
  const isLocked = raceStatus === 'pre-start' || raceStatus === 'locked';
  const isRaceCompleted = raceStatus === 'completed';
  const myFinishTime = myActiveReg?.finish_time;
  const myScrutStatus = myActiveReg?.scrutineer_status;

  const laneColors = {
    A: { border: 'border-neonPink', text: 'text-neonPink', bg: 'bg-neonPink/20', glow: 'shadow-glowPink' },
    B: { border: 'border-neonCyan', text: 'text-neonCyan', bg: 'bg-neonCyan/20', glow: 'shadow-glowCyan' },
    C: { border: 'border-neonGreen', text: 'text-neonGreen', bg: 'bg-neonGreen/20', glow: 'shadow-glowGreen' }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* 1. Profile & Coupon Balance HUD */}
      <CyberCard variant="cyan" className="!p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-orbitron font-black text-white">{currentUser?.name}</h2>
              <button 
                onClick={() => setEditingProfile(!editingProfile)}
                className="text-[10px] font-mono text-neonCyan hover:underline"
              >
                [UBAH TAG]
              </button>
            </div>
            <div className="text-xs font-mono text-neonPink tracking-widest mt-0.5">
              TAG: <span className="font-bold">{currentUser?.team_name || 'BELUM DIATUR'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-orbitron text-cyberSilver/60">Saldo Kupon</div>
            <div className="flex items-center justify-end gap-1.5 text-2xl font-orbitron font-black text-neonAmber text-glow-amber">
              <Coins className="w-5 h-5" />
              <span>{currentUser?.coupon_balance ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Profile Edit Tag Modal */}
        {editingProfile && (
          <form onSubmit={handleSaveProfile} className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              maxLength={10}
              value={teamTagInput}
              onChange={(e) => setTeamTagInput(e.target.value)}
              placeholder="Contoh: ANDI [RRT]"
              className="flex-1 bg-black/60 border border-neonCyan/50 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-neonCyan clip-cyber"
            />
            <CyberButton type="submit" size="sm" variant="cyan">SIMPAN</CyberButton>
          </form>
        )}
      </CyberCard>

      {/* 2. Feedback Notification Alert */}
      {feedback && (
        <div className={clsx(
          "p-3 text-xs font-mono clip-cyber border flex items-center gap-2",
          feedback.type === 'success' && "bg-neonGreen/10 border-neonGreen text-neonGreen",
          feedback.type === 'error' && "bg-red-950/40 border-red-500 text-red-400",
          feedback.type === 'warn' && "bg-neonAmber/10 border-neonAmber text-neonAmber"
        )}>
          {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {feedback.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
          {feedback.type === 'warn' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 3. Active Heat Status Banner */}
      <div className="bg-obsidian border border-gray-800 p-3 clip-cyber flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-neonPink" />
          <span className="text-xs font-orbitron uppercase text-cyberSilver/70">HEAT SAAT INI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-orbitron font-black text-neonCyan">RACE #{activeRaceNumber}</span>
          <span className={clsx(
            "px-2 py-0.5 text-[10px] font-orbitron font-bold uppercase clip-cyber",
            raceStatus === 'draft' && "bg-neonAmber/20 text-neonAmber border border-neonAmber",
            raceStatus === 'pre-start' && "bg-neonGreen/20 text-neonGreen border border-neonGreen animate-pulse",
            raceStatus === 'locked' && "bg-red-500/20 text-red-400 border border-red-500",
            raceStatus === 'completed' && "bg-blue-500/20 text-blue-400 border border-blue-500"
          )}>
            {raceStatus === 'draft' && 'ANTREAN DIBUKA'}
            {raceStatus === 'pre-start' && 'LINTASAN DIKUNCI'}
            {raceStatus === 'locked' && 'BALAPAN BERLANGSUNG'}
            {raceStatus === 'completed' && 'SELESAI'}
          </span>
        </div>
      </div>

      {/* 4. MAIN ACTION ZONE */}
      {!isRegisteredInActive ? (
        // NOT REGISTERED IN ACTIVE RACE
        <div className="space-y-4">
          {myUpcomingRace ? (
            <CyberCard variant="amber" title="MENUNGGU ANTREAN RACE BERIKUTNYA">
              <div className="text-center py-4 space-y-2">
                <Clock className="w-12 h-12 text-neonAmber mx-auto animate-pulse" />
                <div className="text-xl font-orbitron font-bold text-neonAmber">
                  ANDA DI RACE #{myUpcomingRace.race_number}
                </div>
                <p className="text-xs text-cyberSilver/70 font-mono">
                  Tetap siaga di dekat lintasan. Begitu Race #{activeRaceNumber} selesai, race Anda akan aktif otomatis!
                </p>
              </div>
            </CyberCard>
          ) : (
            <CyberCard variant="cyan" title="DAFTAR JALUR BALAPAN (BABAK 1)">
              <div className="space-y-4">
                <p className="text-xs text-cyberSilver/70 font-mono">
                  Arahkan kamera HP ke QR Code di meja lintasan (LINE A / LINE B / LINE C) atau ambil foto:
                </p>

                {/* Hidden input for native camera photo capture (works 100% on HTTP & HTTPS) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileScan}
                />
                <div id="qr-file-temp-container" className="hidden" />

                {/* Camera QR Scanner Modal / Viewport */}
                {scannerOpen ? (
                  <div className="space-y-3 bg-black/90 p-3 border border-neonCyan/40 clip-cyber">
                    {cameraError ? (
                      <div className="space-y-3 p-3 bg-red-950/40 border border-red-500/60 clip-cyber text-left">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="text-xs font-orbitron font-bold text-red-400">
                              KENDALA KAMERA SMARTPHONE
                            </div>
                            <p className="text-[11px] text-cyberSilver/90 font-mono leading-relaxed">
                              {cameraError}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-red-900/50 space-y-2">
                          <div className="text-[10px] font-orbitron text-neonAmber uppercase">
                            Solusi Langsung:
                          </div>
                          <CyberButton
                            variant="amber"
                            size="sm"
                            className="w-full text-xs font-bold"
                            icon={Smartphone}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            AMBIL FOTO QR DENGAN KAMERA HP
                          </CyberButton>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <div id="qr-reader" className="w-full bg-black rounded overflow-hidden min-h-[220px]" />
                          {!isStreaming && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-cyberSilver font-mono text-xs gap-2">
                              <Camera className="w-8 h-8 text-neonCyan animate-pulse" />
                              <span>Memulai kamera belakang...</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-center text-cyberSilver/60 font-mono">
                          Posisikan QR code meja di dalam kotak pemindai
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800">
                      <CyberButton 
                        variant="cyan" 
                        size="sm" 
                        className="w-full text-xs"
                        icon={Upload}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        FOTO QR
                      </CyberButton>
                      <CyberButton 
                        variant="red" 
                        size="sm" 
                        className="w-full text-xs" 
                        onClick={() => {
                          setScannerOpen(false);
                          setCameraError(null);
                        }}
                      >
                        TUTUP
                      </CyberButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CyberButton
                      variant="cyan"
                      size="lg"
                      className="w-full py-4 text-base"
                      icon={Camera}
                      onClick={() => {
                        setCameraError(null);
                        setScannerOpen(true);
                      }}
                    >
                      BUKA KAMERA SCAN QR
                    </CyberButton>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-obsidian border border-neonAmber/40 text-neonAmber hover:border-neonAmber hover:bg-neonAmber/10 font-orbitron text-xs font-bold clip-cyber flex items-center justify-center gap-2 transition-all"
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>AMBIL FOTO QR (KAMERA HP)</span>
                    </button>
                  </div>
                )}

                {/* 1-Tap Physical QR Simulator Buttons */}
                <div className="pt-3 border-t border-gray-800">
                  <div className="text-[10px] font-orbitron text-cyberSilver/50 mb-2 uppercase text-center">
                    Atau Tap Simulasi Meja Fisik Langsung:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleQRScan('A')}
                      disabled={loading}
                      className="py-3 bg-neonPink/15 border border-neonPink text-neonPink font-orbitron font-black text-sm clip-cyber hover:bg-neonPink/30 hover:shadow-glowPink active:scale-95 transition-all"
                    >
                      LINE A
                    </button>
                    <button
                      onClick={() => handleQRScan('B')}
                      disabled={loading}
                      className="py-3 bg-neonCyan/15 border border-neonCyan text-neonCyan font-orbitron font-black text-sm clip-cyber hover:bg-neonCyan/30 hover:shadow-glowCyan active:scale-95 transition-all"
                    >
                      LINE B
                    </button>
                    <button
                      onClick={() => handleQRScan('C')}
                      disabled={loading}
                      className="py-3 bg-neonGreen/15 border border-neonGreen text-neonGreen font-orbitron font-black text-sm clip-cyber hover:bg-neonGreen/30 hover:shadow-glowGreen active:scale-95 transition-all"
                    >
                      LINE C
                    </button>
                  </div>
                </div>
              </div>
            </CyberCard>
          )}
        </div>
      ) : (
        // REGISTERED IN ACTIVE RACE
        <div className="space-y-4">
          {/* Registered Lane Display Card */}
          <div className={clsx(
            "p-5 text-center clip-cyber border-2 transition-all",
            laneColors[myActiveReg.lane]?.border || 'border-neonCyan',
            laneColors[myActiveReg.lane]?.glow || 'shadow-glowCyan',
            "bg-obsidian/95"
          )}>
            <div className="text-xs font-orbitron uppercase text-cyberSilver/70">JALUR ANDA SAAT INI</div>
            <div className={clsx("text-6xl font-black font-orbitron my-2", laneColors[myActiveReg.lane]?.text)}>
              LINE {myActiveReg.lane}
            </div>
            <div className="text-xs font-mono text-cyberSilver">
              STATUS: <span className={clsx("font-bold uppercase", 
                myActiveReg.status === 'dnf_co' ? "text-red-400" :
                isReady ? "text-neonGreen" : "text-neonAmber"
              )}>
                {myActiveReg.status === 'dnf_co' ? 'DNF / COURSE OUT' : myActiveReg.status}
              </span>
            </div>
          </div>

          {/* DNF / CO Status Card */}
          {myActiveReg.status === 'dnf_co' && (
            <div className="p-4 bg-red-950/40 border border-red-500 clip-cyber text-center space-y-1 animate-pulse">
              <div className="text-sm font-orbitron font-black text-red-400">
                COURSE OUT / DNF (NO WINNER)
              </div>
              <p className="text-xs text-cyberSilver/70 font-mono">
                Semua mobil keluar lintasan. Kupon kualifikasi terpakai. Silakan mendaftar ke antrean heat berikutnya.
              </p>
            </div>
          )}

          {/* Scrutineering / Finish Time Status */}
          {myFinishTime && (
            <div className="p-4 bg-black/80 border border-neonCyan clip-cyber text-center space-y-1">
              <div className="text-xs font-orbitron text-cyberSilver/60">WAKTU FINISH ANDA</div>
              <div className="text-4xl font-orbitron font-black text-neonCyan text-glow-cyan">
                {parseFloat(myFinishTime).toFixed(3)}s
              </div>
              {myScrutStatus === 'pending' && (
                <div className="text-xs text-neonAmber font-mono mt-2 animate-pulse flex items-center justify-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Menunggu Pemeriksaan Meja Scrutineer...</span>
                </div>
              )}
              {myScrutStatus === 'pass' && (
                <div className="p-3.5 gold-shimmer-border bg-gradient-to-r from-amber-950/60 via-black/90 to-amber-950/60 clip-cyber text-center space-y-1 mt-3 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                  <div className="flex items-center justify-center gap-2 text-yellow-300 font-orbitron font-black text-sm text-glow-gold">
                    <Trophy className="w-5 h-5 text-yellow-400 animate-pulse" />
                    <span>LOLOS SCRUTINEER // TIKET BABAK 2 AMAN!</span>
                  </div>
                  <p className="text-[11px] text-yellow-200/80 font-mono">
                    Selamat! Mobil Anda dinyatakan sah dan otomatis ditempatkan di Bagan Eliminasi Babak Kedua.
                  </p>
                </div>
              )}
              {myScrutStatus === 'disqualified' && (
                <div className="text-xs text-red-500 font-mono mt-2 font-bold flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4" />
                  <span>DISKUALIFIKASI OLEH SCRUTINEER</span>
                </div>
              )}
            </div>
          )}

          {/* GIANT "SIAP BALAP" BUTTON (Occupies 30% of screen height) */}
          {!isLocked && (
            <div className="min-h-[140px] flex">
              <button
                type="button"
                onClick={handleSetReady}
                disabled={loading || isReady}
                className={clsx(
                  "w-full flex-1 flex flex-col items-center justify-center py-8 clip-cyber-lg border-2 font-orbitron font-black uppercase tracking-wider transition-all duration-200 active:scale-95",
                  isReady 
                    ? "bg-neonGreen/20 border-neonGreen text-neonGreen shadow-glowGreen"
                    : "bg-neonGreen text-black border-white shadow-[0_0_25px_rgba(57,255,20,0.8)] hover:bg-neonGreen/90"
                )}
              >
                <Zap className="w-8 h-8 mb-1 animate-pulse" />
                <span className="text-2xl md:text-3xl">{isReady ? 'SUDAH SIAP BALAP' : 'SIAP BALAP'}</span>
                <span className="text-xs font-mono opacity-80 mt-1">
                  {isReady ? 'Menunggu Race Director Mengunci Balapan' : 'Tap untuk konfirmasi kesiapan'}
                </span>
              </button>
            </div>
          )}

          {/* LOCKED STATUS DISPLAY */}
          {isLocked && (
            <div className="p-4 bg-red-950/30 border border-red-500/80 clip-cyber text-center space-y-1 animate-pulse">
              <div className="text-sm font-orbitron font-black text-red-400">
                BALAPAN DIKUNCI // BERSIAP DI START
              </div>
              <p className="text-xs text-cyberSilver/70 font-mono">
                1 Kupon telah didebet. Tombol batal dinonaktifkan.
              </p>
            </div>
          )}

          {/* GIANT "BATAL / SALAH JALUR" BUTTON */}
          {!isLocked && (
            <CyberButton
              variant="red"
              size="lg"
              className="w-full py-4 text-sm"
              disabled={loading}
              onClick={handleCancel}
            >
              BATAL / SALAH JALUR (REFUND KUPON)
            </CyberButton>
          )}
        </div>
      )}
    </div>
  );
}
