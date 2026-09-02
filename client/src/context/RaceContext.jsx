import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio.js';
import { useHaptic } from '../hooks/useHaptic.js';

const RaceContext = createContext();

export function RaceProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [raceState, setRaceState] = useState({
    activeRace: null,
    btoLeaderboard: [],
    upcomingRaces: [],
    scrutineerQueue: [],
    bracketMatches: [],
  });

  // Current User Session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tamiya_user');
      return saved ? JSON.parse(saved) : {
        id: 'user-andi',
        name: 'Andi Pratama',
        email: 'andi@gmail.com',
        team_name: 'ANDI [RRT]',
        role: 'participant',
        coupon_balance: 25
      };
    } catch {
      return null;
    }
  });

  // Real-time Countdown Overlay State
  const [countdown, setCountdown] = useState({
    active: false,
    seconds: 0,
    word: '',
    status: 'idle', // 'running', 'stopped', 'complete'
    message: ''
  });

  // Flash Banner / Alerts
  const [bannerAlert, setBannerAlert] = useState(null);
  const [newBtoModal, setNewBtoModal] = useState(null);

  const { hapticReady, hapticLock, hapticTick, hapticError } = useHaptic();

  // Initialize Socket.io
  useEffect(() => {
    const socketInstance = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('⚡ Connected to Tamiya Cyberpunk Realtime Server');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('STATE_UPDATE', (data) => {
      setRaceState(data);
      // Sync currentUser coupon balance if active
      if (currentUser?.id) {
        // If current user is registered in active race
        const myReg = data.activeRace?.registrations?.find(r => r.user_id === currentUser.id);
        if (myReg && myReg.coupon_balance !== undefined) {
          setCurrentUser(prev => ({ ...prev, coupon_balance: myReg.coupon_balance }));
        }
      }
    });

    // Specialized Real-Time Events
    socketInstance.on('RACE_LOCKED', (data) => {
      sound.playLockSound();
      hapticLock();
      setBannerAlert({ type: 'locked', message: data.message || 'RACE READY - LINTASAN SIAP!' });
      setTimeout(() => setBannerAlert(null), 5000);
    });

    socketInstance.on('COUNTDOWN_STARTED', (data) => {
      setCountdown({
        active: true,
        seconds: data.seconds,
        word: data.word,
        status: 'running',
        message: ''
      });
      sound.speakWord(data.word);
      sound.playCountdownBeep(700);
      hapticTick();
    });

    socketInstance.on('COUNTDOWN_TICK', (data) => {
      setCountdown(prev => ({
        ...prev,
        active: true,
        seconds: data.seconds,
        word: data.word,
        status: 'running'
      }));
      sound.speakWord(data.word);
      sound.playCountdownBeep(500 + (11 - data.seconds) * 40);
      if (data.haptic) hapticTick();
    });

    socketInstance.on('COUNTDOWN_COMPLETE', (data) => {
      setCountdown({
        active: true,
        seconds: 0,
        word: 'GO!',
        status: 'complete',
        message: data.message || 'GO! LEPAS MOBIL!'
      });
      sound.playGoTone();
      hapticReady();
      setTimeout(() => {
        setCountdown(prev => ({ ...prev, active: false }));
      }, 3000);
    });

    socketInstance.on('COUNTDOWN_STOPPED', (data) => {
      sound.stopVoice();
      sound.playGoTone();
      hapticReady();
      setCountdown({
        active: true,
        seconds: 0,
        word: 'SIAP!',
        status: 'stopped',
        message: data.message || 'RACE READY - LEPAS!'
      });
      setTimeout(() => {
        setCountdown(prev => ({ ...prev, active: false }));
      }, 4000);
    });

    socketInstance.on('NEW_BTO_RECORD', (data) => {
      sound.playSiren();
      setNewBtoModal(data);
      // Trigger golden confetti
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#ff0055', '#39ff14', '#ffaa00', '#ffffff']
        });
      } catch (e) {}
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Save currentUser to localStorage
  const switchUser = (user) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('tamiya_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tamiya_user');
    }
  };

  // API Call Helpers
  const apiScanLane = async (userId, lane) => {
    try {
      const res = await fetch('/api/race/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lane })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal mendaftar jalur');
      sound.playReadySound();
      hapticReady();
      return data;
    } catch (err) {
      sound.playErrorSound();
      hapticError();
      throw err;
    }
  };

  const apiSetReady = async (userId, raceId) => {
    try {
      const res = await fetch('/api/race/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, raceId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal mengubah status');
      sound.playReadySound();
      hapticReady();
      return data;
    } catch (err) {
      sound.playErrorSound();
      hapticError();
      throw err;
    }
  };

  const apiCancelRegistration = async (userId) => {
    try {
      const res = await fetch('/api/race/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal membatalkan pendaftaran');
      sound.playTone(300, 'triangle', 0.2);
      return data;
    } catch (err) {
      sound.playErrorSound();
      hapticError();
      throw err;
    }
  };

  const apiLockRace = async (raceId) => {
    try {
      const res = await fetch('/api/race/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal mengunci balapan');
      return data;
    } catch (err) {
      sound.playErrorSound();
      throw err;
    }
  };

  const apiStartRace = async (raceId) => {
    const res = await fetch('/api/race/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal memulai balapan');
    return data;
  };

  const apiSubmitFinish = async (raceId, times) => {
    const res = await fetch('/api/race/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceId, times })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal menyimpan waktu finish');
    return data;
  };

  const apiScrutineerAction = async (registrationId, action) => {
    const res = await fetch('/api/race/scrutineer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId, action })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal memproses scrutineering');
    return data;
  };

  const apiAdminOverride = async (action, payload) => {
    const res = await fetch('/api/race/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Override gagal');
    return data;
  };

  const apiTopUp = async (userId, amount) => {
    const res = await fetch('/api/coupons/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Topup gagal');
    return data;
  };

  const apiRegisterGuest = async (name, teamName, initialBalance) => {
    const res = await fetch('/api/users/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, teamName, initialBalance })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal mendaftar peserta tamu');
    return data;
  };

  const apiStartCountdown = async () => {
    const res = await fetch('/api/countdown/start', { method: 'POST' });
    return await res.json();
  };

  const apiResetCountdown = async () => {
    const res = await fetch('/api/countdown/reset', { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Reset gagal');
    return data;
  };

  const apiStopCountdown = async () => {
    const res = await fetch('/api/countdown/stop', { method: 'POST' });
    return await res.json();
  };

  const apiAdvanceBracket = async (matchId, winnerId) => {
    const res = await fetch('/api/bracket/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, winnerId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal menentukan pemenang bracket');
    return data;
  };

  return (
    <RaceContext.Provider
      value={{
        socket,
        connected,
        raceState,
        currentUser,
        countdown,
        bannerAlert,
        newBtoModal,
        setNewBtoModal,
        switchUser,
        apiScanLane,
        apiSetReady,
        apiCancelRegistration,
        apiLockRace,
        apiStartRace,
        apiSubmitFinish,
        apiScrutineerAction,
        apiAdminOverride,
        apiTopUp,
        apiRegisterGuest,
        apiStartCountdown,
        apiResetCountdown,
        apiStopCountdown,
        apiAdvanceBracket
      }}
    >
      {children}
    </RaceContext.Provider>
  );
}

export function useRace() {
  const context = useContext(RaceContext);
  if (!context) throw new Error('useRace must be used within a RaceProvider');
  return context;
}
