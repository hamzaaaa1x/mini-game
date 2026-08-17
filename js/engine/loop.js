// ─── GAME LOOP ──────────────────────────────────────────────
// requestAnimationFrame loop with fixed-timestep physics.
// ─────────────────────────────────────────────────────────────

let updateCallback = null;
let renderCallback = null;
let rafId = null;
let running = false;
let lastTime = 0;
const FIXED_TIMESTEP = 1000 / 60; // 16.67ms

export function setCallbacks(update, render) {
  updateCallback = update;
  renderCallback = render;
}

function frame(timestamp) {
  if (!running) return;

  const elapsed = Math.min(timestamp - lastTime, 100);
  lastTime = timestamp;

  try {
    if (updateCallback) updateCallback(FIXED_TIMESTEP);
  } catch (err) {
    _showError(err, 'UPDATE');
  }

  try {
    if (renderCallback) renderCallback(elapsed);
  } catch (err) {
    _showError(err, 'RENDER');
  }

  rafId = requestAnimationFrame(frame);
}

function _showError(err, phase) {
  let banner = document.getElementById('runtime-error-overlay');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'runtime-error-overlay';
    banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:#d32f2f; color:#ffffff; padding:14px 20px; font-family:monospace; font-size:13px; font-weight:bold; z-index:99999; box-shadow:0 4px 12px rgba(0,0,0,0.5);';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `⚠️ ${phase} ERROR: ${err?.message || String(err)}`;
  console.error(`[${phase} ERROR]:`, err);
}

export function startLoop() {
  if (running) return;
  running = true;
  lastTime = performance.now();
  rafId = requestAnimationFrame(frame);
}

export function stopLoop() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function isRunning() {
  return running;
}
