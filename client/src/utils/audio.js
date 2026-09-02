// Cyberpunk Sound Engine & Indonesian Human Voice Countdown Synthesizer

class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.speechSynth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Indonesian Human Voice Countdown
  speakWord(text) {
    if (this.isMuted || !this.speechSynth) return;
    try {
      this.speechSynth.cancel(); // Stop prior word
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 0.95; // Deep firm voice
      this.speechSynth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  stopVoice() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
    }
  }

  // Web Audio Tone Synthesis
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  // Lock Sound (Heavy hydraulic cyberpunk click)
  playLockSound() {
    this.playTone(180, 'sawtooth', 0.25, 0.3);
    setTimeout(() => this.playTone(440, 'triangle', 0.2, 0.25), 100);
  }

  // Ready / Confirmation Sound
  playReadySound() {
    this.playTone(523.25, 'sine', 0.1, 0.2);
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.25), 80);
  }

  // Countdown Beep (High tech chirp)
  playCountdownBeep(freq = 600) {
    this.playTone(freq, 'sine', 0.12, 0.25);
  }

  // GO / Lepas signal (Double high tone)
  playGoTone() {
    this.playTone(880, 'square', 0.4, 0.3);
    setTimeout(() => this.playTone(1760, 'sawtooth', 0.5, 0.35), 100);
  }

  // Error / Warning Buzz
  playErrorSound() {
    this.playTone(130, 'sawtooth', 0.3, 0.35);
  }

  // New Record Siren
  playSiren() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      // Modulate frequency up and down
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.3);
      osc.frequency.linearRampToValueAtTime(500, now + 0.6);
      osc.frequency.linearRampToValueAtTime(900, now + 0.9);
      osc.frequency.linearRampToValueAtTime(500, now + 1.2);

      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 1.5);
    } catch (e) {}
  }
}

export const sound = new CyberAudioEngine();
