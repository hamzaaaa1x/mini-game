// ─── GRAPPLING HOOK ─────────────────────────────────────────
// Hook state machine, raycast travel, pendulum constraint (Section 5).
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { addConstraint, removeConstraint, getAllBodies } from '../engine/physicsWorld.js';

const { Constraint, Body } = Matter;

export const HOOK_STATES = {
  IDLE:      'IDLE',
  FIRING:    'FIRING',
  ATTACHED:  'ATTACHED',
  SWINGING:  'SWINGING',
  FLYING:    'FLYING',
};

class GrapplingHook {
  constructor() {
    this.state = HOOK_STATES.IDLE;
    this.playerBody = null;

    // Firing line state
    this.tipX = 0;
    this.tipY = 0;
    this.dirX = 0;
    this.dirY = 0;
    this.distanceTraveled = 0;

    // Attached anchor state
    this.anchorBody = null;
    this.anchorPoint = null;
    this.attachedRopeLength = 0;
    this.constraint = null;
    this.attachTime = 0;

    // Callbacks
    this.onAttach = null;
    this.onMiss = null;
    this.onRelease = null;
  }

  init(playerBody) {
    this.playerBody = playerBody;
    this.reset();
  }

  fire(targetX, targetY) {
    // Only 1 hook at a time (Section 5.3)
    if (this.state === HOOK_STATES.SWINGING || this.state === HOOK_STATES.ATTACHED) return;
    if (!this.playerBody) return;

    const pPos = this.playerBody.position;
    const dx = targetX - pPos.x;
    const dy = targetY - pPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    this.dirX = dx / dist;
    this.dirY = dy / dist;
    this.tipX = pPos.x;
    this.tipY = pPos.y;
    this.distanceTraveled = 0;
    this.state = HOOK_STATES.FIRING;
  }

  update(dt) {
    if (!this.playerBody) return;

    switch (this.state) {
      case HOOK_STATES.FIRING:
        this._updateFiring(dt);
        break;

      case HOOK_STATES.SWINGING:
      case HOOK_STATES.ATTACHED:
        this._updateSwinging();
        break;

      case HOOK_STATES.FLYING:
        // Free flight after release until idle/re-hook
        break;
    }
  }

  _updateFiring(dt) {
    const step = GAME_CONFIG.hookSpeed * (dt / 16.67);
    const steps = 4;
    const subStep = step / steps;

    for (let i = 0; i < steps; i++) {
      this.tipX += this.dirX * subStep;
      this.tipY += this.dirY * subStep;
      this.distanceTraveled += subStep;

      // Check collision with grappleable anchor
      const hit = this._findHitAnchor(this.tipX, this.tipY);
      if (hit) {
        this._attachTo(hit.body, hit.point);
        return;
      }

      // Range check
      if (this.distanceTraveled >= GAME_CONFIG.grappleRange) {
        this.state = HOOK_STATES.IDLE;
        if (this.onMiss) this.onMiss();
        return;
      }
    }
  }

  _findHitAnchor(x, y) {
    const bodies = getAllBodies ? getAllBodies() : [];
    const point = { x, y };

    for (const body of bodies) {
      if (!body.plugin || !body.plugin.grappleable) continue;

      // Check bounds first
      const b = body.bounds;
      if (x < b.min.x - 10 || x > b.max.x + 10 || y < b.min.y - 10 || y > b.max.y + 10) {
        continue;
      }

      // Check polygon intersection or circle radius
      if (Matter.Vertices && body.vertices) {
        if (Matter.Vertices.contains(body.vertices, point)) {
          return { body, point: { x: body.position.x, y: body.position.y } };
        }
      }

      // Fallback center-distance
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const r = body.circleRadius || 30;
      if (dx * dx + dy * dy < r * r) {
        return { body, point: { x: body.position.x, y: body.position.y } };
      }
    }

    return null;
  }

  _attachTo(body, point) {
    this.anchorBody = body;
    this.anchorPoint = { x: point.x, y: point.y };
    this.attachTime = performance.now();

    const pPos = this.playerBody.position;
    const dx = point.x - pPos.x;
    const dy = point.y - pPos.y;
    this.attachedRopeLength = Math.max(Math.sqrt(dx * dx + dy * dy), 20);

    // Section 5.2 Step 4: Matter.js Constraint
    this.constraint = Constraint.create({
      bodyA: this.playerBody,
      pointA: { x: 0, y: 0 },
      bodyB: body.isStatic ? null : body,
      pointB: body.isStatic ? { x: point.x, y: point.y } : { x: 0, y: 0 },
      length: this.attachedRopeLength,
      stiffness: GAME_CONFIG.ropeStiffness,
      damping: 0.01,
      render: { visible: false },
    });

    addConstraint(this.constraint);
    this.state = HOOK_STATES.SWINGING;

    if (this.onAttach) {
      this.onAttach(body, point);
    }
  }

  _updateSwinging() {
    // Section 5.2 Step 6: maxSwingDuration safety net
    if (performance.now() - this.attachTime > GAME_CONFIG.maxSwingDuration) {
      this.release();
      return;
    }

    // Keep dynamic anchor position updated
    if (this.anchorBody && !this.anchorBody.isStatic) {
      this.anchorPoint = {
        x: this.anchorBody.position.x,
        y: this.anchorBody.position.y,
      };
    }
  }

  /** Release hook and fully preserve momentum (Section 5.2 Step 6) */
  release() {
    if (this.state !== HOOK_STATES.SWINGING && this.state !== HOOK_STATES.ATTACHED) return;

    if (this.constraint) {
      removeConstraint(this.constraint);
      this.constraint = null;
    }

    this.anchorBody = null;
    this.anchorPoint = null;
    this.attachedRopeLength = 0;
    this.state = HOOK_STATES.FLYING;

    if (this.onRelease) {
      this.onRelease();
    }
  }

  cancel() {
    if (this.constraint) {
      removeConstraint(this.constraint);
      this.constraint = null;
    }
    this.reset();
  }

  reset() {
    if (this.constraint) {
      removeConstraint(this.constraint);
      this.constraint = null;
    }
    this.state = HOOK_STATES.IDLE;
    this.anchorBody = null;
    this.anchorPoint = null;
    this.attachedRopeLength = 0;
  }

  isAttached() {
    return this.state === HOOK_STATES.SWINGING || this.state === HOOK_STATES.ATTACHED;
  }

  draw(ctx) {
    if (!this.playerBody) return;
    const pPos = this.playerBody.position;

    // Firing line
    if (this.state === HOOK_STATES.FIRING) {
      ctx.save();
      ctx.strokeStyle = '#e8f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(200, 225, 255, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(pPos.x, pPos.y);
      ctx.lineTo(this.tipX, this.tipY);
      ctx.stroke();

      // Hook tip head
      ctx.fillStyle = '#88bbff';
      ctx.beginPath();
      ctx.arc(this.tipX, this.tipY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Swinging rope (Section 15.3)
    if (this.isAttached() && this.anchorPoint) {
      ctx.save();
      ctx.strokeStyle = 'rgba(240, 246, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.moveTo(pPos.x, pPos.y);
      ctx.lineTo(this.anchorPoint.x, this.anchorPoint.y);
      ctx.stroke();

      // Anchor attachment glow ring
      ctx.fillStyle = '#ffe4a0';
      ctx.beginPath();
      ctx.arc(this.anchorPoint.x, this.anchorPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export const grapplingHook = new GrapplingHook();
