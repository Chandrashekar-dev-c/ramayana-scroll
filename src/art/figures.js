// The figure renderer. Characters are data; this one renderer draws them all so the Mithila
// rules stay the same while the designs differ: profile face with a frontal almond eye,
// frontal body, double outline, joints hidden under bangles and cloth, pose-to-pose motion.
import chars from '../data/characters.json';
import { shape, line, hatch, ellipsePts, dots } from './ink.js';
import { PAL, col } from './palette.js';
import { pattern } from './patterns.js';
import { SIGNATURES, drawObject } from './objects.js';
import { hashStr, noise } from '../core/rng.js';

const BY_ID = Object.fromEntries(chars.map((c) => [c.id, c]));
export const CHARACTER_IDS = chars.map((c) => c.id);
export const BASE_U = 150;
const D = Math.PI / 180;

/** Resolve a character at a life stage into a flat spec. */
export function character(id, stage) {
  const base = BY_ID[id];
  if (!base) throw new Error('Unknown character: ' + id);
  let st = null;
  if (base.stages) st = base.stages[stage] || base.stages[Object.keys(base.stages)[0]];
  const s = { ...base, ...(st || {}) };
  s.colour = { ...base.colour, ...((st && st.colour) || {}) };
  s.build = { ...base.build };
  if (st && st.height) s.build.height = st.height;
  if (st && st.width) s.build.width = st.width;
  s.key = id + ':' + (stage || '');
  return s;
}

// ---------------------------------------------------------------- poses
// Angles in degrees from straight down; positive swings toward the facing side.
// arm: [shoulder, elbow bend]; leg: [thigh, knee bend].
export const POSES = {
  stand: { armF: [8, 12], armB: [-8, -12], legF: [5, 0], legB: [-5, 0] },
  stand2: { armF: [13, 20], armB: [-4, -18], legF: [6, 0], legB: [-4, 0], head: 3 },
  walk0: { armF: [28, 18], armB: [-26, -8], legF: [26, -4], legB: [-22, -16], y: 0 },
  walk1: { armF: [10, 14], armB: [-10, -12], legF: [6, 0], legB: [4, -42], y: -3 },
  walk2: { armF: [-22, 10], armB: [24, 16], legF: [-22, -16], legB: [26, -4], y: 0 },
  walk3: { armF: [-8, 12], armB: [10, 14], legF: [4, -42], legB: [6, 0], y: -3 },
  draw0: { armF: [84, 4], armB: [58, 30], legF: [14, 0], legB: [-14, 0], bow: 0.15 },
  draw1: { armF: [90, 0], armB: [-16, 112], legF: [16, 0], legB: [-16, 0], bow: 0.55 },
  draw2: { armF: [90, 0], armB: [-78, 152], legF: [18, 0], legB: [-18, 0], bow: 1, lean: -4 },
  shoot: { armF: [90, 0], armB: [-104, 70], legF: [18, 0], legB: [-18, 0], lean: 3 },
  jump: { armF: [70, 25], armB: [-60, -20], legF: [42, -62], legB: [-12, -52], air: true },
  crouch: { lean: 58, armF: [45, 70], armB: [20, 60], legF: [82, -128], legB: [48, -118] },
  hurt: { lean: -16, armF: [-34, -20], armB: [-66, -10], legF: [-8, 0], legB: [-22, -12], head: -12 },
  kneel: { armF: [20, 30], armB: [-10, 20], legF: [84, -96], legB: [-6, -88], lean: 6 },
  sit: { armF: [30, 40], armB: [10, 40], legF: [86, -84], legB: [78, -100] },
  namaste: { armF: [10, -128], armB: [-10, 128], legF: [5, 0], legB: [-5, 0], lean: 5, fold: true },
  bow: { armF: [10, -128], armB: [-10, 128], legF: [5, 0], legB: [-5, 0], lean: 30, head: 14, fold: true },
  hold: { armF: [72, 22], armB: [52, 34], legF: [8, 0], legB: [-8, 0] },
  give: { armF: [84, 8], armB: [-8, -12], legF: [10, 0], legB: [-10, 0], lean: 6 },
  raise: { armF: [158, 12], armB: [-158, -12], legF: [8, 0], legB: [-8, 0] },
  point: { armF: [96, 0], armB: [-8, -12], legF: [8, 0], legB: [-8, 0] },
  carry: { armF: [168, -24], armB: [-168, 24], legF: [8, 0], legB: [-8, 0] },
  kick: { armF: [-30, 10], armB: [-50, -10], legF: [84, -8], legB: [-6, 0], lean: -12 },
  swing0: { armF: [166, 26], armB: [-30, -20], legF: [16, 0], legB: [-16, 0], lean: -8, obj: -34 },
  swing1: { armF: [62, 6], armB: [-40, -20], legF: [24, -6], legB: [-20, 0], lean: 18, obj: 78 },
  charge: { lean: 44, armF: [-40, -20], armB: [-70, -10], legF: [38, -20], legB: [-34, -30], head: -20 },
  charge2: { lean: 44, armF: [-60, -10], armB: [-30, -20], legF: [-30, -34], legB: [36, -16], head: -20 },
  fly: { lean: 82, armF: [96, 0], armB: [80, 10], legF: [-66, 0], legB: [-78, -12], air: true, head: -60 },
  fly2: { lean: 78, armF: [100, 0], armB: [70, 14], legF: [-74, -10], legB: [-64, 0], air: true, head: -58 },
  climb: { armF: [160, 20], armB: [-120, -60], legF: [50, -90], legB: [-10, -40], air: true },
  grieve: { lean: 24, armF: [30, 100], armB: [-20, 120], legF: [84, -96], legB: [-6, -88], head: 26 },
  hide: { lean: 40, armF: [40, 90], armB: [20, 80], legF: [80, -130], legB: [50, -120], head: -10 },
  cast: { armF: [120, 10], armB: [-30, -30], legF: [16, 0], legB: [-16, 0], lean: -6 },
  dead: { armF: [20, 10], armB: [-20, -10], legF: [8, 0], legB: [-8, 0] },
};
export const WALK = ['walk0', 'walk1', 'walk2', 'walk3'];

const STANCE = { upright: 0, forward: 8, bowed: 4, heavy: 2, proud: -6, stooped: 24, anxious: 7 };
const BODY = {
  human: { hip: 0.47, sh: 0.8, head: 0.935, thigh: 0.24, shin: 0.23, upper: 0.19, fore: 0.18 },
  tenHeads: { hip: 0.47, sh: 0.8, head: 0.935, thigh: 0.24, shin: 0.23, upper: 0.19, fore: 0.18 },
  monkey: { hip: 0.4, sh: 0.72, head: 0.86, thigh: 0.2, shin: 0.2, upper: 0.22, fore: 0.21 },
  bear: { hip: 0.42, sh: 0.78, head: 0.9, thigh: 0.21, shin: 0.21, upper: 0.22, fore: 0.2 },
};
const GARMENT_LEN = { dhoti: 0.66, sari: 0.95, robe: 0.92, bark: 0.56, loin: 0.32, royal: 0.84, armour: 0.5, bare: 0.4, fur: 0, none: 0 };

function ang(a) { return [Math.sin(a * D), Math.cos(a * D)]; }

/**
 * Draw one figure, facing right, feet at the origin.
 * o: { mode: colour|line|kachni|sil, aim (degrees up), seed, heads (ten-heads state) }
 */
export function drawFigure(ctx, spec, poseName, o = {}) {
  if (spec.body === 'bird') return drawBird(ctx, spec, poseName, o);
  const pose = POSES[poseName] || POSES.stand;
  const mode = o.mode || 'colour';
  const U = BASE_U * spec.build.height, Wd = spec.build.width;
  const B = BODY[spec.body] || BODY.human;
  let seed = (o.seed ?? hashStr(spec.id)) + hashStr(poseName) % 97;
  const lw = Math.max(1.6, Math.min(4.2, U * 0.014));
  const main = col(spec.colour.main), accent = col(spec.colour.accent), skin = col(spec.skin || 'skin');
  const ghost = spec.ghost;
  const sig = SIGNATURES[spec.signature] || SIGNATURES.none;
  const female = !!spec.female;
  const M = mode === 'kachni' ? 'line' : mode;
  const lineCol = ghost ? PAL.grey : PAL.black;
  const S = (pts, opt = {}) => {
    seed += 7;
    const useColour = mode === 'colour' || (mode === 'kachni' && opt.gold);
    shape(ctx, pts, { w: lw, seed, lineFill: o.lineFill ?? PAL.cream, lineColor: lineCol, ...opt, mode: mode === 'sil' ? 'sil' : useColour ? 'colour' : 'line' });
    if (mode === 'kachni' && opt.hatchK) hatch(ctx, pts, { color: PAL.terracotta, spacing: 5, angle: opt.hatchK, seed, smooth: opt.smooth, w: 0.9 });
  };
  const L = (pts, opt = {}) => { seed += 3; if (mode === 'sil') return; line(ctx, pts, { w: lw * 0.7, seed, color: lineCol, ...opt }); };
  const pat = (name, bg, fg, k) => (mode === 'colour' ? pattern(ctx, name, null, fg, k ?? Math.max(0.8, Math.min(2.4, U / 150))) : null);

  // --- skeleton
  const lean = ((pose.lean || 0) + (STANCE[spec.build.stance] || 0)) * D;
  const hipY = -B.hip * U;
  const cs = Math.cos(lean), sn = Math.sin(lean);
  const up = (x, y) => { const dy = y - hipY; return [x * cs - dy * sn, hipY + x * sn + dy * cs]; };
  const sw = 0.14 * U * Wd, ww = 0.095 * U * Wd, hw = 0.11 * U * Wd;
  const aim = o.aim || 0;
  const limb = (p0, a1, l1, a2, l2) => {
    const d1 = ang(a1), j = [p0[0] + d1[0] * l1, p0[1] + d1[1] * l1];
    const d2 = ang(a1 + a2), e = [j[0] + d2[0] * l2, j[1] + d2[1] * l2];
    return [p0, j, e, a1 + a2];
  };
  const leanDeg = lean / D;
  const aimed = poseName.startsWith('draw') || poseName === 'shoot' || poseName === 'cast';
  const aF = pose.armF, aB = pose.armB;
  const armLen = sig.long ? 1.5 : spec.signature === 'longArms' ? 1.7 : 1;
  const shF = up(sw * 0.92, -B.sh * U), shB = up(-sw * 0.92, -B.sh * U);
  const armF = limb(shF, aF[0] + leanDeg * 0.5 + (aimed ? aim : 0), B.upper * U * armLen, aF[1], B.fore * U * armLen);
  const armB = limb(shB, aB[0] + leanDeg * 0.5 + (aimed && poseName === 'draw0' ? aim : 0), B.upper * U * armLen, aB[1], B.fore * U * armLen);
  const spread = spec.build.stance === 'heavy' ? 1.5 : 1;
  const legF = limb([hw * 0.5, hipY], pose.legF[0] * spread, B.thigh * U, pose.legF[1], B.shin * U);
  const legB = limb([-hw * 0.5, hipY], pose.legB[0] * spread, B.thigh * U, pose.legB[1], B.shin * U);
  let gy = 0;
  if (!pose.air) gy = -Math.max(legF[2][1], legB[2][1], legF[1][1], legB[1][1]) - 0.02 * U;
  ctx.save();
  ctx.translate(0, gy + (pose.y || 0));

  const armT = 0.046 * U * Math.sqrt(Wd), legT = 0.058 * U * Math.sqrt(Wd);
  const seg = (a, b, t0, t1, fill, opt = {}) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l), ny = dx / l;
    S([[a[0] + nx * t0, a[1] + ny * t0], [b[0] + nx * t1, b[1] + ny * t1], [b[0] + dx / l * t1 * 0.6, b[1] + dy / l * t1 * 0.6], [b[0] - nx * t1, b[1] - ny * t1], [a[0] - nx * t0, a[1] - ny * t0]], { fill, smooth: false, ...opt });
  };
  const limbPoly = (a, j, e, t0, t1, t2, fill) => {
    const n = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const n0 = n(a, j), n2 = n(j, e), nj = [(n0[0] + n2[0]) / 2, (n0[1] + n2[1]) / 2];
    const ln = Math.hypot(nj[0], nj[1]) || 1; nj[0] /= ln; nj[1] /= ln;
    const d2 = [e[0] - j[0], e[1] - j[1]], l2 = Math.hypot(d2[0], d2[1]) || 1;
    S([[a[0] + n0[0] * t0, a[1] + n0[1] * t0], [j[0] + nj[0] * t1, j[1] + nj[1] * t1], [e[0] + n2[0] * t2, e[1] + n2[1] * t2], [e[0] + (d2[0] / l2) * t2 * 0.7, e[1] + (d2[1] / l2) * t2 * 0.7], [e[0] - n2[0] * t2, e[1] - n2[1] * t2], [j[0] - nj[0] * t1, j[1] - nj[1] * t1], [a[0] - n0[0] * t0, a[1] - n0[1] * t0]], { fill, smooth: true });
  };
  const bangle = (p, t, c = accent) => { if (mode === 'sil') return; S(ellipsePts(p[0], p[1], t * 1.25, t * 0.75, 8), { fill: mode === 'colour' ? c : null, gold: true, smooth: true }); };
  const drawArm = (arm, fur) => {
    limbPoly(arm[0], arm[1], arm[2], armT, armT * 0.88, armT * 0.72, skin);
    // jewellery sits on the upper arm (keyur) and the wrist, never as a pivot on the elbow
    const mid = [(arm[0][0] + arm[1][0] * 1.4) / 2.4, (arm[0][1] + arm[1][1] * 1.4) / 2.4];
    const wrist = [arm[1][0] * 0.14 + arm[2][0] * 0.86, arm[1][1] * 0.14 + arm[2][1] * 0.86];
    if (spec.jewels !== 'none' && !fur) { bangle(mid, armT * 0.95, PAL.gold); bangle(wrist, armT * 0.8); }
    else if (spec.uttariya && mode !== 'sil') bangle(wrist, armT * 0.7, PAL.brown);
    if (sig.mark === 'armlets') bangle([(arm[0][0] + arm[1][0]) / 2, (arm[0][1] + arm[1][1]) / 2], armT * 1.5, PAL.gold);
    if (sig.mark === 'nails' && mode !== 'sil') for (let i = -1; i <= 1; i++) { const d = ang(arm[3] + i * 22); L([arm[2], [arm[2][0] + d[0] * U * 0.11, arm[2][1] + d[1] * U * 0.11]], { w: lw * 0.6 }); }
  };
  const isFur = spec.body === 'monkey' || spec.body === 'bear';

  // --- tail, wings, things worn on the back
  if (spec.body === 'monkey') {
    const t0 = [-hw * 0.6, hipY + 0.02 * U];
    const tl = [t0, [t0[0] - 0.2 * U, hipY + 0.12 * U], [t0[0] - 0.36 * U, hipY - 0.06 * U], [t0[0] - 0.32 * U, hipY - 0.3 * U], [t0[0] - 0.2 * U, hipY - 0.4 * U], [t0[0] - 0.14 * U, hipY - 0.3 * U]];
    line(ctx, tl, { w: lw * 3.4, seed: seed++, smooth: true, color: lineCol });
    if (mode === 'colour') line(ctx, tl, { w: lw * 1.6, seed: seed - 1, smooth: true, color: skin, flat: true });
  }
  if (spec.wings) {
    const c = up(0, -B.sh * U * 0.92);
    for (const sgn of [-1, 1]) S([c, [c[0] + sgn * 0.5 * U, c[1] - 0.42 * U], [c[0] + sgn * 0.62 * U, c[1] - 0.1 * U], [c[0] + sgn * 0.44 * U, c[1] + 0.02 * U], [c[0] + sgn * 0.5 * U, c[1] + 0.2 * U], [c[0] + sgn * 0.26 * U, c[1] + 0.12 * U], [c[0] + sgn * 0.2 * U, c[1] + 0.26 * U]], { fill: main, pattern: pat(spec.pattern, null, accent), hatchK: 0.9 });
  }
  if (sig.quiver || sig.back === 'veena') {
    const side = sig.quiver === 'front' ? 1 : -1;
    const q = up(side * sw * 0.7, -B.sh * U + 0.02 * U);
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(lean + side * -0.45);
    if (sig.back === 'veena') {
      S(ellipsePts(0, 0.1 * U, 0.07 * U, 0.07 * U, 8), { fill: PAL.gold, smooth: true, gold: true });
      L([[0, 0.05 * U], [0, -0.36 * U]], { w: lw * 1.2 });
      S(ellipsePts(0, -0.38 * U, 0.04 * U, 0.04 * U, 6), { fill: PAL.gold, smooth: true, gold: true });
    } else {
      S([[-0.035 * U, -0.2 * U], [0.035 * U, -0.2 * U], [0.03 * U, 0.1 * U], [-0.03 * U, 0.1 * U]], { fill: PAL.brown, gap: mode === 'colour' ? PAL.gold : null });
      if (mode !== 'sil') for (let i = -1; i <= 1; i++) L([[i * 4, -0.2 * U], [i * 5, -0.3 * U]], { w: lw * 0.6, color: mode === 'colour' ? PAL.indigo : PAL.black });
    }
    ctx.restore();
  }
  if (spec.headdress === 'serpentHood') {
    const h = up(0, -B.head * U);
    S(ellipsePts(h[0], h[1] - 0.05 * U, 0.26 * U, 0.24 * U, 12), { fill: main, pattern: pat('fishScale', null, accent), smooth: true, hatchK: 0.8 });
  }

  // --- legs and lower garment
  const drawLeg = (leg) => {
    limbPoly(leg[0], leg[1], leg[2], legT, legT * 0.9, legT * 0.7, skin);
    const f = leg[2], fl = 0.085 * U;
    S([[f[0] - fl * 0.35, f[1] - fl * 0.2], [f[0] + fl, f[1] + fl * 0.12], [f[0] + fl * 0.9, f[1] + fl * 0.3], [f[0] - fl * 0.4, f[1] + fl * 0.3]], { fill: skin, smooth: false });
    if (spec.jewels === 'full' || female) bangle([f[0], f[1] - fl * 0.4], legT * 0.75);
  };
  // a figure standing with folded arms draws its folded back arm later; drawing armB too gave three
  if (!(sig.fold && poseName === 'stand')) drawArm(armB, isFur);
  drawLeg(legB); drawLeg(legF);
  const gl = GARMENT_LEN[spec.garment] ?? 0.6;
  if (gl > 0) {
    const along = (leg, f) => {
      const total = B.thigh + B.shin, d = f * total;
      if (d <= B.thigh) { const k = d / B.thigh; return [leg[0][0] + (leg[1][0] - leg[0][0]) * k, leg[0][1] + (leg[1][1] - leg[0][1]) * k]; }
      const k = (d - B.thigh) / B.shin; return [leg[1][0] + (leg[2][0] - leg[1][0]) * k, leg[1][1] + (leg[2][1] - leg[1][1]) * k];
    };
    let pf = along(legF, gl), pb = along(legB, gl);
    const front = pf[0] >= pb[0] ? pf : pb, back = pf[0] >= pb[0] ? pb : pf;
    const flare = (spec.garment === 'sari' || spec.garment === 'robe' ? 0.085 : 0.07) * U * Wd;
    const wy = hipY - 0.04 * U;
    const mid = [(front[0] + back[0]) / 2, Math.min(front[1], back[1]) - (spec.garment === 'dhoti' || spec.garment === 'royal' ? 0.07 * U : 0.01 * U)];
    let pts = [[-hw * 1.05, wy], [hw * 1.05, wy], [front[0] + flare, front[1]], mid, [back[0] - flare, back[1]]];
    if (spec.garment === 'bark' || spec.garment === 'loin' || spec.garment === 'bare') {
      const a = pts[4], b = pts[2];
      pts = [pts[0], pts[1], b];
      for (let i = 1; i < 6; i++) { const k = i / 6; pts.push([b[0] + (a[0] - b[0]) * k, b[1] + (a[1] - b[1]) * k + (i % 2 ? -0.045 * U : 0.02 * U)]); }
      pts.push(a);
    }
    const gcol = spec.garment === 'bark' ? PAL.ochre : spec.garment === 'loin' || spec.garment === 'bare' ? accent : main;
    const pcol = spec.garment === 'bark' ? PAL.brown : spec.garment === 'loin' || spec.garment === 'bare' ? main : accent;
    S(pts, { fill: gcol, pattern: pat(spec.garment === 'bark' ? 'bark' : spec.pattern, null, pcol, spec.garment === 'bark' ? 0.9 : undefined), gap: mode === 'colour' ? (spec.garment === 'bark' && spec.uttariya ? col(spec.uttariya.border) : pcol) : null, hatchK: 0.7 });
    if (spec.garment === 'bark' && mode !== 'sil') { const a = pts[0], b = pts[1]; L([[a[0], a[1] + 0.03 * U], [b[0], b[1] + 0.03 * U]], { w: lw * 1.6, color: mode === 'colour' ? (spec.uttariya ? col(spec.uttariya.border) : PAL.brown) : PAL.black }); }
    if (mode !== 'sil' && (spec.garment === 'sari' || spec.garment === 'royal' || spec.garment === 'dhoti' || spec.garment === 'robe')) {
      const a = pts[4], b = pts[2], m = pts[3];
      L([[a[0] + 2, a[1] - 0.045 * U], [m[0], m[1] - 0.045 * U], [b[0] - 2, b[1] - 0.045 * U]], { w: lw * 0.9, color: mode === 'colour' ? pcol : mode === 'kachni' ? PAL.terracotta : PAL.black });
    }
  }

  // --- torso
  const tp = [up(-sw, -B.sh * U), up(-sw * 0.5, -B.sh * U - 0.03 * U), up(sw * 0.5, -B.sh * U - 0.03 * U), up(sw, -B.sh * U), up(ww * (isFur ? 1.25 : 1), hipY - 0.02 * U), up(-ww * (isFur ? 1.25 : 1), hipY - 0.02 * U)];
  const clothTorso = spec.garment === 'robe' || spec.garment === 'armour' || spec.garment === 'sari';
  S(tp, { fill: clothTorso ? main : skin, pattern: clothTorso ? pat(spec.garment === 'armour' ? spec.pattern : spec.pattern, null, accent) : isFur && spec.body === 'bear' ? pat('furStrokes', null, PAL.white) : null, gap: mode === 'colour' && clothTorso ? accent : null, hatchK: clothTorso ? 2.2 : 0 });
  if (spec.headdress === 'headless' && mode !== 'sil') {
    const c = up(0, -(B.sh + B.hip) / 2 * U);
    S(ellipsePts(c[0] + 0.02 * U, c[1] - 0.06 * U, 0.09 * U, 0.05 * U, 10), { fill: PAL.white, smooth: true });
    ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(c[0] + 0.03 * U, c[1] - 0.06 * U, 0.03 * U, 0, 7); ctx.fill();
    S([[c[0] - 0.1 * U, c[1] + 0.05 * U], [c[0] + 0.12 * U, c[1] + 0.05 * U], [c[0] + 0.08 * U, c[1] + 0.13 * U], [c[0] - 0.06 * U, c[1] + 0.13 * U]], { fill: PAL.madder });
  }
  if (mode !== 'sil') {
    const nk = up(0, -B.sh * U + 0.02 * U);
    const nr = sw * 0.62;
    const neckArc = (r, c, w, n = 9) => { const p = []; for (let i = 0; i <= n; i++) { const a = Math.PI * (i / n); const q = up(Math.cos(a) * r, -B.sh * U + 0.015 * U + Math.sin(a) * r * 1.15); p.push(q); } L(p, { w, color: mode === 'colour' ? c : PAL.black, smooth: true }); return p; };
    if (spec.jewels === 'princely' || spec.jewels === 'full' || sig.mark === 'necklace') neckArc(nr, PAL.gold, lw * (sig.mark === 'necklace' ? 2.2 : 1.1));
    if (spec.jewels === 'full') neckArc(nr * 1.35, PAL.gold, lw * 0.9);
    if (sig.mark === 'garland') { const p = neckArc(nr * 1.6, PAL.leaf, lw * 0.8, 10); for (const q of p) dots(ctx, q[0], q[1], 0, 1, mode === 'colour' ? PAL.pink : PAL.black, 1, lw * 1.3); }
    if (sig.mark === 'bones') { const p = neckArc(nr * 1.3, PAL.black, lw * 0.6, 7); for (const q of p) S(ellipsePts(q[0], q[1], lw * 1.6, lw * 2.6, 6), { fill: PAL.white, smooth: true }); }
    if (sig.mark === 'brooch') { const c = up(sw * 0.4, -B.sh * U + 0.1 * U); S(ellipsePts(c[0], c[1], 0.045 * U, 0.045 * U, 8), { fill: PAL.gold, smooth: true, gold: true }); for (let i = 0; i < 4; i++) { const d = ang(i * 45); L([[c[0] - d[0] * 0.04 * U, c[1] - d[1] * 0.04 * U], [c[0] + d[0] * 0.04 * U, c[1] + d[1] * 0.04 * U]], { w: lw * 0.5 }); } }
    if (spec.uttariya) {
      const u = spec.uttariya, bw = 0.055 * U;
      const p0 = up(-sw * 0.95, -B.sh * U - 0.01 * U), p1 = up(ww * 1.05, hipY - 0.03 * U);
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * bw, ny = dx / l * bw;
      const band = [[p0[0] - nx, p0[1] - ny], [p1[0] - nx, p1[1] - ny], [p1[0] + nx * 1.4, p1[1] + ny * 1.4 + 0.04 * U], [p0[0] + nx, p0[1] + ny]];
      S(band, { fill: col(u.main), pattern: pat(spec.pattern, null, col(u.border)), gap: mode === 'colour' ? col(u.border) : null, hatchK: 1.2 });
      // the end falls behind the shoulder
      const tail = [p0, [p0[0] - 0.07 * U, p0[1] + 0.05 * U], [p0[0] - 0.1 * U, p0[1] + 0.26 * U], [p0[0] - 0.03 * U, p0[1] + 0.24 * U]];
      S(tail, { fill: col(u.main), gap: mode === 'colour' ? col(u.border) : null, smooth: true, hatchK: 1.2 });
    } else if (spec.garment === 'bark' || spec.garment === 'royal') L([up(-sw * 0.9, -B.sh * U), up(ww * 0.9, hipY - 0.03 * U)], { w: lw * (spec.garment === 'royal' ? 2.4 : 1.2), color: mode === 'colour' ? (spec.garment === 'royal' ? accent : PAL.brown) : PAL.black });
    if (female && spec.garment === 'sari') L([up(sw * 0.9, -B.sh * U), up(-ww * 0.6, hipY - 0.1 * U), up(-ww, hipY)], { w: lw * 2, color: mode === 'colour' ? accent : mode === 'kachni' ? PAL.terracotta : PAL.black, smooth: true });
    void nk;
  }

  // --- head
  const hc = up(0.012 * U, -B.head * U);
  const r = 0.1 * U * (spec.body === 'bear' ? 1.15 : 1);
  if (spec.body === 'tenHeads' && spec.headdress === 'tenCrowns') drawTenHeads(ctx, spec, hc, r, lean, { S, L, mode, lw, skin, main, accent, heads: o.heads, seedBase: seed });
  else if (spec.headdress !== 'headless') {
    if (spec.headdress === 'threeHeads') for (const sgn of [-1, 1]) drawHead(ctx, spec, [hc[0] + sgn * r * 1.7, hc[1] + r * 0.3], r * 0.8, lean + sgn * 0.25 + (pose.head || 0) * D, { S, L, mode, lw, skin, main, accent, crown: 'horns1' });
    drawHead(ctx, spec, hc, r, lean + (pose.head || 0) * D, { S, L, mode, lw, skin, main, accent, crown: spec.headdress, female, sig });
  }

  // --- front arm and the thing it holds
  const foldDefault = sig.fold && (poseName === 'stand');
  let fa = armF;
  if (foldDefault) {
    fa = limb(shF, 10 + leanDeg * 0.5, B.upper * U, -128, B.fore * U);
    const ba = limb(shB, -10 + leanDeg * 0.5, B.upper * U, 128, B.fore * U);
    drawArm(ba, isFur);
  }
  const objOpt = { mode, seed: hashStr(spec.id), lw, main, accent, sig, pull: pose.bow && aimed ? pose.bow : 0 };
  const drawHeld = () => {
    if (!sig.obj || o.noObject) return;
    ctx.save();
    if (sig.hold === 'head') { const h = up(0.012 * U, -B.head * U - r * 1.1); ctx.translate(h[0], h[1]); ctx.rotate(lean); }
    else if (sig.hold === 'over') { const mx = (armF[2][0] + armB[2][0]) / 2, my = Math.min(armF[2][1], armB[2][1]); ctx.translate(mx, poseName === 'carry' ? my : -B.head * U - r * 1.6); }
    else {
      ctx.translate(fa[2][0], fa[2][1]);
      if (sig.obj === 'bow') ctx.rotate((90 - fa[3]) * D);
      else ctx.rotate(((pose.obj ?? 0) + (pose.lean || 0) * 0.3) * D);
    }
    drawObject(ctx, sig.obj, U, objOpt);
    ctx.restore();
  };
  if (sig.obj && sig.obj !== 'bow' && sig.hold === 'hand') drawHeld();
  if (!pose.fold || true) drawArm(fa, isFur);
  if (sig.obj === 'bow' || sig.hold !== 'hand') drawHeld();
  ctx.restore();
}

function drawHead(ctx, spec, hc, r, rot, h) {
  const { S, L, mode, lw, skin, accent, main } = h;
  const face = spec.face || {};
  ctx.save();
  ctx.translate(hc[0], hc[1]); ctx.rotate(rot);
  const crown = h.crown;
  const hairCol = spec.face && spec.face.age >= 0.8 ? PAL.stone : PAL.black;
  const gold = PAL.gold;
  // things behind the skull
  if (crown === 'veil') S([[-r * 1.15, -r * 0.9], [r * 0.2, -r * 1.25], [r * 0.6, -r * 0.9], [-r * 0.5, 0], [-r * 1.3, r * 2.6], [-r * 1.9, r * 2.4], [-r * 1.5, r * 0.4]], { fill: main, gap: mode === 'colour' ? accent : null, smooth: true, hatchK: 0.5 });
  if (crown === 'wildHair') { const p = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.55 + (i / 12) * 1.3); const rr = r * (i % 2 ? 2.2 : 1.5); p.push([Math.cos(a) * rr - r * 0.1, Math.sin(a) * rr * 0.95 + r * 0.2]); } S(p, { fill: PAL.black, lineFill: PAL.cream }); }
  if (h.female && crown !== 'veil' && crown !== 'wildHair') S([[-r * 0.7, -r * 0.6], [-r * 1.25, r * 0.2], [-r * 1.1, r * 1.9], [-r * 0.5, r * 1.2]], { fill: hairCol, smooth: true });
  if (crown === 'bun' || crown === 'flowerBun') S(ellipsePts(-r * 1.15, -r * 0.35, r * 0.5, r * 0.5, 8), { fill: hairCol, smooth: true });
  // skull in profile: long sharp nose, or a muzzle for vanaras and bears
  const pts = [];
  for (let a = 100; a <= 300; a += 25) pts.push([Math.cos(a * D) * r, Math.sin(a * D) * r * 1.02]);
  if (spec.body === 'monkey' || spec.body === 'bear') {
    const m = spec.body === 'bear' ? 1.2 : 1;
    pts.push([r * 0.8, -r * 0.5], [r * 0.95, -r * 0.1], [r * 1.5 * m, r * 0.05], [r * 1.66 * m, r * 0.42], [r * 1.3 * m, r * 0.82], [r * 0.6, r * 0.95], [r * 0.1, r * 1.02]);
  } else {
    pts.push([r * 0.74, -r * 0.62], [r * 0.9, -r * 0.2], [r * 1.5, r * 0.3], [r * 0.95, r * 0.36], [r * 1.02, r * 0.52], [r * 0.86, r * 0.64], [r * 0.9, r * 0.74], [r * 0.62, r * 1.0], [r * 0.1, r * 1.04]);
  }
  S(pts, { fill: skin, smooth: false });
  if (mode !== 'sil') {
    // hair cap
    if (crown !== 'none' || true) {
      const cap = []; for (let a = 150; a <= 300; a += 25) cap.push([Math.cos(a * D) * r * 1.02, Math.sin(a * D) * r * 1.04]);
      cap.push([r * 0.5, -r * 0.82], [0, -r * 0.5], [-r * 0.62, -r * 0.2]);
      if (!(spec.body === 'monkey' || spec.body === 'bear')) S(cap, { fill: hairCol, smooth: false });
    }
    if (spec.body === 'monkey' || spec.body === 'bear') S(ellipsePts(-r * 0.5, -r * 0.95, r * 0.28, r * 0.28, 7), { fill: skin, smooth: true });
    // the frontal almond eye, running nearly to the ear
    const e = face.eye || 'long';
    const ex = r * 0.18, ey = -r * 0.12;
    const el = e === 'round' ? r * 0.42 : e === 'wide' ? r * 0.56 : e === 'narrow' ? r * 0.6 : r * 0.62;
    const eh = e === 'round' ? r * 0.3 : e === 'wide' ? r * 0.32 : e === 'narrow' ? r * 0.13 : e === 'sleepy' ? r * 0.12 : e === 'closed' ? 0.01 : r * 0.21;
    const eye = [[ex - el, ey], [ex - el * 0.4, ey - eh], [ex + el * 0.3, ey - eh], [ex + el * 0.8, ey], [ex + el * 0.3, ey + eh], [ex - el * 0.4, ey + eh]];
    S(eye, { fill: PAL.white, smooth: true, lineFill: PAL.white });
    if (e !== 'closed') { ctx.fillStyle = spec.ghost ? PAL.grey : PAL.black; ctx.beginPath(); ctx.arc(ex + el * 0.12, ey, Math.max(1.4, Math.min(eh * 0.95, r * 0.17)), 0, 7); ctx.fill(); }
    L([[ex - el, ey], [ex - el * 1.5, ey + r * 0.04]], { w: lw * 0.7 });
    const by = ey - eh - r * 0.16;
    if (face.brow === 'heavy') L([[ex - el * 0.9, by - r * 0.05], [ex + el * 0.8, by + r * 0.1]], { w: lw * 1.3 });
    else if (face.brow === 'arched') L([[ex - el * 0.9, by + r * 0.05], [ex, by - r * 0.1], [ex + el * 0.8, by + r * 0.05]], { w: lw * 0.7, smooth: true });
    else L([[ex - el * 0.9, by], [ex + el * 0.8, by]], { w: lw * 0.7 });
    // ear and earring
    L([[-r * 0.46, -r * 0.1], [-r * 0.62, r * 0.1], [-r * 0.44, r * 0.32]], { w: lw * 0.6, smooth: true });
    if (spec.jewels !== 'none' && spec.body !== 'bear') dots(ctx, -r * 0.46, r * 0.5, 0, 1, mode === 'colour' || mode === 'kachni' ? gold : PAL.black, 1, r * 0.12);
    // mouth
    const mx = spec.body === 'monkey' || spec.body === 'bear' ? r * 1.25 : r * 0.82;
    L([[mx - r * 0.3, r * 0.62], [mx, r * 0.58]], { w: lw * 0.6 });
    if (spec.body === 'monkey' || spec.body === 'bear') dots(ctx, mx + r * 0.22, r * 0.2, 0, 1, PAL.black, 1, r * 0.07);
    if (face.fangs) { ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.black; ctx.lineWidth = lw * 0.4; for (const fx of [mx - r * 0.18, mx - r * 0.02]) { ctx.beginPath(); ctx.moveTo(fx - r * 0.07, r * 0.58); ctx.lineTo(fx, r * 0.84); ctx.lineTo(fx + r * 0.07, r * 0.58); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    if (face.moustache) L([[r * 0.9, r * 0.45], [r * 0.4, r * 0.5], [r * 0.2, r * 0.66]], { w: lw * 1.1, smooth: true });
    if (face.beard) {
      const bl = face.beard === 'short' ? 0.5 : face.beard === 'long' ? 1.5 : 1.2;
      S([[r * 0.9, r * 0.74], [r * 0.7, r * (1 + bl)], [r * 0.2, r * (1.1 + bl * 0.8)], [-r * 0.3, r * 0.95], [r * 0.3, r * 0.9]], { fill: face.beard === 'white' ? PAL.white : PAL.black, smooth: true, lineFill: PAL.cream });
    }
    if (face.age) { L([[ex - el * 0.6, ey + eh + r * 0.14], [ex + el * 0.3, ey + eh + r * 0.2]], { w: lw * 0.45 }); L([[r * 0.3, r * 0.5], [r * 0.5, r * 0.7]], { w: lw * 0.45 }); }
    const tcol = mode === 'colour' ? PAL.madder : PAL.black;
    if (face.tilak === 'vaishnava') { L([[r * 0.58, -r * 0.82], [r * 0.7, -r * 0.4]], { w: lw * 0.7, color: tcol }); L([[r * 0.4, -r * 0.84], [r * 0.56, -r * 0.4]], { w: lw * 0.5, color: mode === 'colour' ? PAL.white : PAL.black }); }
    else if (face.tilak === 'shaiva') for (let i = 0; i < 3; i++) L([[r * 0.3, -r * (0.56 + i * 0.12)], [r * 0.74, -r * (0.5 + i * 0.12)]], { w: lw * 0.5, color: mode === 'colour' ? PAL.white : PAL.black });
    else if (face.tilak === 'dot') dots(ctx, r * 0.6, -r * 0.5, 0, 1, tcol, 1, r * 0.09);
  }
  // headdress
  const G = { fill: gold, gold: true };
  const crownShape = (hgt, wid, peaks) => {
    const p = [[-wid * r, -r * 0.82], [-wid * r * 1.08, -r * 1.12]];
    for (let i = 0; i < peaks; i++) { const x0 = -wid * r + (2 * wid * r * i) / peaks, x1 = x0 + (2 * wid * r) / peaks; const mid = i === Math.floor(peaks / 2); p.push([(x0 + x1) / 2, -r * (1.12 + hgt * (mid ? 1 : 0.62))]); if (i < peaks - 1) p.push([x1, -r * 1.2]); }
    p.push([wid * r * 1.08, -r * 1.12], [wid * r, -r * 0.82]);
    S(p, G);
    if (mode !== 'sil') dots(ctx, 0, -r * 1.0, 0, 1, mode === 'colour' ? PAL.madder : PAL.black, 1, r * 0.1);
  };
  switch (crown) {
    case 'tallCrown': crownShape(1.5, 0.78, 3); break;
    case 'tallestCrown': crownShape(2.3, 0.9, 5); S([[-r * 0.3, -r * 3.2], [0, -r * 3.9], [r * 0.3, -r * 3.2]], G); break;
    case 'lowCrown': crownShape(0.75, 0.74, 3); break;
    case 'heavyCrown': crownShape(1.25, 1.05, 5); S([[-r * 1.1, -r * 0.9], [-r * 1.4, -r * 0.2], [-r * 0.9, -r * 0.5]], G); break;
    case 'queenCrown': case 'pearlCrown': crownShape(0.7, 0.62, 3); if (mode !== 'sil' && crown === 'pearlCrown') for (let i = -2; i <= 2; i++) dots(ctx, i * r * 0.28, -r * 0.8, 0, 1, PAL.white, 1, r * 0.1); break;
    case 'spikeCrown': crownShape(1.3, 0.85, 5); break;
    case 'shellCrown': S(ellipsePts(0, -r * 1.3, r * 0.6, r * 0.5, 9), { fill: PAL.white, smooth: true }); L(ellipsePts(0, -r * 1.3, r * 0.3, r * 0.24, 8, 0, 5), { w: lw * 0.6, smooth: true }); break;
    case 'tallJata': {
      const j = mode === 'colour' ? PAL.black : PAL.black;
      S(ellipsePts(-r * 0.08, -r * 1.12, r * 0.62, r * 0.32, 9), { fill: j, smooth: true });
      S([[-r * 0.46, -r * 1.2], [-r * 0.34, -r * 2.0], [-r * 0.12, -r * 2.55], [r * 0.12, -r * 2.5], [r * 0.3, -r * 1.95], [r * 0.38, -r * 1.2]], { fill: j, smooth: true });
      for (let i = 0; i < 3; i++) L([[-r * 0.34 + i * 0.04 * r, -r * (1.45 + i * 0.36)], [r * 0.3 - i * 0.05 * r, -r * (1.5 + i * 0.36)]], { w: lw * 0.9, color: mode === 'colour' ? PAL.ochre : PAL.black });
      dots(ctx, 0, -r * 2.55, 0, 1, mode === 'colour' ? PAL.brown : PAL.black, 1, r * 0.13);
      break;
    }
    case 'jataKnot': S(ellipsePts(-r * 0.1, -r * 1.35, r * 0.48, r * 0.56, 9), { fill: PAL.black, smooth: true }); L([[-r * 0.5, -r * 0.98], [r * 0.3, -r * 0.98]], { w: lw * 1.1, color: mode === 'colour' ? PAL.earth : PAL.black }); break;
    case 'mattedCrown': S(ellipsePts(-r * 0.1, -r * 1.2, r * 0.7, r * 0.42, 9), { fill: PAL.black, smooth: true }); S(ellipsePts(-r * 0.1, -r * 1.7, r * 0.5, r * 0.36, 9), { fill: PAL.black, smooth: true }); S(ellipsePts(-r * 0.1, -r * 2.15, r * 0.3, r * 0.28, 8), { fill: PAL.black, smooth: true }); break;
    case 'topknot': S(ellipsePts(-r * 0.45, -r * 1.2, r * 0.32, r * 0.36, 8), { fill: hairCol, smooth: true }); break;
    case 'flowerBun': if (mode !== 'sil') dots(ctx, -r * 1.2, -r * 0.5, r * 0.22, 5, mode === 'colour' ? PAL.white : PAL.black, 3, r * 0.12); break;
    case 'headband': L([[-r * 0.95, -r * 0.5], [r * 0.75, -r * 0.62]], { w: lw * 1.8, color: mode === 'colour' ? accent : PAL.black }); break;
    case 'turban': S([[-r * 1.05, -r * 0.5], [-r * 0.9, -r * 1.3], [0, -r * 1.6], [r * 0.8, -r * 1.25], [r * 0.82, -r * 0.6]], { fill: accent, smooth: true, hatchK: 0.4 }); break;
    case 'horns1': for (const sg of [-1, 1]) S([[sg * r * 0.3 - r * 0.1, -r * 0.92], [sg * r * 0.7 - r * 0.1, -r * 1.7], [sg * r * 0.5 - r * 0.1, -r * 2.1], [sg * r * 0.6 - r * 0.1, -r * 0.95]], { fill: PAL.white, smooth: true }); break;
    case 'horns2': for (const sg of [-1, 1]) S([[sg * r * 0.3, -r * 0.9], [sg * r * 1.5, -r * 1.1], [sg * r * 1.9, -r * 1.9], [sg * r * 1.2, -r * 1.35], [sg * r * 0.55, -r * 0.7]], { fill: PAL.white, smooth: true }); break;
    case 'horns3': S([[-r * 0.25, -r * 0.95], [r * 0.1, -r * 2.3], [r * 0.4, -r * 0.92]], { fill: PAL.white, smooth: false }); break;
    case 'horns4': for (const sg of [0, 1]) S([[r * 0.1 - sg * r * 0.5, -r * 0.95], [-r * 1.3 - sg * r * 0.3, -r * 1.6], [-r * 1.9, -r * 1.1 + sg * r * 0.4], [-r * 1.0, -r * 1.2], [-r * 0.2 - sg * r * 0.4, -r * 0.7]], { fill: PAL.white, smooth: true }); break;
    case 'tuftedEars': for (const sg of [-1, 1]) S([[sg * r * 0.3 - r * 0.2, -r * 0.9], [sg * r * 0.6 - r * 0.2, -r * 1.9], [sg * r * 0.8 - r * 0.2, -r * 0.8]], { fill: PAL.gold, smooth: false, gold: true }); break;
    case 'hood': S([[-r * 1.2, r * 0.9], [-r * 1.1, -r * 0.8], [-r * 0.1, -r * 2.2], [r * 0.7, -r * 0.8], [r * 0.2, -r * 0.6], [-r * 0.5, r * 0.2]], { fill: main, smooth: false, hatchK: 0.6 }); break;
    case 'potHead': S(ellipsePts(0, -r * 1.45, r * 0.6, r * 0.5, 9), { fill: PAL.terracotta, smooth: true }); S([[-r * 0.3, -r * 1.9], [0, -r * 2.8], [r * 0.3, -r * 1.9]], { fill: PAL.saffron, smooth: true, gold: true }); break;
    default: break;
  }
  if (h.sig && h.sig.mark === 'hairFlower' && mode !== 'sil') dots(ctx, -r * 0.75, -r * 0.75, r * 0.2, 5, mode === 'colour' ? PAL.madder : PAL.black, 5, r * 0.11);
  ctx.restore();
}

/** Ravana's ten heads, fanned. The head that can be hit is in colour; the rest are line. */
function drawTenHeads(ctx, spec, hc, r, rot, h) {
  const st = h.heads || {};
  const pride = st.pride || 0;       // 0..10: the pride head swells, the others shrink
  const order = [4, 3, 5, 2, 6, 1, 7, 0, 8];
  const shrink = 1 - pride * 0.022;
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k];
    const side = i < 4.5 ? -1 : 1, rank = Math.ceil((k + 1) / 2);
    const a = side * (0.42 + (rank - 1) * 0.36);
    const rr = r * (0.78 - rank * 0.05) * (i === 8 ? 1 + pride * 0.06 : shrink);
    const dist = r * (1.2 + rank * 1.18);
    const p = [hc[0] + Math.sin(a) * dist, hc[1] + r * 0.2 - Math.cos(a) * dist * 0.42 + rank * r * 0.1];
    if (st.gone && st.gone[i]) continue;
    const silent = st.silent && st.silent[i];
    const lit = st.active === i;
    const sub = { ...h };
    if (h.mode === 'colour' && st.active != null && !lit) { sub.mode = 'line'; sub.S = (pts, o = {}) => shape(ctx, pts, { w: h.lw, seed: 5 + i, lineFill: PAL.cream, ...o, mode: 'line' }); }
    ctx.save(); if (silent) ctx.globalAlpha *= 0.35;
    drawHead(ctx, { ...spec, face: { ...spec.face, eye: ['long', 'narrow', 'wide', 'round'][i % 4], moustache: i % 2 === 0 } }, p, rr, rot + a * 0.5, { ...sub, crown: i % 3 === 0 ? 'spikeCrown' : i % 3 === 1 ? 'lowCrown' : 'tallCrown' });
    ctx.restore();
  }
  const lit = st.active == null || st.active === 9;
  const sub = { ...h };
  if (h.mode === 'colour' && !lit) { sub.mode = 'line'; sub.S = (pts, o = {}) => shape(ctx, pts, { w: h.lw, seed: 99, lineFill: PAL.cream, ...o, mode: 'line' }); }
  if (!(st.gone && st.gone[9])) drawHead(ctx, spec, hc, r * 1.05, rot, { ...sub, crown: 'tallestCrown' });
}

function drawBird(ctx, spec, poseName, o) {
  const mode = o.mode || 'colour';
  const U = BASE_U * spec.build.height * 0.62;
  const lw = Math.max(1.8, U * 0.02);
  const main = col(spec.colour.main), accent = col(spec.colour.accent);
  let seed = hashStr(spec.id);
  const S = (pts, opt = {}) => { seed += 5; shape(ctx, pts, { w: lw, seed, lineFill: PAL.cream, ...opt, mode: mode === 'kachni' ? 'line' : mode }); if (mode === 'kachni' && opt.hatchK) hatch(ctx, pts, { color: PAL.terracotta, spacing: 6, angle: opt.hatchK, seed }); };
  const pat = (n, fg) => (mode === 'colour' ? pattern(ctx, n, null, fg, 1.4) : null);
  const fly = poseName.startsWith('fly') || poseName === 'jump';
  const flap = poseName === 'fly2' ? 1 : poseName === 'hurt' ? -0.6 : 0;
  ctx.save();
  ctx.translate(0, fly ? -U * 0.9 : -U * 0.62);
  if (poseName === 'dead' || poseName === 'grieve') ctx.rotate(0.5);
  // wings
  if (!spec.wingless) {
    const span = fly ? 1.9 : 0.7, lift = fly ? (flap ? 0.2 : -0.75) : 0.3;
    for (const sg of [-1, 1]) {
      const w = [[sg * U * 0.2, -U * 0.1], [sg * U * span * 0.5, U * lift * 0.6 - U * 0.25], [sg * U * span, U * lift - U * 0.1], [sg * U * span * 0.86, U * lift + U * 0.24], [sg * U * span * 0.66, U * lift * 0.6 + U * 0.14], [sg * U * span * 0.5, U * lift * 0.4 + U * 0.36], [sg * U * span * 0.3, U * 0.2], [sg * U * 0.14, U * 0.34]];
      S(w, { fill: main, pattern: pat(spec.pattern, accent), hatchK: sg * 0.9 });
    }
  } else for (const sg of [-1, 1]) S([[sg * U * 0.2, -U * 0.1], [sg * U * 0.5, U * 0.05], [sg * U * 0.38, U * 0.22], [sg * U * 0.2, U * 0.3]], { fill: main, hatchK: 0.9 });
  // tail, body, legs
  S([[-U * 0.25, U * 0.3], [-U * 0.75, U * 0.62], [-U * 0.5, U * 0.66], [-U * 0.56, U * 0.82], [-U * 0.1, U * 0.5]], { fill: main, pattern: pat(spec.pattern, accent) });
  S(ellipsePts(0, U * 0.12, U * 0.32, U * 0.46, 12), { fill: main, pattern: pat(spec.pattern, accent), smooth: true, hatchK: 0.6 });
  if (!fly && mode !== 'sil') for (const sg of [-1, 1]) line(ctx, [[sg * U * 0.12, U * 0.5], [sg * U * 0.14, U * 0.62], [sg * U * 0.3, U * 0.62]], { w: lw, seed });
  // neck and head, hooked beak
  S([[-U * 0.12, -U * 0.24], [U * 0.02, -U * 0.62], [U * 0.3, -U * 0.6], [U * 0.18, -U * 0.2]], { fill: accent, smooth: true });
  S(ellipsePts(U * 0.2, -U * 0.7, U * 0.2, U * 0.18, 10), { fill: accent, smooth: true });
  S([[U * 0.34, -U * 0.8], [U * 0.66, -U * 0.7], [U * 0.6, -U * 0.5], [U * 0.5, -U * 0.62], [U * 0.34, -U * 0.6]], { fill: PAL.ochre, smooth: false, gold: true });
  if (mode !== 'sil') {
    const e = [[U * 0.08, -U * 0.72], [U * 0.18, -U * 0.8], [U * 0.3, -U * 0.72], [U * 0.18, -U * 0.66]];
    S(e, { fill: PAL.white, smooth: true });
    ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(U * 0.2, -U * 0.725, U * 0.04, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- rank and file
// Every enemy type has its own silhouette; within a type, seeded variations of horn, face,
// pattern, weapon and accent mean no two on screen are alike.
const ENEMY_PATTERNS = ['pebbles', 'triangles', 'beads', 'braid', 'rings'];
const ENEMY_HORNS = ['horns1', 'horns2', 'horns3', 'horns4'];
const ENEMY_EYES = ['wide', 'narrow', 'round', 'long', 'sleepy', 'wide'];
const SILHOUETTES = {
  walker: { h: 1.0, w: 1.0, stance: 'forward', garment: 'bare', weapons: ['kharaSword', 'rakClub', 'axe'] },
  lowCharger: { h: 0.78, w: 1.15, stance: 'forward', garment: 'loin', weapons: ['none', 'none', 'none'], crown: 'horns4' },
  heavy: { h: 1.42, w: 1.65, stance: 'heavy', garment: 'bare', weapons: ['ironClub', 'ironClub', 'mace'] },
  winged: { h: 0.82, w: 0.9, stance: 'forward', garment: 'loin', weapons: ['none', 'none', 'none'], wings: true },
  bowman: { h: 1.14, w: 0.7, stance: 'upright', garment: 'dhoti', weapons: ['akshaBow', 'akshaBow', 'akshaBow'], crown: 'topknot' },
  shield: { h: 1.05, w: 1.2, stance: 'upright', garment: 'armour', weapons: ['spear', 'kharaSword', 'spear'], shield: true },
  hooded: { h: 1.2, w: 0.8, stance: 'upright', garment: 'robe', weapons: ['staffPlain', 'staffPlain', 'staffPlain'], crown: 'hood' },
  crawler: { h: 0.7, w: 0.9, stance: 'anxious', garment: 'loin', weapons: ['longArms', 'longArms', 'longArms'] },
  potBelly: { h: 0.95, w: 1.6, stance: 'heavy', garment: 'bare', weapons: ['firePot', 'firePot', 'firePot'], crown: 'potHead' },
  rider: { h: 0.7, w: 0.9, stance: 'upright', garment: 'armour', weapons: ['spear', 'spear', 'spear'], crown: 'turban' },
  banner: { h: 1.25, w: 0.9, stance: 'proud', garment: 'royal', weapons: ['none', 'none', 'none'], crown: 'spikeCrown' },
};

export function enemySpec(type, silhouette, seed, accents) {
  const sil = SILHOUETTES[silhouette] || SILHOUETTES.walker;
  const n = (i) => (noise(seed, i) + 1) / 2;
  const v = { horns: Math.floor(n(1) * 4), face: Math.floor(n(2) * 6), pattern: Math.floor(n(3) * 5), weapon: Math.floor(n(4) * 3), accent: Math.floor(n(5) * accents.length) };
  return {
    id: `${type}#${seed}`, key: `${type}#${seed}:${accents.join()}`, body: 'human',
    build: { height: sil.h * (0.96 + n(6) * 0.08), width: sil.w, stance: sil.stance },
    colour: { main: 'rakshasa', accent: accents[v.accent] }, skin: v.face % 2 ? 'rakshasa' : 'rakshasaLight',
    pattern: ENEMY_PATTERNS[v.pattern], headdress: sil.crown || ENEMY_HORNS[v.horns], garment: sil.garment,
    signature: sil.weapons[v.weapon], walk: 'stride', jewels: 'none', wings: sil.wings, shield: sil.shield,
    face: { eye: ENEMY_EYES[v.face], brow: 'heavy', fangs: v.face !== 3, moustache: v.face > 3 },
    variant: v,
  };
}

// ---------------------------------------------------------------- sprite cache
// Figures move pose to pose, so each pose is painted once and reused.
const sprites = new Map();
let spriteScale = 1;
const MAX_SPRITES = 150;
export function setSpriteScale(s) { const v = Math.max(0.6, Math.min(1.25, Math.round(s * 4) / 4)); if (v !== spriteScale) { spriteScale = v; sprites.clear(); } }
export function clearSprites() { sprites.clear(); }

function spriteFor(spec, pose, mode, aim, extra) {
  const key = `${spec.key}|${pose}|${mode}|${aim}|${extra ? JSON.stringify(extra) : ''}`;
  let sp = sprites.get(key);
  if (sp) { sprites.delete(key); sprites.set(key, sp); return sp; }
  const U = BASE_U * spec.build.height;
  const bird = spec.body === 'bird';
  const big = U > 260;
  const s = big ? Math.min(spriteScale, 0.8) : spriteScale;
  const halfW = bird ? U * 1.35 : U * (0.9 + (spec.build.width - 1) * 0.2 + (spec.wings ? 0.2 : 0));
  const top = bird ? U * 1.5 : U * (spec.body === 'tenHeads' ? 1.75 : 1.62), bottom = U * 0.14;
  const c = document.createElement('canvas');
  c.width = Math.ceil(halfW * 2 * s); c.height = Math.ceil((top + bottom) * s);
  const x = c.getContext('2d');
  x.scale(s, s); x.translate(halfW, top);
  drawFigure(x, spec, pose, { mode, aim, ...(extra || {}) });
  sp = { c, ox: halfW, oy: top, w: halfW * 2, h: top + bottom };
  sprites.set(key, sp);
  if (sprites.size > MAX_SPRITES) sprites.delete(sprites.keys().next().value);
  return sp;
}

/**
 * Draw a cached figure. o: { facing, mode, aim, rot, alpha, scale, heads, drain (0..1 colour to line) }
 */
export function fig(ctx, spec, pose, x, y, o = {}) {
  const mode = o.mode || 'colour';
  const aim = Math.round((o.aim || 0) / 12) * 12;
  const draw = (m, alpha) => {
    const sp = spriteFor(spec, pose, m, aim, o.heads ? { heads: o.heads } : null);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
  };
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) { const U = BASE_U * spec.build.height; ctx.translate(0, -U * (o.pivot ?? 0.3)); ctx.rotate(o.rot); ctx.translate(0, U * (o.pivot ?? 0.3)); }
  const sc = o.scale || 1;
  ctx.scale((o.facing === -1 ? -1 : 1) * sc, sc);
  const a = o.alpha ?? 1, base = ctx.globalAlpha;
  if (o.drain > 0 && mode === 'colour') { draw('line', base * a); if (o.drain < 1) draw('colour', base * a * (1 - o.drain)); }
  else draw(mode, base * a);
  ctx.restore();
}

export function figHeight(spec) { return BASE_U * spec.build.height * (spec.body === 'bird' ? 0.9 : 1.05); }
