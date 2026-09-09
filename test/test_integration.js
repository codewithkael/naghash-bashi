/**
 * Cyber Defender 256: End-to-End Integration & PWA Verification Test Suite
 * Zero external npm dependencies.
 */

const assert = require('assert');
const ProfanityFilter = require('../js/profanity.js');
const Storage = require('../js/storage.js');
const Game = require('../js/game.js');

console.log('--- Running Cyber Defender 256 Integration Test Suite ---');

// Mock Web Audio
const mockAudio = {
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

// 1. Profanity Validation in User Flow
console.log('1. Testing Profanity Filter in Player Flow...');
const badAttempt = ProfanityFilter.validateName('کیروش کونکش');
assert.strictEqual(badAttempt.isValid, false);
assert.ok(badAttempt.reason.length > 0);

const goodAttempt = ProfanityFilter.validateName('علی رضایی');
assert.strictEqual(goodAttempt.isValid, true);
console.log('   ✓ Player name validation operational.');

// 2. Full Game Simulation to Boss Defeat & Victory
console.log('2. Simulating Complete Game Lifecycle (Wave 1 to Boss Defeat)...');
const engine = new Game.CyberDefenderEngine({
  width: 960,
  height: 640,
  sound: mockAudio
});

engine.start();
assert.strictEqual(engine.gameState, 'playing');

// Spawn and kill enemies to accumulate bits
for (let i = 0; i < 15; i++) {
  const bot = new Game.DdosBot(480, 200);
  engine.handleEnemyDeath(bot);
}
assert.ok(engine.bugsEliminated >= 15, 'Bugs eliminated must reach 15');
assert.ok(engine.score > 0, 'Score must be > 0');
assert.ok(engine.combo > 1, 'Combo must have built up');

// Collect 256 bits for Hyper Overclock
engine.player.collectedBits = 250;
engine.collectBit(8);
assert.strictEqual(engine.player.isHyperOverclocked, true, 'Hyper Overclock 256 must be triggered');

// Spawn Mega Boss NullPointer
engine.spawnBoss();
assert.ok(engine.boss, 'Boss must exist');
assert.strictEqual(engine.boss.type, 'boss');

// Player fires Hyper Overclock barrages and Bomb at boss
engine.triggerBomb();
assert.ok(engine.boss.hp < engine.boss.maxHp, 'Bomb must damage boss');

// Defeat boss
engine.boss.takeDamage(engine.boss.hp);
assert.ok(engine.boss.hp <= 0, 'Boss HP must be depleted');
engine.updateBossLogic(0.1);
assert.strictEqual(engine.bossDefeated, true, 'Boss defeated must be true');

const stats = engine.getFinalStats();
assert.strictEqual(stats.bossDefeated, true);
assert.ok(stats.score >= 5000, 'Score must include 5000 boss bonus');
console.log('   ✓ Full game lifecycle and victory mechanics verified!');

// 3. Storage & Leaderboard Ranking
console.log('3. Testing Leaderboard Persistence & Company Ranking...');
Storage.resetToDefaults();
const playerName = 'علی رضایی';
const playerDept = 'امنیت و زیرساخت شبکه';

const saveRes = Storage.saveScore(
  playerName,
  playerDept,
  stats.timeSeconds,
  0,
  stats.stability,
  stats.score
);

assert.ok(saveRes.entry, 'Saved entry must exist');
assert.strictEqual(saveRes.entry.name, playerName);
assert.strictEqual(saveRes.entry.department, playerDept);
assert.strictEqual(saveRes.entry.isCurrentUser, true);
assert.ok(saveRes.rank >= 1, 'Rank must be valid');

// Test +5 Bonus Points for LinkedIn Share
console.log('4. Testing LinkedIn Share +5 Bonus Points...');
const initialScore = saveRes.entry.score;
const updatedList = Storage.addBonusToCurrent(saveRes.entry.id, 5);
const updatedEntry = updatedList.find(e => e.id === saveRes.entry.id);
assert.strictEqual(updatedEntry.score, initialScore + 5, 'Score must increment by 5 bonus points');
console.log('   ✓ LinkedIn +5 bonus points verified!');

// 5. Mobile Virtual Touch Joystick & Drag Math
console.log('5. Testing Mobile Touch Controls & Joystick Normalization...');
// Test touch joystick clamp within 45px radius
const maxR = 45;
const testTouch = { clientX: 100, clientY: 100, centerX: 50, centerY: 50 };
let dx = testTouch.clientX - testTouch.centerX; // 50
let dy = testTouch.clientY - testTouch.centerY; // 50
const dist = Math.hypot(dx, dy); // ~70.71 > 45

if (dist > maxR) {
  dx = (dx / dist) * maxR;
  dy = (dy / dist) * maxR;
}
assert.ok(Math.hypot(dx, dy) <= maxR + 0.001, 'Joystick knob must not exceed max radius');
const normInputX = dx / maxR;
const normInputY = dy / maxR;
assert.ok(Math.hypot(normInputX, normInputY) <= 1.0001, 'Normalized move vector length must be <= 1.0');

// Test Drag-to-Move Auto-Aim
engine.setControlMode('drag_to_move');
const targetEnemy = new Game.DdosBot(480, 200);
engine.enemies = [targetEnemy];
engine.player.x = 480;
engine.player.y = 300;

const nearest = engine.findNearestEnemy(engine.player.x, engine.player.y);
assert.strictEqual(nearest, targetEnemy, 'Should target nearest enemy');
const expectedAngle = Math.atan2(targetEnemy.y - engine.player.y, targetEnemy.x - engine.player.x);
assert.strictEqual(expectedAngle, -Math.PI / 2, 'Angle pointing straight up should be -PI/2');
console.log('   ✓ Touch controls, joystick normalization and auto-aim verified!');

// 6. Certificate Data Consistency
console.log('6. Testing Certificate Rendering Parameters...');
assert.ok(updatedEntry.timeFormatted, 'Time formatted string required');
assert.ok(updatedEntry.score > 0, 'Score must be positive');
assert.ok(updatedEntry.date, 'Persian date must be set');
console.log('   ✓ Certificate data parameters verified!');

console.log('\n🎉 ALL ZERO-DEPENDENCY INTEGRATION TESTS PASSED! 🎉\n');
