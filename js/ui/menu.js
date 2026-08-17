// ─── MENU ───────────────────────────────────────────────────
// Landing screen & Game Over screen with brand voice copy (Section 16 & 29).
// ─────────────────────────────────────────────────────────────

import { playClick } from '../audio/audio.js';

let menuEl = null;
let gameOverEl = null;
let onStartCallback = null;
let onRestartCallback = null;
let onMainMenuCallback = null;

// ═══════════════════════════════════════════════════════════
// LANDING SCREEN (Section 16.1)
// ═══════════════════════════════════════════════════════════

export function createMenuScreen() {
  if (document.getElementById('menu-screen')) {
    menuEl = document.getElementById('menu-screen');
    return;
  }

  menuEl = document.createElement('div');
  menuEl.id = 'menu-screen';
  menuEl.className = 'menu-overlay';
  menuEl.innerHTML = `
    <div class="menu-content">
      <div class="menu-title">
        <span class="title-line title-steal">STEAL</span>
        <span class="title-line title-the">THE</span>
        <span class="title-line title-moon">MOON 🌙</span>
      </div>
      <p class="menu-tagline">Earth won't notice. Probably.</p>
      <button class="btn-primary" id="btn-steal-it">STEAL IT</button>
      <div class="menu-best" id="menu-best"></div>
      <div class="menu-controls">
        <div class="control-item"><kbd>CLICK & HOLD</kbd> <span>→ GRAPPLE & SWING</span></div>
        <div class="control-item"><kbd>RELEASE</kbd> <span>→ LET GO & FLY</span></div>
        <div class="control-item"><kbd>SPACE</kbd> <span>→ BOOST</span></div>
        <div class="control-item"><kbd>R</kbd> <span>→ RESTART</span></div>
      </div>
      <button class="btn-sound" id="btn-sound" title="Toggle sound">🔊</button>
    </div>
  `;

  document.body.appendChild(menuEl);

  document.getElementById('btn-steal-it').addEventListener('click', () => {
    playClick();
    if (onStartCallback) onStartCallback();
  });
}

export function showMenu(bestDistance = 0, bestScore = 0) {
  if (!menuEl) createMenuScreen();
  menuEl.style.display = 'flex';

  const bestEl = document.getElementById('menu-best');
  if (bestEl) {
    bestEl.textContent = bestDistance > 0 ? `BEST: ${bestDistance}m (${bestScore} PTS)` : '';
  }
}

export function hideMenu() {
  if (menuEl) menuEl.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// GAME OVER SCREEN (Section 16.3)
// ═══════════════════════════════════════════════════════════

export function createGameOverScreen() {
  if (document.getElementById('gameover-screen')) {
    gameOverEl = document.getElementById('gameover-screen');
    return;
  }

  gameOverEl = document.createElement('div');
  gameOverEl.id = 'gameover-screen';
  gameOverEl.className = 'gameover-overlay';
  gameOverEl.style.display = 'none';
  gameOverEl.innerHTML = `
    <div class="gameover-content">
      <div class="gameover-headline" id="go-headline">YOU FELL.</div>
      <p class="gameover-sub" id="go-sub">The Moon remains disappointingly secure.</p>
      <div class="gameover-stats">
        <div class="stat-item">
          <span class="stat-label">DISTANCE</span>
          <span class="stat-value" id="go-distance">0m</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">BEST</span>
          <span class="stat-value gold" id="go-best">0m</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">GRAPPLES</span>
          <span class="stat-value" id="go-grapples">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">MAX SPEED</span>
          <span class="stat-value" id="go-speed">0</span>
        </div>
      </div>
      <div class="gameover-buttons">
        <button class="btn-primary" id="btn-try-again">TRY AGAIN</button>
        <button class="btn-secondary" id="btn-main-menu">MAIN MENU</button>
      </div>
    </div>
  `;

  document.body.appendChild(gameOverEl);

  document.getElementById('btn-try-again').addEventListener('click', () => {
    playClick();
    if (onRestartCallback) onRestartCallback();
  });

  document.getElementById('btn-main-menu').addEventListener('click', () => {
    playClick();
    if (onMainMenuCallback) onMainMenuCallback();
  });
}

export function showGameOver(stats) {
  if (!gameOverEl) createGameOverScreen();
  gameOverEl.style.display = 'flex';

  const headlineEl = document.getElementById('go-headline');
  const subEl = document.getElementById('go-sub');
  const distEl = document.getElementById('go-distance');
  const bestEl = document.getElementById('go-best');
  const grapplesEl = document.getElementById('go-grapples');
  const speedEl = document.getElementById('go-speed');

  if (stats.win) {
    if (headlineEl) headlineEl.textContent = 'MOON ACQUIRED.';
    if (subEl) subEl.textContent = 'This is probably illegal. Great escape!';
  } else {
    if (headlineEl) headlineEl.textContent = 'YOU FELL.';
    if (subEl) subEl.textContent = 'The Moon remains disappointingly secure.';
  }

  if (distEl) distEl.textContent = `${stats.distance}m`;
  if (bestEl) bestEl.textContent = `${stats.bestDistance}m`;
  if (grapplesEl) grapplesEl.textContent = stats.grapples || 0;
  if (speedEl) speedEl.textContent = `${Math.round(stats.maxSpeed || 0)} px/s`;
}

export function hideGameOver() {
  if (gameOverEl) gameOverEl.style.display = 'none';
}

export function onStart(cb) { onStartCallback = cb; }
export function onRestart(cb) { onRestartCallback = cb; }
export function onMainMenu(cb) { onMainMenuCallback = cb; }

export function initSoundToggle(toggleCb, isEnabledCb) {
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCb();
      btn.textContent = isEnabledCb() ? '🔊' : '🔇';
    });
  }
}
