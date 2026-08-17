// ─── CHUNK GENERATOR ────────────────────────────────────────
// Procedural world generation. Spawns anchors ahead of the
// camera and despawns them behind to keep body count low.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';
import { PHASES, getPhaseForX, PHASE_NAMES } from './phases.js';
import {
  createBuilding, createLamp, createCrane,
  createCloudPost, createBalloon, createSatellite,
  createAsteroid, despawnBehind,
} from '../entities/anchors.js';
import { setGravity } from '../engine/physicsWorld.js';

let generatedUpToX = 0;
let currentPhase = PHASE_NAMES.CITY;
let escapeMode = false;
let escapeStartX = 0;
let lastAnchorX = 0;
let lastAnchorY = 0;

/** Initialize the chunk generator for a new run */
export function initChunks() {
  generatedUpToX = GAME_CONFIG.worldStartX;
  currentPhase = PHASE_NAMES.CITY;
  escapeMode = false;
  escapeStartX = 0;
  lastAnchorX = 0;
  lastAnchorY = 0;

  // Generate initial chunks
  _generateUpTo(GAME_CONFIG.worldStartX + GAME_CONFIG.chunkSpawnLookahead + 400);
}

/** Switch to escape mode generation */
export function startEscapeChunks(moonX) {
  escapeMode = true;
  escapeStartX = moonX;
  generatedUpToX = moonX + 200;
}

/**
 * Update — called each frame with the camera's right edge X.
 * Generates new chunks ahead and despawns behind.
 */
export function updateChunks(cameraRightX, cameraLeftX) {
  // Despawn behind camera
  despawnBehind(cameraLeftX - GAME_CONFIG.chunkDespawnBehind);

  // Generate ahead
  const targetX = cameraRightX + GAME_CONFIG.chunkSpawnLookahead;
  if (generatedUpToX < targetX) {
    _generateUpTo(targetX);
  }

  // Update gravity based on phase
  const phase = escapeMode ? PHASE_NAMES.ESCAPE : getPhaseForX(cameraRightX);
  if (phase !== currentPhase) {
    currentPhase = phase;
    const phaseData = PHASES[phase];
    if (phaseData) {
      setGravity(0, GAME_CONFIG.gravity * phaseData.gravity);
    }
  }
}

function _generateUpTo(targetX) {
  const groundY = GAME_CONFIG.groundY;

  while (generatedUpToX < targetX) {
    let phaseName;
    if (escapeMode) {
      phaseName = PHASE_NAMES.ESCAPE;
    } else {
      phaseName = getPhaseForX(generatedUpToX);
      // Don't generate past the moon
      if (generatedUpToX >= GAME_CONFIG.moonDistance - 200) {
        generatedUpToX = targetX;
        return;
      }
    }

    const phase = PHASES[phaseName];
    if (!phase) {
      generatedUpToX += 300;
      continue;
    }

    // Step 3: Explicit reachability guarantee
    // Calculate conservative reachability limit from previous anchor
    const safeMaxGap = (phaseName === PHASE_NAMES.CITY) ? 180 :
                       (phaseName === PHASE_NAMES.SKY)  ? 260 : 320;

    const escapeMultiplier = escapeMode ? GAME_CONFIG.escapeSpeedMultiplier : 1;
    let spacing = phase.spacing
      ? ((phase.spacing.min + Math.random() * (phase.spacing.max - phase.spacing.min)) / escapeMultiplier)
      : 160;

    let gapFromPrev = spacing;
    if (lastAnchorX > 0) {
      gapFromPrev = (generatedUpToX + spacing) - lastAnchorX;
    }

    if (gapFromPrev > safeMaxGap) {
      console.warn(`[ReachabilityCorrection] Anchor gap ${Math.round(gapFromPrev)}px exceeds safe reachable limit ${safeMaxGap}px! Clamping to ${safeMaxGap}px.`);
      spacing = safeMaxGap;
    }

    generatedUpToX = (lastAnchorX > 0) ? (lastAnchorX + spacing) : (generatedUpToX + spacing);

    // Escape mode: scale density
    const escapeMultiplier = escapeMode ? GAME_CONFIG.escapeSpeedMultiplier : 1;

    // Pick an anchor type using weighted random
    const anchor = _pickWeightedAnchor(phase.anchors);
    if (!anchor) continue;

    const y = phase.heightRange.minY +
      Math.random() * (phase.heightRange.maxY - phase.heightRange.minY);

    _spawnAnchor(anchor.type, generatedUpToX, y, groundY, anchor.config);
    lastAnchorX = generatedUpToX;
    lastAnchorY = y;
    console.log(`[ChunkGen] Spawned ${anchor.type} at x=${Math.round(generatedUpToX)}, y=${Math.round(y)}, spacing=${Math.round(spacing)}, phase=${phaseName}`);
  }
}

function _pickWeightedAnchor(anchors) {
  const totalWeight = anchors.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const a of anchors) {
    roll -= a.weight;
    if (roll <= 0) return a;
  }
  return anchors[anchors.length - 1];
}

function _spawnAnchor(type, x, y, groundY, config) {
  switch (type) {
    case 'building': {
      const w = config.widthMin + Math.random() * (config.widthMax - config.widthMin);
      const h = config.heightMin + Math.random() * (config.heightMax - config.heightMin);
      createBuilding(x, groundY, w, h);
      break;
    }
    case 'lamp':
      createLamp(x, groundY, config.height || 90);
      break;
    case 'crane': {
      const h = config.heightMin + Math.random() * (config.heightMax - config.heightMin);
      createCrane(x, groundY, h);
      break;
    }
    case 'cloudPost':
      createCloudPost(x, y);
      break;
    case 'balloon':
      createBalloon(x, y, config.amplitude || 40, config.speed || 0.0008);
      break;
    case 'satellite':
      createSatellite(x, y, config.driftSpeed || 0.3);
      break;
    case 'asteroid': {
      const r = config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin);
      createAsteroid(x, y, r);
      break;
    }
  }
}

/** Reset for a new run */
export function resetChunks() {
  generatedUpToX = 0;
  currentPhase = PHASE_NAMES.CITY;
  escapeMode = false;
  lastAnchorX = 0;
  lastAnchorY = 0;
}
