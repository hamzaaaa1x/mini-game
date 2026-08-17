// ─── SCREEN SHAKE ───────────────────────────────────────────
// Thin wrapper — actual shake logic lives in Camera.
// This just provides convenient trigger functions.
// ─────────────────────────────────────────────────────────────

import { camera } from '../engine/camera.js';
import { GAME_CONFIG } from '../config.js';

export function shakeOnBoost() {
  camera.shake(GAME_CONFIG.boostShake);
}

export function shakeOnSteal() {
  camera.shake(GAME_CONFIG.stealShake);
}

export function shakeOnDeath() {
  camera.shake(GAME_CONFIG.deathShake);
}

export function shakeCustom(intensity) {
  camera.shake(intensity);
}
