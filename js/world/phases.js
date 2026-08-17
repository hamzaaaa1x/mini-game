// ─── PHASES ─────────────────────────────────────────────────
// Single source of truth for phases, anchor pools, and spacing (Section 8 & 13).
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

export const PHASE_NAMES = {
  CITY:          'city',
  SKY:           'sky',
  SPACE:         'space',
  MOON_APPROACH: 'moonApproach',
  ESCAPE:        'escape',
};

export const PHASES = {
  [PHASE_NAMES.CITY]: {
    range: [0, GAME_CONFIG.phaseCityEnd],
    bgColors: ['#0a0e1a', '#0f1528'],
    gravity: 1.0,
    spacing: { min: 110, max: 170 },
    heightRange: { minY: 200, maxY: 380 },
    anchors: [
      { type: 'building', weight: 5, config: { widthMin: 60, widthMax: 90, heightMin: 220, heightMax: 350 } },
      { type: 'lamp',     weight: 4, config: { height: 200 } },
      { type: 'crane',    weight: 2, config: { height: 260 } },
    ],
  },

  [PHASE_NAMES.SKY]: {
    range: [GAME_CONFIG.phaseCityEnd, GAME_CONFIG.phaseSkyEnd],
    bgColors: ['#0f1528', '#0d1a3a'],
    gravity: 0.75,
    spacing: { min: 180, max: 280 },
    heightRange: { minY: 80, maxY: 360 },
    anchors: [
      { type: 'cloudPost', weight: 5, config: {} },
      { type: 'balloon',   weight: 3, config: { amplitude: 35, speed: 0.0008 } },
      { type: 'building',  weight: 1, config: { widthMin: 50, widthMax: 80, heightMin: 250, heightMax: 380 } },
    ],
  },

  [PHASE_NAMES.SPACE]: {
    range: [GAME_CONFIG.phaseSkyEnd, GAME_CONFIG.phaseSpaceEnd],
    bgColors: ['#0d1a3a', '#050810'],
    gravity: 0.45,
    spacing: { min: 200, max: 320 },
    heightRange: { minY: 60, maxY: 420 },
    anchors: [
      { type: 'satellite', weight: 4, config: { driftSpeed: 0.3 } },
      { type: 'cloudPost', weight: 2, config: {} },
      { type: 'asteroid',  weight: 2, config: { radius: 18 } },
    ],
  },

  [PHASE_NAMES.MOON_APPROACH]: {
    range: [GAME_CONFIG.phaseSpaceEnd, GAME_CONFIG.moonDistance],
    bgColors: ['#050810', '#030508'],
    gravity: 0.35,
    spacing: { min: 220, max: 340 },
    heightRange: { minY: 80, maxY: 400 },
    anchors: [
      { type: 'satellite', weight: 3, config: { driftSpeed: 0.2 } },
      { type: 'asteroid',  weight: 2, config: { radius: 20 } },
    ],
  },

  [PHASE_NAMES.ESCAPE]: {
    range: [0, GAME_CONFIG.escapeZoneDistance],
    bgColors: ['#030508', '#0b0614'],
    gravity: 0.6,
    spacing: { min: 160, max: 280 },
    heightRange: { minY: 60, maxY: 440 },
    anchors: [
      { type: 'satellite', weight: 3, config: { driftSpeed: 0.35 } },
      { type: 'asteroid',  weight: 4, config: { radius: 22 } },
      { type: 'cloudPost', weight: 2, config: {} },
    ],
  },
};

export function getPhaseForX(x) {
  if (x < GAME_CONFIG.phaseCityEnd) return PHASE_NAMES.CITY;
  if (x < GAME_CONFIG.phaseSkyEnd)  return PHASE_NAMES.SKY;
  if (x < GAME_CONFIG.phaseSpaceEnd) return PHASE_NAMES.SPACE;
  if (x < GAME_CONFIG.moonDistance) return PHASE_NAMES.MOON_APPROACH;
  return PHASE_NAMES.ESCAPE;
}

export function getBgColorsForX(x) {
  const phaseName = getPhaseForX(x);
  return PHASES[phaseName]?.bgColors || ['#0a0e1a', '#0a0e1a'];
}
