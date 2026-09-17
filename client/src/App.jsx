import React, { useState } from 'react';
import { RaceProvider } from './context/RaceContext.jsx';
import { Navbar } from './components/ui/Navbar.jsx';
import { BtoCelebrationModal } from './components/ui/BtoCelebrationModal.jsx';

import { RaceDirectorDashboard } from './screens/RaceDirectorDashboard.jsx';
import { CashierDashboard } from './screens/CashierDashboard.jsx';
import { RealtimeTV } from './screens/RealtimeTV.jsx';
import { BracketDashboard } from './screens/BracketDashboard.jsx';
import { EventManagementDashboard } from './screens/EventManagementDashboard.jsx';
import { WinnerRegistrationDashboard } from './screens/WinnerRegistrationDashboard.jsx';

function AppContent() {
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
      // Legacy routes safe redirection (REM-01: no dead links, redirect bookmark)
      if (['/marshal', '/scrutineer', '/qr-codes', '/participant'].includes(path) ||
          ['#marshal', '#scrutineer', '#qr-codes', '#participant'].includes(hash)) {
        return 'cashier';
      }
    }
    return 'cashier';
  });

  return (
    <div className="min-h-screen bg-midnight text-cyberSilver cyber-grid flex flex-col font-mono selection:bg-neonCyan selection:text-black">
      {/* Top Navbar */}
      <Navbar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeScreen === 'cashier' && <CashierDashboard />}
        {activeScreen === 'rd' && <RaceDirectorDashboard />}
        {activeScreen === 'bracket' && <BracketDashboard />}
        {activeScreen === 'winners' && <WinnerRegistrationDashboard />}
        {activeScreen === 'tv' && <RealtimeTV />}
        {activeScreen === 'events' && <EventManagementDashboard />}
      </main>

      {/* Global Real-Time Modals */}
      <BtoCelebrationModal />
    </div>
  );
}

export default function App() {
  return (
    <RaceProvider>
      <AppContent />
    </RaceProvider>
  );
}
