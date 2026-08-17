// ─── AUDIO ──────────────────────────────────────────────────
// WebAudio-based procedural sound effects. No audio files
// needed. Gracefully degrades — never throws errors.
// ─────────────────────────────────────────────────────────────

let audioCtx = null;
let masterGain = null;
let enabled = true;

function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      masterGain.gain.value = 0.3;
    } catch (e) {
      console.warn('[Audio] WebAudio not available');
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Play a short noise burst */
function playNoise(duration, frequency, type = 'sine', volume = 0.2, rampDown = true) {
  const ctx = getCtx();
  if (!ctx || !enabled) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    if (rampDown) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(frequency * 0.3, 20),
        ctx.currentTime + duration
      );
    }

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail
  }
}

// ── Sound presets ──

export function playHookFire() {
  playNoise(0.12, 800, 'sine', 0.15, true);
}

export function playHookAttach() {
  playNoise(0.08, 1200, 'square', 0.1, true);
  setTimeout(() => playNoise(0.06, 1600, 'sine', 0.08), 30);
}

export function playHookRelease() {
  playNoise(0.1, 600, 'sine', 0.1, true);
}

export function playHookMiss() {
  playNoise(0.15, 300, 'sawtooth', 0.05, true);
}

export function playBoost() {
  playNoise(0.2, 200, 'sawtooth', 0.15, true);
  playNoise(0.15, 400, 'sine', 0.1, false);
}

export function playDeath() {
  playNoise(0.4, 150, 'sawtooth', 0.2, true);
  setTimeout(() => playNoise(0.3, 80, 'square', 0.15), 100);
}

export function playSteal() {
  playNoise(0.1, 800, 'sine', 0.2, false);
  setTimeout(() => playNoise(0.1, 1000, 'sine', 0.2, false), 100);
  setTimeout(() => playNoise(0.3, 1400, 'sine', 0.25, false), 200);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playNoise(0.2, freq, 'sine', 0.15, false), i * 120);
  });
}

export function playClick() {
  playNoise(0.05, 1000, 'sine', 0.1, true);
}

// ── Controls ──

export function setEnabled(e) {
  enabled = e;
}

export function isEnabled() {
  return enabled;
}

export function initAudio() {
  // Load preference
  try {
    const stored = localStorage.getItem('soundEnabled');
    if (stored !== null) {
      enabled = JSON.parse(stored);
    }
  } catch (e) {
    enabled = true;
  }
}

export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem('soundEnabled', JSON.stringify(enabled));
  } catch (e) {}
  return enabled;
}
