// ─── CHUNK GENERATOR ────────────────────────────────────────
// Procedural lookahead chunk generator (Section 13).
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

export function initChunks() {
  generatedUpToX = GAME_CONFIG.worldStartX;
  currentPhase = PHASE_NAMES.CITY;
  escapeMode = false;
  escapeStartX = 0;

  const groundY = GAME_CONFIG.groundY;

  // Guaranteed starting anchors right in front of player (x=100)
  createBuilding(160, groundY, 80, 320);
  createLamp(290, groundY, 220);
  createBuilding(410, groundY, 90, 300);
  generatedUpToX = 410;

  // Generate initial chunks up to lookahead
  _generateUpTo(GAME_CONFIG.worldStartX + GAME_CONFIG.chunkSpawnLookahead + 400);
}

export function startEscapeChunks(moonX) {
  escapeMode = true;
  escapeStartX = moonX;
  generatedUpToX = moonX + 150;
}

export function updateChunks(cameraRightX, cameraLeftX) {
  // Despawn behind camera (Section 14)
  despawnBehind(cameraLeftX - GAME_CONFIG.chunkDespawnBehind);

  // Generate ahead of camera
  const targetX = cameraRightX + GAME_CONFIG.chunkSpawnLookahead;
  if (generatedUpToX < targetX) {
    _generateUpTo(targetX);
  }

  // Update phase gravity
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
      if (generatedUpToX >= GAME_CONFIG.moonDistance - 250) {
        generatedUpToX = targetX;
        return;
      }
    }

    const phase = PHASES[phaseName];
    if (!phase) {
      generatedUpToX += 200;
      continue;
    }

    const escapeMultiplier = escapeMode ? GAME_CONFIG.escapeSpeedMultiplier : 1;
    const spacing = (phase.spacing.min + Math.random() * (phase.spacing.max - phase.spacing.min)) / escapeMultiplier;

    generatedUpToX += spacing;

    const anchor = _pickWeightedAnchor(phase.anchors);
    if (!anchor) continue;

    const y = phase.heightRange.minY + Math.random() * (phase.heightRange.maxY - phase.heightRange.minY);

    _spawnAnchor(anchor.type, generatedUpToX, y, groundY, anchor.config);
  }
}

function _pickWeightedAnchor(anchors) {
  const total = anchors.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * total;
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
      createLamp(x, groundY, config.height || 180);
      break;
    case 'crane':
      createCrane(x, groundY, config.height || 240);
      break;
    case 'cloudPost':
      createCloudPost(x, y);
      break;
    case 'balloon':
      createBalloon(x, y, config.amplitude || 35, config.speed || 0.0008);
      break;
    case 'satellite':
      createSatellite(x, y, config.driftSpeed || 0.3);
      break;
    case 'asteroid':
      createAsteroid(x, y, config.radius || 20);
      break;
  }
}
