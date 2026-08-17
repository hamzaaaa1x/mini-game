// ─── TOAST TEXT ─────────────────────────────────────────────
// Scripted steal sequence popups (Section 10 of spec).
// ─────────────────────────────────────────────────────────────

let activeToasts = [];

export function showToast(text, duration = 1500, fontSize = 36, color = '#ffffff') {
  activeToasts.push({
    text,
    duration,
    fontSize,
    color,
    startTime: performance.now(),
    alpha: 0,
  });
}

export function toastYouGotIt() {
  showToast('YOU GOT IT.', 1200, 48, '#fff8dc');
}

export function toastOhNo() {
  showToast('OH NO.', 1500, 44, '#ff6655');
}

export function updateToasts() {
  const now = performance.now();
  for (let i = activeToasts.length - 1; i >= 0; i--) {
    const t = activeToasts[i];
    const elapsed = now - t.startTime;

    if (elapsed > t.duration) {
      activeToasts.splice(i, 1);
      continue;
    }

    if (elapsed < 200) {
      t.alpha = elapsed / 200;
    } else if (elapsed > t.duration - 300) {
      t.alpha = (t.duration - elapsed) / 300;
    } else {
      t.alpha = 1;
    }
  }
}

export function drawToasts(ctx, width, height) {
  for (const t of activeToasts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha));
    ctx.font = `900 ${t.fontSize}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 20;
    ctx.fillText(t.text, width / 2, height * 0.35);
    ctx.restore();
  }
}

export function clearToasts() {
  activeToasts = [];
}
