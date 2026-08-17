// ─── MOON ───────────────────────────────────────────────────
// Moon entity with gravity field, grapple target, and craters (Section 9).
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { addToWorld, removeFromWorld, addConstraint, removeConstraint, CATEGORIES } from '../engine/physicsWorld.js';

const { Bodies, Body, Constraint } = Matter;

class Moon {
  constructor() {
    this.body = null;
    this.x = GAME_CONFIG.moonDistance;
    this.y = 200;
    this.radius = GAME_CONFIG.moonRadius;
    this.stolen = false;
    this.escapeConstraint = null;

    // Deterministic craters (Section 15.4: cached once, not randomized every frame)
    this.craters = [
      { ox: -30, oy: -20, r: 18 },
      { ox: 20,  oy: -40, r: 14 },
      { ox: -10, oy: 30,  r: 22 },
      { ox: 40,  oy: 15,  r: 12 },
      { ox: -45, oy: 10,  r: 10 },
      { ox: 15,  oy: 45,  r: 16 },
    ];
  }

  create(x, y) {
    this.x = x;
    this.y = y;
    this.stolen = false;

    this.body = Bodies.circle(x, y, this.radius, {
      isStatic: true,
      label: 'moon',
      collisionFilter: {
        category: CATEGORIES.ANCHOR,
        mask: CATEGORIES.HOOK_TIP,
      },
      plugin: {
        grappleable: false, // only becomes grappleable in approach radius (Section 9)
        type: 'moon',
      },
    });

    addToWorld(this.body);
  }

  update(playerPos) {
    if (!this.body) return;

    // Apply gentle gravity pull within moonGravityRadius (Section 9)
    const dx = this.x - playerPos.x;
    const dy = this.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < GAME_CONFIG.moonGravityRadius && dist > 10 && !this.stolen) {
      const pullForce = GAME_CONFIG.moonPullForce;
      const fx = (dx / dist) * pullForce;
      const fy = (dy / dist) * pullForce;

      if (Number.isFinite(fx) && Number.isFinite(fy)) {
        // Body will receive pull in physicsWorld step
      }
    }

    // Enable grapple when within approach radius
    if (this.body.plugin) {
      this.body.plugin.grappleable = dist < GAME_CONFIG.moonApproachRadius || this.stolen;
    }
  }

  /** Attach moon to player for escape mode (Section 11) */
  attachToPlayer(playerBody) {
    this.stolen = true;
    if (this.body) {
      Body.setStatic(this.body, false);
      Body.setMass(this.body, 5);

      this.escapeConstraint = Constraint.create({
        bodyA: playerBody,
        bodyB: this.body,
        length: 140,
        stiffness: 0.15,
        damping: 0.05,
        render: { visible: false },
      });

      addConstraint(this.escapeConstraint);
    }
  }

  reset(x, y) {
    this.destroy();
    this.create(x, y);
  }

  destroy() {
    if (this.escapeConstraint) {
      removeConstraint(this.escapeConstraint);
      this.escapeConstraint = null;
    }
    if (this.body) {
      removeFromWorld(this.body);
      this.body = null;
    }
  }

  draw(ctx) {
    const curX = this.body ? this.body.position.x : this.x;
    const curY = this.body ? this.body.position.y : this.y;
    const r = this.radius;

    ctx.save();
    ctx.translate(curX, curY);

    // Outer warm glow (Section 15.4)
    ctx.shadowColor = 'rgba(255, 248, 220, 0.4)';
    ctx.shadowBlur = 40;

    // Moon circle with radial gradient
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#f4eedb');
    grad.addColorStop(1, '#d8d0ba');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Craters
    ctx.fillStyle = 'rgba(160, 150, 130, 0.35)';
    for (const c of this.craters) {
      ctx.beginPath();
      ctx.arc(c.ox, c.oy, c.r, 0, Math.PI * 2);
      ctx.fill();

      // Inner shadow for crater depth
      ctx.strokeStyle = 'rgba(110, 100, 85, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}

export const moon = new Moon();
