// ─── GRAPPLING HOOK ─────────────────────────────────────────
// The most important system in the game. Hook state machine,
// rope constraint, velocity preservation on release.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { addConstraint, removeConstraint, getAllBodies } from '../engine/physicsWorld.js';

const { Constraint, Body } = Matter;

// Hook states
export const HOOK_STATES = {
  IDLE:      'IDLE',
  FIRING:    'FIRING',
  ATTACHED:  'ATTACHED',
  SWINGING:  'SWINGING',
  RELEASING: 'RELEASING',
  FLYING:    'FLYING',
};

class GrapplingHook {
  constructor() {
    this.state = HOOK_STATES.IDLE;
    this.tipX = 0;
    this.tipY = 0;
    this.dirX = 0;
    this.dirY = 0;
    this.distanceTraveled = 0;
    this.constraint = null;
    this.anchorBody = null;
    this.anchorPoint = null;
    this.swingStartTime = 0;
    this.playerBody = null;

    // Debug & physics metrics
    this.attachedRopeLength = 0;
    this.maxSwingVx = 0;

    // Swing pump input: -1 = left, 0 = none, +1 = right
    this.pumpInput = 0;

    // Callbacks
    this.onAttach = null;
    this.onRelease = null;
    this.onMiss = null;
  }

  /** Initialize with a reference to the player body */
  init(playerBody) {
    this.playerBody = playerBody;
  }

  /**
   * Fire the hook toward a world position.
   * Can fire from IDLE, FLYING, or FIRING (cancels current fire).
   * This ensures immediate re-grappling at all times.
   */
  fire(targetX, targetY) {
    // Allow firing from any non-swinging state for instant re-grapple
    if (this.state === HOOK_STATES.SWINGING) return; // can't fire while attached
    if (!this.playerBody) return;

    // If we were in FIRING state, just redirect the hook
    // If RELEASING/FLYING, cancel and fire fresh
    if (this.state === HOOK_STATES.RELEASING || this.state === HOOK_STATES.FLYING) {
      this.state = HOOK_STATES.IDLE;
    }

    const px = this.playerBody.position.x;
    const py = this.playerBody.position.y;

    const dx = targetX - px;
    const dy = targetY - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    this.dirX = dx / dist;
    this.dirY = dy / dist;
    this.tipX = px;
    this.tipY = py;
    this.distanceTraveled = 0;
    this.state = HOOK_STATES.FIRING;
  }

  /** Set swing pump direction: -1 left, 0 none, +1 right */
  setPumpInput(dir) {
    this.pumpInput = dir;
  }

  /** Update hook each frame */
  update(dt) {
    if (this.state === HOOK_STATES.FIRING) {
      this._updateFiring(dt);
    } else if (this.state === HOOK_STATES.SWINGING) {
      this._updateSwinging(dt);
    } else if (this.state === HOOK_STATES.RELEASING) {
      // Immediately transition to IDLE so player can re-grapple
      this.state = HOOK_STATES.IDLE;
    } else if (this.state === HOOK_STATES.FLYING) {
      // Immediately transition to IDLE so player can re-grapple
      this.state = HOOK_STATES.IDLE;
    }
  }

  _updateFiring(dt) {
    const speed = GAME_CONFIG.hookSpeed;
    const step = speed * (dt / 16.67); // normalize to ~60fps

    this.tipX += this.dirX * step;
    this.tipY += this.dirY * step;
    this.distanceTraveled += step;

    // Check if we've exceeded grapple range
    if (this.distanceTraveled >= GAME_CONFIG.grappleRange) {
      this.state = HOOK_STATES.IDLE;
      if (this.onMiss) this.onMiss();
      return;
    }

    // Check for collision with grappleable bodies
    const hit = this._findHitAnchor();
    if (hit) {
      this._attachTo(hit.body, hit.point);
    }
  }

  _findHitAnchor() {
    const bodies = getAllBodies();
    const tipRadius = 14;  // generous hit detection for easier grappling

    for (const body of bodies) {
      if (body.label === 'player' || body.label === 'ground') continue;
      if (!body.plugin || !body.plugin.grappleable) continue;

      // Use bounds for better hit detection on large objects
      const bounds = body.bounds;
      const closestX = Math.max(bounds.min.x, Math.min(this.tipX, bounds.max.x));
      const closestY = Math.max(bounds.min.y, Math.min(this.tipY, bounds.max.y));

      const dx = this.tipX - closestX;
      const dy = this.tipY - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < tipRadius * tipRadius) {
        // Hit! Attach to the TOP of the body for better swing arcs
        const attachY = Math.min(closestY, bounds.min.y + 10);
        return {
          body,
          point: { x: closestX, y: attachY },
        };
      }
    }
    return null;
  }

  _attachTo(body, point) {
    if (!this.playerBody) return;

    const px = this.playerBody.position.x;
    const py = this.playerBody.position.y;

    const dx = point.x - px;
    const dy = point.y - py;
    const length = Math.sqrt(dx * dx + dy * dy);

    this.attachedRopeLength = length;
    this.maxSwingVx = Math.max(0, this.playerBody.velocity.x);

    // Create constraint — pendulum physics
    this.constraint = Constraint.create({
      bodyA: this.playerBody,
      pointB: { x: point.x, y: point.y },
      length: length,
      stiffness: GAME_CONFIG.ropeStiffness,
      damping: 0.005,   // minimal damping to preserve swing energy
      render: { visible: false },
    });

    addConstraint(this.constraint);

    this.anchorBody = body;
    this.anchorPoint = point;
    this.swingStartTime = performance.now();
    this.state = HOOK_STATES.SWINGING;

    if (this.onAttach) this.onAttach(body, point);
  }

  _updateSwinging(dt) {
    if (this.playerBody) {
      this.maxSwingVx = Math.max(this.maxSwingVx, this.playerBody.velocity.x);
    }

    // Safety net: auto-release if swinging too long
    const elapsed = performance.now() - this.swingStartTime;
    if (elapsed > GAME_CONFIG.maxSwingDuration) {
      this.release();
      return;
    }

    // Update anchor point for kinematic bodies that move
    if (this.anchorBody && this.constraint && this.anchorBody.plugin && this.anchorBody.plugin.moving) {
      this.constraint.pointB = {
        x: this.anchorBody.position.x,
        y: this.anchorBody.position.y,
      };
    }

    // ── Swing pump ──
    // Apply a small tangential force based on player input (A/D keys or mouse position)
    if (this.pumpInput !== 0 && this.playerBody && this.anchorPoint) {
      const px = this.playerBody.position.x;
      const py = this.playerBody.position.y;
      const ax = this.anchorPoint.x;
      const ay = this.anchorPoint.y;

      // Direction from anchor to player
      const dx = px - ax;
      const dy = py - ay;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        // Tangential direction (perpendicular to rope, in the pump direction)
        const tangentX = -dy / dist * this.pumpInput;
        const tangentY =  dx / dist * this.pumpInput;

        const force = GAME_CONFIG.swingPumpForce || 0.0015;
        if (!Number.isFinite(tangentX) || !Number.isFinite(tangentY) || !Number.isFinite(force)) return;
        Body.applyForce(this.playerBody, this.playerBody.position, {
          x: tangentX * force,
          y: tangentY * force,
        });
      }
    }
  }

  /** Release the hook with forward release velocity assist */
  release() {
    if (this.state !== HOOK_STATES.SWINGING && this.state !== HOOK_STATES.ATTACHED) return;

    if (this.playerBody) {
      const vel = this.playerBody.velocity;
      // Step 2: Release Velocity Assist
      // If the player is swinging or pointed forward, assist their forward launch
      if (vel.x > 0.1 || this.maxSwingVx > 0.5) {
        const currentVx = Math.max(vel.x, this.maxSwingVx * 0.75, 0);
        const boostedVx = Math.max(
          currentVx * (GAME_CONFIG.releaseAssistMultiplier || 1.35),
          GAME_CONFIG.releaseForwardAssistMin || 9.0
        );
        const liftVy = Math.min(vel.y, GAME_CONFIG.releaseUpwardLift || -3.5);

        Body.setVelocity(this.playerBody, {
          x: boostedVx,
          y: liftVy,
        });
      }
    }

    // Remove the constraint
    if (this.constraint) {
      removeConstraint(this.constraint);
      this.constraint = null;
    }

    this.anchorBody = null;
    this.anchorPoint = null;
    this.pumpInput = 0;
    this.state = HOOK_STATES.RELEASING;

    if (this.onRelease) this.onRelease();
  }

  /** Cancel the hook (on death, restart, etc.) */
  cancel() {
    if (this.constraint) {
      removeConstraint(this.constraint);
      this.constraint = null;
    }
    this.anchorBody = null;
    this.anchorPoint = null;
    this.pumpInput = 0;
    this.state = HOOK_STATES.IDLE;
  }

  /** Draw the rope, hook tip, and faint swing arc circle */
  draw(ctx) {
    if (!this.playerBody) return;

    const px = this.playerBody.position.x;
    const py = this.playerBody.position.y;

    // Draw faint swing arc circle for the active anchor
    if (this.state === HOOK_STATES.SWINGING && this.anchorPoint && this.attachedRopeLength > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(this.anchorPoint.x, this.anchorPoint.y, this.attachedRopeLength, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (this.state === HOOK_STATES.FIRING) {
      // Draw firing line
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(150, 200, 255, 0.5)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(this.tipX, this.tipY);
      ctx.stroke();

      // Hook tip dot
      ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(this.tipX, this.tipY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.state === HOOK_STATES.SWINGING && this.anchorPoint) {
      // Draw rope with slight sag
      ctx.save();
      ctx.strokeStyle = 'rgba(220, 235, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(150, 200, 255, 0.4)';
      ctx.shadowBlur = 6;

      const ax = this.anchorPoint.x;
      const ay = this.anchorPoint.y;

      // Quadratic curve for rope sag
      const midX = (px + ax) / 2;
      const midY = (py + ay) / 2 + 15; // slight sag

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(midX, midY, ax, ay);
      ctx.stroke();

      // Anchor point glow
      ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /** Is the hook currently attached? */
  isAttached() {
    return this.state === HOOK_STATES.SWINGING || this.state === HOOK_STATES.ATTACHED;
  }

  /** Reset */
  reset() {
    this.cancel();
    this.attachedRopeLength = 0;
    this.maxSwingVx = 0;
    this.state = HOOK_STATES.IDLE;
  }
}

export const grapplingHook = new GrapplingHook();
