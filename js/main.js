// ─── MAIN ───────────────────────────────────────────────────
// Game entry point, loop wiring, input handling, lifecycle.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from './config.js';
import { stateMachine, STATES } from './stateMachine.js';
import { createPhysicsWorld, stepPhysics, onCollisionStart } from './engine/physicsWorld.js';
import { camera } from './engine/camera.js';
import { setCallbacks, startLoop } from './engine/loop.js';
import { player } from './entities/player.js';
import { grapplingHook, HOOK_STATES } from './entities/grapplingHook.js';
import { moon } from './entities/moon.js';
import { updateAnchors, drawAnchors, clearAnchors } from './entities/anchors.js';
import { initChunks, updateChunks, startEscapeChunks } from './world/chunkGenerator.js';
import { getBgColorsForX } from './world/phases.js';
import { updateParticles, drawParticles, clearParticles, emitBoost, emitHookAttach, emitSteal } from './fx/particles.js';
import { shakeOnBoost, shakeOnSteal, shakeOnDeath } from './fx/screenShake.js';
import { updateToasts, drawToasts, clearToasts, toastYouGotIt, toastOhNo } from './ui/toastText.js';
import { createHUD, updateHUD, showHUD, hideHUD } from './ui/hud.js';
import { createMenuScreen, showMenu, hideMenu, showGameOver, hideGameOver, createGameOverScreen, onStart, onRestart, onMainMenu, initSoundToggle } from './ui/menu.js';
import { playHookFire, playHookAttach, playHookRelease, playHookMiss, playBoost, playDeath, playSteal, playWin, initAudio, toggleSound, isEnabled } from './audio/audio.js';
import { scoring } from './scoring.js';

let canvas, ctx;
let mouseX = 0, mouseY = 0;
let mouseDown = false;

let bestDistance = 0;
let bestScore = 0;
let totalRuns = 0;

let stars = [];
let gameTime = 0;
let stealSequenceActive = false;
let escapeStartX = 0;

// ═══════════════════════════════════════════════════════════
// BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════

function boot() {
  try {
    canvas = document.getElementById('game-canvas');
    if (!canvas) throw new Error('Canvas #game-canvas not found in DOM');
    ctx = canvas.getContext('2d');

    _resizeCanvas();
    window.addEventListener('resize', _resizeCanvas);

    _loadStorage();
    initAudio();
    _generateStars();

    createMenuScreen();
    createGameOverScreen();
    createHUD();

    onStart(_startGame);
    onRestart(_restartGame);
    onMainMenu(_goToMenu);
    initSoundToggle(toggleSound, isEnabled);

    _wireInput();
    _wireStateMachine();

    // Initialize physics & background world
    createPhysicsWorld();
    initChunks();

    showMenu(bestDistance, bestScore);
    hideHUD();
    hideGameOver();

    setCallbacks(_update, _render);
    startLoop();
  } catch (err) {
    console.error('BOOT ERROR:', err);
    document.body.innerHTML = `<pre style="color:#ff4444; background:#0a0e1a; padding:24px; font-family:monospace; font-size:14px; white-space:pre-wrap; border:2px solid #ff4444; border-radius:8px; margin:20px;">BOOT ERROR:\n${err.stack || err}</pre>`;
  }
}

function _resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.resize(canvas.width, canvas.height);
}

function _loadStorage() {
  try {
    bestDistance = JSON.parse(localStorage.getItem('bestDistance')) || 0;
    bestScore = JSON.parse(localStorage.getItem('bestScore')) || 0;
    totalRuns = JSON.parse(localStorage.getItem('totalRuns')) || 0;
  } catch (e) {
    bestDistance = 0;
    bestScore = 0;
    totalRuns = 0;
  }
}

function _saveStorage() {
  try {
    localStorage.setItem('bestDistance', JSON.stringify(bestDistance));
    localStorage.setItem('bestScore', JSON.stringify(bestScore));
    localStorage.setItem('totalRuns', JSON.stringify(totalRuns));
  } catch (e) {}
}

function _generateStars() {
  stars = [];
  for (let i = 0; i < 140; i++) {
    stars.push({
      x: Math.random() * 2400,
      y: Math.random() * 900,
      size: 0.8 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.7,
      parallax: 0.1 + Math.random() * 0.4,
    });
  }
}

// ═══════════════════════════════════════════════════════════
// INPUT HANDLING (Section 4)
// ═══════════════════════════════════════════════════════════

function _wireInput() {
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouseDown = true;
    _onMouseDown();
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    mouseDown = false;
    _onMouseUp();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      _onBoost();
    }
    if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
      _restartGame();
    }
    if (e.code === 'Escape' || e.key === 'Escape') {
      _togglePause();
    }
  });
}

function _onMouseDown() {
  if (!stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE)) return;

  const worldPos = camera.screenToWorld(mouseX, mouseY);
  grapplingHook.fire(worldPos.x, worldPos.y);
  playHookFire();
}

function _onMouseUp() {
  if (!stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE)) return;

  if (grapplingHook.isAttached()) {
    grapplingHook.release();
    playHookRelease();
  }
}

function _onBoost() {
  if (!stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE)) return;

  const success = player.applyBoost();
  if (success) {
    const pos = player.getPosition();
    emitBoost(pos.x, pos.y, player.body.velocity.x, player.body.velocity.y);
    shakeOnBoost();
    playBoost();
  }
}

function _togglePause() {
  if (stateMachine.is(STATES.PLAYING) || stateMachine.is(STATES.ESCAPE)) {
    stateMachine.transition(STATES.PAUSED);
  } else if (stateMachine.is(STATES.PAUSED)) {
    stateMachine.transition(stateMachine.previousState || STATES.PLAYING);
  }
}

// ═══════════════════════════════════════════════════════════
// GAME FLOW & STATE
// ═══════════════════════════════════════════════════════════

function _wireStateMachine() {
  stateMachine.onEnter(STATES.PLAYING, () => {
    showHUD();
    hideMenu();
    hideGameOver();
  });

  stateMachine.onEnter(STATES.ESCAPE, () => {
    showHUD();
    hideMenu();
    hideGameOver();
  });

  stateMachine.onEnter(STATES.GAME_OVER, (_, payload) => {
    hideHUD();
    _handleGameOver(payload?.win || false);
  });
}

function _startGame() {
  totalRuns++;
  createPhysicsWorld();
  scoring.reset();

  // Create player (x=100, y=220) with direct view of starting skyscrapers
  player.reset(GAME_CONFIG.worldStartX + 100, 220);
  grapplingHook.init(player.body);

  grapplingHook.onAttach = (body, point) => {
    emitHookAttach(point.x, point.y);
    playHookAttach();
    scoring.recordGrapple();

    if (body.label === 'moon') {
      _triggerStealSequence();
    }
  };

  grapplingHook.onMiss = () => {
    playHookMiss();
  };

  onCollisionStart((event) => {
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (labels.includes('player')) {
        const other = pair.bodyA.label === 'player' ? pair.bodyB : pair.bodyA;
        if (other.label === 'ground' || other.plugin?.dangerous) {
          _playerDeath();
        }
      }
    }
  });

  // Create Moon
  moon.reset(GAME_CONFIG.moonDistance, 200);

  // Clear & init chunks
  clearAnchors();
  initChunks();

  // Frame camera on player
  camera.reset();
  camera.x = player.getPosition().x - canvas.width / 2;
  camera.y = player.getPosition().y - canvas.height / 2;

  clearParticles();
  clearToasts();

  stealSequenceActive = false;
  gameTime = 0;

  stateMachine.forceState(STATES.PLAYING);
}

function _restartGame() {
  grapplingHook.cancel();
  player.destroy();
  moon.destroy();
  clearAnchors();
  clearParticles();
  clearToasts();
  _startGame();
}

function _goToMenu() {
  grapplingHook.cancel();
  player.destroy();
  moon.destroy();
  clearAnchors();
  clearParticles();
  clearToasts();

  createPhysicsWorld();
  initChunks();

  hideGameOver();
  hideHUD();
  showMenu(bestDistance, bestScore);
  stateMachine.forceState(STATES.MENU);
}

function _playerDeath() {
  if (!player.alive) return;
  player.die();
  shakeOnDeath();
  playDeath();
  grapplingHook.cancel();
  stateMachine.transition(STATES.GAME_OVER, { win: false });
}

// ═══════════════════════════════════════════════════════════
// STEAL SEQUENCE (Section 10)
// ═══════════════════════════════════════════════════════════

function _triggerStealSequence() {
  if (stealSequenceActive) return;
  stealSequenceActive = true;

  grapplingHook.cancel();
  stateMachine.transition(STATES.MOON_APPROACH);

  scoring.markMoonStolen();
  emitSteal(moon.x, moon.y);
  shakeOnSteal();
  playSteal();

  toastYouGotIt();

  setTimeout(() => {
    toastOhNo();
  }, 1200);

  setTimeout(() => {
    moon.attachToPlayer(player.body);
    escapeStartX = player.getPosition().x;
    startEscapeChunks(moon.x);
    stateMachine.transition(STATES.ESCAPE);
  }, 2200);
}

function _handleGameOver(win) {
  if (win) {
    scoring.markEscapeComplete();
    playWin();
  }

  const stats = scoring.getStats(win);
  bestDistance = Math.max(bestDistance, stats.distance);
  bestScore = Math.max(bestScore, stats.score);
  stats.bestDistance = bestDistance;

  _saveStorage();
  showGameOver(stats);
}

// ═══════════════════════════════════════════════════════════
// GAME LOOP (UPDATE & RENDER)
// ═══════════════════════════════════════════════════════════

function _update(dt) {
  if (stateMachine.is(STATES.PAUSED)) return;

  gameTime += dt;

  // Step physics
  if (stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE, STATES.MOON_APPROACH)) {
    stepPhysics(dt);
  }

  // Update entities
  player.update(dt);
  grapplingHook.update(dt);

  const pos = player.getPosition();
  moon.update(pos);

  // Check death: fell below ground or off screen
  if (pos.y > GAME_CONFIG.groundY + 50 && player.alive && stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE)) {
    _playerDeath();
  }

  // Check escape win condition (Section 11)
  if (stateMachine.is(STATES.ESCAPE) && player.alive) {
    const distFromEscapeStart = pos.x - escapeStartX;
    if (distFromEscapeStart >= GAME_CONFIG.escapeZoneDistance) {
      stateMachine.forceState(STATES.GAME_OVER, { win: true });
    }
  }

  updateAnchors(gameTime);

  // Update chunks
  const bounds = camera.getBounds();
  updateChunks(bounds.right, bounds.left);

  // Update camera follow
  if (player.alive && player.body) {
    camera.update(pos.x, pos.y, player.getSpeed());
  }

  // Update scoring
  scoring.updateDistance(player.distanceTraveled);
  scoring.updateMaxSpeed(player.getSpeed());

  // Update HUD
  updateHUD({
    distance: Math.floor(player.distanceTraveled / 10),
    bestDistance,
    boost: player.boost,
    chain: scoring.currentChain,
  });

  updateParticles(dt);
  updateToasts();
}

function _render(dt) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Phase background gradient
  const playerX = player.body ? player.body.position.x : 0;
  const bgColors = getBgColorsForX(playerX);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, bgColors[0]);
  bgGrad.addColorStop(1, bgColors[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Parallax stars (Section 15)
  _drawStars(ctx, w, h);

  // World-space elements
  camera.applyTransform(ctx);

  _drawGround(ctx);
  drawAnchors(ctx);
  moon.draw(ctx);
  grapplingHook.draw(ctx);
  player.draw(ctx);
  drawParticles(ctx);

  camera.restoreTransform(ctx);

  // Screen-space UI
  drawToasts(ctx, w, h);

  if (stateMachine.is(STATES.PAUSED)) {
    _drawPauseOverlay(ctx, w, h);
  }
}

function _drawStars(ctx, w, h) {
  ctx.save();
  for (const s of stars) {
    const sx = (s.x - camera.x * s.parallax) % (w + 200);
    const renderX = sx < 0 ? sx + w + 200 : sx;
    const sy = s.y;

    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.beginPath();
    ctx.arc(renderX, sy, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function _drawGround(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 80, 60, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(camera.x - 200, GAME_CONFIG.groundY);
  ctx.lineTo(camera.x + canvas.width + 400, GAME_CONFIG.groundY);
  ctx.stroke();
  ctx.restore();
}

function _drawPauseOverlay(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 26, 0.7)';
  ctx.fillRect(0, 0, w, h);

  ctx.font = "900 48px 'Inter', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);

  ctx.font = "14px 'Inter', sans-serif";
  ctx.fillStyle = 'rgba(200, 210, 230, 0.6)';
  ctx.fillText('Press ESC to resume', w / 2, h / 2 + 30);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
