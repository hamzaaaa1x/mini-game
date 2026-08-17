// ─── SCORING ────────────────────────────────────────────────
// Score calculation + stat tracking. Formula is visible and
// tunable via GAME_CONFIG.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from './config.js';

class Scoring {
  constructor() {
    this.reset();
  }

  reset() {
    this.distance = 0;
    this.grappleCount = 0;
    this.maxSpeed = 0;
    this.chainCount = 0;        // highest chain achieved
    this.currentChain = 0;
    this.moonStolen = false;
    this.escapeComplete = false;
    this.score = 0;
  }

  /** Update distance (called each frame) */
  updateDistance(d) {
    this.distance = Math.max(this.distance, d);
  }

  /** Record a grapple */
  recordGrapple() {
    this.grappleCount++;
    this.currentChain++;
    if (this.currentChain > this.chainCount) {
      this.chainCount = this.currentChain;
    }
  }

  /** Break the chain (on death or ground hit) */
  breakChain() {
    this.currentChain = 0;
  }

  /** Update max speed */
  updateMaxSpeed(speed) {
    if (speed > this.maxSpeed) {
      this.maxSpeed = speed;
    }
  }

  /** Mark moon as stolen */
  markMoonStolen() {
    this.moonStolen = true;
  }

  /** Mark escape as complete */
  markEscapeComplete() {
    this.escapeComplete = true;
  }

  /** Calculate final score */
  calculateScore() {
    let score = 0;

    // Distance points
    score += Math.floor(this.distance / 10) * GAME_CONFIG.scorePerMeter;

    // Chain bonus
    score += this.chainCount * GAME_CONFIG.chainBonusPerLink;

    // Moon steal bonus
    if (this.moonStolen) score += GAME_CONFIG.moonStealBonus;

    // Escape bonus
    if (this.escapeComplete) score += GAME_CONFIG.escapeCompleteBonus;

    this.score = score;
    return score;
  }

  /** Get stats object for display */
  getStats() {
    return {
      distance:       Math.floor(this.distance / 10),  // convert px to "meters"
      grappleCount:   this.grappleCount,
      maxSpeed:       Math.floor(this.maxSpeed * 10) / 10,
      chainCount:     this.chainCount,
      currentChain:   this.currentChain,
      moonStolen:     this.moonStolen,
      escapeComplete: this.escapeComplete,
      score:          this.calculateScore(),
    };
  }
}

export const scoring = new Scoring();
