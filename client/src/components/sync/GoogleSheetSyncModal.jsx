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
  Sparkles
} from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';
import { fetchWithAuth } from '../../utils/api.js';

export function GoogleSheetSyncModal({ isOpen, onClose, onSuccess }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSyncInfo, setLastSyncInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
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
        setLastSyncInfo(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch sheet sync config:', e);
    } finally {
      setFetchingConfig(false);
    }
  };

  if (!isOpen) return null;

  const handleExecuteSync = async (e) => {
    if (e) e.preventDefault();
    if (!sheetUrl.trim()) {
      setError('URL Google Sheets tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetchWithAuth('/api/participants/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_url: sheetUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Gagal menyinkronkan data pembalap.');
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      setSyncResult(data.data);
      sound.playTone(880, 'sine', 0.15, 0.2);
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
      <div className="relative w-full max-w-2xl bg-midnight border border-neonCyan/60 p-5 md:p-6 clip-cyber shadow-[0_0_30px_rgba(0,240,255,0.2)]">
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
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg md:text-xl font-orbitron font-bold text-white tracking-wider">
                SINKRONISASI GOOGLE SHEETS
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-orbitron font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/50 clip-cyber uppercase">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs font-mono text-cyberSilver/70 mt-0.5">
              Tarik data pembalap terverifikasi (Lunas / Presale / OTS) langsung dari Google Spreadsheet ke event aktif.
            </p>
          </div>
        </div>

        {/* Sync Form */}
        <form onSubmit={handleExecuteSync} className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron font-bold text-cyberSilver uppercase mb-1.5 flex items-center justify-between">
              <span>URL Google Spreadsheet</span>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neonCyan hover:underline inline-flex items-center gap-1 normal-case font-mono text-[11px]"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=..."
              disabled={loading || fetchingConfig}
              className="w-full px-3.5 py-2.5 bg-obsidian border border-gray-700 focus:border-neonCyan text-white text-xs font-mono clip-cyber outline-none transition"
            />
            <p className="text-[11px] font-mono text-gray-500 mt-1">
              *Mendukung link sharing publik atau viewer dengan tab <code className="text-cyberSilver">gid</code> spesifik.
            </p>
          </div>

          {/* Last Sync Info Pill */}
          {lastSyncInfo?.lastSyncTime && !syncResult && (
            <div className="px-3 py-2 bg-obsidian/60 border border-gray-800 text-[11px] font-mono text-cyberSilver flex items-center justify-between clip-cyber">
              <span>Terakhir disinkronkan:</span>
              <span className="text-emerald-400 font-bold">
                {new Date(lastSyncInfo.lastSyncTime).toLocaleString('id-ID')}
              </span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500 text-red-300 text-xs font-mono flex items-start gap-2 clip-cyber">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold font-orbitron uppercase">Gagal Menyinkronkan</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Success Result View */}
          {syncResult && (
            <div className="space-y-3 p-4 bg-emerald-950/20 border border-emerald-500/50 clip-cyber animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-orbitron font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SINKRONISASI BERHASIL!</span>
                </div>
                <span className="text-xs font-mono text-cyberSilver">
                  {syncResult.totalFound} Data Ditemukan
                </span>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="p-2 bg-black/40 border border-emerald-500/30 clip-cyber">
                  <div className="text-[10px] text-emerald-400 font-orbitron uppercase">Pembalap Baru</div>
                  <div className="text-xl font-orbitron font-bold text-emerald-300 mt-0.5">
                    +{syncResult.addedCount}
                  </div>
                </div>
                <div className="p-2 bg-black/40 border border-gray-800 clip-cyber">
                  <div className="text-[10px] text-gray-400 font-orbitron uppercase">Dilewati (Duplikat/Unpaid)</div>
                  <div className="text-xl font-orbitron font-bold text-gray-300 mt-0.5">
                    {syncResult.skippedCount}
                  </div>
                </div>
              </div>

              {/* Added Racers Scroll List */}
              {syncResult.added && syncResult.added.length > 0 && (
                <div className="mt-2">
                  <div className="text-[11px] font-orbitron font-bold text-cyberSilver uppercase mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-neonCyan" />
                    <span>Pembalap Baru Ditambahkan (#{syncResult.added[0]?.participant_number} s/d #{syncResult.added[syncResult.added.length - 1]?.participant_number})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                    {syncResult.added.map((r) => (
                      <div
                        key={r.id}
                        className="px-2.5 py-1 bg-black/60 border border-gray-800 flex items-center justify-between text-cyberSilver"
                      >
                        <span className="font-bold text-white">#{r.participant_number} {r.name}</span>
                        <span className="text-[10px] text-neonCyan">{r.team_name || 'Individual'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
            <CyberButton
              type="button"
              variant="dark"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              {syncResult ? 'SELESAI' : 'BATAL'}
            </CyberButton>

            <CyberButton
              type="submit"
              variant="green"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              disabled={loading || fetchingConfig}
            >
              {loading ? 'MENYINKRONKAN...' : syncResult ? 'SYNC ULANG' : 'SINKRONISASIKAN SEKARANG'}
            </CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
}
