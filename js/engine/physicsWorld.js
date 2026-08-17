// ─── PHYSICS WORLD ──────────────────────────────────────────
// Matter.js engine/world setup, collision categories, events.
// ─────────────────────────────────────────────────────────────

import { GAME_CONFIG } from '../config.js';

const { Engine, World, Bodies, Body, Events, Composite } = Matter;

// Collision categories (bitmasks)
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

  // Create ground/death plane (static, invisible — kills the player)
  const ground = Bodies.rectangle(
    5000,                       // far enough to cover the level
    GAME_CONFIG.groundY + 50,   // slightly below ground line
    100000,                     // very wide
    100,                        // thick
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
  if (world) World.add(world, bodies);
}

export function removeFromWorld(...bodies) {
  if (world) {
    bodies.forEach(b => {
      if (b) Composite.remove(world, b, true);
    });
  }
}

export function addConstraint(constraint) {
  if (world) World.add(world, constraint);
}

export function removeConstraint(constraint) {
  if (world) {
    try {
      Composite.remove(world, constraint);
    } catch(e) {
      // Constraint may already be removed
    }
  }
}

export function onCollisionStart(callback) {
  if (engine) Events.on(engine, 'collisionStart', callback);
}

export function clearWorld() {
  if (world) {
    World.clear(world, false);
    Engine.clear(engine);
  }
}

export function setGravity(x, y) {
  if (engine) {
    engine.gravity.x = x;
    engine.gravity.y = y;
  }
}

export function getAllBodies() {
  return world ? Composite.allBodies(world) : [];
}
