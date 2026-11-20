// The Ramlila stage. Story chapters are played the way the Ramayana has been played in
// villages for centuries: a raised platform under a shamiana canopy, a painted cloth for
// the scene, a curtain, oil lamps along the edge and torches on the posts, and the
// audience in front, in the dark. The painting is Mithila; the theatre is lamp-lit.
import { Container, Sprite, Graphics } from 'pixi.js';
import { app } from '../core/app.js';
import { PAL } from '../art/palette.js';
import { shape, line, hatch, rectPts, ellipsePts, dots, plate } from '../art/ink.js';
import { pattern } from '../art/patterns.js';
import * as M from '../art/motifs.js';
import { BackdropView, Painted, PropView, Glow, Flame, Particles } from '../gfx/world.js';
import { LiveFigure } from '../gfx/live.js';
import { character, WALK } from '../art/figures.js';
import { hashStr } from '../core/rng.js';
import { col } from '../art/palette.js';

export const FLOOR = 574;        // where the actors' feet are
const EDGE = 606;                // the front edge of the platform
const VALANCE = 112;             // bottom of the canopy fringe
const CLOTH_TOP = 104;
const CLOTH_K = 0.66;            // the painted cloth shows a backdrop at two-thirds size
export const ACT = 1.1;          // actors stand a touch larger than the painting behind them

const hex = (c) => parseInt(String(c).replace('#', ''), 16);

export function stageBox() {
  const W = app.W, pl = Math.round(W * 0.085), pr = Math.round(W * 0.915);
  return { W, pl, pr, x0: pl + 70, x1: pr - 70 };
}
/** Stage position (0 = far left mark, 1 = far right mark) to world x. */
export function stageX(at) { const b = stageBox(); return b.x0 + (b.x1 - b.x0) * at; }

// ---------------------------------------------------------------- painted decor
function paintCanopy(ctx, W) {
  // the shamiana: broad stripes of madder, turmeric and cream, scalloped at the bottom
  const stripes = [PAL.madder, PAL.white, PAL.turmeric, PAL.white];
  const sw = 46;
  for (let i = 0, x = 0; x < W; i++, x += sw) {
    ctx.fillStyle = stripes[i % 4]; ctx.fillRect(x, 0, sw + 1, VALANCE - 18);
    if (stripes[i % 4] !== PAL.white) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = pattern(ctx, i % 4 === 0 ? 'lotusRow' : 'zigzag', null, i % 4 === 0 ? PAL.turmeric : PAL.madder, 0.9); ctx.fillRect(x, 0, sw, VALANCE - 18); ctx.restore(); }
  }
  // folds: the cloth sags between the poles
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = PAL.black;
  for (let x = 0; x < W; x += 260) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 130, 40, x + 260, 0); ctx.lineTo(x + 260, 0); ctx.fill(); }
  ctx.restore();
  // scalloped jhalar with tassels
  ctx.fillStyle = PAL.madder; ctx.strokeStyle = PAL.black; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, VALANCE - 22);
  for (let x = 0; x < W; x += 36) ctx.quadraticCurveTo(x + 18, VALANCE + 6, x + 36, VALANCE - 22);
  ctx.lineTo(W, VALANCE - 26); ctx.lineTo(0, VALANCE - 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let x = 18; x < W; x += 36) { ctx.fillStyle = PAL.turmeric; ctx.beginPath(); ctx.arc(x, VALANCE - 6, 3.6, 0, 7); ctx.fill(); ctx.stroke(); line(ctx, [[x, VALANCE - 3], [x, VALANCE + 8]], { w: 1.6, color: PAL.gold, seed: x, flat: true }); }
  line(ctx, [[0, VALANCE - 24], [W, VALANCE - 24]], { w: 3, color: PAL.black, seed: 4, flat: true });
  // a toran of mango leaves across the opening
  for (let x = 12; x < W; x += 30) {
    const y = VALANCE - 22;
    shape(ctx, [[x - 6, y], [x + 6, y], [x + 2, y + 26], [x, y + 32], [x - 2, y + 26]], { fill: x % 60 < 30 ? PAL.leaf : PAL.green, gap: null, w: 1.2, seed: x, smooth: true });
  }
}

function paintPillar(ctx, w, h, side) {
  // a bamboo post wrapped in cloth and banana leaves, garlanded with marigold
  const x = w / 2;
  shape(ctx, rectPts(x - 26, 0, 52, h), { fill: PAL.earth, pattern: pattern(ctx, 'bark', null, PAL.brown, 1), gap: PAL.ochre, w: 2, seed: 3 });
  for (let y = 60; y < h - 40; y += 96) shape(ctx, rectPts(x - 30, y, 60, 14), { fill: PAL.madder, pattern: pattern(ctx, 'zigzag', null, PAL.turmeric, 0.8), w: 1.6, seed: y });
  // banana stalk with broad leaves
  const bx = x + side * 6;
  for (let i = 0; i < 6; i++) {
    const y = h - 40 - i * 64, dir = i % 2 ? 1 : -1;
    shape(ctx, [[bx, y], [bx + dir * 60, y - 46], [bx + dir * 92, y - 30], [bx + dir * 40, y + 4]], { fill: i % 2 ? PAL.leaf : PAL.green, pattern: pattern(ctx, 'leaf', null, PAL.white, 0.7), w: 1.5, seed: i + 11, smooth: true });
  }
  // marigold garland spiralling down
  for (let y = 30; y < h - 30; y += 10) { const ox = Math.sin(y / 34) * 22; ctx.fillStyle = (y / 10) % 3 < 1 ? PAL.saffron : PAL.turmeric; ctx.beginPath(); ctx.arc(x + ox, y, 6.5, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 1; ctx.stroke(); }
}

function paintFloor(ctx, W, pl, pr) {
  // the platform: planks under a striped dhurrie
  const top = FLOOR - 26;
  shape(ctx, rectPts(pl - 30, top, pr - pl + 60, EDGE - top), { fill: PAL.brown, gap: null, w: 2, seed: 2 });
  ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = PAL.black; for (let y = top + 10; y < EDGE; y += 11) { ctx.beginPath(); ctx.moveTo(pl - 30, y); ctx.lineTo(pr + 30, y); ctx.stroke(); } ctx.restore();
  const rx0 = pl + 40, rx1 = pr - 40, ry0 = top + 6, ry1 = EDGE - 6;
  const bands = [PAL.indigo, PAL.madder, PAL.turmeric, PAL.madder, PAL.indigo];
  const bh = (ry1 - ry0) / bands.length;
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(rx0, ry0 + i * bh, rx1 - rx0, bh + 0.5); });
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = pattern(ctx, 'triangles', null, PAL.white, 0.8); ctx.fillRect(rx0, ry0 + bh * 2, rx1 - rx0, bh); ctx.restore();
  line(ctx, rectPts(rx0, ry0, rx1 - rx0, ry1 - ry0), { w: 2, closed: true, seed: 6 });
  for (let x = rx0 + 6; x < rx1; x += 9) { line(ctx, [[x, ry1], [x - 1, ry1 + 7]], { w: 1.2, color: PAL.white, seed: x, flat: true, amp: 0.3 }); }
}

function paintApron(ctx, W, pl, pr) {
  // the face of the platform: madder cloth with a fish-and-lotus border
  const y0 = EDGE, y1 = EDGE + 48;
  shape(ctx, rectPts(pl - 34, y0, pr - pl + 68, y1 - y0), { fill: '#7a1f2e', pattern: pattern(ctx, 'lotusRow', null, PAL.turmeric, 1), gap: PAL.turmeric, w: 2, seed: 9 });
  for (let x = pl; x < pr; x += 140) M.fish(ctx, x + 70, y0 + 25, 13, { colour: true, fill: PAL.turmeric, dir: (x / 140) % 2 ? 1 : -1 });
  // marigold swags along the edge
  for (let x = pl - 20; x < pr + 20; x += 120) {
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, px = x + t * 120, py = y0 + 4 + Math.sin(t * Math.PI) * 26;
      ctx.fillStyle = k % 2 ? PAL.saffron : PAL.turmeric; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function paintAudience(ctx, W, seed) {
  // the village in front, in the dark: heads and shoulders, turbans, a child on a shoulder
  const base = 720;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const rows = [{ y: 690, sc: 1.0, n: Math.ceil(W / 64), c: '#120c09' }, { y: 720, sc: 1.25, n: Math.ceil(W / 84), c: '#0c0806' }];
  for (const r of rows) {
    for (let i = 0; i < r.n; i++) {
      const x = (i + rnd() * 0.6) * (W / r.n), sc = r.sc * (0.85 + rnd() * 0.3);
      const hy = r.y - 52 * sc;
      ctx.fillStyle = r.c;
      ctx.beginPath(); ctx.ellipse(x, r.y + 6, 34 * sc, 30 * sc, 0, Math.PI, 0); ctx.fill();   // shoulders
      ctx.beginPath(); ctx.ellipse(x, hy, 15 * sc, 18 * sc, 0, 0, 7); ctx.fill();              // head
      const kind = rnd();
      if (kind < 0.25) { ctx.beginPath(); ctx.ellipse(x, hy - 11 * sc, 19 * sc, 11 * sc, 0, 0, 7); ctx.fill(); }      // turban
      else if (kind < 0.45) { ctx.beginPath(); ctx.arc(x - 10 * sc, hy - 6 * sc, 8 * sc, 0, 7); ctx.fill(); }          // bun
      else if (kind < 0.5) { ctx.beginPath(); ctx.ellipse(x + 4 * sc, hy - 34 * sc, 10 * sc, 12 * sc, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 4 * sc, hy - 16 * sc, 13 * sc, 10 * sc, 0, Math.PI, 0); ctx.fill(); } // child
      // warm rim light from the lamps
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#c8721f'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(x, hy, 15 * sc, 18 * sc, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.restore();
    }
  }
  void base;
}

function paintCurtainHalf(ctx, w, h, side) {
  // deep madder, gathered in folds, with a turmeric border and lotus hem
  const g = ctx.createLinearGradient(0, 0, w, 0);
  const n = 9;
  for (let i = 0; i <= n; i++) { const k = i / n; g.addColorStop(k, i % 2 ? '#8a2434' : '#5e1522'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = pattern(ctx, 'flowerDots', null, PAL.turmeric, 1.2); ctx.fillRect(0, 0, w, h); ctx.restore();
  // border on the inner edge and the hem
  const bx = side < 0 ? w - 30 : 0;
  shape(ctx, rectPts(bx, 0, 30, h), { fill: PAL.turmeric, pattern: pattern(ctx, 'zigzag', null, PAL.madder, 0.9), w: 1.6, seed: 3, amp: 0.4 });
  shape(ctx, rectPts(0, h - 44, w, 44), { fill: PAL.turmeric, pattern: pattern(ctx, 'lotusRow', null, PAL.madder, 1.1), w: 1.6, seed: 4, amp: 0.4 });
  for (let x = 14; x < w; x += 28) { ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.moveTo(x - 6, h); ctx.lineTo(x + 6, h); ctx.lineTo(x, h + 12); ctx.closePath(); ctx.fill(); }
}

// ---------------------------------------------------------------- actors on stage
export class Actor {
  constructor(id, stageName, o = {}) {
    const spec = character(id, stageName);
    this.id = id; this.charId = id;
    this.fig = new LiveFigure(spec, { pose: o.pose || 'stand', facing: o.facing ?? 1, idle: true, stepFps: 12 });
    this.fig.scale = ACT * (o.scale || 1);
    this.x = o.x ?? stageX(0.5); this.y = FLOOR + (o.y || 0) * ACT; this.lastX = this.x; this.walkD = 0; this.walking = false;
    this.hold = o.pose || 'stand';
    this.colour = col(spec.colour.main);
  }
  get view() { return this.fig.view; }
  setPose(p, dur = 0.7) { this.hold = p; if (!this.walking) this.fig.setPose(p, dur); }
  update(dt) {
    const dx = this.x - this.lastX; this.lastX = this.x;
    const moving = Math.abs(dx) > 0.15;
    if (moving) {
      if (!this.walking) { this.walking = true; this.walkD = 0; }
      if (!this.keepFace) this.fig.facing = dx > 0 ? 1 : -1;
      this.walkD += Math.abs(dx);
      // a four-drawing walk, each drawing held: about seven steps a second at stage pace
      const step = WALK[Math.floor(this.walkD / 17) % 4];
      if (this.fig.to !== step) this.fig.setPose(step, 0, 'snap');
    } else if (this.walking) { this.walking = false; this.fig.setPose(this.hold, 0.4); }
    this.fig.update(dt);
    this.fig.x = this.x; this.fig.y = this.y;
  }
  sync() { this.fig.sync(); }
}

// ---------------------------------------------------------------- the stage
export class StageView {
  constructor() {
    this.view = new Container();
    this.t = 0;
    this.actors = new Map();
    this.props = new Map();
    this.build();
  }

  build() {
    const { W, pl, pr } = stageBox();
    this.box = stageBox();
    const v = this.view;
    // night beyond the canopy
    const bg = new Graphics().rect(0, 0, W, 720).fill(0x1d1613);
    // the painted cloth, hung on a rod
    this.clothHolder = new Container();
    this.clothHolder.position.set(pl + 14, CLOTH_TOP);
    this.cloth = new Container();
    this.clothHolder.addChild(this.cloth);
    this.clothW = pr - pl - 28;
    const clothMask = new Graphics().rect(0, 0, this.clothW, 720).fill(0xffffff);
    this.clothHolder.addChild(clothMask); this.cloth.mask = clothMask;
    this.clothShade = new Graphics();
    this.clothShade.rect(0, 0, this.clothW, 520).fill({ color: 0x1d1613, alpha: 0.18 });
    this.clothHolder.addChild(this.clothShade);
    const rod = new Painted(this.clothW + 40, 30, 20, 15, app.scale);
    rod.paint((ctx) => {
      line(ctx, [[-10, 0], [this.clothW + 10, 0]], { w: 7, color: PAL.black, flat: true, seed: 2 });
      line(ctx, [[-8, 0], [this.clothW + 8, 0]], { w: 3.5, color: PAL.gold, flat: true, seed: 2 });
      for (const x of [-14, this.clothW + 14]) { ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.arc(x, 0, 8, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 2; ctx.stroke(); }
      for (let x = 20; x < this.clothW; x += 70) { ctx.strokeStyle = PAL.black; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, 4, 6, 0, 7); ctx.stroke(); }
    });
    rod.view.position.set(pl + 14, CLOTH_TOP - 4);
    // platform, actors, props
    const floor = new Painted(W, 100, 0, 0, app.scale); floor.paint((ctx) => { ctx.translate(0, -(FLOOR - 26)); paintFloor(ctx, W, pl, pr); }); floor.view.position.set(0, FLOOR - 26);
    this.floorSprite = floor;
    this.propsLayer = new Container();
    this.actorsLayer = new Container(); this.actorsLayer.sortableChildren = true;
    this.frontProps = new Container();
    // footlights
    const apron = new Painted(W, 80, 0, 0, app.scale); apron.paint((ctx) => { ctx.translate(0, -(EDGE - 6)); paintApron(ctx, W, pl, pr); }); apron.view.position.set(0, EDGE - 6);
    this.lamps = [];
    const lampsLayer = new Container(), glowLayer = new Container();
    const n = Math.max(5, Math.round((pr - pl) / 150));
    for (let i = 0; i < n; i++) {
      const x = pl + 40 + (i + 0.5) * ((pr - pl - 80) / n);
      const cup = new Painted(40, 24, 20, 12, app.scale); cup.paint((ctx) => M.diya(ctx, 0, 6, 16, false, 0));
      cup.view.position.set(x, EDGE - 4);
      const fl = new Flame(x, EDGE - 10, 22);
      const gl = new Glow(x, EDGE - 16, 56, 0xffa040, { alpha: 0.38, flicker: 0.18 });
      lampsLayer.addChild(cup.view, fl.view); glowLayer.addChild(gl.view);
      this.lamps.push(fl, gl);
    }
    // the light the lamps throw up onto the actors, and the torches on the posts
    this.wash = new Glow(W / 2, FLOOR - 110, W * 0.48, 0xff9a3c, { alpha: 0.15, flicker: 0.04 });
    this.wash.view.scale.y = 0.5;
    glowLayer.addChild(this.wash.view);
    this.torches = [];
    for (const [x, sgn] of [[pl / 2 + 4, 1], [pr + (W - pr) / 2 - 4, -1]]) {
      const fl = new Flame(x, 268, 54), gl = new Glow(x, 250, 300, 0xffa347, { alpha: 0.42, flicker: 0.1 });
      const big = new Glow(x + sgn * 120, 360, 520, 0xff8a2a, { alpha: 0.16, flicker: 0.06 });
      this.torches.push(fl, gl, big); glowLayer.addChild(gl.view, big.view);
      this.torchFlames = (this.torchFlames || []).concat(fl);
    }
    // the speaker's light
    this.spot = new Glow(W / 2, FLOOR - 120, 190, 0xffe2a8, { alpha: 0, flicker: 0.02 });
    glowLayer.addChild(this.spot.view);
    // posts and canopy (the frame of the picture)
    const pw = pl + 30;
    const left = new Painted(pw + 120, 640, 0, 0, app.scale); left.paint((ctx) => { ctx.translate(60, 0); paintPillar(ctx, pw, 640, 1); }); left.view.position.set(pl / 2 - pw / 2 - 60, 0);
    const right = new Painted(pw + 120, 640, 0, 0, app.scale); right.paint((ctx) => { ctx.translate(60, 0); paintPillar(ctx, pw, 640, -1); }); right.view.position.set(pr + (W - pr) / 2 - pw / 2 - 60, 0);
    const torchCups = new Painted(W, 300, 0, 0, app.scale);
    torchCups.paint((ctx) => { for (const x of [pl / 2 + 4, pr + (W - pr) / 2 - 4]) { shape(ctx, [[x - 14, 268], [x + 14, 268], [x + 8, 290], [x - 8, 290]], { fill: PAL.iron, w: 1.6, seed: 2 }); line(ctx, [[x, 290], [x, 300]], { w: 4, seed: 3 }); } });
    const canopy = new Painted(W, VALANCE + 40, 0, 0, app.scale); canopy.paint((ctx) => paintCanopy(ctx, W));
    const torchLayer = new Container(); for (const f of this.torchFlames) torchLayer.addChild(f.view);
    // the audience
    const aud = new Painted(W, 140, 0, 0, app.scale); aud.paint((ctx) => { ctx.translate(0, -580); paintAudience(ctx, W, 77); }); aud.view.position.set(0, 580);
    this.audience = aud;
    // the curtain
    this.curtain = new Container();
    const ch = EDGE + 10, cw = (pr - pl) / 2 + 30;
    this.curtL = new Painted(cw, ch + 14, 0, 0, app.scale); this.curtL.paint((ctx) => paintCurtainHalf(ctx, cw, ch, -1));
    this.curtR = new Painted(cw, ch + 14, 0, 0, app.scale); this.curtR.paint((ctx) => paintCurtainHalf(ctx, cw, ch, 1));
    this.curtain.addChild(this.curtL.view, this.curtR.view);
    this.curtainK = 0; // 0 closed, 1 open
    this.titleCard = new Container(); this.curtain.addChild(this.titleCard);
    // particles: petals drifting from the garlands, dust and sparks in the torchlight
    this.petals = new Particles(160);
    this.sparks = new Particles(160);
    // order, back to front
    v.addChild(bg, this.clothHolder, rod.view, floor.view, this.propsLayer, this.actorsLayer, this.frontProps, this.curtain, apron.view, lampsLayer,
      glowLayer, torchCups.view, left.view, right.view, torchLayer, canopy.view, this.sparks.view, this.petals.view, aud.view);
    this.glowLayer = glowLayer;
    this.darkness = new Graphics().rect(0, 0, W, 720).fill(0x14183a);
    this.darkness.blendMode = 'multiply'; this.darkness.alpha = 0;
    v.addChildAt(this.darkness, v.getChildIndex(glowLayer));
    this.decor = [rod, floor, apron, left, right, torchCups, canopy, aud, this.curtL, this.curtR];
    this.placeCurtain();
  }

  // the director's coordinate calls (shared with the scene)
  x(at) { return stageX(at); }
  offstage(side) { const b = stageBox(); return side === 'left' ? b.pl - 110 : b.pr + 110; }
  get floor() { return FLOOR; }
  get act() { return ACT; }
  setLook() {}
  setLamps() {}
  mantra() {}

  // ------------------------------------------------------------ the painted cloth
  /** Hang a backdrop on the cloth. */
  setCloth(id, style = 'bharni-bright', colour = true) {
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    this.clothId = id;
    const bd = new BackdropView(id, style, { colour });
    bd.view.scale.set(CLOTH_K);
    // centre the cloth on the painting's own middle so the best part shows
    this.clothCam = 640 - (this.clothW / CLOTH_K) / 2;
    bd.view.x = -this.clothCam * CLOTH_K;
    bd.update(this.clothCam, this.clothW / CLOTH_K);
    this.cloth.addChild(bd.view);
    this.backdrop = bd;
  }
  /** 0 = rolled up, 1 = hanging. */
  set clothDrop(k) { this._drop = k; this.cloth.scale.y = Math.max(0.001, k); this.clothShade.scale.y = Math.max(0.001, k); }
  get clothDrop() { return this._drop ?? 1; }

  // ------------------------------------------------------------ curtain
  placeCurtain() {
    const { pl, pr } = this.box, k = this.curtainK, cw = (pr - pl) / 2 + 30;
    // each half slides out and gathers toward its post
    const gather = 1 - k * 0.84;
    this.curtL.sprite.scale.set(gather / this.curtL.s, 1 / this.curtL.s);
    this.curtR.sprite.scale.set(gather / this.curtR.s, 1 / this.curtR.s);
    this.curtL.view.position.set(pl - 20 - k * 70, 0);
    this.curtR.view.position.set(pr + 20 - cw * gather + k * 70, 0);
    this.titleCard.alpha = Math.max(0, 1 - k * 6);
    this.titleCard.position.set(app.W / 2, 330);
  }
  set curtainOpen(k) { this.curtainK = k; this.placeCurtain(); }
  get curtainOpen() { return this.curtainK; }

  /** A painted title plate hung on the closed curtain. */
  setTitle(title, sub) {
    this.titleArgs = [title, sub];
    for (const c of this.titleCard.removeChildren()) c.destroy();
    if (!title) return;
    const p = new Painted(900, 220, 450, 110, app.scale);
    p.paint((ctx) => {
      plate(ctx, title, 0, sub ? -18 : 0, { size: 46, font: '"Yatra One", serif', padX: 40, padY: 16, gap: PAL.turmeric, color: PAL.madder, seed: 5 });
      if (sub) plate(ctx, sub, 0, 52, { size: 20, italic: true, padX: 16, padY: 6, seed: 6 });
    });
    this.titleCard.addChild(p.view);
  }

  // ------------------------------------------------------------ cast and props
  addActor(key, id, stageName, o) {
    this.removeActor(key);
    const a = new Actor(id, stageName, o);
    a.key = key;
    this.actors.set(key, a);
    this.actorsLayer.addChild(a.view);
    return a;
  }
  removeActor(key) { const a = this.actors.get(key); if (a) { a.fig.destroy(); this.actors.delete(key); } }
  clearActors() { for (const k of [...this.actors.keys()]) this.removeActor(k); }
  addProp(key, name, x, o = {}) {
    this.removeProp(key);
    const p = new PropView(name, { scale: ACT, ...o });
    p.view.position.set(x, FLOOR + (o.y || 0) * ACT);
    (o.front ? this.frontProps : this.propsLayer).addChild(p.view);
    p.x = x; this.props.set(key, p);
    return p;
  }
  removeProp(key) { const p = this.props.get(key); if (p) { p.destroy(); this.props.delete(key); } }
  clearProps() { for (const k of [...this.props.keys()]) this.removeProp(k); }

  /** 0 = full lamp light, 1 = deep night. */
  set dark(k) { this._dark = k; this.darkness.alpha = k * 0.55; }
  get dark() { return this._dark || 0; }

  /** Light the one who speaks (null for narration). */
  speaker(actor) {
    for (const a of this.actors.values()) a.fig.talking = a === actor;
    this.spotTarget = actor || null;
  }

  // ------------------------------------------------------------ every frame
  update(dt) {
    this.t += dt;
    // a faint hand-held drift: the frame never quite stops, so a held scene still breathes
    if (!this.still) this.view.pivot.set(Math.sin(this.t * 0.37) * 1.1 + Math.sin(this.t * 0.11) * 0.8, Math.sin(this.t * 0.29) * 0.7);
    for (const a of this.actors.values()) a.update(dt);
    // sort by feet so nearer actors overlap farther ones
    for (const a of this.actors.values()) a.view.zIndex = a.y + (a.z || 0);
    for (const p of this.props.values()) p.update(dt);
    // petals now and then, more when something good happens
    if (Math.random() < dt * 1.6 * (this.festive || 1)) {
      const { W } = this.box;
      this.petals.emit({ x: Math.random() * W, y: 90 + Math.random() * 30, vx: (Math.random() - 0.5) * 20, vy: 40 + Math.random() * 30, life: 9, size: 7 + Math.random() * 4, color: Math.random() < 0.6 ? 0xe58a1f : 0xe6ac17, drag: 0.05, spin: (Math.random() - 0.5) * 4, fade: 0, floor: 700 });
    }
    for (const f of this.torchFlames) if (Math.random() < dt * 6) this.sparks.emit({ x: f.x + (Math.random() - 0.5) * 14, y: f.y - 40, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 60, life: 1.4, size: 3.5, color: 0xffc35a, blend: 'add', drag: 0.3 });
    this.petals.update(dt); this.sparks.update(dt);
    // the speaker's light follows whoever speaks
    const target = this.spotTarget;
    const want = target ? 0.22 : 0;
    this.spot.base += (want - this.spot.base) * Math.min(1, dt * 5);
    if (target) { this.spot.x += (target.x - this.spot.x) * Math.min(1, dt * 7); this.spot.y += (target.y - 110 * ACT - this.spot.y) * Math.min(1, dt * 7); }
  }

  sync() {
    for (const a of this.actors.values()) a.sync();
    for (const l of this.lamps) l.sync(this.t);
    for (const l of this.torches) l.sync(this.t);
    this.wash.sync(this.t); this.spot.sync(this.t);
  }

  /** Rebuild the decor for a new screen size, keeping the cast, props and cloth. */
  rebuild() {
    const parent = this.view.parent, idx = parent ? parent.getChildIndex(this.view) : 0;
    const actors = [...this.actors.values()], props = [...this.props.values()];
    for (const a of actors) a.view.parent && a.view.parent.removeChild(a.view);
    for (const p of props) p.view.parent && p.view.parent.removeChild(p.view);
    const cloth = this.clothId, curtain = this.curtainK, title = this.titleArgs, drop = this.clothDrop, dark = this.dark;
    if (this.backdrop) { this.backdrop.destroy(); this.backdrop = null; }
    for (const d of this.decor) d.destroy();
    this.petals.clear(); this.sparks.clear();
    const old = this.view;
    this.view = new Container();
    this.build();
    old.destroy({ children: true });
    for (const a of actors) this.actorsLayer.addChild(a.view);
    for (const p of props) this.propsLayer.addChild(p.view);
    if (cloth) this.setCloth(cloth);
    this.clothDrop = drop; this.curtainOpen = curtain; this.dark = dark;
    if (title) this.setTitle(...title);
    if (parent) parent.addChildAt(this.view, idx);
  }

  destroy() { this.clearActors(); this.clearProps(); if (this.backdrop) this.backdrop.destroy(); this.petals.clear(); this.sparks.clear(); this.view.destroy({ children: true }); }
}

export { CLOTH_TOP, EDGE, hex };
