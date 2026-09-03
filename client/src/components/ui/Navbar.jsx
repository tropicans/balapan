import React, { useState } from 'react';
import { useRace } from '../../context/RaceContext.jsx';
import { CyberButton } from './CyberButton.jsx';
import { 
  Tv, 
  Smartphone, 
  Sliders, 
  ShieldCheck, 
  CreditCard, 
  GitBranch, 
  QrCode, 
  Radio, 
  User, 
  Coins, 
  ChevronDown 
} from 'lucide-react';
import clsx from 'clsx';

export function Navbar({ activeScreen, setActiveScreen }) {
  const { connected, currentUser, switchUser, raceState } = useRace();
  const [userDropdown, setUserDropdown] = useState(false);

  const demoUsers = [
    { id: 'user-andi', name: 'Andi Pratama', email: 'andi@gmail.com', team_name: 'ANDI [RRT]', role: 'participant', coupon_balance: 25 },
    { id: 'user-budi', name: 'Budi Santoso', email: 'budi@gmail.com', team_name: 'BUDI [GTR]', role: 'participant', coupon_balance: 18 },
    { id: 'user-chan', name: 'Chandra Wijaya', email: 'chandra@gmail.com', team_name: 'CHAN [M4D]', role: 'participant', coupon_balance: 30 },
    { id: 'user-doni', name: 'Doni Kurniawan', email: 'doni@gmail.com', team_name: 'DONI [SPD]', role: 'participant', coupon_balance: 15 },
    { id: 'user-rd', name: 'Race Director (Head)', email: 'rd@tamiya.local', team_name: 'HQ', role: 'admin', coupon_balance: 999 },
    { id: 'user-scrut', name: 'Juri Scrutineer', email: 'scrutineer@tamiya.local', team_name: 'QC', role: 'scrutineer', coupon_balance: 999 },
  ];

  const screens = [
    { id: 'participant', label: 'Peserta (HP)', icon: Smartphone, color: 'cyan' },
    { id: 'rd', label: 'Race Director', icon: Sliders, color: 'pink' },
    { id: 'scrutineer', label: 'Scrutineer', icon: ShieldCheck, color: 'green' },
    { id: 'cashier', label: 'Kasir Kupon', icon: CreditCard, color: 'amber' },
    { id: 'tv', label: 'Layar TV Sirkuit', icon: Tv, color: 'cyan' },
    { id: 'bracket', label: 'Bracket Babak 2', icon: GitBranch, color: 'pink' },
    { id: 'qr-codes', label: 'QR Jalur Fisik', icon: QrCode, color: 'cyan' },
  ];

  const activeRaceNum = raceState.activeRace?.race_number || 1;

  return (
    <header className="sticky top-0 z-40 bg-obsidian/95 border-b border-cyan-500/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 xl:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 xl:gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber flex-shrink-0">
            <span className="font-orbitron font-black text-neonCyan text-base">DG</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-orbitron font-black tracking-wider text-white whitespace-nowrap">
                DGDASH <span className="text-neonCyan">RACING SYSTEM</span>
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-orbitron font-bold bg-neonPink/20 text-neonPink border border-neonPink clip-cyber whitespace-nowrap">
                HEAT #{activeRaceNum}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-cyberSilver/60 whitespace-nowrap">
              <span className="inline-flex items-center gap-1">
                <span className={clsx("w-2 h-2 rounded-full", connected ? "bg-neonGreen animate-pulse" : "bg-red-500")} />
                {connected ? "LIVE SYNC" : "OFFLINE"}
              </span>
              <span>•</span>
              <span className="uppercase">NEO-RACING HUD v2.0</span>
            </div>
          </div>
        </div>

        {/* Navigation Screen Switcher Tabs */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 overflow-x-auto no-scrollbar py-1 flex-shrink min-w-0">
          {screens.map(s => {
            const Icon = s.icon;
            const isActive = activeScreen === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveScreen(s.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-[11px] xl:text-xs font-orbitron font-semibold uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-all duration-150 clip-cyber border",
                  isActive
                    ? "bg-neonCyan/20 text-neonCyan border-neonCyan shadow-glowCyan"
                    : "bg-midnight/60 text-cyberSilver/70 border-gray-800 hover:border-gray-600 hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Session & Role Switcher */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-midnight border border-neonCyan/40 clip-cyber hover:border-neonCyan text-left whitespace-nowrap"
          >
            <div className="w-7 h-7 rounded-full bg-neonCyan/20 flex items-center justify-center border border-neonCyan text-neonCyan font-bold text-xs">
              {currentUser?.name ? currentUser.name[0] : 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-orbitron font-bold text-white leading-none">
                {currentUser?.name || 'Pilih Akun'}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-neonAmber font-mono mt-0.5">
                <Coins className="w-3 h-3" />
                <span>{currentUser?.coupon_balance ?? 0} Kupon</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-cyberSilver/70" />
          </button>

          {/* User Switcher Dropdown */}
          {userDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-obsidian border border-neonCyan/50 shadow-glowCyan clip-cyber p-2 z-50">
              <div className="text-[10px] font-orbitron font-bold text-neonCyan px-2 py-1 uppercase tracking-wider border-b border-gray-800">
                Ganti Akun Demo / Peserta
              </div>
              <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                {demoUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u);
                      setUserDropdown(false);
                    }}
                    className={clsx(
                      "w-full text-left px-2.5 py-1.5 text-xs font-mono flex items-center justify-between transition-colors",
                      currentUser?.email === u.email
                        ? "bg-neonCyan/20 text-neonCyan font-bold"
                        : "text-cyberSilver hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div>
                      <div className="font-orbitron text-xs">{u.name}</div>
                      <div className="text-[10px] text-cyberSilver/60">{u.team_name || u.role}</div>
                    </div>
                    <span className="text-neonAmber text-xs font-bold">{u.coupon_balance} K</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Screen Switcher Bar */}
      <div className="lg:hidden flex items-center gap-1 px-3 py-1.5 overflow-x-auto no-scrollbar border-t border-gray-800 bg-midnight/80">
        {screens.map(s => {
          const Icon = s.icon;
          const isActive = activeScreen === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveScreen(s.id)}
              className={clsx(
                "flex items-center gap-1 px-2.5 py-1 text-[11px] font-orbitron uppercase whitespace-nowrap flex-shrink-0 clip-cyber border",
                isActive
                  ? "bg-neonCyan/20 text-neonCyan border-neonCyan"
                  : "bg-obsidian text-cyberSilver/70 border-gray-800"
              )}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
