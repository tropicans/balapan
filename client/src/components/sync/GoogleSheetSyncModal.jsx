import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ExternalLink,
  Users,
  Check,
  ChevronRight,
  Sparkles,
  Clock,
  Layers,
  Save
} from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';
import { fetchWithAuth } from '../../utils/api.js';

export function GoogleSheetSyncModal({ isOpen, onClose, onSuccess }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [bracketUrl, setBracketUrl] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState(60);

  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSyncInfo, setLastSyncInfo] = useState(null);
  const [allowMultiEntry, setAllowMultiEntry] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setSyncResult(null);
      fetchCurrentConfig();
    }
  }, [isOpen]);

  const fetchCurrentConfig = async () => {
    setFetchingConfig(true);
    try {
      const res = await fetchWithAuth('/api/participants/sync-sheet/status');
      const data = await res.json();
      if (data.success && data.data) {
        setSheetUrl(data.data.configuredUrl || '');
        setBracketUrl(data.data.bracketConfig?.configuredUrl || '');
        if (data.data.scheduler) {
          setAutoSyncEnabled(Boolean(data.data.scheduler.enabled));
          setSyncIntervalSeconds(data.data.scheduler.intervalSeconds || 60);
        }
        setLastSyncInfo(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch sheet sync config:', e);
    } finally {
      setFetchingConfig(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetchWithAuth('/api/participants/sync-sheet/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: autoSyncEnabled,
          intervalSeconds: Number(syncIntervalSeconds),
          participantUrl: sheetUrl.trim(),
          bracketUrl: bracketUrl.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan konfigurasi');
      }
      setSuccessMsg('Konfigurasi auto-sync berhasil disimpan.');
      sound.playTone(600, 'sine', 0.1, 0.15);
      fetchCurrentConfig();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan konfigurasi');
      sound.playTone(250, 'sawtooth', 0.2, 0.2);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExecuteSyncAll = async (e) => {
    if (e) e.preventDefault();
    if (!sheetUrl.trim()) {
      setError('URL Google Sheets Peserta tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setSyncResult(null);

    try {
      const res = await fetchWithAuth('/api/participants/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Gagal menyinkronkan data.');
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      setSyncResult(data.data);
      sound.playTone(880, 'sine', 0.15, 0.2);
      fetchCurrentConfig();
      if (onSuccess) onSuccess(data.data);
    } catch (err) {
      setError('Gagal menghubungi server untuk sinkronisasi Google Sheets.');
      sound.playTone(250, 'sawtooth', 0.2, 0.2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-midnight border border-neonCyan/60 p-5 md:p-6 clip-cyber shadow-[0_0_30px_rgba(0,240,255,0.2)] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-cyberSilver hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-4">
          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-400 flex items-center justify-center clip-cyber shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg md:text-xl font-orbitron font-bold text-white tracking-wider">
                SINKRONISASI GOOGLE SHEETS
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-orbitron font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/50 clip-cyber uppercase">
                AUTO CRON 1 MENIT
              </span>
            </div>
            <p className="text-xs font-mono text-cyberSilver/70 mt-0.5">
              Sinkronisasi otomatis background setiap 1 menit untuk data Pembalap &amp; Heat Babak Eliminasi.
            </p>
          </div>
        </div>

        {/* Sync Form */}
        <div className="space-y-4">
          {/* Tab 1: Peserta URL */}
          <div>
            <label className="block text-xs font-orbitron font-bold text-cyberSilver uppercase mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neonCyan" />
                1. URL Google Sheet Peserta (Tab Daftar Pembalap)
              </span>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neonCyan hover:underline inline-flex items-center gap-1 normal-case font-mono text-[11px]"
                >
                  <span>Buka Tab Peserta</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=1028020136#gid=1028020136"
              disabled={loading || fetchingConfig}
              className="w-full px-3.5 py-2 bg-obsidian border border-gray-700 focus:border-neonCyan text-white text-xs font-mono clip-cyber outline-none transition"
            />
          </div>

          {/* Tab 2: Bracket URL */}
          <div>
            <label className="block text-xs font-orbitron font-bold text-cyberSilver uppercase mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-neonAmber" />
                2. URL Google Sheet Babak Selanjutnya (Tab Heats &amp; Finisher)
              </span>
              {bracketUrl && (
                <a
                  href={bracketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neonAmber hover:underline inline-flex items-center gap-1 normal-case font-mono text-[11px]"
                >
                  <span>Buka Tab Babak</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="url"
              value={bracketUrl}
              onChange={(e) => setBracketUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=1237789593#gid=1237789593"
              disabled={loading || fetchingConfig}
              className="w-full px-3.5 py-2 bg-obsidian border border-gray-700 focus:border-neonAmber text-white text-xs font-mono clip-cyber outline-none transition"
            />
          </div>

          {/* Auto-Sync Settings Panel */}
          <div className="p-3.5 bg-obsidian/90 border border-gray-800 clip-cyber space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neonGreen" />
                <span className="text-xs font-orbitron font-bold text-white uppercase">
                  Otomatisasi Cron Sync (Background)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neonGreen"></div>
              </label>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-cyberSilver pt-1 border-t border-gray-800/60">
              <span>Interval Sync Otomatis:</span>
              <div className="flex items-center gap-2">
                <select
                  value={syncIntervalSeconds}
                  onChange={(e) => setSyncIntervalSeconds(Number(e.target.value))}
                  className="bg-black border border-gray-700 px-2 py-1 text-xs text-white clip-cyber outline-none"
                >
                  <option value={30}>30 Detik</option>
                  <option value={60}>60 Detik (1 Menit - Rekomendasi)</option>
                  <option value={120}>2 Menit</option>
                  <option value={300}>5 Menit</option>
                </select>
                <CyberButton
                  type="button"
                  variant="dark"
                  size="xs"
                  icon={Save}
                  onClick={handleSaveConfig}
                  loading={savingConfig}
                >
                  Simpan
                </CyberButton>
              </div>
            </div>

            {/* Telemetry Status Bar */}
            <div className="flex items-center justify-between text-[11px] font-mono bg-black/50 p-2 clip-cyber">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-neonGreen animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-cyberSilver">
                  Status Scheduler: <strong className={autoSyncEnabled ? 'text-neonGreen' : 'text-gray-400'}>{autoSyncEnabled ? `Aktif (${syncIntervalSeconds}s)` : 'Nonaktif'}</strong>
                </span>
              </div>
              {lastSyncInfo?.scheduler?.lastRunAt && (
                <span className="text-gray-400">
                  Terakhir jalan: {new Date(lastSyncInfo.scheduler.lastRunAt).toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-2 clip-cyber">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500 text-red-300 text-xs font-mono flex items-start gap-2 clip-cyber">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold font-orbitron uppercase">Pemberitahuan</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Sync Result Cards */}
          {syncResult && (
            <div className="space-y-3 p-4 bg-emerald-950/20 border border-emerald-500/50 clip-cyber animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-orbitron font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SINKRONISASI BERHASIL!</span>
                </div>
                <span className="text-xs font-mono text-cyberSilver">
                  {syncResult.unchanged ? 'Data Identik (Tidak Ada Perubahan)' : 'Data Diperbarui'}
                </span>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center font-mono">
                <div className="p-2 bg-black/40 border border-emerald-500/30 clip-cyber">
                  <div className="text-[10px] text-emerald-400 font-orbitron uppercase">Pembalap Baru</div>
                  <div className="text-lg font-orbitron font-bold text-emerald-300 mt-0.5">
                    +{syncResult.participants?.addedCount || 0}
                  </div>
                </div>
                <div className="p-2 bg-black/40 border border-neonAmber/40 clip-cyber">
                  <div className="text-[10px] text-neonAmber font-orbitron uppercase">Pembalap Update</div>
                  <div className="text-lg font-orbitron font-bold text-neonAmber mt-0.5">
                    {syncResult.participants?.updatedCount || 0}
                  </div>
                </div>
                <div className="p-2 bg-black/40 border border-neonCyan/40 clip-cyber">
                  <div className="text-[10px] text-neonCyan font-orbitron uppercase">Heat Babak Baru</div>
                  <div className="text-lg font-orbitron font-bold text-neonCyan mt-0.5">
                    +{syncResult.bracket?.addedCount || 0}
                  </div>
                </div>
                <div className="p-2 bg-black/40 border border-emerald-500/40 clip-cyber">
                  <div className="text-[10px] text-emerald-400 font-orbitron uppercase">Heat Update/Selesai</div>
                  <div className="text-lg font-orbitron font-bold text-emerald-300 mt-0.5">
                    {syncResult.bracket?.updatedCount || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-800">
            <CyberButton
              type="button"
              variant="dark"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              TUTUP
            </CyberButton>

            <div className="flex items-center gap-2">
              <CyberButton
                type="button"
                variant="green"
                size="sm"
                icon={RefreshCw}
                loading={loading}
                disabled={loading || fetchingConfig}
                onClick={handleExecuteSyncAll}
              >
                {loading ? 'MENYINKRONKAN...' : 'SYNC SEMUA SEKARANG'}
              </CyberButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
