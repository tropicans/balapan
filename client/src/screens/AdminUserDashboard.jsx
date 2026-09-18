import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { io } from 'socket.io-client';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle, 
  Ban, 
  Edit3, 
  Search, 
  Clock, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

export function AdminUserDashboard() {
  const { user, token, isSuperAdmin, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Selected user for role change or approval modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [targetRole, setTargetRole] = useState('cashier');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/users${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.message || 'Gagal memuat data pengguna');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, statusFilter]);

  // Real-time listener for user updates across all connected clients
  useEffect(() => {
    const socket = io();
    socket.on('user:updated', () => {
      fetchUsers();
    });
    return () => {
      socket.disconnect();
    };
  }, [statusFilter, token]);

  const handleApprove = async (userId, role) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(`Pengguna berhasil disetujui dengan peran: ${role.toUpperCase()}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(`Peran pengguna berhasil diperbarui ke ${newRole.toUpperCase()}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    const actionName = newStatus === 'suspended' ? 'MENANGGUHKAN' : 'MENGAKTIFKAN KEMBALI';
    if (!confirm(`Konfirmasi ${actionName} akses pengguna ini?`)) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(`Status pengguna berhasil diubah ke ${newStatus.toUpperCase()}`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered users according to search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.status === 'pending').length;
    const approved = users.filter((u) => u.status === 'approved').length;
    const suspended = users.filter((u) => u.status === 'suspended' || u.status === 'rejected').length;
    return { total, pending, approved, suspended };
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-obsidian border border-red-500/50 clip-cyber shadow-glowAmber">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-orbitron font-bold text-white uppercase">Akses Terbatas</h2>
          <p className="text-xs font-mono text-cyberSilver/70 mt-2">
            Hanya Super Admin (<span className="text-neonCyan">tropicans@gmail.com</span>) atau Co-Admin yang berhak membuka Dasbor Manajemen Pengguna.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-orbitron font-bold bg-neonCyan/20 text-neonCyan border border-neonCyan clip-cyber uppercase">
              SUPER ADMIN PANEL
            </span>
            {stats.pending > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-orbitron font-bold bg-neonAmber/20 text-neonAmber border border-neonAmber clip-cyber animate-pulse flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{stats.pending} MENUNGGU PERSETUJUAN</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white tracking-wider uppercase mt-1.5">
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs font-mono text-cyberSilver/70 mt-0.5">
            Setujui permohonan login Google baru, atur role operasional kasir/director, atau tangguhkan hak akses.
          </p>
        </div>

        {/* Global Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-obsidian border border-gray-700 hover:border-neonCyan text-cyberSilver hover:text-neonCyan text-xs font-orbitron font-bold clip-cyber transition shadow"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>SEGARKAN DATA</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-obsidian/80 border border-gray-800 clip-cyber">
          <div className="text-[10px] font-orbitron text-cyberSilver/60 uppercase">Total Akun</div>
          <div className="text-2xl font-orbitron font-black text-white mt-1">{stats.total}</div>
        </div>
        <div className="p-3.5 bg-amber-950/20 border border-amber-500/40 clip-cyber">
          <div className="text-[10px] font-orbitron text-neonAmber uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Menunggu Approval</span>
          </div>
          <div className="text-2xl font-orbitron font-black text-neonAmber mt-1">{stats.pending}</div>
        </div>
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/40 clip-cyber">
          <div className="text-[10px] font-orbitron text-emerald-400 uppercase flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            <span>Petugas Aktif</span>
          </div>
          <div className="text-2xl font-orbitron font-black text-emerald-400 mt-1">{stats.approved}</div>
        </div>
        <div className="p-3.5 bg-red-950/20 border border-red-500/40 clip-cyber">
          <div className="text-[10px] font-orbitron text-red-400 uppercase flex items-center gap-1">
            <Ban className="w-3 h-3" />
            <span>Ditangguhkan</span>
          </div>
          <div className="text-2xl font-orbitron font-black text-red-400 mt-1">{stats.suspended}</div>
        </div>
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-midnight/80 p-3 border border-gray-800 clip-cyber">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-cyberSilver/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email Google..."
            className="w-full pl-9 pr-3 py-1.5 bg-obsidian border border-gray-700 text-white text-xs font-mono clip-cyber focus:border-neonCyan focus:outline-none"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'SEMUA', val: '' },
            { label: 'PENDING', val: 'pending' },
            { label: 'APPROVED', val: 'approved' },
            { label: 'SUSPENDED', val: 'suspended' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={clsx(
                'px-3 py-1 text-xs font-orbitron font-semibold clip-cyber border transition whitespace-nowrap',
                statusFilter === tab.val
                  ? 'bg-neonCyan text-black border-neonCyan font-bold shadow-glowCyan'
                  : 'bg-obsidian border-gray-800 text-cyberSilver/70 hover:border-gray-600 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-500/50 clip-cyber text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 clip-cyber text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* User Table Card */}
      <div className="bg-obsidian/90 border border-gray-800 clip-cyber shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-midnight/90 border-b border-gray-800 text-cyberSilver/70 uppercase text-[10px] font-orbitron">
              <tr>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Email Google</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-cyberSilver/50 font-mono">
                    Tidak ada akun ditemukan untuk kriteria ini.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => {
                const isSuper = u.email === 'tropicans@gmail.com' || u.role === 'super_admin';
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full border border-gray-700 object-cover flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neonCyan/20 border border-neonCyan flex items-center justify-center text-neonCyan font-bold text-xs flex-shrink-0">
                            {u.name ? u.name[0] : 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSuper && (
                              <span className="text-[9px] px-1 bg-neonCyan/20 text-neonCyan border border-neonCyan rounded font-bold">
                                IMMUNE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-cyberSilver/50">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-cyberSilver/90">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          'px-2 py-0.5 text-[10px] font-orbitron font-bold clip-cyber border',
                          u.role === 'super_admin' && 'bg-neonCyan/20 text-neonCyan border-neonCyan',
                          u.role === 'admin' && 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
                          u.role === 'cashier' && 'bg-amber-500/20 text-neonAmber border-neonAmber',
                          u.role === 'race_director' && 'bg-neonPink/20 text-neonPink border-neonPink',
                          u.role === 'scrutineer' && 'bg-purple-500/20 text-purple-400 border-purple-500',
                          u.role === 'viewer' && 'bg-gray-700/30 text-gray-300 border-gray-600',
                          u.role === 'pending' && 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                        )}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          'px-2 py-0.5 text-[10px] font-orbitron font-bold clip-cyber',
                          u.status === 'approved' && 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/50',
                          u.status === 'pending' && 'bg-amber-950/60 text-amber-400 border border-amber-500/50 animate-pulse',
                          (u.status === 'suspended' || u.status === 'rejected') && 'bg-red-950/60 text-red-400 border border-red-500/50'
                        )}
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[10px] text-cyberSilver/60">
                      {new Date(u.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isSuper ? (
                        <span className="text-[10px] text-cyberSilver/40 italic">Super Admin (Protected)</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {u.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setTargetRole('cashier');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-orbitron font-bold clip-cyber flex items-center gap-1 shadow transition"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>SETUJUI</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setTargetRole(u.role);
                                }}
                                className="px-2.5 py-1 bg-midnight border border-gray-700 hover:border-neonCyan text-cyberSilver hover:text-neonCyan text-[11px] font-mono clip-cyber flex items-center gap-1 transition"
                                title="Ubah Peran"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Role</span>
                              </button>
                              {u.status === 'approved' ? (
                                <button
                                  onClick={() => handleStatusChange(u.id, 'suspended')}
                                  className="px-2 py-1 bg-red-950/40 border border-red-500/40 hover:bg-red-900/60 text-red-400 text-[11px] font-mono clip-cyber transition"
                                  title="Tangguhkan Akses"
                                >
                                  <Ban className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(u.id, 'approved')}
                                  className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/60 text-emerald-400 text-[11px] font-mono clip-cyber transition"
                                  title="Aktifkan Kembali"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval / Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-obsidian border-2 border-neonCyan clip-cyber p-6 shadow-glowCyan relative">
            <h3 className="text-base font-orbitron font-black text-white uppercase tracking-wider mb-1">
              {selectedUser.status === 'pending' ? 'Persetujuan Pengguna' : 'Ubah Role Pengguna'}
            </h3>
            <p className="text-xs font-mono text-cyberSilver/80 mb-4">
              Pengguna: <span className="text-white font-bold">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            <div className="space-y-2 mb-6">
              <label className="block text-[10px] font-orbitron uppercase text-neonCyan">
                Pilih Role Operasional:
              </label>
              {[
                { id: 'cashier', name: 'Kasir (Registrasi & Kupon)', desc: 'Akses menu Registrasi Kasir (/cashier)' },
                { id: 'race_director', name: 'Race Director (Track & Solo Run)', desc: 'Akses kontrol balapan dan babak eliminasi (/director)' },
                { id: 'scrutineer', name: 'Scrutineer (Registrasi Pemenang)', desc: 'Akses verifikasi pemenang & lolos babak (/winners)' },
                { id: 'admin', name: 'Co-Admin (Manajemen Turnamen & User)', desc: 'Akses pengaturan event & approval pengguna (/admin, /events)' },
                { id: 'viewer', name: 'Viewer (Hanya Melihat)', desc: 'Akses display turnamen tanpa izin mutasi data' },
              ].map((r) => (
                <label
                  key={r.id}
                  onClick={() => setTargetRole(r.id)}
                  className={clsx(
                    'block p-2.5 border clip-cyber cursor-pointer transition text-left',
                    targetRole === r.id
                      ? 'bg-neonCyan/20 border-neonCyan text-white shadow-glowCyan'
                      : 'bg-midnight/60 border-gray-800 text-cyberSilver/70 hover:border-gray-700'
                  )}
                >
                  <div className="font-orbitron font-bold text-xs">{r.name}</div>
                  <div className="text-[10px] font-mono text-cyberSilver/60">{r.desc}</div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-cyberSilver text-xs font-orbitron clip-cyber transition"
              >
                BATAL
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  if (selectedUser.status === 'pending') {
                    handleApprove(selectedUser.id, targetRole);
                  } else {
                    handleUpdateRole(selectedUser.id, targetRole);
                  }
                }}
                className="px-4 py-2 bg-neonCyan text-black hover:bg-cyan-400 text-xs font-orbitron font-black clip-cyber shadow-glowCyan transition"
              >
                {actionLoading ? 'MENYIMPAN...' : 'SIMPAN & TERAPKAN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
