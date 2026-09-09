/**
 * نقاشباشی (Naghash Bashi) - AI Bot Companion System
 * Simulates intelligent bot players who can join rooms, draw procedural sketches,
 * and submit plausible guesses with human-like timing for solo play or testing.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BotEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const BOT_PROFILES = [
    { name: 'سهراب نقاشباشی', avatar: '🎨' },
    { name: 'آناهیتا قلم‌مو', avatar: '🐱' },
    { name: 'کامبیز هوشمند', avatar: '🦁' },
    { name: 'ربات پیکاسو', avatar: '🤖' },
    { name: 'نیلوفر پروانه', avatar: '🦊' },
    { name: 'آرش کیهانی', avatar: '🚀' }
  ];

  class BotPlayer {
    constructor(id, profile) {
      this.id = id;
      this.name = profile.name;
      this.avatar = profile.avatar;
      this.isBot = true;
      this.drawInterval = null;
      this.guessTimeout = null;
      this.isCancelled = false;
    }

    cancelActions() {
      this.isCancelled = true;
      if (this.drawInterval) {
        clearInterval(this.drawInterval);
        this.drawInterval = null;
      }
      if (this.guessTimeout) {
        clearTimeout(this.guessTimeout);
        this.guessTimeout = null;
      }
    }

    /**
     * When bot is drawer, procedurally generates drawing strokes on canvas
     */
    startDrawing(canvasInstance, onActionCallback) {
      this.cancelActions();

      // Procedural doodle patterns: sun, smiley, flower, mountain, house
      const patterns = [
        // House pattern
        [
          { type: 'STROKE_START', rx: 0.3, ry: 0.5, color: '#ef4444', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.3, ry: 0.5 }, to: { rx: 0.7, ry: 0.5 }, color: '#ef4444', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.7, ry: 0.5 }, to: { rx: 0.7, ry: 0.8 }, color: '#ef4444', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.7, ry: 0.8 }, to: { rx: 0.3, ry: 0.8 }, color: '#ef4444', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.3, ry: 0.8 }, to: { rx: 0.3, ry: 0.5 }, color: '#ef4444', size: 8 },
          { type: 'STROKE_END' },
          // Roof
          { type: 'STROKE_START', rx: 0.25, ry: 0.5, color: '#3b82f6', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.25, ry: 0.5 }, to: { rx: 0.5, ry: 0.3 }, color: '#3b82f6', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.5, ry: 0.3 }, to: { rx: 0.75, ry: 0.5 }, color: '#3b82f6', size: 8 },
          { type: 'STROKE_END' },
          // Door
          { type: 'STROKE_START', rx: 0.45, ry: 0.8, color: '#78350f', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.45, ry: 0.8 }, to: { rx: 0.45, ry: 0.65 }, color: '#78350f', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.45, ry: 0.65 }, to: { rx: 0.55, ry: 0.65 }, color: '#78350f', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.55, ry: 0.65 }, to: { rx: 0.55, ry: 0.8 }, color: '#78350f', size: 8 },
          { type: 'STROKE_END' }
        ],
        // Sun & Mountain
        [
          // Mountain left
          { type: 'STROKE_START', rx: 0.1, ry: 0.75, color: '#22c55e', size: 10 },
          { type: 'STROKE_MOVE', from: { rx: 0.1, ry: 0.75 }, to: { rx: 0.4, ry: 0.4 }, color: '#22c55e', size: 10 },
          { type: 'STROKE_MOVE', from: { rx: 0.4, ry: 0.4 }, to: { rx: 0.7, ry: 0.75 }, color: '#22c55e', size: 10 },
          { type: 'STROKE_END' },
          // Sun
          { type: 'STROKE_START', rx: 0.75, ry: 0.25, color: '#facc15', size: 16 },
          { type: 'STROKE_MOVE', from: { rx: 0.75, ry: 0.25 }, to: { rx: 0.77, ry: 0.25 }, color: '#facc15', size: 16 },
          { type: 'STROKE_END' },
          // Sun rays
          { type: 'STROKE_START', rx: 0.75, ry: 0.15, color: '#facc15', size: 6 },
          { type: 'STROKE_MOVE', from: { rx: 0.75, ry: 0.15 }, to: { rx: 0.75, ry: 0.08 }, color: '#facc15', size: 6 },
          { type: 'STROKE_END' },
          { type: 'STROKE_START', rx: 0.85, ry: 0.25, color: '#facc15', size: 6 },
          { type: 'STROKE_MOVE', from: { rx: 0.85, ry: 0.25 }, to: { rx: 0.92, ry: 0.25 }, color: '#facc15', size: 6 },
          { type: 'STROKE_END' }
        ],
        // Smiley Face
        [
          { type: 'STROKE_START', rx: 0.5, ry: 0.2, color: '#f97316', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.5, ry: 0.2 }, to: { rx: 0.7, ry: 0.35 }, color: '#f97316', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.7, ry: 0.35 }, to: { rx: 0.65, ry: 0.65 }, color: '#f97316', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.65, ry: 0.65 }, to: { rx: 0.35, ry: 0.65 }, color: '#f97316', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.35, ry: 0.65 }, to: { rx: 0.3, ry: 0.35 }, color: '#f97316', size: 8 },
          { type: 'STROKE_MOVE', from: { rx: 0.3, ry: 0.35 }, to: { rx: 0.5, ry: 0.2 }, color: '#f97316', size: 8 },
          { type: 'STROKE_END' },
          // Eyes
          { type: 'STROKE_START', rx: 0.42, ry: 0.4, color: '#1e293b', size: 10 },
          { type: 'STROKE_END' },
          { type: 'STROKE_START', rx: 0.58, ry: 0.4, color: '#1e293b', size: 10 },
          { type: 'STROKE_END' },
          // Smile
          { type: 'STROKE_START', rx: 0.4, ry: 0.52, color: '#1e293b', size: 6 },
          { type: 'STROKE_MOVE', from: { rx: 0.4, ry: 0.52 }, to: { rx: 0.5, ry: 0.58 }, color: '#1e293b', size: 6 },
          { type: 'STROKE_MOVE', from: { rx: 0.5, ry: 0.58 }, to: { rx: 0.6, ry: 0.52 }, color: '#1e293b', size: 6 },
          { type: 'STROKE_END' }
        ]
      ];

      const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];
      let stepIndex = 0;
      this.isCancelled = false;

      this.drawInterval = setInterval(() => {
        if (this.isCancelled || stepIndex >= chosenPattern.length) {
          clearInterval(this.drawInterval);
          this.drawInterval = null;
          return;
        }

        const action = chosenPattern[stepIndex++];
        if (canvasInstance && !this.isCancelled) {
          canvasInstance.applyRemoteAction(action);
        }
        if (typeof onActionCallback === 'function' && !this.isCancelled) {
          onActionCallback(action);
        }
      }, 400);
    }

    /**
     * When bot is guessing, schedule a realistic guess
     */
    scheduleGuess(targetWord, onGuessCallback) {
      this.cancelActions();
      this.isCancelled = false;

      // Bot guesses between 10 to 40 seconds in
      const delayMs = Math.floor(10000 + Math.random() * 25000);

      this.guessTimeout = setTimeout(() => {
        if (this.isCancelled) return;
        if (typeof onGuessCallback === 'function') {
          onGuessCallback(this.id, targetWord);
        }
      }, delayMs);
    }
  }

  function getAvailableBotProfile(existingNames = []) {
    const existing = new Set(existingNames);
    const available = BOT_PROFILES.filter(b => !existing.has(b.name));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    const idx = Math.floor(Math.random() * 100);
    return { name: `بات نقاشباشی ${idx}`, avatar: '🤖' };
  }

  return {
    BOT_PROFILES,
    BotPlayer,
    getAvailableBotProfile
  };
});
