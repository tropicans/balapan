import React, { useState, useEffect, useCallback } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { ParticipantRegistrationTab } from '../components/cashier/ParticipantRegistrationTab.jsx';
import { ParticipantImportModal } from '../components/cashier/ParticipantImportModal.jsx';
import { GoogleSheetSyncModal } from '../components/sync/GoogleSheetSyncModal.jsx';
import { CouponRegistrationForm } from '../components/cashier/CouponRegistrationForm.jsx';
import { CouponPackageList } from '../components/cashier/CouponPackageList.jsx';
import { VoidPackageModal } from '../components/cashier/VoidPackageModal.jsx';
import { 
  CreditCard, 
  UserPlus, 
  Coins, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  User,
  Layers,
  Sparkles,
  Upload,
  RefreshCw,
  Trophy,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';
import { sound } from '../utils/audio.js';

export function CashierDashboard() {
  const { apiTopUp, apiRegisterGuest, socket } = useRace();

  // Navigation tab state (default: 'v3_registration' per D-10)
  const [activeTab, setActiveTab] = useState('v3_registration'); // 'v3_registration' | 'physical' | 'digital'

  // Header telemetry state (D-11)
  const [activeEvent, setActiveEvent] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [latestNumber, setLatestNumber] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Users data for autocomplete and digital topup
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Pre-Printed Coupon Packages data
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packagesError, setPackagesError] = useState(null);

  // Void modal target package
  const [voidModalPkg, setVoidModalPkg] = useState(null);

  // New Guest Form (Legacy / Manual)
  const [guestModal, setGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestTeam, setGuestTeam] = useState('');
  const [guestBalance, setGuestBalance] = useState(10);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/participants?limit=1');
      const data = await res.json();
      if (data.success && data.data) {
        setTotalParticipants(data.data.total || 0);
        setLatestNumber(data.data.latest_number || 0);
        setActiveEvent(data.data.active_event || null);
      }
    } catch (e) {
      console.error('Failed to fetch participant telemetry:', e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (e) {}
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoadingPackages(true);
    setPackagesError(null);
    try {
      const res = await fetch('/api/coupon-packages');
      const data = await res.json();
      if (data.success) {
        setPackages(data.data);
      } else {
        setPackagesError(data.error || 'Gagal memuat daftar paket kupon');
      }
    } catch (e) {
      setPackagesError('Koneksi ke server database turnamen terputus');
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  const handleFullRefresh = useCallback(() => {
    sound.playTone(600, 'sine', 0.05, 0.1);
    fetchTelemetry();
    fetchUsers();
    fetchPackages();
  }, [fetchTelemetry, fetchUsers, fetchPackages]);

  useEffect(() => {
    fetchTelemetry();
    fetchUsers();
    fetchPackages();
  }, [fetchTelemetry, fetchUsers, fetchPackages]);

  // Real-time WebSocket synchronization
  useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = () => {
      fetchTelemetry();
      fetchPackages();
      fetchUsers();
    };

    socket.on('participant_registered', fetchTelemetry);
    socket.on('participant_updated', fetchTelemetry);
    socket.on('participants_imported', fetchTelemetry);
    socket.on('coupon_package_updated', handleDataUpdate);
    socket.on('STATE_UPDATE', handleDataUpdate);

    return () => {
      socket.off('participant_registered', fetchTelemetry);
      socket.off('participant_updated', fetchTelemetry);
      socket.off('participants_imported', fetchTelemetry);
      socket.off('coupon_package_updated', handleDataUpdate);
      socket.off('STATE_UPDATE', handleDataUpdate);
    };
  }, [socket, fetchTelemetry, fetchPackages, fetchUsers]);

  // Legacy digital top up handler
  const handleTopUp = async (amount) => {
    if (!selectedUser) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiTopUp(selectedUser.id, amount);
      setFeedback({
        type: 'success',
        text: `Top Up +${amount} Kupon untuk ${selectedUser.name} BERHASIL! Saldo Baru: ${res.newBalance} Kupon.`
      });
      setSelectedUser(null);
      setCustomAmount('');
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Guest creation handler
  const handleCreateGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiRegisterGuest(guestName.trim(), guestTeam.trim(), guestBalance);
      setFeedback({
        type: 'success',
        text: `Peserta Tamu ${res.user.name} (${res.user.team_name}) berhasil didaftarkan dengan ${res.user.balance} kupon!`
      });
      setGuestModal(false);
      setGuestName('');
      setGuestTeam('');
      setGuestBalance(10);
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase().trim();
    const cleanNum = q.replace(/^#/, '');
    return (
      u.name?.toLowerCase().includes(q) ||
      (u.team_name && u.team_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (cleanNum && String(u.participant_number || '') === cleanNum)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-5 space-y-5">
      {/* Header Banner with Comprehensive Telemetry (D-11) */}
      <div className="bg-obsidian border border-neonCyan/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber shrink-0">
            <CreditCard className="w-6 h-6 text-neonCyan" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl md:text-2xl font-orbitron font-black text-white tracking-wider">
                KASIR & REGISTRASI TURNAMEN
              </h2>
              {/* Active Event Indicator Badge */}
              {activeEvent ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-neonGreen/15 border border-neonGreen text-neonGreen font-orbitron font-bold text-xs tracking-wider clip-cyber">
                  <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse" />
                  <span>{activeEvent.nama} [ACTIVE]</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-950/50 border border-red-500 text-red-400 font-orbitron font-bold text-xs tracking-wider clip-cyber">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>TIDAK ADA EVENT AKTIF [NO EVENT]</span>
                </div>
              )}
            </div>
            <p className="text-xs font-mono text-neonCyan/80">
              Registrasi Peserta Fisik v3.0 // Auto-Numbering Berurutan & Manajemen Kupon
            </p>
          </div>
        </div>

        {/* Telemetry Pills & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Total Participants Pill */}
          <div className="px-3 py-1.5 bg-black/70 border border-gray-800 clip-cyber flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400 font-orbitron">TOTAL PESERTA:</span>
            <span className="font-orbitron font-black text-white text-sm md:text-base">
              {totalParticipants}
            </span>
          </div>

          {/* Latest Issued Number Pill */}
          <div className="px-3 py-1.5 bg-neonCyan/10 border border-neonCyan/60 clip-cyber flex items-center gap-2 text-xs font-mono">
            <span className="text-neonCyan/80 font-orbitron">NOMOR TERAKHIR:</span>
            <span className="font-orbitron font-black text-neonCyan text-sm md:text-base">
              #{latestNumber}
            </span>
          </div>

          {/* Sync Google Sheet Button (SYNC-08) */}
          <CyberButton
            variant="green"
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => setSyncModalOpen(true)}
          >
            SYNC GOOGLE SHEET
          </CyberButton>

          {/* Import CSV Button */}
          <CyberButton
            variant="cyan"
            size="sm"
            icon={Upload}
            onClick={() => setImportModalOpen(true)}
          >
            IMPORT CSV
          </CyberButton>

          {/* Refresh Button */}
          <CyberButton
            variant="dark"
            size="sm"
            icon={RefreshCw}
            onClick={handleFullRefresh}
          >
            REFRESH
          </CyberButton>
        </div>
      </div>

      {/* Navigation Tabs (D-10, D-13) */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        {/* Tab 1: Default Primary Tab (v3.0) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('v3_registration');
            sound.playTone(600, 'sine', 0.04, 0.1);
          }}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 font-orbitron font-bold text-xs md:text-sm tracking-wider uppercase transition-all clip-cyber",
            activeTab === 'v3_registration'
              ? "bg-neonCyan/20 text-neonCyan border border-neonCyan shadow-glowCyan"
              : "bg-black/40 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700"
          )}
        >
          <Trophy className="w-4 h-4 text-neonCyan" />
          <span>Registrasi Peserta (v3.0)</span>
        </button>

        {/* Tab 2: Secondary Legacy Physical Coupon Sheet Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('physical');
            sound.playTone(600, 'sine', 0.04, 0.1);
          }}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 font-orbitron font-bold text-xs md:text-sm tracking-wider uppercase transition-all clip-cyber",
            activeTab === 'physical'
              ? "bg-neonAmber/20 text-neonAmber border border-neonAmber shadow-glowAmber"
              : "bg-black/40 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700"
          )}
        >
          <Layers className="w-4 h-4 text-neonAmber" />
          <span>Paket Kupon Fisik (Pre-Printed)</span>
        </button>

        {/* Tab 3: Secondary Legacy Digital Top Up Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('digital');
            sound.playTone(600, 'sine', 0.04, 0.1);
          }}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 font-orbitron font-bold text-xs md:text-sm tracking-wider uppercase transition-all clip-cyber",
            activeTab === 'digital'
              ? "bg-neonAmber/20 text-neonAmber border border-neonAmber shadow-glowAmber"
              : "bg-black/40 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-700"
          )}
        >
          <Coins className="w-4 h-4 text-neonAmber" />
          <span>Top Up Saldo Digital</span>
        </button>
      </div>

      {/* Tab 1: Registrasi Peserta (v3.0) Primary Tab */}
      {activeTab === 'v3_registration' && (
        <ParticipantRegistrationTab
          importModalOpen={importModalOpen}
          onCloseImportModal={() => setImportModalOpen(false)}
          onStatsChange={(stats) => {
            setTotalParticipants(stats.total);
            setLatestNumber(stats.latestNumber);
            if (stats.activeEvent !== undefined) {
              setActiveEvent(stats.activeEvent);
            }
          }}
        />
      )}

      {/* Tab 2: Paket Kupon Fisik (Pre-Printed) - 2-Column Split Layout */}
      {activeTab === 'physical' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (40% width / 5 cols): Quick Registration Form */}
          <div className="lg:col-span-5 space-y-4">
            <CouponRegistrationForm
              users={users}
              onRegistered={(newPkg) => {
                fetchPackages();
                fetchUsers();
              }}
              onRefreshUsers={fetchUsers}
            />
          </div>

          {/* Right Column (60% width / 7 cols): Live Feed & Quota Monitoring */}
          <div className="lg:col-span-7 space-y-4">
            <CouponPackageList
              packages={packages}
              loading={loadingPackages}
              error={packagesError}
              onRefresh={fetchPackages}
              onOpenVoid={(pkg) => setVoidModalPkg(pkg)}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Top Up Saldo Digital (Legacy v1.0) */}
      {activeTab === 'digital' && (
        <div className="space-y-5">
          {/* Action button to create guest */}
          <div className="flex justify-end">
            <CyberButton
              variant="amber"
              size="md"
              icon={UserPlus}
              onClick={() => setGuestModal(true)}
            >
              + TAMBAH PESERTA BARU (MANUAL)
            </CyberButton>
          </div>

          {/* Feedback Notification */}
          {feedback && (
            <div className={clsx(
              "p-4 text-xs font-mono clip-cyber border flex items-center gap-2",
              feedback.type === 'success' ? "bg-neonGreen/10 border-neonGreen text-neonGreen font-bold" : "bg-red-950/40 border-red-500 text-red-400"
            )}>
              {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Search & Participant List */}
          <CyberCard variant="amber" title="DAFTAR PESERTA TURNAMEN (KLIK UNTUK TOP UP)">
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-cyberSilver/50 absolute left-3 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari #nomor, nama pembalap, racer tag, atau email..."
                  className="w-full bg-black/70 border border-neonAmber/50 pl-10 pr-4 py-2.5 text-sm font-mono text-white clip-cyber focus:outline-none focus:border-neonAmber"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={clsx(
                      "p-3.5 bg-black/50 border clip-cyber transition-all cursor-pointer flex items-center justify-between",
                      selectedUser?.id === u.id
                        ? "border-neonAmber bg-neonAmber/15 shadow-glowAmber"
                        : "border-gray-800 hover:border-neonAmber/40"
                    )}
                  >
                    <div>
                      <div className="font-orbitron font-bold text-white text-sm truncate flex items-center gap-1.5">
                        {u.participant_number && (
                          <span className="text-neonAmber font-black">#{u.participant_number}</span>
                        )}
                        <span>{u.name}</span>
                      </div>
                      <div className="text-xs font-mono text-neonPink tracking-wider">
                        [{u.team_name || 'NO TAG'}]
                      </div>
                      <div className="text-[10px] font-mono text-cyberSilver/50">
                        {u.is_virtual ? 'Akun Tamu (Virtual)' : u.email}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono text-cyberSilver/60">Saldo</div>
                      <div className="text-xl font-orbitron font-black text-neonAmber">
                        {u.coupon_balance ?? 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CyberCard>
        </div>
      )}

      {/* Emergency Void Modal */}
      {voidModalPkg && (
        <VoidPackageModal
          pkg={voidModalPkg}
          onClose={() => setVoidModalPkg(null)}
          onSuccess={(newPkg) => {
            fetchPackages();
            fetchUsers();
          }}
        />
      )}

      {/* Top Up Modal for Digital Tab */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-lg w-full bg-obsidian border-2 border-neonAmber p-6 md:p-8 clip-cyber-lg shadow-glowAmber">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <div>
                <div className="text-xs font-orbitron text-neonAmber uppercase">TOP UP SALDO KUPON</div>
                <h3 className="text-2xl font-orbitron font-black text-white">{selectedUser.name}</h3>
                <div className="text-xs font-mono text-neonPink">TAG: [{selectedUser.team_name || 'NO TAG'}]</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-cyberSilver/60 uppercase">Saldo Saat Ini</div>
                <div className="text-3xl font-orbitron font-black text-neonAmber">{selectedUser.coupon_balance ?? 0}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-xs font-orbitron text-cyberSilver/70 uppercase">
                Pilih Jumlah Kupon Instan:
              </div>

              {/* Giant +10, +50, +100 Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleTopUp(10)}
                  disabled={loading}
                  className="py-5 bg-neonAmber/20 border-2 border-neonAmber text-neonAmber font-orbitron font-black text-xl clip-cyber hover:bg-neonAmber hover:text-black hover:shadow-glowAmber transition-all active:scale-95"
                >
                  +10 KUPON
                </button>
                <button
                  onClick={() => handleTopUp(50)}
                  disabled={loading}
                  className="py-5 bg-neonAmber/25 border-2 border-neonAmber text-neonAmber font-orbitron font-black text-xl clip-cyber hover:bg-neonAmber hover:text-black hover:shadow-glowAmber transition-all active:scale-95"
                >
                  +50 KUPON
                </button>
                <button
                  onClick={() => handleTopUp(100)}
                  disabled={loading}
                  className="py-5 bg-neonAmber/30 border-2 border-neonAmber text-neonAmber font-orbitron font-black text-xl clip-cyber hover:bg-neonAmber hover:text-black hover:shadow-glowAmber transition-all active:scale-95"
                >
                  +100 KUPON
                </button>
              </div>

              {/* Custom Amount Input */}
              <div className="pt-3 border-t border-gray-800 flex gap-2">
                <input
                  type="number"
                  placeholder="Atau jumlah kupon custom..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber"
                />
                <CyberButton
                  variant="amber"
                  size="md"
                  disabled={loading || !customAmount || parseInt(customAmount, 10) <= 0}
                  onClick={() => handleTopUp(parseInt(customAmount, 10))}
                >
                  TOP UP
                </CyberButton>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-xs font-orbitron uppercase text-cyberSilver/70 hover:text-white"
                >
                  BATAL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Participant Creation Modal */}
      {guestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-obsidian border-2 border-neonAmber p-6 clip-cyber-lg shadow-glowAmber">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neonAmber" />
                <h3 className="text-lg font-orbitron font-black text-white uppercase">DAFTAR PESERTA BARU (TAMU)</h3>
              </div>
              <button
                onClick={() => setGuestModal(false)}
                className="text-cyberSilver/50 hover:text-white font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-orbitron text-cyberSilver/80 uppercase mb-1">
                  Nama Peserta / Anak <span className="text-neonAmber">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Farhan Junior"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber"
                />
              </div>

              <div>
                <label className="block text-xs font-orbitron text-cyberSilver/80 uppercase mb-1">
                  Tim / Racer Tag (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: MRT (Maks 10 Huruf)"
                  maxLength={10}
                  value={guestTeam}
                  onChange={(e) => setGuestTeam(e.target.value.toUpperCase())}
                  className="w-full bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-orbitron text-cyberSilver/80 uppercase mb-1">
                  Saldo Kupon Awal
                </label>
                <input
                  type="number"
                  min="0"
                  value={guestBalance}
                  onChange={(e) => setGuestBalance(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGuestModal(false)}
                  className="px-4 py-2 text-xs font-orbitron uppercase text-cyberSilver/70 hover:text-white"
                >
                  BATAL
                </button>
                <CyberButton
                  type="submit"
                  variant="amber"
                  size="md"
                  disabled={loading || !guestName.trim()}
                >
                  DAFTARKAN
                </CyberButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Import CSV Modal when opened via header button from any tab */}
      {importModalOpen && activeTab !== 'v3_registration' && (
        <ParticipantImportModal
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            fetchTelemetry();
            fetchUsers();
          }}
        />
      )}

      {/* Google Sheet Sync Modal (SYNC-08) */}
      <GoogleSheetSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onSuccess={() => {
          fetchTelemetry();
          fetchUsers();
        }}
      />
    </div>
  );
}
