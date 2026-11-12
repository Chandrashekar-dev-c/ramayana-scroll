// Backdrops: one flat painted plane. The world is kachni (thin line and hatching over an
// unpainted, mottled ground). When a place is freed or a chapter finished, the same plane
// is painted again in bharni and the line world fills with colour.
// Static planes are painted once into chunks and reused every frame.
import { app, makeCanvas } from '../core/app.js';
import { noise, hashStr } from '../core/rng.js';
import { PAL } from './palette.js';
import { line, shape, hatch, rectPts, ellipsePts, dots } from './ink.js';
import * as M from './motifs.js';
import { GROUND } from './layout.js';

export const CHUNK = 1024;

// layer: [kind, spacing, y offset from ground, size, options]
const T = (kind, sp, size, o = {}) => ['tree', sp, 0, size, { kind, ...o }];
export const BACKDROPS = {
  court: { ground: 'floor', sky: ['flower', 'dots'], layers: [['pillar', 250, 0, 330, {}], ['arch', 250, 0, 330, {}], ['lampStand', 500, 0, 90, { off: 125 }]] },
  chamber: { ground: 'floor', sky: ['dots'], layers: [['pillar', 330, 0, 300, { fill: PAL.madder }], ['curtain', 330, 0, 300, { off: 165 }]] },
  kingRoom: { ground: 'floor', night: true, sky: ['star'], moon: true, layers: [['pillar', 360, 0, 310, {}], ['lampStand', 180, 0, 100, { off: 60 }]] },
  city: { ground: 'earth', sky: ['bird', 'flower', 'dots'], layers: [['building', 300, 0, 250, { banner: true, tiers: 3 }], ['building', 300, 0, 150, { off: 150, tiers: 2 }], T('mango', 420, 150, { off: 60 })] },
  mithila: { ground: 'earth', sky: ['fish', 'bird', 'flower'], layers: [['building', 340, 0, 240, { banner: true, tiers: 3, fill: PAL.pink }], T('bamboo', 340, 170, { off: 170 }), ['pond', 680, 0, 60, { off: 250 }]] },
  riverbank: { ground: 'earth', sky: ['bird', 'fish', 'flower'], band: 'river', layers: [T('mango', 310, 210), T('palm', 470, 260, { off: 130 }), ['bush', 180, 0, 34, { off: 40 }]] },
  road: { ground: 'earth', sky: ['bird', 'dots', 'flower'], layers: [['hill', 520, 0, 150, {}], T('banyan', 380, 240, { off: 90 }), T('sala', 300, 170, { off: 200 })] },
  waste: { ground: 'cracked', sky: ['dots'], layers: [T('bare', 260, 190), ['post', 340, 0, 110, { off: 120 }], ['bones', 300, 0, 16, { off: 60 }], ['rock', 560, 0, 60, { off: 280 }]] },
  ashram: { ground: 'earth', sky: ['bird', 'flower', 'dots'], layers: [['hut', 520, 0, 150, {}], T('banyan', 400, 260, { off: 240 }), T('sala', 300, 180, { off: 100 }), ['bush', 200, 0, 30, { off: 30 }]] },
  hermitage: { ground: 'earth', sky: ['dots', 'flower'], layers: [['hut', 700, 0, 160, { off: 320 }], T('ashoka', 330, 220), T('bare', 500, 170, { off: 160 })] },
  forest: { ground: 'earth', sky: ['bird', 'leaf', 'dots'], layers: [T('sala', 170, 300), T('banyan', 330, 270, { off: 80 }), ['bush', 150, 0, 36, { off: 30 }], ['anthill', 620, 0, 50, { off: 300 }]] },
  deepForest: { ground: 'earth', sky: ['leaf', 'dots'], layers: [T('sala', 130, 340), T('banyan', 260, 300, { off: 60 }), T('bamboo', 340, 240, { off: 170 }), ['bush', 120, 0, 40, { off: 30 }]] },
  panchavati: { ground: 'earth', sky: ['bird', 'flower', 'leaf'], band: 'river', layers: [T('banyan', 420, 280), T('ashoka', 300, 210, { off: 150 }), ['bush', 170, 0, 34, { off: 40 }]] },
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

const STYLE_LINE = { 'bharni-bright': PAL.madder, 'bharni-earth': PAL.brown, kachni: PAL.terracotta };

const cache = new Map();
export function clearBackdropCache() { cache.clear(); }

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
    ctx.globalAlpha = kind === 'floor' || kind === 'gold' ? 0.55 : 0.8; ctx.fillRect(0, GROUND, CHUNK, 720 - GROUND); ctx.globalAlpha = 1;
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
    hatch(ctx, rectPts(0, GROUND + 34, CHUNK, 720 - GROUND), { color: second, spacing: kind === 'rock' ? 9 : 13, angle: kind === 'sand' ? 0.12 : 0.9, seed: seed + Math.floor(x0 / CHUNK), w: 0.7 });
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

function paintBand(ctx, def, x0, o) {
  if (!def.band) return;
  const y0 = GROUND - (def.band === 'sea' ? 70 : 46), y1 = GROUND - 8;
  if (o.colour) { ctx.fillStyle = PAL.river; ctx.globalAlpha = 0.4; ctx.fillRect(0, y0 - 8, CHUNK, y1 - y0 + 12); ctx.globalAlpha = 1; }
  ctx.save(); ctx.translate(-x0, 0);
  M.waves(ctx, x0, x0 + CHUNK, y0, y1, { colour: o.colour, night: o.night, gap: 13, w: 1.1 });
  if (def.band === 'lake') for (let x = Math.floor(x0 / 150) * 150; x < x0 + CHUNK + 150; x += 150) M.lotusBud(ctx, x + 40, y1 - 6, 13, { colour: o.colour, seed: x | 0, lineColor: o.night ? PAL.nightLine : PAL.black });
  ctx.restore();
}

function paintChunk(id, style, colour, index) {
  const def = BACKDROPS[id] || BACKDROPS.road;
  const s = Math.min(1, Math.max(0.5, app.scale));
  const cv = makeCanvas(CHUNK * s, 720 * s);
  const ctx = cv.getContext('2d');
  ctx.scale(s, s);
  const x0 = index * CHUNK;
  const seed = hashStr(id) + index * 31;
  const o = { colour, night: !!def.night, style };
  // the wall itself: a mottled wash that differs slightly every time
  ctx.fillStyle = def.night ? PAL.night : PAL.cream;
  ctx.fillRect(0, 0, CHUNK, 720);
  if (!def.night) {
    for (let i = 0; i < 26; i++) {
      const bx = ((noise(seed, i * 2) + 1) / 2) * CHUNK, by = ((noise(seed, i * 2 + 1) + 1) / 2) * 720;
      ctx.globalAlpha = 0.16 + ((noise(seed, i + 77) + 1) / 2) * 0.16;
      ctx.fillStyle = i % 3 ? PAL.wash : PAL.washDark;
      ctx.beginPath(); ctx.ellipse(bx, by, 60 + (i % 5) * 34, 30 + (i % 4) * 20, noise(seed, i) * 1.5, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(-x0, 0);
  M.fillers(ctx, x0, x0 + CHUNK, 60, GROUND - 190, { colour, night: def.night, kinds: def.sky, seed: seed + 3, density: def.night ? 2.2 : 1 });
  if (def.moon && index % 2 === 0) M.moon(ctx, x0 + 760, 130, 34, { night: true });
  ctx.restore();
  paintBand(ctx, def, x0, o);
  for (let li = 0; li < def.layers.length; li++) {
    const [kind, sp, yOff, size, lo] = def.layers[li];
    const off = lo.off || 0;
    const margin = size * 2.4 + 80;
    const k0 = Math.floor((x0 - margin - off) / sp), k1 = Math.ceil((x0 + CHUNK + margin - off) / sp);
    for (let k = k0; k <= k1; k++) {
      const jitter = kind === 'pillar' || kind === 'arch' || kind === 'curtain' || kind === 'wall' ? 0 : noise(hashStr(id) + li * 17, k) * sp * 0.22;
      const x = k * sp + off + jitter - x0;
      paintItem(ctx, kind, x, GROUND + (kind === 'cloud' ? yOff : yOff), size, k, o, lo);
    }
  }
  paintGround(ctx, def, x0, o, seed);
  return cv;
}

export function backdropChunk(id, style, colour, index) {
  const key = `${id}|${style}|${colour ? 1 : 0}|${index}`;
  let c = cache.get(key);
  if (!c) { c = paintChunk(id, style, colour, index); cache.set(key, c); if (cache.size > 14) cache.delete(cache.keys().next().value); }
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
    ctx.drawImage(backdropChunk(id, style, !!o.colour, i), dx, 0, CHUNK + 0.5, 720);
    if (o.heal && !o.colour) {
      const a = Math.max(o.heal.x - o.heal.r, i * CHUNK), b = Math.min(o.heal.x + o.heal.r, (i + 1) * CHUNK);
      if (b > a) {
        ctx.save(); ctx.beginPath(); ctx.rect(a - camX, 0, b - a, 720); ctx.clip();
        ctx.drawImage(backdropChunk(id, style, true, i), dx, 0, CHUNK + 0.5, 720);
        ctx.restore();
      }
    }
  }
}

export function isNight(id) { return !!(BACKDROPS[id] && BACKDROPS[id].night); }
