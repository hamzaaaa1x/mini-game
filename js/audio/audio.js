// ─── AUDIO ──────────────────────────────────────────────────
// Procedural WebAudio sound effects (Section 1 of spec).
// ─────────────────────────────────────────────────────────────

let audioCtx = null;
let enabled = true;

export function initAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  } catch (e) {
    console.warn('WebAudio not supported');
  }
}

function _ensureContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function _playTone(freq, type, duration, gainStart, gainEnd = 0.001) {
  if (!enabled || !audioCtx) return;
  try {
    _ensureContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(gainStart, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainEnd, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio fail safe
  }
}

export function playHookFire() {
  _playTone(520, 'sine', 0.12, 0.2);
}

export function playHookAttach() {
  _playTone(440, 'triangle', 0.15, 0.35);
}

export function playHookRelease() {
  _playTone(660, 'sine', 0.1, 0.2);
}

export function playHookMiss() {
  _playTone(220, 'sawtooth', 0.08, 0.1);
}

export function playBoost() {
  _playTone(180, 'triangle', 0.25, 0.4);
}

export function playSteal() {
  _playTone(587, 'sine', 0.4, 0.5);
  setTimeout(() => _playTone(880, 'sine', 0.6, 0.5), 150);
}

export function playWin() {
  _playTone(523, 'triangle', 0.3, 0.4);
  setTimeout(() => _playTone(659, 'triangle', 0.3, 0.4), 150);
  setTimeout(() => _playTone(784, 'triangle', 0.5, 0.5), 300);
}

export function playDeath() {
  _playTone(140, 'sawtooth', 0.35, 0.4);
}

export function playClick() {
  _playTone(800, 'sine', 0.04, 0.15);
}

export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem('soundEnabled', JSON.stringify(enabled));
  } catch (e) {}
  return enabled;
}

export function isEnabled() {
  return enabled;
}
