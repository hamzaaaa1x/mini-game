// ─── MAIN ───────────────────────────────────────────────────
// Entry point: boot sequence, game loop, input handling,
// state machine wiring, restart logic.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from './config.js';
import { stateMachine, STATES } from './stateMachine.js';
import { createPhysicsWorld, stepPhysics, onCollisionStart, getEngine } from './engine/physicsWorld.js';
import { camera } from './engine/camera.js';
import { setCallbacks, startLoop, stopLoop } from './engine/loop.js';
import { player } from './entities/player.js';
import { grapplingHook, HOOK_STATES } from './entities/grapplingHook.js';
import { moon } from './entities/moon.js';
import { updateAnchors, drawAnchors, clearAnchors, getNextAnchorAhead, getActiveAnchors } from './entities/anchors.js';
import { initChunks, updateChunks, resetChunks, startEscapeChunks } from './world/chunkGenerator.js';
import { getPhaseForX, getBgColorsForX } from './world/phases.js';
import { updateParticles, drawParticles, clearParticles, emitBoost, emitHookFire, emitHookAttach, emitHookRelease, emitSteal, emitDeath } from './fx/particles.js';
import { shakeOnBoost, shakeOnSteal, shakeOnDeath } from './fx/screenShake.js';
import { updateToasts, drawToasts, clearToasts, toastYouGotIt, toastOhNo, toastEarthNoticed } from './ui/toastText.js';
import { createHUD, updateHUD, showHUD, hideHUD, showTutorial, hideTutorial, dismissTutorialOnGrapple, updateDebugOverlay, toggleDebugOverlay } from './ui/hud.js';
import { createMenuScreen, showMenu, hideMenu, showGameOver, hideGameOver, createGameOverScreen, onStart, onRestart, onMainMenu, initSoundToggle } from './ui/menu.js';
import { playHookFire, playHookAttach, playHookRelease, playHookMiss, playBoost, playDeath, playSteal, playWin, initAudio, toggleSound, isEnabled } from './audio/audio.js';
import { scoring } from './scoring.js';

// ── Canvas ──
let canvas, ctx;
let mouseX = 0, mouseY = 0;
let mouseDown = false;

// ── Storage ──
let bestDistance = 0;
let bestScore = 0;
let totalRuns = 0;

// ── Star layers for parallax ──
let stars = [];

// ── Steal sequence state ──
let stealSequenceActive = false;
let stealSequenceStart = 0;

// ── Escape state ──
let escapeStartX = 0;

// ── Time tracking ──
let gameTime = 0;

// ── Debug Overlay ──
let currentDebugMetrics = null;
let debugOverlayEnabled = true;

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════

function boot() {
  // Canvas setup
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  _resizeCanvas();
  window.addEventListener('resize', _resizeCanvas);

  // Load storage
  _loadStorage();

  // Init audio
  initAudio();

  // Generate star layers
  _generateStars();

  // Create UI
  createMenuScreen();
  createGameOverScreen();
  createHUD();

  // Wire menu callbacks
  onStart(_startGame);
  onRestart(_restartGame);
  onMainMenu(_goToMenu);
  initSoundToggle(toggleSound, isEnabled);

  // Wire input
  _wireInput();

  // Wire state machine
  _wireStateMachine();

  // Show menu
  showMenu(bestDistance, bestScore);
  hideHUD();
  hideGameOver();

  // Start the render loop (always running for menu background)
  setCallbacks(_update, _render);
  startLoop();
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
  for (let layer = 0; layer < 3; layer++) {
    const count = 80 + layer * 60;
    const layerStars = [];
    for (let i = 0; i < count; i++) {
      layerStars.push({
        x: Math.random() * 8000 - 2000,
        y: Math.random() * 4000 - 1000,
        r: 0.5 + Math.random() * (1.5 - layer * 0.3),
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.001 + Math.random() * 0.003,
      });
    }
    stars.push({ parallax: 0.05 + layer * 0.08, stars: layerStars });
  }
}

// ═══════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════

function _wireInput() {
  canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouseDown = true;
    _onMouseDown();
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    mouseDown = false;
    _onMouseUp();
  });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    mouseX = touch.clientX;
    mouseY = touch.clientY;
    mouseDown = true;
    _onMouseDown();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    mouseX = touch.clientX;
    mouseY = touch.clientY;
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    mouseDown = false;
    _onMouseUp();
  }, { passive: false });

  // Track pump keys
  const pumpKeys = { left: false, right: false };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      _onBoost();
    }
    if (e.code === 'KeyR') {
      _restartGame();
    }
    if (e.code === 'Escape') {
      _togglePause();
    }
    if (e.code === 'Backquote') {
      debugOverlayEnabled = !debugOverlayEnabled;
      toggleDebugOverlay();
    }
    // Swing pump: A/D or Arrow keys
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      pumpKeys.left = true;
      _updatePump(pumpKeys);
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      pumpKeys.right = true;
      _updatePump(pumpKeys);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      pumpKeys.left = false;
      _updatePump(pumpKeys);
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      pumpKeys.right = false;
      _updatePump(pumpKeys);
    }
  });
}

function _updatePump(keys) {
  let dir = 0;
  if (keys.left) dir -= 1;
  if (keys.right) dir += 1;
  grapplingHook.setPumpInput(dir);
}

function _onMouseDown() {
  if (!stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE, STATES.MOON_APPROACH)) return;
  if (!player.alive) return;

  const worldPos = camera.screenToWorld(mouseX, mouseY);
  grapplingHook.fire(worldPos.x, worldPos.y);

  const pos = player.getPosition();
  const angle = Math.atan2(worldPos.y - pos.y, worldPos.x - pos.x);
  emitHookFire(pos.x, pos.y, angle);
  playHookFire();
}

function _onMouseUp() {
  if (grapplingHook.isAttached()) {
    const pos = player.getPosition();
    emitHookRelease(pos.x, pos.y);
    playHookRelease();
    grapplingHook.release();
  }
}

function _onBoost() {
  if (!stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE, STATES.MOON_APPROACH)) return;
  if (!player.alive) return;

  if (player.applyBoost()) {
    const pos = player.getPosition();
    const vel = player.body.velocity;
    const angle = Math.atan2(vel.y, vel.x);
    emitBoost(pos.x, pos.y, angle);
    shakeOnBoost();
    playBoost();
    player.isBoosting = true;
    setTimeout(() => { player.isBoosting = false; }, 200);
  }
}

function _togglePause() {
  if (stateMachine.is(STATES.PLAYING) || stateMachine.is(STATES.ESCAPE)) {
    stateMachine.transition(STATES.PAUSED);
  } else if (stateMachine.is(STATES.PAUSED)) {
    const resumeTo = stateMachine.previous === STATES.ESCAPE ? STATES.ESCAPE : STATES.PLAYING;
    stateMachine.transition(resumeTo);
  }
}

// ═══════════════════════════════════════════════════════════
// STATE MACHINE WIRING
// ═══════════════════════════════════════════════════════════

function _wireStateMachine() {
  stateMachine.onEnter(STATES.PLAYING, () => {
    hideMenu();
    hideGameOver();
    showHUD();
    showTutorial();
  });

  stateMachine.onEnter(STATES.PAUSED, () => {
    hideTutorial(); // kill tutorial on pause
  });

  stateMachine.onEnter(STATES.MOON_APPROACH, () => {
    hideTutorial();
  });

  stateMachine.onEnter(STATES.MOON_STOLEN, () => {
    hideTutorial();
    _runStealSequence();
  });

  stateMachine.onEnter(STATES.ESCAPE, () => {
    hideTutorial();
    _beginEscape();
  });

  stateMachine.onEnter(STATES.GAME_OVER, (_, payload) => {
    hideTutorial();
    _handleGameOver(payload);
  });

  stateMachine.onEnter(STATES.MENU, () => {
    hideHUD();  // hideHUD also calls hideTutorial internally
    hideGameOver();
    showMenu(bestDistance, bestScore);
  });
}

// ═══════════════════════════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════════════════════════

function _startGame() {
  // Init physics
  const { engine, world } = createPhysicsWorld();

  // Reset scoring
  scoring.reset();

  // Create player
  player.reset(GAME_CONFIG.worldStartX + 100, GAME_CONFIG.worldStartY - 200);

  // Init hook
  grapplingHook.init(player.body);

  // Hook callbacks
  grapplingHook.onAttach = (body, point) => {
    emitHookAttach(point.x, point.y);
    playHookAttach();
    scoring.recordGrapple();
    player.currentChain = scoring.currentChain;

    // Dismiss tutorial on first successful grapple
    dismissTutorialOnGrapple();

    // Check if we grappled the moon
    if (body.label === 'moon') {
      grapplingHook.cancel();
      stateMachine.transition(STATES.MOON_APPROACH);
      setTimeout(() => {
        stateMachine.transition(STATES.MOON_STOLEN);
      }, 300);
    }
  };

  grapplingHook.onMiss = () => {
    playHookMiss();
  };

  grapplingHook.onRelease = () => {
    // Velocity preserved — nothing to do
  };

  // Collision detection
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

  // Create moon
  const moonX = GAME_CONFIG.moonDistance;
  const moonY = GAME_CONFIG.worldStartY - 100;
  moon.reset(moonX, moonY);

  // Init chunks
  clearAnchors();
  resetChunks();
  initChunks();

  // Reset camera
  camera.reset();
  camera.x = player.getPosition().x - canvas.width / 2;
  camera.y = player.getPosition().y - canvas.height / 2;

  // Clear FX
  clearParticles();
  clearToasts();

  stealSequenceActive = false;
  gameTime = 0;

  // Transition state
  stateMachine.forceState(STATES.PLAYING);
}

function _restartGame() {
  grapplingHook.cancel();
  player.destroy();
  moon.destroy();
  clearAnchors();
  clearParticles();
  clearToasts();
  hideGameOver();

  // Re-create physics world to clear all bodies
  _startGame();
}

function _goToMenu() {
  grapplingHook.cancel();
  player.destroy();
  moon.destroy();
  clearAnchors();
  clearParticles();
  clearToasts();
  hideGameOver();
  hideHUD();

  stateMachine.forceState(STATES.MENU);
}

function _playerDeath() {
  if (!player.alive) return;

  player.die();
  grapplingHook.cancel();
  scoring.breakChain();

  const pos = player.getPosition();
  emitDeath(pos.x, pos.y);
  shakeOnDeath();
  playDeath();

  setTimeout(() => {
    stateMachine.forceState(STATES.GAME_OVER, { win: false });
  }, 800);
}

function _runStealSequence() {
  stealSequenceActive = true;
  stealSequenceStart = performance.now();

  const moonPos = moon.body ? moon.body.position : { x: moon.x, y: moon.y };

  // Freeze player near moon
  if (player.body) {
    Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
    Matter.Body.setPosition(player.body, {
      x: moonPos.x - 50,
      y: moonPos.y,
    });
  }

  // Effects
  emitSteal(moonPos.x, moonPos.y);
  shakeOnSteal();
  playSteal();
  scoring.markMoonStolen();

  // Camera zoom out
  camera.setZoom(0.6);

  // Toast sequence
  toastYouGotIt();
  setTimeout(() => {
    toastOhNo();
    shakeOnSteal();
  }, 2000);

  setTimeout(() => {
    toastEarthNoticed();
  }, 2800);

  // Transition to escape
  setTimeout(() => {
    stealSequenceActive = false;
    camera.setZoom(GAME_CONFIG.baseZoom);
    stateMachine.transition(STATES.ESCAPE);
  }, 3500);
}

function _beginEscape() {
  moon.steal();
  moon.attachToPlayer(player.body);
  player.enterEscapeMode();

  const playerPos = player.getPosition();
  escapeStartX = playerPos.x;

  // Start escape chunk generation
  startEscapeChunks(playerPos.x);
}

function _handleGameOver(payload) {
  const isWin = payload?.win || false;
  if (isWin) {
    scoring.markEscapeComplete();
    playWin();
  }

  const stats = scoring.getStats();
  const distMeters = stats.distance;
  const isNewRecord = distMeters > bestDistance;

  if (isNewRecord) bestDistance = distMeters;
  if (stats.score > bestScore) bestScore = stats.score;
  totalRuns++;
  _saveStorage();

  hideHUD();
  showGameOver({
    distance: distMeters,
    bestDistance,
    grappleCount: stats.grappleCount,
    maxSpeed: stats.maxSpeed,
    score: stats.score,
  }, isWin, isNewRecord);
}

// ═══════════════════════════════════════════════════════════
// UPDATE (game logic)
// ═══════════════════════════════════════════════════════════

function _update(dt) {
  if (stateMachine.is(STATES.MENU)) return;
  if (stateMachine.is(STATES.PAUSED)) return;
  if (stealSequenceActive) {
    updateToasts();
    camera.update(
      moon.body ? moon.body.position.x : moon.x,
      moon.body ? moon.body.position.y : moon.y,
      0
    );
    updateParticles(dt);
    return;
  }
  if (stateMachine.is(STATES.GAME_OVER)) return;

  gameTime += dt;

  // Step physics
  stepPhysics(1000 / 60);

  // Update player
  player.update(dt);

  // Update hook
  grapplingHook.update(dt);

  // Moon gravity & update
  if (player.alive && moon.body) {
    const pos = player.getPosition();
    const moonForce = moon.update(pos);
    if (moonForce && player.body) {
      Matter.Body.applyForce(player.body, player.body.position, moonForce);
    }

    // Check moon approach state
    const dx = moon.x - pos.x;
    const dy = moon.y - pos.y;
    const distToMoon = Math.sqrt(dx * dx + dy * dy);
    if (distToMoon < GAME_CONFIG.moonApproachRadius * 2 && stateMachine.is(STATES.PLAYING)) {
      stateMachine.transition(STATES.MOON_APPROACH);
    }
  }

  // Check escape win condition
  if (stateMachine.is(STATES.ESCAPE) && player.alive) {
    const distFromEscapeStart = player.getPosition().x - escapeStartX;
    if (distFromEscapeStart >= GAME_CONFIG.escapeZoneDistance) {
      stateMachine.forceState(STATES.GAME_OVER, { win: true });
    }
  }

  // Update anchors (kinematic movement)
  updateAnchors(gameTime);

  // Update chunks
  const bounds = camera.getBounds();
  updateChunks(bounds.right, bounds.left);

  // Update camera
  if (player.alive && player.body) {
    const pos = player.getPosition();
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

  // Step 2: Apply continuous air control while flying, swinging, or falling
  let airDir = 0;
  if (pumpKeys.left) airDir -= 1;
  if (pumpKeys.right) airDir += 1;
  if (player.alive && airDir !== 0) {
    player.applyAirControl(airDir, dt);
  }

  // Update Debug Overlay (Step 1)
  const pPos = player.getPosition();
  const pVel = player.body ? player.body.velocity : { x: 0, y: 0 };
  const pSpeed = player.getSpeed();

  let curAnchorDist = null;
  if (grapplingHook.anchorPoint) {
    const dx = grapplingHook.anchorPoint.x - pPos.x;
    const dy = grapplingHook.anchorPoint.y - pPos.y;
    curAnchorDist = Math.sqrt(dx * dx + dy * dy);
  }

  const nextAnchor = getNextAnchorAhead(pPos.x);
  let nextAnchorDist = null;
  if (nextAnchor) {
    const dx = nextAnchor.position.x - pPos.x;
    const dy = nextAnchor.position.y - pPos.y;
    nextAnchorDist = Math.sqrt(dx * dx + dy * dy);
  }

  const debugMetrics = {
    vx: pVel.x,
    vy: pVel.y,
    speed: pSpeed,
    ropeLength: grapplingHook.attachedRopeLength,
    ropeStiffness: GAME_CONFIG.ropeStiffness,
    curAnchorDist: curAnchorDist,
    nextAnchorDist: nextAnchorDist,
    maxSwingVx: grapplingHook.maxSwingVx,
    hookState: grapplingHook.state,
  };

  updateDebugOverlay(debugMetrics);
  currentDebugMetrics = debugMetrics;

  // Update particles
  updateParticles(dt);

  // Update toasts
  updateToasts();

  // Death check: fell below screen for too long
  if (player.alive && player.body) {
    const playerY = player.body.position.y;
    if (playerY > GAME_CONFIG.groundY + 100) {
      _playerDeath();
    }
  }
}

// ═══════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════

function _render(dt) {
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const playerX = player.body ? player.body.position.x : 0;
  const bgColors = getBgColorsForX(playerX);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, bgColors[0]);
  bgGrad.addColorStop(1, bgColors[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Draw parallax stars
  _drawStars(ctx, w, h);

  // World-space rendering
  camera.applyTransform(ctx);

  // Draw ground plane indicator
  _drawGround(ctx);

  // Draw faint swing arc circles around nearby anchors (Step 1)
  _drawAnchorArcCircles(ctx);

  // Draw anchors
  drawAnchors(ctx);

  // Draw moon
  moon.draw(ctx);

  // Draw hook/rope
  grapplingHook.draw(ctx);

  // Draw player
  player.draw(ctx);

  // Draw particles (world space)
  drawParticles(ctx);

  camera.restoreTransform(ctx);

  // Screen-space overlays
  drawToasts(ctx, w, h);

  // Pause overlay
  if (stateMachine.is(STATES.PAUSED)) {
    _drawPauseOverlay(ctx, w, h);
  }

  // Moon direction indicator when off-screen
  if (stateMachine.isAny(STATES.PLAYING, STATES.MOON_APPROACH) && !moon.stolen) {
    _drawMoonIndicator(ctx, w, h);
  }

  // Draw Canvas Debug Overlay (Step 1: guaranteed on-screen visibility)
  if (debugOverlayEnabled && currentDebugMetrics && stateMachine.isAny(STATES.PLAYING, STATES.ESCAPE, STATES.MOON_APPROACH)) {
    _drawCanvasDebugOverlay(ctx, w, h);
  }
}

function _drawCanvasDebugOverlay(ctx, w, h) {
  const m = currentDebugMetrics;
  if (!m) return;

  const boxW = 240;
  const boxH = 135;
  const x = w - boxW - 20;
  const y = 60;

  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 28, 0.88)';
  ctx.strokeStyle = 'rgba(68, 136, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, boxW, boxH, 6) : ctx.rect(x, y, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#88c0ff';
  ctx.font = "bold 11px monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText("⚙️ DEBUG TELEMETRY (Toggle: `)", x + 10, y + 8);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 24);
  ctx.lineTo(x + boxW - 10, y + 24);
  ctx.stroke();

  ctx.font = "11px monospace";
  ctx.fillStyle = '#c0d8f8';
  ctx.fillText("Velocity:", x + 10, y + 30);
  ctx.fillText("Rope / Stiff:", x + 10, y + 46);
  ctx.fillText("Cur Anchor Dist:", x + 10, y + 62);
  ctx.fillText("Next Anchor Dist:", x + 10, y + 78);
  ctx.fillText("Max Swing Vx:", x + 10, y + 94);
  ctx.fillText("Hook State:", x + 10, y + 110);

  ctx.fillStyle = '#ffe8a0';
  ctx.textAlign = 'right';
  ctx.fillText(`${m.vx.toFixed(1)}, ${m.vy.toFixed(1)} (${m.speed.toFixed(1)})`, x + boxW - 10, y + 30);
  ctx.fillText(m.ropeLength > 0 ? `${Math.round(m.ropeLength)}px / ${m.ropeStiffness}` : "None", x + boxW - 10, y + 46);
  ctx.fillText(m.curAnchorDist !== null ? `${Math.round(m.curAnchorDist)}px` : "N/A", x + boxW - 10, y + 62);
  ctx.fillText(m.nextAnchorDist !== null ? `${Math.round(m.nextAnchorDist)}px` : "None ahead", x + boxW - 10, y + 78);
  ctx.fillText(`${m.maxSwingVx.toFixed(1)} px/f`, x + boxW - 10, y + 94);
  ctx.fillText(m.hookState, x + boxW - 10, y + 110);

  ctx.restore();
}

function _drawStars(ctx, w, h) {
  const camX = camera.x;
  const camY = camera.y;

  for (const layer of stars) {
    const px = layer.parallax;
    ctx.fillStyle = '#ffffff';

    for (const s of layer.stars) {
      const sx = ((s.x - camX * px) % (w * 3) + w * 3) % (w * 3) - w;
      const sy = ((s.y - camY * px * 0.5) % (h * 3) + h * 3) % (h * 3) - h * 0.5;

      if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;

      const twinkle = 0.5 + 0.5 * Math.sin(gameTime * s.twinkleSpeed + s.x);
      ctx.globalAlpha = s.brightness * twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function _drawAnchorArcCircles(ctx) {
  const anchors = getActiveAnchors();
  const bounds = camera.getBounds();
  const ropeRadius = grapplingHook.attachedRopeLength > 0 ? grapplingHook.attachedRopeLength : 200;

  ctx.save();
  ctx.strokeStyle = 'rgba(68, 136, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);

  for (const body of anchors) {
    if (!body.plugin || !body.plugin.grappleable) continue;
    const ax = body.position.x;
    const ay = body.bounds ? body.bounds.min.y : body.position.y;

    if (ax >= bounds.left - 200 && ax <= bounds.right + 200) {
      ctx.beginPath();
      ctx.arc(ax, ay, ropeRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function _drawGround(ctx) {
  const y = GAME_CONFIG.groundY;

  // Dark ground
  ctx.fillStyle = '#080c16';
  ctx.fillRect(-2000, y, 20000, 2000);

  // Ground line glow
  ctx.strokeStyle = 'rgba(40, 60, 100, 0.4)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(40, 60, 100, 0.3)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(-2000, y);
  ctx.lineTo(20000, y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function _drawPauseOverlay(ctx, w, h) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 48px 'Inter', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', w / 2, h / 2 - 20);

  ctx.font = "16px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Press ESC to resume', w / 2, h / 2 + 30);
}

function _drawMoonIndicator(ctx, w, h) {
  if (!moon.body) return;

  const moonWorldX = moon.body.position.x;
  const moonWorldY = moon.body.position.y;
  const bounds = camera.getBounds();

  // Only show if moon is off-screen
  if (moonWorldX > bounds.left && moonWorldX < bounds.right &&
      moonWorldY > bounds.top && moonWorldY < bounds.bottom) return;

  // Direction arrow at screen edge
  const playerPos = player.getPosition();
  const dx = moonWorldX - playerPos.x;
  const dy = moonWorldY - playerPos.y;
  const angle = Math.atan2(dy, dx);

  const indicatorX = w / 2 + Math.cos(angle) * Math.min(w, h) * 0.4;
  const indicatorY = h / 2 + Math.sin(angle) * Math.min(w, h) * 0.35;

  // Clamp to screen
  const ix = Math.max(40, Math.min(w - 40, indicatorX));
  const iy = Math.max(40, Math.min(h - 40, indicatorY));

  ctx.save();
  ctx.translate(ix, iy);
  ctx.rotate(angle);

  // Arrow
  ctx.fillStyle = 'rgba(255, 248, 220, 0.6)';
  ctx.shadowColor = 'rgba(255, 248, 220, 0.4)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, -7);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();

  // Moon emoji/dot
  ctx.fillStyle = '#ffe8c0';
  ctx.beginPath();
  ctx.arc(-14, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
