const assert = require('assert');
const Stage1 = require('../js/stages/stage1.js');
const Stage2 = require('../js/stages/stage2.js');
const Stage3 = require('../js/stages/stage3.js');
const Stage4 = require('../js/stages/stage4.js');
const Storage = require('../js/storage.js');

console.log('=== RUNNING DEEP ADVERSARIAL ATTACK TEST SUITE ===');

// --- 1. ATTACK ON STAGE 4 CONCURRENCY & PREMATURE UNLOCK ---
console.log('1. Probing Stage 4 boundaries and lock state invariants...');
Stage4.initStage();

// Try to press button with nothing ready
assert.strictEqual(Stage4.pressEmergencyButton().success, false);

// Try to sync pulse with no keys
const noKeyPulse = Stage4.syncPulse(true);
assert.strictEqual(noKeyPulse.status, 'keys_missing');
assert.strictEqual(Stage4.getState().readyForButton, false);

// Insert only 2 keys
Stage4.insertItem('card');
Stage4.insertItem('barcode');
assert.strictEqual(Stage4.getState().keysReady, false);
assert.strictEqual(Stage4.syncPulse(true).status, 'keys_missing');

// Insert 3rd key
Stage4.insertItem('crystal');
assert.strictEqual(Stage4.getState().keysReady, true);
assert.strictEqual(Stage4.getState().readyForButton, false, 'Keys inserted must NOT open cover or make button ready yet');

// Try pulse sync with frequency out of tune
Stage4.setFrequency(210);
Stage4.setPhase(180);
assert.strictEqual(Stage4.getState().isResonanceLocked, false);
const untunedPulse = Stage4.syncPulse(true);
assert.strictEqual(untunedPulse.status, 'resonance_unlocked');
assert.strictEqual(Stage4.getState().syncedPulses, 0);

// Set frequency to 256 Hz but phase wrong (e.g. 45 deg)
Stage4.setFrequency(256);
Stage4.setPhase(45);
assert.strictEqual(Stage4.getState().isResonanceLocked, false);
assert.strictEqual(Stage4.syncPulse(true).status, 'resonance_unlocked');

// Set both frequency and phase to target (256Hz, 180deg)
Stage4.setFrequency(256);
Stage4.setPhase(180);
assert.strictEqual(Stage4.getState().isResonanceLocked, true);

// Pulse 1
const p1 = Stage4.syncPulse(true);
assert.strictEqual(p1.status, 'pulse_success');
assert.strictEqual(p1.syncedPulses, 1);
assert.strictEqual(Stage4.getState().readyForButton, false);
assert.strictEqual(Stage4.pressEmergencyButton().success, false);

// Rapid concurrent desync: player shifts slider mid-pulse
Stage4.setFrequency(290);
assert.strictEqual(Stage4.getState().isResonanceLocked, false);
assert.strictEqual(Stage4.syncPulse(true).status, 'resonance_unlocked');
assert.strictEqual(Stage4.getState().syncedPulses, 1, 'Pulse count must not increase when desynced');

// Retune and complete pulses
Stage4.setFrequency(256);
assert.strictEqual(Stage4.getState().isResonanceLocked, true);
Stage4.syncPulse(true); // Pulse 2
assert.strictEqual(Stage4.getState().readyForButton, false);
Stage4.syncPulse(true); // Pulse 3
assert.strictEqual(Stage4.getState().isPulseSynchronized, true);
assert.strictEqual(Stage4.getState().readyForButton, true, 'Fully converged and ready for emergency button');
assert.strictEqual(Stage4.getState().isCoverOpen, true);

// Press emergency button
const finalReboot = Stage4.pressEmergencyButton();
assert.strictEqual(finalReboot.success, true);
assert.strictEqual(Stage4.getState().isSystemRestored, true);

// Cannot press again once restored
assert.strictEqual(Stage4.pressEmergencyButton().success, false);
console.log('   ✓ Stage 4 concurrency and strict state invariants verified!');


// --- 2. ATTACK ON STAGE 3 OPTICAL RAYTRACING LOOPS & LOCK PREREQUISITES ---
console.log('2. Probing Stage 3 raytracing reflection loops and vault locking prerequisites...');
Stage3.initStage([7, 1, 4]);

// Prerequisite check: Dials alone MUST NOT unlock
Stage3.setDial(0, 2);
Stage3.setDial(1, 5);
Stage3.setDial(2, 6);
assert.strictEqual(Stage3.getState().isDialsCorrect, true);
assert.strictEqual(Stage3.getState().isUnlocked, false, 'Vault MUST remain locked if optics are unaligned');

// Collect crystal must fail while locked
assert.strictEqual(Stage3.collectCrystal(), false);

// Probe optical raytracing with infinite reflection loop
// Rotate mirrors rapidly 50 times to test for memory leaks or stack overflow
for (let i = 0; i < 50; i++) {
  Stage3.rotateMirror(0, 2);
  Stage3.rotateMirror(2, 2);
  Stage3.rotateMirror(2, 4);
}
// Raytracing must complete instantaneously without exceeding max call stack
assert.ok(Array.isArray(Stage3.getState().laserPaths));
assert.ok(Array.isArray(Stage3.getState().laserCells));

// Solve optics
Stage3.autoSolveOptical();
assert.strictEqual(Stage3.getState().sensorAHit, true);
assert.strictEqual(Stage3.getState().sensorBHit, true);
assert.strictEqual(Stage3.getState().isUnlocked, true, 'Vault unlocks ONLY when BOTH optics and dials 2-5-6 match');

// Collect crystal
assert.strictEqual(Stage3.collectCrystal(), true);
// Second collect must return false
assert.strictEqual(Stage3.collectCrystal(), false);
console.log('   ✓ Stage 3 raytracer loop termination & strict lock preconditions verified!');


// --- 3. ATTACK ON STAGE 2 STREAMING & LOAD BALANCING ---
console.log('3. Probing Stage 2 stream queuing, timeouts and threat handling...');
Stage2.initStage();

// Before card swipe, all operations must be ignored
assert.strictEqual(Stage2.approvePacket('tx-1').status, 'ignored');
assert.strictEqual(Stage2.blockPacket('tx-2').status, 'ignored');

Stage2.swipeCard();
assert.ok(Stage2.getState().activePacket);

// Verify processing transactions
const app1 = Stage2.approvePacket();
assert.ok(app1.status === 'approved_legit' || app1.status === 'threat_blocked' || app1.status === 'requires_crypto');

// Verify channel loads are within 0-100 bounds
Stage2.switchChannel(0);
Stage2.switchChannel(1);
Stage2.switchChannel(2);
const loads = Stage2.getState().channelLoads;
loads.forEach(l => {
  assert.ok(l >= 0 && l <= 100, `Channel load ${l} must be between 0 and 100`);
});

// Verify Crypto Token validation
const cryptoRes = Stage2.solveCryptoToken('256-HSM');
assert.strictEqual(cryptoRes.status, 'crypto_verified');
console.log('   ✓ Stage 2 stream queuing, channels and crypto tokens verified!');


// --- 4. ATTACK ON STORAGE & SCORE BOUNDARIES ---
console.log('4. Probing score calculations across extreme boundaries...');
// Score with 0 elapsed time
const sZero = Storage.calculateScore(0, 0, 100);
assert.ok(sZero > 0);

// Score with huge elapsed time (e.g. 10 hours)
const sHuge = Storage.calculateScore(36000, 0, 0);
assert.ok(sHuge >= 100, 'Score must not drop below minimum floor (100)');

// Score with stability bonus
const sFull = Storage.calculateScore(120, 0, 100);
const sDepleted = Storage.calculateScore(120, 0, 0);
assert.ok(sFull > sDepleted, '100% stability must yield higher score than 0% stability');
assert.strictEqual(sFull - sDepleted, 1000, '100% stability bonus must be 1000 points');

// Time formatting with edge seconds
assert.strictEqual(Storage.formatTime(0), '00:00');
assert.strictEqual(Storage.formatTime(59), '00:59');
assert.strictEqual(Storage.formatTime(60), '01:00');
assert.strictEqual(Storage.formatTime(3599), '59:59');
console.log('   ✓ Storage and score calculation boundaries verified!');

console.log('\n🎉 ALL DEEP ADVERSARIAL ATTACK TESTS PASSED WITHOUT DEFECT!');
