// A diorama frame: one picture built in layers, back to front, each layer a different
// material at a different distance. Depth comes from five things:
//   1. a box you look into: the scene sits recessed behind a painted border that casts a
//      shadow inward, with a torn paper edge
//   2. material changes with distance: watercolour far, backlit cut paper in the middle,
//      carved woodcut near
//   3. light between the layers: each paper band glows along its top edge and shades the
//      sheet behind it
//   4. something dark and near at the edge: trees in front of everything frame the view
//   5. figures as cut-outs standing in the box, with paper edges and cast shadows
// When the eye moves, every layer slides at its own speed (parallax).
// Test scene: Rama, Lakshmana and Vishvamitra entering Tataka's wasteland at dusk.
import { Container, Sprite, Graphics, BlurFilter } from 'pixi.js';
import { OutlineFilter } from 'pixi-filters';
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { PAL } from '../art/palette.js';
import * as M from '../art/motifs.js';
import { Painted, Glow, Particles } from '../gfx/world.js';
import { LiveFigure } from '../gfx/live.js';
import { character } from '../art/figures.js';
import { setScene } from '../gfx/gfx.js';

const BORDER = 46;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// ---------------------------------------------------------------- materials
/** Watercolour: soft blooms of pigment with darker drying edges, on warm paper. */
function paintSky(ctx, w, h) {
  const r = rng(11);
  ctx.fillStyle = '#efe1c6'; ctx.fillRect(0, 0, w, h);
  // broad washes: grey-blue high, rose in the middle, turmeric at the horizon
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  g.addColorStop(0, 'rgba(92,104,140,0.55)'); g.addColorStop(0.38, 'rgba(198,120,128,0.42)'); g.addColorStop(0.72, 'rgba(232,170,60,0.6)'); g.addColorStop(1, 'rgba(242,196,90,0.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const blob = (cx, cy, rad, fill, edge, a) => {
    const n = 22, pts = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, k = 0.7 + r() * 0.5; pts.push([cx + Math.cos(t) * rad * k * 1.5, cy + Math.sin(t) * rad * k * 0.7]); }
    ctx.beginPath(); pts.forEach(([x, y], i) => { const [nx, ny] = pts[(i + 1) % n]; if (!i) ctx.moveTo((x + nx) / 2, (y + ny) / 2); else ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); });
    ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    ctx.globalAlpha = a; ctx.fillStyle = fill; ctx.fill();
    ctx.globalAlpha = a * 0.7; ctx.strokeStyle = edge; ctx.lineWidth = 1 + r() * 1.2; ctx.stroke();   // pigment dries darker at the edge
    ctx.globalAlpha = 1;
  };
  // clouds: indigo and ash grey, heavier toward the top right
  for (let i = 0; i < 26; i++) { const x = r() * w, y = 30 + r() * h * 0.28; blob(x, y, 40 + r() * 90, r() < 0.5 ? '#55607f' : '#8a8592', '#3c4562', 0.16 + r() * 0.12); }
  for (let i = 0; i < 22; i++) { const x = r() * w, y = h * 0.22 + r() * h * 0.2; blob(x, y, 40 + r() * 80, r() < 0.5 ? '#d48a8e' : '#b97a9a', '#9a5a6a', 0.14 + r() * 0.1); }
  for (let i = 0; i < 20; i++) { const x = r() * w, y = h * 0.38 + r() * h * 0.16; blob(x, y, 50 + r() * 90, r() < 0.6 ? '#f0b440' : '#e8903a', '#c87a20', 0.16 + r() * 0.14); }
  // backruns: small cauliflower blooms where wet met dry
  for (let i = 0; i < 14; i++) { const x = r() * w, y = 20 + r() * h * 0.45; blob(x, y, 8 + r() * 14, '#fff4dc', '#c9b090', 0.12); }
  // paper fibres
  ctx.globalAlpha = 0.08; ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.7;
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 18, y + (r() - 0.5) * 6); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

/** A dead tree as a cut-paper silhouette: a tapering trunk splitting into crooked branches. */
function deadTree(ctx, x, y, h, color, r) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round';
  const branch = (bx, by, len, ang, wid, depth) => {
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    ctx.lineWidth = wid; ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + Math.cos(ang + (r() - 0.5)) * len * 0.5, by + Math.sin(ang + (r() - 0.5)) * len * 0.5, ex, ey); ctx.stroke();
    if (depth <= 0 || wid < 1.2) return;
    const n = 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(ex, ey, len * (0.55 + r() * 0.25), ang + (r() - 0.5) * 1.5, wid * 0.62, depth - 1);
  };
  branch(x, y, h * 0.45, -Math.PI / 2 + (r() - 0.5) * 0.2, h * 0.07, 4);
}

/** A broken hut, cut from paper: a slumped roof and a missing wall. */
function brokenHut(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s, y - s * 0.7); ctx.lineTo(x - s * 1.25, y - s * 0.7); ctx.lineTo(x - s * 0.1, y - s * 1.35); ctx.lineTo(x + s * 1.2, y - s * 0.8); ctx.lineTo(x + s * 0.7, y - s * 0.62); ctx.lineTo(x + s * 0.8, y); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(x - s * 0.35, y - s * 0.55, s * 0.4, s * 0.55);          // the doorway
  ctx.beginPath(); ctx.moveTo(x + s * 0.2, y - s * 1.05); ctx.lineTo(x + s * 0.6, y - s * 0.85); ctx.lineTo(x + s * 0.3, y - s * 0.75); ctx.closePath(); ctx.fill(); // a hole in the thatch
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * A sheet of cut paper standing in the box: one flat colour with pulp mottling, its top
 * edge lit from behind, its shadow falling on the sheet behind it.
 */
function paintBand(ctx, w, h, top, o) {
  const r = rng(o.seed);
  const pts = [];
  for (let x = -10; x <= w + 10; x += 8) pts.push([x, top(x) + (r() - 0.5) * 1.6]);
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], h + 10); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(w + 10, h + 10); ctx.closePath(); };
  // what was cut along its top edge (trees, huts) stands up out of the sheet, haloed by the light behind
  if (o.skyline) { ctx.save(); ctx.shadowColor = 'rgba(255,186,90,0.85)'; ctx.shadowBlur = 12; o.skyline(ctx, r, (x) => top(x)); ctx.restore(); }
  // the shadow it throws on the sheet behind
  ctx.save(); path(); ctx.shadowColor = 'rgba(30,14,6,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = -5; ctx.fillStyle = o.color; ctx.fill(); ctx.restore();
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = o.color; ctx.fillRect(0, 0, w, h);
  // pulp mottling
  for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.05 + r() * 0.06; ctx.fillStyle = r() < 0.5 ? '#000' : '#fff'; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 60, 6 + r() * 18, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // what was cut into this sheet: trees, huts, a giant's footprint
  if (o.decor) o.decor(ctx, r);
  // backlight: warm at the cut edge, the sheet darkening away from it
  ctx.globalCompositeOperation = 'source-atop';
  let minTop = h; for (const [, y] of pts) minTop = Math.min(minTop, y);
  const g = ctx.createLinearGradient(0, minTop, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,8,4,${o.fall ?? 0.35})`);
  ctx.fillStyle = g; ctx.fillRect(0, minTop, w, h - minTop);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // the glowing rim
  ctx.save(); path(); ctx.clip();
  ctx.lineJoin = 'round';
  for (const [lw, c] of [[22, 'rgba(255,190,90,0.18)'], [10, 'rgba(255,200,110,0.4)'], [3, 'rgba(255,228,160,0.95)']]) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.restore();
}

/** Woodcut ground: cream paper, black cracks carved with gouges that follow them, bones. */
function paintGround(ctx, w, h, y0) {
  const r = rng(77);
  ctx.fillStyle = '#e2cfa6'; ctx.fillRect(0, y0, w, h - y0);
  // the block is darker where it is carved deeper, toward the viewer
  { const g = ctx.createLinearGradient(0, y0, 0, h); g.addColorStop(0, 'rgba(120,70,30,0)'); g.addColorStop(1, 'rgba(90,50,20,0.28)'); ctx.fillStyle = g; ctx.fillRect(0, y0, w, h - y0); }
  // the top edge of the block, slightly ragged
  ctx.strokeStyle = PAL.black; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = 0; x <= w; x += 10) { const y = y0 + Math.sin(x / 70) * 3 + (r() - 0.5) * 2; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  // a few long knife strokes of grain
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const y = y0 + 12 + r() * (h - y0 - 12), x = r() * w, l = 20 + r() * 70 * (0.5 + (y - y0) / (h - y0)); ctx.globalAlpha = 0.35; ctx.lineWidth = 0.8 + r(); ctx.strokeStyle = PAL.black; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 3, x + l, y + (r() - 0.5) * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // cracks: random walks that fork, bigger toward the viewer, gouged on both sides
  const crack = (x, y, ang, len, wid, depth) => {
    let px = x, py = y;
    const segs = 6 + Math.floor(r() * 5);
    for (let s = 0; s < segs; s++) {
      ang += (r() - 0.5) * 0.9;
      const near = (py - y0) / (h - y0), step = len / segs * (0.6 + near * 0.8);
      const nx = px + Math.cos(ang) * step, ny = Math.max(y0 + 4, Math.min(h - 2, py + Math.sin(ang) * step * 0.55));
      ctx.strokeStyle = PAL.black; ctx.lineWidth = wid * (0.8 + near * 1.6); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      // gouge marks along the crack, as the knife follows the form
      const gx = -(ny - py), gy = nx - px, gl = Math.hypot(gx, gy) || 1;
      for (let k = 0; k < (r() < 0.5 ? 1 : 0); k++) { const t = r(), cx = px + (nx - px) * t, cy = py + (ny - py) * t, side = r() < 0.5 ? -1 : 1, gl2 = 4 + r() * 7 * (0.6 + near); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx + (gx / gl) * 3 * side, cy + (gy / gl) * 3 * side); ctx.lineTo(cx + (gx / gl) * gl2 * side + (nx - px) / gl * 3, cy + (gy / gl) * gl2 * side); ctx.stroke(); }
      if (depth > 0 && r() < 0.28) crack(nx, ny, ang + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), len * 0.55, wid * 0.7, depth - 1);
      px = nx; py = ny;
    }
  };
  for (let i = 0; i < 13; i++) crack(r() * w, y0 + 8 + r() * (h - y0 - 20), (r() - 0.5) * 1.2 + (r() < 0.5 ? Math.PI : 0), 160 + r() * 200, 3.4, 2);
  // hatching in the low places, denser toward the viewer
  ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.9;
  for (let i = 0; i < 260; i++) { const y = y0 + 6 + Math.pow(r(), 0.6) * (h - y0 - 6), x = r() * w, near = (y - y0) / (h - y0); ctx.globalAlpha = 0.25 + near * 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5 + near * 8, y + 1); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // bones, outlined and hatched on their shadow side
  for (let i = 0; i < 9; i++) {
    const x = w * 0.3 + r() * w * 0.65, y = y0 + 20 + r() * (h - y0 - 34), near = (y - y0) / (h - y0), s = 14 + near * 22, a = (r() - 0.5) * 1.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#f6efe0'; ctx.strokeStyle = PAL.black; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.12, s * 2, s * 0.24, s * 0.1); ctx.fill(); ctx.stroke();
    for (const e of [-1, 1]) for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(e * s, d * s * 0.16, s * 0.17, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.lineWidth = 0.8; for (let k = -s * 0.8; k < s * 0.8; k += 4) { ctx.beginPath(); ctx.moveTo(k, s * 0.04); ctx.lineTo(k + 3, s * 0.12); ctx.stroke(); }
    ctx.restore();
  }
}

/** Dust rising where Tataka comes: carved curls of cloud, woodcut. */
function paintDust(ctx, s) {
  const r = rng(5);
  const puffs = [];
  for (let i = 0; i < 18; i++) { const t = i / 17; puffs.push([(r() - 0.3) * 180 * s, -t * 260 * s + (r() - 0.5) * 30, (34 + r() * 30) * s * (1.1 - t * 0.4)]); }
  puffs.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rad] of puffs) {
    ctx.fillStyle = '#efe4cf'; ctx.strokeStyle = PAL.black; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    // the underside of each billow in shadow, cut as parallel hatching
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(120,96,70,0.35)'; ctx.beginPath(); ctx.arc(x - rad * 0.25, y - rad * 0.3, rad * 1.05, 0, 7); ctx.rect(x + rad * 2, y - rad * 2, -rad * 4, rad * 4); ctx.fill('evenodd');
    ctx.lineWidth = 1; for (let k = -rad; k < rad; k += 5) { ctx.beginPath(); ctx.moveTo(x + k, y + rad * 0.45); ctx.lineTo(x + k + rad * 0.5, y + rad); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, rad, Math.PI * 0.9, Math.PI * 2.15); ctx.stroke();
    // the curl, cut as concentric gouges
    ctx.lineWidth = 1; for (let k = 0.75; k > 0.2; k -= 0.17) { ctx.beginPath(); ctx.arc(x + rad * 0.12, y + rad * 0.1, rad * k, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke(); }
    ctx.lineWidth = 0.8; for (let k = 0; k < 6; k++) { const a = Math.PI * (0.15 + k * 0.1); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rad * 0.55, y + Math.sin(a) * rad * 0.55); ctx.lineTo(x + Math.cos(a) * rad * 0.92, y + Math.sin(a) * rad * 0.92); ctx.stroke(); }
  }
}

/** The near trees: dark and close, overlapping the view on the left. */
function paintNearTrees(ctx, h) {
  const r = rng(31);
  for (const [x, hh, c] of [[30, h * 1.05, '#2b1a12'], [120, h * 0.95, '#3a2418'], [205, h * 0.8, '#4a2f1e']]) {
    // trunk with bark gouges
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 22, h); ctx.quadraticCurveTo(x - 10, h - hh * 0.5, x - 6, h - hh * 0.62); ctx.lineTo(x + 8, h - hh * 0.62); ctx.quadraticCurveTo(x + 14, h - hh * 0.5, x + 26, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,110,70,0.35)'; ctx.lineWidth = 1;
    for (let k = 0; k < 18; k++) { const yy = h - r() * hh * 0.6, xx = x - 8 + r() * 16; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + (r() - 0.5) * 3, yy - 10 - r() * 14); ctx.stroke(); }
    deadTree(ctx, x, h - hh * 0.6, hh * 0.75, c, r);
    // backlight catches the right-hand edge
    ctx.strokeStyle = 'rgba(255,190,100,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 24, h); ctx.quadraticCurveTo(x + 13, h - hh * 0.5, x + 8, h - hh * 0.62); ctx.stroke();
  }
}

/** The box: a painted border of fish and lotus, the window torn into it, its inner shadow. */
function paintFrame(ctx, w, h, b) {
  const r = rng(3);
  ctx.fillStyle = '#efdcb4'; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.18; for (let i = 0; i < 60; i++) { ctx.fillStyle = r() < 0.5 ? '#c79a5a' : '#fff6e0'; ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 40, 8 + r() * 14, 0, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  // rules
  const rule = (inset, lw, c) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2); };
  rule(5, 3, PAL.black); rule(9, 2, PAL.madder); rule(b - 8, 2, PAL.madder); rule(b - 4, 2.5, PAL.black);
  // fish and lotus along the band, with a green vine between
  const band = (x0, y0, x1, y1, step) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / step), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    ctx.strokeStyle = PAL.leaf; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const t = i / 60, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, off = Math.sin(t * n * Math.PI) * 6; i ? ctx.lineTo(px - uy * off, py + ux * off) : ctx.moveTo(px - uy * off, py + ux * off); } ctx.stroke();
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
      if (i % 2) M.lotus(ctx, px, py + 6, 9, 1, { colour: true, fill: PAL.pink });
      else M.fish(ctx, px, py, 8, { colour: true, fill: '#7f9a8a', dir: i % 4 ? 1 : -1 });
    }
  };
  const m = (b) / 2 + 2;
  band(m + 30, m, w - m - 30, m, 64); band(m + 30, h - m, w - m - 30, h - m, 64);
  band(m, m + 30, m, h - m - 30, 64); band(w - m, m + 30, w - m, h - m - 30, 64);
  for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) M.lotus(ctx, x, y + 6, 12, 1, { colour: true, fill: PAL.pink });
  // the window, torn out of the sheet: a ragged white paper edge
  const pts = [];
  const push = (x, y) => pts.push([x + (r() - 0.5) * 3, y + (r() - 0.5) * 3]);
  for (let x = b; x < w - b; x += 6) push(x, b);
  for (let y = b; y < h - b; y += 6) push(w - b, y);
  for (let x = w - b; x > b; x -= 6) push(x, h - b);
  for (let y = h - b; y > b; y -= 6) push(b, y);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.save(); ctx.lineWidth = 7; ctx.strokeStyle = '#fbf4e4'; ctx.stroke(); ctx.restore();
  ctx.globalCompositeOperation = 'destination-out'; ctx.fill(); ctx.globalCompositeOperation = 'source-over';
}

/** The inside of the box: the border's shadow falling into the scene, heavier at top and left. */
function paintRecess(ctx, w, h, b) {
  const edge = (x0, y0, x1, y1, a) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(25,12,6,${a})`); g.addColorStop(1, 'rgba(25,12,6,0)'); return g; };
  ctx.fillStyle = edge(0, b, 0, b + 38, 0.6); ctx.fillRect(b, b, w - 2 * b, 38);
  ctx.fillStyle = edge(b, 0, b + 30, 0, 0.5); ctx.fillRect(b, b, 30, h - 2 * b);
  ctx.fillStyle = edge(w - b, 0, w - b - 14, 0, 0.22); ctx.fillRect(w - b - 14, b, 14, h - 2 * b);
  ctx.fillStyle = edge(0, h - b, 0, h - b - 12, 0.2); ctx.fillRect(b, h - b - 12, w - 2 * b, 12);
}

// ---------------------------------------------------------------- the view
export class DioramaView {
  constructor() {
    this.view = new Container();
    this.t = 0; this.cam = 0; this.camTo = 0;
    this.layers = [];
    this.build();
  }

  /** Add a painted layer at a depth: p is how far it slides when the eye moves (0 = far, 1 = the figures). */
  layer(p, w, h, paint, x = 0, y = 0, parent = this.inner) {
    const m = Math.ceil(90 * Math.abs(p - 0.5) + 60);
    const pt = new Painted(w + m * 2, h, m, 0, app.scale);
    pt.paint((ctx) => paint(ctx, w + m * 2, h, m));
    pt.view.position.set(x, y);
    parent.addChild(pt.view);
    this.layers.push({ p, pt, x0: x });
    return pt;
  }

  build() {
    const W = app.W, H = 720, b = BORDER;
    this.box = { W, H, b };
    this.inner = new Container();
    const mask = new Graphics().rect(b - 2, b - 2, W - 2 * b + 4, H - 2 * b + 4).fill(0xffffff);
    this.inner.mask = mask;
    this.view.addChild(this.inner, mask);
    const horizon = 300;
    // 1. the sky, far and soft
    this.layer(0.08, W, H, (ctx, w, h) => paintSky(ctx, w, h));
    // the low sun, with light that bleeds into the paper around it
    this.sunGlow = new Glow(W * 0.72, horizon - 40, 260, 0xffa14a, { alpha: 0.55, flicker: 0.02 });
    this.sun = new Graphics().circle(0, 0, 26).fill(0xd8402a); this.sun.position.set(W * 0.72, horizon - 36);
    this.inner.addChild(this.sunGlow.view, this.sun);
    this.layers.push({ p: 0.1, obj: this.sun, x0: this.sun.x }, { p: 0.1, obj: this.sunGlow, x0: this.sunGlow.x });
    // 2-5. sheets of cut paper, each nearer, darker and more detailed
    this.layer(0.25, W, H, (ctx, w, h) => paintBand(ctx, w, h, (x) => horizon + 14 + Math.sin(x / 140) * 6, { seed: 1, color: '#b99a72', fall: 0.2, skyline: (c, r, top) => { for (let i = 0; i < 16; i++) { const x = r() * w; deadTree(c, x, top(x) + 4, 34 + r() * 36, '#b99a72', r); } } }));
    this.layer(0.42, W, H, (ctx, w, h) => paintBand(ctx, w, h, (x) => horizon + 52 + Math.sin(x / 210 + 1) * 8, { seed: 2, color: '#6a5e54', fall: 0.3, skyline: (c, r, top) => {
      for (let i = 0; i < 10; i++) { const x = r() * w; deadTree(c, x, top(x) + 4, 80 + r() * 70, '#6a5e54', r); }
      for (const [k, s] of [[0.5, 30], [0.86, 24], [0.2, 20]]) brokenHut(c, w * k, top(w * k) + 6, s, '#6a5e54');
    } }));
    this.layer(0.6, W, H, (ctx, w, h) => paintBand(ctx, w, h, (x) => horizon + 118 - 70 * Math.exp(-Math.pow((x - w * 0.62) / 260, 2)) - 40 * Math.exp(-Math.pow((x - w * 0.3) / 200, 2)) + Math.sin(x / 90) * 4, { seed: 3, color: '#93603e', fall: 0.4, decor: (c, r) => {
      brokenHut(c, w * 0.36, horizon + 150, 42, '#4a2c1c');
      // a giant's footprint pressed into the hill
      c.save(); c.translate(w * 0.66, horizon + 84); c.rotate(-0.25); c.fillStyle = 'rgba(50,24,12,0.55)';
      c.beginPath(); c.ellipse(0, 0, 34, 16, 0, 0, 7); c.fill(); for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(30 + k * 2, -16 + k * 8, 5 - k * 0.5, 0, 7); c.fill(); } c.restore();
    }, skyline: (c, r, top) => { for (let i = 0; i < 4; i++) { const x = w * (0.45 + r() * 0.5); deadTree(c, x, top(x) + 6, 100 + r() * 60, '#93603e', r); } } }));
    this.layer(0.74, W, H, (ctx, w, h) => paintBand(ctx, w, h, (x) => horizon + 205 + Math.sin(x / 60) * 5 + Math.sin(x / 23) * 3, { seed: 4, color: '#3e3b38', fall: 0.45, decor: (c, r) => {
      // rubble: planks and stones
      c.fillStyle = '#23201e'; for (let i = 0; i < 40; i++) { const x = r() * w, y = horizon + 208 + r() * 20; c.save(); c.translate(x, y); c.rotate((r() - 0.5) * 1.4); c.fillRect(-12, -2, 24 + r() * 20, 4); c.restore(); }
    } }));
    // 6. the woodcut ground, near and hard
    this.groundY = horizon + 238;
    this.layer(0.9, W, H, (ctx, w, h) => paintGround(ctx, w, h, this.groundY));
    // 7. the figures, cut out and standing in the box
    this.figs = new Container(); this.inner.addChild(this.figs);
    this.layers.push({ p: 1, obj: this.figs, x0: 0 });
    const feet = H - b - 44;
    const cast = [
      { id: 'lakshmana', st: 'prince', x: W * 0.25, pose: 'walk2', s: 1.4, dy: -14 },
      { id: 'vishvamitra', st: undefined, x: W * 0.52, pose: 'point', s: 1.42, dy: -6 },
      { id: 'rama', st: 'prince', x: W * 0.37, pose: 'walk1', s: 1.58, dy: 8 },
    ];
    this.actors = [];
    const cut = new OutlineFilter({ thickness: 3, color: 0xfbf3e2, quality: 0.2 });
    for (const c of cast) {
      const fig = new LiveFigure(character(c.id, c.st), { pose: c.pose, facing: 1, breathe: true, blink: true });
      fig.scale = c.s; fig.x = c.x; fig.y = feet + c.dy;
      // the cut-out's shadow on the ground, falling toward us from the low sun behind
      const shadow = new Graphics().ellipse(0, 0, 56 * c.s, 9 * c.s).fill({ color: 0x1d1008, alpha: 0.45 }); shadow.filters = [new BlurFilter({ strength: 5 })];
      this.figs.addChild(shadow, fig.view);
      fig.view.filters = [cut];
      this.actors.push({ fig, shadow });
    }
    // 8. dust rising where she comes
    this.dust = this.layer(1.02, 420, H, (ctx, w, h, m) => { ctx.translate(m + 200, h - b - 40); paintDust(ctx, 1); }, W - b - 380, 0);
    // 9. the dark near trees, in front of everything
    this.layer(1.3, 260, H, (ctx, w, h, m) => { ctx.translate(m, 0); paintNearTrees(ctx, h); }, b - 110, 0);
    // dust motes in the low light
    this.motes = new Particles(120); this.inner.addChild(this.motes.view);
    // 10. the box itself: its shadow inside, then the border
    const recess = new Painted(W, H, 0, 0, app.scale); recess.paint((ctx) => paintRecess(ctx, W, H, b));
    const frame = new Painted(W, H, 0, 0, app.scale); frame.paint((ctx) => paintFrame(ctx, W, H, b));
    this.view.addChild(recess.view, frame.view);
    this.fixed = [recess, frame];
  }

  update(dt) {
    this.t += dt;
    // the eye drifts on its own; dragging moves it further
    const p = input.pointer;
    if (p.down) this.camTo = ((p.x / app.W) - 0.5) * -220;
    else this.camTo = Math.sin(this.t * 0.16) * 70;
    this.cam += (this.camTo - this.cam) * Math.min(1, dt * 1.6);
    for (const a of this.actors) a.fig.update(dt);
    if (Math.random() < dt * 8) this.motes.emit({ x: this.box.b + Math.random() * (this.box.W - 2 * this.box.b), y: 260 + Math.random() * 380, vx: 8 + Math.random() * 10, vy: -4 - Math.random() * 6, life: 6, size: 3, color: 0xffcf8a, blend: 'add', alpha: 0.5, drag: 0.02 });
    this.motes.update(dt);
    input.endTick();
  }

  sync() {
    for (const l of this.layers) {
      const x = l.x0 + this.cam * l.p;
      if (l.pt) l.pt.view.x = x;
      else if (l.obj && l.obj.view) { l.obj.x = x; l.obj.sync(this.t); }
      else if (l.obj) l.obj.x = x;
    }
    for (const a of this.actors) {
      a.fig.sync();
      a.shadow.position.set(a.fig.x - 30 * a.fig.scale, a.fig.y + 4);
    }
  }

  destroy() {
    for (const a of this.actors) a.fig.destroy();
    for (const l of this.layers) if (l.pt) l.pt.destroy();
    for (const f of this.fixed) f.destroy();
    this.motes.clear();
    this.view.destroy({ children: true });
  }
}

/** A mode that shows the diorama on its own (?diorama, or #diorama). */
export class DioramaMode {
  label() { return 'Rama enters Tataka’s wasteland, built in layers'; }
  enter() { this.d = new DioramaView(); this.show(); }
  show() { setScene(this.d.view, { vignette: 0.28, grain: 0.22 }); }
  update(dt) { this.d.update(dt); }
  render() { this.d.sync(); }
  resize() { this.d.destroy(); this.d = new DioramaView(); this.show(); }
  exit() { this.d.destroy(); }
}
