// Live figures: the existing character designs, drawn by the same renderer, but alive.
// A figure blends between poses (every joint travels together, like a puppet on a string),
// breathes, blinks, and can nod while it speaks. Each in-between is painted once into a
// texture and cached, so a figure that keeps repeating itself costs nothing to draw.
import { Container, Sprite, Texture } from 'pixi.js';
import { drawFigure, POSES, blendPose, BASE_U } from '../art/figures.js';
import { hashStr } from '../core/rng.js';
import { app } from '../core/app.js';

const cache = new Map();
const MAX = 260;
let frame = 0;
let texScale = 1;

/** Called on resize: figures are painted at the screen's pixel density (within limits). */
export function setFigureScale(s) {
  const v = Math.max(0.75, Math.min(1.75, Math.round(s * 4) / 4));
  if (v !== texScale) { texScale = v; flushFigures(); }
}
export function flushFigures() { for (const e of cache.values()) e.tex.destroy(true); cache.clear(); }
export function tickFigures() {
  frame++;
  if (cache.size <= MAX) return;
  // evict the oldest textures nobody has shown for a while
  for (const [k, e] of cache) { if (cache.size <= MAX * 0.85) break; if (frame - e.used > 30) { e.tex.destroy(true); cache.delete(k); } }
}

function bounds(spec) {
  const U = BASE_U * spec.build.height;
  const bird = spec.body === 'bird';
  const halfW = bird ? U * 1.35 : U * (1.0 + (spec.build.width - 1) * 0.25 + (spec.wings ? 0.25 : 0));
  const top = bird ? U * 1.5 : U * (spec.body === 'tenHeads' ? 1.85 : 1.72), bottom = U * 0.16;
  return { halfW, top, bottom, U };
}

function paint(spec, poseName, key, o) {
  let e = cache.get(key);
  if (e) { e.used = frame; return e; }
  const { halfW, top, bottom, U } = bounds(spec);
  const s = U > 260 ? Math.min(texScale, 1.1) : texScale;
  const c = document.createElement('canvas');
  c.width = Math.ceil(halfW * 2 * s); c.height = Math.ceil((top + bottom) * s);
  const x = c.getContext('2d');
  x.scale(s, s); x.translate(halfW, top);
  drawFigure(x, spec, poseName, o);
  const tex = Texture.from(c);
  e = { tex, ax: halfW / (halfW * 2), ay: top / (top + bottom), s, used: frame };
  cache.set(key, e);
  return e;
}

const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOutBack = (k) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

export class LiveFigure {
  /**
   * o: { pose, facing, mode, stage, breathe (default true), blink (default true), idle (weight shifts),
   *      steps (in-betweens per transition), seed }
   */
  constructor(spec, o = {}) {
    this.spec = spec;
    this.U = BASE_U * spec.build.height;
    this.view = new Container();       // placed at the feet
    this.pivot = new Container();      // rotation pivot, a little above the feet
    this.sprite = new Sprite();
    this.lineSprite = null;            // shown under the colour sprite while colour drains
    this.pivot.addChild(this.sprite);
    this.view.addChild(this.pivot);
    this.seed = o.seed ?? hashStr(spec.id) % 9973;
    this.mode = o.mode || 'colour';
    this.from = o.pose || 'stand'; this.to = this.from; this.k = 1; this.t = 0; this.dur = 0.25; this.ease = easeInOut;
    this.facing = o.facing ?? 1;
    this.scale = 1; this.rot = 0; this.pivotK = 0.3; this.drain = 0; this.aim = 0; this.alpha = 1;
    this.breathe = o.breathe !== false; this.blinks = o.blink !== false; this.idle = !!o.idle;
    this.phase = (this.seed % 100) / 100 * Math.PI * 2;
    this.blinkT = 1 + (this.seed % 7) * 0.5; this.blinking = 0;
    this.steps = o.steps || 6;
    // stepped motion: the figure's drawing changes on 12 fps steps, like a puppet or a
    // hand-drawn film on twos; light, camera and particles still glide every frame (0 = smooth)
    this.stepFps = o.stepFps ?? 0;
    this.talkT = 0; this.talking = false;
    this.idleT = 3.5 + (this.seed % 5) * 0.6;
    this.heads = null;
    this.x = 0; this.y = 0;
  }

  /** Move to a pose over dur seconds. kind 'snap' jumps straight there. */
  setPose(name, dur = 0.28, kind = 'ease') {
    if (!POSES[name] && this.spec.body !== 'bird') name = 'stand';
    if (name === this.to && this.k >= 1) return;
    if (kind === 'snap' || dur <= 0 || this.spec.body === 'bird') { this.from = this.to = name; this.k = 1; return; }
    // start from wherever we are now, rounded to the nearest painted in-between
    if (this.k < 1) this.from = this.k < 0.5 ? this.from : this.to;
    this.to = name; this.k = 0; this.t = 0; this.dur = dur;
    this.ease = kind === 'pop' ? easeOutBack : easeInOut;
  }
  get pose() { return this.to; }
  get moving() { return this.k < 1; }

  update(dt) {
    if (this.k < 1) { this.t += dt; this.k = Math.min(1, this.t / this.dur); }
    this.phase += dt * (Math.PI * 2) / 3.8;
    if (this.blinks) {
      this.blinkT -= dt;
      if (this.blinking > 0) this.blinking -= dt;
      if (this.blinkT <= 0) { this.blinking = 0.13; this.blinkT = 2.4 + ((this.seed * 7 + Math.floor(app.time * 3)) % 40) / 10; }
    }
    if (this.talking) this.talkT += dt;
    // weight shifts while standing about: stand <-> stand2, slowly
    if (this.idle && this.k >= 1 && (this.to === 'stand' || this.to === 'stand2')) {
      this.idleT -= dt;
      if (this.idleT <= 0) { this.idleT = 4.5 + (this.seed % 9) * 0.5; this.setPose(this.to === 'stand' ? 'stand2' : 'stand', 1.6); }
    }
  }

  texture(mode) {
    const spec = this.spec;
    const steps = this.dur > 0.6 ? 8 : this.steps;
    const kt = this.stepFps && this.k < 1 ? Math.min(1, (Math.floor(this.t * this.stepFps) / this.stepFps) / this.dur) : this.k;
    const kq = kt >= 1 ? 1 : Math.round(this.ease(kt) * steps) / steps;
    const blink = this.blinking > 0 && mode === 'colour' && spec.body !== 'bird';
    const nod = this.talking ? [0, 3, 0, -2][Math.floor(this.talkT * 2.6) % 4] : 0;
    const aim = Math.round(this.aim / 10) * 10;
    const poseName = kq >= 1 ? this.to : kq <= 0 ? this.from : this.to;
    const heads = this.heads ? JSON.stringify(this.heads) : '';
    const key = `${spec.key}|${this.from}>${this.to}@${kq}|${mode}|${blink ? 1 : 0}|${nod}|${aim}|${heads}`;
    const o = { mode, stableSeed: this.seed * 13, blink, head: nod, aim, heads: this.heads || undefined };
    if (kq > 0 && kq < 1) {
      o.pose = blendPose(POSES[this.from] || POSES.stand, POSES[this.to] || POSES.stand, kq);
      const aimedPose = (n) => n.startsWith('draw') || n === 'shoot' || n === 'cast';
      o.aimed = aimedPose(this.to) && aimedPose(this.from);
    }
    return paint(spec, poseName, key, o);
  }

  /** Push state to the GPU objects. Call once per rendered frame. */
  sync() {
    const e = this.texture('colour');
    const sp = this.sprite;
    sp.texture = e.tex; sp.anchor.set(e.ax, e.ay);
    const breath = this.breathe ? 1 + Math.sin(this.phase) * 0.006 : 1;
    const sc = this.scale / e.s;
    sp.scale.set(sc * this.facing, sc * breath);
    sp.alpha = 1 - this.drain;
    if (this.drain > 0) {
      if (!this.lineSprite) { this.lineSprite = new Sprite(); this.pivot.addChildAt(this.lineSprite, 0); }
      const l = this.texture('line');
      this.lineSprite.texture = l.tex; this.lineSprite.anchor.set(l.ax, l.ay);
      this.lineSprite.scale.set(this.scale / l.s * this.facing, this.scale / l.s);
      this.lineSprite.visible = true;
    } else if (this.lineSprite) this.lineSprite.visible = false;
    // rotate about a point a little above the feet
    const py = this.U * this.pivotK * this.scale;
    this.pivot.position.set(0, -py); sp.position.set(0, py); if (this.lineSprite) this.lineSprite.position.set(0, py);
    this.pivot.rotation = this.rot;
    this.view.position.set(this.x, this.y);
    this.view.alpha = this.alpha;
  }

  destroy() { this.view.destroy({ children: true }); }
}
