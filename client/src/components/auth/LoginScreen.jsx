import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Shield, Tv, GitBranch, AlertCircle } from 'lucide-react';

export function LoginScreen({ onNavigatePublic }) {
  const { loginWithGoogleToken, loginWithMock, error: authError, loading } = useAuth();
  const googleBtnRef = useRef(null);
  const isGsiInitializedRef = useRef(false);
  const [localError, setLocalError] = useState(null);
  const [googleClientId, setGoogleClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '');

  // Fetch client ID dynamically from backend if not baked into Vite env
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

  // Initialize Google Identity Services (GIS) button
  useEffect(() => {
    if (window.google?.accounts?.id && googleClientId && googleBtnRef.current) {
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
          console.warn('[GIS] init error:', e);
        }
      }

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
  }, [googleClientId, loginWithGoogleToken]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-obsidian/95 border border-neonCyan/40 clip-cyber p-6 sm:p-8 shadow-glowCyan relative backdrop-blur-xl">
        {/* Neon accent corner */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-neonCyan/20 border-t-2 border-r-2 border-neonCyan" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neonCyan/10 border border-neonCyan clip-cyber mb-3 shadow-glowCyan">
            <Shield className="w-6 h-6 text-neonCyan" />
          </div>
          <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
            Akses Operasional
          </h2>
          <p className="text-xs font-mono text-cyberSilver/70 mt-1">
            Masuk dengan akun Google untuk mengoperasikan sistem turnamen balap.
          </p>
        </div>

        {/* Error notification */}
        {(authError || localError) && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/50 clip-cyber flex items-center gap-2.5 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{authError || localError}</span>
          </div>
        )}

        {/* Google Sign-In Container */}
        <div className="flex flex-col items-center justify-center py-4">
          <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center" />

          {loading && (
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-neonCyan animate-pulse">
              <div className="w-3 h-3 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
              <span>Memverifikasi akun Google...</span>
            </div>
          )}
        </div>

        {/* ENH-03: Emergency Local / Offline Mode for Venues without Internet */}
        <div className="mt-4 pt-4 border-t border-gray-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-yellow-400/90 font-semibold flex items-center gap-1">
              ⚡ Akses Darurat / Sirkuit Offline
            </span>
            <span className="text-[10px] font-mono text-cyberSilver/50">Tanpa Internet</span>
          </div>
          <p className="text-[10px] font-mono text-cyberSilver/60 mb-3 leading-relaxed">
            Gunakan mode ini jika sirkuit mengalami gangguan jaringan internet / Google API.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  setLocalError(null);
                  await loginWithMock({
                    name: 'Super Admin (Offline)',
                    email: 'tropicans@gmail.com',
                    role: 'super_admin'
                  });
                } catch (err) {
                  setLocalError(err.message || 'Gagal masuk mode offline');
                }
              }}
              className="px-2.5 py-2 bg-yellow-950/30 border border-yellow-500/40 hover:border-yellow-400 text-yellow-300 text-xs font-mono clip-cyber transition flex flex-col items-center justify-center gap-1"
            >
              <span className="font-bold">Super Admin</span>
              <span className="text-[9px] text-yellow-500/70">Akses Penuh</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  setLocalError(null);
                  await loginWithMock({
                    name: 'Race Director (Offline)',
                    email: 'rd.offline@balapan.local',
                    role: 'race_director'
                  });
                } catch (err) {
                  setLocalError(err.message || 'Gagal masuk mode offline');
                }
              }}
              className="px-2.5 py-2 bg-cyan-950/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono clip-cyber transition flex flex-col items-center justify-center gap-1"
            >
              <span className="font-bold">Race Director</span>
              <span className="text-[9px] text-cyan-500/70">Kontrol Balap</span>
            </button>
          </div>
        </div>

        {/* Public Spectator Bypass Links */}
        <div className="mt-6 pt-5 border-t border-gray-800/80 text-center">
          <p className="text-[11px] font-mono text-cyberSilver/60 mb-2.5">
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
