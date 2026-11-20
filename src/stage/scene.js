// The scene: how story chapters are shown now. Each scene is a painted page you look into.
// It mixes techniques from several traditions, each where it serves the moment:
//   - Pahari miniature: the folio itself, a painted page with a floral margin and red rules
//   - pop-up paper book: the place is three cut-paper planes that rise from the fold, cast
//     soft paper shadows and slide at different speeds as the eye moves (real depth, no 3D)
//   - shadow-theatre light: in the evening and at night the scene is lit by its lamps; fewer
//     lamps means darker, never a blue filter
//   - watercolour: a dawn wash with pigment blooms, for river and morning scenes
//   - firefly light: mantras and blessings travel as drifting points of gold
// The director drives it through the same calls it used for the old stage.
import { Container, Sprite, Graphics, ColorMatrixFilter } from 'pixi.js';
import { app, makeCanvas } from '../core/app.js';
import { PAL, col } from '../art/palette.js';
import { shape, line, rectPts, plate, dots } from '../art/ink.js';
import { pattern } from '../art/patterns.js';
import * as M from '../art/motifs.js';
import { BackdropView, Painted, PropView, Glow, Particles } from '../gfx/world.js';
import { softDisc, retain, dropTexture } from '../gfx/tex.js';
import { LiveFigure } from '../gfx/live.js';
import { character, WALK } from '../art/figures.js';

export const FLOOR = 610;          // the actors' feet, on the painted ground plane
export const ACT = 1.12;

/** The looks a chapter can ask for. Each is a few dials, not a separate renderer. */
export const LOOKS = {
  folio: { lamps: 0, dark: 0, wash: 0, grade: null },                       // a clear painted page
  evening: { lamps: 4, dark: 0.42, wash: 0, grade: 'warm' },                // court by lamplight
  dawn: { lamps: 0, dark: 0, wash: 0.55, grade: 'dawn' },                   // watercolour morning
  dusk: { lamps: 0, dark: 0.25, wash: 0.25, grade: 'dusk' },                // a land gone grey
  night: { lamps: 2, dark: 0.78, wash: 0, grade: 'warm' },                  // the vigil
};

function frameBox() {
  const W = app.W;
  return { W, side: Math.max(30, Math.round(W * 0.034)), top: 18, bottom: 20 };
}
export function sceneBox() { const f = frameBox(); return { W: f.W, x0: f.side + 110, x1: f.W - f.side - 110, pl: f.side, pr: f.W - f.side }; }
export function sceneX(at) { const b = sceneBox(); return b.x0 + (b.x1 - b.x0) * at; }

// ---------------------------------------------------------------- the folio
function paintFolio(ctx, W, H, f) {
  // margin: warm paper with a gold vine; then vermilion and blue rules, as on Kangra folios
  ctx.save();
  ctx.fillStyle = '#efd9b0';
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(f.side, f.top, W - 2 * f.side, H - f.top - f.bottom); ctx.fill('evenodd');
  ctx.globalAlpha = 0.25; ctx.fillStyle = pattern(ctx, 'flowerDots', null, PAL.gold, 1.1);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(f.side, f.top, W - 2 * f.side, H - f.top - f.bottom); ctx.fill('evenodd');
  ctx.restore();
  // a meandering vine in the side margins
  for (const x0 of [f.side / 2, W - f.side / 2]) {
    const pts = []; for (let y = 10; y < H - 10; y += 14) pts.push([x0 + Math.sin(y / 22) * f.side * 0.22, y]);
    line(ctx, pts, { w: 1.6, color: PAL.gold, smooth: true, seed: x0, amp: 0.3, flat: true });
    for (let y = 20; y < H - 20; y += 44) { const x = x0 + Math.sin(y / 22) * f.side * 0.22; shape(ctx, [[x, y - 6], [x + 6, y], [x, y + 6], [x - 6, y]], { fill: y % 88 < 44 ? PAL.madder : PAL.indigo, w: 1, seed: y, amp: 0.3 }); }
  }
  // the rules round the picture
  const rule = (inset, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.strokeRect(f.side - inset, f.top - inset, W - 2 * (f.side - inset), H - f.top - f.bottom + 2 * inset); };
  rule(7, 6, '#b8321f'); rule(3, 1.4, '#1d1613'); rule(10.5, 1.2, '#1d1613'); rule(1, 1.6, '#f8efd9'); rule(-1.5, 2.2, '#28367c');
}

/** A title plaque, Pahari style: a dark panel with gold rules, the words in light. */
function paintTitle(ctx, title, sub) {
  plate(ctx, title, 0, sub ? -16 : 0, { size: 44, font: '"Yatra One", serif', padX: 44, padY: 14, bg: '#2a1810', gap: PAL.gold, color: '#f2d79a', seed: 5 });
  if (sub) plate(ctx, sub, 0, 46, { size: 19, italic: true, padX: 16, padY: 5, bg: '#efd9b0', gap: '#b8321f', seed: 6 });
}

/** A wash of watercolour pigment: soft blooms with darker drying edges, multiplied over the page. */
let washCanvas = null;
function washTexture(W) {
  if (washCanvas && washCanvas.width >= W) return washCanvas;
  const c = makeCanvas(W, 720), x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, 720);
  let s = 99; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const tints = ['#f2c48a', '#bcd6d8', '#e8b9a4', '#cfe0b8', '#f4dca0'];
  for (let i = 0; i < 46; i++) {
    const cx = r() * W, cy = r() * 560, rad = 60 + r() * 220, tint = tints[i % tints.length];
    const g = x.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
    g.addColorStop(0, tint + '55'); g.addColorStop(0.85, tint + '44'); g.addColorStop(0.97, tint + 'aa'); g.addColorStop(1, tint + '00');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
  }
  washCanvas = c;
  return c;
}

// ---------------------------------------------------------------- actors
export class Actor {
  constructor(id, stageName, o = {}) {
    const spec = character(id, stageName);
    this.id = id; this.charId = id;
    this.fig = new LiveFigure(spec, { pose: o.pose || 'stand', facing: o.facing ?? 1, idle: true, stepFps: 12 });
    this.fig.scale = ACT * (o.scale || 1);
    this.x = o.x ?? sceneX(0.5); this.y = FLOOR + (o.y || 0) * ACT; this.lastX = this.x; this.walkD = 0; this.walking = false;
    this.hold = o.pose || 'stand';
    this.colour = col(spec.colour.main);
  }
  get view() { return this.fig.view; }
  setPose(p, dur = 0.7) { this.hold = p; if (!this.walking) this.fig.setPose(p, dur); }
  update(dt) {
    const dx = this.x - this.lastX; this.lastX = this.x;
    if (Math.abs(dx) > 0.15) {
      if (!this.walking) { this.walking = true; this.walkD = 0; }
      if (!this.keepFace) this.fig.facing = dx > 0 ? 1 : -1;
      this.walkD += Math.abs(dx);
      const step = WALK[Math.floor(this.walkD / 22) % 4];
      if (this.fig.to !== step) this.fig.setPose(step, 0, 'snap');
    } else if (this.walking) { this.walking = false; this.fig.setPose(this.hold, 0.45); }
    this.fig.update(dt);
    this.fig.x = this.x; this.fig.y = this.y;
  }
  sync() { this.fig.sync(); }
}

// ---------------------------------------------------------------- the scene
export class SceneView {
  constructor(o = {}) {
    this.view = new Container();
    this.t = 0; this.actors = new Map(); this.props = new Map();
    this.look = LOOKS[o.look] || LOOKS.folio; this.lookName = o.look || 'folio';
    this.popK = 0; this.cam = 0; this.camTo = 0; this.festive = 1;
    this.build();
  }

  // the director uses these instead of fixed stage numbers
  x(at) { return sceneX(at); }
  offstage(side) { const b = sceneBox(); return side === 'left' ? b.pl - 120 : b.pr + 120; }
  get floor() { return FLOOR; }
  get act() { return ACT; }

  build() {
    const f = frameBox(), W = f.W;
    this.box = sceneBox();
    const v = this.view;
    this.paper = new Graphics().rect(0, 0, W, 720).fill(0xf2e4c3);
    // the three planes of the pop-up page, each hinged at the bottom fold
    this.world = new Container();
    this.planes = { back: new Container(), mid: new Container(), front: new Container() };
    for (const k of ['back', 'mid', 'front']) { const p = this.planes[k]; p.pivot.y = 720; p.y = 720; this.world.addChild(p); }
    // the watercolour wash sits over the back plane only, so figures stay crisp
    this.wash = new Sprite(); this.wash.blendMode = 'multiply'; this.wash.alpha = 0;
    this.planes.back.addChild(this.wash);
    this.propsLayer = new Container(); this.actorsLayer = new Container(); this.actorsLayer.sortableChildren = true; this.frontProps = new Container();
    this.cast = new Container(); this.cast.addChild(this.propsLayer, this.actorsLayer, this.frontProps);
    this.world.addChild(this.cast);
    // light: darkness multiplied over the scene, lamps added on top
    this.darkness = new Graphics().rect(0, 0, W, 720).fill(0x2a1a22); this.darkness.blendMode = 'multiply'; this.darkness.alpha = 0;
    this.glows = new Container(); this.lamps = [];
    this.spot = new Glow(W / 2, FLOOR - 140, 210, 0xffe2a8, { alpha: 0, flicker: 0.02 });
    this.glows.addChild(this.spot.view);
    this.motes = new Particles(260); this.sparks = this.motes; this.petals = new Particles(80);
    // the folio frame and the title plaque
    const folio = new Painted(W, 720, 0, 0, app.scale); folio.paint((ctx) => paintFolio(ctx, W, 720, f));
    this.folio = folio;
    this.titleCard = new Container(); this.titleCard.position.set(W / 2, 330);
    this.grade = new ColorMatrixFilter(); this.world.filters = [this.grade];
    v.addChild(this.paper, this.world, this.darkness, this.glows, this.motes.view, this.petals.view, this.titleCard, folio.view);
    this.decor = [folio];
    this.applyLook();
    this.place();
  }

  // ------------------------------------------------------------ looks and light
  setLook(name) { this.look = LOOKS[name] || LOOKS.folio; this.lookName = name; this.applyLook(); }
  applyLook() {
    const L = this.look;
    this.dark = L.dark;
    if (L.wash) { const c = washTexture(app.W); this.wash.texture = retain(c); this.washCv = c; this.wash.width = app.W; this.wash.height = 720; }
    this.wash.alpha = L.wash;
    const g = this.grade;
    if (L.grade === 'warm') g.matrix = [1.06, 0.04, 0, 0, 0.01, 0.02, 0.98, 0, 0, 0, 0, 0, 0.86, 0, -0.01, 0, 0, 0, 1, 0];
    else if (L.grade === 'dawn') g.matrix = [1.02, 0.03, 0.02, 0, 0.03, 0.02, 1.0, 0.03, 0, 0.03, 0.02, 0.04, 0.98, 0, 0.03, 0, 0, 0, 1, 0];
    else if (L.grade === 'dusk') g.matrix = [0.92, 0.08, 0.06, 0, 0.02, 0.06, 0.84, 0.06, 0, 0, 0.05, 0.06, 0.78, 0, 0, 0, 0, 0, 1, 0];
    g.enabled = !!L.grade;
    this.setLamps(L.lamps);
  }
  /** Light n lamps along the scene. Brightness is the number of lamps, not a filter. */
  setLamps(n) {
    for (const l of this.lamps) { l.glow.view.destroy(); if (l.prop) this.removeProp(l.prop); }
    this.lamps = [];
    if (!n) return;
    for (let i = 0; i < n; i++) {
      const at = n === 1 ? 0.5 : i / (n - 1), x = this.x(-0.04 + at * 1.08);
      const key = 'lamp' + i;
      this.addProp(key, 'lampStand', x, { y: 6 });
      const glow = new Glow(x, FLOOR - 92 * ACT, 260, 0xffa347, { alpha: 0.5, flicker: 0.12 });
      this.glows.addChild(glow.view); this.lamps.push({ glow, prop: key, x });
    }
  }
  set dark(k) { this._dark = k; this.darkness.alpha = k; }
  get dark() { return this._dark || 0; }
  /** Kept for the director's light verb. */
  get wash2() { return null; }

  // ------------------------------------------------------------ the painted place
  setCloth(id, style = 'bharni-bright', colour = true) {
    if (this.bd) for (const b of Object.values(this.bd)) b.destroy();
    this.clothId = id;
    this.bd = {};
    for (const part of ['back', 'mid', 'front']) {
      const b = new BackdropView(id, style, { colour, part, shadow: part !== 'back' });
      this.planes[part].addChildAt(b.view, 0);
      this.bd[part] = b;
    }
    this.place();
  }
  /** 0 = folded flat, 1 = standing: the pop-up rises plane by plane. */
  set clothDrop(k) { this.popK = k; this.place(); }
  get clothDrop() { return this.popK; }
  set curtainOpen(k) { this.popK = k; this.place(); }
  get curtainOpen() { return this.popK; }

  place() {
    const k = this.popK, W = app.W;
    const ease = (x) => { x = Math.max(0, Math.min(1, x)); const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    const stagger = { back: 0, mid: 0.22, front: 0.4 };
    const par = { back: 0.35, mid: 0.7, front: 1 };
    const camX0 = 640 - W / 2;
    for (const part of ['back', 'mid', 'front']) {
      const p = this.planes[part];
      const kk = ease((k - stagger[part]) / (1 - stagger[part] * 0.6));
      p.scale.y = Math.max(0.001, kk);
      const cx = camX0 + this.cam * par[part];
      p.x = 0;
      if (this.bd) { this.bd[part].view.x = -cx; this.bd[part].update(cx, W); }
    }
    // the cast stands with the front plane and rises after it
    const kc = Math.max(0, Math.min(1, (k - 0.6) / 0.4));
    this.cast.alpha = kc; this.cast.x = -this.cam;
    this.glows.alpha = kc; this.glows.x = -this.cam;
    this.titleCard.alpha = Math.max(0, 1 - k * 2.5);
  }

  setTitle(title, sub) {
    this.titleArgs = [title, sub];
    for (const c of this.titleCard.removeChildren()) c.destroy();
    if (!title) return;
    const p = new Painted(1000, 220, 500, 110, app.scale);
    p.paint((ctx) => paintTitle(ctx, title, sub));
    this.titleCard.addChild(p.view);
  }

  // ------------------------------------------------------------ cast and props
  addActor(key, id, stageName, o) {
    this.removeActor(key);
    const a = new Actor(id, stageName, o); a.key = key;
    this.actors.set(key, a); this.actorsLayer.addChild(a.view);
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
  clearProps() { for (const k of [...this.props.keys()]) if (!k.startsWith('lamp')) this.removeProp(k); }

  /** Light the one who speaks, and let the eye drift a little toward them (the planes part). */
  speaker(actor) {
    for (const a of this.actors.values()) a.fig.talking = a === actor;
    this.spotTarget = actor || null;
    if (actor) this.camTo = Math.max(-70, Math.min(70, (actor.x - app.W / 2) * 0.12));
  }

  /** A mantra or blessing: points of gold drift from one figure and settle into others. */
  mantra(from, tos) {
    if (!from || !tos.length) return;
    this.flights = this.flights || [];
    for (let i = 0; i < 70; i++) {
      const to = tos[i % tos.length];
      this.flights.push({ t: -i * 0.035, dur: 1.9 + (i % 7) * 0.12, from: { x: from.x + (Math.random() - 0.5) * 30, y: from.y - 120 * ACT }, to, a: Math.random() * Math.PI * 2, r: 30 + Math.random() * 60, p: null });
    }
  }

  // ------------------------------------------------------------ every frame
  update(dt) {
    this.t += dt;
    this.cam += (this.camTo - this.cam) * Math.min(1, dt * 0.8);
    for (const a of this.actors.values()) a.update(dt);
    for (const a of this.actors.values()) a.view.zIndex = a.y + (a.z || 0);
    for (const p of this.props.values()) p.update(dt);
    // drifting motes in the light; petals when something good happens
    const dusty = this.look.lamps || this.lookName === 'dawn';
    if (dusty && Math.random() < dt * 5) this.motes.emit({ x: Math.random() * app.W, y: 200 + Math.random() * 380, vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 6, life: 6, size: 3.2, color: 0xffd28a, blend: 'add', alpha: 0.55, drag: 0.02 });
    if (this.festive > 1 && Math.random() < dt * this.festive) this.petals.emit({ x: Math.random() * app.W, y: 20, vx: (Math.random() - 0.5) * 20, vy: 50 + Math.random() * 30, life: 9, size: 8, color: Math.random() < 0.6 ? 0xe58a1f : 0xd9788d, spin: 4, drag: 0.05, fade: 0, floor: 715 });
    if (this.flights) {
      for (const f of this.flights) {
        f.t += dt; if (f.t < 0) continue;
        const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k);
        const tx = f.to.x - this.cam, ty = f.to.y - 110 * ACT;
        const x = f.from.x - this.cam + (tx - f.from.x + this.cam) * e + Math.cos(f.a + k * 6) * f.r * Math.sin(k * Math.PI);
        const y = f.from.y + (ty - f.from.y) * e + Math.sin(f.a + k * 6) * f.r * 0.5 * Math.sin(k * Math.PI) - Math.sin(k * Math.PI) * 60;
        if (!f.p) f.p = this.motes.emit({ x, y, life: 99, size: 6, color: 0xffd36a, blend: 'add', drag: 0, fade: 0 });
        f.p.x = x; f.p.y = y; f.p.vx = 0; f.p.vy = 0;
        if (k >= 1) { f.p.life = f.p.t + 0.3; f.p.fade = 1; f.done = true; }
      }
      this.flights = this.flights.filter((f) => !f.done);
      if (!this.flights.length) this.flights = null;
    }
    this.motes.update(dt); this.petals.update(dt);
    const target = this.spotTarget;
    this.spot.base += ((target ? 0.2 + this.dark * 0.25 : 0) - this.spot.base) * Math.min(1, dt * 4);
    if (target) { this.spot.x += (target.x - this.spot.x) * Math.min(1, dt * 6); this.spot.y += (target.y - 115 * ACT - this.spot.y) * Math.min(1, dt * 6); }
    this.place();
  }

  sync() {
    for (const a of this.actors.values()) a.sync();
    for (const l of this.lamps) l.glow.sync(this.t);
    this.spot.sync(this.t);
  }

  rebuild() {
    const actors = [...this.actors.values()], props = [...this.props.entries()].filter(([k]) => !k.startsWith('lamp'));
    for (const a of actors) a.view.parent && a.view.parent.removeChild(a.view);
    for (const [, p] of props) p.view.parent && p.view.parent.removeChild(p.view);
    const parent = this.view.parent, idx = parent ? parent.getChildIndex(this.view) : 0;
    const cloth = this.clothId, title = this.titleArgs, k = this.popK, look = this.lookName;
    if (this.bd) for (const b of Object.values(this.bd)) b.destroy(); this.bd = null;
    for (const l of this.lamps) if (l.prop) { const p = this.props.get(l.prop); if (p) { p.destroy(); this.props.delete(l.prop); } }
    this.lamps = [];
    for (const d of this.decor) d.destroy();
    this.motes.clear(); this.petals.clear();
    const old = this.view; this.view = new Container(); this.build(); old.destroy({ children: true });
    for (const a of actors) this.actorsLayer.addChild(a.view);
    for (const [, p] of props) this.propsLayer.addChild(p.view);
    this.setLook(look);
    if (cloth) this.setCloth(cloth);
    this.popK = k; if (title) this.setTitle(...title); this.place();
    if (parent) parent.addChildAt(this.view, idx);
  }

  destroy() {
    this.clearActors();
    for (const k of [...this.props.keys()]) this.removeProp(k);
    if (this.bd) for (const b of Object.values(this.bd)) b.destroy();
    if (this.washCv) dropTexture(this.washCv);
    this.motes.clear(); this.petals.clear();
    for (const d of this.decor) d.destroy();
    this.view.destroy({ children: true });
  }
}
