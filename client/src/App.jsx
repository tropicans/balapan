import React, { useState } from 'react';
import { RaceProvider } from './context/RaceContext.jsx';
import { Navbar } from './components/ui/Navbar.jsx';
import { CountdownModal } from './components/ui/CountdownModal.jsx';
import { BtoCelebrationModal } from './components/ui/BtoCelebrationModal.jsx';

import { ParticipantDashboard } from './screens/ParticipantDashboard.jsx';
import { RaceDirectorDashboard } from './screens/RaceDirectorDashboard.jsx';
import { ScrutineerDashboard } from './screens/ScrutineerDashboard.jsx';
import { CashierDashboard } from './screens/CashierDashboard.jsx';
import { RealtimeTV } from './screens/RealtimeTV.jsx';
import { BracketDashboard } from './screens/BracketDashboard.jsx';
import { DeskQRCodes } from './screens/DeskQRCodes.jsx';

function AppContent() {
  const [activeScreen, setActiveScreen] = useState('participant');

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
        {activeScreen === 'tv' && <RealtimeTV />}
        {activeScreen === 'bracket' && <BracketDashboard />}
        {activeScreen === 'qr-codes' && <DeskQRCodes />}
      </main>

      {/* Global Real-Time Modals */}
      <CountdownModal />
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
