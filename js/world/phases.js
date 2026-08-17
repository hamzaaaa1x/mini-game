// ─── PHASES ─────────────────────────────────────────────────
// Phase definitions: city → sky → space → moonApproach → escape.
// Each defines anchor pools, spacing, and visual parameters.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

export const PHASE_NAMES = {
  CITY:           'city',
  SKY:            'sky',
  SPACE:          'space',
  MOON_APPROACH:  'moonApproach',
  ESCAPE:         'escape',
};

/**
 * Phase definitions — each has:
 * - range: [startX, endX] in world coordinates
 * - bgColor: background gradient colors
 * - gravity: gravity multiplier for this phase
 * - anchors: pool of anchor types with spawn config
 * - spacing: min/max X gap between anchors
 * - heightRange: Y range for anchor placement
 */
export const PHASES = {
  [PHASE_NAMES.CITY]: {
    range: [0, GAME_CONFIG.phaseCityEnd],
    bgColors: ['#0a0e1a', '#0f1528'],
    gravity: 1.0,
    spacing: { min: 100, max: 180 },   // tightened from 180–320 — forgiving early game
    heightRange: { minY: 220, maxY: 420 },
    anchors: [
      { type: 'building', weight: 5, config: { widthMin: 60, widthMax: 100, heightMin: 200, heightMax: 350 } },  // ample height
      { type: 'lamp',     weight: 4, config: { height: 220 } },   // tall streetlights (220px above ground)
      { type: 'crane',    weight: 2, config: { heightMin: 250, heightMax: 340 } },  // tall cranes
    ],
  },

  [PHASE_NAMES.SKY]: {
    range: [GAME_CONFIG.phaseCityEnd, GAME_CONFIG.phaseSkyEnd],
    bgColors: ['#0f1528', '#0d1a3a'],
    gravity: 0.7,
    spacing: { min: 200, max: 380 },
    heightRange: { minY: 50, maxY: 400 },
    anchors: [
      { type: 'cloudPost', weight: 5, config: {} },
      { type: 'balloon',   weight: 2, config: { amplitude: 40, speed: 0.0008 } },
      { type: 'building',  weight: 1, config: { widthMin: 40, widthMax: 70, heightMin: 250, heightMax: 420 } },
    ],
  },

  [PHASE_NAMES.SPACE]: {
    range: [GAME_CONFIG.phaseSkyEnd, GAME_CONFIG.phaseSpaceEnd],
    bgColors: ['#0d1a3a', '#050810'],
    gravity: 0.4,
    spacing: { min: 220, max: 400 },
    heightRange: { minY: 50, maxY: 450 },
    anchors: [
      { type: 'satellite', weight: 4, config: { driftSpeed: 0.3 } },
      { type: 'cloudPost', weight: 2, config: {} },
      { type: 'asteroid',  weight: 2, config: { radiusMin: 14, radiusMax: 24 } },
    ],
  },

  [PHASE_NAMES.MOON_APPROACH]: {
    range: [GAME_CONFIG.phaseSpaceEnd, GAME_CONFIG.moonDistance],
    bgColors: ['#050810', '#030508'],
    gravity: 0.3,
    spacing: { min: 250, max: 420 },
    heightRange: { minY: 80, maxY: 400 },
    anchors: [
      { type: 'satellite', weight: 3, config: { driftSpeed: 0.2 } },
      { type: 'asteroid',  weight: 2, config: { radiusMin: 16, radiusMax: 28 } },
    ],
  },

  [PHASE_NAMES.ESCAPE]: {
    range: [0, GAME_CONFIG.escapeZoneDistance],  // relative to moon
    bgColors: ['#030508', '#0a0512'],
    gravity: 0.5,
    spacing: { min: 160, max: 300 },
    heightRange: { minY: 60, maxY: 450 },
    anchors: [
      { type: 'satellite', weight: 4, config: { driftSpeed: 0.4 } },
      { type: 'asteroid',  weight: 3, config: { radiusMin: 16, radiusMax: 30 } },
      { type: 'cloudPost', weight: 2, config: {} },
    ],
  },
};

/**
 * Get the current phase based on player X position.
 */
export function getPhaseForX(x) {
  if (x < GAME_CONFIG.phaseCityEnd) return PHASE_NAMES.CITY;
  if (x < GAME_CONFIG.phaseSkyEnd)  return PHASE_NAMES.SKY;
  if (x < GAME_CONFIG.phaseSpaceEnd) return PHASE_NAMES.SPACE;
  if (x < GAME_CONFIG.moonDistance) return PHASE_NAMES.MOON_APPROACH;
  return PHASE_NAMES.ESCAPE;
}

/**
 * Get gravity multiplier for a given phase.
 */
export function getPhaseGravity(phaseName) {
  const phase = PHASES[phaseName];
  return phase ? phase.gravity : 1.0;
}

/**
 * Get background colors for a given X position (interpolated between phases).
 */
export function getBgColorsForX(x) {
  const phaseName = getPhaseForX(x);
  return PHASES[phaseName]?.bgColors || ['#0a0e1a', '#0a0e1a'];
}
