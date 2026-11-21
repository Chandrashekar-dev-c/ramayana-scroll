// The living layer: ambient creatures drawn live over the cached static backdrop.
// Each creature runs its own little behaviour loop keyed to its own seed, so no two share
// a motion or a tempo (a squirrel is fast and jittery, a heron slow and deliberate). They are
// placed deterministically in world space so they parallax with the camera and never pop.
// Drawn behind the actors, so heroes and enemies always read in front. Only alive (colour) land
// carries life; dead/line land stays empty.
import { PAL } from './palette.js';
import { shape, line, ellipsePts, dots } from './ink.js';
import { noise, hashStr } from '../core/rng.js';
import { GROUND } from './layout.js';
import { BACKDROPS, lookOf } from './backdrops.js';
import * as M from './motifs.js';

const TAU = Math.PI * 2;
const ease = (a, b, k) => a + (b - a) * (k < 0 ? 0 : k > 1 ? 1 : k);

// Which creatures live in each place, and how far apart. [type, spacing, size, band].
// band: 'ground' feet on the line, 'perch' up at branch height, 'air' in the sky, 'water' at the band.
const FAUNA = {
  city: [['peacock', 620, 40, 'ground'], ['bird', 560, 9, 'air'], ['butterfly', 640, 10, 'air']],
  cityNight: [['bird', 900, 9, 'air']],
  mithila: [['peacock', 600, 40, 'ground'], ['bird', 640, 9, 'air'], ['butterfly', 620, 10, 'air']],
  riverbank: [['heron', 760, 28, 'water'], ['deer', 540, 28, 'ground'], ['bird', 600, 9, 'air']],
  road: [['deer', 640, 28, 'ground'], ['hare', 560, 20, 'ground'], ['bird', 600, 9, 'air'], ['butterfly', 620, 10, 'air']],
  ashram: [['deer', 440, 30, 'ground'], ['squirrel', 480, 26, 'ground'], ['hare', 560, 22, 'ground'], ['bird', 640, 9, 'air']],
  hermitage: [['deer', 480, 30, 'ground'], ['squirrel', 480, 26, 'ground'], ['bird', 680, 9, 'air']],
  forest: [['deer', 380, 30, 'ground'], ['vanara', 640, 42, 'ground'], ['squirrel', 470, 26, 'ground'], ['hare', 540, 22, 'ground'], ['bird', 700, 9, 'air'], ['butterfly', 580, 10, 'air']],
  deepForest: [['deer', 340, 30, 'ground'], ['vanara', 540, 44, 'ground'], ['squirrel', 430, 26, 'ground'], ['elephant', 1500, 54, 'ground'], ['bird', 700, 9, 'air']],
  panchavati: [['deer', 380, 30, 'ground'], ['heron', 900, 28, 'water'], ['hare', 540, 22, 'ground'], ['parrot', 760, 30, 'perch'], ['bird', 660, 9, 'air'], ['butterfly', 600, 10, 'air']],
  chitrakuta: [['deer', 420, 30, 'ground'], ['elephant', 1600, 52, 'ground'], ['bird', 620, 9, 'air']],
  ridge: [['vanara', 540, 42, 'ground'], ['bird', 680, 9, 'air']],
  kishkindha: [['vanara', 380, 44, 'ground'], ['squirrel', 420, 26, 'ground'], ['bird', 640, 9, 'air']],
  pampa: [['heron', 720, 28, 'water'], ['deer', 560, 28, 'ground'], ['bird', 620, 9, 'air'], ['butterfly', 640, 10, 'air']],
  shore: [['heron', 900, 26, 'water'], ['bird', 520, 9, 'air']],
  mountain: [['bird', 760, 9, 'air']],
  grove: [['peacock', 440, 40, 'ground'], ['parrot', 540, 30, 'perch'], ['bird', 660, 9, 'air']],
  camp: [['bird', 560, 9, 'air']],
  nandigram: [['deer', 620, 28, 'ground'], ['peacock', 780, 38, 'ground'], ['bird', 620, 9, 'air']],
  tamasa: [['heron', 840, 26, 'water'], ['bird', 760, 9, 'air']],
  sky: [['bird', 520, 10, 'air']],
  kailash: [['bird', 900, 9, 'air']],
};
// Interiors, desolation, night voids and open water get no ambient land life.
const BARE = new Set(['court', 'chamber', 'kingRoom', 'cave', 'lankaCourt', 'lankaRoofs', 'ocean', 'nightSky', 'waste', 'battlefield', 'lanka', 'lankaNight']);

function faunaFor(id) {
  if (FAUNA[id]) return FAUNA[id];
  if (BARE.has(id)) return [];
  const def = BACKDROPS[id];
  if (!def) return [];
  // sensible defaults by terrain for anything unlisted
  if (def.ground === 'earth') return [['deer', 520, 28, 'ground'], ['bird', 640, 9, 'air'], ['butterfly', 640, 10, 'air']];
  if (def.ground === 'rock') return [['vanara', 560, 42, 'ground'], ['bird', 700, 9, 'air']];
  if (def.ground === 'sand') return [['bird', 560, 9, 'air']];
  return [];
}

const fill = (ctx, pts, col, s = 0, w = 1.1) => shape(ctx, pts, { mode: 'colour', fill: col, lineColor: PAL.black, w, seed: s, smooth: true });
const oval = (ctx, x, y, rx, ry, col, s = 0, seg = 14, w = 1.1) => fill(ctx, ellipsePts(x, y, rx, ry, seg), col, s, w);
const dot = (ctx, x, y, r, col = PAL.black) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

// ---- DEER: graze -> raise head & perk ears -> hold -> flick tail -> step ----
function deer(ctx, x, gy, s, d, seed, t) {
  const P = 6 + (seed % 5), ph = ((t / P + seed * 0.37) % 1);
  let hA, tail = 0, xo = 0, lp = 0, ear = 0;
  if (ph < 0.52) { hA = 1.15 + Math.sin(t * 5 + seed * 6) * 0.05; tail = Math.sin(t * 2.5 + seed) * 0.08; }
  else if (ph < 0.70) { const k = (ph - 0.52) / 0.18; hA = ease(1.15, -0.3, Math.min(1, k * 1.8)); ear = Math.min(1, k * 3); }
  else if (ph < 0.80) { hA = -0.2; ear = 1; }
  else if (ph < 0.88) { hA = 0.3; tail = Math.sin(t * 22) * 0.6; }
  else { const k = (ph - 0.88) / 0.12; xo = d * Math.sin(k * Math.PI) * 9; lp = t * 12; hA = 0.5; }
  ctx.save(); ctx.translate(xo, 0);
  for (let i = 0; i < 4; i++) { const fr = i < 2, base = x + (fr ? d * s * 0.45 : -d * s * 0.55) + (i % 2 ? 6 : -6), sw = Math.sin(lp + i * 1.6) * (lp ? 5 : 0); line(ctx, [[base, gy - s * 0.15], [base + sw, gy + s * 0.55]], { w: 2, color: PAL.black, seed: i }); }
  fill(ctx, [[x - d * s * 0.65, gy - s * 0.1], [x - d * s * 0.5, gy - s * 0.55], [x + d * s * 0.3, gy - s * 0.6], [x + d * s * 0.55, gy - s * 0.35], [x + d * s * 0.45, gy - s * 0.05]], PAL.ochre, seed);
  dots(ctx, x - d * s * 0.1, gy - s * 0.35, s * 0.32, 6, PAL.white, seed, 1.5);
  line(ctx, [[x - d * s * 0.62, gy - s * 0.35], [x - d * s * 0.62 - d * s * 0.1 * Math.cos(tail), gy - s * 0.1 + s * 0.22 * Math.cos(tail) + Math.sin(tail) * s * 0.1]], { w: s * 0.1, color: PAL.ochre, smooth: true });
  const sx = x + d * s * 0.32, sy = gy - s * 0.5, hX = sx + d * s * (0.1 + 0.3 * Math.sin(1.2 - hA)), hY = sy - s * 0.45 * Math.cos(1.2 - hA) + s * 0.2;
  line(ctx, [[sx, sy], [hX, hY]], { w: s * 0.14, color: PAL.ochre, smooth: true });
  ctx.fillStyle = PAL.ochre; ctx.beginPath(); ctx.ellipse(hX + d * s * 0.12, hY, s * 0.16, s * 0.1, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 1; ctx.stroke();
  for (const i of [-1, 1]) line(ctx, [[hX, hY - s * 0.08], [hX + i * s * 0.1, hY - s * 0.08 - ease(s * 0.1, s * 0.28, ear)]], { w: 1.4, color: PAL.black });
  line(ctx, [[hX + d * s * 0.05, hY - s * 0.12], [hX + d * s * 0.12, hY - s * 0.4]], { w: 1.4, color: PAL.black }); line(ctx, [[hX + d * s * 0.09, hY - s * 0.28], [hX + d * s * 0.2, hY - s * 0.34]], { w: 1.2, color: PAL.black });
  dot(ctx, hX + d * s * 0.1, hY - s * 0.02, s * 0.03); ctx.restore();
}
// ---- PEACOCK: peck -> bob -> fan & shimmer -> turn ----
function peacock(ctx, x, y, s, seed, t) {
  const P = 5 + (seed % 4), ph = ((t / P + seed * 0.53) % 1); let hD = 0, bob = Math.sin(t * 2.2 + seed * 3) * 0.06, qv = 0, sp = 0.32, tn = 0;
  if (ph < 0.26) { const k = ph / 0.26; hD = Math.sin(k * TAU) * (k < 0.5 ? 1 : 0.6); } else if (ph < 0.52) { bob = Math.sin(t * 4 + seed) * 0.12; }
  else if (ph < 0.8) { qv = 1; sp = ease(0.32, 0.6, Math.min(1, (ph - 0.52) / 0.1)); } else { tn = Math.sin((ph - 0.8) / 0.2 * Math.PI) * 0.5; }
  const nF = 7; for (let i = 0; i < nF; i++) { const tt = i / (nF - 1), q = qv * Math.sin(t * 16 + i * 1.3) * 0.06, a = Math.PI * (0.78 + tt * 0.5) + (sp - 0.32) * (tt - 0.5) * 1.2 + q, fl = s * (1.4 + tt * 0.6), fx = x - Math.cos(tt * 0.9) * fl * 0.6, fy = y + Math.sin(a) * fl * 0.5 + s * 0.3;
    line(ctx, [[x - s * 0.1, y + s * 0.1], [(x + fx) / 2, (y + fy) / 2 - s * 0.2], [fx, fy]], { w: 1, color: PAL.leaf, smooth: true, seed: i + seed });
    fill(ctx, ellipsePts(fx, fy, s * 0.2, s * 0.26, 8), PAL.leaf, i); dot(ctx, fx, fy, s * 0.1, PAL.indigo); dot(ctx, fx, fy, s * 0.045, PAL.turmeric); }
  fill(ctx, [[x + s * 0.32, y - s * 0.12], [x + s * 0.1, y - s * 0.52], [x - s * 0.22, y - s * 0.38], [x - s * 0.26, y + s * 0.2], [x + s * 0.22, y + s * 0.24]], PAL.indigo, seed + 1);
  const ny = y - s * 0.4, hx = x + s * (0.46 + tn * 0.2), hy = ny - s * 0.5 + hD * s * 0.7 + bob * s;
  line(ctx, [[x + s * 0.18, ny], [x + s * 0.5, ny - s * 0.3 + hD * s * 0.5], [hx, hy]], { w: s * 0.14, color: PAL.indigo, smooth: true });
  ctx.fillStyle = PAL.indigo; ctx.beginPath(); ctx.ellipse(hx, hy, s * 0.13, s * 0.11, 0, 0, TAU); ctx.fill();
  line(ctx, [[hx + s * 0.12, hy], [hx + s * 0.26, hy - 0.02 * s]], { w: 1, color: PAL.black }); dot(ctx, hx + s * 0.04, hy - s * 0.03, s * 0.03);
  for (let i = -1; i <= 1; i++) { line(ctx, [[hx, hy - s * 0.1], [hx + i * s * 0.08, hy - s * 0.28]], { w: 0.8, color: PAL.black }); dot(ctx, hx + i * s * 0.08, hy - s * 0.3, s * 0.03, PAL.indigo); }
  for (const lx of [-s * 0.02, s * 0.12]) line(ctx, [[x + lx, y + s * 0.24], [x + lx, y + s * 0.5]], { w: 1, color: PAL.black });
}
// ---- SQUIRREL (fast, jittery): nibble & dart ----
function squirrel(ctx, x, gy, s, seed, t) {
  const nib = Math.abs(Math.sin(t * 11 + seed)) * 0.4, P = 2.4 + (seed % 3) * 0.5, ph = ((t / P + seed * 0.7) % 1);
  let xo = 0; if (ph > 0.6) xo = Math.sin((ph - 0.6) / 0.4 * Math.PI) * s * 1.4 * (seed % 2 ? 1 : -1);
  ctx.save(); ctx.translate(xo, 0); const bx = x, by = gy - s * 0.55;
  line(ctx, [[bx - s * 0.15, by + s * 0.4], [bx - s * 0.58, by + s * 0.15], [bx - s * 0.64, by - s * 0.6], [bx - s * 0.14, by - s * 0.76], [bx + s * 0.02, by - s * 0.42]], { w: s * 0.22, color: PAL.ochre, smooth: true });
  line(ctx, [[bx - s * 0.15, by + s * 0.4], [bx - s * 0.54, by + s * 0.15], [bx - s * 0.6, by - s * 0.55]], { w: 1, color: PAL.brown, smooth: true });
  oval(ctx, bx, by, s * 0.3, s * 0.48, PAL.brown, seed, 12);
  oval(ctx, bx + s * 0.04, by + s * 0.1, s * 0.15, s * 0.3, PAL.cream, seed + 3, 10);
  line(ctx, [[bx, gy - s * 0.05], [bx, gy]], { w: s * 0.08, color: PAL.brown });
  const hx = bx + s * 0.08, hy = by - s * 0.5 - nib * s * 0.08;
  oval(ctx, hx, hy, s * 0.2, s * 0.19, PAL.brown, seed + 1, 10);
  for (const i of [-0.3, 0.6]) fill(ctx, [[hx + i * s * 0.14 - s * 0.06, hy - s * 0.1], [hx + i * s * 0.14, hy - s * 0.3], [hx + i * s * 0.14 + s * 0.06, hy - s * 0.1]], PAL.brown, i * 3, 1);
  line(ctx, [[hx + s * 0.05, hy + s * 0.1], [hx + s * 0.2, hy + s * 0.16 - nib * s * 0.12]], { w: s * 0.06, color: PAL.ochre, smooth: true });
  dot(ctx, hx + s * 0.1, hy - s * 0.02, s * 0.035); ctx.restore();
}
// ---- VANARA / MONKEY: groom -> look -> bounce ----
function vanara(ctx, x, gy, s, seed, t) {
  const P = 5 + (seed % 4), ph = ((t / P + seed * 0.44) % 1); let scr = 0, hn = Math.sin(t * 2 + seed) * 0.25, bnc = 0;
  if (ph < 0.4) scr = Math.abs(Math.sin(t * 5 + seed)) * 0.4; else if (ph >= 0.7) bnc = Math.abs(Math.sin((ph - 0.7) / 0.3 * Math.PI)) * s * 0.28;
  ctx.save(); ctx.translate(0, -bnc); const bx = x, by = gy - s * 0.5;
  line(ctx, [[bx - s * 0.3, by + s * 0.35], [bx - s * 0.8, by + s * 0.15], [bx - s * 0.95, by - s * 0.5], [bx - s * 0.5, by - s * 0.8]], { w: s * 0.1, color: PAL.brown, smooth: true });
  oval(ctx, bx, gy - s * 0.22, s * 0.52, s * 0.3, PAL.ochre, seed + 5, 12);
  oval(ctx, bx, by, s * 0.38, s * 0.46, PAL.brown, seed, 12);
  oval(ctx, bx, by + s * 0.06, s * 0.24, s * 0.34, PAL.ochre, seed + 3, 10);
  line(ctx, [[bx - s * 0.22, by], [bx - s * 0.42, by + s * 0.35], [bx - s * 0.12, by + s * 0.45]], { w: s * 0.12, color: PAL.brown, smooth: true });
  line(ctx, [[bx + s * 0.2, by], [bx + s * 0.34, by - s * 0.22 - scr * s * 0.3], [bx + s * 0.08, by - s * 0.42]], { w: s * 0.12, color: PAL.brown, smooth: true });
  for (const fx of [-0.2, 0.2]) oval(ctx, bx + fx * s, gy - s * 0.05, s * 0.14, s * 0.08, PAL.brown, fx * 10, 6);
  const hx = bx + hn * s * 0.1, hy = by - s * 0.58;
  oval(ctx, hx, hy, s * 0.3, s * 0.28, PAL.brown, seed + 1, 12);
  for (const i of [-1, 1]) oval(ctx, hx + i * s * 0.28, hy, s * 0.1, s * 0.13, PAL.brown, i * 3, 8);
  oval(ctx, hx, hy + s * 0.06, s * 0.2, s * 0.19, PAL.ochre, seed + 4, 10);
  line(ctx, [[hx - s * 0.1, hy + s * 0.17], [hx + s * 0.1, hy + s * 0.17]], { w: 1.2, color: PAL.black, smooth: true });
  dot(ctx, hx - s * 0.07, hy + s * 0.02, s * 0.03); dot(ctx, hx + s * 0.07, hy + s * 0.02, s * 0.03);
  line(ctx, [[hx - s * 0.12, hy - s * 0.06], [hx - s * 0.02, hy - s * 0.04]], { w: 1, color: PAL.black }); line(ctx, [[hx + s * 0.12, hy - s * 0.06], [hx + s * 0.02, hy - s * 0.04]], { w: 1, color: PAL.black });
  ctx.restore();
}
// ---- HERON (slow): stand on one leg -> lower neck -> quick stab -> raise ----
function heron(ctx, x, gy, s, seed, t) {
  const P = 8, ph = ((t / P + seed * 0.3) % 1); let neck = Math.abs(Math.sin(t * 0.8 + seed)) * 0.08, lift = 0.5;
  if (ph > 0.5 && ph < 0.68) neck = (ph - 0.5) / 0.18; else if (ph >= 0.68 && ph < 0.74) neck = 1; else if (ph >= 0.74) neck = Math.max(0, 1 - (ph - 0.74) / 0.26);
  if (ph > 0.5) lift = 0;
  line(ctx, [[x - s * 0.06, gy - s * 0.85], [x - s * 0.1, gy]], { w: s * 0.045, color: PAL.stone });
  line(ctx, [[x - s * 0.1, gy], [x - s * 0.26, gy]], { w: s * 0.035, color: PAL.stone }); line(ctx, [[x - s * 0.1, gy], [x + s * 0.04, gy]], { w: s * 0.035, color: PAL.stone });
  line(ctx, [[x + s * 0.08, gy - s * 0.85], [x + s * 0.14, gy - lift * s * 0.45], [x + s * 0.0, gy - lift * s * 0.3]], { w: s * 0.04, color: PAL.stone, smooth: true });
  oval(ctx, x, gy - s * 1.1, s * 0.3, s * 0.5, PAL.white, seed, 12, 1.2);
  fill(ctx, [[x - s * 0.08, gy - s * 1.3], [x - s * 0.34, gy - s * 0.95], [x - s * 0.18, gy - s * 0.72], [x + s * 0.06, gy - s * 0.92]], PAL.stone, seed + 2, 1);
  line(ctx, [[x - s * 0.18, gy - s * 0.74], [x - s * 0.44, gy - s * 0.5]], { w: s * 0.035, color: PAL.night, smooth: true });
  const hy = gy - s * 1.5 + neck * (gy - s * 0.35 - (gy - s * 1.5)), hx = x + s * 0.08 + neck * s * 0.3;
  line(ctx, [[x + s * 0.04, gy - s * 1.5], [x + s * 0.22 - neck * s * 0.05, (gy - s * 1.5 + hy) / 2], [hx, hy]], { w: s * 0.055, color: PAL.white, smooth: true });
  oval(ctx, hx, hy, s * 0.12, s * 0.11, PAL.white, seed + 3, 8);
  line(ctx, [[hx + s * 0.1, hy], [hx + s * 0.44, hy + s * 0.03]], { w: s * 0.03, color: PAL.turmeric });
  line(ctx, [[x + s * 0.02, gy - s * 1.48], [x - s * 0.14, gy - s * 1.62]], { w: s * 0.025, color: PAL.night });
  dot(ctx, hx + s * 0.02, hy - s * 0.02, s * 0.026);
}
// ---- PARROT (perched): preen into wing -> tilt head ----
function parrot(ctx, x, y, s, seed, t) {
  const pr = Math.abs(Math.sin(t * 4 + seed)) * 0.35, dir = seed % 2 ? 1 : -1;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  line(ctx, [[-s * 0.1, s * 0.3], [-s * 0.3, s * 0.9], [-s * 0.55, s * 1.25]], { w: s * 0.16, color: PAL.green, smooth: true });
  oval(ctx, 0, s * 0.05, s * 0.34, s * 0.5, PAL.green, seed, 12);
  oval(ctx, s * 0.06, s * 0.12, s * 0.18, s * 0.34, PAL.leaf, seed + 1, 10);
  line(ctx, [[s * 0.1, s * -0.1], [s * 0.02, s * 0.4]], { w: 1, color: PAL.black });
  const hx = s * 0.04, hy = -s * 0.5 + pr * s * 0.25;
  oval(ctx, hx, hy, s * 0.26, s * 0.24, PAL.green, seed + 2, 12);
  ctx.strokeStyle = PAL.madder; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.arc(hx, hy + s * 0.16, s * 0.2, -0.6, 0.7); ctx.stroke();
  fill(ctx, [[hx + s * 0.14, hy - s * 0.1], [hx + s * 0.4, hy - s * 0.02], [hx + s * 0.34, hy + s * 0.12], [hx + s * 0.16, hy + s * 0.12]], PAL.kusum, seed + 5, 1);
  line(ctx, [[hx + s * 0.18, hy + s * 0.02], [hx + s * 0.33, hy + s * 0.02]], { w: 1, color: PAL.black });
  dot(ctx, hx + s * 0.07, hy - s * 0.02, s * 0.045); dot(ctx, hx + s * 0.07, hy - s * 0.02, s * 0.02, PAL.cream);
  for (const lx of [-0.04, 0.08]) line(ctx, [[lx * s, s * 0.5], [lx * s, s * 0.68]], { w: 1.5, color: PAL.ochre });
  ctx.restore();
}
// ---- HARE: nibble -> freeze ears up -> hop ----
function hare(ctx, x, gy, s, seed, t) {
  const ear = 0.3 + Math.abs(Math.sin(t * 1.5 + seed)) * 0.7, nib = Math.abs(Math.sin(t * 9 + seed)) * 0.3;
  const P = 3 + (seed % 3), ph = ((t / P + seed * 0.5) % 1); let hop = 0, xo = 0;
  if (ph > 0.65) { const k = (ph - 0.65) / 0.35; hop = Math.sin(k * Math.PI) * s * 0.5; xo = k * s * 1.2 * (seed % 2 ? 1 : -1); }
  ctx.save(); ctx.translate(xo, -hop); const bx = x, by = gy - s * 0.4;
  oval(ctx, bx - s * 0.05, gy - s * 0.22, s * 0.4, s * 0.3, PAL.stone, seed + 4, 10);
  oval(ctx, bx, by, s * 0.56, s * 0.36, PAL.stone, seed, 14);
  dot(ctx, bx - s * 0.5, by + s * 0.12, s * 0.11, PAL.white);
  line(ctx, [[bx + s * 0.22, by + s * 0.22], [bx + s * 0.22, gy]], { w: s * 0.07, color: PAL.stone });
  const hx = bx + s * 0.46, hy = by - s * 0.25 - nib * s * 0.12;
  oval(ctx, hx, hy, s * 0.2, s * 0.18, PAL.stone, seed + 1, 10);
  for (const i of [-0.35, 0.45]) line(ctx, [[hx + i * s * 0.1, hy - s * 0.12], [hx + i * s * 0.16, hy - s * 0.12 - ear * s * 0.6]], { w: s * 0.075, color: PAL.stone, smooth: true });
  line(ctx, [[hx + s * 0.16, hy + s * 0.05], [hx + s * 0.28, hy + s * 0.05]], { w: 1, color: PAL.black });
  dot(ctx, hx + s * 0.08, hy - s * 0.02, s * 0.032); ctx.restore();
}
// ---- ELEPHANT (far, slow): sway, trunk curl, ear flap ----
function elephant(ctx, x, gy, s, seed, t) {
  const sway = Math.sin(t * 0.6 + seed) * 0.02, trunk = Math.sin(t * 0.9 + seed) * 0.3;
  ctx.save(); ctx.translate(x, gy); ctx.rotate(sway); ctx.translate(-x, -gy);
  for (const lx of [-0.6, -0.28, 0.3, 0.6]) { fill(ctx, [[x + lx * s - s * 0.12, gy - s * 0.5], [x + lx * s - s * 0.13, gy], [x + lx * s + s * 0.13, gy], [x + lx * s + s * 0.12, gy - s * 0.5]], PAL.indigo, lx * 9, 1.1); line(ctx, [[x + lx * s - s * 0.1, gy - s * 0.02], [x + lx * s + s * 0.1, gy - s * 0.02]], { w: 1, color: PAL.black }); }
  fill(ctx, [[x - s * 0.78, gy - s * 0.55], [x - s * 0.82, gy - s * 0.95], [x - s * 0.45, gy - s * 1.18], [x + s * 0.4, gy - s * 1.18], [x + s * 0.78, gy - s * 1.05], [x + s * 1.02, gy - s * 0.78], [x + s * 1.0, gy - s * 0.5], [x + s * 0.78, gy - s * 0.52]], PAL.indigo, seed, 1.3);
  line(ctx, [[x + s * 0.97, gy - s * 0.72], [x + s * 1.08, gy - s * 0.4 + trunk * s * 0.2], [x + s * 0.92, gy - s * 0.08 + trunk * s * 0.3], [x + s * 1.04, gy + s * 0.02 + trunk * s * 0.15]], { w: s * 0.15, color: PAL.indigo, smooth: true });
  fill(ctx, ellipsePts(x + s * 0.62, gy - s * 0.82, s * 0.26, s * 0.3, 10), PAL.river, seed + 2, 1);
  line(ctx, [[x + s * 0.92, gy - s * 0.5], [x + s * 1.12, gy - s * 0.32]], { w: s * 0.06, color: PAL.white });
  line(ctx, [[x - s * 0.8, gy - s * 0.6], [x - s * 0.95, gy - s * 0.25]], { w: s * 0.045, color: PAL.indigo }); dot(ctx, x - s * 0.96, gy - s * 0.2, s * 0.05, PAL.night);
  dots(ctx, x - s * 0.1, gy - s * 0.85, s * 0.5, 9, PAL.cream, seed, 1.3);
  dot(ctx, x + s * 0.86, gy - s * 0.85, s * 0.038, PAL.cream); ctx.restore();
}
// ---- BIRD: gentle bobbing flight with a flap, around its anchor ----
function bird(ctx, x, y, s, seed, t) {
  const bx = x + Math.sin(t * 0.7 + seed) * 34, by = y + Math.sin(t * 1.4 + seed * 2) * 10, flap = Math.abs(Math.sin(t * 7 + seed));
  ctx.save(); ctx.translate(bx, by); ctx.scale(1, 0.55 + flap * 0.5); ctx.translate(-bx, -by);
  M.bird(ctx, bx, by, s, { colour: true, fill: seed % 2 ? PAL.madder : PAL.indigo, dir: Math.cos(t * 0.7 + seed) >= 0 ? 1 : -1 });
  ctx.restore();
}
// ---- BUTTERFLY: wandering, wings beating ----
function butterfly(ctx, x, y, s, seed, t) {
  const bx = x + Math.sin(t * 1.3 + seed) * 60, by = y + Math.cos(t * 2.1 + seed) * 34, beat = Math.abs(Math.sin(t * 12 + seed));
  for (const sgn of [-1, 1]) { ctx.save(); ctx.translate(bx, by); ctx.scale(sgn * (0.4 + beat * 0.7), 1); ctx.fillStyle = seed % 2 ? PAL.kusum : PAL.turmeric; ctx.beginPath(); ctx.ellipse(s * 0.6, 0, s * 0.6, s * 0.8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = PAL.black; ctx.fillRect(bx - 1, by - s * 0.6, 2, s * 1.2);
}

function draw(ctx, type, x, y, size, seed, t) {
  switch (type) {
    case 'deer': deer(ctx, x, y, size, seed % 2 ? 1 : -1, seed, t); break;
    case 'peacock': peacock(ctx, x, y, size, seed, t); break;
    case 'squirrel': squirrel(ctx, x, y, size, seed, t); break;
    case 'vanara': vanara(ctx, x, y, size, seed, t); break;
    case 'heron': heron(ctx, x, y, size, seed, t); break;
    case 'parrot': parrot(ctx, x, y, size, seed, t); break;
    case 'hare': hare(ctx, x, y, size, seed, t); break;
    case 'elephant': elephant(ctx, x, y, size, seed, t); break;
    case 'bird': bird(ctx, x, y, size, seed, t); break;
    case 'butterfly': butterfly(ctx, x, y, size, seed, t); break;
    default: break;
  }
}

/**
 * Draw the living layer for a view. The caller's transform already offsets by the camera,
 * so creatures are placed at their absolute world x. Only alive (colour) land carries life.
 * camX..camX+visW is the visible world span; quiet thins the layer during battle.
 */
export function drawLife(ctx, id, camX, visW, t, o = {}) {
  if (o.colour === false) return;              // dead / line-art land stays empty
  const def = BACKDROPS[id]; if (!def) return;
  const specs = faunaFor(id);
  if (!specs.length) return;
  const night = !!def.night;
  // air first so flyers sit behind nothing; ground/perch creatures over them; but keep it simple: draw as listed
  ctx.save();
  if (night) ctx.globalAlpha *= 0.8;
  for (const [type, spacing0, size0, band] of specs) {
    const spacing = spacing0 * (o.quiet ? 1.7 : 1);
    const base = hashStr(id + '|' + type) % 997;
    const k0 = Math.floor((camX - size0 * 3.2) / spacing), k1 = Math.ceil((camX + visW + size0 * 3.2) / spacing);
    for (let k = k0; k <= k1; k++) {
      if (o.quiet && (((k % 2) + 2) % 2) === 0) continue;   // half as many in battle
      // a whole-number seed, never negative (k is negative left of the origin on wide screens), so
      // seed % 2 really varies colour and facing and the animation phase keeps its pattern
      const seed = (((Math.floor(base / 7) + k * 37) % 97) + 97) % 97;
      const jx = noise(base + 2, k) * spacing * 0.3;
      const x = k * spacing + jx;
      const size = size0 * (1 + noise(base + 4, k) * 0.15);
      let y;
      if (band === 'air') y = 110 + ((noise(base + 5, k) + 1) / 2) * 90;
      else if (band === 'perch') y = GROUND - 140 - ((noise(base + 6, k) + 1) / 2) * 30;
      else if (band === 'water') y = GROUND - 24;
      else y = GROUND - 2;
      draw(ctx, type, x, y, size, seed, t);
    }
  }
  ctx.restore();
}
