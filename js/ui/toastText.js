// ─── TOAST TEXT ─────────────────────────────────────────────
// Floating text popups: "YOU GOT IT.", "OH NO.", etc.
// Fade-in, hold, fade-out animation.
// ─────────────────────────────────────────────────────────────

const toasts = [];

/**
 * Show a toast message on screen.
 * @param {string} text - The message
 * @param {object} opts - Configuration
 */
export function showToast(text, opts = {}) {
  const {
    duration = 2000,
    fadeIn = 300,
    fadeOut = 500,
    fontSize = 48,
    color = '#ffffff',
    y = 0.4,           // vertical position as fraction of canvas height
    shadow = true,
  } = opts;

  toasts.push({
    text,
    duration,
    fadeIn,
    fadeOut,
    fontSize,
    color,
    yFrac: y,
    shadow,
    startTime: performance.now(),
    alpha: 0,
  });
}

/** Pre-built toast presets with brand voice */
export function toastYouGotIt() {
  showToast('YOU GOT IT.', {
    duration: 1800,
    fontSize: 56,
    color: '#ffeeaa',
    y: 0.35,
  });
}

export function toastOhNo() {
  showToast('OH NO.', {
    duration: 1200,
    fontSize: 64,
    color: '#ff6644',
    y: 0.4,
  });
}

export function toastEarthNoticed() {
  showToast('EARTH HAS NOTICED.', {
    duration: 1500,
    fontSize: 36,
    color: '#ffaa66',
    y: 0.5,
  });
}

export function toastMoonAcquired() {
  showToast('MOON ACQUIRED. This is probably illegal.', {
    duration: 2000,
    fontSize: 32,
    color: '#aaddff',
    y: 0.55,
  });
}

export function toastYouFell() {
  showToast('YOU FELL.', {
    duration: 1500,
    fontSize: 48,
    color: '#ff6655',
    y: 0.35,
  });
}

export function toastNewRecord() {
  showToast('NEW RECORD. NASA is concerned.', {
    duration: 2000,
    fontSize: 32,
    color: '#88ff88',
    y: 0.55,
  });
}

/** Update toast animations */
export function updateToasts() {
  const now = performance.now();

  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i];
    const elapsed = now - t.startTime;
    const totalDuration = t.fadeIn + t.duration + t.fadeOut;

    if (elapsed > totalDuration) {
      toasts.splice(i, 1);
      continue;
    }

    // Calculate alpha
    if (elapsed < t.fadeIn) {
      t.alpha = elapsed / t.fadeIn;
    } else if (elapsed < t.fadeIn + t.duration) {
      t.alpha = 1;
    } else {
      t.alpha = 1 - (elapsed - t.fadeIn - t.duration) / t.fadeOut;
    }
  }
}

/** Draw toasts (screen-space, not world-space) */
export function drawToasts(ctx, canvasWidth, canvasHeight) {
  for (const t of toasts) {
    if (t.alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.fontSize}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (t.shadow) {
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 20;
    }

    const x = canvasWidth / 2;
    const y = canvasHeight * t.yFrac;

    ctx.fillText(t.text, x, y);

    // Double-draw for glow
    if (t.shadow) {
      ctx.globalAlpha = t.alpha * 0.3;
      ctx.fillText(t.text, x, y);
    }

    ctx.restore();
  }
}

/** Clear all toasts */
export function clearToasts() {
  toasts.length = 0;
}
