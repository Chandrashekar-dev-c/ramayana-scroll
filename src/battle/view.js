// The battle on the GPU: the painted land, live figures for everyone in the fight, and the
// feedback that makes a hit land: sparks, dust, a flash of light, petals when a demon falls,
// a grade toward dusk, and the land healing outward in a soft circle of colour.
import { Container, Sprite, ColorMatrixFilter } from 'pixi.js';
import { app } from '../core/app.js';
import { bus } from '../core/events.js';
import { GROUND } from '../art/layout.js';
import { WALK } from '../art/figures.js';
import { drawGrowingTree } from '../art/backdrops.js';
import { BackdropView, NearView, PropView, Painted, Particles, Glow } from '../gfx/world.js';
import { LiveFigure } from '../gfx/live.js';
import { softDisc } from '../gfx/tex.js';
import { heroLook } from './hero.js';
import { enemyLook } from './enemies.js';
import { bossLook } from './bosses.js';

const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));

export class BattleView {
  constructor(b) {
    this.b = b;
    this.view = new Container();
    const L = b.level;
    this.painted = !!L.painted || !b.regrow;
    this.backdrop = new BackdropView(L.backdrop, L.style || 'bharni-bright', { colour: this.painted, regrow: !!b.regrow, density: L.density });
    this.near = new NearView(L.backdrop, { colour: this.painted });
    this.world = new Container();
    this.groundFx = new Container();    // behind figures: dust, regrowing trees
    this.figs = new Container(); this.figs.sortableChildren = true;
    this.fx = new Particles(500);       // in front: sparks, petals
    this.light = new Container();       // additive flashes
    this.world.addChild(this.groundFx, this.figs, this.fx.view, this.light);
    this.view.addChild(this.backdrop.view, this.world, this.near.view);
    this.live = new Map();              // model object -> LiveFigure
    this.trees = null;
    this.flashes = [];
    // the dusk of Tataka's second phase, and other moods
    this.grade = new ColorMatrixFilter();
    this.view.filters = [this.grade];
    this.gradeK = 0;
    // the altar or anything else the battle protects
    if (b.protect) { this.protect = new PropView(b.protect.kind || 'altar', {}); this.protect.view.position.set(b.protect.x, GROUND); this.groundFx.addChild(this.protect.view); this.protectGlow = new Glow(b.protect.x, GROUND - 60, 160, 0xffa040, { alpha: 0.4 }); this.light.addChild(this.protectGlow.view); }
    // regrowing trees, each with its own small canvas while it grows
    if (b.regrow) this.trees = b.regrow.map((tr) => ({ tr, p: null, last: -1 }));
    // hook the model's feedback into GPU effects
    const burst0 = b.burst;
    b.burst = (x, y, color, n = 10) => { burst0(x, y, color, n); this.sparks(x, y, color, n); };
    this.off = [
      bus.on('enemy:die', (d) => this.onKill(d)),
      bus.on('hero:hurt', () => this.flash(b.hero.x, b.hero.y - 90, 0xcf2a1c, 120, 0.25)),
      bus.on('astra:fire', () => this.astraFlash()),
      bus.on('cue', (c) => { if (c === 'jump' || c === 'roll') this.dust(b.hero.x, GROUND, c === 'roll' ? 10 : 6); }),
      bus.on('hero:shoot', (s) => { if (s.full) this.flash(b.hero.x + b.hero.facing * 40, b.hero.y - 118, 0xffd27a, 70, 0.18); }),
      bus.on('checkpoint', () => this.petalRain(b.hero.x, 22)),
    ];
    this.lastHeroGround = true;
  }

  // ---------------------------------------------------------------- effects
  sparks(x, y, color, n) {
    const c = hex(color);
    this.fx.burst(x, y, Math.round(n * 1.2), { speed: 360, life: 0.45, size: 7, color: c === 0xfbf5e4 ? 0xffe9b0 : c, g: 600, drag: 0.6, blend: 'add', spread: Math.PI * 2 });
    this.flash(x, y, 0xfff0c0, 46, 0.12);
  }
  dust(x, y, n) { this.fx.burst(x, y - 4, n, { speed: 110, life: 0.6, size: 16, color: 0xc9a46a, g: -30, drag: 0.85, spread: Math.PI * 0.9, angle: -Math.PI / 2, grow: 1.6, alpha: 0.55, jitter: 30 }); }
  petalRain(x, n) { for (let i = 0; i < n; i++) this.fx.emit({ x: x + (Math.random() - 0.5) * 500, y: GROUND - 420 - Math.random() * 120, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 40, life: 4, size: 9, color: Math.random() < 0.5 ? 0xe58a1f : 0xd9788d, spin: 3, drag: 0.1, fade: 0.4, floor: GROUND }); }
  flash(x, y, color, r, dur) {
    const s = new Sprite(softDisc()); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = color; s.position.set(x, y); s.width = s.height = r * 2;
    this.light.addChild(s); this.flashes.push({ s, t: 0, dur, r });
  }
  onKill(d) {
    const e = this.b.enemies.find((q) => q.type === d.type && q.dying && !q._fxDone) || null;
    if (!e) return;
    e._fxDone = true;
    // a demon falls: ink dust and a scatter of lampblack and petals
    this.fx.burst(e.x, e.y - 70, 14, { speed: 260, life: 0.7, size: 9, color: 0x26382c, g: 500, drag: 0.5, spread: Math.PI * 2 });
    this.fx.burst(e.x, e.y - 90, 8, { speed: 200, life: 1.2, size: 10, color: 0xe58a1f, g: 160, drag: 0.6, spin: 6, spread: Math.PI * 1.2, angle: -Math.PI / 2 });
    this.dust(e.x, GROUND, 8);
  }
  astraFlash() {
    const v = this.b.view();
    const s = new Sprite(softDisc()); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = 0xffe7a0;
    s.position.set((v.left + v.right) / 2, GROUND - 260);
    this.light.addChild(s); this.flashes.push({ s, t: 0, dur: 0.9, r: 900 });
    this.petalRain((v.left + v.right) / 2, 40);
  }

  ambient(dt) {
    const b = this.b, v = b.view(), id = b.level.backdrop;
    const dead = !this.painted && !this.healed;
    const rate = dead ? 26 : 7;
    if (Math.random() < dt * rate) {
      const y = GROUND - 30 - Math.random() * 380, wind = dead ? 160 + Math.random() * 120 : 20 + Math.random() * 30;
      if (dead) this.fx.emit({ x: v.left - 20, y, vx: wind, vy: (Math.random() - 0.5) * 30, life: (v.right - v.left + 80) / wind, size: 3 + Math.random() * 3, color: 0x9c6a3a, alpha: 0.45, drag: 0, fade: 0 });
      else this.fx.emit({ x: v.left + Math.random() * (v.right - v.left), y, vx: wind * (Math.random() < 0.5 ? -1 : 1), vy: -6 - Math.random() * 10, life: 5, size: 4 + Math.random() * 3, color: id === 'ashram' ? 0xffe28a : 0xf2c86a, alpha: 0.6, blend: 'add', drag: 0.05 });
    }
  }

  // ---------------------------------------------------------------- figures
  figFor(key, spec, o = {}) {
    let f = this.live.get(key);
    if (!f) { f = new LiveFigure(spec, { breathe: true, steps: 3, ...o }); this.live.set(key, f); this.figs.addChild(f.view); }
    f.seen = true;
    return f;
  }
  place(f, x, y, pose, look = {}) {
    // battle poses change fast: a short blend keeps every action readable
    const quick = pose.startsWith('walk') || pose.startsWith('fly') || pose.startsWith('charge') ? 0.07 : pose === 'hurt' || pose === 'kick' ? 0.04 : pose === 'shoot' ? 0.03 : 0.1;
    if (f.to !== pose) f.setPose(pose, quick);
    f.x = x + (look.dx || 0); f.y = y + (look.sink || 0);
    f.rot = look.rot || 0; f.alpha = look.alpha ?? 1; f.drain = look.drain || 0; f.pivotK = look.pivot ?? 0.3;
    f.scale = look.scale || 1;
    if (look.facing) f.facing = look.facing;
    f.view.zIndex = y + (look.z || 0);
    f.sprite.tint = look.flash ? 0xffd0c0 : 0xffffff;
  }

  // ---------------------------------------------------------------- every frame
  update(dt) {
    const b = this.b;
    for (const f of this.live.values()) f.seen = false;
    // hero
    const h = b.hero, hl = heroLook(b);
    const hf = this.figFor(h, h.spec, { blink: true });
    this.place(hf, h.x, h.y, hl.pose, { ...hl, facing: h.facing, z: 2 });
    hf.aim = h.aim;
    if (!this.lastHeroGround && h.onGround) this.dust(h.x, GROUND, 7);
    this.lastHeroGround = h.onGround;
    // allies
    for (const a of b.allies) {
      const f = this.figFor(a, a.spec);
      const pose = a.shootAnim > 0 ? 'shoot' : a.walkT > 0 ? WALK[Math.floor(a.walkT * 9) % 4] : 'stand';
      this.place(f, a.x, GROUND, pose, { facing: a.facing === 1 ? h.facing : a.facing, z: 1 });
    }
    if (b.protected) { const f = this.figFor(b.protected, b.protected.spec); this.place(f, b.protected.x, GROUND, b.protected.hurt ? 'hurt' : 'stand', { facing: h.x > b.protected.x ? 1 : -1 }); }
    // enemies (custom bodies like the elephant are still painted on the ink layer)
    for (const e of b.enemies) {
      if (e.dead || e.def.custom) continue;
      const l = enemyLook(e);
      const f = this.figFor(e, e.spec, { blink: false });
      this.place(f, e.x, e.y, l.pose, { ...l, facing: e.facing });
    }
    // bosses
    for (const q of b.bosses) {
      const l = bossLook(q);
      if (l.hidden) continue;
      const f = this.figFor(q, q.spec, { blink: true });
      f.heads = l.heads || null;
      this.place(f, q.x, q.y, l.pose, { ...l, facing: q.facing, pivot: 0.05 });
    }
    // drop figures that left the fight
    for (const [k, f] of this.live) if (!f.seen) { f.destroy(); this.live.delete(k); }
    for (const f of this.live.values()) f.update(dt);
    // the protected altar
    if (this.protect) { this.protect.set({ state: b.protect.hp / b.protect.max }); this.protect.update(dt); this.protectGlow.base = 0.15 + 0.35 * (b.protect.hp / b.protect.max); this.protectGlow.sync(b.time); }
    // regrowing trees
    if (this.trees) for (const t of this.trees) {
      const g = Math.round(t.tr.grow * 20) / 20;
      if (g === t.last) continue;
      if (!t.p) { t.p = new Painted(t.tr.h * 1.6, t.tr.h * 1.25, t.tr.h * 0.8, t.tr.h * 1.15, app.scale); t.p.view.position.set(t.tr.x, t.tr.y); this.groundFx.addChild(t.p.view); }
      t.last = g;
      t.p.paint((ctx) => drawGrowingTree(ctx, { ...t.tr, x: 0, y: 0 }, g));
      if (g > 0 && g < 0.3 && Math.random() < 0.5) this.fx.burst(t.tr.x, t.tr.y - t.tr.h * 0.6, 4, { speed: 80, life: 1.4, size: 8, color: 0x3f8038, g: 40, spin: 3, drag: 0.4 });
    }
    // the air of the place: grit on the wind in a wasteland, motes and petals elsewhere
    this.ambient(dt);
    // light and particles
    this.fx.update(dt);
    for (const fl of this.flashes) { fl.t += dt; const k = fl.t / fl.dur; fl.s.alpha = Math.max(0, 1 - k) * 0.9; fl.s.width = fl.s.height = fl.r * 2 * (0.7 + k * 0.6); }
    this.flashes = this.flashes.filter((fl) => { if (fl.t >= fl.dur) { fl.s.destroy(); return false; } return true; });
    // the land heals in a soft circle from where the demon fell
    if (b.healT >= 0 && !this.painted) {
      const r = b.healT * b.healSpeed;
      this.backdrop.setHeal(b.healX, r);
      if (b.healT > b.healDur && !this.healed) { this.healed = true; this.backdrop.clearHeal(); this.backdrop.setColour(true); this.near.setColour(true); this.petalRain(b.hero.x, 50); }
    }
    // dusk
    const wantGrade = b.mood === 'dusk' ? 1 : 0;
    this.gradeK += (wantGrade - this.gradeK) * Math.min(1, dt * 1.5);
    this.applyGrade();
  }

  applyGrade() {
    const k = this.gradeK;
    if (k < 0.01) { this.grade.enabled = false; return; }
    this.grade.enabled = true;
    // warm the light and lower it: the sun is going down on the fight
    this.grade.matrix = [
      1 + 0.08 * k, 0.04 * k, 0, 0, 0.02 * k,
      0.02 * k, 1 - 0.12 * k, 0, 0, -0.01 * k,
      0, 0, 1 - 0.3 * k, 0, -0.03 * k,
      0, 0, 0, 1, 0,
    ];
  }

  sync(shake) {
    const b = this.b, z = b.zoom;
    const sx = shake ? shake.x : 0, sy = shake ? shake.y : 0;
    this.backdrop.update(b.camX * z, app.W);
    this.backdrop.view.position.set(-b.camX * z + sx, sy);
    this.near.update(b.camX * z, app.W);
    this.near.view.position.set(-b.camX * z + sx, sy);
    this.world.scale.set(z);
    this.world.position.set(-b.camX * z + sx, GROUND * (1 - z) + sy);
    for (const f of this.live.values()) f.sync();
    for (const fl of this.flashes) void fl;
  }

  destroy() {
    for (const off of this.off) off();
    for (const f of this.live.values()) f.destroy();
    this.live.clear();
    if (this.trees) for (const t of this.trees) if (t.p) t.p.destroy();
    if (this.protect) this.protect.destroy();
    this.fx.clear();
    this.backdrop.destroy(); this.near.destroy();
    this.view.destroy({ children: true });
  }
}
