import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, X, ArrowRight, Loader2 } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';

export function ParticipantImportModal({ onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { valid: [], skipped: [] }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setCsvContent(text);
        await requestPreview(text);
      }
    };
    reader.onerror = () => {
      setError('Gagal membaca file CSV.');
    };
    reader.readAsText(file);
  };

  const requestPreview = async (text) => {
    if (!text.trim()) {
      setError('File atau teks CSV kosong.');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/participants/import-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal memproses preview data CSV.');
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      setPreview(data.data);
      sound.playTone(600, 'sine', 0.08, 0.1);
    } catch (err) {
      setError('Gagal terhubung ke server untuk preview.');
      sound.playTone(250, 'sawtooth', 0.2, 0.2);
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!preview || !preview.valid || preview.valid.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/participants/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: preview.valid
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal mengimpor daftar peserta.');
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      sound.playTone(880, 'sine', 0.15, 0.2);
      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      setError('Gagal mengeksekusi import data ke server.');
      sound.playTone(250, 'sawtooth', 0.2, 0.2);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-obsidian border-2 border-neonCyan clip-cyber p-5 md:p-6 shadow-[0_0_40px_rgba(0,240,255,0.25)] max-h-[90vh] flex flex-col">
        {/* HUD Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neonCyan" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neonCyan" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neonCyan" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neonCyan" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={importing}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3 mb-4 shrink-0">
          <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber">
            <Upload className="w-6 h-6 text-neonCyan" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-orbitron font-black text-white tracking-wider">
              IMPORT ROSTER PESERTA (CSV)
            </h3>
            <p className="text-xs font-mono text-neonCyan">
              Upload file CSV daftar pembalap untuk penomoran otomatis berurutan
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 mb-4 bg-neonPink/20 border border-neonPink text-neonPink text-xs font-mono clip-cyber shrink-0">
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* File Picker Zone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-neonCyan/80 bg-black/40 p-6 text-center cursor-pointer transition-colors clip-cyber group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText className="w-10 h-10 text-gray-500 group-hover:text-neonCyan mx-auto mb-2 transition-colors" />
            <div className="text-sm font-orbitron font-bold text-white mb-1">
              {fileName ? fileName : 'PILIH ATAU DRAG & DROP FILE CSV'}
            </div>
            <p className="text-xs font-mono text-gray-400">
              Mendukung format standar (nama, tim) atau format roster STC Vol 8
            </p>
          </div>

          {parsing && (
            <div className="p-4 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-neonCyan mx-auto" />
              <div className="text-xs font-mono text-gray-300">Memeriksa dan memvalidasi baris CSV...</div>
            </div>
          )}

          {/* Preview Statistics & Data */}
          {preview && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neonGreen/10 border border-neonGreen/60 p-3 clip-cyber flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-neonGreen" />
                    <span className="text-xs font-orbitron font-bold text-gray-200">BARIS VALID:</span>
                  </div>
                  <span className="text-xl font-orbitron font-black text-neonGreen">
                    {preview.valid?.length || 0}
                  </span>
                </div>

                <div className="bg-neonAmber/10 border border-neonAmber/60 p-3 clip-cyber flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-neonAmber" />
                    <span className="text-xs font-orbitron font-bold text-gray-200">DILEWATI:</span>
                  </div>
                  <span className="text-xl font-orbitron font-black text-neonAmber">
                    {preview.skipped?.length || 0}
                  </span>
                </div>
              </div>

              {/* Valid preview sample */}
              {preview.valid && preview.valid.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-gray-300 flex justify-between">
                    <span>CONTOH DATA VALID (MAKS 5 DITAMPILKAN):</span>
                    <span className="text-neonCyan">Total: {preview.valid.length} Peserta</span>
                  </div>
                  <div className="bg-black/60 border border-gray-800 p-2 text-xs font-mono max-h-32 overflow-y-auto divide-y divide-gray-800">
                    {preview.valid.slice(0, 5).map((r, i) => (
                      <div key={i} className="py-1.5 flex justify-between items-center text-gray-200">
                        <span className="font-bold text-white uppercase">{r.name}</span>
                        <span className="text-neonPink text-[11px]">TIM: {r.team_name || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped preview sample */}
              {preview.skipped && preview.skipped.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-neonAmber flex justify-between">
                    <span>BARIS DILEWATI / TIDAK LUNAS:</span>
                    <span>Total: {preview.skipped.length} Baris</span>
                  </div>
                  <div className="bg-black/60 border border-gray-800 p-2 text-xs font-mono max-h-28 overflow-y-auto divide-y divide-gray-800">
                    {preview.skipped.map((s, i) => (
                      <div key={i} className="py-1 flex justify-between text-gray-400 text-[11px]">
                        <span>Baris {s.row}:</span>
                        <span className="text-amber-400/80">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800 shrink-0 mt-2">
          <CyberButton
            type="button"
            variant="dark"
            size="md"
            onClick={onClose}
            disabled={importing}
          >
            Batal
          </CyberButton>

          <CyberButton
            type="button"
            variant="cyan"
            size="md"
            disabled={importing || !preview || !preview.valid || preview.valid.length === 0}
            onClick={handleExecuteImport}
            icon={importing ? Loader2 : ArrowRight}
          >
            {importing 
              ? 'Mengimpor Data...' 
              : `Import ${preview?.valid?.length || 0} Peserta`}
          </CyberButton>
        </div>
      </div>
    </div>
  );
}
