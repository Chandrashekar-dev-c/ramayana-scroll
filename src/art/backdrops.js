// Backdrops: one flat painted plane. The world is kachni (thin line and hatching over an
// unpainted, mottled ground). When a place is freed or a chapter finished, the same plane
// is painted again in bharni and the line world fills with colour.
// Static planes are painted once into chunks and reused every frame.
import { app, makeCanvas } from '../core/app.js';
import { noise, hashStr } from '../core/rng.js';
import { PAL } from './palette.js';
import { line, shape, hatch, dryHatch, setBrushMode, rectPts, ellipsePts, dots } from './ink.js';
import * as M from './motifs.js';
import { pattern } from './patterns.js';
import { GROUND } from './layout.js';

export const CHUNK = 1024;

// layer: [kind, spacing, y offset from ground, size, options]
const T = (kind, sp, size, o = {}) => ['tree', sp, 0, size, { kind, ...o }];
export const BACKDROPS = {
  court: { ground: 'floor', sky: ['flower', 'dots'], layers: [['pillar', 250, 0, 330, {}], ['arch', 250, 0, 330, {}], ['lampStand', 500, 0, 90, { off: 125 }]] },
  chamber: { ground: 'floor', sky: ['dots'], layers: [['pillar', 330, 0, 300, { fill: PAL.madder }], ['curtain', 330, 0, 300, { off: 165 }]] },
  kingRoom: { ground: 'floor', night: true, sky: ['star'], moon: true, layers: [['pillar', 360, 0, 310, {}], ['lampStand', 180, 0, 100, { off: 60 }]] },
  city: { ground: 'earth', brush: true, sky: ['bird', 'flower', 'dots'], layers: [['building', 300, 0, 250, { banner: true, tiers: 3 }], ['building', 300, 0, 150, { off: 150, tiers: 2 }], T('mango', 420, 150, { off: 60 })] },
  mithila: { ground: 'earth', sky: ['fish', 'bird', 'flower'], layers: [['building', 340, 0, 240, { banner: true, tiers: 3, fill: PAL.pink }], T('bamboo', 340, 170, { off: 170 }), ['pond', 680, 0, 60, { off: 250 }]] },
  riverbank: { ground: 'earth', brush: true, sky: ['bird', 'fish', 'flower'], band: 'river', layers: [T('mango', 310, 210), T('palm', 470, 260, { off: 130 }), ['bush', 180, 0, 34, { off: 40 }]] },
  road: { ground: 'earth', sky: ['bird', 'dots', 'flower'], layers: [['hill', 520, 0, 150, {}], T('banyan', 380, 240, { off: 90 }), T('sala', 300, 170, { off: 200 })] },
  waste: { ground: 'cracked', sky: ['dots'], layers: [T('bare', 260, 190), ['post', 340, 0, 110, { off: 120 }], ['bones', 300, 0, 16, { off: 60 }], ['rock', 560, 0, 60, { off: 280 }]] },
  ashram: { ground: 'earth', sky: ['bird', 'flower', 'dots'], layers: [['hut', 520, 0, 150, {}], T('banyan', 400, 260, { off: 240 }), T('sala', 300, 180, { off: 100 }), ['bush', 200, 0, 30, { off: 30 }]] },
  hermitage: { ground: 'earth', sky: ['dots', 'flower'], layers: [['hut', 700, 0, 160, { off: 320 }], T('ashoka', 330, 220), T('bare', 500, 170, { off: 160 })] },
  forest: { ground: 'earth', sky: ['bird', 'leaf', 'dots'], layers: [T('sala', 170, 300), T('banyan', 330, 270, { off: 80 }), ['bush', 150, 0, 36, { off: 30 }], ['anthill', 620, 0, 50, { off: 300 }]] },
  deepForest: { ground: 'earth', sky: ['leaf', 'dots'], layers: [T('sala', 130, 340), T('banyan', 260, 300, { off: 60 }), T('bamboo', 340, 240, { off: 170 }), ['bush', 120, 0, 40, { off: 30 }]] },
  panchavati: { ground: 'earth', brush: true, sky: ['bird', 'flower', 'leaf'], band: 'river', layers: [T('banyan', 420, 280), T('ashoka', 300, 210, { off: 150 }), ['bush', 170, 0, 34, { off: 40 }]] },
  chitrakuta: { ground: 'earth', sky: ['bird', 'flower'], layers: [['hill', 430, 0, 250, {}], T('mango', 300, 200, { off: 100 }), T('sala', 380, 170, { off: 230 })] },
  ridge: { ground: 'rock', sky: ['bird', 'dots'], layers: [['hill', 380, 0, 210, { fill: PAL.stone }], ['rock', 240, 0, 80, { off: 70 }], T('bare', 430, 160, { off: 180 })] },
  kishkindha: { ground: 'rock', sky: ['bird', 'leaf', 'dots'], layers: [['hill', 340, 0, 280, { fill: PAL.ochre }], ['cave', 680, 0, 130, { off: 200 }], T('palm', 410, 230, { off: 90 }), ['rock', 300, 0, 60, { off: 150 }]] },
  cave: { ground: 'rock', night: true, sky: ['dots'], layers: [['stalactite', 120, 0, 120, {}], ['rock', 260, 0, 90, {}]] },
  pampa: { ground: 'earth', sky: ['bird', 'fish', 'flower'], band: 'lake', layers: [T('ashoka', 340, 230), T('mango', 460, 210, { off: 170 }), ['bush', 160, 0, 32, { off: 30 }]] },
  shore: { ground: 'sand', sky: ['bird', 'fish', 'dots'], band: 'sea', layers: [T('palm', 280, 270), ['rock', 430, 0, 50, { off: 140 }]] },
  ocean: { ground: 'sea', sky: ['bird', 'fish'], layers: [['cloud', 330, -330, 150, {}], ['cloud', 470, -230, 110, { off: 200 }]] },
  sky: { ground: 'none', sky: ['bird', 'dots'], layers: [['cloud', 300, -330, 170, {}], ['cloud', 430, -180, 130, { off: 160 }], ['cloud', 520, -40, 150, { off: 300 }]] },
  nightSky: { ground: 'none', night: true, sky: ['star'], moon: true, layers: [['cloud', 380, -300, 160, {}], ['cloud', 520, -120, 130, { off: 200 }]] },
  mountain: { ground: 'rock', sky: ['bird', 'dots'], layers: [['peak', 360, 0, 380, {}], ['peak', 360, 0, 260, { off: 180 }], ['herb', 130, 0, 26, { off: 40 }]] },
  lanka: { ground: 'gold', sky: ['dots', 'flower'], lanka: true, layers: [['building', 280, 0, 290, { lanka: true, tiers: 3, banner: true }], ['building', 280, 0, 180, { lanka: true, off: 140, tiers: 2 }], T('palm', 560, 220, { off: 70 })] },
  lankaNight: { ground: 'gold', night: true, lanka: true, sky: ['star'], moon: true, layers: [['building', 280, 0, 290, { lanka: true, tiers: 3 }], ['building', 280, 0, 180, { lanka: true, off: 140, tiers: 2 }], ['lampStand', 420, 0, 90, { off: 210 }]] },
  lankaCourt: { ground: 'floor', lanka: true, sky: ['dots'], layers: [['pillar', 220, 0, 350, { fill: PAL.gold }], ['arch', 220, 0, 350, {}], ['lampStand', 440, 0, 100, { off: 110 }]] },
  lankaRoofs: { ground: 'none', night: true, lanka: true, sky: ['star'], moon: true, layers: [['building', 330, 120, 200, { lanka: true, tiers: 2 }]] },
  grove: { ground: 'earth', lanka: true, sky: ['bird', 'flower', 'leaf'], layers: [T('ashoka', 240, 290), T('ashoka', 370, 220, { off: 120 }), ['bush', 150, 0, 36, { off: 30 }], ['wall', 1024, 0, 60, {}]] },
  battlefield: { ground: 'cracked', lanka: true, sky: ['bird', 'dots'], layers: [['building', 520, 0, 200, { lanka: true, tiers: 2 }], ['bannerPole', 300, 0, 170, { off: 140 }], ['rock', 400, 0, 46, { off: 250 }]] },
  camp: { ground: 'sand', sky: ['bird', 'dots'], band: 'sea', layers: [['tent', 360, 0, 130, {}], ['bannerPole', 360, 0, 190, { off: 180 }], T('palm', 540, 250, { off: 90 })] },
  nandigram: { ground: 'earth', sky: ['bird', 'flower'], layers: [['hut', 420, 0, 150, {}], T('mango', 340, 220, { off: 200 }), ['bush', 170, 0, 32, { off: 60 }]] },
  cityNight: { ground: 'earth', night: true, sky: ['star'], moon: true, layers: [['building', 300, 0, 250, { tiers: 3 }], ['building', 300, 0, 150, { off: 150, tiers: 2 }]] },
  tamasa: { ground: 'earth', night: true, sky: ['star'], moon: true, band: 'river', layers: [T('banyan', 420, 260), T('palm', 520, 240, { off: 200 })] },
  kailash: { ground: 'rock', lanka: true, sky: ['dots'], layers: [['peak', 700, 0, 470, { off: 350 }], ['peak', 420, 0, 240, {}]] },
};

// How each place looks beyond its layers: a flat sky pattern, a far band in thin faint line,
// place details, and a near band in front of the figures. Depth comes from overlap and
// line weight, never from perspective or shading (brief, Rule G and the depth notes).
const LOOK = {
  court: { skyPat: 'royalChecks', far: null, near: 'lotusBorder', sun: false },
  chamber: { skyPat: 'smallChecks', far: null, near: 'lotusBorder', sun: false },
  kingRoom: { skyPat: 'stars', far: null, near: 'lotusBorder', sun: false },
  city: { skyPat: 'flowerDots', far: 'city', near: 'grass' },
  mithila: { skyPat: 'fishScale', far: 'city', near: 'reeds', extras: ['garlands'] },
  riverbank: { skyPat: 'waveLines', far: 'palm', near: 'reeds' },
  road: { skyPat: 'dots', far: 'hill', near: 'grass' },
  waste: { skyPat: 'crackedEarth', far: 'hill', near: 'thorns', extras: ['thorns'], regrow: [[0, 'banyan']] },
  ashram: { skyPat: 'leafSprays', far: 'sala', near: 'grass', extras: ['tulsi'], regrow: [[1], [2]] },
  hermitage: { skyPat: 'leafSprays', far: 'sala', near: 'grass', extras: ['tulsi'] },
  forest: { skyPat: 'leaf', far: 'sala', near: 'ferns', extras: ['creepers'] },
  deepForest: { skyPat: 'leaf', far: 'sala', near: 'ferns', extras: ['creepers'], sun: false, regrow: [[0], [1]] },
  panchavati: { skyPat: 'flowerDots', far: 'sala', near: 'reeds', extras: ['creepers'] },
  chitrakuta: { skyPat: 'mountainTriangles', far: 'hill', near: 'grass' },
  ridge: { skyPat: 'pebbles', far: 'hill', near: 'thorns', regrow: [[2, 'sala']] },
  kishkindha: { skyPat: 'pebbles', far: 'hill', near: 'grass', extras: ['creepers'] },
  cave: { skyPat: 'pebbles', far: null, near: 'rocks', sun: false },
  pampa: { skyPat: 'ripples', far: 'hill', near: 'reeds' },
  shore: { skyPat: 'seaFoam', far: 'palm', near: 'shells' },
  ocean: { skyPat: 'waves', far: null, near: null },
  sky: { skyPat: 'cloudSpirals', far: null, near: null },
  nightSky: { skyPat: 'stars', far: null, near: null },
  mountain: { skyPat: 'mountainTriangles', far: 'hill', near: 'grass' },
  lanka: { skyPat: 'diamonds', far: 'lanka', near: 'goldBorder', extras: ['garlands'] },
  lankaNight: { skyPat: 'diamonds', far: 'lanka', near: 'goldBorder', extras: ['garlands'] },
  lankaCourt: { skyPat: 'peacockEyes', far: null, near: 'goldBorder', sun: false, extras: ['lamps'] },
  lankaRoofs: { skyPat: 'stars', far: null, near: null },
  grove: { skyPat: 'flowerDots', far: 'sala', near: 'grass', extras: ['creepers'] },
  battlefield: { skyPat: 'crackedEarth', far: 'lanka', near: 'thorns' },
  camp: { skyPat: 'seaFoam', far: 'palm', near: 'shells' },
  nandigram: { skyPat: 'grainStalks', far: 'hill', near: 'grass' },
  cityNight: { skyPat: 'stars', far: 'city', near: 'grass' },
  tamasa: { skyPat: 'waveLines', far: 'palm', near: 'reeds' },
  kailash: { skyPat: 'mountainTriangles', far: 'hill', near: 'rocks' },
};
export const lookOf = (id) => LOOK[id] || { skyPat: 'dots', far: 'hill', near: 'grass' };

function paintFar(ctx, def, look, x0, o, seed) {
  if (!look.far) return;
  const c = o.night ? PAL.nightLine : PAL.terracotta, base = GROUND - 44;
  ctx.save(); ctx.globalAlpha *= o.far != null ? o.far : (o.colour ? 0.5 : 0.42);
  const sp = look.far === 'hill' ? 330 : 190;
  for (let k = Math.floor((x0 - 300) / sp); k <= Math.ceil((x0 + CHUNK + 300) / sp); k++) {
    const x = k * sp + noise(seed + 5, k) * sp * 0.3 - x0, h = 1 + noise(seed + 6, k) * 0.15;
    const lo = { colour: false, night: o.night, lineColor: c, seed: k + 11, w: 0.9 };
    if (look.far === 'hill') M.hill(ctx, x, base + 10, 300 * h, 120 * h, { ...lo, hatchColor: c, spacing: 15 });
    else if (look.far === 'city' || look.far === 'lanka') M.building(ctx, x, base, 90 * h, 120 * h, { ...lo, tiers: 2, lanka: look.far === 'lanka' });
    else M.tree(ctx, x, base, 140 * h, look.far === 'sala' ? 'sala' : look.far, lo);
  }
  ctx.restore();
}

function paintExtras(ctx, look, x0, o, seed) {
  const c = o.night ? PAL.nightLine : PAL.black;
  for (const ex of look.extras || []) {
    for (let k = 0; k < 5; k++) {
      const x = ((noise(seed + 40, k + (ex.length * 7)) + 1) / 2) * CHUNK, r = (noise(seed + 41, k) + 1) / 2;
      if (ex === 'creepers') {
        const len = 70 + r * 110, pts = [];
        for (let y = 22; y < 22 + len; y += 14) pts.push([x + Math.sin(y * 0.08 + k) * 7, y]);
        line(ctx, pts, { w: 1.2, color: o.colour ? PAL.green : c, smooth: true, seed: k, amp: 0.4 });
        for (let i = 1; i < pts.length; i += 2) shape(ctx, [[pts[i][0], pts[i][1]], [pts[i][0] + (i % 4 ? 9 : -9), pts[i][1] + 3], [pts[i][0], pts[i][1] + 8]], { mode: o.colour ? 'colour' : 'line', fill: PAL.leaf, lineColor: c, lineFill: o.night ? PAL.night : PAL.cream, w: 0.9, seed: i, amp: 0.3 });
      } else if (ex === 'eyes' && k < 2) {
        // eyes watching from the undergrowth
        const y = GROUND - 70 - r * 60;
        for (const dx of [-9, 9]) { shape(ctx, [[x + dx - 7, y], [x + dx, y - 4], [x + dx + 7, y], [x + dx, y + 4]], { mode: 'colour', fill: PAL.white, w: 1, seed: k, smooth: true, amp: 0.2 }); ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(x + dx + 1, y, 2, 0, 7); ctx.fill(); }
      } else if (ex === 'thorns' && k < 3) {
        const y = GROUND - 2;
        line(ctx, [[x - 30, y], [x - 10, y - 30], [x + 8, y - 12], [x + 26, y - 38], [x + 34, y]], { w: 1.3, color: c, seed: k });
        for (let i = 0; i < 6; i++) line(ctx, [[x - 24 + i * 10, y - 14 - (i % 2) * 12], [x - 20 + i * 10, y - 22 - (i % 2) * 12]], { w: 1, color: o.colour ? PAL.brown : c, seed: i, flat: true });
      } else if (ex === 'tulsi' && k < 1) {
        M.pot(ctx, x, GROUND - 2, 34, { colour: o.colour, seed: k, fill: PAL.terracotta });
        for (let i = -2; i <= 2; i++) line(ctx, [[x, GROUND - 36], [x + i * 8, GROUND - 60 - Math.abs(i) * -4]], { w: 1.1, color: o.colour ? PAL.leaf : c, seed: i });
        dots(ctx, x, GROUND - 62, 10, 6, o.colour ? PAL.leaf : c, k, 2.2);
      } else if (ex === 'garlands' && k < 3) {
        const pts = []; for (let i = 0; i <= 8; i++) pts.push([x - 80 + i * 20, 40 + Math.sin((i / 8) * Math.PI) * 34]);
        for (const p of pts) dots(ctx, p[0], p[1], 0, 1, o.colour ? PAL.saffron : c, 1, 3.4);
      } else if (ex === 'lamps' && k < 4) {
        line(ctx, [[x, 22], [x, 70 + r * 40]], { w: 1, color: c, seed: k });
        M.diya(ctx, x - 6, 76 + r * 40, 8, true, 0, { colour: true, night: o.night });
      }
    }
  }
}

/** The near band: a low row of plants, water or pattern in front of the figures. */
function paintNear(id, colour, index) {
  const def = BACKDROPS[id] || BACKDROPS.road, look = lookOf(id);
  const s = Math.min(1, Math.max(0.5, app.scale));
  const H = 720 - (GROUND - 30);
  const cv = makeCanvas(CHUNK * s, H * s);
  const ctx = cv.getContext('2d'); ctx.scale(s, s); ctx.translate(0, -(GROUND - 30));
  if (!look.near) return cv;
  const x0 = index * CHUNK, seed = hashStr(id) + index * 57;
  const night = !!def.night, c = night ? PAL.nightLine : PAL.black, m = colour ? 'colour' : 'line', lf = night ? PAL.night : PAL.cream;
  const bot = 720 - 22; // just above the painted frame
  // healed land: thorns give way to grass and flowers
  const kind = colour && look.near === 'thorns' ? 'grass' : look.near;
  if (kind === 'lotusBorder' || kind === 'goldBorder') {
    shape(ctx, rectPts(-4, bot - 30, CHUNK + 8, 30), { mode: m, fill: kind === 'goldBorder' ? PAL.gold : PAL.madder, pattern: colour ? pattern(ctx, kind === 'goldBorder' ? 'peacockEyes' : 'lotusRow', null, kind === 'goldBorder' ? PAL.black : PAL.turmeric, 1) : null, lineColor: c, lineFill: lf, w: 1.4, seed });
    return cv;
  }
  if (kind === 'reeds' || kind === 'shells') {
    shape(ctx, rectPts(-4, bot - 26, CHUNK + 8, 26), { mode: m, fill: PAL.river, lineColor: c, lineFill: lf, w: 1.2, seed });
    ctx.save(); ctx.translate(-x0, 0); M.waves(ctx, x0, x0 + CHUNK, bot - 18, bot - 4, { colour: false, night, gap: 9, w: 1 }); ctx.restore();
  }
  // dense, small near pattern; an occasional taller plant overlaps the feet
  for (let k = 0; k < 26; k++) {
    const x = (k + 0.5) * (CHUNK / 26) + noise(seed, k) * 12, tall = k % 9 === 4;
    const top = tall ? GROUND + 36 : bot - 22 - ((noise(seed, k + 50) + 1) / 2) * 18;
    if (kind === 'grass' || kind === 'ferns') {
      for (let i = -2; i <= 2; i++) line(ctx, [[x, bot], [x + i * 6, (bot + top) / 2], [x + i * 11, top + Math.abs(i) * 6]], { w: 1.2, color: colour ? PAL.green : c, smooth: true, seed: k + i, amp: 0.4 });
      if (k % 3 === 0) dots(ctx, x + 8, top + 8, 5, 5, colour ? PAL.pink : c, k, 2.2);
    } else if (kind === 'reeds') {
      line(ctx, [[x, bot - 10], [x + 3, top]], { w: 1.4, color: colour ? PAL.green : c, seed: k });
      if (k % 2) shape(ctx, ellipsePts(x + 3, top - 4, 3.5, 10, 8), { mode: m, fill: PAL.brown, lineColor: c, lineFill: lf, w: 1, seed: k, smooth: true });
      if (k % 5 === 0) M.lotusBud(ctx, x + 14, bot - 22, 9, { colour, seed: k, lineColor: c });
    } else if (kind === 'thorns') {
      line(ctx, [[x - 10, bot], [x, top], [x + 10, bot]], { w: 1.2, color: c, seed: k });
      line(ctx, [[x - 5, (bot + top) / 2], [x - 12, (bot + top) / 2 - 6]], { w: 1, color: c, seed: k + 1, flat: true });
      line(ctx, [[x + 5, (bot + top) / 2 + 6], [x + 12, (bot + top) / 2]], { w: 1, color: c, seed: k + 2, flat: true });
    } else if (kind === 'rocks') {
      shape(ctx, ellipsePts(x, bot - 8, 14, 9, 8), { mode: m, fill: PAL.stone, lineColor: c, lineFill: lf, w: 1.1, seed: k, smooth: true });
    } else if (kind === 'shells') {
      if (k % 2) shape(ctx, ellipsePts(x, bot - 34, 9, 7, 8, Math.PI, Math.PI * 2), { mode: m, fill: PAL.white, lineColor: c, lineFill: lf, w: 1, seed: k, amp: 0.3 });
      else M.fish(ctx, x, bot - 12, 8, { colour, fill: PAL.turmeric, lineColor: c, w: 1, dir: k % 4 ? 1 : -1 });
    }
  }
  return cv;
}

const nearCache = new Map();
export function drawNear(ctx, id, camX, W, o = {}) {
  if (!lookOf(id).near) return;
  const i0 = Math.floor(camX / CHUNK), i1 = Math.floor((camX + W) / CHUNK), top = GROUND - 30, H = 720 - top;
  for (let i = i0; i <= i1; i++) {
    const colour = !!o.colour;
    const get = (cl) => { const key = `${id}|${cl ? 1 : 0}|${i}`; let c = nearCache.get(key); if (!c) { c = paintNear(id, cl, i); nearCache.set(key, c); if (nearCache.size > 12) nearCache.delete(nearCache.keys().next().value); } return c; };
    const dx = i * CHUNK - camX;
    ctx.drawImage(get(colour), dx, top, CHUNK + 0.5, H);
    if (o.heal && !colour) { const a = Math.max(o.heal.x - o.heal.r, i * CHUNK), b = Math.min(o.heal.x + o.heal.r, (i + 1) * CHUNK); if (b > a) { ctx.save(); ctx.beginPath(); ctx.rect(a - camX, top, b - a, H); ctx.clip(); ctx.drawImage(get(true), dx, top, CHUNK + 0.5, H); ctx.restore(); } }
  }
}

/** Trees that a battle can bring back to life, at the same places the chunk painter uses. */
export function regrowList(id, left, right) {
  const def = BACKDROPS[id], look = lookOf(id);
  if (!def || !look.regrow) return [];
  const out = [];
  for (const [li, into] of look.regrow) {
    const [kind, sp, yOff, size, lo] = def.layers[li];
    const off = lo.off || 0;
    for (let k = Math.floor((left - off) / sp); k <= Math.ceil((right - off) / sp); k++) {
      const x = k * sp + off + noise(hashStr(id) + li * 17, k) * sp * 0.22;
      const sd = hashStr(kind) % 1000 + k * 13;
      out.push({ x, y: GROUND + yOff, h: size * (1 + noise(sd, 3) * 0.14), kind: into || lo.kind, seed: sd });
    }
  }
  return out;
}

/** A tree coming back to life: dead branches fade as the living crown grows in. */
export function drawGrowingTree(ctx, tr, grow) {
  if (grow < 1) { ctx.save(); ctx.globalAlpha *= 1 - grow; M.tree(ctx, tr.x, tr.y, tr.h * 0.82, 'bare', { colour: false, seed: tr.seed }); ctx.restore(); }
  if (grow > 0) {
    const e = 1 - (1 - grow) * (1 - grow), sc = 0.45 + 0.55 * e;
    ctx.save(); ctx.globalAlpha *= Math.min(1, grow * 1.6);
    ctx.translate(tr.x, tr.y); ctx.scale(sc, sc); ctx.translate(-tr.x, -tr.y);
    M.tree(ctx, tr.x, tr.y, tr.h, tr.kind, { colour: true, seed: tr.seed });
    ctx.restore();
  }
}

const STYLE_LINE = { 'bharni-bright': PAL.madder, 'bharni-earth': PAL.brown, kachni: PAL.terracotta };

const cache = new Map();
export function clearBackdropCache() { cache.clear(); nearCache.clear(); }

function paintGround(ctx, def, x0, o, seed) {
  const c = o.night ? PAL.nightLine : PAL.black;
  const kind = def.ground;
  if (kind === 'none') return;
  const second = o.night ? PAL.nightLine : STYLE_LINE[o.style] || PAL.madder;
  if (kind === 'sea') {
    if (o.colour) { ctx.fillStyle = PAL.river; ctx.globalAlpha = 0.35; ctx.fillRect(0, GROUND - 60, CHUNK, 720 - GROUND + 60); ctx.globalAlpha = 1; }
    M.waves(ctx, 0, CHUNK, GROUND - 50, 720, { colour: o.colour, night: o.night, gap: 16, w: 1.2 });
    return;
  }
  const band = rectPts(-4, GROUND, CHUNK + 8, 720 - GROUND + 4);
  if (o.colour) {
    ctx.fillStyle = kind === 'floor' ? (def.lanka ? PAL.gold : PAL.ochre) : kind === 'sand' ? PAL.wash : kind === 'rock' ? PAL.stone : kind === 'gold' ? PAL.gold : PAL.leaf;
    ctx.globalAlpha = kind === 'floor' || kind === 'gold' ? 0.5 : 0.55; ctx.fillRect(0, GROUND, CHUNK, 720 - GROUND); ctx.globalAlpha = 1;
  }
  if (kind === 'cracked' && !o.colour) {
    for (let i = 0; i < 16; i++) {
      const gx = Math.floor(x0 / 64) * 64 - x0 + i * 64 + 64;
      const k = Math.floor((x0 + gx) / 64);
      line(ctx, [[gx, GROUND + 6], [gx + noise(seed, k) * 18, GROUND + 40], [gx + noise(seed, k + 9) * 26, GROUND + 90], [gx + noise(seed, k + 5) * 20, GROUND + 150]], { w: 1.1, color: c, seed: k, amp: 1.2 });
      line(ctx, [[gx + noise(seed, k) * 18, GROUND + 40], [gx + 34, GROUND + 58]], { w: 0.9, color: second, seed: k + 1, amp: 1 });
    }
  } else if (kind === 'floor' || kind === 'gold') {
    for (let gx = -((x0 % 60) + 60) % 60; gx < CHUNK; gx += 60) {
      const k = Math.round((x0 + gx) / 60);
      if (k % 2 === 0) hatch(ctx, rectPts(gx, GROUND + 30, 60, 46), { color: second, spacing: 7, angle: 0.8, seed: k, w: 0.8 });
      else hatch(ctx, rectPts(gx, GROUND + 76, 60, 46), { color: second, spacing: 7, angle: -0.8, seed: k, w: 0.8 });
    }
    line(ctx, [[0, GROUND + 76], [CHUNK, GROUND + 76]], { w: 1, color: c, seed: 4, amp: 0.4, flat: true });
  } else if (!o.colour) {
    const hp = { color: second, spacing: kind === 'rock' ? 9 : 13, angle: kind === 'sand' ? 0.12 : 0.9, seed: seed + Math.floor(x0 / CHUNK), w: 0.7 };
    if (def.brush) dryHatch(ctx, rectPts(0, GROUND + 34, CHUNK, 720 - GROUND), { ...hp, spacing: 11 });
    else hatch(ctx, rectPts(0, GROUND + 34, CHUNK, 720 - GROUND), hp);
  }
  void band;
  // the ground line and the vine band beneath it (Rule G)
  line(ctx, [[-4, GROUND], [CHUNK + 4, GROUND]], { w: 2.4, color: c, seed: seed + 1, amp: 0.5, flat: true });
  line(ctx, [[-4, GROUND + 30], [CHUNK + 4, GROUND + 30]], { w: 1.2, color: c, seed: seed + 2, amp: 0.5, flat: true });
  ctx.save(); ctx.translate(-x0, 0);
  M.vineBand(ctx, x0 - 10, x0 + CHUNK + 10, GROUND + 15, { colour: o.colour, night: o.night, h: 15, seed: 5 });
  ctx.restore();
}

function paintItem(ctx, kind, x, y, size, k, o, lo) {
  const sd = hashStr(kind) % 1000 + k * 13;
  const oo = { colour: o.colour, night: o.night, seed: sd, lineColor: o.night ? PAL.nightLine : undefined, ...lo };
  const c = o.night ? PAL.nightLine : PAL.black;
  const second = o.night ? PAL.nightLine : STYLE_LINE[o.style] || PAL.madder;
  const vary = 1 + noise(sd, 3) * 0.14;
  switch (kind) {
    case 'tree': M.tree(ctx, x, y, size * vary, lo.kind, oo); break;
    case 'hill': M.hill(ctx, x, y, size * 2.1, size * vary, { ...oo, hatchColor: second }); break;
    case 'peak': { const p = [[x - size * 0.6, y], [x - size * 0.1, y - size * vary], [x + size * 0.1, y - size * 0.8 * vary], [x + size * 0.6, y]]; shape(ctx, p, { mode: o.colour ? 'colour' : 'line', fill: PAL.stone, lineFill: o.night ? PAL.night : PAL.cream, lineColor: c, w: 1.5, seed: sd, amp: 1.2 }); hatch(ctx, p, { color: second, spacing: 11, angle: 1.1, seed: sd, w: 0.8 }); shape(ctx, [[x - size * 0.24, y - size * 0.72 * vary], [x - size * 0.1, y - size * vary], [x + size * 0.1, y - size * 0.8 * vary], [x + size * 0.2, y - size * 0.62 * vary], [x, y - size * 0.7 * vary]], { mode: 'colour', fill: PAL.white, outlineColor: c, w: 1.2, seed: sd + 1, amp: 0.8 }); break; }
    case 'building': M.building(ctx, x, y, size * (lo.tiers === 3 ? 0.78 : 1.0), size * vary, oo); break;
    case 'hut': M.hut(ctx, x, y, size * 1.2, size * vary, oo); break;
    case 'pillar': M.pillar(ctx, x, y, 34, size, oo); break;
    case 'arch': { const w = 250; line(ctx, [[x + 17, y - size + 22], [x + w - 17, y - size + 22]], { w: 1.4, color: c, seed: sd, amp: 0.5 }); for (let i = 0; i < 8; i++) { const bx = x + 30 + i * ((w - 60) / 7); shape(ctx, [[bx - 12, y - size + 22], [bx, y - size + 44], [bx + 12, y - size + 22]], { mode: o.colour ? 'colour' : 'line', fill: i % 2 ? PAL.turmeric : PAL.madder, lineColor: second, w: 1, seed: sd + i, amp: 0.4 }); } break; }
    case 'curtain': { const p = [[x - 60, y - size + 10], [x + 60, y - size + 10], [x + 48, y - 40], [x - 48, y - 40]]; shape(ctx, p, { mode: o.colour ? 'colour' : 'line', fill: PAL.madder, lineFill: PAL.cream, lineColor: c, w: 1.3, seed: sd, amp: 0.8 }); hatch(ctx, p, { color: second, spacing: 9, angle: 1.57, seed: sd, w: 0.8 }); break; }
    case 'lampStand': { line(ctx, [[x, y], [x, y - size]], { w: 1.6, color: c, seed: sd, amp: 0.5 }); M.diya(ctx, x - 4, y - size - 4, 9, o.colour || o.night, 0, { ...oo }); break; }
    case 'post': { line(ctx, [[x, y], [x + noise(sd, 1) * 10, y - size * vary]], { w: 2, color: c, seed: sd, amp: 1 }); line(ctx, [[x - 14, y - size * 0.7], [x + 22, y - size * 0.76]], { w: 1.4, color: second, seed: sd + 1, amp: 1 }); break; }
    case 'bones': { for (let i = 0; i < 3; i++) line(ctx, [[x + i * 9, y + 8 + i * 3], [x + i * 9 + 12, y + 4 + i * 3]], { w: 1.6, color: o.night ? PAL.nightLine : PAL.white, seed: sd + i, amp: 0.4 }); line(ctx, [[x - 2, y + 6], [x + 34, y + 12]], { w: 0.8, color: c, seed: sd, amp: 0.6 }); break; }
    case 'rock': M.rock(ctx, x, y, size * 1.5 * vary, size, oo); break;
    case 'bush': { for (let i = -1; i <= 1; i++) shape(ctx, ellipsePts(x + i * size * 0.5, y - size * 0.4, size * 0.42, size * 0.46, 8), { mode: o.colour ? 'colour' : 'line', fill: PAL.green, lineFill: o.night ? PAL.night : PAL.cream, lineColor: c, w: 1.1, seed: sd + i, smooth: true, amp: 0.8 }); dots(ctx, x, y - size * 0.5, size * 0.5, 5, o.colour ? PAL.pink : second, sd, 1.8); break; }
    case 'anthill': shape(ctx, [[x - size * 0.5, y], [x - size * 0.2, y - size * 0.8], [x, y - size * 1.2], [x + size * 0.24, y - size * 0.7], [x + size * 0.5, y]], { mode: o.colour ? 'colour' : 'line', fill: PAL.earth, lineFill: PAL.cream, lineColor: c, w: 1.2, seed: sd, amp: 1 }); break;
    case 'pond': { shape(ctx, ellipsePts(x, y + 60, size * 1.6, 22, 12), { mode: o.colour ? 'colour' : 'line', fill: PAL.river, lineFill: PAL.cream, lineColor: c, w: 1.2, seed: sd, smooth: true, amp: 0.8 }); for (let i = -1; i <= 1; i++) M.lotusBud(ctx, x + i * size * 0.7, y + 58, 11, { colour: o.colour, seed: sd + i, lineColor: c }); break; }
    case 'cave': { const p = [[x - size * 0.5, y], [x - size * 0.4, y - size * 0.7], [x, y - size], [x + size * 0.4, y - size * 0.7], [x + size * 0.5, y]]; shape(ctx, p, { mode: 'colour', fill: PAL.black, w: 1.5, seed: sd, smooth: true, amp: 1 }); break; }
    case 'stalactite': shape(ctx, [[x - size * 0.2, 40], [x, 40 + size * vary], [x + size * 0.2, 40]], { mode: o.colour ? 'colour' : 'line', fill: PAL.stone, lineFill: PAL.night, lineColor: c, w: 1.2, seed: sd, amp: 0.8 }); break;
    case 'cloud': M.cloud(ctx, x, GROUND + y, size * vary, { ...oo, hatch: o.style === 'bharni-bright' ? 0 : 9 }); break;
    case 'herb': { line(ctx, [[x, y], [x + noise(sd, 1) * 5, y - size]], { w: 1.1, color: o.colour ? PAL.leaf : c, seed: sd, amp: 0.5 }); dots(ctx, x + noise(sd, 1) * 5, y - size, 4, 4, o.colour ? PAL.turmeric : c, sd, 1.8); break; }
    case 'wall': { for (let gx = x; gx < x + CHUNK; gx += 46) shape(ctx, rectPts(gx, y - size, 40, size), { mode: 'line', lineColor: second, w: 1, seed: sd + gx, amp: 0.5 }); break; }
    case 'bannerPole': { line(ctx, [[x, y], [x, y - size * vary]], { w: 1.6, color: c, seed: sd, amp: 0.6 }); shape(ctx, [[x, y - size * vary], [x + 40, y - size * vary + 12], [x, y - size * vary + 26]], { mode: o.colour ? 'colour' : 'line', fill: k % 2 ? PAL.saffron : PAL.gold, lineFill: PAL.cream, lineColor: c, w: 1.2, seed: sd + 1, amp: 0.6 }); break; }
    case 'tent': { const p = [[x - size * 0.7, y], [x, y - size], [x + size * 0.7, y]]; shape(ctx, p, { mode: o.colour ? 'colour' : 'line', fill: PAL.ochre, lineFill: PAL.cream, lineColor: c, w: 1.4, seed: sd, amp: 0.8 }); hatch(ctx, p, { color: second, spacing: 10, angle: 1.57, seed: sd, w: 0.8 }); break; }
    default: break;
  }
}

// A brushed wash: three or four translucent passes, each with a dry, uneven top and
// bottom edge, so the colour sits on the paper unevenly the way a brush leaves it.
function seedOf(x0) { return Math.floor(x0 / CHUNK) * 13 + 7; }
function brushWash(ctx, x0, top, h, colour, seed) {
  ctx.save();
  for (let pass = 0; pass < 3; pass++) {
    const dy = pass * 4 - 4;
    ctx.globalAlpha = 0.16 + pass * 0.03;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, top + dy);
    for (let x = 0; x <= CHUNK; x += 32) ctx.lineTo(x, top + dy + noise(seed + pass, Math.round(x / 32)) * 3);
    for (let x = CHUNK; x >= 0; x -= 32) ctx.lineTo(x, top + h + dy * 0.5 + noise(seed + 9 + pass, Math.round(x / 32)) * 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintBand(ctx, def, x0, o) {
  if (!def.band) return;
  const y0 = GROUND - (def.band === 'sea' ? 70 : 46), y1 = GROUND - 8;
  if (o.colour && def.brush) brushWash(ctx, x0, y0 - 8, y1 - y0 + 12, PAL.river, seedOf(x0));
  else if (o.colour) { ctx.fillStyle = PAL.river; ctx.globalAlpha = 0.4; ctx.fillRect(0, y0 - 8, CHUNK, y1 - y0 + 12); ctx.globalAlpha = 1; }
  ctx.save(); ctx.translate(-x0, 0);
  M.waves(ctx, x0, x0 + CHUNK, y0, y1, { colour: o.colour, night: o.night, gap: 13, w: 1.1 });
  if (def.band === 'lake') for (let x = Math.floor(x0 / 150) * 150; x < x0 + CHUNK + 150; x += 150) M.lotusBud(ctx, x + 40, y1 - 6, 13, { colour: o.colour, seed: x | 0, lineColor: o.night ? PAL.nightLine : PAL.black });
  ctx.restore();
}

// The Madhubani fill: not bigger tree-blobs, but fine repeated motifs — small leaves, little flowers,
// birds and fish — packed into the negative space, the way Mithila murals leave almost no space empty.
const DENSITY = {
  full: { sky: 0.32, skyScale: 1.25, filler: 4.4, tree: 1.12, far: 0.64, canopy: 1 },
  moderate: { sky: 0.18, skyScale: 1.3, filler: 2.8, tree: 1.06, far: 0.5, canopy: 0.6 },
};

// Shared Mithila foliage marks: a small almond leaf and a little round flower, drawn many times over.
function mLeaf(ctx, x, y, a, colour, night, sd) {
  const cc = night ? PAL.nightLine : PAL.black, lf = night ? PAL.night : PAL.cream;
  const dx = Math.cos(a) * 6.5, dy = Math.sin(a) * 6.5;
  shape(ctx, [[x, y], [x + dx * 0.5 - dy * 0.3, y + dy * 0.5 + dx * 0.3], [x + dx, y + dy], [x + dx * 0.5 + dy * 0.3, y + dy * 0.5 - dx * 0.3]], { mode: colour ? 'colour' : 'line', fill: colour ? PAL.leaf : cc, lineColor: cc, lineFill: lf, w: 0.9, seed: sd, smooth: true, amp: 0.3 });
}
function mFlower(ctx, x, y, colour, night, sd) {
  const cc = night ? PAL.nightLine : PAL.black;
  dots(ctx, x, y, 5, 5, colour ? (sd % 2 ? PAL.kusum : PAL.turmeric) : cc, sd, 2.3);
  dots(ctx, x, y, 0, 1, colour ? PAL.gold : cc, 1, 1.8);
}

/** A flowering bough: a brown branch hung with many small leaves and little flowers. */
function paintCanopy(ctx, def, colour, seed, strength) {
  const brown = colour ? PAL.brown : (def.night ? PAL.nightLine : PAL.black), night = !!def.night;
  ctx.save(); ctx.globalAlpha *= strength;
  for (let bx = -30; bx < CHUNK + 90; bx += 156) {
    const by = 24 + noise(seed + 70, bx) * 14;
    line(ctx, [[bx - 50, by + 2], [bx + 40, by + 10], [bx + 120, by], [bx + 200, by + 12]], { w: 3.6, color: brown, smooth: true, seed: bx, amp: 0.5 });
    for (let t = 0; t < 12; t++) {
      const px = bx - 40 + t * 20 + noise(seed + 71, bx + t) * 7, hang = 18 + ((noise(seed + 72, bx + t) + 1) / 2) * 62, py = by + 8 + hang;
      line(ctx, [[px - 4, by + 7], [px, py]], { w: 1, color: brown, seed: t, amp: 0.4 });
      for (let l = 0; l < 4; l++) mLeaf(ctx, px, py - l * 12, 1.1 + (l % 2) * 1.6 + (t % 2) * 3.14, colour, night, seed + t * 7 + l);
      if (t % 2 === 0) mFlower(ctx, px, py + 2, colour, night, seed + t);
    }
  }
  ctx.restore();
}

/** A Mithila tree: a trunk and a rounded crown packed with small leaves and flowers (no flat blob). */
function paintMithilaTree(ctx, x, y, h, colour, night, seed) {
  const cc = night ? PAL.nightLine : PAL.black, brown = colour ? PAL.brown : cc, lf = night ? PAL.night : PAL.cream;
  const tw = Math.max(7, h * 0.05);
  shape(ctx, [[x - tw, y], [x - tw * 0.7, y - h * 0.52], [x + tw * 0.7, y - h * 0.52], [x + tw, y]], { mode: colour ? 'colour' : 'line', fill: brown, lineColor: cc, lineFill: lf, w: 1.2, seed, amp: 0.4 });
  const cy = y - h * 0.62, R = h * 0.34;
  for (const a of [-0.7, -0.24, 0.24, 0.7]) line(ctx, [[x, cy + R * 0.5], [x + Math.sin(a) * R * 0.85, cy - Math.cos(a) * R * 0.5]], { w: tw * 0.45, color: brown, seed: seed + Math.round(a * 10), amp: 0.4 });
  const crown = ellipsePts(x, cy, R, R * 0.94, 13);
  shape(ctx, crown, { mode: colour ? 'colour' : 'line', fill: colour ? PAL.cream : null, lineColor: cc, lineFill: lf, w: 1.5, seed: seed + 1, smooth: true, amp: 0.7 });
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, cy, R - 2, R * 0.94 - 2, 0, 0, 7); ctx.clip();
  let n = 0;
  for (let ly = -R; ly < R; ly += 12) for (let lx = -R; lx < R; lx += 12) {
    const px = x + lx + noise(seed + 2, n) * 6, py = cy + ly + noise(seed + 3, n) * 6;
    mLeaf(ctx, px, py, n * 1.37, colour, night, seed + n);
    if (n % 3 === 0) mFlower(ctx, px, py, colour, night, seed + n * 2);
    n++;
  }
  ctx.restore();
}

function paintChunk(id, style, colour, index, regrow, density = '') {
  const def = BACKDROPS[id] || BACKDROPS.road;
  const dp = DENSITY[density] || null;
  const s = Math.min(1, Math.max(0.5, app.scale));
  const cv = makeCanvas(CHUNK * s, 720 * s);
  const ctx = cv.getContext('2d');
  ctx.scale(s, s);
  const x0 = index * CHUNK;
  const seed = hashStr(id) + index * 31;
  const o = { colour, night: !!def.night, style, far: dp ? dp.far : null, tree: dp ? dp.tree : 1 };
  // the wall itself: a mottled wash that differs slightly every time
  ctx.fillStyle = def.night ? PAL.night : PAL.cream;
  ctx.fillRect(0, 0, CHUNK, 720);
  const look = lookOf(id);
  setBrushMode(!!def.brush);
  // the sky pattern: faint by default, but a bold kachni tapestry when a density is set
  ctx.save(); ctx.globalAlpha = dp ? (def.night ? dp.sky + 0.06 : dp.sky) : (def.night ? 0.16 : colour ? 0.13 : 0.1);
  ctx.fillStyle = pattern(ctx, look.skyPat || 'dots', null, def.night ? PAL.nightLine : colour ? PAL.terracotta : PAL.brown, dp ? dp.skyScale : 1.5);
  ctx.translate(-(x0 % 64), 0); ctx.fillRect(0, 26, CHUNK + 64, GROUND - 70); ctx.restore();
  if (dp && dp.canopy) paintCanopy(ctx, def, colour, seed, dp.canopy);
  ctx.save(); ctx.translate(-x0, 0);
  M.fillers(ctx, x0, x0 + CHUNK, 60, GROUND - 190, { colour, night: def.night, kinds: def.sky, seed: seed + 3, density: dp ? dp.filler : (def.night ? 2.2 : 1.7) });
  if (!def.night && look.sun !== false && def.ground !== 'floor' && index % 2 !== 0) M.sun(ctx, x0 + 330, 118, 24, { colour, lineFill: PAL.cream });
  if (def.moon && index % 2 === 0) M.moon(ctx, x0 + 760, 130, 34, { night: true });
  ctx.restore();
  paintFar(ctx, def, look, x0, o, seed);
  paintBand(ctx, def, x0, o);
  const skip = new Set(regrow && look.regrow ? look.regrow.map((r) => r[0]) : []);
  for (let li = 0; li < def.layers.length; li++) {
    if (skip.has(li)) continue;
    const [kind, sp, yOff, size, lo] = def.layers[li];
    const off = lo.off || 0;
    const margin = size * 2.4 + 80;
    const k0 = Math.floor((x0 - margin - off) / sp), k1 = Math.ceil((x0 + CHUNK + margin - off) / sp);
    for (let k = k0; k <= k1; k++) {
      const jitter = kind === 'pillar' || kind === 'arch' || kind === 'curtain' || kind === 'wall' ? 0 : noise(hashStr(id) + li * 17, k) * sp * 0.22;
      const x = k * sp + off + jitter - x0;
      const sz = (kind === 'tree' || kind === 'hill') ? size * (o.tree || 1) : size;
      paintItem(ctx, kind, x, GROUND + (kind === 'cloud' ? yOff : yOff), sz, k, o, lo);
    }
  }
  paintExtras(ctx, look, x0, o, seed);
  paintGround(ctx, def, x0, o, seed);
  setBrushMode(false);
  return cv;
}

export function backdropChunk(id, style, colour, index, regrow = false, density = '') {
  const key = `${id}|${style}|${colour ? 1 : 0}|${index}|${regrow ? 1 : 0}|${density}`;
  let c = cache.get(key);
  if (!c) { c = paintChunk(id, style, colour, index, regrow, density); cache.set(key, c); if (cache.size > 16) cache.delete(cache.keys().next().value); }
  return c;
}

/**
 * Draw the plane for a view starting at camX, W units wide (world units).
 * heal: { x, r } paints colour inside [x - r, x + r] in world units.
 * colour: true paints the whole plane in colour.
 */
export function drawBackdrop(ctx, id, style, camX, W, o = {}) {
  const i0 = Math.floor(camX / CHUNK), i1 = Math.floor((camX + W) / CHUNK);
  for (let i = i0; i <= i1; i++) {
    const dx = i * CHUNK - camX;
    ctx.drawImage(backdropChunk(id, style, !!o.colour, i, !!o.regrow, o.density), dx, 0, CHUNK + 0.5, 720);
    if (o.heal && !o.colour) {
      const a = Math.max(o.heal.x - o.heal.r, i * CHUNK), b = Math.min(o.heal.x + o.heal.r, (i + 1) * CHUNK);
      if (b > a) {
        ctx.save(); ctx.beginPath(); ctx.rect(a - camX, 0, b - a, 720); ctx.clip();
        ctx.drawImage(backdropChunk(id, style, true, i, !!o.regrow, o.density), dx, 0, CHUNK + 0.5, 720);
        ctx.restore();
      }
    }
  }
}

export function isNight(id) { return !!(BACKDROPS[id] && BACKDROPS[id].night); }
