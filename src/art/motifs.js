// Mithila motifs: the game's own vocabulary. A motif that signals a danger or a reward is
// used for that and nothing else (Rule C): fish-scale band = shockwave, opening lotus =
// stomp, painted star = a blow is coming, coiling naga = noose, rice-paste dots = arrow path,
// ring of yellow dots = usable, flowering vine = healing, naina-jogins = low health.
import { shape, line, hatch, ellipsePts, dots, rectPts } from './ink.js';
import { PAL } from './palette.js';
import { noise } from '../core/rng.js';

const TAU = Math.PI * 2;
const lc = (o) => o.lineColor || (o.night ? PAL.nightLine : PAL.black);
const md = (o) => (o.colour ? 'colour' : 'line');
const bg = (o) => (o.night ? PAL.night : PAL.cream);

export function fish(ctx, x, y, s, o = {}) {
  const d = o.dir === -1 ? -1 : 1;
  const p = [[-s, 0], [-s * 0.4, -s * 0.42], [s * 0.4, -s * 0.3], [s * 0.75, 0], [s * 1.15, -s * 0.36], [s * 1.15, s * 0.36], [s * 0.75, 0], [s * 0.4, s * 0.3], [-s * 0.4, s * 0.42]].map(([a, b]) => [x - a * d, y + b]);
  shape(ctx, p, { mode: md(o), fill: o.fill || PAL.turmeric, lineColor: lc(o), w: o.w ?? 1.2, seed: o.seed ?? 4, smooth: true, amp: 0.5 });
  ctx.fillStyle = lc(o); ctx.beginPath(); ctx.arc(x + d * s * 0.6, y - s * 0.08, Math.max(0.8, s * 0.07), 0, TAU); ctx.fill();
}

export function bird(ctx, x, y, s, o = {}) {
  const d = o.dir === -1 ? -1 : 1;
  const P = (a) => a.map(([px, py]) => [x + px * d * s, y + py * s]);
  shape(ctx, P([[-1, 0.1], [-0.3, -0.45], [0.5, -0.35], [0.8, -0.05], [0.4, 0.4], [-0.4, 0.35]]), { mode: md(o), fill: o.fill || PAL.leaf, lineColor: lc(o), w: o.w ?? 1.2, seed: o.seed ?? 5, smooth: true, amp: 0.5 });
  line(ctx, P([[0.8, -0.05], [1.15, 0.05], [0.8, 0.12]]), { w: o.w ?? 1.2, color: o.colour ? PAL.madder : lc(o), seed: 2, amp: 0.3 });
  line(ctx, P([[-1, 0.1], [-1.6, 0.3]]), { w: o.w ?? 1.2, color: lc(o), seed: 3, amp: 0.3 });
  line(ctx, P([[-0.2, -0.05], [0.25, 0.12], [-0.1, 0.2]]), { w: (o.w ?? 1.2) * 0.7, color: lc(o), seed: 4, amp: 0.3, flat: true });
}

/** A Mithila peacock: plump blue body, crested head on a curving neck, and a sweep of
 *  eye-spot tail feathers. Perches in trees and stands by ponds. */
export function peacock(ctx, x, y, s, o = {}) {
  const d = o.dir === -1 ? -1 : 1, c = lc(o), m = md(o);
  const blue = o.colour ? PAL.indigo : (o.night ? PAL.nightLine : c);
  const nF = 7;
  for (let i = 0; i < nF; i++) {
    const t = i / (nF - 1);
    const fl = s * (1.5 + t * 0.6);
    const fx = x - d * (0.2 + t * 0.9) * fl, fy = y + (0.1 + t * 0.7) * fl;
    line(ctx, [[x - d * s * 0.1, y], [(x - d * s * 0.1 + fx) / 2, (y + fy) / 2 - s * 0.25], [fx, fy]], { w: 1, color: o.colour ? PAL.leaf : c, smooth: true, seed: (o.seed ?? 1) + i, amp: 0.4 });
    shape(ctx, ellipsePts(fx, fy, s * 0.2, s * 0.26, 8), { mode: m, fill: o.colour ? PAL.leaf : bg(o), lineColor: c, w: 0.9, seed: i, smooth: true });
    ctx.fillStyle = o.colour ? PAL.indigo : c; ctx.beginPath(); ctx.ellipse(fx, fy, s * 0.1, s * 0.13, 0, 0, TAU); ctx.fill();
    if (o.colour) { ctx.fillStyle = PAL.turmeric; ctx.beginPath(); ctx.ellipse(fx, fy, s * 0.045, s * 0.06, 0, 0, TAU); ctx.fill(); }
  }
  shape(ctx, [[x + d * s * 0.32, y - s * 0.12], [x + d * s * 0.1, y - s * 0.52], [x - d * s * 0.22, y - s * 0.38], [x - d * s * 0.26, y + s * 0.2], [x + d * s * 0.22, y + s * 0.24]], { mode: m, fill: blue, lineColor: c, w: 1.1, seed: (o.seed ?? 2) + 1, smooth: true, amp: 0.4 });
  line(ctx, [[x + d * s * 0.18, y - s * 0.42], [x + d * s * 0.52, y - s * 0.72], [x + d * s * 0.46, y - s * 0.98]], { w: s * 0.15, color: blue, smooth: true, seed: 3 });
  ctx.fillStyle = blue; ctx.beginPath(); ctx.ellipse(x + d * s * 0.47, y - s * 1.05, s * 0.13, s * 0.11, 0, 0, TAU); ctx.fill();
  line(ctx, [[x + d * s * 0.58, y - s * 1.06], [x + d * s * 0.74, y - s * 1.04]], { w: 1, color: c, flat: true });
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + d * s * 0.5, y - s * 1.08, s * 0.03, 0, TAU); ctx.fill();
  for (let i = -1; i <= 1; i++) { line(ctx, [[x + d * s * 0.46, y - s * 1.16], [x + d * s * 0.46 + i * s * 0.09, y - s * 1.34]], { w: 0.8, color: c, seed: i }); if (o.colour) { ctx.fillStyle = PAL.indigo; ctx.beginPath(); ctx.arc(x + d * s * 0.46 + i * s * 0.09, y - s * 1.36, s * 0.035, 0, TAU); ctx.fill(); } }
  for (const lx of [-s * 0.02, d * s * 0.12]) line(ctx, [[x + lx, y + s * 0.24], [x + lx, y + s * 0.5]], { w: 1, color: c, seed: 5 });
}

/** A lotus seen from above, opening from bud (0) to full (1). The stomp telegraph. */
export function lotus(ctx, x, y, r, open = 1, o = {}) {
  const n = o.petals || 8, k = 0.25 + open * 0.75;
  for (let ring = 0; ring < 2; ring++) {
    const rr = r * (ring ? 0.6 : 1) * k;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ring * (Math.PI / n) + (o.rot || 0);
      const c = Math.cos(a), s = Math.sin(a), w = rr * 0.34;
      const yy = o.flat ? 0.34 : 1;
      shape(ctx, [[x + c * rr * 0.15, y + s * rr * 0.15 * yy], [x + c * rr * 0.6 - s * w, y + (s * rr * 0.6 + c * w) * yy], [x + c * rr, y + s * rr * yy], [x + c * rr * 0.6 + s * w, y + (s * rr * 0.6 - c * w) * yy]], { mode: md({ colour: o.colour !== false }), fill: o.fill || PAL.pink, gap: o.gap, lineColor: lc(o), w: o.w ?? 1.5, seed: (o.seed ?? 9) + i, smooth: true, amp: 0.6 });
    }
  }
  ctx.fillStyle = o.centre || PAL.turmeric; ctx.beginPath(); ctx.ellipse(x, y, r * 0.14 * k, r * 0.14 * k * (o.flat ? 0.4 : 1), 0, 0, TAU); ctx.fill();
}

/** A side-on lotus on a stem: checkpoints, boss health, decoration. wilt 0..1. */
export function lotusBud(ctx, x, y, r, o = {}) {
  const wilt = o.wilt || 0;
  const colr = wilt > 0.99 ? PAL.grey : o.fill || PAL.pink;
  const m = wilt > 0.99 ? 'line' : md({ colour: o.colour !== false });
  const droop = wilt * r * 0.7;
  for (let i = -2; i <= 2; i++) {
    const sp = i * r * 0.38 * (1 + wilt * 0.5);
    shape(ctx, [[x + i * r * 0.12, y], [x + sp - r * 0.2, y - r * 0.5 + droop * 0.6], [x + sp * 1.3, y - r * (1 - Math.abs(i) * 0.14) + droop], [x + sp + r * 0.2, y - r * 0.5 + droop * 0.6]], { mode: m, fill: colr, lineColor: lc(o), w: o.w ?? 1.4, seed: (o.seed ?? 3) + i, smooth: true, amp: 0.5 });
  }
}

/** The painted star: a blow is coming. Never used for anything else. */
export function star(ctx, x, y, r, o = {}) {
  const pts = [];
  const n = o.points || 8;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU + (o.rot || 0); const rr = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  shape(ctx, pts, { mode: 'colour', fill: o.fill || PAL.kusum, gap: o.gap ?? PAL.white, w: o.w ?? 1.6, seed: o.seed ?? 8, amp: 0.4 });
  if (o.shadow) hatch(ctx, pts, { color: PAL.black, spacing: 4, angle: 0.8, seed: 2 });
}

export function sun(ctx, x, y, r, o = {}) {
  const rays = o.rays ?? 12, lit = o.lit ?? rays;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU - Math.PI / 2, a2 = a + TAU / rays / 2.6, a0 = a - TAU / rays / 2.6;
    shape(ctx, [[x + Math.cos(a0) * r * 1.12, y + Math.sin(a0) * r * 1.12], [x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75], [x + Math.cos(a2) * r * 1.12, y + Math.sin(a2) * r * 1.12]], { mode: i < lit && o.colour !== false ? 'colour' : 'line', fill: o.rayFill || PAL.saffron, lineFill: o.lineFill || PAL.paper, lineColor: lc(o), w: 1.3, seed: 20 + i, amp: 0.4 });
  }
  shape(ctx, ellipsePts(x, y, r, r, 14), { mode: o.colour !== false ? 'colour' : 'line', fill: o.fill || PAL.turmeric, lineFill: o.lineFill || PAL.paper, lineColor: lc(o), gap: o.colour !== false ? PAL.madder : null, w: 1.5, seed: 31, smooth: true, amp: 0.5 });
  if (o.face !== false) {
    ctx.fillStyle = PAL.black;
    ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.12, r * 0.2, r * 0.1, 0, 0, TAU); ctx.ellipse(x + r * 0.32, y - r * 0.12, r * 0.2, r * 0.1, 0, 0, TAU); ctx.fill();
    line(ctx, [[x - r * 0.25, y + r * 0.35], [x, y + r * 0.48], [x + r * 0.25, y + r * 0.35]], { w: 1.2, smooth: true, seed: 2, amp: 0.2 });
  }
}

export function moon(ctx, x, y, r, o = {}) {
  const p = [];
  for (let i = 0; i <= 10; i++) { const a = -1.9 + (i / 10) * 3.8; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  for (let i = 10; i >= 0; i--) { const a = -1.5 + (i / 10) * 3.0; p.push([x + r * 0.42 + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82]); }
  shape(ctx, p, { mode: 'colour', fill: o.fill || PAL.white, outlineColor: o.night ? PAL.nightLine : PAL.black, w: 1.4, seed: 12, amp: 0.4 });
}

/** A vine band: the border along the ground and between the tiers of the wall. */
export function vineBand(ctx, x0, x1, y, o = {}) {
  const h = o.h ?? 16, step = o.step ?? 44, c = lc(o);
  const p = [];
  const start = Math.floor(x0 / step) * step;
  for (let x = start; x <= x1 + step; x += step / 2) p.push([x, y + (Math.round(x / (step / 2)) % 2 ? -h * 0.42 : h * 0.42)]);
  line(ctx, p, { w: o.w ?? 1.6, color: o.colour ? PAL.leaf : c, smooth: true, seed: o.seed ?? 6, amp: 0.6, flat: true });
  for (let x = start; x <= x1 + step; x += step / 2) {
    const upw = Math.round(x / (step / 2)) % 2 ? 1 : -1;
    const lx = x + step * 0.12, ly = y + upw * h * 0.2;
    shape(ctx, [[lx, ly], [lx + step * 0.16, ly - upw * h * 0.75], [lx + step * 0.3, ly]], { mode: md(o), fill: PAL.leaf, lineColor: c, w: 1.1, seed: Math.abs(x | 0) + 3, smooth: true, amp: 0.5 });
    if (Math.round(x / (step / 2)) % 4 === 0) dots(ctx, x, y + upw * h * 0.5, 0, 1, o.colour ? PAL.madder : c, 1, o.colour ? 3 : 2);
  }
}

/** Stacked flame tongues with a black outline. Fire is never a glow. */
export function flame(ctx, x, y, h, o = {}) {
  const t = o.t || 0, sd = o.seed ?? 1;
  const tongues = o.tongues ?? 3;
  for (let i = 0; i < tongues; i++) {
    const k = i - (tongues - 1) / 2;
    const fl = 1 + noise(sd + i, Math.floor(t * 8)) * 0.14;
    const hh = h * (1 - Math.abs(k) * 0.24) * fl, w = h * 0.22;
    const bx = x + k * h * 0.26;
    shape(ctx, [[bx - w, y], [bx - w * 0.9, y - hh * 0.5], [bx + noise(sd, i + Math.floor(t * 8)) * w * 0.5, y - hh], [bx + w * 0.7, y - hh * 0.45], [bx + w, y]], { mode: 'colour', fill: i % 2 ? PAL.saffron : PAL.kusum, w: o.w ?? 1.4, seed: sd + i, smooth: true, amp: 0.5 });
  }
  if (h > 20) shape(ctx, [[x - h * 0.1, y], [x, y - h * 0.45], [x + h * 0.1, y]], { mode: 'colour', fill: PAL.turmeric, w: 1, seed: sd + 9, smooth: true, amp: 0.3 });
}

/** A small flame for lamps: turmeric (usable), not danger red. */
export function lampFlame(ctx, x, y, h, t = 0, seed = 1) {
  const fl = 1 + noise(seed, Math.floor(t * 8)) * 0.15;
  shape(ctx, [[x - h * 0.28, y], [x - h * 0.2, y - h * 0.5 * fl], [x, y - h * fl], [x + h * 0.2, y - h * 0.5 * fl], [x + h * 0.28, y]], { mode: 'colour', fill: PAL.turmeric, gap: null, w: 1.2, seed, smooth: true, amp: 0.3 });
}

export function diya(ctx, x, y, s, lit, t = 0, o = {}) {
  shape(ctx, [[x - s, y - s * 0.3], [x + s * 1.2, y - s * 0.3], [x + s * 0.5, y + s * 0.4], [x - s * 0.5, y + s * 0.4]], { mode: lit || o.colour ? 'colour' : 'line', fill: PAL.terracotta, lineFill: bg(o), lineColor: lc(o), w: 1.3, seed: o.seed ?? 2, smooth: true, amp: 0.4 });
  if (lit) lampFlame(ctx, x + s * 0.5, y - s * 0.3, s * 1.5, t, o.seed ?? 2);
}

/** Rows of moving wave lines: water. */
export function waves(ctx, x0, x1, y0, y1, o = {}) {
  const t = o.t || 0, gap = o.gap ?? 18, c = o.colour ? PAL.river : lc(o);
  let r = 0;
  for (let y = y0; y <= y1; y += gap, r++) {
    const off = ((t * (o.speed ?? 14) * (r % 2 ? 1 : -0.7)) % 48) - 48;
    const p = [];
    for (let x = x0 + off; x <= x1 + 48; x += 12) p.push([x, y + (Math.round((x - off - x0) / 12) % 4 < 2 ? -3.2 : 3.2)]);
    line(ctx, p, { w: o.w ?? 1.3, color: c, smooth: true, seed: r + 3, amp: 0, flat: true });
  }
}

export function cloud(ctx, x, y, w, o = {}) {
  const c = lc(o);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const cx = x + (i - 1) * w * 0.3, r = w * (i === 1 ? 0.2 : 0.15);
    const p = [];
    for (let a = 0; a < 9; a += 0.5) p.push([cx + Math.cos(a) * r * (1 - a / 12), y + Math.sin(a) * r * (1 - a / 12)]);
    line(ctx, p, { w: o.w ?? 1.3, color: o.storm ? PAL.storm : c, seed: (o.seed ?? 1) + i, smooth: true, amp: 0.3, flat: true });
  }
  if (o.hatch) hatch(ctx, ellipsePts(x, y, w * 0.5, w * 0.2, 10), { color: o.storm ? PAL.storm : c, spacing: o.hatch, angle: 1.2, seed: 5, smooth: true });
  line(ctx, [[x - w * 0.5, y + w * 0.2], [x + w * 0.5, y + w * 0.2]], { w: 1.2, color: o.storm ? PAL.storm : c, seed: 3, amp: 0.4, flat: true });
}

/** A veiled naina-jogin for the screen corners. `look` 0..1 lifts her eyes to the player. */
export function nainaJogin(ctx, x, y, s, look = 0, flip = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
  const col = look > 0.5;
  shape(ctx, [[-s * 0.7, s], [-s * 0.62, -s * 0.2], [-s * 0.3, -s * 0.95], [s * 0.25, -s], [s * 0.62, -s * 0.3], [s * 0.7, s]], { mode: col || o.colour ? 'colour' : 'line', fill: PAL.madder, gap: PAL.turmeric, lineFill: PAL.cream, w: 1.5, seed: 14, smooth: true, amp: 0.5 });
  shape(ctx, ellipsePts(s * 0.05, -s * 0.28, s * 0.36, s * 0.42, 10), { mode: 'colour', fill: PAL.skinPale, w: 1.2, seed: 15, smooth: true, amp: 0.3 });
  const ey = -s * 0.3 + (1 - look) * s * 0.12;
  const eh = s * (0.03 + look * 0.1);
  shape(ctx, [[-s * 0.22, ey], [s * 0.05, ey - eh], [s * 0.34, ey], [s * 0.05, ey + eh]], { mode: 'colour', fill: PAL.white, w: 1, seed: 16, smooth: true, amp: 0.2 });
  if (look > 0.2) { ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(s * 0.08, ey, s * 0.07, 0, TAU); ctx.fill(); }
  line(ctx, [[-s * 0.5, s * 0.25], [s * 0.5, s * 0.25]], { w: 1.2, color: col ? PAL.turmeric : PAL.black, seed: 4, amp: 0.4 });
  ctx.restore();
}

/** A ring of yellow dots: you can use this. */
export function usableRing(ctx, x, y, r, t = 0) {
  dots(ctx, x, y, r, Math.max(8, Math.round(r / 5)), PAL.turmeric, Math.floor(t * 2) + 1, 2.6);
}

/** A rolling band of fish scales: the ground shockwave. */
export function scaleBand(ctx, x, y, w, h, dir = 1) {
  const n = Math.max(2, Math.round(w / 16));
  for (let i = 0; i < n; i++) {
    const cx = x + dir * i * 16;
    shape(ctx, ellipsePts(cx, y, 11, h, 7, Math.PI, TAU), { mode: 'colour', fill: PAL.kusum, gap: PAL.white, w: 1.3, seed: i + 2, closed: true, amp: 0.4 });
  }
}

/** A coiling naga line that tightens: the noose. k 0..1 is how closed it is. */
export function nagaCoil(ctx, x, y, r, k, o = {}) {
  const p = [];
  const turns = 2.2, rr = r * (1 - k * 0.72);
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU * turns + (o.rot || 0); const q = rr * (0.55 + (i / 40) * 0.45); p.push([x + Math.cos(a) * q, y + Math.sin(a) * q * 0.9]); }
  line(ctx, p, { w: 6, color: PAL.black, smooth: true, seed: 3, amp: 0.3, flat: true });
  line(ctx, p, { w: 3, color: PAL.kusum, smooth: true, seed: 3, amp: 0.3, flat: true });
  const h = p[p.length - 1];
  shape(ctx, ellipsePts(h[0], h[1], 8, 6, 7), { mode: 'colour', fill: PAL.kusum, w: 1.3, seed: 5, smooth: true });
}

// ---------------------------------------------------------------- scenery
/** Trees in the Mithila manner: a trunk and stacked leaf forms, flat, no shading. */
/** One Mithila leaf: a pointed blade with a mid-vein, pointing along `ang`. */
function drawLeaf(ctx, x, y, L, ang, col, c, m, o, sd) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const bx = x - dx * L * 0.3, by = y - dy * L * 0.3, tx = x + dx * L * 0.7, ty = y + dy * L * 0.7;
  const wx = -dy * L * 0.32, wy = dx * L * 0.32;
  shape(ctx, [[bx, by], [bx + (tx - bx) * 0.42 + wx, by + (ty - by) * 0.42 + wy], [tx, ty], [bx + (tx - bx) * 0.42 - wx, by + (ty - by) * 0.42 - wy]], { mode: m, fill: col, lineColor: c, lineFill: bg(o), w: 0.9, seed: sd, smooth: true, amp: 0.3 });
  line(ctx, [[bx, by], [tx, ty]], { w: 0.6, color: c, seed: sd, flat: true });
}
/** A small blossom: a ring of petal-dots around a bright centre. */
function drawBlossom(ctx, x, y, r, col, c, sd) {
  dots(ctx, x, y, r, 5, col, sd, r * 0.85);
  ctx.fillStyle = c === PAL.nightLine ? PAL.nightLine : PAL.turmeric; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
}

export function tree(ctx, x, y, h, kind, o = {}) {
  const c = lc(o), m = md(o), sd = o.seed ?? 1, w = o.w ?? 1.3;
  const tw = h * 0.05;
  const trunk = [[x - tw, y], [x - tw * 0.7, y - h * 0.55], [x + tw * 0.7, y - h * 0.55], [x + tw, y]];
  if (kind !== 'palm' && kind !== 'bamboo') { shape(ctx, trunk, { mode: m, fill: PAL.brown, lineColor: c, w, seed: sd, amp: 0.8 }); if (!o.colour) hatch(ctx, trunk, { color: o.night ? PAL.nightLine : PAL.madder, spacing: 5, angle: 0, seed: sd, w: 0.8 }); }
  const leafCol = kind === 'ashoka' ? PAL.leaf : kind === 'bare' ? null : PAL.leaf;
  if (kind === 'bare') {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5 + noise(sd, i) * 0.2; line(ctx, [[x, y - h * 0.5], [x + Math.cos(a) * h * 0.25, y - h * 0.5 + Math.sin(a) * h * 0.25], [x + Math.cos(a + 0.3) * h * 0.46, y - h * 0.5 + Math.sin(a + 0.3) * h * 0.46]], { w, color: c, seed: sd + i, amp: 0.8 }); }
  } else if (kind === 'palm') {
    line(ctx, [[x, y], [x + h * 0.04, y - h * 0.5], [x - h * 0.02, y - h * 0.86]], { w: w * 2.2, color: o.colour ? PAL.brown : c, smooth: true, seed: sd, amp: 0.6 });
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; const ex = x - h * 0.02 + Math.cos(a) * h * 0.3, ey = y - h * 0.86 + Math.sin(a) * h * 0.2 + Math.abs(i - 3) * h * 0.03; shape(ctx, [[x - h * 0.02, y - h * 0.86], [(x + ex) / 2, (y - h * 0.86 + ey) / 2 - h * 0.07], [ex, ey], [(x + ex) / 2, (y - h * 0.86 + ey) / 2 + h * 0.02]], { mode: m, fill: PAL.leaf, lineColor: c, w, seed: sd + i, smooth: true, amp: 0.5 }); }
  } else if (kind === 'bamboo') {
    for (let i = -1; i <= 1; i++) { const bx = x + i * h * 0.06; line(ctx, [[bx, y], [bx + i * h * 0.03, y - h]], { w: w * 1.8, color: o.colour ? PAL.leaf : c, seed: sd + i, amp: 0.5 }); for (let j = 1; j < 5; j++) line(ctx, [[bx - 4 + i * h * 0.03 * j / 5, y - h * j / 5], [bx + 4 + i * h * 0.03 * j / 5, y - h * j / 5]], { w, color: c, seed: j, amp: 0.2, flat: true }); }
  } else {
    // an authentic Mithila tree: a banded trunk, branches that fan and arch, leaves growing in
    // rows ALONG each branch (so the structure shows), with flowers, round fruit and a perched bird
    const tall = kind === 'sala';
    const top = y - h * (tall ? 0.5 : 0.42);
    const spread = h * (tall ? 0.33 : kind === 'banyan' ? 0.5 : 0.42);
    const leafL = h * (tall ? 0.085 : 0.1);
    const leaf2 = o.night ? PAL.night : PAL.leafDark || PAL.green;
    const brown = o.colour ? PAL.brown : c;
    const fcol = kind === 'ashoka' ? PAL.kusum : kind === 'mango' ? PAL.turmeric : kind === 'banyan' ? PAL.madder : PAL.saffron;
    // band rings up the trunk
    for (let i = 1; i <= 3; i++) line(ctx, [[x - tw * 0.85, y - h * 0.12 * i], [x + tw * 0.85, y - h * 0.12 * i]], { w: 0.7, color: c, seed: sd + i, amp: 0.2, flat: true });
    const nB = tall ? 6 : 8;
    const qpt = (p0, p1, p2, t) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
    for (let b = 0; b < nB; b++) {
      const side = b - (nB - 1) / 2;
      const a = -Math.PI / 2 + side * (tall ? 0.24 : 0.4) + noise(sd, b) * 0.07;
      const len = spread * (tall ? 1.5 : 1.0) * (0.8 + (noise(sd, b + 7) + 1) * 0.12);
      const ex = x + Math.cos(a) * len, ey = top + Math.sin(a) * len;
      const mid = [(x + ex) / 2 + noise(sd, b) * 10, (top + ey) / 2 - h * 0.05];
      const P0 = [x, top];
      line(ctx, [P0, mid, [ex, ey]], { w: w * 1.5, color: brown, smooth: true, seed: sd + b, amp: 0.5 });
      // paired leaves march up the outer part of the branch
      const perp = a + Math.PI / 2;
      for (let i = 1; i <= 6; i++) {
        const t = 0.28 + (i / 6) * 0.66;
        const [px, py] = qpt(P0, mid, [ex, ey], t);
        const ll = leafL * (0.75 + (noise(sd, b * 7 + i) + 1) * 0.2);
        for (const sgn of [-1, 1]) drawLeaf(ctx, px + Math.cos(perp) * sgn * ll * 0.45, py + Math.sin(perp) * sgn * ll * 0.45, ll, a + sgn * 0.6, i % 2 ? leafCol : leaf2, c, m, o, sd + b * 11 + i * 2 + (sgn > 0 ? 0 : 1));
      }
      drawLeaf(ctx, ex, ey, leafL * 1.15, a, leafCol, c, m, o, sd + b);
      // a flower or a round fruit at the branch tip (painted scenes)
      if (o.colour) {
        if (b % 2 === 0) drawBlossom(ctx, ex + Math.cos(a) * leafL * 0.5, ey + Math.sin(a) * leafL * 0.5, leafL * 0.36, fcol, c, sd + b);
        else { ctx.fillStyle = PAL.madder; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * leafL * 0.3, ey + Math.sin(a) * leafL * 0.3, leafL * 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 0.8; ctx.stroke(); }
      }
    }
    // a peacock or songbird perched where two branches meet
    if (o.perch) { const pa = -Math.PI / 2 + ((noise(sd, 30) > 0 ? 1 : -1)) * (tall ? 0.24 : 0.4) * 1.5; const [bx, by] = qpt([x, top], [x + Math.cos(pa) * spread * 0.5, top + Math.sin(pa) * spread * 0.5 - h * 0.04], [x + Math.cos(pa) * spread, top + Math.sin(pa) * spread], 0.78); if (o.perch === 'peacock') peacock(ctx, bx, by - leafL, leafL * 2.2, { colour: o.colour, night: o.night, dir: pa < -Math.PI / 2 ? 1 : -1, seed: sd }); else bird(ctx, bx, by - leafL * 0.5, leafL * 0.9, { colour: o.colour, night: o.night, fill: PAL.indigo, dir: pa < -Math.PI / 2 ? 1 : -1, seed: sd }); }
  }
}

/** A flat hill: stacked scallop rows with hatching. No receding, no perspective. */
export function hill(ctx, x, y, w, h, o = {}) {
  const c = lc(o), sd = o.seed ?? 1;
  const p = [[x - w / 2, y], [x - w * 0.3, y - h * 0.7], [x - w * 0.05, y - h], [x + w * 0.22, y - h * 0.75], [x + w / 2, y]];
  shape(ctx, p, { mode: md(o), fill: o.fill || PAL.earth, lineFill: bg(o), lineColor: c, w: 1.4, seed: sd, smooth: true, amp: 1 });
  hatch(ctx, p, { color: o.colour ? PAL.brown : o.night ? PAL.nightLine : o.hatchColor || PAL.madder, spacing: o.spacing ?? 9, angle: 0.5 + noise(sd, 2) * 0.3, seed: sd, smooth: true, w: 0.8 });
}

/** Rectangular architecture: frames and pattern bands, like kohbar borders. */
export function building(ctx, x, y, w, h, o = {}) {
  const c = lc(o), m = md(o), sd = o.seed ?? 1;
  const tiers = o.tiers ?? 2;
  const wall = o.fill || (o.lanka ? PAL.gold : PAL.ochre);
  let yy = y, ww = w;
  for (let t = 0; t < tiers; t++) {
    const th = h / tiers * (t === 0 ? 1.15 : 0.85);
    const r = rectPts(x - ww / 2, yy - th, ww, th);
    shape(ctx, r, { mode: m, fill: wall, lineFill: bg(o), lineColor: c, gap: o.colour ? PAL.madder : null, w: 1.5, seed: sd + t, amp: 0.8 });
    // pattern band along the top of each tier
    const n = Math.max(3, Math.round(ww / 18));
    for (let i = 0; i < n; i++) { const bx = x - ww / 2 + (i + 0.5) * (ww / n); shape(ctx, [[bx - ww / n / 2 + 2, yy - th + 12], [bx, yy - th + 2], [bx + ww / n / 2 - 2, yy - th + 12]], { mode: m, fill: o.lanka ? PAL.black : PAL.madder, lineColor: o.lanka && !o.colour ? PAL.terracotta : c, w: 1, seed: sd + i, amp: 0.4 }); }
    line(ctx, [[x - ww / 2, yy - th + 14], [x + ww / 2, yy - th + 14]], { w: 1, color: c, seed: sd, amp: 0.5 });
    // doorway / windows: rectangles only
    const dn = t === 0 ? Math.max(1, Math.round(ww / 90)) : Math.max(1, Math.round(ww / 60));
    for (let i = 0; i < dn; i++) { const dx = x - ww / 2 + (i + 0.5) * (ww / dn); const dw = Math.min(26, ww / dn * 0.4), dh = th * (t === 0 ? 0.55 : 0.4); shape(ctx, rectPts(dx - dw / 2, yy - dh - (t === 0 ? 0 : th * 0.12), dw, dh), { mode: m, fill: o.lanka ? PAL.terracotta : PAL.indigo, lineFill: bg(o), lineColor: c, w: 1.2, seed: sd + i * 3, amp: 0.5 }); }
    yy -= th; ww *= 0.72;
  }
  // flat stepped top with a pot finial
  shape(ctx, rectPts(x - ww * 0.3, yy - 10, ww * 0.6, 10), { mode: m, fill: wall, lineFill: bg(o), lineColor: c, w: 1.2, seed: sd + 9, amp: 0.5 });
  shape(ctx, ellipsePts(x, yy - 18, 7, 8, 8), { mode: m, fill: PAL.turmeric, lineFill: bg(o), lineColor: c, w: 1.1, seed: sd + 10, smooth: true, amp: 0.3 });
  if (o.banner) { line(ctx, [[x, yy - 26], [x, yy - 58]], { w: 1.3, color: c, seed: 2 }); shape(ctx, [[x, yy - 58], [x + 26, yy - 50], [x, yy - 42]], { mode: m, fill: PAL.saffron, lineColor: c, w: 1.1, seed: 3, amp: 0.4 }); }
}

export function hut(ctx, x, y, w, h, o = {}) {
  const c = lc(o), m = md(o), sd = o.seed ?? 1;
  const wall = rectPts(x - w * 0.4, y - h * 0.5, w * 0.8, h * 0.5);
  shape(ctx, wall, { mode: m, fill: PAL.ochre, lineFill: bg(o), lineColor: c, w: 1.4, seed: sd, amp: 0.8 });
  const roof = [[x - w * 0.56, y - h * 0.5], [x - w * 0.2, y - h], [x + w * 0.2, y - h], [x + w * 0.56, y - h * 0.5]];
  shape(ctx, roof, { mode: m, fill: PAL.earth, lineFill: bg(o), lineColor: c, w: 1.4, seed: sd + 1, amp: 0.8 });
  hatch(ctx, roof, { color: o.colour ? PAL.brown : c, spacing: 6, angle: 1.2, seed: sd, w: 0.8 });
  shape(ctx, rectPts(x - w * 0.09, y - h * 0.36, w * 0.18, h * 0.36), { mode: m, fill: PAL.black, lineFill: bg(o), lineColor: c, w: 1.2, seed: sd + 2, amp: 0.5 });
}

export function rock(ctx, x, y, w, h, o = {}) {
  const sd = o.seed ?? 1;
  const p = [[x - w / 2, y], [x - w * 0.42, y - h * 0.7], [x - w * 0.1, y - h], [x + w * 0.32, y - h * 0.8], [x + w / 2, y]];
  shape(ctx, p, { mode: md(o), fill: o.fill || PAL.stone, lineFill: bg(o), lineColor: lc(o), w: 1.4, seed: sd, amp: 1 });
  hatch(ctx, p, { color: lc(o), spacing: 8, angle: 2.2, seed: sd, w: 0.7 });
}

export function pillar(ctx, x, y, w, h, o = {}) {
  const c = lc(o), m = md(o);
  shape(ctx, rectPts(x - w / 2, y - h, w, h), { mode: m, fill: o.fill || PAL.madder, lineFill: bg(o), lineColor: c, gap: o.colour ? PAL.turmeric : null, w: 1.4, seed: o.seed ?? 1, amp: 0.6 });
  shape(ctx, rectPts(x - w * 0.8, y - h - 10, w * 1.6, 10), { mode: m, fill: PAL.turmeric, lineFill: bg(o), lineColor: c, w: 1.2, seed: 2, amp: 0.5 });
  shape(ctx, rectPts(x - w * 0.8, y - 10, w * 1.6, 10), { mode: m, fill: PAL.turmeric, lineFill: bg(o), lineColor: c, w: 1.2, seed: 3, amp: 0.5 });
  for (let yy = y - h + 26; yy < y - 14; yy += 26) line(ctx, [[x - w / 2, yy], [x, yy - 9], [x + w / 2, yy]], { w: 1, color: o.colour ? PAL.turmeric : c, seed: yy | 0, amp: 0.4, flat: true });
}

export function pot(ctx, x, y, s, o = {}) {
  shape(ctx, [[x - s * 0.3, y - s], [x + s * 0.3, y - s], [x + s * 0.22, y - s * 0.8], [x + s * 0.55, y - s * 0.45], [x + s * 0.35, y], [x - s * 0.35, y], [x - s * 0.55, y - s * 0.45], [x - s * 0.22, y - s * 0.8]], { mode: md(o), fill: o.fill || PAL.terracotta, lineFill: bg(o), lineColor: lc(o), w: 1.4, seed: o.seed ?? 1, smooth: true, amp: 0.6 });
  line(ctx, [[x - s * 0.45, y - s * 0.5], [x, y - s * 0.4], [x + s * 0.45, y - s * 0.5]], { w: 1, color: lc(o), smooth: true, seed: 2, amp: 0.3, flat: true });
}

/** Small low-contrast fillers so no space is empty. Never the size or weight of a hazard. */
export function fillers(ctx, x0, x1, y0, y1, o = {}) {
  const sd = o.seed ?? 1, density = o.density ?? 1;
  const n = Math.round(((x1 - x0) * (y1 - y0)) / 26000 * density);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? (o.colour ? 0.75 : 0.42);
  for (let i = 0; i < n; i++) {
    const x = x0 + ((noise(sd, i * 3) + 1) / 2) * (x1 - x0), y = y0 + ((noise(sd, i * 3 + 1) + 1) / 2) * (y1 - y0);
    const k = Math.floor(((noise(sd, i * 3 + 2) + 1) / 2) * (o.kinds ? o.kinds.length : 4));
    const kind = o.kinds ? o.kinds[k] : ['bird', 'dots', 'flower', 'bird'][k];
    const oo = { colour: o.colour, night: o.night, w: 1, seed: sd + i, dir: i % 2 ? 1 : -1 };
    if (kind === 'fish') fish(ctx, x, y, 9, { ...oo, fill: PAL.turmeric });
    else if (kind === 'bird') bird(ctx, x, y, 8, { ...oo, fill: i % 3 ? PAL.leaf : PAL.madder });
    else if (kind === 'flower') { dots(ctx, x, y, 5, 5, o.colour ? PAL.pink : lc(o), sd + i, 1.8); dots(ctx, x, y, 0, 1, o.colour ? PAL.turmeric : lc(o), 1, 1.6); }
    else if (kind === 'star') { ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.6, 0, TAU); ctx.fill(); if (i % 4 === 0) { ctx.strokeStyle = PAL.white; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke(); } }
    else if (kind === 'leaf') { const ang = -1.2 + (i % 3) * 0.5; const dx = Math.cos(ang), dy = Math.sin(ang), L = 9; shape(ctx, [[x - dx * L * 0.3, y - dy * L * 0.3], [x + dy * L * 0.3, y - dx * L * 0.3], [x + dx * L * 0.7, y + dy * L * 0.7], [x - dy * L * 0.3, y + dx * L * 0.3]], { mode: md(o), fill: PAL.leaf, lineColor: lc(o), w: 1, seed: sd + i, smooth: true, amp: 0.3 }); line(ctx, [[x - dx * L * 0.3, y - dy * L * 0.3], [x + dx * L * 0.7, y + dy * L * 0.7]], { w: 0.6, color: lc(o), seed: sd + i, flat: true }); }
    else dots(ctx, x, y, 4, 4, lc(o), sd + i, 1.3);
  }
  ctx.restore();
}
