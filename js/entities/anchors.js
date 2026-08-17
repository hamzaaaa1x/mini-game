// ─── ANCHORS ────────────────────────────────────────────────
// Factory functions & rendering for all grappleable objects (Section 8).
// ─────────────────────────────────────────────────────────────

import { addToWorld, removeFromWorld, CATEGORIES } from '../engine/physicsWorld.js';

const { Bodies, Body } = Matter;

let activeAnchors = [];

function makePlugin(type, opts = {}) {
  return {
    grappleable: opts.dangerous ? false : true,
    type,
    moving: opts.moving || false,
    dangerous: opts.dangerous || false,
    drawData: opts.drawData || null,
  };
}

// ═══════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/** City building (Section 15.2) */
export function createBuilding(x, groundY, width, height) {
  const bx = x + width / 2;
  const by = groundY - height / 2;

  // Generate deterministic window pattern
  const windows = [];
  const cols = Math.max(1, Math.floor(width / 20));
  const rows = Math.max(1, Math.floor(height / 24));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (Math.random() > 0.35) {
        windows.push({
          ox: -width / 2 + 8 + c * 20,
          oy: -height / 2 + 10 + r * 24,
          lit: Math.random() > 0.3,
          hue: Math.random() > 0.7 ? '#ffd866' : '#ffe4a0',
        });
      }
    }
  }

  const body = Bodies.rectangle(bx, by, width, height, {
    isStatic: true,
    label: 'building',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('building', {
      drawData: { width, height, windows },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Street lamp */
export function createLamp(x, groundY, height = 180) {
  const by = groundY - height / 2;

  const body = Bodies.rectangle(x, by, 8, height, {
    isStatic: true,
    label: 'lamp',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('lamp', {
      drawData: { height },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Construction Crane */
export function createCrane(x, groundY, height = 240) {
  const by = groundY - height / 2;

  const body = Bodies.rectangle(x, by, 12, height, {
    isStatic: true,
    label: 'crane',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('crane', {
      drawData: { height },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Cloud with grapple post */
export function createCloudPost(x, y) {
  const body = Bodies.circle(x, y, 22, {
    isStatic: true,
    label: 'cloudPost',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('cloudPost'),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Kinematic Hot Air Balloon */
export function createBalloon(x, y, amplitude = 40, speed = 0.0008) {
  const body = Bodies.circle(x, y, 26, {
    isStatic: false,
    label: 'balloon',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('balloon', {
      moving: true,
      drawData: { originY: y, amplitude, speed, phase: Math.random() * Math.PI * 2 },
    }),
  });

  Body.setMass(body, Infinity);
  body.isKinematic = true;

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Drifting Satellite */
export function createSatellite(x, y, driftSpeed = 0.3) {
  const body = Bodies.rectangle(x, y, 32, 18, {
    isStatic: false,
    label: 'satellite',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('satellite', {
      moving: true,
      drawData: { driftSpeed, originY: y, phase: Math.random() * Math.PI * 2 },
    }),
  });

  Body.setMass(body, Infinity);
  body.isKinematic = true;

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Dangerous Asteroid */
export function createAsteroid(x, y, radius = 20) {
  const body = Bodies.circle(x, y, radius, {
    isStatic: true,
    label: 'asteroid',
    collisionFilter: {
      category: CATEGORIES.HAZARD,
      mask: CATEGORIES.PLAYER,
    },
    plugin: makePlugin('asteroid', {
      dangerous: true,
      drawData: { radius },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

// ═══════════════════════════════════════════════════════════
// LIFECYCLE & RENDERING
// ═══════════════════════════════════════════════════════════

export function updateAnchors(time) {
  for (const body of activeAnchors) {
    if (!body.plugin || !body.plugin.moving) continue;
    const d = body.plugin.drawData;
    if (!d) continue;

    if (body.label === 'balloon') {
      const newY = d.originY + Math.sin(time * d.speed + d.phase) * d.amplitude;
      Body.setPosition(body, { x: body.position.x, y: newY });
    } else if (body.label === 'satellite') {
      const newY = d.originY + Math.sin(time * 0.0006 + d.phase) * 20;
      Body.setPosition(body, { x: body.position.x - d.driftSpeed * 0.1, y: newY });
    }
  }
}

export function despawnBehind(xThreshold) {
  const toRemove = activeAnchors.filter(b => b.position.x < xThreshold);
  for (const b of toRemove) {
    removeFromWorld(b);
  }
  activeAnchors = activeAnchors.filter(b => b.position.x >= xThreshold);
}

export function clearAnchors() {
  for (const b of activeAnchors) {
    removeFromWorld(b);
  }
  activeAnchors = [];
}

export function getNextAnchorAhead(playerX) {
  let closest = null;
  let closestDist = Infinity;

  for (const body of activeAnchors) {
    if (!body.plugin || !body.plugin.grappleable) continue;
    const ax = body.position.x;
    if (ax > playerX + 10) {
      const dist = ax - playerX;
      if (dist < closestDist) {
        closestDist = dist;
        closest = body;
      }
    }
  }
  return closest;
}

export function drawAnchors(ctx) {
  for (const body of activeAnchors) {
    const { x, y } = body.position;
    const d = body.plugin?.drawData;

    switch (body.label) {
      case 'building':
        _drawBuilding(ctx, x, y, d);
        break;
      case 'lamp':
        _drawLamp(ctx, x, y, d);
        break;
      case 'crane':
        _drawCrane(ctx, x, y, d);
        break;
      case 'cloudPost':
        _drawCloudPost(ctx, x, y);
        break;
      case 'balloon':
        _drawBalloon(ctx, x, y);
        break;
      case 'satellite':
        _drawSatellite(ctx, x, y);
        break;
      case 'asteroid':
        _drawAsteroid(ctx, x, y, d);
        break;
    }
  }
}

// ── Draw helpers ──

function _drawBuilding(ctx, x, y, d) {
  if (!d) return;
  const hw = d.width / 2;
  const hh = d.height / 2;

  // Dark slate rectangle (Section 15.2)
  ctx.fillStyle = '#1a2035';
  ctx.fillRect(x - hw, y - hh, d.width, d.height);

  ctx.strokeStyle = '#28334e';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - hw, y - hh, d.width, d.height);

  // Lit windows
  if (d.windows) {
    for (const w of d.windows) {
      ctx.fillStyle = w.lit ? w.hue : '#0e1525';
      ctx.fillRect(x + w.ox, y + w.oy, 9, 11);
      if (w.lit) {
        ctx.shadowColor = w.hue;
        ctx.shadowBlur = 4;
        ctx.fillRect(x + w.ox, y + w.oy, 9, 11);
        ctx.shadowBlur = 0;
      }
    }
  }
}

function _drawLamp(ctx, x, y, d) {
  if (!d) return;
  const hh = d.height / 2;

  // Pole
  ctx.strokeStyle = '#3a4660';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + hh);
  ctx.lineTo(x, y - hh);
  ctx.stroke();

  // Glowing lamp head
  ctx.fillStyle = '#ffdd88';
  ctx.shadowColor = '#ffdd88';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y - hh, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function _drawCrane(ctx, x, y, d) {
  if (!d) return;
  const hh = d.height / 2;

  ctx.strokeStyle = '#445577';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + hh);
  ctx.lineTo(x, y - hh);
  ctx.lineTo(x + 50, y - hh);
  ctx.stroke();

  // Hook beacon
  ctx.fillStyle = '#ffaa33';
  ctx.beginPath();
  ctx.arc(x + 50, y - hh, 4, 0, Math.PI * 2);
  ctx.fill();
}

function _drawCloudPost(ctx, x, y) {
  ctx.fillStyle = 'rgba(230, 240, 255, 0.25)';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.arc(x - 14, y + 4, 16, 0, Math.PI * 2);
  ctx.arc(x + 14, y + 4, 16, 0, Math.PI * 2);
  ctx.fill();

  // Grapple core post
  ctx.fillStyle = '#88bbff';
  ctx.shadowColor = '#88bbff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function _drawBalloon(ctx, x, y) {
  // Balloon envelope
  ctx.fillStyle = '#ff6655';
  ctx.beginPath();
  ctx.arc(x, y - 8, 18, 0, Math.PI * 2);
  ctx.fill();

  // Basket
  ctx.fillStyle = '#d49b6a';
  ctx.fillRect(x - 5, y + 16, 10, 8);

  // Strings
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 6);
  ctx.lineTo(x - 3, y + 16);
  ctx.moveTo(x + 8, y + 6);
  ctx.lineTo(x + 3, y + 16);
  ctx.stroke();
}

function _drawSatellite(ctx, x, y) {
  // Body
  ctx.fillStyle = '#d0d8e8';
  ctx.fillRect(x - 8, y - 6, 16, 12);

  // Solar panels
  ctx.fillStyle = '#3388ff';
  ctx.fillRect(x - 24, y - 4, 12, 8);
  ctx.fillRect(x + 12, y - 4, 12, 8);

  // Antenna
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y - 14);
  ctx.stroke();
}

function _drawAsteroid(ctx, x, y, d) {
  const r = d?.radius || 18;
  ctx.fillStyle = '#553333';
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
