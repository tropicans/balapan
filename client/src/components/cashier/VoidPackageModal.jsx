import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';
import clsx from 'clsx';

export function VoidPackageModal({ pkg, onClose, onSuccess }) {
  const newSerialInputRef = useRef(null);
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pkg) {
      setNewSerialNumber('');
      setReason('');
      setError(null);
      setTimeout(() => {
        newSerialInputRef.current?.focus();
      }, 50);
    }
  }, [pkg]);

  if (!pkg) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanNewSerial = newSerialNumber.trim().toUpperCase();
    if (!cleanNewSerial || cleanNewSerial.length < 4 || cleanNewSerial.length > 32) {
      setError('Nomor seri lembar baru wajib 4-32 karakter alfanumerik.');
      newSerialInputRef.current?.focus();
      return;
    }

    if (cleanNewSerial === pkg.serial_number) {
      setError('Nomor seri lembar baru tidak boleh sama dengan nomor seri lembar lama.');
      newSerialInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    sound.playTone(400, 'sawtooth', 0.1, 0.2);

    try {
      const res = await fetch(`/api/coupon-packages/${pkg.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_serial_number: cleanNewSerial,
          reason: reason.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(`Nomor Seri Baru Sudah Terdaftar: #${cleanNewSerial} sudah digunakan di sistem.`);
        } else {
          setError(data.error || 'Gagal memproses void lembar kupon.');
        }
        sound.playTone(250, 'sawtooth', 0.2, 0.2);
        return;
      }

      sound.playTone(880, 'triangle', 0.15, 0.2);
      if (onSuccess) onSuccess(data.data.new_package);
      onClose();
    } catch (err) {
      setError('Terjadi kendala jaringan saat menghubungi server turnamen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-obsidian border-2 border-neonPink clip-cyber p-5 md:p-6 shadow-[0_0_30px_rgba(255,0,85,0.4)]">
        {/* HUD Decorative Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neonPink" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neonPink" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neonPink" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neonPink" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3 mb-4">
          <div className="w-10 h-10 bg-neonPink/20 border border-neonPink flex items-center justify-center clip-cyber">
            <AlertTriangle className="w-6 h-6 text-neonPink animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-orbitron font-black text-white tracking-wider text-glow-pink">
              DARURAT // VOID & GANTI LEMBAR
            </h3>
            <p className="text-xs font-mono text-neonPink">
              Transfer Kuota Lembaran Rusak / Basah / Sobek di Pit
            </p>
          </div>
        </div>

        {/* Target Package Summary */}
        <div className="bg-black/60 border border-gray-800 p-3.5 mb-4 clip-cyber space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-gray-300">
            <span>LEMBAR SERI LAMA:</span>
            <span className="font-bold text-neonAmber font-orbitron text-sm">
              #{pkg.serial_number}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-300">
            <span>PEMBALAP PEMILIK:</span>
            <span className="font-bold text-white truncate max-w-[200px]">
              {pkg.user_name} {pkg.team_name ? `[${pkg.team_name}]` : ''}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-300 border-t border-gray-800/80 pt-2">
            <span>SISA KUOTA DITRANSFER:</span>
            <span className="font-bold text-neonGreen font-orbitron text-sm">
              {pkg.remaining_quota} Kotak
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 bg-neonPink/20 border border-neonPink text-neonPink text-xs font-mono clip-cyber">
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
              NOMOR SERI FISIK LEMBAR BARU <span className="text-neonPink">*</span>
            </label>
            <input
              ref={newSerialInputRef}
              type="text"
              required
              value={newSerialNumber}
              onChange={(e) => setNewSerialNumber(e.target.value.toUpperCase())}
              placeholder="CONTOH: 099 ATAU CPN-099"
              className="w-full bg-black/70 border border-neonPink/80 focus:border-neonPink focus:ring-2 focus:ring-neonPink/50 text-white font-mono text-base font-bold px-3 py-2 outline-none tracking-wider"
            />
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Ambil lembar kertas fisik baru dari laci kasir dan ketikkan nomor serinya.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
              ALASAN VOID / CATATAN (OPSIONAL)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cth: Kertas basah oli di pit sirkuit"
              className="w-full bg-black/70 border border-gray-700 focus:border-gray-500 text-white font-mono text-xs px-3 py-2 outline-none"
            />
          </div>

          {/* Warning Confirmation Notice (Copywriting contract) */}
          <div className="p-3 bg-red-950/30 border border-red-500/40 text-[11px] font-mono text-gray-300 clip-cyber">
            <span className="text-neonPink font-bold">PERINGATAN PERMANEN:</span>{' '}
            Lembar seri #{pkg.serial_number} akan dinonaktifkan secara permanen dan seluruh sisa {pkg.remaining_quota} kuota akan dialihkan ke lembar baru #{newSerialNumber || '...'}. Saldo digital peserta tidak berubah.
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <CyberButton
              type="button"
              variant="dark"
              size="md"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </CyberButton>

            <CyberButton
              type="submit"
              variant="pink"
              size="md"
              disabled={submitting || !newSerialNumber.trim()}
              icon={submitting ? Loader2 : RefreshCw}
            >
              {submitting ? 'MEMPROSES VOID...' : 'Void & Ganti Lembar'}
            </CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
}
