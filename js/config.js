// ─── GAME_CONFIG ────────────────────────────────────────────
// Every tunable number lives here. Never hardcode magic numbers
// in gameplay logic files — reference GAME_CONFIG instead.
// ─────────────────────────────────────────────────────────────

export const GAME_CONFIG = {
  // ── Physics ──
  gravity:       0.55,       // lowered from 0.9 — gentler pendulum, more horizontal carry
  playerMass:    1,
  playerRadius:  14,
  maxSpeed:      22,         // raised to allow faster swings

  // ── Air Control (Step 2: continuous horizontal drift when holding A/D or Left/Right) ──
  airControlForce:  0.0018,  // continuous directional force while flying/falling/swinging
  airControlMaxVx:  12.0,    // max horizontal speed reachable via air control drift alone

  // ── Grappling Hook ──
  grappleRange:     750,     // generous range so player can easily catch the next anchor
  hookSpeed:        34,      // fast hook travel for snappier feel
  ropeStiffness:    0.35,    // firm pendulum
  maxSwingDuration: 4000,    // ms safety net
  swingPumpForce:   0.0015,  // tangential force when pumping a swing
  releaseForwardAssistMin: 9.0, // minimum forward horizontal speed guaranteed on forward release
  releaseAssistMultiplier: 1.35, // multiplier on release forward velocity
  releaseUpwardLift: -3.5,   // vertical trajectory lift on forward release

  // ── Boost ──
  boostForce:     8,
  boostCost:      25,        // out of 100
  boostRegenRate: 5,         // per second (raised from 4)

  // ── Moon ──
  moonGravityRadius:  900,
  moonApproachRadius: 250,
  moonPullForce:      0.002,
  moonRadius:         120,

  // ── Escape ──
  escapeSpeedMultiplier: 1.4,
  escapeZoneDistance:    2500,   // px past the moon
  escapeMassMultiplier: 2.5,

  // ── Camera ──
  cameraLerpFactor:    0.08,
  highSpeedThreshold:  14,
  baseZoom:            1,
  highSpeedZoom:       0.85,
  zoomLerpFactor:      0.04,

  // ── Chunk Generation ──
  chunkSpawnLookahead: 1200,  // px ahead of camera to keep generated
  chunkDespawnBehind:  800,   // px behind camera to remove bodies
  chunkWidth:          800,
  maxAnchorGapCity:    200,   // max X gap between anchors in city (forgiving)
  maxAnchorGapDefault: 350,   // max X gap for other phases

  // ── Phases (distance thresholds in world-px) ──
  phaseCityEnd:    3000,
  phaseSkyEnd:     6000,
  phaseSpaceEnd:   9500,
  moonDistance:     10000,    // X position of the moon

  // ── Scoring ──
  scorePerMeter:       1,
  chainBonusPerLink:   10,
  moonStealBonus:      5000,
  escapeCompleteBonus: 5000,

  // ── Death ──
  groundY:           600,    // Y position of the death plane
  fallBelowCameraMs: 3000,   // ms below camera before death

  // ── Particles ──
  particlePoolSize: 100,

  // ── Screen Shake ──
  shakeDecay:     0.92,
  boostShake:     4,
  stealShake:     12,
  deathShake:     6,

  // ── World dimensions ──
  worldStartX:   0,
  worldStartY:   300,    // player start Y (higher = lower on screen)
  canvasWidth:   1280,
  canvasHeight:  720,
};
