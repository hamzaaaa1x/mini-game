// ─── GAME_CONFIG ────────────────────────────────────────────
// Centralized tunable parameters from Section 19 of spec.
// ─────────────────────────────────────────────────────────────

export const GAME_CONFIG = {
  // ── Physics ──
  gravity:            0.9,
  playerMass:         1,
  playerRadius:       14,
  maxSpeed:           18,

  // ── Grappling Hook ──
  grappleRange:       600,
  hookSpeed:          25,
  ropeStiffness:      0.2,
  maxSwingDuration:   4000,   // ms safety net

  // ── Boost ──
  boostForce:         8,
  boostCost:          25,     // out of 100
  boostRegenRate:     4,      // per second

  // ── Moon ──
  moonGravityRadius:  900,
  moonApproachRadius: 250,
  moonPullForce:      0.002,
  moonRadius:         120,

  // ── Escape ──
  escapeSpeedMultiplier: 1.4,
  escapeZoneDistance:    2500,
  escapeMassMultiplier:  2.0,

  // ── Camera ──
  cameraLerpFactor:    0.08,
  highSpeedThreshold:  14,
  baseZoom:            1.0,
  highSpeedZoom:       0.85,
  zoomLerpFactor:      0.04,

  // ── Procedural Chunks ──
  chunkSpawnLookahead: 1200,
  chunkDespawnBehind:  800,

  // ── Phases (distance thresholds in world-px) ──
  phaseCityEnd:        3000,
  phaseSkyEnd:         6000,
  phaseSpaceEnd:       9500,
  moonDistance:        10000,

  // ── Scoring ──
  scorePerMeter:       1,
  chainBonusPerLink:   10,
  moonStealBonus:      5000,
  escapeCompleteBonus: 5000,

  // ── World & Ground ──
  groundY:             600,
  worldStartX:         0,
  worldStartY:         300,
  canvasWidth:         1280,
  canvasHeight:        720,
};
