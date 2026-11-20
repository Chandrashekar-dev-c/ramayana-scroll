// The ink module. Every line in the game goes through here so the hand shows the same way
// everywhere: a small seeded wobble, a width that swells and thins like a bamboo nib, and
// the Mithila double outline with colour between the two lines.
import { noise } from '../core/rng.js';
import { PAL } from './palette.js';

/** Jitter points with stable, seeded noise. */
export function wobble(pts, seed, amp = 1.2) {
  if (!amp) return pts;
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    out[i] = [pts[i][0] + noise(seed, i * 2) * amp, pts[i][1] + noise(seed, i * 2 + 1) * amp];
  }
  return out;
}

/** Trace points as a path. Smooth paths curve through the midpoints. */
export function trace(ctx, pts, closed = false, smooth = false) {
  const n = pts.length;
  if (n < 2) return;
  ctx.beginPath();
  if (!smooth || n < 3) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
    return;
  }
  if (closed) {
    const mx = (pts[n - 1][0] + pts[0][0]) / 2, my = (pts[n - 1][1] + pts[0][1]) / 2;
    ctx.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}

/** A single nib line: one stroke, then seeded swells over parts of it. */
export function line(ctx, pts, o = {}) {
  const w = o.w ?? 2, seed = o.seed ?? 1;
  const p = wobble(pts, seed, o.amp ?? Math.min(1.4, w * 0.5));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.color || PAL.black;
  trace(ctx, p, o.closed, o.smooth);
  ctx.lineWidth = w; ctx.stroke();
  if (w >= 1.5 && !o.flat) {
    const d = 9 + (noise(seed, 91) + 1) * 9;
    ctx.setLineDash([d, d * 1.7, d * 0.6, d * 2.3]);
    ctx.lineDashOffset = (noise(seed, 92) + 1) * 20;
    ctx.lineWidth = w * 1.45; ctx.stroke();
    ctx.setLineDash([]);
  }
}

/**
 * A Mithila form: fill, then a double outline with the gap coloured.
 * mode 'colour' is bharni, 'line' is kachni (no fill, thin line), 'sil' is a solid silhouette.
 */
export function shape(ctx, pts, o = {}) {
  const seed = o.seed ?? 1, w = o.w ?? 2;
  const mode = o.mode || 'colour';
  const p = wobble(pts, seed, o.amp ?? 1.1);
  const closed = o.closed !== false;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  trace(ctx, p, closed, o.smooth);
  if (mode === 'sil') { ctx.fillStyle = PAL.black; ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = w * 2; ctx.stroke(); return; }
  if (mode === 'line') {
    if (o.lineFill) { ctx.fillStyle = o.lineFill; ctx.fill(); }
    ctx.strokeStyle = o.lineColor || PAL.black; ctx.lineWidth = Math.max(1, w * 0.6); ctx.stroke();
    return;
  }
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.pattern) { ctx.fillStyle = o.pattern; ctx.fill(); }
  if (o.outline === false) return;
  const gap = o.gap;
  if (gap) {
    ctx.strokeStyle = o.outlineColor || PAL.black; ctx.lineWidth = w * 2.6; ctx.stroke();
    ctx.strokeStyle = gap; ctx.lineWidth = w * 0.9; ctx.stroke();
  } else {
    ctx.strokeStyle = o.outlineColor || PAL.black; ctx.lineWidth = w; ctx.stroke();
  }
}

/** Parallel hatching clipped to a closed shape. */
export function hatch(ctx, pts, o = {}) {
  const seed = o.seed ?? 3, sp = o.spacing ?? 7, ang = o.angle ?? 0.7;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.hypot(x1 - x0, y1 - y0) / 2;
  ctx.save();
  trace(ctx, pts, true, o.smooth); ctx.clip();
  ctx.strokeStyle = o.color || PAL.black; ctx.lineWidth = o.w ?? 1; ctx.lineCap = 'round';
  const cs = Math.cos(ang), sn = Math.sin(ang);
  ctx.beginPath();
  let i = 0;
  for (let d = -r; d <= r; d += sp, i++) {
    const j = noise(seed, i) * sp * 0.25;
    const ax = cx + cs * -r - sn * (d + j), ay = cy + sn * -r + cs * (d + j);
    const bx = cx + cs * r - sn * (d - j), by = cy + sn * r + cs * (d - j);
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Dry-brush hatching: each hatch line is laid down as a few bristle strokes with
 * uneven pressure, and the brush lifts partway along, so the lines break and thin
 * the way a loaded brush does on paper. Same clip and angle as `hatch`.
 */
export function dryHatch(ctx, pts, o = {}) {
  const seed = o.seed ?? 3, sp = o.spacing ?? 9, ang = o.angle ?? 0.9, w = o.w ?? 0.8;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.hypot(x1 - x0, y1 - y0) / 2;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  const at = (t, d) => [cx + cs * t - sn * d, cy + sn * t + cs * d];
  ctx.save();
  trace(ctx, pts, true, o.smooth); ctx.clip();
  ctx.strokeStyle = o.color || PAL.black; ctx.lineCap = 'round';
  let i = 0;
  for (let d = -r; d <= r; d += sp, i++) {
    const bristles = 2 + (i % 2);
    for (let b = 0; b < bristles; b++) {
      const off = (b - (bristles - 1) / 2) * 1.5 + noise(seed, i * 7 + b) * sp * 0.2;
      const start = -r + ((noise(seed, i * 5 + b) + 1) / 2) * r * 0.5;
      const end = r - ((noise(seed, i * 9 + b) + 1) / 2) * r * 0.45;
      const lift = (start + end) / 2 + noise(seed, i * 3 + b) * r * 0.2;
      const gap = r * 0.05;
      const parts = [[start, lift - gap], [lift + gap, end]];
      for (let s = 0; s < parts.length; s++) {
        const [a, z] = parts[s];
        if (z <= a) continue;
        // pressure: the stroke swells in the middle and thins at both ends
        const press = 0.55 + (noise(seed, i * 13 + b * 2 + s) + 1) * 0.25;
        ctx.lineWidth = w * press;
        const [ax, ay] = at(a, d + off), [bx, by] = at(z, d + off);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function ellipsePts(cx, cy, rx, ry, n = 14, a0 = 0, a1 = Math.PI * 2) {
  const pts = [];
  const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6;
  const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }

/** A cluster of dots: the game's small filler and the painted hit burst. */
export function dots(ctx, cx, cy, r, n, color, seed = 1, size = 2) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + noise(seed, i) * 0.3;
    const rr = r * (0.75 + noise(seed, i + 50) * 0.25);
    ctx.moveTo(cx + Math.cos(a) * rr + size, cy + Math.sin(a) * rr);
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, size, 0, 6.3);
  }
  ctx.fill();
}

/** Text on a paper plate. Objective and hint text never sits straight on the painting. */
export function plate(ctx, text, x, y, o = {}) {
  const size = o.size ?? 22;
  ctx.font = `${o.italic ? 'italic ' : ''}${o.bold ? '700 ' : ''}${size}px ${o.font || '"Alegreya Sans", sans-serif'}`;
  const lines = String(text).split('\n');
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
  const padX = o.padX ?? 16, padY = o.padY ?? 9, lh = size * 1.25;
  const w = tw + padX * 2, h = lines.length * lh + padY * 2;
  const ax = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  const ay = o.valign === 'top' ? y : o.valign === 'bottom' ? y - h : y - h / 2;
  shape(ctx, rectPts(ax, ay, w, h), { fill: o.bg || PAL.paper, gap: o.gap || PAL.turmeric, w: 1.6, seed: o.seed ?? 7, amp: 0.8 });
  ctx.fillStyle = o.color || PAL.black; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], ax + w / 2, ay + padY + lh * (i + 0.5));
  return { x: ax, y: ay, w, h };
}
