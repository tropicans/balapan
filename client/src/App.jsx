import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { RaceProvider } from './context/RaceContext.jsx';
import { Navbar } from './components/ui/Navbar.jsx';
import { BtoCelebrationModal } from './components/ui/BtoCelebrationModal.jsx';

import { RaceDirectorDashboard } from './screens/RaceDirectorDashboard.jsx';
import { CashierDashboard } from './screens/CashierDashboard.jsx';
import { RealtimeTV } from './screens/RealtimeTV.jsx';
import { BracketDashboard } from './screens/BracketDashboard.jsx';
import { EventManagementDashboard } from './screens/EventManagementDashboard.jsx';
import { WinnerRegistrationDashboard } from './screens/WinnerRegistrationDashboard.jsx';
import { AdminUserDashboard } from './screens/AdminUserDashboard.jsx';

import { LoginScreen } from './components/auth/LoginScreen.jsx';
import { PendingApprovalScreen } from './components/auth/PendingApprovalScreen.jsx';
import { SuspendedAccountScreen } from './components/auth/SuspendedAccountScreen.jsx';

const PUBLIC_SCREENS = ['tv', 'bracket'];

function AppContent() {
  const { user, isApproved, isPending, isSuspended, loading } = useAuth();

  const [activeScreen, setActiveScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/tv' || hash === '#tv') return 'tv';
      if (path === '/cashier' || hash === '#cashier') return 'cashier';
      if (path === '/director' || path === '/rd' || hash === '#director' || hash === '#rd') return 'rd';
      if (path === '/bracket' || hash === '#bracket') return 'bracket';
      if (path === '/winners' || hash === '#winners') return 'winners';
      if (path === '/events' || hash === '#events') return 'events';
      if (path === '/admin' || hash === '#admin') return 'admin';
      // Legacy routes safe redirection
      if (['/marshal', '/scrutineer', '/qr-codes', '/participant'].includes(path) ||
          ['#marshal', '#scrutineer', '#qr-codes', '#participant'].includes(hash)) {
        return 'cashier';
      }
    }
    return 'cashier';
  });

  // Keep browser URL synced with back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/tv' || hash === '#tv') setActiveScreen('tv');
      else if (path === '/bracket' || hash === '#bracket') setActiveScreen('bracket');
      else if (path === '/director' || path === '/rd' || hash === '#director' || hash === '#rd') setActiveScreen('rd');
      else if (path === '/cashier' || hash === '#cashier') setActiveScreen('cashier');
      else if (path === '/winners' || hash === '#winners') setActiveScreen('winners');
      else if (path === '/events' || hash === '#events') setActiveScreen('events');
      else if (path === '/admin' || hash === '#admin') setActiveScreen('admin');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateScreen = (screenId) => {
    setActiveScreen(screenId);
    if (typeof window !== 'undefined') {
      try {
        const path = screenId === 'rd' ? '/director' : `/${screenId}`;
        window.history.pushState(null, '', path);
      } catch (e) {}
    }
  };

  const isPublic = PUBLIC_SCREENS.includes(activeScreen);

  // Render main screen content according to authentication & approval status
  const renderScreenContent = () => {
    // 1. Public screens are always unlocked (AUTH-06)
    if (isPublic) {
      if (activeScreen === 'tv') return <RealtimeTV />;
      if (activeScreen === 'bracket') return <BracketDashboard />;
    }

    // 2. Initial auth check spinner
    if (loading) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-xs font-mono text-cyberSilver/70 uppercase tracking-widest animate-pulse">
            Memverifikasi Sesi Autentikasi...
          </p>
        </div>
      );
    }

    // 3. Protected screens authentication checks (APPR-02, AUTH-01)
    if (!user) {
      return <LoginScreen onNavigatePublic={navigateScreen} />;
    }

    if (isPending) {
      return <PendingApprovalScreen onNavigatePublic={navigateScreen} />;
    }

    if (isSuspended) {
      return <SuspendedAccountScreen onNavigatePublic={navigateScreen} />;
    }

    // 4. User is approved: render authorized screen
    if (activeScreen === 'cashier') return <CashierDashboard />;
    if (activeScreen === 'rd') return <RaceDirectorDashboard />;
    if (activeScreen === 'winners') return <WinnerRegistrationDashboard />;
    if (activeScreen === 'events') return <EventManagementDashboard />;
    if (activeScreen === 'admin') return <AdminUserDashboard />;

    return <CashierDashboard />;
  };

  return (
    <div className="min-h-screen bg-midnight text-cyberSilver cyber-grid flex flex-col font-mono selection:bg-neonCyan selection:text-black">
      {/* Top Navbar with Auth identity & navigation */}
      <Navbar activeScreen={activeScreen} setActiveScreen={navigateScreen} />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {renderScreenContent()}
      </main>

      {/* Global Real-Time Modals */}
      <BtoCelebrationModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RaceProvider>
        <AppContent />
      </RaceProvider>
    </AuthProvider>
  );
}
