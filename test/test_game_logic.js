const assert = require('assert');
const Game = require('../js/game.js');
const Storage = require('../js/storage.js');

console.log('--- Comprehensive Cyber Defender 256 Game Logic & Engine Tests ---');

// Mock Sound Engine for Headless Node Testing
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

// 1. Math & Collision Detection
console.log('1. Testing Vector Math & Collision Utilities...');
assert.strictEqual(Game.checkCircleCollision({ x: 10, y: 10, radius: 5 }, { x: 15, y: 10, radius: 5 }), true, 'Circles touching/overlapping must collide');
assert.strictEqual(Game.checkCircleCollision({ x: 10, y: 10, radius: 5 }, { x: 30, y: 10, radius: 5 }), false, 'Separated circles must not collide');

const zeroVec = Game.normalizeVector(0, 0);
assert.strictEqual(zeroVec.length, 0);
assert.strictEqual(zeroVec.x, 0);

const unitVec = Game.normalizeVector(3, 4);
assert.strictEqual(unitVec.length, 5);
assert.ok(Math.abs(unitVec.x - 0.6) < 0.001);
assert.ok(Math.abs(unitVec.y - 0.8) < 0.001);
console.log('✓ Vector math & collisions passed!');

// 2. Engine Lifecycle & Initialization
console.log('2. Testing Engine Initialization & Reset...');
const engine = new Game.CyberDefenderEngine({
  width: 960,
  height: 640,
  sound: mockSound
});

assert.strictEqual(engine.gameState, 'ready');
assert.strictEqual(engine.player.stability, 100);
assert.strictEqual(engine.player.collectedBits, 0);
assert.strictEqual(engine.player.targetBits, 256);
assert.strictEqual(engine.player.bombs, 1);

engine.start();
assert.strictEqual(engine.gameState, 'playing');
console.log('✓ Engine initialization & start passed!');

// 3. Movement & Boundary Clamping
console.log('3. Testing Player Movement, Boundaries & Clamping...');
engine.player.x = 100;
engine.player.y = 100;
engine.setMoveInput(1, 0); // Move Right
engine.update(0.1);
assert.ok(engine.player.x > 100, 'Player X must increase when moving right');

// Move far beyond left border
engine.player.x = 5;
engine.setMoveInput(-1, 0);
engine.update(0.5);
assert.ok(engine.player.x >= engine.player.radius, 'Player must not penetrate left screen border');

// Move far beyond right border
engine.player.x = 955;
engine.setMoveInput(1, 0);
engine.update(0.5);
assert.ok(engine.player.x <= engine.width - engine.player.radius, 'Player must not penetrate right screen border');
console.log('✓ Player movement & boundary clamping passed!');

// 4. Dash Mechanics & Invulnerability
console.log('4. Testing Dash Ability & Cooldown...');
engine.player.dashCooldown = 0;
const dashSuccess = engine.triggerDash();
assert.strictEqual(dashSuccess, true, 'Dash should succeed when off cooldown');
assert.strictEqual(engine.player.isDashing, true, 'Player state must be dashing');
assert.ok(engine.player.invulnerableTimer > 0, 'Player must gain invulnerability during dash');
assert.strictEqual(engine.player.dashCooldown, engine.player.dashMaxCooldown, 'Dash cooldown must be triggered');

// Immediate second dash should fail due to cooldown
const secondDash = engine.triggerDash();
assert.strictEqual(secondDash, false, 'Dash should fail while on cooldown');

// Update to expire dash
engine.update(0.3);
assert.strictEqual(engine.player.isDashing, false, 'Dash state must conclude after duration');
console.log('✓ Dash mechanics & cooldown passed!');

// 5. Weapon Firing & Projectiles
console.log('5. Testing Weapon Systems & Bullet Physics...');
engine.bullets = [];
engine.player.x = 400;
engine.player.y = 300;
engine.player.angle = 0; // Facing right
engine.player.fireCooldown = 0;
engine.firePlayerWeapon();

assert.strictEqual(engine.bullets.length, 2, 'Dual blasters must fire 2 bullets');
assert.ok(engine.bullets[0].vx > 0, 'Bullet VX must be positive when facing right');

// Step physics
engine.updateBullets(0.1);
assert.ok(engine.bullets[0].x > 400, 'Bullets must travel forward');
console.log('✓ Weapon systems & bullet physics passed!');

// 6. Enemy Instantiation, Damage & Bit Drops
console.log('6. Testing Enemies (DDoS, Leak, Phishing, Ransomware)...');
const ddos = new Game.DdosBot(450, 300);
assert.strictEqual(ddos.type, 'ddos');
assert.strictEqual(ddos.hp, 20);

// Hit ddos with bullet
ddos.takeDamage(25);
assert.ok(ddos.hp <= 0, 'DDoS bot should have <= 0 HP after lethal hit');

engine.enemies = [ddos];
engine.bits = [];
const initialScore = engine.score;
engine.handleEnemyDeath(ddos);

assert.ok(engine.score > initialScore, 'Score must increase upon enemy elimination');
assert.strictEqual(engine.bugsEliminated, 1, 'Bugs eliminated counter must increment');
assert.ok(engine.bits.length > 0, 'Enemy death must drop binary bits');
assert.ok([1, 2].includes(engine.bits[0].value), 'DDoS should drop 1 or 2 bits');
console.log('✓ Enemy behavior and bit drops passed!');

// 7. Binary Bits Collection & HYPER OVERCLOCK 256
console.log('7. Testing Binary Bits Collection & HYPER OVERCLOCK 256 Activation...');
engine.player.collectedBits = 200;
engine.player.isHyperOverclocked = false;

// Collect bits to reach 256
engine.collectBit(64); // 200 + 64 = 264 >= 256
assert.strictEqual(engine.player.isHyperOverclocked, true, 'Hyper Overclock 256 must activate when bits >= 256');
assert.strictEqual(engine.player.overclockTimer, engine.player.overclockDuration, 'Overclock timer must be set to full duration');
assert.ok(engine.player.invulnerableTimer >= 10, 'Player must be invulnerable during Hyper Overclock');

// Test 360-degree laser barrage during Hyper Overclock
engine.bullets = [];
engine.fireHyperOverclockBarrage();
assert.strictEqual(engine.bullets.length, 8, 'Hyper Overclock must fire 8 radial beams in all directions');

// Test Overclock expiration & reset
engine.player.overclockTimer = 0.05;
engine.updatePlayer(0.1);
assert.strictEqual(engine.player.isHyperOverclocked, false, 'Overclock must deactivate after timer expires');
assert.strictEqual(engine.player.collectedBits, 0, 'Bits counter must reset to 0 after Overclock');
console.log('✓ Binary Bits Collection & HYPER OVERCLOCK 256 verified!');

// 8. Special Powerups: Espresso Coffee, Clean Code Shield, GC Bomb
console.log('8. Testing Special Powerups (Coffee, Shield, Bomb)...');

// Espresso Coffee Boost
engine.applyPowerup('coffee');
assert.ok(engine.player.coffeeBoostTimer > 0, 'Coffee boost timer must be active');

// Clean Code Shield
engine.player.stability = 100;
engine.applyPowerup('shield');
assert.strictEqual(engine.player.shieldActive, true);
assert.strictEqual(engine.player.shieldHits, 3);

// Damage absorbed by shield without losing stability
engine.damagePlayer(25);
assert.strictEqual(engine.player.stability, 100, 'Core stability must remain 100% when shield absorbs hit');
assert.strictEqual(engine.player.shieldHits, 2, 'Shield charges must decrement by 1');

// Garbage Collector Bomb (GC)
engine.player.bombs = 1;
engine.enemyBullets = [{ x: 100, y: 100, vx: 50, vy: 50, radius: 5, life: 3 }];
const dummyEnemy = new Game.DdosBot(200, 200);
engine.enemies = [dummyEnemy];

const bombTriggered = engine.triggerBomb();
assert.strictEqual(bombTriggered, true);
assert.strictEqual(engine.player.bombs, 0);
assert.strictEqual(engine.enemyBullets.length, 0, 'Bomb must wipe all enemy bullets');
console.log('✓ Powerups (Coffee, Shield, GC Bomb) verified!');

// 9. Mega Boss "NullPointer 02:56" & Phases
console.log('9. Testing Mega Boss: NullPointer 02:56...');
const boss = new Game.NullPointerBoss(480, 100);
assert.strictEqual(boss.type, 'boss');
assert.strictEqual(boss.hp, 2560);
assert.strictEqual(boss.phase, 1);

// Phase 2 transition (<70% HP = 1792)
boss.takeDamage(800); // HP: 1760
boss.update(0.1, engine.player, engine);
assert.strictEqual(boss.phase, 2, 'Boss should transition to Phase 2 at <70% HP');

// Phase 3 Enraged transition (<30% HP = 768)
boss.takeDamage(1100); // HP: 660
boss.update(0.1, engine.player, engine);
assert.strictEqual(boss.phase, 3, 'Boss should transition to Phase 3 Enraged at <30% HP');

// Defeat boss
boss.takeDamage(1000);
assert.ok(boss.hp <= 0, 'Boss must be defeated');
engine.boss = boss;
engine.bossDefeated = false;
engine.updateBossLogic(0.1);
assert.strictEqual(engine.bossDefeated, true, 'Boss defeated flag must be true');
console.log('✓ Mega Boss NullPointer 02:56 phases & defeat verified!');

// 10. Combo Multipliers & Scoring
console.log('10. Testing Combo Multiplier System & Scoring...');
engine.enemies = [];
engine.boss = null;
engine.bullets = [];
engine.combo = 1;
engine.comboTimer = 0;

const enemy1 = new Game.DdosBot(100, 100);
engine.handleEnemyDeath(enemy1);
assert.strictEqual(engine.combo, 2, 'First kill should increase combo to 2');
assert.ok(engine.comboTimer > 2.0, 'Combo timer should reset to 2.5s');

const enemy2 = new Game.DdosBot(100, 100);
engine.handleEnemyDeath(enemy2);
assert.strictEqual(engine.combo, 3, 'Subsequent rapid kill should increase combo to 3');

// Timeout combo (disable firing so spawned enemies are not auto-killed)
engine.input.autoFire = false;
engine.input.isFiring = false;
engine.bullets = [];
engine.enemies = [];
engine.update(3.0);
assert.strictEqual(engine.combo, 1, 'Combo must reset to 1 after timeout');
console.log('✓ Combo multiplier system verified!');

console.log('\n🎉 ALL GAME LOGIC & ENGINE TESTS PASSED SUCCESSFULLY! 🎉\n');
