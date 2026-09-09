/**
 * Stage 4: High-stakes Core Banking Override & Quantum Synchronization
 * (میز همگرایی کوانتومی، تنظیم فرکانس ۲۵۶ هرتز، پالس تشدید و دکمه ریبوت اضطراری)
 * 
 * Features:
 * - 3-Key Hardware Authentication: Gold Card, Barcode Scanner, 256 Crystal socket
 * - Dynamic Reactor Frequency Tuning: Target 256 Hz harmonic lock
 * - Phase Alignment & Harmonic Wave Convergence
 * - Quick-Time Emergency Core Pulse Synchronization (3 energy cells)
 * - Pneumatic Hazard Safety Cover & Big Red Emergency Reset Button
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Stage4 = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  let slots = {
    card: false,
    barcode: false,
    crystal: false
  };

  const TARGET_FREQUENCY = 256; // 256 Hz
  const TARGET_PHASE = 180;     // 180 degrees harmonic alignment

  let frequency = 210; // Current frequency (unstable)
  let phase = 45;       // Current phase angle
  let isResonanceLocked = false;

  let syncedPulses = 0;
  const REQUIRED_PULSES = 3;
  let isPulseSynchronized = false;

  let isCoverOpen = false;
  let isSystemRestored = false;

  function initStage() {
    slots = {
      card: false,
      barcode: false,
      crystal: false
    };
    frequency = 210;
    phase = 45;
    isResonanceLocked = false;
    syncedPulses = 0;
    isPulseSynchronized = false;
    isCoverOpen = false;
    isSystemRestored = false;
    return getState();
  }

  function insertItem(slotType) {
    if (isSystemRestored) return getState();

    if (slotType in slots) {
      slots[slotType] = true;
    }

    checkCoverReadiness();
    return getState();
  }

  function setFrequency(hz) {
    frequency = Math.max(180, Math.min(320, Math.round(hz)));
    checkResonance();
    return getState();
  }

  function setPhase(deg) {
    phase = (Math.round(deg) % 360 + 360) % 360;
    checkResonance();
    return getState();
  }

  function checkResonance() {
    const freqDelta = Math.abs(frequency - TARGET_FREQUENCY);
    const phaseDelta = Math.min(Math.abs(phase - TARGET_PHASE), Math.abs(360 - Math.abs(phase - TARGET_PHASE)));
    // Frequency within ±3 Hz and Phase within ±25 degrees
    if (freqDelta <= 3 && phaseDelta <= 25) {
      isResonanceLocked = true;
    } else {
      isResonanceLocked = false;
    }
    checkCoverReadiness();
  }

  function syncPulse(inZone = true) {
    const keysReady = slots.card && slots.barcode && slots.crystal;
    if (!keysReady) {
      return { status: 'keys_missing', syncedPulses, isPulseSynchronized: false };
    }

    if (!isResonanceLocked) {
      return { status: 'resonance_unlocked', syncedPulses, isPulseSynchronized: false };
    }

    if (inZone) {
      syncedPulses = Math.min(REQUIRED_PULSES, syncedPulses + 1);
      if (syncedPulses >= REQUIRED_PULSES) {
        isPulseSynchronized = true;
      }
      checkCoverReadiness();
      return { status: 'pulse_success', syncedPulses, isPulseSynchronized };
    } else {
      return { status: 'pulse_miss', syncedPulses, isPulseSynchronized: false };
    }
  }

  function checkCoverReadiness() {
    const keysReady = slots.card && slots.barcode && slots.crystal;
    // Cover unlocks when all 3 keys are inserted AND 256Hz resonance is locked AND pulses are synchronized!
    if (keysReady && isResonanceLocked && isPulseSynchronized) {
      isCoverOpen = true;
    } else {
      isCoverOpen = false;
    }
  }

  function autoTuneAndSync() {
    slots.card = true;
    slots.barcode = true;
    slots.crystal = true;
    frequency = TARGET_FREQUENCY;
    phase = TARGET_PHASE;
    isResonanceLocked = true;
    syncedPulses = REQUIRED_PULSES;
    isPulseSynchronized = true;
    checkCoverReadiness();
    return getState();
  }

  function pressEmergencyButton() {
    const keysReady = slots.card && slots.barcode && slots.crystal;
    const ready = keysReady && isResonanceLocked && isPulseSynchronized;
    if (!ready || isSystemRestored) {
      return { success: false, isSystemRestored };
    }

    isSystemRestored = true;
    return { success: true, isSystemRestored: true };
  }

  function getState() {
    const keysReady = slots.card && slots.barcode && slots.crystal;
    const readyForButton = keysReady && isResonanceLocked && isPulseSynchronized;
    return {
      slots: { ...slots },
      keysReady,
      frequency,
      phase,
      targetFrequency: TARGET_FREQUENCY,
      targetPhase: TARGET_PHASE,
      isResonanceLocked,
      syncedPulses,
      requiredPulses: REQUIRED_PULSES,
      isPulseSynchronized,
      isCoverOpen,
      readyForButton,
      isSystemRestored
    };
  }

  return {
    initStage,
    insertItem,
    setFrequency,
    setPhase,
    syncPulse,
    autoTuneAndSync,
    pressEmergencyButton,
    getState
  };
});
