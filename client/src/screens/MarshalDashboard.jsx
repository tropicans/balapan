import React, { useState, useEffect, useCallback } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { LaneSelector } from '../components/marshal/LaneSelector.jsx';
import { OnScreenNumpad } from '../components/marshal/OnScreenNumpad.jsx';
import { WinnerBanner } from '../components/marshal/WinnerBanner.jsx';
import { Round2BracketExecution } from '../components/marshal/Round2BracketExecution.jsx';
import { playSuccessChime, playErrorBuzz, playActionClick } from '../utils/audioChime.js';
import { ShieldCheck, Flag, Clock, Wifi, WifiOff, Award, GitBranch, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export function MarshalDashboard() {
  const { connected, socket, raceState } = useRace();

  // Dual mode: 'round1' (Kualifikasi Cepat) vs 'round2' (Bracket Eliminasi)
  const [activeMode, setActiveMode] = useState('round1');

  // Round 1 State
  const [selectedLane, setSelectedLane] = useState(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [showLaneError, setShowLaneError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [latestWinner, setLatestWinner] = useState(null);
  const [recentWinners, setRecentWinners] = useState([]);
  const [undoLoading, setUndoLoading] = useState(false);

  // Round 2 State
  const [activeBracketMatch, setActiveBracketMatch] = useState(null);
  const [bracketLoading, setBracketLoading] = useState(false);

  // Circuit Clock (Live Time)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'));
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch recent winners from backend
  const fetchRecentWinners = useCallback(async () => {
    try {
      const res = await fetch('/api/marshal/recent-winners');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setRecentWinners(data.data);
        if (!latestWinner && data.data.length > 0) {
          const firstActive = data.data.find(w => w.status === 'active') || data.data[0];
          setLatestWinner({
            log_id: firstActive.id,
            serial_number: firstActive.serial_number,
            user_name: firstActive.user_name,
            team_name: firstActive.team_name,
            lane: firstActive.lane,
            box_number: firstActive.box_number,
            remaining_quota: firstActive.remaining_quota,
            total_quota: firstActive.total_quota,
            status: firstActive.status,
            created_at: firstActive.created_at
          });
        }
      }
    } catch (err) {
      console.warn('Gagal memuat recent winners:', err);
    }
  }, [latestWinner]);

  // Fetch active bracket match for Round 2
  const fetchActiveBracketMatch = useCallback(async () => {
    setBracketLoading(true);
    try {
      const res = await fetch('/api/marshal/active-bracket-match');
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveBracketMatch(data.data?.match || null);
      }
    } catch (err) {
      console.warn('Gagal memuat active bracket match:', err);
    } finally {
      setBracketLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRecentWinners();
    fetchActiveBracketMatch();
  }, [fetchRecentWinners, fetchActiveBracketMatch]);

  // Socket.IO Real-Time Listeners
  useEffect(() => {
    if (!socket) return;

    const handleWinnerRecorded = (payload) => {
      if (payload?.winner) {
        setLatestWinner({
          ...payload.winner,
          status: 'active',
          created_at: payload.timestamp || new Date().toISOString()
        });
        fetchRecentWinners();
      }
    };

    const handleWinnerUndone = (payload) => {
      setLatestWinner(prev => {
        if (prev && prev.log_id === payload.log_id) {
          return { ...prev, status: 'undone' };
        }
        return prev;
      });
      fetchRecentWinners();
    };

    const handleBracketUpdated = () => {
      fetchActiveBracketMatch();
    };

    socket.on('marshal:winner-recorded', handleWinnerRecorded);
    socket.on('marshal:winner-undone', handleWinnerUndone);
    socket.on('bracket_updated', handleBracketUpdated);
    socket.on('STATE_UPDATE', () => {
      fetchActiveBracketMatch();
    });

    return () => {
      socket.off('marshal:winner-recorded', handleWinnerRecorded);
      socket.off('marshal:winner-undone', handleWinnerUndone);
      socket.off('bracket_updated', handleBracketUpdated);
      socket.off('STATE_UPDATE');
    };
  }, [socket, fetchRecentWinners, fetchActiveBracketMatch]);

  // Handle Record Winner (Babak 1)
  const handleRecordWinner = async () => {
    if (!selectedLane) {
      setShowLaneError(true);
      playErrorBuzz();
      return;
    }
    setShowLaneError(false);

    const cleanSerial = serialNumber.trim().toUpperCase();
    if (!cleanSerial) {
      setErrorBanner({
        title: 'Nomor Seri Kupon Wajib Diisi',
        message: 'Masukkan nomor seri kupon fisik yang dibawa pemenang.'
      });
      playErrorBuzz();
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/marshal/record-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: cleanSerial,
          lane: selectedLane
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        playErrorBuzz();
        if (res.status === 404 && data.code === 'COUPON_NOT_FOUND') {
          setErrorBanner({
            title: 'Kupon Belum Terdaftar Di Kasir',
            message: `Nomor seri kupon #${cleanSerial} tidak ditemukan di sistem. Peserta harus mendaftarkan lembar kupon terlebih dahulu di meja kasir.`
          });
        } else {
          setErrorBanner({
            title: 'Gagal Mencatat Pemenang',
            message: data.error || 'Terjadi kesalahan sistem saat memproses pemenang.'
          });
        }
        return;
      }

      // Success! Play positive chime
      playSuccessChime();
      setLatestWinner({
        ...data.data,
        status: 'active',
        created_at: new Date().toISOString()
      });

      // Clear input fields ready for next heat
      setSerialNumber('');
      setSelectedLane(null);
      fetchRecentWinners();
    } catch (err) {
      playErrorBuzz();
      setErrorBanner({
        title: 'Gangguan Jaringan',
        message: err.message || 'Gagal tersambung ke server turnamen. Silakan periksa koneksi WiFi / LAN.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Undo Last Winner (<= 60s)
  const handleUndoWinner = async (logId) => {
    setUndoLoading(true);
    try {
      const res = await fetch('/api/marshal/undo-last-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        playErrorBuzz();
        alert(data.error || 'Gagal membatalkan kemenangan');
        return;
      }

      playActionClick();
      setLatestWinner(prev => prev ? { ...prev, status: 'undone' } : null);
      fetchRecentWinners();
    } catch (err) {
      playErrorBuzz();
      alert('Terjadi kesalahan jaringan saat membatalkan kemenangan.');
    } finally {
      setUndoLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top HUD Header: Circuit Clock, WebSocket Status, and Dual Mode Switcher */}
      <div className="bg-obsidian border-2 border-neonCyan/30 rounded-lg p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-glowCyan">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-neonCyan/20 border border-neonCyan flex items-center justify-center text-neonCyan flex-shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-orbitron font-bold text-neonCyan uppercase tracking-widest leading-none">
                MEJA JURI FINISH & MARSHAL
              </div>
              <h2 className="text-sm sm:text-base font-orbitron font-black text-white truncate max-w-[200px] sm:max-w-xs">
                NEO-TAMIYA HUD v2.0
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {connected ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-950/60 border border-green-500/40 text-neonGreen font-bold">
                <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                <span className="hidden sm:inline">ONLINE</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-500 text-red-400 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>OFFLINE</span>
              </span>
            )}
            <span className="text-cyberSilver/70 px-2 py-0.5 bg-midnight rounded border border-gray-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-neonCyan" />
              {currentTime}
            </span>
          </div>
        </div>

        {/* Dual Mode Switcher: Babak 1 vs Babak 2 */}
        <div className="flex items-center gap-1 bg-midnight p-1 rounded-lg border border-gray-800 w-full md:w-auto justify-center">
          <button
            type="button"
            onClick={() => {
              playActionClick();
              setActiveMode('round1');
            }}
            className={clsx(
              "px-3.5 py-2 rounded text-xs font-orbitron font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeMode === 'round1'
                ? "bg-neonAmber text-black shadow-[0_0_15px_rgba(255,170,0,0.4)]"
                : "text-cyberSilver/70 hover:text-white"
            )}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Babak 1: Kualifikasi Cepat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playActionClick();
              setActiveMode('round2');
              fetchActiveBracketMatch();
            }}
            className={clsx(
              "px-3.5 py-2 rounded text-xs font-orbitron font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeMode === 'round2'
                ? "bg-neonPink text-white shadow-[0_0_15px_rgba(255,0,127,0.4)]"
                : "text-cyberSilver/70 hover:text-white"
            )}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Babak 2: Bracket Eliminasi</span>
          </button>
        </div>
      </div>

      {/* Main Mode View Area */}
      {activeMode === 'round1' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column (7 cols): Lane Selector & Touch Numpad */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 bg-obsidian/90 border border-gray-800 rounded-lg p-4 sm:p-5">
            {/* Step 1: Lane Selector */}
            <LaneSelector
              selectedLane={selectedLane}
              onSelectLane={(lane) => {
                setSelectedLane(lane);
                setShowLaneError(false);
              }}
              showError={showLaneError}
            />

            <div className="border-t border-gray-800/80 pt-2" />

            {/* Step 2: Physical Coupon Serial Numpad */}
            <OnScreenNumpad
              serialNumber={serialNumber}
              setSerialNumber={(val) => {
                setErrorBanner(null);
                setSerialNumber(val);
              }}
              onSubmit={handleRecordWinner}
              disabled={submitting}
              loading={submitting}
              errorBanner={errorBanner}
              selectedLane={selectedLane}
            />
          </div>

          {/* Right Column (5 cols): Winner Banner, Instruction, Undo 60s & Recent Logs */}
          <div className="lg:col-span-5 space-y-4">
            <WinnerBanner
              latestWinner={latestWinner}
              recentWinners={recentWinners}
              onUndoWinner={handleUndoWinner}
              undoLoading={undoLoading}
            />
          </div>
        </div>
      ) : (
        /* Round 2 Mode: Bracket Active Match & 1-Tap Selection */
        <div className="w-full">
          <Round2BracketExecution
            activeMatch={activeBracketMatch}
            onRefresh={fetchActiveBracketMatch}
            loading={bracketLoading}
          />
        </div>
      )}
    </div>
  );
}
