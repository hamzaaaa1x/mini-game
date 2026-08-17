// ─── SCREEN SHAKE ───────────────────────────────────────────
// Screen shake wrappers for camera events (Section 12 of spec).
// ─────────────────────────────────────────────────────────────

import { camera } from '../engine/camera.js';
import { GAME_CONFIG } from '../config.js';

export function shakeOnBoost() {
  camera.shake(GAME_CONFIG.boostShake || 4);
}

export function shakeOnSteal() {
  camera.shake(GAME_CONFIG.stealShake || 12);
}

export function shakeOnDeath() {
  camera.shake(GAME_CONFIG.deathShake || 6);
}
