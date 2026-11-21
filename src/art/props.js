// Larger painted things: props for scenes, vehicles, and creatures that are not figures.
import { shape, line, hatch, ellipsePts, rectPts, dots } from './ink.js';
import { PAL } from './palette.js';
import { pattern } from './patterns.js';
import * as M from './motifs.js';
import { app, makeCanvas } from '../core/app.js';

const TAU = Math.PI * 2;

// Heavy props that never move are painted once into a sprite (their wobbly ink lines cost a lot to
// redraw every frame). Bounds are in prop units around the base centre: [x0, y0, x1, y1].
const STATIC = { shimshapa: [-300, -500, 300, 40], hut: [-190, -270, 190, 40], salaRow: [-220, -440, 780, 40] };
const sprites = new Map();
function cachedProp(ctx, name, x, y, o) {
  const [x0, y0, x1, y1] = STATIC[name];
  const s = Math.max(0.5, Math.min(2, app.scale || 1));
  const key = `${name}|${o.colour === false ? 0 : 1}|${o.night ? 1 : 0}|${s.toFixed(2)}`;
  let cv = sprites.get(key);
  if (!cv) {
    cv = makeCanvas((x1 - x0) * s, (y1 - y0) * s);
    const c = cv.getContext('2d'); c.scale(s, s); c.translate(-x0, -y0);
    drawProp(c, name, 0, 0, { colour: o.colour, night: o.night, raw: true });
    sprites.set(key, cv); if (sprites.size > 24) sprites.delete(sprites.keys().next().value);
  }
  const k = o.scale || 1;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale((o.dir === -1 ? -1 : 1) * k, k);
  ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/** o: { colour, t, state, night, dir, scale } — origin is the base centre of the prop. */
export function drawProp(ctx, name, x, y, o = {}) {
  if (STATIC[name] && !o.raw && typeof document !== 'undefined') { cachedProp(ctx, name, x, y, o); return; }
  const m = o.colour === false ? 'line' : 'colour';
  const c = o.night ? PAL.nightLine : PAL.black;
  const lf = o.night ? PAL.night : PAL.cream;
  const t = o.t || 0;
  const S = (pts, opt = {}) => shape(ctx, pts, { mode: m, lineFill: lf, lineColor: c, w: 1.6, seed: pts.length + (opt.seed || 0), amp: 0.8, ...opt });
  const L = (pts, opt = {}) => line(ctx, pts, { w: 1.4, color: c, seed: 3, amp: 0.6, ...opt });
  const P = (n, fg) => (m === 'colour' ? pattern(ctx, n, null, fg, 1.2) : null);
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale((o.dir === -1 ? -1 : 1) * (o.scale || 1), o.scale || 1);
  switch (name) {
    case 'throne': {
      S(rectPts(-60, -210, 120, 210), { fill: o.lanka ? PAL.gold : PAL.madder, pattern: P('royalChecks', PAL.gold), gap: PAL.gold });
      S([[-74, -210], [0, -262], [74, -210]], { fill: PAL.gold, gap: PAL.madder });
      S(rectPts(-78, -84, 156, 26), { fill: PAL.gold, gap: PAL.madder });
      S(rectPts(-86, -22, 172, 22), { fill: PAL.gold });
      M.lotusBud(ctx, 0, -214, 16, { colour: m === 'colour', lineColor: c });
      break;
    }
    case 'bed': {
      S(rectPts(-120, -44, 240, 18), { fill: PAL.madder, pattern: P('zigzag', PAL.turmeric), gap: PAL.turmeric });
      for (const lx of [-112, 112]) L([[lx, -26], [lx, 0]], { w: 3 });
      S([[-120, -44], [-128, -84], [-96, -84], [-90, -44]], { fill: PAL.turmeric });
      break;
    }
    case 'grassBed': { for (let i = -6; i <= 6; i++) L([[i * 16, 0], [i * 16 + 8, -12 - (i % 3) * 4]], { color: m === 'colour' ? PAL.leaf : c, w: 1.6, seed: i }); break; }
    case 'altar': {
      S([[-56, 0], [-44, -30], [44, -30], [56, 0]], { fill: PAL.terracotta, pattern: P('triangles', PAL.turmeric), gap: PAL.turmeric });
      S(rectPts(-36, -42, 72, 12), { fill: PAL.terracotta });
      const lit = o.state == null ? 1 : o.state;
      if (lit > 0.02) M.flame(ctx, 0, -42, 30 + 46 * lit, { t, seed: 3 });
      break;
    }
    case 'pyre': {
      for (let i = 0; i < 3; i++) S(rectPts(-70 + i * 6, -16 - i * 14, 140 - i * 12, 12), { fill: PAL.brown, seed: i });
      if (o.state) M.flame(ctx, 0, -46, 60 * o.state + 20, { t, seed: 4, tongues: 5 });
      break;
    }
    case 'bowCart': {
      // a long iron chest on eight wheels, carrying a great curved bow: clearly a bow
      S(rectPts(-190, -62, 380, 34), { fill: PAL.iron, pattern: P('stoneBlocks', PAL.black), gap: PAL.gold });
      for (let i = 0; i < 8; i++) { const wx = -168 + i * 48; S(ellipsePts(wx, -16, 16, 16, 10), { fill: PAL.brown, smooth: true, seed: i }); L([[wx - 12, -16], [wx + 12, -16]], { w: 1, seed: i }); L([[wx, -28], [wx, -4]], { w: 1, seed: i }); }
      // Pinaka, Shiva's bow: a long recurved bow with a wrapped grip, lying on the chest.
      // o.lift (0..1) raises it upright; o.state 1 draws it broken in two.
      const k = o.lift || 0;
      const limb = (sign) => {
        const top = [], bot = [];
        for (let i = 0; i <= 14; i++) {
          const u = i / 14, x = sign * u * 196;
          const y = 34 * (1 - u * u) - (u > 0.86 ? (u - 0.86) * 120 : 0);
          const w = 10 * (1 - 0.65 * u) + 1.5;
          top.push([x, y - w]); bot.push([x, y + w]);
        }
        return top.concat(bot.reverse());
      };
      const drawBow = (broken) => {
        if (!broken) L([[-196, -16.8], [196, -16.8]], { w: 1.6, flat: true });
        for (const sg of [-1, 1]) {
          ctx.save();
          if (broken) { ctx.translate(sg * 14, 30); ctx.rotate(sg * 0.32); }
          S(limb(sg), { fill: PAL.brown, gap: PAL.gold, smooth: false, seed: sg + 7 });
          if (m === 'colour') for (let i = 1; i < 5; i++) dots(ctx, sg * i * 38, 34 * (1 - (i / 5) ** 2), 0, 1, PAL.turmeric, 1, 3.2);
          if (broken) L([[sg * 2, 22], [sg * 8, 30], [sg * 1, 36], [sg * 7, 44]], { w: 2 });
          ctx.restore();
        }
        if (!broken) { S(rectPts(-16, 20, 32, 28), { fill: PAL.gold, gap: PAL.madder, seed: 9 }); for (let i = -1; i <= 1; i++) L([[i * 9, 20], [i * 9, 48]], { w: 1.4, color: m === 'colour' ? PAL.madder : c, flat: true }); }
      };
      ctx.save();
      ctx.translate(0, -100 - k * 150); ctx.rotate(-k * Math.PI / 2);
      drawBow(o.state >= 1);
      ctx.restore();
      break;
    }
    case 'boat': {
      S([[-150, -30], [-100, 8], [100, 8], [150, -30], [128, -34], [96, -12], [-96, -12], [-128, -34]], { fill: PAL.brown, pattern: P('fishScale', PAL.turmeric), gap: PAL.turmeric, smooth: false });
      S([[150, -30], [176, -58], [158, -62]], { fill: PAL.turmeric });
      M.fish(ctx, 0, -2, 14, { colour: m === 'colour', fill: PAL.turmeric, lineColor: c });
      break;
    }
    case 'chariot': case 'indraChariot': case 'kharaChariot': {
      const gold = name === 'indraChariot';
      const body = gold ? PAL.turmeric : name === 'kharaChariot' ? PAL.rakshasa : PAL.madder;
      if (!o.broken) {
        S([[-70, -40], [-76, -110], [-30, -120], [50, -64], [64, -40]], { fill: body, pattern: P(gold ? 'sunRays' : 'zigzag', gold ? PAL.madder : PAL.gold), gap: PAL.gold });
        L([[-52, -118], [-52, -214]], { w: 2 }); S([[-52, -214], [0, -198], [-52, -182]], { fill: gold ? PAL.madder : PAL.saffron });
      }
      for (const wx of [-30]) { S(ellipsePts(wx, -30, 30, 30, 12), { fill: PAL.brown, smooth: true }); for (let i = 0; i < 4; i++) { const a = i * 0.785 + (o.spin || 0); L([[wx - Math.cos(a) * 26, -30 - Math.sin(a) * 26], [wx + Math.cos(a) * 26, -30 + Math.sin(a) * 26]], { w: 1, seed: i }); } }
      // the draught animal: horse, or Khara's donkeys
      const ax = 130;
      S([[ax - 50, -86], [ax + 30, -90], [ax + 44, -60], [ax + 34, -52], [ax - 46, -50]], { fill: name === 'kharaChariot' ? PAL.grey : PAL.white, pattern: P('dots', name === 'kharaChariot' ? PAL.black : PAL.madder), smooth: true });
      S([[ax + 22, -88], [ax + 46, -132], [ax + 76, -122], [ax + 82, -104], [ax + 56, -100], [ax + 42, -70]], { fill: name === 'kharaChariot' ? PAL.grey : PAL.white, smooth: true });
      if (name === 'kharaChariot') S([[ax + 44, -130], [ax + 40, -166], [ax + 56, -134]], { fill: PAL.grey });
      else S([[ax + 44, -130], [ax + 48, -148], [ax + 56, -132]], { fill: PAL.white });
      ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(ax + 62, -116, 2.6, 0, TAU); ctx.fill();
      const ph = Math.sin(t * 10) * 10 * (o.moving ? 1 : 0);
      for (const [lx, d] of [[ax - 36, 1], [ax - 18, -1], [ax + 18, 1], [ax + 32, -1]]) L([[lx, -52], [lx + ph * d, -26], [lx + ph * d * 0.4, 0]], { w: 3, seed: lx | 0 });
      L([[60, -52], [ax - 46, -66]], { w: 1.6 });
      break;
    }
    case 'pushpaka': {
      // The flying palace: a gold swan-boat with upturned ends, an open canopy on four pillars,
      // a lotus seat, pennants, and clouds underneath. It floats gently.
      const bob = Math.sin(t * 2) * 3;
      ctx.save(); ctx.translate(0, bob);
      for (let i = -1; i <= 1; i++) M.cloud(ctx, i * 96, 34 + Math.abs(i) * 4, 84, { hatch: o.thin ? 10 : 5, seed: i + 9 });
      // the hull curls up at both ends
      S([[-164, -62], [-120, -40], [-60, -34], [0, -32], [60, -34], [120, -40], [164, -62], [140, -44], [112, -20], [0, -8], [-112, -20], [-140, -44]],
        { fill: PAL.gold, pattern: P('peacockEyes', PAL.black), gap: PAL.terracotta, smooth: true });
      // the lotus seat inside the canopy
      S([[-44, -28], [-26, -50], [0, -38], [26, -50], [44, -28], [0, -22]], { fill: PAL.white, pattern: P('featherChevrons', PAL.terracotta), gap: PAL.terracotta, smooth: true, seed: 3 });
      // four pillars and the canopy
      for (const px of [-96, -32, 32, 96]) S(rectPts(px - 5, -150, 10, 120), { fill: PAL.gold, gap: PAL.terracotta });
      S([[-124, -142], [-80, -172], [-30, -184], [30, -184], [80, -172], [124, -142], [96, -150], [0, -168], [-96, -150]],
        { fill: PAL.gold, pattern: P('checks', PAL.terracotta), gap: PAL.black, smooth: true });
      // the finial
      S([[-6, -186], [0, -208], [6, -186]], { fill: PAL.gold });
      ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(0, -210, 3, 0, TAU); ctx.fill();
      // two pennants that flutter from the canopy
      for (const sx of [-1, 1]) {
        const flut = Math.sin(t * 6 + sx) * 7;
        S([[sx * 124, -142], [sx * 166, -154 + flut], [sx * 150, -142], [sx * 166, -130 - flut], [sx * 124, -132]], { fill: PAL.madder, gap: PAL.black, seed: sx + 5 });
      }
      if (o.broken) {
        // Jatayu's claws have torn the palace: splintered canopy, cracks, a shed feather
        L([[-60, -150], [-26, -104], [-52, -58]], { w: 3, color: PAL.black });
        L([[44, -150], [18, -96], [36, -58]], { w: 3, color: PAL.black });
        L([[-96, -128], [-70, -150], [-40, -120]], { w: 3, color: PAL.madder });
        L([[6, -34], [34, -6]], { w: 2.4, color: PAL.black });
        for (const d of [[-70, -40], [70, -40]]) { ctx.save(); ctx.translate(d[0], d[1]); ctx.rotate(0.5); line(ctx, [[0, 0], [26, 3], [40, -4]], { w: 2, color: PAL.kusum, smooth: true }); ctx.restore(); }
      }
      ctx.restore();
      break;
    }
    case 'cloudChariot': {
      for (let i = -2; i <= 2; i++) M.cloud(ctx, i * 40, -10 + Math.abs(i) * 4, 70, { storm: true, hatch: o.thin ? 14 : 6, seed: i + 4 });
      S([[-40, -22], [-46, -70], [0, -80], [36, -40], [44, -22]], { fill: PAL.storm, pattern: P('cloudSpirals', PAL.gold), gap: PAL.gold });
      break;
    }
    case 'deer': {
      // the golden deer with silver spots
      const leg = Math.sin(t * 12) * 8 * (o.moving ? 1 : 0);
      for (const [lx, d] of [[-30, 1], [-18, -1], [22, 1], [34, -1]]) L([[lx, -44], [lx + leg * d, -20], [lx + leg * d * 0.5, 0]], { w: 2.6, seed: lx | 0 });
      S([[-44, -70], [-10, -78], [36, -72], [46, -52], [30, -42], [-36, -42], [-48, -54]], { fill: PAL.gold, pattern: P('deerSpots', PAL.white), smooth: true });
      S([[30, -70], [48, -110], [70, -112], [84, -98], [62, -92], [48, -62]], { fill: PAL.gold, smooth: true });
      for (const sx of [0, 8]) L([[56 + sx, -110], [50 + sx, -134], [62 + sx, -150]], { w: 1.6, seed: sx, smooth: true });
      L([[-46, -62], [-58, -74]], { w: 2 });
      ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(66, -104, 2.4, 0, TAU); ctx.fill();
      break;
    }
    case 'elephant': {
      const leg = Math.sin(t * 8) * 7 * (o.moving ? 1 : 0);
      for (const [lx, d] of [[-56, 1], [-30, -1], [26, 1], [52, -1]]) S(rectPts(lx - 12 + leg * d, -62, 24, 62), { fill: PAL.grey, seed: lx | 0 });
      S([[-84, -100], [-60, -150], [20, -160], [70, -140], [84, -96], [70, -56], [-70, -56]], { fill: PAL.grey, pattern: P('dots', PAL.black), smooth: true });
      S([[50, -150], [96, -168], [124, -140], [120, -104], [96, -96], [70, -110]], { fill: PAL.grey, smooth: true });
      line(ctx, [[112, -110], [124, -70], [116, -30], [128, -14]], { w: 11, color: c, smooth: true, seed: 6 });
      if (m === 'colour') line(ctx, [[112, -110], [124, -70], [116, -30], [128, -14]], { w: 6, color: PAL.grey, smooth: true, seed: 6, flat: true });
      S([[98, -104], [128, -88], [100, -92]], { fill: PAL.white });
      S([[56, -150], [40, -112], [70, -104]], { fill: PAL.grey, seed: 3 });
      S(rectPts(-50, -160, 80, 26), { fill: PAL.madder, pattern: P('zigzag', PAL.gold), gap: PAL.gold });
      ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(102, -138, 3, 0, TAU); ctx.fill();
      break;
    }
    case 'naga': {
      const p = []; const n = 18;
      for (let i = 0; i <= n; i++) p.push([-90 + i * 9, -14 - Math.sin(i * 0.9 + t * 8) * 10 - (i > n - 5 ? (i - n + 5) * 14 : 0)]);
      line(ctx, p, { w: 14, color: c, smooth: true, seed: 2, amp: 0.2, flat: true });
      if (m === 'colour') { line(ctx, p, { w: 9, color: PAL.rakshasaLight, smooth: true, seed: 2, amp: 0.2, flat: true }); line(ctx, p, { w: 2, color: PAL.gold, smooth: true, seed: 2, amp: 0.2, flat: true }); }
      const h = p[n];
      S(ellipsePts(h[0] + 6, h[1] - 4, 20, 16, 9), { fill: PAL.rakshasaLight, pattern: P('fishScale', PAL.gold), smooth: true });
      ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(h[0] + 12, h[1] - 6, 3.4, 0, TAU); ctx.fill();
      L([[h[0] + 24, h[1]], [h[0] + 36, h[1] - 4], [h[0] + 36, h[1] + 4]], { w: 1.2, color: PAL.black });
      break;
    }
    case 'skeleton': {
      S(ellipsePts(0, -40, 110, 40, 14), { fill: PAL.white, pattern: P('stripesV', PAL.grey), smooth: true });
      S(ellipsePts(120, -50, 36, 28, 10), { fill: PAL.white, smooth: true });
      for (const sx of [-1, 1]) L([[120 + sx * 20, -72], [124 + sx * 50, -112], [118 + sx * 60, -90]], { w: 3, smooth: true, seed: sx + 2 });
      break;
    }
    case 'salaRow': {
      const off = o.state || [0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < 7; i++) M.tree(ctx, i * 92, 0, 300, 'sala', { colour: m === 'colour', seed: i + 3 });
      void off; break;
    }
    case 'shimshapa': M.tree(ctx, 0, 0, 360, 'ashoka', { colour: m === 'colour', seed: 7 }); break;
    case 'hut': M.hut(ctx, 0, 0, 220, 190, { colour: m === 'colour', seed: 5, night: o.night }); break;
    case 'door': { S(rectPts(-46, -200, 92, 200), { fill: PAL.brown, gap: PAL.gold }); L([[0, -200], [0, 0]], { w: 1.4 }); break; }
    case 'kohbar': {
      S(rectPts(-200, -330, 400, 330), { fill: PAL.paper, gap: PAL.madder, w: 2.2 });
      S(rectPts(-180, -310, 360, 290), { mode: 'line', w: 1.2 });
      break;
    }
    case 'bundle': { S(ellipsePts(0, -12, 20, 13, 9), { fill: PAL.turmeric, pattern: P('flowerDots', PAL.madder), smooth: true }); L([[-6, -24], [0, -32], [6, -24]], { w: 1.4 }); break; }
    case 'sandalsThrone': {
      S(rectPts(-56, -110, 112, 110), { fill: PAL.madder, pattern: P('royalChecks', PAL.gold), gap: PAL.gold });
      S(rectPts(-70, -122, 140, 14), { fill: PAL.gold });
      if (o.state) for (const sx of [-14, 14]) S(ellipsePts(sx, -128, 11, 5, 8), { fill: PAL.gold, gap: PAL.madder, smooth: true, seed: sx });
      break;
    }
    case 'mainaka': {
      S([[-160, 0], [-90, -110], [-20, -170], [60, -120], [150, 0]], { fill: PAL.gold, pattern: P('mountainTriangles', PAL.madder), gap: PAL.madder, smooth: true });
      break;
    }
    case 'herbPeak': {
      S([[-130, 0], [-70, -120], [0, -180], [80, -110], [130, 0]], { fill: PAL.stone, pattern: P('herbs', PAL.leaf), smooth: true });
      if (m === 'colour') dots(ctx, 0, -90, 70, 9, PAL.turmeric, 4, 4);
      break;
    }
    case 'bridge': {
      const k = o.state ?? 1; const w = (o.width || 900) * k;
      for (let bx = 0; bx < w; bx += 46) S([[bx, -6], [bx + 6, -30 - ((bx / 46) % 2) * 6], [bx + 40, -32], [bx + 46, -6]], { fill: PAL.stone, pattern: P('stoneBlocks', PAL.black), seed: bx | 0 });
      break;
    }
    case 'lanka': { M.building(ctx, 0, 0, 260, 300, { colour: m === 'colour', lanka: true, tiers: 3, banner: true, seed: 3 }); break; }
    case 'fireRite': { S([[-46, 0], [-36, -24], [36, -24], [46, 0]], { fill: PAL.black, gap: PAL.gold }); M.flame(ctx, 0, -24, 30 + (o.state || 0) * 70, { t, seed: 8, tongues: 5 }); break; }
    case 'pot': M.pot(ctx, 0, 0, 60, { colour: m === 'colour', night: o.night }); break;
    case 'bigPot': M.pot(ctx, 0, 0, 96, { colour: m === 'colour', night: o.night, fill: PAL.gold }); break;
    case 'lamp': M.diya(ctx, 0, -8, 12, o.state !== 0, t, { colour: true, night: o.night }); break;
    case 'grassBlade': L([[0, 0], [4, -26], [10, -40]], { w: 2, color: m === 'colour' ? PAL.leaf : c, smooth: true }); break;
    case 'ring': { S(ellipsePts(0, -14, 12, 12, 10), { fill: PAL.gold, gap: PAL.madder, smooth: true }); break; }
    case 'bow': { const arc = []; for (let i = 0; i <= 10; i++) { const a = -1.2 + (i / 10) * 2.4; arc.push([Math.cos(a) * 60 - 30, -110 + Math.sin(a) * 100]); } line(ctx, arc, { w: 7, color: c, smooth: true, seed: 4 }); if (m === 'colour') line(ctx, arc, { w: 3, color: PAL.gold, smooth: true, seed: 4, flat: true }); L([arc[0], arc[10]], { w: 1.2 }); break; }
    case 'veil': {
      // drawn across the face: her wound is never shown
      const hy = -150 * (o.height || 1) * 0.93, f = o.facing || 1;
      ctx.scale(f, 1);
      S([[-20, hy - 26], [30, hy - 30], [34, hy + 14], [18, hy + 52], [4, hy + 30], [-12, hy + 56], [-24, hy + 10]], { fill: PAL.madder, pattern: P('flowerDots', PAL.turmeric), smooth: true });
      break;
    }
    case 'rekha': {
      // the Lakshmana Rekha: a rice-paste line with a lotus at each corner (later tradition)
      const rx = 230, ry = 50, cy = 16;
      const pts = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      if (o.state === 'out') { ctx.setLineDash([4, 16]); line(ctx, pts, { w: 2, color: PAL.grey, amp: 0.5, flat: true }); ctx.setLineDash([]); break; }
      const flare = o.state === 'flare';
      line(ctx, pts, { w: flare ? 12 : 9, color: PAL.black, amp: 0.5, flat: true });
      line(ctx, pts, { w: flare ? 7 : 5, color: PAL.white, amp: 0.5, flat: true });
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) M.lotus(ctx, Math.cos(a) * rx, cy + Math.sin(a) * ry, 14, 1, { flat: true, fill: PAL.pink });
      if (flare) for (let i = 0; i < 9; i++) { const x = -rx + (i * rx) / 4; line(ctx, [[x, cy - 10], [x + Math.sin(t * 9 + i) * 4, cy - 46 - (i % 3) * 14]], { w: 3, color: PAL.turmeric, flat: true }); }
      break;
    }
    default: break;
  }
  ctx.restore();
}
