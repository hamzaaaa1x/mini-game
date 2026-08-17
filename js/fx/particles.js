// ─── PARTICLES ──────────────────────────────────────────────
// Object-pooled particle system (Section 14 & 15.5 of spec).
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

const POOL_SIZE = GAME_CONFIG.particlePoolSize || 100;
const pool = [];

for (let i = 0; i < POOL_SIZE; i++) {
  pool.push({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    size: 2,
    color: '#ffffff',
    alpha: 1,
  });
}

function spawn(x, y, vx, vy, life, size, color) {
  for (const p of pool) {
    if (!p.active) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.alpha = 1;
      return;
    }
  }
}

export function updateParticles(dt) {
  const dtSec = dt / 1000;
  for (const p of pool) {
    if (!p.active) continue;

    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }

    p.x += p.vx * dtSec * 60;
    p.y += p.vy * dtSec * 60;
    p.alpha = Math.max(0, p.life / p.maxLife);
  }
}

export function drawParticles(ctx) {
  for (const p of pool) {
    if (!p.active) continue;

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function clearParticles() {
  for (const p of pool) p.active = false;
}

export function emitBoost(x, y, dirX, dirY) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 0.6;
    const speed = -(2 + Math.random() * 4);
    spawn(
      x + (Math.random() - 0.5) * 6,
      y + (Math.random() - 0.5) * 6,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      200 + Math.random() * 150,
      2 + Math.random() * 2,
      Math.random() > 0.4 ? '#ff8844' : '#ffea66'
    );
  }
}

export function emitHookAttach(x, y) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    spawn(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      180 + Math.random() * 100,
      1.5 + Math.random() * 1.5,
      '#ffe4a0'
    );
  }
}

export function emitSteal(x, y) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    spawn(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      600 + Math.random() * 400,
      2.5 + Math.random() * 3,
      Math.random() > 0.5 ? '#fff8dc' : '#88bbff'
    );
  }
}
