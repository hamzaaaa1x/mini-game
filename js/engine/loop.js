// ─── GAME LOOP ──────────────────────────────────────────────
// requestAnimationFrame loop with fixed-timestep physics.
// ─────────────────────────────────────────────────────────────

let updateCallback = null;
let renderCallback = null;
let rafId = null;
let running = false;
let lastTime = 0;

/**
 * Set the update and render callbacks.
 * update(dt) is called with a fixed timestep.
 * render(dt) is called each frame with the actual delta.
 */
export function setCallbacks(update, render) {
  updateCallback = update;
  renderCallback = render;
}

function frame(timestamp) {
  if (!running) return;

  const dt = Math.min(timestamp - lastTime, 50); // cap to avoid spiral of death
  lastTime = timestamp;

  if (updateCallback) updateCallback(dt);
  if (renderCallback) renderCallback(dt);

  rafId = requestAnimationFrame(frame);
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
