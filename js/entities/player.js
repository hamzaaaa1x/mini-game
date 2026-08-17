// ─── PLAYER ─────────────────────────────────────────────────
// Astronaut body + rendering. Governed entirely by physics:
// gravity, hook constraint, momentum, and boost impulses.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { addToWorld, removeFromWorld, CATEGORIES } from '../engine/physicsWorld.js';

const { Bodies, Body } = Matter;

class Player {
  constructor() {
    this.body = null;
    this.boost = 100;          // 0–100
    this.isBoosting = false;
    this.alive = true;
    this.facingRight = true;
    this.distanceTraveled = 0;
    this.startX = 0;
    this.maxSpeed = 0;
    this.grappleCount = 0;
    this.chainCount = 0;
    this.currentChain = 0;
    this.escapeMode = false;
  }

  create(x, y) {
    this.body = Bodies.circle(x, y, GAME_CONFIG.playerRadius, {
      mass: GAME_CONFIG.playerMass,
      friction: 0.01,
      frictionAir: 0.002,
      restitution: 0.1,
      label: 'player',
      collisionFilter: {
        category: CATEGORIES.PLAYER,
        mask: CATEGORIES.GROUND | CATEGORIES.ANCHOR | CATEGORIES.HAZARD,
      },
    });
    // Manually set mass since Matter.js calculates from density
    Body.setMass(this.body, GAME_CONFIG.playerMass);

    addToWorld(this.body);
    this.alive = true;
    this.boost = 100;
    this.startX = x;
    this.distanceTraveled = 0;
    this.maxSpeed = 0;
    this.grappleCount = 0;
    this.chainCount = 0;
    this.currentChain = 0;
    this.escapeMode = false;
  }

  update(dt) {
    if (!this.body || !this.alive) return;

    const vel = this.body.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

    // Track facing direction
    if (Math.abs(vel.x) > 0.5) {
      this.facingRight = vel.x > 0;
    }

    // Track max speed
    if (speed > this.maxSpeed) {
      this.maxSpeed = speed;
    }

    // Update distance
    this.distanceTraveled = Math.max(0, this.body.position.x - this.startX);

    // Clamp max speed
    if (speed > GAME_CONFIG.maxSpeed) {
      const scale = GAME_CONFIG.maxSpeed / speed;
      Body.setVelocity(this.body, {
        x: vel.x * scale,
        y: vel.y * scale,
      });
    }

    // Regenerate boost (never while actively boosting)
    if (!this.isBoosting && this.boost < 100) {
      this.boost = Math.min(100, this.boost + GAME_CONFIG.boostRegenRate * (dt / 1000));
    }
  }

  /**
   * Permanent Air Control (Step 2):
   * Continuous horizontal drift when holding A/D or Left/Right arrows.
   * Works while FLYING, FALLING, or SWINGING.
   */
  applyAirControl(dir, dt) {
    if (!this.body || !this.alive || dir === 0) return;

    const force = (GAME_CONFIG.airControlForce || 0.0018);
    Body.applyForce(this.body, this.body.position, {
      x: dir * force,
      y: 0,
    });

    // Provide immediate responsive velocity drift if speed in that direction is low
    const maxVx = (GAME_CONFIG.airControlMaxVx || 12.0);
    const curVx = this.body.velocity.x;
    if ((dir > 0 && curVx < maxVx) || (dir < 0 && curVx > -maxVx)) {
      const nudge = dir * 0.18 * (dt / 16.67);
      Body.setVelocity(this.body, {
        x: Math.max(-maxVx, Math.min(maxVx, curVx + nudge)),
        y: this.body.velocity.y,
      });
    }

    if (dir !== 0) {
      this.facingRight = dir > 0;
    }
  }

  /** Apply boost impulse in velocity direction */
  applyBoost() {
    if (!this.body || !this.alive) return false;
    if (this.boost < GAME_CONFIG.boostCost) return false;

    this.boost -= GAME_CONFIG.boostCost;

    const vel = this.body.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

    let dirX, dirY;
    if (speed > 0.5) {
      dirX = vel.x / speed;
      dirY = vel.y / speed;
    } else {
      dirX = this.facingRight ? 1 : -1;
      dirY = -0.3;
    }

    const force = GAME_CONFIG.boostForce * 0.001;
    Body.applyForce(this.body, this.body.position, {
      x: dirX * force,
      y: dirY * force,
    });

    return true;
  }

  /** Enter escape mode — heavier movement */
  enterEscapeMode() {
    if (!this.body) return;
    this.escapeMode = true;
    Body.setMass(this.body, GAME_CONFIG.playerMass * GAME_CONFIG.escapeMassMultiplier);
  }

  /** Get current speed */
  getSpeed() {
    if (!this.body) return 0;
    const vel = this.body.velocity;
    return Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  }

  /** Get position */
  getPosition() {
    return this.body ? this.body.position : { x: 0, y: 0 };
  }

  /** Kill the player */
  die() {
    this.alive = false;
    this.currentChain = 0;
  }

  /** Draw the astronaut procedurally */
  draw(ctx) {
    if (!this.body) return;

    const { x, y } = this.body.position;
    const r = GAME_CONFIG.playerRadius;

    ctx.save();
    ctx.translate(x, y);

    // Drop shadow
    ctx.shadowColor = 'rgba(100, 180, 255, 0.4)';
    ctx.shadowBlur = 12;

    // Body (rounded rect approximation using arc)
    ctx.fillStyle = '#e8eaf0';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Suit lines
    ctx.strokeStyle = '#bcc0cc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Visor
    const visorOffX = this.facingRight ? r * 0.25 : -r * 0.25;
    ctx.fillStyle = '#3a5f8a';
    ctx.beginPath();
    ctx.arc(visorOffX, -r * 0.15, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Visor reflection
    ctx.fillStyle = 'rgba(150, 220, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(visorOffX + r * 0.12, -r * 0.3, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Thruster flames during boost
    if (this.isBoosting) {
      const flameDir = this.facingRight ? -1 : 1;
      ctx.fillStyle = '#ff8844';
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.moveTo(flameDir * r, -r * 0.3);
      ctx.lineTo(flameDir * (r + 8 + Math.random() * 6), 0);
      ctx.lineTo(flameDir * r, r * 0.3);
      ctx.fill();

      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.moveTo(flameDir * r, -r * 0.15);
      ctx.lineTo(flameDir * (r + 4 + Math.random() * 4), 0);
      ctx.lineTo(flameDir * r, r * 0.15);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /** Clean up */
  destroy() {
    if (this.body) {
      removeFromWorld(this.body);
      this.body = null;
    }
  }

  /** Reset for a new run */
  reset(x, y) {
    this.destroy();
    this.create(x, y);
  }
}

export const player = new Player();
