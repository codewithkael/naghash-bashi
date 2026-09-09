/**
 * Behsazan 256 - High-Performance Confetti & Particle Celebration Engine
 */

const ConfettiEngine = (function () {
  let canvas = null;
  let ctx = null;
  let animationId = null;
  let particles = [];
  let isRunning = false;

  const COLORS = [
    '#e30613', // Behsazan Mellat Red
    '#ff4d4d',
    '#ffcc00', // Gold
    '#00ffcc', // Cyan
    '#ffffff',
    '#ff9900',
    '#39ff14'  // Emerald Green
  ];

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5,
      size: Math.random() * 9 + 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 3,
      opacity: 1,
      shape: Math.random() > 0.4 ? 'rect' : 'circle'
    };
  }

  function init() {
    canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  function loop() {
    if (!isRunning || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Reset when falling out of view
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });

    animationId = requestAnimationFrame(loop);
  }

  function start(count = 150, durationMs = 6000) {
    if (!canvas) init();
    if (!canvas) return;

    resizeCanvas();
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }

    isRunning = true;
    if (animationId) cancelAnimationFrame(animationId);
    loop();

    if (durationMs > 0) {
      setTimeout(() => {
        stop();
      }, durationMs);
    }
  }

  function stop() {
    isRunning = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return {
    init,
    start,
    stop
  };
})();

if (typeof module !== 'undefined') {
  module.exports = ConfettiEngine;
}
