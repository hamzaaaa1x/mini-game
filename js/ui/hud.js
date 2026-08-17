// ─── HUD ────────────────────────────────────────────────────
// In-game HUD overlay (Section 16.2 of spec).
// ─────────────────────────────────────────────────────────────

let hudEl = null;
let distanceEl = null;
let bestDistanceEl = null;
let boostFillEl = null;
let chainEl = null;
let chainCountEl = null;

export function createHUD() {
  if (document.getElementById('hud')) {
    hudEl = document.getElementById('hud');
    _cache();
    return;
  }

  hudEl = document.createElement('div');
  hudEl.id = 'hud';
  hudEl.innerHTML = [
    '<div class="hud-top-left">',
    '  <div class="hud-label">DISTANCE</div>',
    '  <div class="hud-value" id="hud-distance">0m</div>',
    '</div>',
    '<div class="hud-top-right">',
    '  <div class="hud-label">BEST</div>',
    '  <div class="hud-value" id="hud-best-distance">0m</div>',
    '</div>',
    '<div class="hud-bottom-left">',
    '  <div class="hud-label">BOOST</div>',
    '  <div class="boost-bar" id="hud-boost-bar">',
    '    <div class="boost-fill" id="hud-boost-fill"></div>',
    '  </div>',
    '</div>',
    '<div class="hud-bottom-center" id="hud-chain" style="display:none;">',
    '  <div class="chain-count">×<span id="hud-chain-count">0</span></div>',
    '</div>'
  ].join('\n');

  document.body.appendChild(hudEl);
  _cache();
}

function _cache() {
  distanceEl = document.getElementById('hud-distance');
  bestDistanceEl = document.getElementById('hud-best-distance');
  boostFillEl = document.getElementById('hud-boost-fill');
  chainEl = document.getElementById('hud-chain');
  chainCountEl = document.getElementById('hud-chain-count');
}

export function updateHUD(stats) {
  if (!hudEl) return;

  if (distanceEl) distanceEl.textContent = `${stats.distance}m`;
  if (bestDistanceEl) bestDistanceEl.textContent = `${stats.bestDistance}m`;

  if (boostFillEl) {
    boostFillEl.style.width = `${Math.max(0, Math.min(100, stats.boost))}%`;
    if (stats.boost < 25) {
      boostFillEl.style.background = 'linear-gradient(90deg, #ff4444, #ff8844)';
    } else {
      boostFillEl.style.background = 'linear-gradient(90deg, #4488ff, #66bbff)';
    }
  }

  if (chainEl) {
    if (stats.chain >= 2) {
      chainEl.style.display = 'block';
      if (chainCountEl) chainCountEl.textContent = stats.chain;
    } else {
      chainEl.style.display = 'none';
    }
  }
}

export function showHUD() {
  if (hudEl) hudEl.style.display = 'block';
}

export function hideHUD() {
  if (hudEl) hudEl.style.display = 'none';
}
