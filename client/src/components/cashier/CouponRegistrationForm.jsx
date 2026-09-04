import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle, 
  Hash, 
  Layers, 
  DollarSign, 
  CreditCard,
  PlusCircle,
  Loader2
} from 'lucide-react';
import { CyberButton } from '../ui/CyberButton.jsx';
import { sound } from '../../utils/audio.js';
import clsx from 'clsx';

export function CouponRegistrationForm({
  users = [],
  onRegistered,
  onRefreshUsers
}) {
  const serialInputRef = useRef(null);

  // Form states
  const [serialNumber, setSerialNumber] = useState('');
  const [racerMode, setRacerMode] = useState('select'); // 'select' | 'new'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [totalQuota, setTotalQuota] = useState(50);
  const [pricePaid, setPricePaid] = useState('100000');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [fetchingNext, setFetchingNext] = useState(false);

  // Autofocus serial input on mount
  useEffect(() => {
    serialInputRef.current?.focus();
  }, []);

  // Fetch next serial recommendation
  const handleGenerateNextSerial = async () => {
    setFetchingNext(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/coupon-packages/next-serial');
      const data = await res.json();
      if (data.success && data.data?.next_serial) {
        setSerialNumber(data.data.next_serial);
        sound.playTone(800, 'triangle', 0.05, 0.1);
      }
    } catch (e) {
      console.error('Failed to get next serial:', e);
    } finally {
      setFetchingNext(false);
      serialInputRef.current?.focus();
    }
  };

  // Quick Batch: increment serial number (+1) and keep racer
  const handleIncrementNextSheet = () => {
    setErrorBanner(null);
    setSuccessBanner(null);
    
    if (!serialNumber.trim()) {
      handleGenerateNextSerial();
      return;
    }

    const match = serialNumber.match(/(\d+)$/);
    if (match) {
      const numStr = match[1];
      const nextNum = parseInt(numStr, 10) + 1;
      const prefix = serialNumber.slice(0, -numStr.length);
      const nextStr = prefix + String(nextNum).padStart(numStr.length, '0');
      setSerialNumber(nextStr);
    } else {
      setSerialNumber(`${serialNumber.trim()}-1`);
    }

    sound.playTone(700, 'sine', 0.04, 0.1);
    serialInputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cleanSerial = serialNumber.trim().toUpperCase();
    if (!cleanSerial || cleanSerial.length < 4 || cleanSerial.length > 32) {
      setErrorBanner({
        title: 'Nomor Seri Tidak Valid',
        message: 'Nomor seri kupon wajib diisi (4-32 karakter alfanumerik).'
      });
      serialInputRef.current?.focus();
      return;
    }

    if (racerMode === 'select' && !selectedUserId) {
      setErrorBanner({
        title: 'Pembalap Belum Dipilih',
        message: 'Silakan pilih pembalap terdaftar atau beralih ke tab Buat Pembalap Baru.'
      });
      return;
    }

    if (racerMode === 'new' && !newUserName.trim()) {
      setErrorBanner({
        title: 'Nama Pembalap Wajib Diisi',
        message: 'Masukkan nama pembalap baru untuk mendaftarkan lembar kupon perdana.'
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        serial_number: cleanSerial,
        total_quota: parseInt(totalQuota, 10) || 50,
        price_paid: parseInt(pricePaid, 10) || 0,
        payment_method: paymentMethod
      };

      if (racerMode === 'select') {
        payload.user_id = selectedUserId;
      } else {
        payload.new_user_name = newUserName.trim();
        payload.team_name = teamName.trim() || undefined;
      }

      const res = await fetch('/api/coupon-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Copywriting contract for duplicate serial (D-03)
          const racer = data.existing_package?.user_name || 'peserta lain';
          setErrorBanner({
            title: 'Nomor Seri Sudah Terdaftar',
            message: `Nomor Seri Sudah Terdaftar: Lembar seri #${cleanSerial} sudah terdaftar atas nama ${racer}. Gunakan nomor seri fisik lain atau verifikasi pemilik lembar.`,
            isDuplicate: true
          });
        } else {
          setErrorBanner({
            title: 'Gagal Memproses Paket',
            message: data.error || 'Gagal Memproses Paket: Terjadi kendala saat menghubungi server database turnamen. Tekan tombol coba lagi.'
          });
        }
        sound.playTone(300, 'sawtooth', 0.15, 0.2);
        return;
      }

      // Success
      sound.playTone(880, 'triangle', 0.1, 0.2);
      const pkg = data.data.package;
      setSuccessBanner({
        message: `Lembar Seri #${pkg.serial_number} berhasil didaftarkan untuk ${pkg.user_name} (+${pkg.total_quota} Kupon Balap)!`,
        serial: pkg.serial_number
      });

      if (onRegistered) onRegistered(pkg);
      if (onRefreshUsers) onRefreshUsers();

      // Reset / Prepare next
      if (racerMode === 'new' && pkg.user_id) {
        // Switch to select mode with newly registered user
        setRacerMode('select');
        setSelectedUserId(pkg.user_id);
        setNewUserName('');
        setTeamName('');
      }

      // Auto-increment serial for rapid bundle registration
      const match = cleanSerial.match(/(\d+)$/);
      if (match) {
        const numStr = match[1];
        const nextNum = parseInt(numStr, 10) + 1;
        const prefix = cleanSerial.slice(0, -numStr.length);
        setSerialNumber(prefix + String(nextNum).padStart(numStr.length, '0'));
      } else {
        setSerialNumber('');
      }

      // Return focus to serial input
      setTimeout(() => {
        serialInputRef.current?.focus();
      }, 50);

    } catch (err) {
      setErrorBanner({
        title: 'Gagal Memproses Paket',
        message: 'Gagal Memproses Paket: Terjadi kendala jaringan saat menghubungi server turnamen. Tekan tombol coba lagi.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-obsidian border border-gray-800 p-4 md:p-5 clip-cyber relative flex flex-col space-y-4">
      {/* HUD Accent Corner */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neonAmber/60 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neonAmber/15 border border-neonAmber flex items-center justify-center clip-cyber">
            <Hash className="w-4 h-4 text-neonAmber" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-white text-sm md:text-base tracking-wider">
              REGISTRASI PAKET KUPON FISIK
            </h3>
            <p className="text-[11px] font-mono text-neonAmber">
              Form Cepat // Lembaran Fisik 50-Kotak
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleIncrementNextSheet}
          title="Daftarkan Lembar Berikutnya (+1)"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-orbitron font-bold text-neonAmber bg-neonAmber/10 border border-neonAmber/50 hover:bg-neonAmber/20 transition-all clip-cyber"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+1 LEMBAR</span>
        </button>
      </div>

      {/* Duplicate Serial / Error Alert Banner */}
      {errorBanner && (
        <div className="p-3 bg-neonPink/15 border-2 border-neonPink text-white clip-cyber animate-pulse flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-neonPink flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-orbitron font-bold text-neonPink tracking-wider">
              {errorBanner.title}
            </p>
            <p className="font-mono text-gray-200 mt-0.5 leading-relaxed">
              {errorBanner.message}
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3 bg-neonGreen/15 border border-neonGreen text-white clip-cyber flex items-start gap-2.5">
          <CheckCircle className="w-5 h-5 text-neonGreen flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-orbitron font-bold text-neonGreen tracking-wider">
              SUKSES TERDAFTAR
            </p>
            <p className="font-mono text-gray-200 mt-0.5 leading-relaxed">
              {successBanner.message}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field 1: Nomor Seri Kupon (Focal Point, Autofocus) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-mono text-gray-300 font-bold tracking-wide flex items-center gap-1.5">
              <span>NOMOR SERI FISIK</span>
              <span className="text-neonAmber">*</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateNextSerial}
              disabled={fetchingNext}
              className="text-[11px] font-mono text-neonAmber hover:text-white flex items-center gap-1 transition-colors"
            >
              {fetchingNext ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-neonAmber" />
              )}
              <span>Generate Seri Berikutnya</span>
            </button>
          </div>

          <div className="relative">
            <input
              ref={serialInputRef}
              type="text"
              autoFocus
              value={serialNumber}
              onChange={(e) => {
                setSerialNumber(e.target.value.toUpperCase());
                if (errorBanner) setErrorBanner(null);
              }}
              placeholder="CONTOH: 001 ATAU CPN-042"
              className={clsx(
                "w-full bg-black/60 border font-mono text-base md:text-lg font-bold px-3 py-2.5 text-white tracking-widest transition-all outline-none",
                errorBanner?.isDuplicate
                  ? "border-neonPink ring-2 ring-neonPink/50 shadow-[0_0_12px_rgba(255,0,85,0.4)]"
                  : "border-neonAmber/80 focus:border-neonAmber focus:ring-2 focus:ring-neonAmber/50 shadow-[0_0_10px_rgba(255,170,0,0.2)]"
              )}
            />
          </div>
          <p className="text-[10px] font-mono text-gray-400 mt-1">
            Serial fisik tercetak pada kertas 50-kotak (4-32 karakter alfanumerik)
          </p>
        </div>

        {/* Field 2: Pembalap (Dual Mode Toggle) */}
        <div className="space-y-2 border-t border-gray-800/80 pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-gray-300 font-bold tracking-wide flex items-center gap-1.5">
              <span>PEMBALAP PEMILIK</span>
              <span className="text-neonAmber">*</span>
            </label>
            <div className="flex bg-black/50 border border-gray-800 p-0.5 clip-cyber">
              <button
                type="button"
                onClick={() => {
                  setRacerMode('select');
                  if (errorBanner) setErrorBanner(null);
                }}
                className={clsx(
                  "px-2.5 py-1 text-[11px] font-orbitron font-bold transition-all",
                  racerMode === 'select'
                    ? "bg-neonAmber/20 text-neonAmber border border-neonAmber/60"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Pembalap Terdaftar
              </button>
              <button
                type="button"
                onClick={() => {
                  setRacerMode('new');
                  if (errorBanner) setErrorBanner(null);
                }}
                className={clsx(
                  "px-2.5 py-1 text-[11px] font-orbitron font-bold transition-all",
                  racerMode === 'new'
                    ? "bg-neonAmber/20 text-neonAmber border border-neonAmber/60"
                    : "text-gray-400 hover:text-white"
                )}
              >
                + Buat Baru
              </button>
            </div>
          </div>

          {/* Mode 1: Select Existing Racer */}
          {racerMode === 'select' ? (
            <div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 text-sm font-mono text-white p-2.5 outline-none focus:border-neonAmber focus:ring-1 focus:ring-neonAmber"
              >
                <option value="">-- Pilih Pembalap Terdaftar --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.team_name ? `[${u.team_name}]` : ''} — Saldo: {u.coupon_balance ?? 0}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Mode 2: Create New Racer on-the-fly */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nama Pembalap (cth: Dani)"
                  className="w-full bg-black/60 border border-gray-700 text-sm font-mono text-white px-3 py-2 outline-none focus:border-neonAmber focus:ring-1 focus:ring-neonAmber"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                  placeholder="Nama Tim (cth: MRT)"
                  maxLength={10}
                  className="w-full bg-black/60 border border-gray-700 text-sm font-mono text-white px-3 py-2 outline-none focus:border-neonAmber focus:ring-1 focus:ring-neonAmber uppercase"
                />
              </div>
            </div>
          )}
        </div>

        {/* Field 3: Kuota & Pembayaran */}
        <div className="grid grid-cols-2 gap-3 border-t border-gray-800/80 pt-3">
          <div>
            <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
              TOTAL KUOTA BALAP
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="500"
                value={totalQuota}
                onChange={(e) => setTotalQuota(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 text-sm font-mono font-bold text-white px-3 py-2 outline-none focus:border-neonAmber"
              />
              <span className="absolute right-3 top-2 text-xs font-mono text-gray-400">
                Kotak
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
              METODE BAYAR
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-black/60 border border-gray-700 text-sm font-mono text-white px-3 py-2 outline-none focus:border-neonAmber"
            >
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS Digital</option>
              <option value="transfer">Transfer Bank</option>
            </select>
          </div>
        </div>

        {/* Field 4: Nominal Bayar */}
        <div>
          <label className="block text-xs font-mono text-gray-300 font-bold mb-1">
            NOMINAL PEMBAYARAN (RP)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-mono text-gray-400">
              Rp
            </span>
            <input
              type="number"
              value={pricePaid}
              onChange={(e) => setPricePaid(e.target.value)}
              placeholder="100000"
              className="w-full bg-black/60 border border-gray-700 text-sm font-mono text-white pl-9 pr-3 py-2 outline-none focus:border-neonAmber"
            />
          </div>
        </div>

        {/* Buttons & Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <CyberButton
            type="submit"
            variant="amber"
            size="md"
            className="w-full flex-1"
            disabled={submitting}
            icon={submitting ? Loader2 : CheckCircle}
          >
            {submitting ? 'MENDAFTARKAN...' : 'Daftarkan Paket Kupon'}
          </CyberButton>

          <CyberButton
            type="button"
            variant="dark"
            size="md"
            onClick={handleIncrementNextSheet}
            className="w-full sm:w-auto"
            title="Daftarkan Lembar Berikutnya (+1)"
          >
            +1 Lembar
          </CyberButton>
        </div>
      </form>
    </div>
  );
}
