import React, { useState, useEffect } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  Tv, 
  Sliders, 
  ShieldCheck, 
  CreditCard, 
  GitBranch, 
  ChevronDown,
  Calendar,
  UserCheck,
  LogIn,
  LogOut,
  Shield,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

export function Navbar({ activeScreen, setActiveScreen }) {
  const { connected, raceState } = useRace();
  const { user, isAuthenticated, isApproved, isPending, isSuperAdmin, isAdmin, logout } = useAuth();
  const [authDropdown, setAuthDropdown] = useState(false);

  // Dynamic screens list based on RBAC permissions
  const baseScreens = [
    { id: 'cashier', label: 'Registrasi Kasir', icon: CreditCard, color: 'amber', path: '/cashier' },
    { id: 'rd', label: 'Race Director', icon: Sliders, color: 'pink', path: '/director' },
    { id: 'bracket', label: 'Babak Eliminasi', icon: GitBranch, color: 'pink', path: '/bracket' },
    { id: 'winners', label: 'Registrasi Pemenang', icon: UserCheck, color: 'cyan', path: '/winners' },
    { id: 'tv', label: 'Layar TV Sirkuit', icon: Tv, color: 'cyan', path: '/tv' },
    { id: 'events', label: 'Manajemen Event', icon: Calendar, color: 'cyan', path: '/events' },
  ];

  // If user is Super Admin or Admin, expose Admin User Management screen
  const screens = isAdmin
    ? [...baseScreens, { id: 'admin', label: 'Admin Approval', icon: ShieldCheck, color: 'cyan', path: '/admin' }]
    : baseScreens;

  const handleSelectScreen = (screen) => {
    setActiveScreen(screen.id);
    if (typeof window !== 'undefined' && screen.path) {
      try {
        window.history.pushState(null, '', screen.path);
      } catch (e) {}
    }
  };

  const activeRaceNum = raceState.activeRace?.race_number || 1;

  // Format role label for badge
  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin': return { label: 'SUPER ADMIN', color: 'border-neonCyan text-neonCyan bg-neonCyan/20' };
      case 'admin': return { label: 'CO-ADMIN', color: 'border-cyan-500 text-cyan-400 bg-cyan-500/20' };
      case 'cashier': return { label: 'KASIR', color: 'border-neonAmber text-neonAmber bg-amber-500/20' };
      case 'race_director': return { label: 'RACE DIRECTOR', color: 'border-neonPink text-neonPink bg-neonPink/20' };
      case 'scrutineer': return { label: 'SCRUTINEER', color: 'border-purple-500 text-purple-400 bg-purple-500/20' };
      case 'viewer': return { label: 'VIEWER', color: 'border-gray-500 text-gray-300 bg-gray-600/20' };
      case 'pending': return { label: 'PENDING', color: 'border-yellow-500 text-yellow-400 bg-yellow-500/20' };
      default: return { label: role?.toUpperCase() || 'GUEST', color: 'border-gray-600 text-gray-400 bg-gray-800' };
    }
  };

  const badge = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 bg-obsidian/95 border-b border-cyan-500/20 backdrop-blur-md print:hidden">
      {/* Top Header: Brand Logo & Status + Authenticated User Profile */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 border-b border-gray-800/80">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber flex-shrink-0">
            <span className="font-orbitron font-black text-neonCyan text-sm">DG</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm md:text-base font-orbitron font-black tracking-wider text-white whitespace-nowrap">
              DGDASH <span className="text-neonCyan">RACING SYSTEM</span>
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-orbitron font-bold bg-neonPink/20 text-neonPink border border-neonPink clip-cyber whitespace-nowrap">
              HEAT #{activeRaceNum}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-cyberSilver/60 border-l border-gray-800 pl-3">
            <span className="inline-flex items-center gap-1">
              <span className={clsx("w-2 h-2 rounded-full", connected ? "bg-neonGreen animate-pulse" : "bg-red-500")} />
              {connected ? "LIVE SYNC" : "OFFLINE"}
            </span>
            <span>•</span>
            <span className="uppercase">NEO-RACING HUD v3.2</span>
          </div>
        </div>

        {/* Authenticated User Identity / Google Login Control */}
        <div className="relative flex-shrink-0">
          {isAuthenticated && user ? (
            <div>
              <button
                onClick={() => setAuthDropdown(!authDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-midnight border border-neonCyan/40 clip-cyber hover:border-neonCyan text-left whitespace-nowrap transition"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full border border-neonCyan object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neonCyan/20 flex items-center justify-center border border-neonCyan text-neonCyan font-bold text-xs">
                    {user.name ? user.name[0] : 'U'}
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-xs font-orbitron font-bold text-white leading-none flex items-center gap-1.5">
                    <span>{user.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={clsx("px-1.5 py-0.2 text-[9px] font-orbitron font-bold clip-cyber border", badge.color)}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-cyberSilver/70 ml-0.5" />
              </button>

              {/* User Profile Dropdown Menu */}
              {authDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-obsidian border-2 border-neonCyan/60 shadow-glowCyan clip-cyber p-3 z-50">
                  <div className="border-b border-gray-800 pb-2.5 mb-2.5">
                    <div className="text-xs font-orbitron font-bold text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-[11px] font-mono text-cyberSilver/80 truncate">
                      {user.email}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={clsx("px-1.5 py-0.5 text-[9px] font-orbitron font-bold clip-cyber border", badge.color)}>
                        ROLE: {badge.label}
                      </span>
                      <span className={clsx(
                        "px-1.5 py-0.5 text-[9px] font-orbitron font-bold clip-cyber border",
                        isApproved && "bg-emerald-950/60 text-emerald-400 border-emerald-500/50",
                        isPending && "bg-amber-950/60 text-amber-400 border-amber-500/50",
                        !isApproved && !isPending && "bg-red-950/60 text-red-400 border-red-500/50"
                      )}>
                        STATUS: {user.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveScreen('admin');
                        setAuthDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-orbitron font-bold text-neonCyan hover:bg-neonCyan/10 clip-cyber flex items-center gap-2 mb-2 transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>MANAJEMEN PENGGUNA</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      setAuthDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-orbitron font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 clip-cyber flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>KELUAR (LOGOUT)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setActiveScreen('cashier')}
              className="flex items-center gap-2 px-3 py-1.5 bg-neonCyan/10 border border-neonCyan text-neonCyan hover:bg-neonCyan hover:text-black font-orbitron font-bold text-xs clip-cyber shadow-glowCyan transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>LOGIN PETUGAS</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Screen Switcher Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 py-1.5">
        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {screens.map(s => {
            const Icon = s.icon;
            const isActive = activeScreen === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectScreen(s)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-orbitron font-semibold uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-all duration-150 clip-cyber border",
                  isActive
                    ? "bg-neonCyan/20 text-neonCyan border-neonCyan shadow-glowCyan"
                    : "bg-midnight/70 text-cyberSilver/75 border-gray-800 hover:border-gray-600 hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
