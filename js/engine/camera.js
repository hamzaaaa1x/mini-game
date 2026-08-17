// ─── CAMERA ─────────────────────────────────────────────────
// Smooth-follow camera with lerp, speed-based zoom, and shake.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = GAME_CONFIG.baseZoom;
    this.targetZoom = GAME_CONFIG.baseZoom;

    // Shake
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeIntensity = 0;

    // Viewport dimensions
    this.viewWidth = GAME_CONFIG.canvasWidth;
    this.viewHeight = GAME_CONFIG.canvasHeight;
  }

  /** Update camera to follow a target position */
  update(targetX, targetY, speed = 0) {
    const lerp = GAME_CONFIG.cameraLerpFactor;

    // Center target on screen
    this.x += (targetX - this.viewWidth / 2 - this.x) * lerp;
    this.y += (targetY - this.viewHeight / 2 - this.y) * lerp;

    // Speed-based zoom (Section 12)
    if (speed > GAME_CONFIG.highSpeedThreshold) {
      this.targetZoom = GAME_CONFIG.highSpeedZoom;
    } else {
      this.targetZoom = GAME_CONFIG.baseZoom;
    }
    this.zoom += (this.targetZoom - this.zoom) * GAME_CONFIG.zoomLerpFactor;

    // Shake decay
    if (this.shakeIntensity > 0.1) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity *= 0.92;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeIntensity = 0;
    }
  }

  shake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  setZoom(z) {
    this.zoom = z;
    this.targetZoom = z;
  }

  applyTransform(ctx) {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx, -cy);
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }

  screenToWorld(screenX, screenY) {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;

    const wx = (screenX - cx) / this.zoom + cx + this.x;
    const wy = (screenY - cy) / this.zoom + cy + this.y;
    return { x: wx, y: wy };
  }

  getBounds() {
    const hw = (this.viewWidth / 2) / this.zoom;
    const hh = (this.viewHeight / 2) / this.zoom;
    const cx = this.x + this.viewWidth / 2;
    const cy = this.y + this.viewHeight / 2;
    return {
      left:   cx - hw,
      right:  cx + hw,
      top:    cy - hh,
      bottom: cy + hh,
    };
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = GAME_CONFIG.baseZoom;
    this.targetZoom = GAME_CONFIG.baseZoom;
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize(width, height) {
    this.viewWidth = width;
    this.viewHeight = height;
  }
}

export const camera = new Camera();
