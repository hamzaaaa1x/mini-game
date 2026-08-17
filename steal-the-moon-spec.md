# STEAL THE MOON 🌙🚀
## AI-Ready Build Specification — MVP Edition

> **Instruction to the coding agent (Antigravity):** Build this project exactly as specified below.
> This is an **MVP-first** spec. Build only what is listed in Sections 1–20 first. Sections 21+ are
> explicitly marked as **Stretch Goals** — do not build them until the MVP is complete, playable, and fun.
> Do not add a backend, database, or external API calls anywhere in the MVP. Everything must run from
> a static folder opened in a browser or served by any static file server.

---

## 0. ONE-LINE PITCH

A physics-based browser game where you swing on a grappling hook through a city, sky, and space —
and the goal is to literally steal the Moon and escape with it.

**Feel:** *Hook it. Swing it. Steal it.*
**Success metric:** within 10 seconds a first-time player understands "I have a hook and I can swing,"
and within 60 seconds they've said "one more try" at least once.

---

## 1. TECH STACK (LOCKED — DO NOT SUBSTITUTE)

- **Language:** Vanilla JavaScript (ES modules), no TypeScript, no build step required to run it.
- **Rendering:** HTML5 Canvas 2D (not WebGL).
- **Physics:** Matter.js (loaded via CDN or local vendor file — no bundler required).
- **Audio:** Howler.js (optional — if omitted, use plain `<audio>` / WebAudio; audio must degrade
  gracefully with no console errors if files are missing).
- **UI:** Plain HTML + CSS overlay on top of the canvas (menus, HUD, game-over screen). No React,
  no frameworks.
- **Art:** 100% procedural — everything is drawn with Canvas primitives (arcs, paths, gradients,
  lines) and Matter.js bodies. **No external image/sprite assets.** See Section 15 for the exact
  visual recipe for every entity (player, buildings, moon, etc.) so the agent doesn't need to guess.
- **Persistence:** `localStorage` only. No backend, no database, no serverless functions in the MVP.
- **Hosting target:** Static site (works from GitHub Pages / Vercel static / opened locally via a
  simple `http-server`).

---

## 2. PROJECT FILE STRUCTURE

Create exactly this structure. Keep files small and single-purpose — never put unrelated logic
in the same file.

```text
steal-the-moon/
├── index.html
├── README.md
│
├── css/
│   ├── main.css          # resets, fonts, shared variables
│   ├── menu.css           # landing screen, game-over screen
│   └── hud.css            # in-game HUD overlay
│
├── js/
│   ├── main.js             # entry point, boot sequence, game loop start
│   ├── config.js           # GAME_CONFIG — every tunable number lives here
│   ├── stateMachine.js      # game state enum + transitions
│   ├── engine/
│   │   ├── physicsWorld.js  # Matter.js engine/world setup, gravity
│   │   ├── camera.js        # follow camera, zoom, shake
│   │   └── loop.js          # requestAnimationFrame loop, fixed timestep
│   ├── entities/
│   │   ├── player.js        # astronaut body + rendering
│   │   ├── grapplingHook.js # hook state machine + rope constraint
│   │   ├── moon.js          # moon entity, gravity field, steal logic
│   │   └── anchors.js       # buildings/lamps/satellites — all grappleable objects
│   ├── world/
│   │   ├── chunkGenerator.js # procedural chunk spawning by phase/difficulty
│   │   └── phases.js         # phase definitions (city/sky/space/moon/escape)
│   ├── fx/
│   │   ├── particles.js     # lightweight object-pooled particle system
│   │   └── screenShake.js
│   ├── ui/
│   │   ├── hud.js           # distance, boost bar, chain counter
│   │   ├── menu.js          # landing + game-over screen logic
│   │   └── toastText.js     # "PERFECT RELEASE", "SO CLOSE", "OH NO" popups
│   ├── audio/
│   │   └── audio.js
│   └── scoring.js
│
└── assets/
    └── audio/               # optional sound files, referenced defensively
```

---

## 3. GAME STATE MACHINE

```text
MENU → TUTORIAL_HINT → PLAYING → (PAUSED) → MOON_APPROACH → MOON_STOLEN → ESCAPE → GAME_OVER → MENU
```

Rules:
- `TUTORIAL_HINT` is not a separate screen — it's just the first ~10 seconds of `PLAYING` where
  control hints are shown faded over the HUD, then fade out.
- `PAUSED` can be entered from `PLAYING` or `ESCAPE` only (ESC key), and must fully stop the
  Matter.js engine (`Runner.stop` or skip `Engine.update`) so nothing moves in the background.
- Every state transition should be a single function call (`stateMachine.transition('GAME_OVER', payload)`),
  never scattered `if` checks across files.

---

## 4. CONTROLS

### Desktop (primary target)
| Input | Action |
|---|---|
| Mouse move | Aim grappling hook |
| Left mouse **down** | Fire hook toward cursor |
| Left mouse **up** (while attached) | Release hook, preserve velocity |
| `Space` (held or tapped, your choice — tapped is simpler) | Boost |
| `R` | Instant restart |
| `Esc` | Pause / resume |

### Mobile (secondary — build only after desktop feels great)
| Input | Action |
|---|---|
| Touch + drag | Aim |
| Release touch | Fire/release depending on hook state |
| On-screen boost button (bottom-right, ~64px tap target) | Boost |

If frame rate on mobile is unreliable, show a one-time dismissible banner:
*"Best experienced on desktop."* Do not let mobile compromise desktop physics tuning.

---

## 5. THE GRAPPLING HOOK (the most important system — build this first)

### 5.1 State machine
```text
IDLE → AIMING → FIRING → (ATTACHED → SWINGING) | MISSED → IDLE
SWINGING → RELEASING → FLYING → IDLE
```

### 5.2 Behavior, step by step
1. On mouse-down, compute the direction vector from player position to cursor/world position.
2. Spawn a fast-moving "hook tip" (a small invisible sensor, not a rendered projectile is fine
   for MVP — a simple line from player to a point traveling at `hookSpeed` along that direction
   is enough, and is much simpler to implement and debug than a physics projectile).
3. Raycast/step the tip forward each frame up to `grappleRange`. On overlap with a valid anchor
   body (tag `grappleable: true`), attach.
4. On attach: create a Matter.js `Constraint` between the player body and the anchor point, with:
   - `length` = current distance between player and anchor (this is the rope length — it does
     **not** auto-shorten; the player swings like a pendulum, they don't get reeled in).
   - `stiffness` around `0.15–0.3` (tune by feel — too stiff feels rigid, too loose feels like
     rubber).
   - Render the rope as a simple line from player to anchor every frame.
5. While attached, the player is in `SWINGING` — normal gravity + constraint physics take over.
   Do **not** apply extra manual forces during a swing; let Matter.js pendulum physics do the work.
6. On mouse-up (or the hook reaching max swing time — see `maxSwingDuration` in config as a safety
   net so players can't get stuck forever), remove the constraint. This is `RELEASING` → `FLYING`.
   **Velocity at the moment of release must be fully preserved** — this is the single most
   important feel requirement in the whole game. Do not damp or clamp velocity on release.
7. If the tip reaches `grappleRange` without hitting anything, or the click target had no valid
   anchor, play a "miss" whiff sound/particle and return to `IDLE` immediately — no penalty, no
   cooldown. Misses must feel free so players keep experimenting.

### 5.3 Design constraint
Only **one** hook can be active at a time in the MVP. No multi-hook, no auto-aim, no assisted
snapping in v1 (an optional small "magnetism" toward nearby anchors when the cursor is close can
be a stretch-goal juice pass, see Section 22).

---

## 6. PLAYER

- A single circular Matter.js body (radius ~14px in world units), drawn as a small astronaut
  silhouette (see Section 15.1 for the exact draw recipe).
- No walking/running input at all. The player is governed entirely by: gravity, the hook
  constraint while swinging, momentum while flying, and boost impulses.
- Falls at all times unless attached to a hook. There is **no ground to stand on** — landing on
  a rooftop or the street should trigger death/reset (this is a "keep moving" game, not a
  platformer).
- Player death conditions (MVP): hits the ground/water plane, falls below the camera for too
  long, or collides with a hazard tagged `dangerous: true`.

---

## 7. BOOST

- Player has a boost meter, 0–100, starts full.
- Tapping `Space` while airborne applies a one-time impulse in the current facing/velocity
  direction (or toward the cursor — pick whichever feels better once implemented; velocity
  direction is the simpler and usually better-feeling default) and drains a fixed chunk of the
  meter (`boostCost` in config).
- Boost regenerates slowly over time (`boostRegenRate`), never while actively boosting.
- Boost should never be so strong it trivializes the swing skill — it's a recovery/emphasis tool,
  not a second movement system. Tune `boostForce` conservatively and playtest.
- On boost: small particle burst behind the player + brief camera shake + a punchy sound.

---

## 8. GRAPPLE ANCHORS

Every anchor is a static or kinematic Matter.js body with a data tag:

```javascript
{
  grappleable: true,
  type: "building" | "lamp" | "crane" | "cloudPost" | "satellite" | "moon",
  moving: false,       // true for satellites etc.
  dangerous: false
}
```

### MVP anchor set (keep it small — do not build all anchor types from the original brainstorm list)
- **City phase:** buildings (tall rectangles at varying heights), street lamps (thin poles with a
  round top), one or two cranes (an L-shaped static body).
- **Sky phase:** clouds with a small fixed grapple post (simplifies "grappling a cloud" without
  needing soft-body cloud physics), one slow-moving hot air balloon (kinematic, moves in a
  gentle sine path).
- **Space phase:** satellites (small static/kinematic bodies drifting slowly), 1–2 asteroids
  tagged `dangerous: true` that must be avoided, not grappled.
- **Moon phase:** the Moon itself (Section 9).

Keep hazards minimal in the MVP: asteroids that end the run on contact are enough. Save meteor
showers, gravity wells, and rocket launches for the Escape stretch goal (Section 23).

---

## 9. THE MOON

- A large circular body far to the right/above the level, visually the hero object at all times
  (visible from the very first frame, glowing, so the player always has a directional goal).
- Has a **gravity field**: once the player is within `moonGravityRadius`, apply a gentle constant
  pull toward the Moon's center (a simple additive force, not full Newtonian gravity — keep it
  predictable).
- Has a single grapple point at its center that becomes grappleable once the player is within
  `moonApproachRadius` (don't let players cheese it by grappling the Moon from across the whole
  level — the challenge should be *reaching* it).
- On successful grapple attach to the Moon: immediately trigger the steal sequence (Section 10)
  regardless of swing state — you don't need to "release" from the Moon, attaching **is** the win
  condition for this phase.

---

## 10. STEAL SEQUENCE (scripted, ~3 seconds, non-interactive is fine for MVP)

1. Freeze player physics (or nearly — a soft snap to the Moon's grapple point looks good).
2. Camera zooms out to reveal the Moon and a sliver of Earth.
3. Screen shake pulse.
4. Big text: **"YOU GOT IT."**
5. Half-second beat, then: **"OH NO."** (Earth "notices")
6. Transition to `MOON_STOLEN` → immediately into `ESCAPE`.

---

## 11. ESCAPE MODE (MVP version — simple, not a full new mechanical system)

- The Moon is now soft-attached to the player (a short, high-stiffness constraint) — the player
  drags it along as they continue grappling/flying.
- Movement is heavier (tune `playerMass` up temporarily, or apply extra drag) to sell the weight
  of dragging the Moon.
- A fixed-distance "escape zone" target exists off-screen; reaching it = win.
- Add 2–3 already-built hazards (asteroids, one moving satellite) at higher density/speed than
  before as the only "difficulty ramp" — do **not** build the full AI Challenge Director for this
  (that's a stretch goal, Section 24). A simple `escapeSpeedMultiplier` config value scaling
  spawn rate is enough for MVP.
- On reaching the escape zone: `GAME_OVER` with a win flag (different game-over text/tone than a
  death).

---

## 12. CAMERA

- Smooth-follow the player with lerp (`cameraLerpFactor` in config), not a hard lock — this alone
  makes the game feel far more polished.
- Zoom out slightly when player speed exceeds a threshold (`highSpeedThreshold`).
- Brief zoom + shake on boost and on the steal sequence.
- Never let the camera clip so the player can see the edge of the generated world — always keep
  a chunk generation buffer ahead of the camera (see Section 13).

---

## 13. PROCEDURAL CHUNKS (keep simple for MVP)

- The world is generated in horizontal/upward chunks as the player progresses, not built as one
  fixed level.
- Each chunk is just a small JS object describing what anchors to spawn and where, drawn from a
  phase-appropriate pool:

```javascript
{
  phase: "city",       // city | sky | space | moonApproach
  anchors: [
    { type: "building", x: 800, height: 220 },
    { type: "lamp", x: 950, height: 90 }
  ]
}
```

- Generate the next chunk when the player's distance crosses a threshold; despawn (remove from
  Matter world) anchors well behind the camera to keep the body count low (Section 14).
- Phase order is fixed for MVP: `city → sky → space → moonApproach → (steal) → escape`. Don't
  build the AI-driven dynamic phase selection yet — see Section 24.

---

## 14. PERFORMANCE

- Target 60 FPS on a normal laptop.
- Use a fixed physics timestep (Matter.js `Engine.update(engine, 1000/60)`), decoupled from
  render framerate if needed, but a simple rAF loop calling both each frame is fine for MVP.
- Remove/despawn any Matter.js body once it's more than one screen-width behind the camera.
- Object-pool particles — never `new` a particle object every frame; reuse a fixed-size array.
- Keep total active dynamic bodies under ~40 at any time in the MVP.

---

## 15. VISUAL RECIPE (procedural art — no image assets)

Overall palette: deep navy/near-black background (`#0a0e1a` range), soft white/pale-blue
foreground shapes, warm glow accents on the Moon and boost effects. Add 2–3 parallax star layers
(small white dots at different scroll speeds) for depth — this is cheap and adds a lot of polish.

### 15.1 Player (astronaut)
- A rounded-rect or circle "body" (~24×28px) in off-white with a soft drop shadow.
- A slightly darker circular "visor" element offset toward the facing direction.
- Optional: two tiny thruster-flame triangles behind the player during boost only.

### 15.2 Buildings
- Simple vertical rectangles, varying widths/heights, dark slate fill (`#1a2035`-ish), with a
  scatter of small yellow-lit window rectangles (randomized per building via a seeded pattern —
  looks great, costs almost nothing).

### 15.3 Rope
- A single line (or a slight quadratic curve for a touch of rope "sag") from player to anchor,
  pale white, 2px, subtle glow via `shadowBlur`.

### 15.4 Moon
- A large circle with a radial gradient (pale gray-white center to soft edge), a handful of
  darker circular "craters" (randomized once, cached — don't redraw random craters every frame),
  and an outer soft glow via `shadowBlur`/`shadowColor`.

### 15.5 Particles
- Small filled circles or short line segments, additive-blend-style glow, fading alpha over
  lifetime. Used for hook fire/attach/release, boost, and the steal moment.

Do not source or embed any raster images, external fonts beyond a system-safe stack or one
Google Font import, or any third-party icon packs for the MVP.

---

## 16. UI SCREENS

### 16.1 Landing screen
- Big title "STEAL THE MOON" (two/three line stacked layout looks best).
- Tagline: *"Earth won't notice. Probably."*
- One large primary button: **STEAL IT** → starts `PLAYING`.
- Small best-distance readout pulled from `localStorage`.
- Compact control legend: `CLICK → GRAPPLE`, `RELEASE → SWING`, `SPACE → BOOST`.

### 16.2 HUD (during PLAYING/ESCAPE)
- Top-left: live distance in meters.
- Top-right: best distance.
- Bottom-left: boost bar.
- Bottom-center (only shown once chain ≥ 2): grapple chain counter.
- HUD must never obstruct the play area — keep it to thin margins.

### 16.3 Game over screen
- Headline depends on outcome: `"YOU FELL."` on death vs a celebratory headline on an escape win.
- Stats: distance, best distance, grapple count, max speed.
- Two buttons: **TRY AGAIN** (restart immediately, no reload) and **MAIN MENU**.

---

## 17. SCORING (MVP — keep it simple, expand later)

```text
Distance traveled     × 1 point/meter
Grapple chain bonus    × 10 per chain link (chain = consecutive grapples without hitting ground/dying)
Moon steal reached     flat 5000 points
Escape completed       flat 5000 points
```

Do not implement "perfect release," "near miss," or combo message systems in the MVP — those are
Section 22 stretch goals. Keep the scoring formula visible/tunable in `config.js`.

---

## 18. LOCAL STORAGE

Persist, at minimum:
```text
bestDistance
bestScore
totalRuns
soundEnabled
```
Simple `JSON.parse(localStorage.getItem(...))` with safe fallbacks if the key doesn't exist yet
— never let a missing key throw and break boot.

---

## 19. GAME CONFIG (centralize every tunable number — do not hardcode magic numbers elsewhere)

```javascript
export const GAME_CONFIG = {
  gravity: 0.9,
  playerMass: 1,
  playerRadius: 14,
  maxSpeed: 18,

  grappleRange: 600,
  hookSpeed: 25,
  ropeStiffness: 0.2,
  maxSwingDuration: 4000, // ms safety net

  boostForce: 8,
  boostCost: 25,          // out of 100
  boostRegenRate: 4,      // per second

  moonGravityRadius: 900,
  moonApproachRadius: 250,
  moonPullForce: 0.002,

  escapeSpeedMultiplier: 1.4,

  cameraLerpFactor: 0.08,
  highSpeedThreshold: 14,

  chunkSpawnLookahead: 1200, // px ahead of camera to keep generated
  chunkDespawnBehind: 800    // px behind camera to remove bodies
};
```

Every one of these values should be easy for the agent (and you, later) to nudge without
touching gameplay logic files.

---

## 20. DEFINITION OF DONE — MVP

Ship only when all of these are true:

- [ ] Game loads with zero console errors.
- [ ] Landing screen works and starts a run.
- [ ] Aiming, firing, attaching, swinging, and releasing the hook all feel responsive.
- [ ] Velocity is fully preserved on release (no snapping/clamping).
- [ ] Camera follows smoothly with lerp, zooms slightly at high speed.
- [ ] Player progresses visually through city → sky → space.
- [ ] Player can reach and successfully grapple the Moon.
- [ ] Steal sequence plays, then Escape mode begins.
- [ ] Escape can be won by reaching the escape zone, or lost by dying.
- [ ] Score and best distance are calculated and saved to `localStorage`.
- [ ] Instant restart works (`R` key and the Try Again button), no page reload needed.
- [ ] No image assets are used anywhere — everything is drawn procedurally.
- [ ] Stable ~60 FPS on a normal laptop with the default chunk density.
- [ ] Game is genuinely a little fun within the first 10 seconds.

Build order for the agent: **Sections 5 → 6 → 7 → 8 → 12 → 13 → 9 → 10 → 11 → 15 → 16 → 17 → 18.**
Get swinging feeling great on a single test anchor before building anything else — that's the
whole game, everything after it is context around that one feeling.

---

## 21. STRETCH GOALS (do NOT build until the MVP above is fully done and fun)

Everything below is explicitly out of scope for v1. Listed here only so the agent knows where the
project could go next, and so it doesn't accidentally build any of this instead of the MVP.

### 22. Juice pass
"Perfect release" mechanic (bonus for releasing at optimal swing angle) with slow-motion + big
particle burst; "near miss" detection and toast text; combo message ladder (`NICE → SICK →
LUNAR → ABSURD`); optional cursor-magnetism toward nearby anchors.

### 23. Full Escape mode
Meteor showers, gravity wells, rocket launches as distinct hazard types with their own spawn
patterns; a real difficulty ramp instead of a flat multiplier.

### 24. Adaptive difficulty / "Moon AI" director
Track death count, average swing duration, missed hooks, boost usage. Use it to scale obstacle
density and anchor spacing. Purely local/rule-based — still no backend required for this part.

### 25. Player behavior profile
End-of-run rule-based archetype ("THE RISK TAKER", "THE STRATEGIST", etc.) based on tracked
stats from Section 24.

### 26. Optional LLM commentary layer
A short, funny end-of-run line generated by an LLM (e.g. *"You spent 83% of that run flying
directly at a building. Bold strategy."*). **Requires a serverless function** (Vercel/Cloudflare
Worker) so the API key is never exposed client-side; the client calls your own endpoint, never
the LLM API directly. Must have a local fallback (a small hand-written template pool) if the
endpoint is unavailable, times out, or errors — the game must never depend on this to function.

### 27. Achievements + daily challenge
Achievement list (`FIRST FLIGHT`, `LUNAR THIEF`, `NO BRAKES`, etc.) persisted in `localStorage`;
a date-seeded deterministic "daily challenge" ruleset (e.g. low gravity, target distance) needing
no backend since the date itself is the seed.

### 28. Leaderboard
Local-only for a long time; a real global leaderboard would need a backend (Supabase/Firebase/
serverless) and should only be considered well after the MVP and stretch goals above are done.

---

## 29. BRAND VOICE (use for all UI copy, MVP and beyond)

Short, dry, a little smug. Examples:

- `MOON ACQUIRED. This is probably illegal.`
- `EARTH HAS NOTICED. Uh oh.`
- `YOU FELL. The Moon remains disappointingly secure.`
- `NEW RECORD. NASA is concerned.`

Avoid generic copy like "Start Game" or "Click here to begin" — every string should sound like it
was written by someone who thinks stealing the Moon is funny.

---

## END OF SPECIFICATION

**Project:** Steal the Moon
**Scope of this document:** MVP (Sections 1–20) + clearly separated stretch goals (21–28)
**Stack:** HTML + CSS + Vanilla JS + Canvas 2D + Matter.js, no backend, no image assets
**Build order:** Hook feel first, everything else after
