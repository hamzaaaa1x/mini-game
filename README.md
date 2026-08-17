# STEAL THE MOON 🌙🚀

> *Hook it. Swing it. Steal it.*

A physics-based browser game where you swing on a grappling hook through a city, sky, and space — and the goal is to literally steal the Moon and escape with it.

---

## 🎮 How to Play

1. **Aim**: Move mouse cursor to aim your grappling hook.
2. **Grapple**: **Click & Hold** left mouse button to fire and swing on anchors.
3. **Fly**: **Release Click** to let go and soar forward with momentum.
4. **Boost**: Tap **Space** to trigger an emergency thruster burst.
5. **Restart**: Press **R** to restart immediately.
6. **Pause**: Press **Escape** to pause or resume.

---

## 🚀 Running Locally

This game is built with vanilla JavaScript (ES modules) and HTML5 Canvas with Matter.js physics. Because modern browsers enforce CORS restrictions on ES modules, open it using a local static web server:

```bash
# Option 1: Using npx http-server (Recommended)
npx -y http-server . -p 3000 -c-1 --cors

# Option 2: Using npx serve
npx -y serve . -p 3000

# Option 3: Using Python 3
python3 -m http.server 3000
```

Then open **`http://localhost:3000`** in your browser.
