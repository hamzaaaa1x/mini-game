// ─── PHYSICS WORLD ──────────────────────────────────────────
// Matter.js engine/world setup, collision bitmasks, bodies.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

const { Engine, World, Bodies, Body, Events, Composite, Constraint } = Matter;

export const CATEGORIES = {
  PLAYER:   0x0001,
  ANCHOR:   0x0002,
  GROUND:   0x0004,
  HAZARD:   0x0008,
  HOOK_TIP: 0x0010,
};

let engine = null;
let world = null;

export function createPhysicsWorld() {
  engine = Engine.create({
    gravity: { x: 0, y: GAME_CONFIG.gravity },
    enableSleeping: false,
  });
  world = engine.world;

  // Static ground plane that ends run on contact
  const ground = Bodies.rectangle(
    50000,
    GAME_CONFIG.groundY + 100,
    200000,
    200,
    {
      isStatic: true,
      label: 'ground',
      collisionFilter: {
        category: CATEGORIES.GROUND,
        mask: CATEGORIES.PLAYER,
      },
      render: { visible: false },
      plugin: { dangerous: true },
    }
  );
  World.add(world, ground);

  return { engine, world };
}

export function getEngine() { return engine; }
export function getWorld()  { return world; }

export function stepPhysics(delta = 1000 / 60) {
  if (engine) {
    Engine.update(engine, delta);
  }
}

export function addToWorld(...bodies) {
  if (world && bodies.length > 0) {
    World.add(world, bodies);
  }
}

export function removeFromWorld(...bodies) {
  if (world && bodies.length > 0) {
    for (const b of bodies) {
      if (b) {
        try {
          Composite.remove(world, b, true);
        } catch (e) {
          // Body already removed
        }
      }
    }
  }
}

export function addConstraint(constraint) {
  if (world && constraint) {
    World.add(world, constraint);
  }
}

export function removeConstraint(constraint) {
  if (world && constraint) {
    try {
      Composite.remove(world, constraint);
    } catch (e) {
      // Constraint already removed
    }
  }
}

export function onCollisionStart(callback) {
  if (engine) {
    Events.on(engine, 'collisionStart', callback);
  }
}

export function setGravity(x, y) {
  if (engine) {
    if (Number.isFinite(x)) engine.gravity.x = x;
    if (Number.isFinite(y)) engine.gravity.y = y;
  }
}

export function getAllBodies() {
  return world ? Composite.allBodies(world) : [];
}
