# STEAL THE MOON 🌙🚀

> *Hook it. Swing it. Steal it.*

A physics-based browser game where you swing on a grappling hook through a city, sky, and space — and the goal is to literally steal the Moon and escape with it.

## Quick Start

1. Serve the project with any static file server:
   ```bash
   npx http-server . -p 8080
   ```
2. Open `http://localhost:8080` in your browser.
3. Click **STEAL IT** and start swinging!

## Controls

| Input | Action |
|---|---|
| **Mouse move** | Aim grappling hook |
| **Left click & hold** | Fire & attach hook toward cursor |
| **Release click** | Release hook, preserve velocity |
| **A / D or Left / Right arrows** | Pump swing (add tangential momentum) |
| **Space** | Boost |
| **R** | Instant restart |
| **Esc** | Pause / resume |

## Tech Stack

- **Vanilla JavaScript** (ES modules)
- **HTML5 Canvas 2D** rendering
- **Matter.js** for physics
- **WebAudio** for procedural sound effects
- No external images — 100% procedural art
- No backend — `localStorage` only

## Project Structure

```
steal-the-moon/
├── index.html
├── css/
│   ├── main.css
│   ├── menu.css
│   └── hud.css
├── js/
│   ├── main.js
│   ├── config.js
│   ├── stateMachine.js
│   ├── scoring.js
│   ├── engine/
│   │   ├── physicsWorld.js
│   │   ├── camera.js
│   │   └── loop.js
│   ├── entities/
│   │   ├── player.js
│   │   ├── grapplingHook.js
│   │   ├── moon.js
│   │   └── anchors.js
│   ├── world/
│   │   ├── phases.js
│   │   └── chunkGenerator.js
│   ├── fx/
│   │   ├── particles.js
│   │   └── screenShake.js
│   ├── ui/
│   │   ├── hud.js
│   │   ├── menu.js
│   │   └── toastText.js
│   └── audio/
│       └── audio.js
└── assets/
    └── audio/
```

## License

MIT
