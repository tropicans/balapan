import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext.jsx';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { CyberCard } from '../components/ui/CyberCard.jsx';
import { 
  CreditCard, 
  UserPlus, 
  Coins, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  User 
} from 'lucide-react';
import clsx from 'clsx';

export function CashierDashboard() {
  const { apiTopUp, apiRegisterGuest } = useRace();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Guest Form
  const [guestModal, setGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestTeam, setGuestTeam] = useState('');
  const [guestBalance, setGuestBalance] = useState(10);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.team_name && u.team_name.toLowerCase().includes(search.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-obsidian border border-neonAmber/40 p-4 clip-cyber flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonAmber/20 border border-neonAmber flex items-center justify-center clip-cyber">
            <CreditCard className="w-6 h-6 text-neonAmber" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-orbitron font-black text-white">
              KASIR & TOP UP KUPON // ASSISTED DESK
            </h2>
            <p className="text-xs font-mono text-neonAmber">
              Pendaftaran Tamu / Anak & Pengisian Saldo Kupon Balap
            </p>
          </div>
        </div>

        <CyberButton
          variant="amber"
          size="md"
          icon={UserPlus}
          onClick={() => setGuestModal(true)}
        >
          + TAMBAH PESERTA BARU (TAMU/MANUAL)
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
              placeholder="Cari nama pembalap, racer tag, atau email..."
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
                  <div className="font-orbitron font-bold text-white text-sm truncate">
                    {u.name}
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

      {/* Top Up Modal */}
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

      {/* Guest Creation Modal */}
      {guestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form onSubmit={handleCreateGuest} className="max-w-md w-full bg-obsidian border-2 border-neonAmber p-6 clip-cyber shadow-glowAmber space-y-4">
            <h3 className="text-xl font-orbitron font-black text-neonAmber">
              TAMBAH PESERTA BARU (TAMU / ANAK)
            </h3>

            <div>
              <label className="text-xs font-orbitron text-cyberSilver/70 block mb-1">
                NAMA LENGKAP PESERTA:
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Contoh: Gilang Ramadhan"
                className="w-full bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber"
              />
            </div>

            <div>
              <label className="text-xs font-orbitron text-cyberSilver/70 block mb-1">
                RACER TAG / NAMA TIM (MAX 10 KARAKTER):
              </label>
              <input
                type="text"
                maxLength={10}
                value={guestTeam}
                onChange={(e) => setGuestTeam(e.target.value)}
                placeholder="Contoh: GILANG [KID]"
                className="w-full bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber"
              />
            </div>

            <div>
              <label className="text-xs font-orbitron text-cyberSilver/70 block mb-1">
                SALDO AWAL KUPON:
              </label>
              <input
                type="number"
                min="1"
                value={guestBalance}
                onChange={(e) => setGuestBalance(e.target.value)}
                className="w-full bg-black/80 border border-neonAmber/50 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-neonAmber clip-cyber"
              />
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGuestModal(false)}
                className="px-4 py-2 text-xs font-orbitron uppercase text-cyberSilver/70 hover:text-white"
              >
                BATAL
              </button>
              <CyberButton type="submit" variant="amber" size="md" disabled={loading}>
                SIMPAN & DAFTARKAN
              </CyberButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
