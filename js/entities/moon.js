// ─── MOON ───────────────────────────────────────────────────
// The hero object. Gravity field, grapple activation, steal
// trigger, and procedural drawing with cached craters.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { addToWorld, removeFromWorld, addConstraint, removeConstraint, CATEGORIES } from '../engine/physicsWorld.js';

const { Bodies, Body, Constraint } = Matter;

class Moon {
  constructor() {
    this.body = null;
    this.x = 0;
    this.y = 0;
    this.radius = GAME_CONFIG.moonRadius;
    this.craters = [];        // cached crater data
    this.stolen = false;
    this.tether = null;       // constraint to player during escape
    this.glowPhase = 0;       // for pulsing glow animation
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
        mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
      },
      plugin: {
        grappleable: false,   // starts ungrappleable — activated when close
        type: 'moon',
        moving: false,
        dangerous: false,
      },
    });

    addToWorld(this.body);

    // Generate cached craters (random but deterministic per run)
    this._generateCraters();
  }

  _generateCraters() {
    this.craters = [];
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.radius * 0.7;
      this.craters.push({
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        r: 6 + Math.random() * 15,
        shade: 0.05 + Math.random() * 0.1,
      });
    }
  }

  /**
   * Update moon logic each frame.
   * Returns a force vector to apply to the player if within gravity radius.
   */
  update(playerPos) {
    if (!this.body) return null;

    this.glowPhase += 0.02;

    const dx = this.x - playerPos.x;
    const dy = this.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Activate grapple point when player is close enough
    if (dist < GAME_CONFIG.moonApproachRadius && !this.stolen) {
      this.body.plugin.grappleable = true;
    } else if (dist > GAME_CONFIG.moonApproachRadius + 100) {
      this.body.plugin.grappleable = false;
    }

    // Gravity field pull
    if (dist < GAME_CONFIG.moonGravityRadius && dist > 10) {
      const force = GAME_CONFIG.moonPullForce;
      return {
        x: (dx / dist) * force,
        y: (dy / dist) * force,
      };
    }

    return null;
  }

  /** Called when player grapples the moon — triggers steal */
  steal() {
    this.stolen = true;
    if (this.body) {
      this.body.plugin.grappleable = false;
      Body.setStatic(this.body, false);
    }
  }

  /** Attach moon to player for escape mode */
  attachToPlayer(playerBody) {
    if (!this.body || !playerBody) return;

    Body.setStatic(this.body, false);
    Body.setMass(this.body, 0.5);

    this.tether = Constraint.create({
      bodyA: playerBody,
      bodyB: this.body,
      length: 60,
      stiffness: 0.6,
      damping: 0.1,
      render: { visible: false },
    });

    addConstraint(this.tether);
  }

  /** Draw the moon procedurally */
  draw(ctx) {
    const x = this.body ? this.body.position.x : this.x;
    const y = this.body ? this.body.position.y : this.y;
    const r = this.radius;

    ctx.save();

    // Outer glow (pulsing)
    const glowSize = 30 + Math.sin(this.glowPhase) * 8;
    ctx.shadowColor = 'rgba(255, 248, 220, 0.5)';
    ctx.shadowBlur = glowSize;

    // Main body — radial gradient
    const grad = ctx.createRadialGradient(
      x - r * 0.15, y - r * 0.15, r * 0.1,
      x, y, r
    );
    grad.addColorStop(0, '#f5f0e8');
    grad.addColorStop(0.6, '#e0d8c8');
    grad.addColorStop(1, '#c8bca8');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Craters
    for (const c of this.craters) {
      ctx.fillStyle = `rgba(0, 0, 0, ${c.shade})`;
      ctx.beginPath();
      ctx.arc(x + c.ox, y + c.oy, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grapple indicator when active
    if (this.body && this.body.plugin.grappleable && !this.stolen) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tether line during escape
    if (this.tether && this.tether.bodyA) {
      ctx.strokeStyle = 'rgba(255, 220, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 200, 100, 0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(this.tether.bodyA.position.x, this.tether.bodyA.position.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** Clean up */
  destroy() {
    if (this.tether) {
      removeConstraint(this.tether);
      this.tether = null;
    }
    if (this.body) {
      removeFromWorld(this.body);
      this.body = null;
    }
    this.stolen = false;
  }

  reset(x, y) {
    this.destroy();
    this.create(x, y);
  }
}

export const moon = new Moon();
