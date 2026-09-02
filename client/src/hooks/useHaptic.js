export function useHaptic() {
  const triggerHaptic = (pattern = [100]) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Haptics not supported or permitted on this device
    }
  };

  const hapticReady = () => triggerHaptic([120, 60, 120]);
  const hapticLock = () => triggerHaptic([200, 100, 200]);
  const hapticTick = () => triggerHaptic([80]);
  const hapticError = () => triggerHaptic([300, 100, 300]);

  return {
    triggerHaptic,
    hapticReady,
    hapticLock,
    hapticTick,
    hapticError
  };
}
