// ─── ANCHORS ────────────────────────────────────────────────
// Factory functions for all grappleable objects: buildings,
// lamps, cranes, cloud posts, balloons, satellites, asteroids.
// ─────────────────────────────────────────────────────────────

import { addToWorld, removeFromWorld, CATEGORIES } from '../engine/physicsWorld.js';

const { Bodies, Body } = Matter;

// ── Tracked anchors for cleanup ──
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

/** City building — tall rectangle with lit windows */
export function createBuilding(x, groundY, width, height) {
  const bx = x + width / 2;
  const by = groundY - height / 2;

  // Generate window pattern
  const windows = [];
  const cols = Math.floor(width / 20);
  const rows = Math.floor(height / 24);
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (Math.random() > 0.4) {
        windows.push({
          ox: -width / 2 + 8 + col * 20,
          oy: -height / 2 + 10 + row * 24,
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

/** Street lamp — thin pole with round top */
export function createLamp(x, groundY, height = 90) {
  const bx = x;
  const by = groundY - height / 2;

  const body = Bodies.rectangle(bx, by, 6, height, {
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

/** Crane — L-shaped static body */
export function createCrane(x, groundY, height = 200) {
  const baseWidth = 10;
  const armLength = 80;

  // Vertical part
  const vertBody = Bodies.rectangle(x, groundY - height / 2, baseWidth, height, {
    isStatic: true,
    label: 'crane_vert',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('crane', {
      drawData: { height, armLength, isVertical: true },
    }),
  });

  // Horizontal arm
  const armBody = Bodies.rectangle(x + armLength / 2, groundY - height, armLength, 8, {
    isStatic: true,
    label: 'crane_arm',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('crane', {
      drawData: { height, armLength, isArm: true },
    }),
  });

  addToWorld(vertBody, armBody);
  activeAnchors.push(vertBody, armBody);
  return [vertBody, armBody];
}

/** Cloud post — a cloud shape with a small grapple point */
export function createCloudPost(x, y) {
  const body = Bodies.circle(x, y, 15, {
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

/** Hot air balloon — kinematic, moves in a gentle sine path */
export function createBalloon(x, y, amplitude = 40, speed = 0.0008) {
  const body = Bodies.circle(x, y, 20, {
    isStatic: true,
    label: 'balloon',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('balloon', {
      moving: true,
      drawData: { originX: x, originY: y, amplitude, speed, phase: Math.random() * Math.PI * 2 },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Satellite — slowly drifting in space */
export function createSatellite(x, y, driftSpeed = 0.3) {
  const body = Bodies.rectangle(x, y, 30, 10, {
    isStatic: true,
    label: 'satellite',
    collisionFilter: {
      category: CATEGORIES.ANCHOR,
      mask: CATEGORIES.PLAYER | CATEGORIES.HOOK_TIP,
    },
    plugin: makePlugin('satellite', {
      moving: true,
      drawData: { driftSpeed, originX: x, originY: y, phase: Math.random() * Math.PI * 2 },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

/** Asteroid — dangerous, cannot be grappled */
export function createAsteroid(x, y, radius = 18) {
  const body = Bodies.circle(x, y, radius, {
    isStatic: true,
    label: 'asteroid',
    collisionFilter: {
      category: CATEGORIES.HAZARD,
      mask: CATEGORIES.PLAYER,
    },
    plugin: makePlugin('asteroid', {
      dangerous: true,
      drawData: { radius, jagged: _generateJaggedShape(radius) },
    }),
  });

  addToWorld(body);
  activeAnchors.push(body);
  return body;
}

function _generateJaggedShape(radius) {
  const points = [];
  const segments = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = radius * (0.7 + Math.random() * 0.4);
    points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return points;
}

// ═══════════════════════════════════════════════════════════
// UPDATE & DRAW
// ═══════════════════════════════════════════════════════════

/** Update kinematic anchors (balloons, satellites) */
export function updateAnchors(time) {
  for (const body of activeAnchors) {
    if (!body.plugin || !body.plugin.moving) continue;

    const d = body.plugin.drawData;
    if (!d) continue;

    if (body.label === 'balloon' && d.originX !== undefined) {
      const newY = d.originY + Math.sin(time * d.speed + d.phase) * d.amplitude;
      Body.setPosition(body, { x: d.originX, y: newY });
    }

    if (body.label === 'satellite' && d.originX !== undefined) {
      const newY = d.originY + Math.sin(time * 0.0005 + d.phase) * 30;
      Body.setPosition(body, { x: body.position.x, y: newY });
    }
  }
}

/** Draw all active anchors */
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
      case 'crane_vert':
        _drawCraneVert(ctx, x, y, d);
        break;
      case 'crane_arm':
        _drawCraneArm(ctx, x, y, d);
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

  // Building body
  ctx.fillStyle = '#1a2035';
  ctx.fillRect(x - hw, y - hh, d.width, d.height);

  // Edges
  ctx.strokeStyle = '#252e48';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - hw, y - hh, d.width, d.height);

  // Windows
  if (d.windows) {
    for (const w of d.windows) {
      ctx.fillStyle = w.lit ? w.hue : '#0e1525';
      ctx.fillRect(x + w.ox, y + w.oy, 10, 12);

      if (w.lit) {
        ctx.shadowColor = w.hue;
        ctx.shadowBlur = 4;
        ctx.fillRect(x + w.ox, y + w.oy, 10, 12);
        ctx.shadowBlur = 0;
      }
    }
  }
}

function _drawLamp(ctx, x, y, d) {
  if (!d) return;
  const hh = d.height / 2;

  // Pole
  ctx.strokeStyle = '#3a4560';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + hh);
  ctx.lineTo(x, y - hh);
  ctx.stroke();

  // Lamp head
  ctx.fillStyle = '#ffdd88';
  ctx.shadowColor = '#ffdd88';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(x, y - hh, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function _drawCraneVert(ctx, x, y, d) {
  if (!d) return;
  ctx.strokeStyle = '#4a5570';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y + d.height / 2);
  ctx.lineTo(x, y - d.height / 2);
  ctx.stroke();
}

function _drawCraneArm(ctx, x, y, d) {
  if (!d) return;
  ctx.strokeStyle = '#4a5570';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - d.armLength / 2, y);
  ctx.lineTo(x + d.armLength / 2, y);
  ctx.stroke();

  // Hook dangle
  ctx.strokeStyle = '#6a7590';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + d.armLength / 2 - 5, y);
  ctx.lineTo(x + d.armLength / 2 - 5, y + 20);
  ctx.stroke();
}

function _drawCloudPost(ctx, x, y) {
  // Cloud shape
  ctx.fillStyle = 'rgba(200, 215, 240, 0.25)';
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 20, y + 5, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 20, y + 5, 22, 0, Math.PI * 2);
  ctx.fill();

  // Grapple post
  ctx.fillStyle = '#8899bb';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function _drawBalloon(ctx, x, y) {
  // Balloon envelope
  const grad = ctx.createRadialGradient(x, y - 5, 3, x, y, 18);
  grad.addColorStop(0, '#ff6644');
  grad.addColorStop(1, '#cc3322');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();

  // Basket
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 18);
  ctx.lineTo(x - 8, y + 28);
  ctx.lineTo(x + 8, y + 28);
  ctx.lineTo(x + 6, y + 18);
  ctx.stroke();

  // Ropes
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 18);
  ctx.lineTo(x - 7, y + 28);
  ctx.moveTo(x + 5, y + 18);
  ctx.lineTo(x + 7, y + 28);
  ctx.stroke();
}

function _drawSatellite(ctx, x, y) {
  // Body
  ctx.fillStyle = '#8899aa';
  ctx.fillRect(x - 8, y - 5, 16, 10);

  // Solar panels
  ctx.fillStyle = '#3355aa';
  ctx.fillRect(x - 28, y - 4, 18, 8);
  ctx.fillRect(x + 10, y - 4, 18, 8);

  // Panel lines
  ctx.strokeStyle = '#5577cc';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    const lx = x - 26 + i * 6;
    ctx.beginPath();
    ctx.moveTo(lx, y - 3);
    ctx.lineTo(lx, y + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx + 38, y - 3);
    ctx.lineTo(lx + 38, y + 3);
    ctx.stroke();
  }

  // Antenna
  ctx.strokeStyle = '#aabbcc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x + 3, y - 12);
  ctx.stroke();
}

function _drawAsteroid(ctx, x, y, d) {
  if (!d || !d.jagged) return;

  ctx.fillStyle = '#5a4035';
  ctx.strokeStyle = '#8a6a55';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + d.jagged[0].x, y + d.jagged[0].y);
  for (let i = 1; i < d.jagged.length; i++) {
    ctx.lineTo(x + d.jagged[i].x, y + d.jagged[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Danger glow
  ctx.shadowColor = 'rgba(255, 80, 50, 0.4)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(255, 100, 60, 0.5)';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ═══════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════

/** Remove a specific anchor */
export function removeAnchor(body) {
  removeFromWorld(body);
  activeAnchors = activeAnchors.filter(b => b !== body);
}

/** Remove all anchors behind a given X position */
export function despawnBehind(xThreshold) {
  const toRemove = activeAnchors.filter(b => b.position.x < xThreshold);
  for (const b of toRemove) {
    removeFromWorld(b);
  }
  activeAnchors = activeAnchors.filter(b => b.position.x >= xThreshold);
}

/** Clear all anchors */
export function clearAnchors() {
  for (const b of activeAnchors) {
    removeFromWorld(b);
  }
  activeAnchors = [];
}

/** Get count of active anchors */
export function getActiveAnchorCount() {
  return activeAnchors.length;
}

/** Get list of active anchors */
export function getActiveAnchors() {
  return activeAnchors;
}

/** Find the next grappleable anchor ahead of the player */
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
