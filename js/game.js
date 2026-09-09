/**
 * Behsazan Mellat - Mission 256: Cyber Defender 256
 * «سایبر شوتر ۲۵۶: مهار بدافزارها»
 * High-octane, reflexive, 60 FPS HTML5 Canvas Action Arcade Game.
 * Dual Control: Desktop (WASD/Mouse/Space) & Mobile/PWA (Touch Joystick/Action Buttons/Drag).
 * Pure Vanilla JavaScript - Zero external dependencies.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CyberDefenderGame = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // --- Constants & Config ---
  const CANVAS_VIRTUAL_WIDTH = 960;
  const CANVAS_VIRTUAL_HEIGHT = 640;

  const ENEMY_TYPES = {
    DDOS: 'ddos',
    LEAK: 'leak',
    PHISHING: 'phishing',
    RANSOMWARE: 'ransomware',
    BOSS: 'boss'
  };

  const POWERUP_TYPES = {
    COFFEE: 'coffee',
    SHIELD: 'shield',
    BOMB: 'bomb'
  };

  const BINARY_BITS = [1, 2, 4, 8, 16, 32, 64, 128];

  // Helper Math
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function distSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  function checkCircleCollision(c1, c2) {
    const r = c1.radius + c2.radius;
    return distSq(c1.x, c1.y, c2.x, c2.y) <= r * r;
  }

  function normalizeVector(x, y) {
    const len = Math.hypot(x, y);
    if (len === 0) return { x: 0, y: 0, length: 0 };
    return { x: x / len, y: y / len, length: len };
  }

  // --- Game Engine Class ---
  class CyberDefenderEngine {
    constructor(options = {}) {
      this.width = options.width || CANVAS_VIRTUAL_WIDTH;
      this.height = options.height || CANVAS_VIRTUAL_HEIGHT;
      this.sound = options.sound || null;
      this.onGameOver = options.onGameOver || null;
      this.onVictory = options.onVictory || null;
      this.onScoreUpdate = options.onScoreUpdate || null;
      this.onOverclockStateChange = options.onOverclockStateChange || null;

      this.reset();
    }

    reset() {
      this.gameState = 'ready'; // 'ready', 'playing', 'paused', 'gameover', 'victory'
      this.gameTime = 0;
      this.score = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.maxCombo = 1;
      this.wave = 1;
      this.waveTimer = 0;
      this.bugsEliminated = 0;

      // Player State
      this.player = {
        x: this.width / 2,
        y: this.height / 2,
        vx: 0,
        vy: 0,
        radius: 18,
        angle: -Math.PI / 2,
        baseSpeed: 270,
        stability: 100, // Core Health 0-100
        maxStability: 100,
        shieldActive: false,
        shieldHits: 0,
        coffeeBoostTimer: 0,
        dashTimer: 0,
        dashCooldown: 0,
        dashMaxCooldown: 1.5,
        isDashing: false,
        bombs: 1,
        maxBombs: 3,
        collectedBits: 0,
        targetBits: 256,
        isHyperOverclocked: false,
        overclockTimer: 0,
        overclockDuration: 12.0,
        overclockAngle: 0,
        fireCooldown: 0,
        baseFireInterval: 0.13, // ~7.7 shots/sec
        invulnerableTimer: 0
      };

      // Control Inputs
      this.input = {
        moveX: 0,
        moveY: 0,
        aimX: this.width / 2,
        aimY: this.height / 2 - 100,
        hasManualAim: false,
        isFiring: false,
        autoFire: true,
        controlMode: 'touch_joystick' // 'touch_joystick' or 'drag_to_move'
      };

      // Entities
      this.bullets = [];        // Player bullets
      this.enemyBullets = [];   // Enemy projectiles
      this.enemies = [];        // Bugs and malware
      this.bits = [];           // Dropped binary bits
      this.powerups = [];       // Special powerups
      this.particles = [];      // Explosions and sparks
      this.floatingTexts = [];  // Damage & combat popups
      this.hazardPools = [];    // Memory leak puddles

      // Boss
      this.boss = null;
      this.bossSpawned = false;
      this.bossDefeated = false;
      this.victoryDelayTimer = null;

      // Camera / Screen Shake
      this.screenShake = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;

      // Wave Spawner Timing
      this.spawnTimer = 0;
      this.spawnInterval = 1.4;
      this.powerupSpawnTimer = 0;
    }

    start() {
      this.reset();
      this.gameState = 'playing';
      if (this.sound && this.sound.resumeAmbient) {
        this.sound.resumeAmbient();
      }
    }

    pause() {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
      } else if (this.gameState === 'paused') {
        this.gameState = 'playing';
      }
    }

    // --- Input Handlers ---
    setMoveInput(dx, dy) {
      const norm = normalizeVector(dx, dy);
      if (norm.length > 1) {
        this.input.moveX = norm.x;
        this.input.moveY = norm.y;
      } else {
        this.input.moveX = dx;
        this.input.moveY = dy;
      }
    }

    setAimTarget(targetX, targetY, isManual = true) {
      this.input.aimX = targetX;
      this.input.aimY = targetY;
      this.input.hasManualAim = isManual;
    }

    clearManualAim() {
      this.input.hasManualAim = false;
    }

    setFiring(isFiring) {
      this.input.isFiring = !!isFiring;
    }

    toggleAutoFire() {
      this.input.autoFire = !this.input.autoFire;
      return this.input.autoFire;
    }

    setControlMode(mode) {
      this.input.controlMode = mode;
    }

    triggerDash() {
      if (this.player.dashCooldown <= 0 && this.gameState === 'playing') {
        this.player.isDashing = true;
        this.player.dashTimer = 0.22;
        this.player.dashCooldown = this.player.dashMaxCooldown;
        this.player.invulnerableTimer = Math.max(this.player.invulnerableTimer, 0.25);
        this.triggerScreenShake(3);

        if (this.sound && this.sound.playDash) {
          this.sound.playDash();
        }

        // Spawn dash trail particles
        for (let i = 0; i < 8; i++) {
          this.addParticle({
            x: this.player.x + (Math.random() - 0.5) * 10,
            y: this.player.y + (Math.random() - 0.5) * 10,
            vx: -this.player.vx * 0.4 + (Math.random() - 0.5) * 60,
            vy: -this.player.vy * 0.4 + (Math.random() - 0.5) * 60,
            color: '#00f2fe',
            life: 0.25,
            size: 4
          });
        }
        return true;
      }
      return false;
    }

    triggerBomb() {
      if (this.player.bombs > 0 && this.gameState === 'playing') {
        this.player.bombs--;
        this.triggerScreenShake(18);

        if (this.sound && this.sound.playBomb) {
          this.sound.playBomb();
        }

        this.addFloatingText('🔥 پاکسازی GC (GARBAGE COLLECTOR)!', this.player.x, this.player.y - 30, '#f59e0b', 22);

        // Wipe all enemy bullets
        const bulletCount = this.enemyBullets.length;
        this.enemyBullets = [];
        this.hazardPools = [];

        // Wipe standard enemies & deal heavy damage to boss
        const enemiesToKill = [...this.enemies];
        enemiesToKill.forEach(enemy => {
          if (enemy.type === ENEMY_TYPES.BOSS) {
            enemy.takeDamage(650);
            this.addFloatingText('-650 HP', enemy.x, enemy.y - 20, '#ff1a2b', 20);
          } else {
            enemy.takeDamage(9999);
          }
        });

        // Spawn massive shockwave ring of particles
        for (let i = 0; i < 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          const speed = 400 + Math.random() * 200;
          this.addParticle({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? '#00f2fe' : '#e30613',
            life: 0.7,
            size: 6,
            drag: 0.94
          });
        }
        return true;
      }
      return false;
    }

    // --- Core Update Loop (60 FPS with Delta Time) ---
    update(dt) {
      if (this.gameState !== 'playing') return;

      // Sub-step simulation slices to guarantee stable collision physics and accurate timers
      const maxSubStep = 0.05;
      let remaining = Math.min(dt, 5.0);
      while (remaining > 0) {
        const delta = Math.min(remaining, maxSubStep);
        this.stepSimulation(delta);
        remaining -= delta;
      }
    }

    stepSimulation(delta) {
      this.gameTime += delta;
      this.waveTimer += delta;

      // Update Screen Shake
      if (this.screenShake > 0) {
        this.shakeOffsetX = (Math.random() - 0.5) * this.screenShake;
        this.shakeOffsetY = (Math.random() - 0.5) * this.screenShake;
        this.screenShake = Math.max(0, this.screenShake - delta * 25);
      } else {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }

      // Combo Timer update
      if (this.comboTimer > 0) {
        this.comboTimer -= delta;
        if (this.comboTimer <= 0) {
          this.combo = 1;
        }
      }

      // Update Player
      this.updatePlayer(delta);

      // Update Bullets
      this.updateBullets(delta);

      // Update Enemies
      this.updateEnemies(delta);

      // Update Enemy Projectiles & Hazard Pools
      this.updateEnemyBullets(delta);
      this.updateHazardPools(delta);

      // Update Bits & Magnetism
      this.updateBits(delta);

      // Update Powerups
      this.updatePowerups(delta);

      // Update Particles & Floating Combat Texts
      this.updateParticles(delta);
      this.updateFloatingTexts(delta);

      // Spawner & Waves
      this.updateSpawner(delta);

      // Boss Status
      this.updateBossLogic(delta);

      // Check Game Over Condition
      if (this.player.stability <= 0 && this.gameState === 'playing') {
        this.triggerGameOver();
      }
    }

    // --- Player Logic ---
    updatePlayer(dt) {
      const p = this.player;

      // Timers & Cooldowns
      if (p.dashCooldown > 0) p.dashCooldown -= dt;
      if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
      if (p.fireCooldown > 0) p.fireCooldown -= dt;

      if (p.coffeeBoostTimer > 0) {
        p.coffeeBoostTimer -= dt;
        if (p.coffeeBoostTimer <= 0) {
          this.addFloatingText('☕ اثر اسپرسو پایان یافت', p.x, p.y - 25, '#9ca3af', 14);
        }
      }

      // Handle Hyper Overclock 256
      if (p.isHyperOverclocked) {
        p.overclockTimer -= dt;
        p.overclockAngle += dt * 5.5; // Rapid 360-degree laser spinning

        // Golden spark trail
        if (Math.random() < 0.6) {
          this.addParticle({
            x: p.x + (Math.random() - 0.5) * 24,
            y: p.y + (Math.random() - 0.5) * 24,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80,
            color: '#f59e0b',
            life: 0.35,
            size: 3
          });
        }

        // Fire 360-degree radial laser storms during Hyper Overclock!
        if (p.fireCooldown <= 0) {
          this.fireHyperOverclockBarrage();
          p.fireCooldown = 0.09;
        }

        if (p.overclockTimer <= 0) {
          p.isHyperOverclocked = false;
          p.invulnerableTimer = 0;
          p.collectedBits = 0;
          this.addFloatingText('⚡ بازگشت به فرکانس عادی', p.x, p.y - 30, '#9ca3af', 16);
          if (this.onOverclockStateChange) this.onOverclockStateChange(false);
        }
      }

      // Movement Calculations
      let currentSpeed = p.baseSpeed;
      if (p.isHyperOverclocked) currentSpeed *= 2.0; // 2x speed for Hyper Overclock
      if (p.coffeeBoostTimer > 0) currentSpeed *= 2.8; // ~3x speed for Espresso Coffee Boost

      if (p.isDashing) {
        p.dashTimer -= dt;
        currentSpeed *= 3.2;
        if (p.dashTimer <= 0) {
          p.isDashing = false;
        }
      }

      // Drag-to-move touch logic or Joystick input
      let moveDirX = this.input.moveX;
      let moveDirY = this.input.moveY;

      // Smooth acceleration & velocity damping
      const targetVx = moveDirX * currentSpeed;
      const targetVy = moveDirY * currentSpeed;
      const accel = p.isDashing ? 40 : 18;

      p.vx += (targetVx - p.vx) * Math.min(1, dt * accel);
      p.vy += (targetVy - p.vy) * Math.min(1, dt * accel);

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Screen boundary clamping
      p.x = clamp(p.x, p.radius, this.width - p.radius);
      p.y = clamp(p.y, p.radius, this.height - p.radius);

      // Aiming Angle
      if (this.input.controlMode === 'drag_to_move') {
        // In drag-to-move mode, auto-aim at nearest enemy if in range, otherwise face movement
        const nearest = this.findNearestEnemy(p.x, p.y);
        if (nearest) {
          p.angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
        } else if (Math.hypot(p.vx, p.vy) > 10) {
          p.angle = Math.atan2(p.vy, p.vx);
        }
      } else {
        // Touch Joystick / Desktop mode:
        if (this.input.hasManualAim) {
          // Direct aim from mouse or active right-thumb aim touch
          const dx = this.input.aimX - p.x;
          const dy = this.input.aimY - p.y;
          if (Math.hypot(dx, dy) > 8) {
            p.angle = Math.atan2(dy, dx);
          }
        } else {
          // Smart Auto-Aim: Track nearest threat, or face movement
          const nearest = this.findNearestEnemy(p.x, p.y);
          if (nearest) {
            p.angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
          } else if (Math.hypot(this.input.moveX, this.input.moveY) > 0.1) {
            p.angle = Math.atan2(this.input.moveY, this.input.moveX);
          }
        }
      }

      // Firing Weapons
      const shouldFire = (this.input.isFiring || this.input.autoFire) && !p.isHyperOverclocked;
      if (shouldFire && p.fireCooldown <= 0) {
        this.firePlayerWeapon();
        const fireInterval = p.coffeeBoostTimer > 0 ? (p.baseFireInterval * 0.35) : p.baseFireInterval;
        p.fireCooldown = fireInterval;
      }
    }

    firePlayerWeapon() {
      const p = this.player;
      const forwardX = Math.cos(p.angle);
      const forwardY = Math.sin(p.angle);
      const perpX = -forwardY;
      const perpY = forwardX;

      const bulletSpeed = 700;
      const bulletDamage = p.coffeeBoostTimer > 0 ? 32 : 24;

      // Twin plasma blasters offset
      const offsets = [-8, 8];
      offsets.forEach(offset => {
        this.bullets.push({
          x: p.x + forwardX * 14 + perpX * offset,
          y: p.y + forwardY * 14 + perpY * offset,
          vx: forwardX * bulletSpeed,
          vy: forwardY * bulletSpeed,
          radius: 4,
          damage: bulletDamage,
          color: p.coffeeBoostTimer > 0 ? '#f59e0b' : '#00f2fe',
          life: 1.4
        });
      });

      if (this.sound && this.sound.playShoot) {
        this.sound.playShoot();
      }
    }

    fireHyperOverclockBarrage() {
      const p = this.player;
      const numBeams = 8;
      const bulletSpeed = 650;

      for (let i = 0; i < numBeams; i++) {
        const angle = p.overclockAngle + (i * Math.PI * 2) / numBeams;
        this.bullets.push({
          x: p.x + Math.cos(angle) * 16,
          y: p.y + Math.sin(angle) * 16,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          radius: 5,
          damage: 55,
          color: '#facc15',
          life: 1.2,
          isOverclockBeam: true
        });
      }

      if (this.sound && this.sound.playShoot) {
        this.sound.playShoot();
      }
    }

    // --- Bullets & Projectiles ---
    updateBullets(dt) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        // Check bounds or lifetime
        if (b.life <= 0 || b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
          this.bullets.splice(i, 1);
          continue;
        }

        // Check collision against enemies
        let hit = false;
        for (let j = 0; j < this.enemies.length; j++) {
          const enemy = this.enemies[j];
          if (checkCircleCollision(b, enemy)) {
            enemy.takeDamage(b.damage);
            hit = true;

            // Spawn hit sparks
            for (let k = 0; k < 3; k++) {
              this.addParticle({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                color: b.color,
                life: 0.18,
                size: 2
              });
            }

            if (this.sound && this.sound.playEnemyHit) {
              this.sound.playEnemyHit();
            }
            break;
          }
        }

        if (hit) {
          this.bullets.splice(i, 1);
        }
      }
    }

    updateEnemyBullets(dt) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const eb = this.enemyBullets[i];
        eb.x += eb.vx * dt;
        eb.y += eb.vy * dt;
        eb.life -= dt;

        // Check bounds
        if (eb.life <= 0 || eb.x < -20 || eb.x > this.width + 20 || eb.y < -20 || eb.y > this.height + 20) {
          this.enemyBullets.splice(i, 1);
          continue;
        }

        // Check collision with player
        if (checkCircleCollision(eb, this.player)) {
          this.damagePlayer(eb.damage || 12);
          this.enemyBullets.splice(i, 1);
        }
      }
    }

    updateHazardPools(dt) {
      for (let i = this.hazardPools.length - 1; i >= 0; i--) {
        const pool = this.hazardPools[i];
        pool.life -= dt;
        pool.pulse += dt * 4;

        if (pool.life <= 0) {
          this.hazardPools.splice(i, 1);
          continue;
        }

        // Damage player if walking inside puddle
        if (checkCircleCollision(pool, this.player)) {
          this.damagePlayer(15 * dt); // continuous damage
        }
      }
    }

    // --- Enemies Update & AI ---
    updateEnemies(dt) {
      const p = this.player;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(dt, p, this);

        // Check if enemy died
        if (enemy.hp <= 0) {
          this.handleEnemyDeath(enemy);
          this.enemies.splice(i, 1);
          continue;
        }

        // Collision with player
        if (checkCircleCollision(enemy, p)) {
          if (p.isHyperOverclocked) {
            // Player destroys malware on contact during Hyper Overclock!
            enemy.takeDamage(9999);
            this.triggerScreenShake(4);
          } else {
            // Player takes collision damage
            this.damagePlayer(enemy.collisionDamage || 20);
            // Push enemy back
            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            const norm = normalizeVector(dx, dy);
            enemy.x += norm.x * 25;
            enemy.y += norm.y * 25;
          }
        }
      }
    }

    handleEnemyDeath(enemy) {
      this.bugsEliminated++;

      // Update Combo Counter
      this.combo = Math.min(15, this.combo + 1);
      this.comboTimer = 2.5; // 2.5s window to chain kills
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      // Calculate Score
      const earnedScore = enemy.scoreValue * this.combo;
      this.score += earnedScore;
      if (this.onScoreUpdate) {
        this.onScoreUpdate(this.score, this.combo);
      }

      // Combat text
      const comboText = this.combo > 2 ? ` (x${this.combo})` : '';
      this.addFloatingText(`+${earnedScore}${comboText}`, enemy.x, enemy.y - 12, '#00f2fe', 14);

      // Sound
      if (this.sound && this.sound.playEnemyExplosion) {
        this.sound.playEnemyExplosion(enemy.type);
      }

      // Screen shake
      this.triggerScreenShake(enemy.type === ENEMY_TYPES.BOSS ? 20 : (enemy.type === ENEMY_TYPES.RANSOMWARE ? 8 : 4));

      // Particle explosion
      const particleCount = enemy.type === ENEMY_TYPES.BOSS ? 60 : (enemy.type === ENEMY_TYPES.RANSOMWARE ? 24 : 14);
      for (let k = 0; k < particleCount; k++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 200;
        this.addParticle({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: enemy.color,
          life: 0.4 + Math.random() * 0.3,
          size: 3 + Math.random() * 3
        });
      }

      // Drop Binary Power Bits
      this.dropBinaryBits(enemy);

      // Chance to drop powerup
      this.maybeDropPowerup(enemy.x, enemy.y, enemy.type);
    }

    dropBinaryBits(enemy) {
      let bitValues = [1];
      if (enemy.type === ENEMY_TYPES.DDOS) {
        bitValues = Math.random() < 0.4 ? [2] : [1];
      } else if (enemy.type === ENEMY_TYPES.LEAK) {
        bitValues = [2, 4];
      } else if (enemy.type === ENEMY_TYPES.PHISHING) {
        bitValues = [8, 16];
      } else if (enemy.type === ENEMY_TYPES.RANSOMWARE) {
        bitValues = [32, 64];
      } else if (enemy.type === ENEMY_TYPES.BOSS) {
        bitValues = [64, 64, 128, 128];
      }

      bitValues.forEach(val => {
        const offsetAngle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 25;
        this.bits.push({
          x: enemy.x + Math.cos(offsetAngle) * dist,
          y: enemy.y + Math.sin(offsetAngle) * dist,
          vx: Math.cos(offsetAngle) * 50,
          vy: Math.sin(offsetAngle) * 50,
          value: val,
          radius: 11,
          pulse: Math.random() * Math.PI,
          life: 25.0
        });
      });
    }

    maybeDropPowerup(x, y, enemyType) {
      const roll = Math.random();
      let drop = null;

      if (enemyType === ENEMY_TYPES.BOSS) {
        drop = POWERUP_TYPES.BOMB;
      } else if (enemyType === ENEMY_TYPES.RANSOMWARE && roll < 0.45) {
        drop = roll < 0.25 ? POWERUP_TYPES.COFFEE : POWERUP_TYPES.SHIELD;
      } else if (roll < 0.08) {
        drop = roll < 0.04 ? POWERUP_TYPES.COFFEE : (roll < 0.07 ? POWERUP_TYPES.SHIELD : POWERUP_TYPES.BOMB);
      }

      if (drop) {
        this.powerups.push({
          x,
          y,
          type: drop,
          radius: 16,
          pulse: 0,
          life: 18.0
        });
      }
    }

    // --- Bits & Magnetism ---
    updateBits(dt) {
      const p = this.player;
      const magnetRadius = p.isHyperOverclocked ? 260 : 130;
      const magnetRadSq = magnetRadius * magnetRadius;

      for (let i = this.bits.length - 1; i >= 0; i--) {
        const bit = this.bits[i];
        bit.life -= dt;
        bit.pulse += dt * 5;

        // Inertia damping
        bit.vx *= 0.94;
        bit.vy *= 0.94;
        bit.x += bit.vx * dt;
        bit.y += bit.vy * dt;

        // Magnet attraction to player
        const dSq = distSq(bit.x, bit.y, p.x, p.y);
        if (dSq < magnetRadSq) {
          const dx = p.x - bit.x;
          const dy = p.y - bit.y;
          const norm = normalizeVector(dx, dy);
          const pullSpeed = 420;
          bit.vx += norm.x * pullSpeed * dt;
          bit.vy += norm.y * pullSpeed * dt;
        }

        // Collect bit
        if (checkCircleCollision(bit, p)) {
          this.collectBit(bit.value);
          this.bits.splice(i, 1);
          continue;
        }

        if (bit.life <= 0) {
          this.bits.splice(i, 1);
        }
      }
    }

    collectBit(val) {
      const p = this.player;
      p.collectedBits = Math.min(p.targetBits, p.collectedBits + val);
      this.score += val * 10 * this.combo;

      this.addFloatingText(`+${val} BIT`, p.x, p.y - 18, '#f59e0b', 12);

      if (this.sound && this.sound.playBitCollect) {
        this.sound.playBitCollect(val);
      }

      // Check for HYPER OVERCLOCK 256!
      if (p.collectedBits >= p.targetBits && !p.isHyperOverclocked) {
        this.triggerHyperOverclock();
      }
    }

    triggerHyperOverclock() {
      const p = this.player;
      p.isHyperOverclocked = true;
      p.overclockTimer = p.overclockDuration;
      p.invulnerableTimer = p.overclockDuration;
      this.triggerScreenShake(20);

      // Screen-clearing wipe of enemy projectiles & hazard pools
      this.enemyBullets = [];
      this.hazardPools = [];

      if (this.sound && this.sound.playHyperOverclock) {
        this.sound.playHyperOverclock();
      }

      this.addFloatingText('⚡ «HYPER OVERCLOCK 256» فعال شد! ⚡', this.width / 2, this.height / 2 - 60, '#f59e0b', 26);

      // Mass screen-clearing pulse on activate
      this.enemies.forEach(e => {
        if (e.type !== ENEMY_TYPES.BOSS) {
          e.takeDamage(120);
        }
      });

      // Mass screen-clearing golden particle explosions!
      for (let i = 0; i < 54; i++) {
        const angle = (i / 54) * Math.PI * 2;
        const speed = 260 + Math.random() * 260;
        this.addParticle({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: i % 2 === 0 ? '#f59e0b' : '#fef08a',
          life: 0.7,
          size: 5,
          drag: 0.94
        });
      }

      if (this.onOverclockStateChange) {
        this.onOverclockStateChange(true);
      }
    }

    // --- Powerups ---
    updatePowerups(dt) {
      const p = this.player;

      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const item = this.powerups[i];
        item.life -= dt;
        item.pulse += dt * 4;

        if (checkCircleCollision(item, p)) {
          this.applyPowerup(item.type);
          this.powerups.splice(i, 1);
          continue;
        }

        if (item.life <= 0) {
          this.powerups.splice(i, 1);
        }
      }
    }

    applyPowerup(type) {
      const p = this.player;

      if (type === POWERUP_TYPES.COFFEE) {
        p.coffeeBoostTimer = 8.0;
        this.addFloatingText('☕ اسپرسو توربو ۳X سرعت و شلیک!', p.x, p.y - 25, '#f59e0b', 18);
        if (this.sound && this.sound.playPowerup) this.sound.playPowerup('coffee');
      } else if (type === POWERUP_TYPES.SHIELD) {
        p.shieldActive = true;
        p.shieldHits = 3;
        this.addFloatingText('🛡️ سپر امنیتی کلین‌کد فعال شد (۳ ضربه)', p.x, p.y - 25, '#00f2fe', 18);
        if (this.sound && this.sound.playPowerup) this.sound.playPowerup('shield');
      } else if (type === POWERUP_TYPES.BOMB) {
        p.bombs = Math.min(p.maxBombs, p.bombs + 1);
        this.addFloatingText(`💣 بمب GC ذخیره شد (${p.bombs}/${p.maxBombs})`, p.x, p.y - 25, '#ff1a2b', 18);
        if (this.sound && this.sound.playPowerup) this.sound.playPowerup('bomb');
      }
    }

    // --- Damage & Health ---
    damagePlayer(amount) {
      const p = this.player;
      if (p.invulnerableTimer > 0 || p.isHyperOverclocked) return;

      // Clean Code Shield check
      if (p.shieldActive && p.shieldHits > 0) {
        p.shieldHits--;
        p.invulnerableTimer = 0.4;
        this.triggerScreenShake(5);
        this.addFloatingText('🛡️ جذب ضربه توسط فایروال!', p.x, p.y - 20, '#00f2fe', 14);

        if (p.shieldHits <= 0) {
          p.shieldActive = false;
          if (this.sound && this.sound.playShieldBreak) {
            this.sound.playShieldBreak();
          }
          this.addFloatingText('⚠️ سپر شکسته شد!', p.x, p.y - 30, '#ef4444', 15);
        } else if (this.sound && this.sound.playPlayerHit) {
          this.sound.playPlayerHit();
        }
        return;
      }

      // Core damage
      p.stability = Math.max(0, p.stability - amount);
      p.invulnerableTimer = 0.55;
      this.triggerScreenShake(12);

      if (this.sound && this.sound.playPlayerHit) {
        this.sound.playPlayerHit();
      }

      this.addFloatingText(`-${Math.round(amount)}% هسته`, p.x, p.y - 25, '#ff1a2b', 18);
    }

    // --- Waves & Spawner ---
    updateSpawner(dt) {
      if (this.boss && !this.bossDefeated) {
        // Keep minor DDoS harassment during boss wave
        this.spawnTimer += dt;
        if (this.spawnTimer > 4.0) {
          this.spawnTimer = 0;
          this.spawnEnemy(ENEMY_TYPES.DDOS);
        }
        return;
      }

      this.spawnTimer += dt;

      // Adjust difficulty by game time
      const interval = Math.max(0.65, 1.5 - (this.gameTime / 90) * 0.7);

      if (this.spawnTimer >= interval) {
        this.spawnTimer = 0;

        // Wave progression
        if (this.gameTime > 60 && !this.bossSpawned) {
          this.wave = 4;
          this.spawnBoss();
          return;
        } else if (this.gameTime > 35) {
          this.wave = 3;
        } else if (this.gameTime > 15) {
          this.wave = 2;
        }

        // Enemy selection based on wave
        const roll = Math.random();
        if (this.wave === 1) {
          this.spawnEnemy(roll < 0.7 ? ENEMY_TYPES.DDOS : ENEMY_TYPES.LEAK);
        } else if (this.wave === 2) {
          if (roll < 0.45) this.spawnEnemy(ENEMY_TYPES.DDOS);
          else if (roll < 0.8) this.spawnEnemy(ENEMY_TYPES.LEAK);
          else this.spawnEnemy(ENEMY_TYPES.PHISHING);
        } else {
          if (roll < 0.35) this.spawnEnemy(ENEMY_TYPES.DDOS);
          else if (roll < 0.65) this.spawnEnemy(ENEMY_TYPES.LEAK);
          else if (roll < 0.85) this.spawnEnemy(ENEMY_TYPES.PHISHING);
          else this.spawnEnemy(ENEMY_TYPES.RANSOMWARE);
        }
      }
    }

    spawnEnemy(type) {
      // Spawn just outside canvas boundaries
      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let x, y;

      if (edge === 0) {
        x = Math.random() * this.width;
        y = -25;
      } else if (edge === 1) {
        x = this.width + 25;
        y = Math.random() * this.height;
      } else if (edge === 2) {
        x = Math.random() * this.width;
        y = this.height + 25;
      } else {
        x = -25;
        y = Math.random() * this.height;
      }

      let enemy = null;
      if (type === ENEMY_TYPES.DDOS) {
        enemy = new DdosBot(x, y);
      } else if (type === ENEMY_TYPES.LEAK) {
        enemy = new MemoryLeakSlime(x, y);
      } else if (type === ENEMY_TYPES.PHISHING) {
        enemy = new PhishingSerpent(x, y);
      } else if (type === ENEMY_TYPES.RANSOMWARE) {
        enemy = new RansomwareBrute(x, y);
      }

      if (enemy) {
        this.enemies.push(enemy);
      }
    }

    spawnBoss() {
      this.bossSpawned = true;
      this.boss = new NullPointerBoss(this.width / 2, -60);
      this.enemies.push(this.boss);

      if (this.sound && this.sound.playBossAlert) {
        this.sound.playBossAlert();
      }

      this.triggerScreenShake(15);
      this.addFloatingText('🚨 اخطار: اَبَرباگ NULLPOINTER 02:56 وارد شد! 🚨', this.width / 2, 80, '#ff1a2b', 22);
    }

    updateBossLogic(dt) {
      if (this.boss && this.boss.hp <= 0 && !this.bossDefeated) {
        this.bossDefeated = true;
        this.score += 5000;
        this.player.invulnerableTimer = 999; // Guarantee player immunity post-boss defeat
        this.enemyBullets = [];
        this.hazardPools = [];

        if (this.sound && this.sound.playBossDefeated) {
          this.sound.playBossDefeated();
        }

        this.triggerScreenShake(25);
        this.addFloatingText('🏆 بحران مهار شد! مأموریت ۲۵۶ پیروز شدید!', this.width / 2, this.height / 2, '#f59e0b', 28);
        this.victoryDelayTimer = 2.0;
      }

      if (this.bossDefeated && this.victoryDelayTimer !== null) {
        this.victoryDelayTimer -= dt;
        if (this.victoryDelayTimer <= 0 && this.gameState === 'playing') {
          this.victoryDelayTimer = null;
          this.triggerVictory();
        }
      }
    }

    // --- Win / Loss States ---
    triggerGameOver() {
      this.gameState = 'gameover';
      if (this.sound && this.sound.playGameOverSound) {
        this.sound.playGameOverSound();
      }
      if (this.onGameOver) {
        this.onGameOver(this.getFinalStats());
      }
    }

    triggerVictory() {
      this.gameState = 'victory';
      if (this.sound && this.sound.playVictory) {
        this.sound.playVictory();
      }
      if (this.onVictory) {
        this.onVictory(this.getFinalStats());
      }
    }

    getFinalStats() {
      return {
        score: this.score,
        timeSeconds: Math.round(this.gameTime),
        stability: Math.round(this.player.stability),
        maxCombo: this.maxCombo,
        bugsEliminated: this.bugsEliminated,
        bossDefeated: this.bossDefeated
      };
    }

    // --- Helpers ---
    findNearestEnemy(x, y) {
      let nearest = null;
      let minDSq = Infinity;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const d = distSq(x, y, e.x, e.y);
        if (d < minDSq) {
          minDSq = d;
          nearest = e;
        }
      }
      return nearest;
    }

    triggerScreenShake(amount) {
      this.screenShake = Math.min(30, this.screenShake + amount);
    }

    addParticle(config) {
      if (this.particles.length >= 150) {
        this.particles.shift();
      }
      this.particles.push(new Particle(config));
    }

    addFloatingText(text, x, y, color = '#f3f4f6', size = 16) {
      if (this.floatingTexts.length >= 25) {
        this.floatingTexts.shift();
      }
      this.floatingTexts.push({
        text,
        x,
        y,
        color,
        size,
        life: 1.1,
        maxLife: 1.1,
        vy: -35
      });
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update(dt);
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    updateFloatingTexts(dt) {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy * dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    // --- Rendering ---
    render(ctx) {
      ctx.save();

      // Screen shake translation
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

      // 1. Draw Background Cyber Grid Arena
      this.renderBackground(ctx);

      // 2. Draw Hazard Pools
      this.renderHazardPools(ctx);

      // 3. Draw Dropped Bits & Powerups
      this.renderBitsAndPowerups(ctx);

      // 4. Draw Enemies & Boss
      this.renderEnemies(ctx);

      // 5. Draw Player Drone
      this.renderPlayer(ctx);

      // 6. Draw Bullets & Beams
      this.renderBullets(ctx);

      // 7. Draw Particles
      this.renderParticles(ctx);

      // 8. Draw Floating Combat Text
      this.renderFloatingTexts(ctx);

      ctx.restore();
    }

    renderBackground(ctx) {
      // Dark cyber metallic background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, this.width, this.height);

      // Cyber Grid Lines
      ctx.strokeStyle = this.player.isHyperOverclocked ? 'rgba(245, 158, 11, 0.16)' : 'rgba(0, 242, 254, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 40;

      ctx.beginPath();
      for (let x = 0; x < this.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
      }
      for (let y = 0; y < this.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
      }
      ctx.stroke();

      // Central Datacenter Core Ring
      ctx.save();
      ctx.translate(this.width / 2, this.height / 2);
      ctx.strokeStyle = this.player.isHyperOverclocked ? 'rgba(245, 158, 11, 0.25)' : 'rgba(227, 6, 19, 0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 180, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Golden Matrix Vignette during Hyper Overclock
      if (this.player.isHyperOverclocked) {
        const grad = ctx.createRadialGradient(
          this.player.x, this.player.y, 100,
          this.player.x, this.player.y, this.width * 0.7
        );
        grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    renderPlayer(ctx) {
      const p = this.player;

      ctx.save();
      ctx.translate(p.x, p.y);

      // Golden Overclock Aura / Ring
      if (p.isHyperOverclocked) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 12 + Math.sin(p.overclockAngle * 2) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Shield Firewall Aura
      if (p.shieldActive) {
        ctx.save();
        ctx.rotate(this.gameTime * 2);
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 14;

        // Draw rotating hexagon shield
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const hx = Math.cos(a) * (p.radius + 10);
          const hy = Math.sin(a) * (p.radius + 10);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Rotate drone to facing angle
      ctx.rotate(p.angle);

      // Drone Thruster Plume
      const thrusterLen = (Math.hypot(p.vx, p.vy) > 10 || p.isDashing) ? (p.isDashing ? 28 : 16) : 6;
      ctx.fillStyle = p.isHyperOverclocked ? '#f59e0b' : (p.coffeeBoostTimer > 0 ? '#ea580c' : '#00f2fe');
      ctx.beginPath();
      ctx.moveTo(-p.radius, -5);
      ctx.lineTo(-p.radius - thrusterLen, 0);
      ctx.lineTo(-p.radius, 5);
      ctx.closePath();
      ctx.fill();

      // Main Combat Chassis (Behsazan Red / Chrome)
      ctx.fillStyle = p.isHyperOverclocked ? '#fef08a' : '#1e293b';
      ctx.strokeStyle = p.isHyperOverclocked ? '#f59e0b' : '#e30613';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(p.radius + 4, 0);
      ctx.lineTo(-p.radius + 4, p.radius);
      ctx.lineTo(-p.radius + 8, 0);
      ctx.lineTo(-p.radius + 4, -p.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Cyber Core
      ctx.fillStyle = p.isHyperOverclocked ? '#f59e0b' : '#e30613';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Behsazan 4-square mini emblem in core
      ctx.fillStyle = '#ffffff';
      const sz = 2.2;
      ctx.fillRect(-sz - 1, -sz - 1, sz, sz);
      ctx.fillRect(1, -sz - 1, sz, sz);
      ctx.fillRect(1, 1, sz, sz);
      ctx.fillRect(-sz - 1, 1, sz, sz);

      ctx.restore();
    }

    renderEnemies(ctx) {
      for (let i = 0; i < this.enemies.length; i++) {
        this.enemies[i].render(ctx, this);
      }
    }

    renderBullets(ctx) {
      for (let i = 0; i < this.bullets.length; i++) {
        const b = this.bullets[i];
        if (b.isOverclockBeam) {
          ctx.save();
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = 0; i < this.enemyBullets.length; i++) {
        const eb = this.enemyBullets[i];
        ctx.fillStyle = eb.color || '#ef4444';
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius || 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fee2e2';
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, (eb.radius || 5) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    renderBitsAndPowerups(ctx) {
      // Draw Binary Bits
      for (let i = 0; i < this.bits.length; i++) {
        const b = this.bits[i];
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.pulse);

        // Glowing rotating chip
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;

        const sz = b.radius;
        ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
        ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);

        // Bit value number
        ctx.rotate(-b.pulse);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px Vazirmatn, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.value.toString(), 0, 1);

        ctx.restore();
      }

      // Draw Powerups
      for (let i = 0; i < this.powerups.length; i++) {
        const pw = this.powerups[i];
        ctx.save();
        ctx.translate(pw.x, pw.y);

        const bob = Math.sin(pw.pulse) * 3;
        ctx.translate(0, bob);

        let icon = '☕';
        let color = '#f59e0b';
        if (pw.type === POWERUP_TYPES.SHIELD) {
          icon = '🛡️';
          color = '#00f2fe';
        } else if (pw.type === POWERUP_TYPES.BOMB) {
          icon = '💣';
          color = '#ef4444';
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, pw.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 1);

        ctx.restore();
      }
    }

    renderHazardPools(ctx) {
      for (let i = 0; i < this.hazardPools.length; i++) {
        const pool = this.hazardPools[i];
        ctx.save();
        ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.5;

        const pulseR = pool.radius + Math.sin(pool.pulse) * 2;
        ctx.beginPath();
        ctx.arc(pool.x, pool.y, pulseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }

    renderParticles(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].render(ctx);
      }
    }

    renderFloatingTexts(ctx) {
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px Vazirmatn, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }
  }

  // --- Particle Class ---
  class Particle {
    constructor(config) {
      this.x = config.x || 0;
      this.y = config.y || 0;
      this.vx = config.vx || 0;
      this.vy = config.vy || 0;
      this.color = config.color || '#fff';
      this.size = config.size || 3;
      this.life = config.life || 0.5;
      this.maxLife = this.life;
      this.drag = config.drag || 0.98;
    }

    update(dt) {
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
    }

    render(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // ENEMY CLASSES
  // =========================================================================

  // 1. DDoS Bot: Fast swarmers hunting the player
  class DdosBot {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.type = ENEMY_TYPES.DDOS;
      this.hp = 20;
      this.maxHp = 20;
      this.speed = 175;
      this.radius = 13;
      this.color = '#ef4444';
      this.scoreValue = 50;
      this.collisionDamage = 14;
      this.angle = 0;
    }

    takeDamage(amount) {
      this.hp -= amount;
    }

    update(dt, player, engine) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const norm = normalizeVector(dx, dy);
      this.angle = Math.atan2(dy, dx);

      this.x += norm.x * this.speed * dt;
      this.y += norm.y * this.speed * dt;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Fast triangle drone
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(-this.radius, this.radius * 0.75);
      ctx.lineTo(-this.radius * 0.5, 0);
      ctx.lineTo(-this.radius, -this.radius * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye / core
      ctx.fillStyle = '#ff1a2b';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 2. Memory Leak Slime: Expanding pulsing blob, leaves hazard puddle on death
  class MemoryLeakSlime {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.type = ENEMY_TYPES.LEAK;
      this.hp = 50;
      this.maxHp = 50;
      this.speed = 95;
      this.radius = 17;
      this.color = '#c084fc';
      this.scoreValue = 120;
      this.collisionDamage = 18;
      this.pulse = Math.random() * Math.PI;
    }

    takeDamage(amount) {
      this.hp -= amount;
      this.pulse += 1.5;
    }

    update(dt, player, engine) {
      this.pulse += dt * 4;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const norm = normalizeVector(dx, dy);

      this.x += norm.x * this.speed * dt;
      this.y += norm.y * this.speed * dt;

      // Leave memory leak hazard puddle on death
      if (this.hp <= 0) {
        engine.hazardPools.push({
          x: this.x,
          y: this.y,
          radius: 26,
          life: 6.0,
          pulse: 0
        });
      }
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const r = this.radius + Math.sin(this.pulse) * 3;
      ctx.fillStyle = '#581c87';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Slime glyph
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0xLEAK', 0, 1);

      ctx.restore();
    }
  }

  // 3. Phishing Serpent: Undulating snake that fires deception darts
  class PhishingSerpent {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.type = ENEMY_TYPES.PHISHING;
      this.hp = 90;
      this.maxHp = 90;
      this.speed = 120;
      this.radius = 18;
      this.color = '#10b981';
      this.scoreValue = 250;
      this.collisionDamage = 22;
      this.shootCooldown = 2.0;
      this.waveTime = Math.random() * Math.PI;
    }

    takeDamage(amount) {
      this.hp -= amount;
    }

    update(dt, player, engine) {
      this.waveTime += dt * 5;
      this.shootCooldown -= dt;

      const toX = player.x - this.x;
      const toY = player.y - this.y;
      const norm = normalizeVector(toX, toY);

      // Sinusoidal wavy motion perpendicular to movement direction
      const perpX = -norm.y;
      const perpY = norm.x;
      const waveOffset = Math.sin(this.waveTime) * 80;

      this.x += (norm.x * this.speed + perpX * waveOffset) * dt;
      this.y += (norm.y * this.speed + perpY * waveOffset) * dt;

      // Shoot deceptive hooked dart
      if (this.shootCooldown <= 0) {
        this.shootCooldown = 2.2 + Math.random() * 0.8;
        engine.enemyBullets.push({
          x: this.x,
          y: this.y,
          vx: norm.x * 240,
          vy: norm.y * 240,
          radius: 5,
          damage: 15,
          color: '#10b981',
          life: 4.0
        });
      }
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      ctx.fillStyle = '#064e3b';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;

      // Diamond dragon head
      ctx.beginPath();
      ctx.moveTo(this.radius + 2, 0);
      ctx.lineTo(0, this.radius - 2);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hook glyph
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎣', 0, 1);

      ctx.restore();
    }
  }

  // 4. Ransomware Brute: Heavy armored tank with lock symbol
  class RansomwareBrute {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.type = ENEMY_TYPES.RANSOMWARE;
      this.hp = 220;
      this.maxHp = 220;
      this.speed = 70;
      this.radius = 24;
      this.color = '#dc2626';
      this.scoreValue = 600;
      this.collisionDamage = 35;
      this.shootTimer = 2.8;
    }

    takeDamage(amount) {
      this.hp -= amount;
    }

    update(dt, player, engine) {
      this.shootTimer -= dt;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const norm = normalizeVector(dx, dy);

      this.x += norm.x * this.speed * dt;
      this.y += norm.y * this.speed * dt;

      // Shoot heavy homing lock bolts
      if (this.shootTimer <= 0) {
        this.shootTimer = 2.8;
        engine.enemyBullets.push({
          x: this.x,
          y: this.y,
          vx: norm.x * 200,
          vy: norm.y * 200,
          radius: 7,
          damage: 24,
          color: '#ef4444',
          life: 4.5
        });
      }
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Heavy armored square chassis
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;

      const s = this.radius;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeRect(-s, -s, s * 2, s * 2);

      // Lock glyph
      ctx.fillStyle = '#fca5a5';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', 0, 1);

      // Mini Health Bar above brute
      if (this.hp < this.maxHp) {
        const barW = 36;
        const barH = 4;
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-barW / 2, -s - 10, barW, barH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-barW / 2, -s - 10, barW * pct, barH);
      }

      ctx.restore();
    }
  }

  // 5. Mega Boss: "NullPointer 02:56"
  class NullPointerBoss {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.type = ENEMY_TYPES.BOSS;
      this.hp = 2560;
      this.maxHp = 2560;
      this.speed = 50;
      this.radius = 46;
      this.color = '#ef4444';
      this.scoreValue = 5000;
      this.collisionDamage = 45;

      this.phase = 1; // 1, 2, 3
      this.attackTimer = 0;
      this.spiralAngle = 0;
      this.rotation = 0;
      this.targetY = 140; // Moves into arena from top
    }

    takeDamage(amount) {
      this.hp -= amount;
    }

    update(dt, player, engine) {
      this.rotation += dt * 1.5;
      this.attackTimer += dt;

      // Determine Phase by HP
      const hpPct = this.hp / this.maxHp;
      if (hpPct <= 0.3) {
        this.phase = 3; // Enraged!
      } else if (hpPct <= 0.7) {
        this.phase = 2;
      } else {
        this.phase = 1;
      }

      // Enter arena smoothly
      if (this.y < this.targetY) {
        this.y += 80 * dt;
        return;
      }

      // Movement: slow sway across top center
      this.x += Math.sin(engine.gameTime * 0.8) * 45 * dt;

      // Bullet Hell Attack Patterns
      if (this.phase === 1) {
        // Phase 1: Radial ring bursts
        if (this.attackTimer >= 1.6) {
          this.attackTimer = 0;
          this.fireRadialRing(engine, 12, 190);
        }
      } else if (this.phase === 2) {
        // Phase 2: Frantic spiral storms
        this.spiralAngle += dt * 4.2;
        if (this.attackTimer >= 0.2) {
          this.attackTimer = 0;
          this.fireSpiralBolt(engine, this.spiralAngle, 210);
          this.fireSpiralBolt(engine, this.spiralAngle + Math.PI, 210);
        }
      } else if (this.phase === 3) {
        // Phase 3 (Enraged): Hyper double spiral + targeted sniper cannons
        this.spiralAngle += dt * 6.0;
        if (this.attackTimer >= 0.12) {
          this.attackTimer = 0;
          this.fireSpiralBolt(engine, this.spiralAngle, 240);
          this.fireSpiralBolt(engine, this.spiralAngle + Math.PI * 0.66, 240);
          this.fireSpiralBolt(engine, this.spiralAngle + Math.PI * 1.33, 240);
        }
      }
    }

    fireRadialRing(engine, count, speed) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        engine.enemyBullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: 5,
          damage: 16,
          color: '#f87171',
          life: 4.5
        });
      }
    }

    fireSpiralBolt(engine, angle, speed) {
      engine.enemyBullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6,
        damage: 18,
        color: this.phase === 3 ? '#fbbf24' : '#ef4444',
        life: 4.0
      });
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Outer command ring
      ctx.rotate(this.rotation);
      ctx.strokeStyle = this.phase === 3 ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 16;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      // 4 rotating mechanical claws
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(Math.cos(a) * (this.radius - 8) - 6, Math.sin(a) * (this.radius - 8) - 6, 12, 12);
      }

      ctx.rotate(-this.rotation * 2);
      // Inner pulsating core
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 12, 0, Math.PI * 2);
      ctx.fill();

      // Center title text
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0x000256', 0, -4);
      ctx.fillText('NULL_PTR', 0, 8);

      ctx.restore();
    }
  }

  return {
    CyberDefenderEngine,
    DdosBot,
    MemoryLeakSlime,
    PhishingSerpent,
    RansomwareBrute,
    NullPointerBoss,
    ENEMY_TYPES,
    POWERUP_TYPES,
    BINARY_BITS,
    checkCircleCollision,
    normalizeVector
  };
});
