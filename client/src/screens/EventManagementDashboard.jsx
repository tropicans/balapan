import React, { useState, useEffect, useCallback } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Archive,
  Play,
  AlertCircle,
  Clock,
  Flag,
  FileText,
  Activity
} from 'lucide-react';
import clsx from 'clsx';

export function EventManagementDashboard() {
  const { socket } = useRace();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Form state
  const [nama, setNama] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jumlahLap, setJumlahLap] = useState(3);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEvents(data.data);
      } else {
        setError(data.error || 'Gagal memuat daftar event');
      }
    } catch (e) {
      setError('Koneksi ke server database turnamen terputus');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time WebSocket sync via STATE_UPDATE
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = () => {
      fetchEvents();
    };

    socket.on('STATE_UPDATE', handleStateUpdate);
    return () => {
      socket.off('STATE_UPDATE', handleStateUpdate);
    };
  }, [socket, fetchEvents]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError('Nama event wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          tanggal: tanggal || null,
          jumlah_lap: Number(jumlahLap) || 3,
          catatan: catatan.trim() || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setFeedback(`Event "${data.data.nama}" berhasil dibuat!`);
        setNama('');
        setCatatan('');
        setJumlahLap(3);
        await fetchEvents();
      } else {
        setError(data.error || 'Gagal membuat event');
      }
    } catch (err) {
      setError('Gagal menghubungi server untuk membuat event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (eventId, eventNama) => {
    setActionInProgress(eventId);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/events/${eventId}/activate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`Event "${eventNama}" sekarang aktif!`);
        await fetchEvents();
      } else {
        setError(data.error || 'Gagal mengaktifkan event');
      }
    } catch (err) {
      setError('Koneksi ke server terputus saat aktivasi event');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleArchive = async (eventId, eventNama) => {
    setActionInProgress(eventId);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/events/${eventId}/archive`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`Event "${eventNama}" berhasil diarsipkan.`);
        await fetchEvents();
      } else {
        setError(data.error || 'Gagal mengarsipkan event');
      }
    } catch (err) {
      setError('Koneksi ke server terputus saat pengarsipan event');
    } finally {
      setActionInProgress(null);
    }
  };

  const activeEvent = events.find((ev) => ev.status === 'active');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-neonCyan animate-pulse" />
            <h1 className="text-2xl font-orbitron font-black text-white tracking-wider">
              MANAJEMEN EVENT
            </h1>
          </div>
          <p className="text-xs text-cyberSilver/70 font-mono mt-1">
            Pusat Kontrol Jadwal, Status & Konfigurasi Turnamen (Multi-Event System)
          </p>
        </div>

        {/* Current Active Event Chip */}
        <div className="flex items-center space-x-3 bg-obsidian/80 border border-gray-800 px-4 py-2 clip-cyber">
          <Activity className="w-4 h-4 text-neonGreen animate-pulse" />
          <div>
            <div className="text-[10px] uppercase font-mono text-gray-400">Event Aktif Saat Ini</div>
            <div className="text-sm font-orbitron font-bold text-neonGreen">
              {activeEvent ? activeEvent.nama : 'TIDAK ADA EVENT AKTIF'}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback & Error Alerts */}
      {feedback && (
        <div className="bg-neonGreen/10 border border-neonGreen/40 text-neonGreen p-3 clip-cyber flex items-center space-x-2 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="bg-neonRed/10 border border-neonRed/40 text-neonRed p-3 clip-cyber flex items-center space-x-2 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Form on Left/Top, List on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Event Card */}
        <CyberCard title="BUAT EVENT BARU" icon={Plus} color="cyan">
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-xs font-orbitron text-cyberSilver mb-1">
                NAMA EVENT <span className="text-neonRed">*</span>
              </label>
              <input
                type="text"
                value={nama}
                maxLength={100}
                onChange={(e) => setNama(e.target.value)}
                placeholder="misal: STC Grand Prix Series 2026"
                className="w-full bg-black/60 border border-gray-700 text-white font-mono px-3 py-2 text-sm focus:border-neonCyan outline-none clip-cyber"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-orbitron text-cyberSilver mb-1">
                  TANGGAL
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full bg-black/60 border border-gray-700 text-white font-mono px-3 py-2 text-sm focus:border-neonCyan outline-none clip-cyber"
                />
              </div>

              <div>
                <label className="block text-xs font-orbitron text-cyberSilver mb-1">
                  JUMLAH LAP
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={jumlahLap}
                  onChange={(e) => setJumlahLap(e.target.value)}
                  className="w-full bg-black/60 border border-gray-700 text-white font-mono px-3 py-2 text-sm focus:border-neonCyan outline-none clip-cyber"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-orbitron text-cyberSilver mb-1">
                CATATAN / ATURAN
              </label>
              <textarea
                rows={3}
                value={catatan}
                maxLength={500}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan regulasi, lokasi trek, atau detail panitia (maks. 500 karakter)..."
                className="w-full bg-black/60 border border-gray-700 text-white font-mono px-3 py-2 text-sm focus:border-neonCyan outline-none clip-cyber resize-none"
              />
            </div>

            <CyberButton
              type="submit"
              color="cyan"
              className="w-full justify-center"
              disabled={submitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              {submitting ? 'MENYIMPAN...' : 'TAMBAH EVENT'}
            </CyberButton>
          </form>
        </CyberCard>

        {/* Event List Card */}
        <div className="lg:col-span-2">
          <CyberCard title={`DAFTAR EVENT (${events.length})`} icon={Calendar} color="amber">
            {loading && events.length === 0 ? (
              <div className="p-8 text-center text-cyberSilver/50 font-mono text-xs">
                Memuat data event...
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-cyberSilver/50 font-mono text-xs">
                Belum ada event yang terdaftar.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => {
                  const isActive = ev.status === 'active';
                  const isProcessing = actionInProgress === ev.id;

                  return (
                    <div
                      key={ev.id}
                      className={clsx(
                        'p-4 transition-all duration-200 border clip-cyber',
                        isActive
                          ? 'bg-neonCyan/5 border-neonCyan/60 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                          : 'bg-black/40 border-gray-800 hover:border-gray-700'
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-orbitron font-bold text-white text-base">
                              {ev.nama}
                            </span>
                            {isActive ? (
                              <span className="bg-neonCyan/20 text-neonCyan border border-neonCyan/40 text-[10px] font-mono px-2 py-0.5 rounded tracking-wider uppercase font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-neonCyan animate-ping" />
                                AKTIF
                              </span>
                            ) : (
                              <span className="bg-gray-800/80 text-gray-400 border border-gray-700 text-[10px] font-mono px-2 py-0.5 rounded tracking-wider uppercase">
                                DIARSIPKAN
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-cyberSilver/70">
                            {ev.tanggal && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-cyberGold" />
                                {ev.tanggal}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Flag className="w-3.5 h-3.5 text-neonGreen" />
                              {ev.jumlah_lap || 3} Lap
                            </span>
                            <span className="text-gray-500 text-[10px]">
                              ID: {ev.id.substring(0, 8)}...
                            </span>
                          </div>

                          {ev.catatan && (
                            <p className="text-xs font-mono text-gray-400 pt-1 italic">
                              "{ev.catatan}"
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0">
                          {isActive ? (
                            <CyberButton
                              color="amber"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleArchive(ev.id, ev.nama)}
                            >
                              <Archive className="w-3.5 h-3.5 mr-1.5" />
                              {isProcessing ? 'PROSES...' : 'ARSIPKAN'}
                            </CyberButton>
                          ) : (
                            <CyberButton
                              color="green"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleActivate(ev.id, ev.nama)}
                            >
                              <Play className="w-3.5 h-3.5 mr-1.5" />
                              {isProcessing ? 'PROSES...' : 'AKTIFKAN'}
                            </CyberButton>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CyberCard>
        </div>
      </div>
    </div>
  );
}
export default EventManagementDashboard;
