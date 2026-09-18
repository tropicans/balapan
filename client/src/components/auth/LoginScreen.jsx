import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LogIn, Shield, Tv, GitBranch, AlertCircle, Sparkles } from 'lucide-react';

export function LoginScreen({ onNavigatePublic }) {
  const { loginWithGoogleToken, loginWithMock, error: authError, loading } = useAuth();
  const googleBtnRef = useRef(null);
  const isGsiInitializedRef = useRef(false);
  const [devEmail, setDevEmail] = useState('tropicans@gmail.com');
  const [devName, setDevName] = useState('Tropicans Super Admin');
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [localError, setLocalError] = useState(null);

  const [googleClientId, setGoogleClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '');

  useEffect(() => {
    if (!googleClientId) {
      fetch('/api/auth/config')
        .then((res) => res.json())
        .then((res) => {
          if (res?.success && res.data?.google_client_id) {
            setGoogleClientId(res.data.google_client_id);
          }
        })
        .catch(() => {});
    }
  }, [googleClientId]);

  useEffect(() => {
    // Initialize Google Identity Services if available and client id is provided
    if (window.google?.accounts?.id && googleClientId) {
      if (!isGsiInitializedRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              try {
                if (response.credential) {
                  await loginWithGoogleToken(response.credential);
                }
              } catch (err) {
                setLocalError(err.message || 'Login dengan Google gagal');
              }
            },
          });
          isGsiInitializedRef.current = true;
        } catch (e) {
          console.warn('[GIS] Init error:', e);
        }
      }

      if (googleBtnRef.current) {
        try {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 280,
          });
        } catch (e) {
          console.warn('[GIS] renderButton error:', e);
        }
      }
    }
  }, [googleClientId, loginWithGoogleToken]);

  const handleDevLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await loginWithMock({
        email: devEmail,
        name: devName,
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      });
    } catch (err) {
      setLocalError(err.message || 'Gagal login simulasi');
    }
  };

  const handleQuickSuperAdmin = async () => {
    setLocalError(null);
    try {
      await loginWithMock({
        email: 'tropicans@gmail.com',
        name: 'Tropicans Super Admin',
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      });
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleQuickGuest = async () => {
    setLocalError(null);
    try {
      await loginWithMock({
        email: 'panitia.baru@gmail.com',
        name: 'Panitia Baru (Pending)',
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      });
    } catch (err) {
      setLocalError(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-obsidian/90 border border-neonCyan/40 clip-cyber p-6 sm:p-8 shadow-glowCyan relative backdrop-blur-xl">
        {/* Neon accent corner */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-neonCyan/20 border-t-2 border-r-2 border-neonCyan" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neonCyan/10 border border-neonCyan clip-cyber mb-3 shadow-glowCyan">
            <Shield className="w-6 h-6 text-neonCyan" />
          </div>
          <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
            Akses Operasional
          </h2>
          <p className="text-xs font-mono text-cyberSilver/70 mt-1">
            Silakan masuk dengan akun Google terdaftar untuk mengoperasikan turnamen balap.
          </p>
        </div>

        {/* Error notification */}
        {(authError || localError) && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/50 clip-cyber flex items-center gap-2.5 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{authError || localError}</span>
          </div>
        )}

        {/* Official Google Sign-In Container */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center" />

          {/* If GIS button not rendered or no client ID, provide standard styled button */}
          {(!googleClientId || !window.google?.accounts?.id) && (
            <button
              onClick={handleQuickSuperAdmin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 font-semibold text-sm rounded hover:bg-gray-100 transition shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Masuk dengan Google (Super Admin)</span>
            </button>
          )}

          <div className="w-full flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[10px] font-mono text-cyberSilver/50 uppercase tracking-wider">atau opsi login</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Quick Simulation Buttons */}
          <div className="w-full grid grid-cols-2 gap-2">
            <button
              onClick={handleQuickSuperAdmin}
              disabled={loading}
              className="px-2.5 py-2 bg-neonCyan/10 border border-neonCyan/40 hover:border-neonCyan text-neonCyan text-[11px] font-orbitron font-bold clip-cyber flex items-center justify-center gap-1.5 transition"
              title="Login langsung sebagai tropicans@gmail.com (Super Admin)"
            >
              <Sparkles className="w-3.5 h-3.5 text-neonCyan" />
              <span>Super Admin</span>
            </button>
            <button
              onClick={handleQuickGuest}
              disabled={loading}
              className="px-2.5 py-2 bg-amber-500/10 border border-amber-500/40 hover:border-amber-500 text-neonAmber text-[11px] font-orbitron font-bold clip-cyber flex items-center justify-center gap-1.5 transition"
              title="Simulasi login Google akun umum (status Pending)"
            >
              <LogIn className="w-3.5 h-3.5 text-neonAmber" />
              <span>Akun Pending</span>
            </button>
          </div>

          {/* Custom Dev Mode Switch */}
          <div className="w-full pt-2">
            <button
              type="button"
              onClick={() => setShowDevLogin(!showDevLogin)}
              className="w-full text-center text-[11px] font-mono text-cyberSilver/50 hover:text-neonCyan transition"
            >
              {showDevLogin ? '▲ Sembunyikan custom login' : '▼ Gunakan email custom simulasi'}
            </button>

            {showDevLogin && (
              <form onSubmit={handleDevLogin} className="mt-3 space-y-2.5 p-3 bg-midnight/80 border border-gray-800 clip-cyber">
                <div>
                  <label className="block text-[10px] font-mono text-cyberSilver/70 uppercase">Email Google</label>
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-obsidian border border-gray-700 text-white text-xs font-mono clip-cyber focus:border-neonCyan focus:outline-none"
                    placeholder="nama@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-cyberSilver/70 uppercase">Nama Pengguna</label>
                  <input
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-obsidian border border-gray-700 text-white text-xs font-mono clip-cyber focus:border-neonCyan focus:outline-none"
                    placeholder="Nama Lengkap"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-1.5 bg-neonPink/20 border border-neonPink text-neonPink hover:bg-neonPink hover:text-black text-xs font-orbitron font-bold clip-cyber transition"
                >
                  {loading ? 'MEMPROSES...' : 'MASUK DENGAN EMAIL INI'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Public Spectator Bypass Links */}
        <div className="mt-8 pt-6 border-t border-gray-800/80 text-center">
          <p className="text-[11px] font-mono text-cyberSilver/60 mb-3">
            Bukan petugas turnamen? Tonton balapan secara publik:
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onNavigatePublic?.('tv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/30 hover:border-neonCyan text-cyan-300 text-xs font-mono clip-cyber transition"
            >
              <Tv className="w-3.5 h-3.5 text-neonCyan" />
              <span>Layar TV Sirkuit</span>
            </button>
            <button
              onClick={() => onNavigatePublic?.('bracket')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-950/40 border border-pink-500/30 hover:border-neonPink text-pink-300 text-xs font-mono clip-cyber transition"
            >
              <GitBranch className="w-3.5 h-3.5 text-neonPink" />
              <span>Bagan Eliminasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
