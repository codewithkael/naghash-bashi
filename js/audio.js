/**
 * نقاشباشی (Naghash Bashi) - Synthesized Web Audio Sound Engine
 * Pure Web Audio API - Zero external audio files/latency.
 * Generates tactile party game sounds: drawing swoosh, correct guess chime,
 * close guess alert, timer ticks, victory fanfare, and chat pops.
 */

const SoundEngine = (function () {
  let audioCtx = null;
  let isMuted = false;

  function getContext() {
    if (!audioCtx) {
      const AudioContextClass = typeof window !== 'undefined'
        ? (window.AudioContext || window.webkitAudioContext)
        : null;
      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass();
        } catch (e) {
          console.warn('AudioContext failed:', e);
        }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function initMuteState() {
    try {
      if (typeof localStorage !== 'undefined') {
        isMuted = localStorage.getItem('naghash_sound_muted') === '1';
      }
    } catch (e) {}
  }

  initMuteState();

  function toggleMute() {
    isMuted = !isMuted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('naghash_sound_muted', isMuted ? '1' : '0');
      }
    } catch (e) {}
    return isMuted;
  }

  function getMuted() {
    return isMuted;
  }

  /**
   * Correct guess celebration chime (C5 -> E5 -> G5 -> C6)
   */
  function playCorrectGuess() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
    });
  }

  /**
   * Close guess alert (friendly nudge)
   */
  function playCloseGuess() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  }

  /**
   * Timer tick (wooden click, urgent pitch under 10s)
   */
  function playTimerTick(isUrgent = false) {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = isUrgent ? 920 : 540;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(isUrgent ? 0.2 : 0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  /**
   * Drawing stroke feedback (soft friction whisper)
   */
  let lastSwoosh = 0;
  function playDrawSwoosh() {
    if (isMuted) return;
    const now = Date.now();
    if (now - lastSwoosh < 160) return; // Throttle sound
    lastSwoosh = now;

    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 + Math.random() * 80, ctx.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  /**
   * Chat message bubble pop
   */
  function playChatPop() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  /**
   * Clear canvas swoosh
   */
  function playClearCanvas() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  }

  /**
   * Turn / Round start fanfare
   */
  function playTurnStart() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.07 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.07);
      osc.stop(ctx.currentTime + i * 0.07 + 0.3);
    });
  }

  /**
   * Victory / Game Over fanfare
   */
  function playVictoryFanfare() {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    // Fanfare chords: G4 -> C5 -> E5 -> G5 (sustained)
    const melody = [
      { f: 392.00, d: 0.12, t: 0 },
      { f: 523.25, d: 0.12, t: 0.13 },
      { f: 659.25, d: 0.14, t: 0.26 },
      { f: 783.99, d: 0.6,  t: 0.42 },
      { f: 1046.5, d: 0.8,  t: 0.42 }
    ];

    melody.forEach(item => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, ctx.currentTime + item.t);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + item.t);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + item.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + item.t + item.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + item.t);
      osc.stop(ctx.currentTime + item.t + item.d + 0.05);
    });
  }

  return {
    getContext,
    toggleMute,
    getMuted,
    playCorrectGuess,
    playCloseGuess,
    playTimerTick,
    playDrawSwoosh,
    playChatPop,
    playClearCanvas,
    playTurnStart,
    playVictoryFanfare
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoundEngine;
}
