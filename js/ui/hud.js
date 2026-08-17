// ─── HUD ────────────────────────────────────────────────────
// In-game HUD overlay: distance, best distance, boost bar,
// chain counter, tutorial hints.
// ─────────────────────────────────────────────────────────────

let hudEl = null;
let distanceEl, bestDistanceEl, boostBarEl, boostFillEl, chainEl, tutorialEl;
let tutorialTimer = null;
let tutorialVisible = false;
let tutorialDismissed = false;   // once dismissed, never show again this run

export function createHUD() {
  // Don't duplicate
  if (document.getElementById('hud')) {
    hudEl = document.getElementById('hud');
    _cacheElements();
    return;
  }

  hudEl = document.createElement('div');
  hudEl.id = 'hud';
  hudEl.innerHTML = `
    <div class="hud-top-left">
      <div class="hud-label">DISTANCE</div>
      <div class="hud-value" id="hud-distance">0m</div>
    </div>
    <div class="hud-top-right">
      <div class="hud-label">BEST</div>
      <div class="hud-value" id="hud-best-distance">0m</div>
    </div>
    <div class="hud-bottom-left">
      <div class="hud-label">BOOST</div>
      <div class="boost-bar" id="hud-boost-bar">
        <div class="boost-fill" id="hud-boost-fill"></div>
      </div>
    </div>
    <div class="hud-bottom-center" id="hud-chain" style="display:none;">
      <div class="chain-count">×<span id="hud-chain-count">0</span></div>
    </div>
    <div class="hud-tutorial" id="hud-tutorial" style="display:none; opacity:0;">
      <div class="tutorial-line">🖱️ <strong>CLICK & HOLD</strong> → FIRE HOOK</div>
      <div class="tutorial-line">✋ <strong>RELEASE CLICK</strong> → LET GO & FLY</div>
      <div class="tutorial-line">⌨️ <strong>SPACE</strong> → BOOST</div>
    </div>
    <div class="hud-debug" id="hud-debug">
      <div class="debug-title">⚙️ DEBUG (Toggle: `)</div>
      <div class="debug-row"><span>Velocity:</span> <span id="dbg-vel">0.0, 0.0 (0.0)</span></div>
      <div class="debug-row"><span>Rope Len / Stiff:</span> <span id="dbg-rope">-</span></div>
      <div class="debug-row"><span>Dist Cur Anchor:</span> <span id="dbg-cur-dist">-</span></div>
      <div class="debug-row"><span>Dist Next Anchor:</span> <span id="dbg-next-dist">-</span></div>
      <div class="debug-row"><span>Max Swing Vx:</span> <span id="dbg-max-vx">0.0</span></div>
      <div class="debug-row"><span>Hook State:</span> <span id="dbg-hook-state">IDLE</span></div>
    </div>
  `;

  document.body.appendChild(hudEl);
  _cacheElements();
}

let debugVisible = true; // default visible for testing
let dbgVelEl, dbgRopeEl, dbgCurDistEl, dbgNextDistEl, dbgMaxVxEl, dbgHookStateEl, debugEl;

function _cacheElements() {
  distanceEl = document.getElementById('hud-distance');
  bestDistanceEl = document.getElementById('hud-best-distance');
  boostBarEl = document.getElementById('hud-boost-bar');
  boostFillEl = document.getElementById('hud-boost-fill');
  chainEl = document.getElementById('hud-chain');
  tutorialEl = document.getElementById('hud-tutorial');
  debugEl = document.getElementById('hud-debug');
  dbgVelEl = document.getElementById('dbg-vel');
  dbgRopeEl = document.getElementById('dbg-rope');
  dbgCurDistEl = document.getElementById('dbg-cur-dist');
  dbgNextDistEl = document.getElementById('dbg-next-dist');
  dbgMaxVxEl = document.getElementById('dbg-max-vx');
  dbgHookStateEl = document.getElementById('dbg-hook-state');
}

/** Update Debug Metrics overlay */
export function updateDebugOverlay(metrics) {
  if (!debugEl || !debugVisible) return;

  if (dbgVelEl) dbgVelEl.textContent = `${metrics.vx.toFixed(1)}, ${metrics.vy.toFixed(1)} (${metrics.speed.toFixed(1)})`;
  if (dbgRopeEl) dbgRopeEl.textContent = metrics.ropeLength > 0 ? `${Math.round(metrics.ropeLength)}px / ${metrics.ropeStiffness}` : 'None';
  if (dbgCurDistEl) dbgCurDistEl.textContent = metrics.curAnchorDist !== null ? `${Math.round(metrics.curAnchorDist)}px` : 'N/A';
  if (dbgNextDistEl) dbgNextDistEl.textContent = metrics.nextAnchorDist !== null ? `${Math.round(metrics.nextAnchorDist)}px` : 'None ahead';
  if (dbgMaxVxEl) dbgMaxVxEl.textContent = `${metrics.maxSwingVx.toFixed(1)} px/f`;
  if (dbgHookStateEl) dbgHookStateEl.textContent = metrics.hookState;
}

export function toggleDebugOverlay() {
  debugVisible = !debugVisible;
  if (debugEl) {
    debugEl.style.display = debugVisible ? 'block' : 'none';
  }
}

/** Update HUD values */
export function updateHUD(stats) {
  if (!hudEl) return;

  if (distanceEl) distanceEl.textContent = `${stats.distance}m`;
  if (bestDistanceEl) bestDistanceEl.textContent = `${stats.bestDistance}m`;

  if (boostFillEl) {
    boostFillEl.style.width = `${stats.boost}%`;

    // Color shift when low
    if (stats.boost < 25) {
      boostFillEl.style.background = 'linear-gradient(90deg, #ff4444, #ff6644)';
    } else {
      boostFillEl.style.background = 'linear-gradient(90deg, #4488ff, #66bbff)';
    }
  }

  if (chainEl) {
    if (stats.chain >= 2) {
      chainEl.style.display = 'block';
      const countEl = document.getElementById('hud-chain-count');
      if (countEl) countEl.textContent = stats.chain;
    } else {
      chainEl.style.display = 'none';
    }
  }
}

/**
 * Show tutorial hints. Fades out after 10 s OR on first grapple
 * (whichever is first). Uses CSS transition for the fade.
 */
export function showTutorial() {
  if (!tutorialEl) return;
  tutorialDismissed = false;
  tutorialEl.style.display = 'block';

  // Force reflow so the transition triggers from opacity 0→1
  void tutorialEl.offsetWidth;
  tutorialEl.style.opacity = '1';
  tutorialVisible = true;

  // Auto-dismiss after 10 seconds
  if (tutorialTimer) clearTimeout(tutorialTimer);
  tutorialTimer = setTimeout(() => {
    _fadeTutorialOut();
  }, 10000);
}

/** Dismiss tutorial on first successful grapple */
export function dismissTutorialOnGrapple() {
  if (!tutorialVisible || tutorialDismissed) return;
  _fadeTutorialOut();
}

/** Internal: fade and hide */
function _fadeTutorialOut() {
  if (!tutorialEl || tutorialDismissed) return;
  tutorialDismissed = true;
  tutorialVisible = false;

  if (tutorialTimer) {
    clearTimeout(tutorialTimer);
    tutorialTimer = null;
  }

  tutorialEl.style.opacity = '0';  // CSS transition handles the animation
  setTimeout(() => {
    if (tutorialEl) tutorialEl.style.display = 'none';
  }, 800);
}

/** Hide tutorial immediately (state transition away from PLAYING) */
export function hideTutorial() {
  if (!tutorialEl) return;
  tutorialDismissed = true;
  tutorialVisible = false;

  if (tutorialTimer) {
    clearTimeout(tutorialTimer);
    tutorialTimer = null;
  }

  tutorialEl.style.opacity = '0';
  tutorialEl.style.display = 'none';
}

/** Show the HUD */
export function showHUD() {
  if (hudEl) hudEl.style.display = 'block';
}

/** Hide the HUD (also force-hides tutorial) */
export function hideHUD() {
  if (hudEl) hudEl.style.display = 'none';
  // Also kill tutorial so it never leaks through other screens
  hideTutorial();
}
