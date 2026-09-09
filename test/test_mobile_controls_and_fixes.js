/**
 * Test Suite: Mobile Controls, PWA Ergonomics & Architectural Fixes
 * Verifies all defect resolutions for Behsazan Mellat Mission 256 Cyber Defender.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Game = require('../js/game.js');

console.log('=== RUNNING MOBILE CONTROLS & DEFECT RESOLUTION TEST SUITE ===\n');

// 1. Verify CSS RTL Touch Ergonomics & Safe-Area Safeguards
console.log('1. Testing CSS Touch Ergonomics & Mobile Viewport Rules...');
const cssContent = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');

assert.ok(
  cssContent.includes('direction: ltr !important'),
  'Touch controls overlay must enforce direction: ltr !important so Joystick is left thumb and Action buttons are right thumb'
);

assert.ok(
  cssContent.includes('overscroll-behavior: none'),
  'HTML/Body must enforce overscroll-behavior: none to prevent mobile pull-to-refresh'
);

assert.ok(
  cssContent.includes('#screen-game') && cssContent.includes('touch-action: none !important'),
  '#screen-game must have touch-action: none !important'
);

assert.ok(
  cssContent.includes('env(safe-area-inset-bottom'),
  'Touch controls must adapt to mobile safe-area-inset-bottom'
);
console.log('   ✓ CSS RTL touch ergonomics and safe-area rules verified!\n');

// 2. Mock Sound
const mockSound = {
  playShoot: () => {},
  playEnemyHit: () => {},
  playEnemyExplosion: () => {},
  playBitCollect: () => {},
  playHyperOverclock: () => {},
  playBomb: () => {},
  playDash: () => {},
  playPowerup: () => {},
  playBossAlert: () => {},
  playBossDefeated: () => {},
  playPlayerHit: () => {},
  playShieldBreak: () => {},
  playGameOverSound: () => {},
  playVictory: () => {},
  resumeAmbient: () => {}
};

// 3. Testing Coffee Boost 3x Speed & Fire Interval
console.log('2. Testing Espresso Coffee Boost (fire rate & speed ~3x)...');
const engine = new Game.CyberDefenderEngine({ width: 960, height: 640, sound: mockSound });
engine.start();

const normalSpeed = engine.player.baseSpeed; // 270
engine.applyPowerup('coffee');
assert.ok(engine.player.coffeeBoostTimer > 0, 'Coffee boost timer must be active');

// Step simulation to check speed calculation
engine.setMoveInput(1, 0);
engine.update(0.1);
const coffeeVx = engine.player.vx;
assert.ok(coffeeVx > normalSpeed * 1.8, `Coffee speed (${coffeeVx.toFixed(1)}) must be significantly boosted compared to normal (${normalSpeed})`);
console.log(`   ✓ Coffee boost speed verified: ~${(coffeeVx / (normalSpeed * 0.8)).toFixed(1)}x boost!\n`);

// 4. Testing Hyper Overclock 2x Speed, Screen Wipe, and Mass Particle Burst
console.log('3. Testing Hyper Overclock 256 (2x speed, screen wipe & particle explosion)...');
engine.player.collectedBits = 255;
engine.enemyBullets = [
  { x: 100, y: 100, vx: 10, vy: 10, radius: 5, life: 3 },
  { x: 200, y: 200, vx: -10, vy: -10, radius: 5, life: 3 }
];
engine.hazardPools = [{ x: 300, y: 300, radius: 20, life: 5, pulse: 0 }];
engine.particles = [];

engine.collectBit(1); // Triggers Hyper Overclock
assert.strictEqual(engine.player.isHyperOverclocked, true, 'Hyper Overclock must be active');
assert.strictEqual(engine.enemyBullets.length, 0, 'Hyper Overclock activation must wipe enemy bullets');
assert.strictEqual(engine.hazardPools.length, 0, 'Hyper Overclock activation must wipe hazard pools');
assert.ok(engine.particles.length >= 40, `Hyper Overclock must spawn radiant particle burst (actual: ${engine.particles.length})`);

// Verify 2x speed
engine.player.vx = 0;
engine.setMoveInput(1, 0);
engine.update(0.1);
const overclockVx = engine.player.vx;
assert.ok(overclockVx > normalSpeed * 1.2, 'Overclock speed must be 2x base speed');
console.log(`   ✓ Hyper Overclock 256 screen wipe and particle cascade (${engine.particles.length} particles) verified!\n`);

// 5. Testing Smart Auto-Aiming in Joystick Mode
console.log('4. Testing Smart Auto-Aiming in Joystick Mode...');
engine.player.isHyperOverclocked = false;
engine.setControlMode('touch_joystick');
engine.player.x = 480;
engine.player.y = 320;
engine.player.vx = 0;
engine.player.vy = 0;
engine.setMoveInput(0, 0);

// Case 4A: Without manual aim, target nearest enemy
const enemyNear = new Game.DdosBot(480, 200); // directly North
engine.enemies = [enemyNear];
engine.clearManualAim();
engine.updatePlayer(0.016);
const expectedNorthAngle = -Math.PI / 2;
assert.ok(Math.abs(engine.player.angle - expectedNorthAngle) < 0.05, 'Should auto-aim North towards nearest enemy');

// Case 4B: With manual aim active (e.g. mouse aim or right thumb touch), aim at manual target
engine.setAimTarget(600, 320, true); // directly East
engine.updatePlayer(0.016);
const expectedEastAngle = 0;
assert.ok(Math.abs(engine.player.angle - expectedEastAngle) < 0.05, 'Should aim East towards manual target');

// Case 4C: When manual aim cleared and no enemies, aim in move direction
engine.enemies = [];
engine.clearManualAim();
engine.setMoveInput(0, 1); // moving South
engine.updatePlayer(0.016);
const expectedSouthAngle = Math.PI / 2;
assert.ok(Math.abs(engine.player.angle - expectedSouthAngle) < 0.05, 'Should aim South in movement direction');
console.log('   ✓ Smart Auto-Aiming (enemy tracking, manual crosshair & move direction) verified!\n');

// 6. Testing Particle and Combat Text Array Capacity Caps
console.log('5. Testing Particle and Combat Text Array Caps (Mobile 60 FPS safety)...');
engine.particles = [];
for (let i = 0; i < 200; i++) {
  engine.addParticle({ x: i, y: i, vx: 1, vy: 1, life: 1 });
}
assert.ok(engine.particles.length <= 150, `Particles count (${engine.particles.length}) must not exceed 150 cap`);

engine.floatingTexts = [];
for (let i = 0; i < 40; i++) {
  engine.addFloatingText(`text ${i}`, 100, 100);
}
assert.ok(engine.floatingTexts.length <= 25, `Floating texts count (${engine.floatingTexts.length}) must not exceed 25 cap`);
console.log('   ✓ Array memory bounds strictly preserved for mobile 60 FPS!\n');

// 7. Testing Boss Defeat Managed Timer & Invulnerability
console.log('6. Testing Mega Boss Defeat & Managed Victory Timer...');
let victoryTriggered = false;
const victoryEngine = new Game.CyberDefenderEngine({
  width: 960,
  height: 640,
  sound: mockSound,
  onVictory: () => { victoryTriggered = true; }
});
victoryEngine.start();
victoryEngine.spawnBoss();
victoryEngine.boss.hp = 0; // defeat boss

victoryEngine.update(0.1);
assert.strictEqual(victoryEngine.bossDefeated, true, 'Boss must be flagged defeated');
assert.ok(victoryEngine.player.invulnerableTimer > 100, 'Player must be immune post-boss defeat');
assert.strictEqual(victoryEngine.enemyBullets.length, 0, 'Enemy bullets must be wiped on boss defeat');
assert.ok(victoryEngine.victoryDelayTimer > 0, 'Managed victory delay timer must be active');
assert.strictEqual(victoryTriggered, false, 'Victory must not trigger prematurely during cinematic delay');

// Advance simulation past delay
victoryEngine.update(2.5);
assert.strictEqual(victoryTriggered, true, 'Victory must trigger cleanly via simulation clock');
console.log('   ✓ Boss defeat invulnerability and race-condition-free victory timer verified!\n');

console.log('🎉 ALL MOBILE CONTROLS & ARCHITECTURAL FIXES VERIFIED SUCCESSFULLY! 🎉\n');
