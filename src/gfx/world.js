// The painted world on the GPU: backdrop planes made of painted chunks, the near band in
// front of the figures, props painted into their own small canvases, warm lamp light and
// particles. Everything is still painted by the original ink code; the GPU composites it.
import { Container, Sprite, Graphics } from 'pixi.js';
import { backdropChunk, nearChunk, CHUNK } from '../art/backdrops.js';
import { drawProp } from '../art/props.js';
import { GROUND } from '../art/layout.js';
import { canvasTexture, retain, dropTexture, softDisc, dotTexture, flameTexture } from './tex.js';
import { app, makeCanvas } from '../core/app.js';

// ---------------------------------------------------------------- backdrop planes
/** A backdrop plane: line world underneath, colour world above, revealed by a soft mask. */
export class BackdropView {
  constructor(id, style, o = {}) {
    this.id = id; this.style = style; this.regrow = !!o.regrow; this.density = o.density || ''; this.part = o.part || '';
    this.shadow = !!o.shadow;
    this.view = new Container();
    this.base = new Container();
    this.colourLayer = new Container();
    this.view.addChild(this.base, this.colourLayer);
    this.colour = o.colour !== false;
    this.made = new Set();
    this.sprites = { base: new Map(), colour: new Map() };
    this.mask = null; this.heal = null;
  }
  /** Paint colour over the line world inside a growing circle at (x, GROUND). */
  setHeal(x, r) {
    if (!this.mask) {
      // a soft disc as an alpha mask: colour floods outward with a feathered edge
      this.mask = new Sprite(softDisc()); this.mask.anchor.set(0.5);
      this.view.addChild(this.mask);
      this.colourLayer.mask = this.mask;
    }
    this.heal = { x, r };
    this.mask.position.set(x, GROUND - 120);
    this.mask.width = this.mask.height = Math.max(2, r) * 2.6;
  }
  clearHeal() { if (this.mask) { this.colourLayer.mask = null; this.mask.destroy(); this.mask = null; } this.heal = null; }
  chunkSprite(layer, colour, i) {
    const map = this.sprites[layer];
    let sp = map.get(i);
    if (sp) return sp;
    const cv = backdropChunk(this.id, this.style, colour, i, this.regrow, this.density, this.part);
    if (!this.made.has(cv)) { this.made.add(cv); retain(cv); }
    sp = new Sprite(canvasTexture(cv));
    // overlap neighbours by a unit so no seam shows where two chunks meet
    sp.width = CHUNK + 1.5; sp.height = 720;
    sp.position.set(i * CHUNK - 0.5, 0);
    const parent = layer === 'base' ? this.base : this.colourLayer;
    if (this.shadow) {
      // a cut-paper plane throws a soft dark copy of itself onto the plane behind
      const sh = new Sprite(sp.texture); sh.width = sp.width; sh.height = sp.height;
      sh.position.set(sp.x + 7, 6); sh.tint = 0x1d1613; sh.alpha = 0.22;
      parent.addChild(sh); sp.shadowSprite = sh;
    }
    parent.addChild(sp);
    map.set(i, sp);
    return sp;
  }
  update(camX, viewW) {
    const i0 = Math.floor(camX / CHUNK), i1 = Math.floor((camX + viewW) / CHUNK);
    const showColour = this.colour;
    const healing = !this.colour && this.heal;
    for (const layer of ['base', 'colour']) {
      for (const [i, sp] of this.sprites[layer]) if (i < i0 - 1 || i > i1 + 1) { if (sp.shadowSprite) sp.shadowSprite.destroy(); sp.destroy(); this.sprites[layer].delete(i); }
    }
    for (let i = i0; i <= i1; i++) {
      this.chunkSprite('base', showColour, i);
      if (healing) this.chunkSprite('colour', true, i);
    }
    this.colourLayer.visible = !!healing;
  }
  /** Switch the whole plane to colour (or back); rebuilds the base chunks. */
  setColour(c) {
    if (this.colour === c) return;
    this.colour = c;
    for (const sp of this.sprites.base.values()) { if (sp.shadowSprite) sp.shadowSprite.destroy(); sp.destroy(); }
    this.sprites.base.clear();
  }
  destroy() { this.view.destroy({ children: true }); for (const cv of this.made) dropTexture(cv); }
}

/** The near band: a low row of plants, water or pattern in front of the figures. */
export class NearView {
  constructor(id, o = {}) {
    this.id = id; this.colour = o.colour !== false; this.view = new Container(); this.sprites = new Map(); this.made = new Set();
  }
  update(camX, viewW) {
    const i0 = Math.floor(camX / CHUNK), i1 = Math.floor((camX + viewW) / CHUNK);
    for (const [k, sp] of this.sprites) { const i = +k.split('|')[0]; if (i < i0 - 1 || i > i1 + 1) { sp.destroy(); this.sprites.delete(k); } }
    for (let i = i0; i <= i1; i++) {
      const k = i + '|' + (this.colour ? 1 : 0);
      if (this.sprites.has(k)) continue;
      const cv = nearChunk(this.id, this.colour, i);
      if (!cv) return;
      if (!this.made.has(cv)) { this.made.add(cv); retain(cv); }
      const sp = new Sprite(canvasTexture(cv));
      sp.width = CHUNK + 1.5; sp.height = cv.height * (CHUNK / cv.width); sp.position.set(i * CHUNK - 0.5, GROUND - 30);
      this.view.addChild(sp); this.sprites.set(k, sp);
    }
  }
  setColour(c) { if (c === this.colour) return; this.colour = c; for (const sp of this.sprites.values()) sp.destroy(); this.sprites.clear(); }
  destroy() { this.view.destroy({ children: true }); for (const cv of this.made) dropTexture(cv); }
}

// ---------------------------------------------------------------- painted things
/**
 * A small canvas of its own, for anything the ink code paints that changes over time:
 * a prop with a living flame, a regrowing tree. (w, h) is in world units around an origin
 * at (ox, oy) inside the box; repaint only when needed.
 */
export class Painted {
  constructor(w, h, ox, oy, scale = 1) {
    const s = Math.max(0.75, Math.min(1.5, scale));
    this.s = s; this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.cv = makeCanvas(w * s, h * s); this.ctx = this.cv.getContext('2d');
    this.sprite = new Sprite(retain(this.cv));
    this.sprite.anchor.set(ox / w, oy / h);
    this.sprite.scale.set(1 / s);
    this.view = this.sprite;
  }
  paint(fn) {
    const x = this.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.cv.width, this.cv.height);
    x.setTransform(this.s, 0, 0, this.s, this.ox * this.s, this.oy * this.s);
    fn(x);
    this.sprite.texture.source.update();
  }
  destroy() { this.view.destroy(); dropTexture(this.cv); }
}

/** A prop drawn by the original prop painter; repainted at about 20 fps if it moves. */
export class PropView {
  constructor(name, o = {}) {
    this.name = name; this.o = { ...o }; this.animated = o.animated ?? ['altar', 'lampStand', 'diya', 'fire'].includes(name);
    this.p = new Painted(o.w || 520, o.h || 560, (o.w || 520) / 2, (o.h || 560) - 40, app.scale);
    this.view = this.p.view; this.acc = 1; this.t = 0; this.dirty = true;
  }
  set(o) { Object.assign(this.o, o); this.dirty = true; }
  update(dt) {
    this.t += dt; this.acc += dt;
    if (this.dirty || (this.animated && this.acc > 0.05)) { this.acc = 0; this.dirty = false; this.p.paint((ctx) => drawProp(ctx, this.name, 0, 0, { ...this.o, t: this.t })); }
  }
  destroy() { this.p.destroy(); }
}

// ---------------------------------------------------------------- light
/** Warm light: an additive soft disc that breathes like a flame. */
export class Glow {
  constructor(x, y, r, color = 0xffb347, o = {}) {
    this.view = new Sprite(softDisc());
    this.view.anchor.set(0.5); this.view.blendMode = o.blend || 'add';
    this.view.tint = color; this.base = o.alpha ?? 0.5; this.r = r; this.x = x; this.y = y;
    this.seed = Math.random() * 100; this.flicker = o.flicker ?? 0.12;
    this.sync(0);
  }
  sync(t) {
    const f = 1 + (Math.sin(t * 9.3 + this.seed) * 0.5 + Math.sin(t * 23.1 + this.seed * 2) * 0.3) * this.flicker;
    this.view.position.set(this.x, this.y);
    this.view.width = this.view.height = this.r * 2 * f;
    this.view.alpha = this.base * (0.9 + 0.1 * f);
  }
}

/** A painted lamp flame that sways. */
export class Flame {
  constructor(x, y, h = 26) {
    this.view = new Sprite(flameTexture()); this.view.anchor.set(0.5, 0.97);
    this.x = x; this.y = y; this.h = h; this.seed = Math.random() * 100;
  }
  sync(t) {
    const sway = Math.sin(t * 7 + this.seed) * 0.08 + Math.sin(t * 17 + this.seed) * 0.04;
    const hgt = this.h * (1 + Math.sin(t * 11 + this.seed) * 0.08);
    this.view.position.set(this.x, this.y); this.view.rotation = sway;
    this.view.height = hgt; this.view.width = hgt * 0.5;
  }
}

// ---------------------------------------------------------------- particles
/** A pool of simple particles: dust, sparks, petals, embers. */
export class Particles {
  constructor(max = 400) {
    this.view = new Container(); this.list = []; this.max = max;
  }
  /** o: { x, y, vx, vy, life, size, color, g (gravity), drag, blend, spin, fade, grow, tex } */
  emit(o) {
    if (this.list.length >= this.max) { const old = this.list.shift(); old.sp.destroy(); }
    const sp = new Sprite(o.tex || dotTexture());
    sp.anchor.set(0.5); sp.tint = o.color ?? 0xffffff; sp.blendMode = o.blend || 'normal';
    const p = { sp, x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, life: o.life || 1, t: 0, size: o.size || 6, g: o.g || 0, drag: o.drag ?? 0.8, spin: o.spin || 0, fade: o.fade ?? 1, grow: o.grow ?? 0, alpha: o.alpha ?? 1, floor: o.floor };
    this.view.addChild(sp); this.list.push(p);
    return p;
  }
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const v = (o.speed ?? 300) * (0.4 + Math.random() * 0.6);
      this.emit({ ...o, x: x + (Math.random() - 0.5) * (o.jitter || 0), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), size: (o.size || 6) * (0.6 + Math.random() * 0.7) });
    }
  }
  update(dt) {
    const keep = [];
    for (const p of this.list) {
      p.t += dt;
      if (p.t >= p.life) { p.sp.destroy(); continue; }
      p.vy += p.g * dt; const d = Math.pow(1 - Math.min(0.99, p.drag), dt); p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; }
      const k = p.t / p.life;
      p.sp.position.set(p.x, p.y); p.sp.rotation += p.spin * dt;
      const s = p.size * (1 + p.grow * k);
      p.sp.width = p.sp.height = s;
      p.sp.alpha = p.alpha * (p.fade ? 1 - Math.pow(k, 1.6) : 1);
      keep.push(p);
    }
    this.list = keep;
  }
  clear() { for (const p of this.list) p.sp.destroy(); this.list = []; }
}
