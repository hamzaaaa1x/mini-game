// ─── MENU ───────────────────────────────────────────────────
// Landing screen + Game-over screen. Brand voice copy.
// ─────────────────────────────────────────────────────────────

import { playClick } from '../audio/audio.js';

let menuEl = null;
let gameOverEl = null;
let onStartCallback = null;
let onRestartCallback = null;
let onMainMenuCallback = null;

// ═══════════════════════════════════════════════════════════
// LANDING SCREEN
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
        <div class="control-item"><kbd>CLICK & HOLD</kbd> <span>→ GRAPPLE</span></div>
        <div class="control-item"><kbd>RELEASE</kbd> <span>→ FLY</span></div>
        <div class="control-item"><kbd>A / D</kbd> <span>→ PUMP SWING</span></div>
        <div class="control-item"><kbd>SPACE</kbd> <span>→ BOOST</span></div>
      </div>
      <button class="btn-sound" id="btn-sound" title="Toggle sound">🔊</button>
    </div>
  `;

  document.body.appendChild(menuEl);

  // Wire up button
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
    if (bestDistance > 0) {
      bestEl.textContent = `Best: ${bestDistance}m · Score: ${bestScore}`;
      bestEl.style.display = 'block';
    } else {
      bestEl.style.display = 'none';
    }
  }
}

export function hideMenu() {
  if (menuEl) menuEl.style.display = 'none';
}

export function onStart(callback) {
  onStartCallback = callback;
}

// ═══════════════════════════════════════════════════════════
// GAME OVER SCREEN
// ═══════════════════════════════════════════════════════════

const DEATH_HEADLINES = [
  'YOU FELL.',
  'GRAVITY WINS AGAIN.',
  'THAT WENT POORLY.',
  'THE MOON REMAINS DISAPPOINTINGLY SECURE.',
];

const WIN_HEADLINES = [
  'YOU DID IT. 🌙',
  'MOON ACQUIRED.',
  'EARTH IS CALLING. YOU\'RE NOT ANSWERING.',
  'THIS IS PROBABLY ILLEGAL.',
];

export function createGameOverScreen() {
  if (document.getElementById('gameover-screen')) {
    gameOverEl = document.getElementById('gameover-screen');
    return;
  }

  gameOverEl = document.createElement('div');
  gameOverEl.id = 'gameover-screen';
  gameOverEl.className = 'menu-overlay';
  gameOverEl.innerHTML = `
    <div class="menu-content gameover-content">
      <h1 class="gameover-headline" id="gameover-headline">YOU FELL.</h1>
      <div class="gameover-stats" id="gameover-stats"></div>
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

export function showGameOver(stats, isWin = false, isNewRecord = false) {
  if (!gameOverEl) createGameOverScreen();
  gameOverEl.style.display = 'flex';

  const headlineEl = document.getElementById('gameover-headline');
  const statsEl = document.getElementById('gameover-stats');

  if (headlineEl) {
    const pool = isWin ? WIN_HEADLINES : DEATH_HEADLINES;
    headlineEl.textContent = pool[Math.floor(Math.random() * pool.length)];
    headlineEl.className = `gameover-headline ${isWin ? 'win' : 'lose'}`;
  }

  if (statsEl) {
    let html = `
      <div class="stat-row"><span class="stat-label">Distance</span><span class="stat-value">${stats.distance}m</span></div>
      <div class="stat-row"><span class="stat-label">Best Distance</span><span class="stat-value">${stats.bestDistance}m</span></div>
      <div class="stat-row"><span class="stat-label">Grapples</span><span class="stat-value">${stats.grappleCount}</span></div>
      <div class="stat-row"><span class="stat-label">Max Speed</span><span class="stat-value">${stats.maxSpeed}</span></div>
      <div class="stat-row"><span class="stat-label">Score</span><span class="stat-value">${stats.score}</span></div>
    `;

    if (isNewRecord) {
      html += `<div class="stat-record">NEW RECORD. NASA is concerned.</div>`;
    }

    statsEl.innerHTML = html;
  }
}

export function hideGameOver() {
  if (gameOverEl) gameOverEl.style.display = 'none';
}

export function onRestart(callback) {
  onRestartCallback = callback;
}

export function onMainMenu(callback) {
  onMainMenuCallback = callback;
}

/** Wire up sound toggle button */
export function initSoundToggle(toggleFn, isEnabledFn) {
  const btn = document.getElementById('btn-sound');
  if (!btn) return;

  const update = () => {
    btn.textContent = isEnabledFn() ? '🔊' : '🔇';
  };

  btn.addEventListener('click', () => {
    toggleFn();
    update();
  });

  update();
}
