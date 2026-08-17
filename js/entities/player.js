// ─── PLAYER ───────────────────────────────────────────────────
// Astronaut entity with physics body, boost meter, and rendering.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { addToWorld, removeFromWorld, CATEGORIES } from '../engine/physicsWorld.js';

const { Bodies, Body } = Matter;

class Player {
  constructor() {
    this.body = null;
    this.radius = GAME_CONFIG.playerRadius;
    this.boost = 100;
    this.alive = true;
    this.distanceTraveled = 0;
    this.startX = 0;
    this.isBoosting = false;
    this.boostTimer = 0;
    this.facingX = 1;
  }

  create(x, y) {
    this.startX = x;
    this.body = Bodies.circle(x, y, this.radius, {
      mass: GAME_CONFIG.playerMass,
      friction: 0.0,
      frictionAir: 0.001,
      restitution: 0.1,
      label: 'player',
      collisionFilter: {
        category: CATEGORIES.PLAYER,
        mask: CATEGORIES.GROUND | CATEGORIES.HAZARD | CATEGORIES.ANCHOR,
      },
    });

    addToWorld(this.body);
    this.boost = 100;
    this.alive = true;
    this.distanceTraveled = 0;
    this.isBoosting = false;
    this.boostTimer = 0;
  }

  update(dt) {
    if (!this.alive || !this.body) return;

    // Track distance traveled
    const currentX = this.body.position.x;
    this.distanceTraveled = Math.max(this.distanceTraveled, currentX - this.startX);

    // Boost regeneration (Section 7: never while actively boosting)
    if (!this.isBoosting && this.boost < 100) {
      this.boost = Math.min(100, this.boost + GAME_CONFIG.boostRegenRate * (dt / 1000));
    }

    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.isBoosting = false;
      }
    }

    // Facing direction
    if (this.body.velocity.x > 0.5) this.facingX = 1;
    else if (this.body.velocity.x < -0.5) this.facingX = -1;

    // Cap maximum speed
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > GAME_CONFIG.maxSpeed && Number.isFinite(speed)) {
      const scale = GAME_CONFIG.maxSpeed / speed;
      Body.setVelocity(this.body, {
        x: vx * scale,
        y: vy * scale,
      });
    }
  }

  /** Apply boost impulse in velocity/facing direction (Section 7) */
  applyBoost() {
    if (!this.alive || !this.body) return false;
    if (this.boost < GAME_CONFIG.boostCost) return false;

    this.boost -= GAME_CONFIG.boostCost;
    this.isBoosting = true;
    this.boostTimer = 200;

    let dirX = this.body.velocity.x;
    let dirY = this.body.velocity.y;
    const speed = Math.sqrt(dirX * dirX + dirY * dirY);

    if (speed > 1) {
      dirX /= speed;
      dirY /= speed;
    } else {
      dirX = this.facingX;
      dirY = -0.3;
    }

    const force = GAME_CONFIG.boostForce;
    if (Number.isFinite(dirX) && Number.isFinite(dirY)) {
      Body.setVelocity(this.body, {
        x: this.body.velocity.x + dirX * force,
        y: this.body.velocity.y + dirY * force,
      });
    }

    return true;
  }

  getSpeed() {
    if (!this.body) return 0;
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    return Math.sqrt(vx * vx + vy * vy);
  }

  getPosition() {
    return this.body ? this.body.position : { x: 0, y: 0 };
  }

  die() {
    this.alive = false;
  }

  destroy() {
    if (this.body) {
      removeFromWorld(this.body);
      this.body = null;
    }
  }

  reset(x, y) {
    this.destroy();
    this.create(x, y);
  }

  /** Render procedural astronaut (Section 15.1) */
  draw(ctx) {
    if (!this.body) return;

    const { x, y } = this.body.position;
    const r = this.radius;

    ctx.save();
    ctx.translate(x, y);

    // Boost thruster flames
    if (this.isBoosting) {
      ctx.save();
      const flameDir = -this.facingX;
      ctx.fillStyle = '#ff8844';
      ctx.beginPath();
      ctx.moveTo(flameDir * (r - 2), -4);
      ctx.lineTo(flameDir * (r + 14 + Math.random() * 6), 0);
      ctx.lineTo(flameDir * (r - 2), 4);
      ctx.closePath();
      ctx.fill();

      // Inner flame core
      ctx.fillStyle = '#ffea66';
      ctx.beginPath();
      ctx.moveTo(flameDir * (r - 2), -2);
      ctx.lineTo(flameDir * (r + 8 + Math.random() * 4), 0);
      ctx.lineTo(flameDir * (r - 2), 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Astronaut Suit Body
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#e8eaf0';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Visor
    const visorOffsetX = this.facingX * 3;
    ctx.fillStyle = '#141b2d';
    ctx.beginPath();
    ctx.arc(visorOffsetX, -1, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Visor reflection highlight
    ctx.fillStyle = 'rgba(136, 187, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(visorOffsetX + this.facingX * 2, -3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Backpack
    ctx.fillStyle = '#c5c9d6';
    ctx.fillRect(-this.facingX * (r + 2), -r * 0.6, 4 * this.facingX, r * 1.2);

    ctx.restore();
  }
}

export const player = new Player();
