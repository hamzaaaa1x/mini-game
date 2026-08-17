// ─── SCORING ────────────────────────────────────────────────
// Score formula and chain tracking (Section 17 of spec).
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from './config.js';

class Scoring {
  constructor() {
    this.distance = 0;
    this.grappleCount = 0;
    this.currentChain = 0;
    this.chainCount = 0;
    this.maxSpeed = 0;
    this.moonStolen = false;
    this.escapeComplete = false;
  }

  reset() {
    this.distance = 0;
    this.grappleCount = 0;
    this.currentChain = 0;
    this.chainCount = 0;
    this.maxSpeed = 0;
    this.moonStolen = false;
    this.escapeComplete = false;
  }

  updateDistance(d) {
    this.distance = Math.max(this.distance, Math.floor(d / 10)); // 10px = 1m
  }

  recordGrapple() {
    this.grappleCount++;
    this.currentChain++;
    this.chainCount = Math.max(this.chainCount, this.currentChain);
  }

  breakChain() {
    this.currentChain = 0;
  }

  updateMaxSpeed(speed) {
    this.maxSpeed = Math.max(this.maxSpeed, speed * 60); // px/sec
  }

  markMoonStolen() {
    this.moonStolen = true;
  }

  markEscapeComplete() {
    this.escapeComplete = true;
  }

  calculateScore() {
    let score = this.distance * (GAME_CONFIG.scorePerMeter || 1);
    score += this.chainCount * (GAME_CONFIG.chainBonusPerLink || 10);
    if (this.moonStolen) score += (GAME_CONFIG.moonStealBonus || 5000);
    if (this.escapeComplete) score += (GAME_CONFIG.escapeCompleteBonus || 5000);
    return Math.floor(score);
  }

  getStats(win = false) {
    return {
      distance: this.distance,
      grapples: this.grappleCount,
      chain: this.chainCount,
      maxSpeed: this.maxSpeed,
      score: this.calculateScore(),
      win,
    };
  }
}

export const scoring = new Scoring();
