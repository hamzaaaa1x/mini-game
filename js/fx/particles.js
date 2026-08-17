// ─── PARTICLES ──────────────────────────────────────────────
// Lightweight object-pooled particle system. Fixed-size array,
// never allocates new objects during gameplay.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

const POOL_SIZE = GAME_CONFIG.particlePoolSize;

// Particle pool — pre-allocated
const pool = [];
for (let i = 0; i < POOL_SIZE; i++) {
  pool.push({
    active: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    life: 0, maxLife: 0,
    r: 2,
    color: '#fff',
    alpha: 1,
    type: 'circle',   // 'circle' or 'line'
    lineLen: 4,
  });
}

/**
 * Emit a burst of particles.
 * @param {number} x - Origin X
 * @param {number} y - Origin Y
 * @param {object} opts - Configuration
 */
export function emit(x, y, opts = {}) {
  const {
    count = 8,
    speedMin = 1,
    speedMax = 4,
    color = '#fff',
    lifeMin = 20,
    lifeMax = 40,
    sizeMin = 1.5,
    sizeMax = 3.5,
    spread = Math.PI * 2,
    angle = 0,
    type = 'circle',
    gravity = 0.02,
  } = opts;

  let emitted = 0;
  for (const p of pool) {
    if (emitted >= count) break;
    if (p.active) continue;

    const a = angle + (Math.random() - 0.5) * spread;
    const speed = speedMin + Math.random() * (speedMax - speedMin);

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * speed;
    p.vy = Math.sin(a) * speed;
    p.life = lifeMin + Math.random() * (lifeMax - lifeMin);
    p.maxLife = p.life;
    p.r = sizeMin + Math.random() * (sizeMax - sizeMin);
    p.color = color;
    p.alpha = 1;
    p.type = type;
    p.lineLen = p.r * 2;
    p.gravity = gravity;

    emitted++;
  }
}

/** Pre-built burst presets */
export function emitHookFire(x, y, angle) {
  emit(x, y, {
    count: 5,
    speedMin: 2, speedMax: 5,
    color: '#88bbff',
    lifeMin: 10, lifeMax: 20,
    spread: 0.6,
    angle: angle,
    sizeMin: 1, sizeMax: 2.5,
  });
}

export function emitHookAttach(x, y) {
  emit(x, y, {
    count: 12,
    speedMin: 1, speedMax: 4,
    color: '#aaddff',
    lifeMin: 15, lifeMax: 30,
    sizeMin: 2, sizeMax: 4,
  });
}

export function emitHookRelease(x, y) {
  emit(x, y, {
    count: 6,
    speedMin: 1, speedMax: 3,
    color: '#88aacc',
    lifeMin: 10, lifeMax: 20,
    sizeMin: 1, sizeMax: 2,
  });
}

export function emitBoost(x, y, angle) {
  emit(x, y, {
    count: 15,
    speedMin: 3, speedMax: 7,
    color: '#ff8844',
    lifeMin: 15, lifeMax: 35,
    spread: 0.8,
    angle: angle + Math.PI,  // behind the player
    sizeMin: 2, sizeMax: 5,
  });
  // Inner hot particles
  emit(x, y, {
    count: 6,
    speedMin: 2, speedMax: 5,
    color: '#ffcc44',
    lifeMin: 8, lifeMax: 18,
    spread: 0.4,
    angle: angle + Math.PI,
    sizeMin: 1.5, sizeMax: 3,
  });
}

export function emitSteal(x, y) {
  emit(x, y, {
    count: 40,
    speedMin: 2, speedMax: 10,
    color: '#ffeeaa',
    lifeMin: 30, lifeMax: 60,
    sizeMin: 2, sizeMax: 6,
  });
  emit(x, y, {
    count: 20,
    speedMin: 1, speedMax: 6,
    color: '#88ccff',
    lifeMin: 20, lifeMax: 50,
    sizeMin: 3, sizeMax: 7,
  });
}

export function emitDeath(x, y) {
  emit(x, y, {
    count: 20,
    speedMin: 2, speedMax: 8,
    color: '#ff4444',
    lifeMin: 20, lifeMax: 45,
    sizeMin: 2, sizeMax: 5,
  });
}

/** Update all active particles */
export function updateParticles(dt) {
  const dtScale = dt / 16.67;
  for (const p of pool) {
    if (!p.active) continue;

    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;
    p.vy += (p.gravity || 0.02) * dtScale;
    p.life -= dtScale;
    p.alpha = Math.max(0, p.life / p.maxLife);

    if (p.life <= 0) {
      p.active = false;
    }
  }
}

/** Draw all active particles */
export function drawParticles(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; // additive blend

  for (const p of pool) {
    if (!p.active) continue;

    ctx.globalAlpha = p.alpha * 0.8;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.r * 2;

    if (p.type === 'line') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.r * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * p.lineLen * 0.3, p.y - p.vy * p.lineLen * 0.3);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/** Clear all particles */
export function clearParticles() {
  for (const p of pool) {
    p.active = false;
  }
}
