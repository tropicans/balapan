import React, { useState } from 'react';
import { RaceProvider } from './context/RaceContext.jsx';
import { Navbar } from './components/ui/Navbar.jsx';
import { CountdownModal } from './components/ui/CountdownModal.jsx';
import { BtoCelebrationModal } from './components/ui/BtoCelebrationModal.jsx';
import { QualifierCelebrationModal } from './components/ui/QualifierCelebrationModal.jsx';

import { ParticipantDashboard } from './screens/ParticipantDashboard.jsx';
import { RaceDirectorDashboard } from './screens/RaceDirectorDashboard.jsx';
import { ScrutineerDashboard } from './screens/ScrutineerDashboard.jsx';
import { CashierDashboard } from './screens/CashierDashboard.jsx';
import { RealtimeTV } from './screens/RealtimeTV.jsx';
import { BracketDashboard } from './screens/BracketDashboard.jsx';
import { DeskQRCodes } from './screens/DeskQRCodes.jsx';
import { MarshalDashboard } from './screens/MarshalDashboard.jsx';

function AppContent() {
  const [activeScreen, setActiveScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/tv' || hash === '#tv') return 'tv';
      if (path === '/marshal' || hash === '#marshal') return 'marshal';
      if (path === '/cashier' || hash === '#cashier') return 'cashier';
      if (path === '/director' || path === '/rd' || hash === '#director' || hash === '#rd') return 'rd';
      if (path === '/bracket' || hash === '#bracket') return 'bracket';
      if (path === '/scrutineer' || hash === '#scrutineer') return 'scrutineer';
      if (path === '/qr-codes' || hash === '#qr-codes') return 'qr-codes';
      if (path === '/participant' || hash === '#participant') return 'participant';
    }
    return 'participant';
  });

  return (
    <div className="min-h-screen bg-midnight text-cyberSilver cyber-grid flex flex-col font-mono selection:bg-neonCyan selection:text-black">
      {/* Top Navbar */}
      <Navbar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeScreen === 'participant' && <ParticipantDashboard />}
        {activeScreen === 'rd' && <RaceDirectorDashboard />}
        {activeScreen === 'scrutineer' && <ScrutineerDashboard />}
        {activeScreen === 'cashier' && <CashierDashboard />}
        {activeScreen === 'marshal' && <MarshalDashboard />}
        {activeScreen === 'tv' && <RealtimeTV />}
        {activeScreen === 'bracket' && <BracketDashboard />}
        {activeScreen === 'qr-codes' && <DeskQRCodes />}
      </main>

      {/* Global Real-Time Modals */}
      <CountdownModal />
      <BtoCelebrationModal />
      <QualifierCelebrationModal />
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
