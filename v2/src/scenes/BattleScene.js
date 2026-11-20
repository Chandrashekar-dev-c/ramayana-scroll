// A boss battle. The hero moves and jumps with the left thumb and draws the bow with the right.
// The boss's moves, timings and phases all come from the chapter's `battle` data; each move is one
// small method below, so a new boss = new data + its own move methods.
import Phaser from 'phaser';
import { W, H, GROUND_Y, HUMAN_PX } from '../engine/layout.js';
import { Stage } from '../art/stage.js';
import { Controls } from '../engine/controls.js';
import { face, sizeFor } from '../engine/assets.js';
import { Hearts, BossBar, bark, titleCard } from '../engine/ui.js';
import { sfx, setDrone } from '../engine/audio.js';
import { applyFinish } from '../fx/finish.js';
import { chapter } from '../engine/chapters.js';

const FEET = GROUND_Y + 8, GRAVITY = 2400, JUMP_V = -1000, SPEED = 340;
const MAX_BOSS_HEIGHT = 1.7; // Tataka is 2.3 in the data; capped so she fits a landscape phone

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create({ chapter: id, standalone }) {
    this.ch = chapter(id); this.cfg = this.ch.battle; this.standalone = standalone;
    const hero = this.ch.hero, hk = s => `char.${hero.id}.${hero.stage}.${s}`;
    this.heroKeys = { stand: hk('stand'), walk: hk('walk'), draw: hk('draw') };
    const bk = s => `char.${this.cfg.boss}.default.${s}`;
    this.bossKeys = { stand: bk('stand'), walk: bk('walk'), attack: bk('attack') };

    this.stage = new Stage(this, this.cfg.backdrop, { trees: this.cfg.heal.treeCount });
    this.stage.setScroll(0);

    // hero
    this.h = { x: 260, y: FEET, vy: 0, vx: 0, dir: 'right', hearts: this.cfg.heroHearts, invuln: 0, step: 0, cool: 0 };
    this.hero = this.add.image(this.h.x, FEET, this.heroKeys.stand).setOrigin(0.5, 1).setDepth(50);
    this.heroH = hero.height;
    this.hearts = new Hearts(this, this.cfg.heroHearts);

    // boss
    this.b = { hp: this.cfg.boss_hp, home: 1020, x: 1020, busy: false, phase: 0, gone: false, dead: false };
    this.boss = this.add.image(this.b.x, FEET, this.bossKeys.stand).setOrigin(0.5, 1).setDepth(48);
    this.bossH = Math.min(MAX_BOSS_HEIGHT, 2.3);
    this.setBossPose('stand');
    this.tweens.add({ targets: this.boss, scaleY: { from: this.boss.scaleY, to: this.boss.scaleY * 1.015 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    this.bar = new BossBar(this, 'Tataka');

    this.arrows = [];
    this.hazards = []; // { kind, update(dt) -> bool keep }
    this.aimDots = this.add.graphics().setDepth(55);

    this.controls = new Controls(this, { bow: true });
    this.controls.on('jump', () => this.jump());
    this.controls.on('fire', aim => this.fire(aim));

    this.elapsed = 0; this.duskSaid = false;
    setDrone('dusk');
    applyFinish(this);
    this.cameras.main.fadeIn(500, 120, 90, 60);
    sfx.drum();
    titleCard(this, 'The yakshini comes roaring out of the dust', this.cfg.rule, 3600);
    this.time.delayedCall(800, () => bark(this, 'hint', 'Right thumb: pull back and release to loose an arrow. Left thumb: walk, flick up to jump.', 5200));
    this.time.delayedCall(4200, () => this.nextMove());
  }

  // ---------------------------------------------------------------- hero
  jump() { if (this.h.y >= FEET - 1 && !this.over) { this.h.vy = JUMP_V; sfx.whoosh(); } }

  bowPoint() {
    const d = this.hero.displayWidth, top = this.hero.y - this.hero.displayHeight;
    return { x: this.hero.x + (this.h.dir === 'right' ? 0.3 : -0.3) * d, y: top + this.hero.displayHeight * 0.36 };
  }

  launch(aim) {
    const len = Math.hypot(aim.dx, aim.dy) || 1, a = this.cfg.arrow;
    const v = Phaser.Math.Linear(a.speed_min, a.speed_max, aim.power);
    return { vx: (aim.dx / len) * v, vy: (aim.dy / len) * v };
  }

  fire(aim) {
    if (this.over || this.h.cool > 0 || aim.power < 0.12) return;
    this.h.cool = this.cfg.arrow.cooldown;
    const p = this.bowPoint(), v = this.launch(aim);
    const s = this.add.image(p.x, p.y, 'arrow').setDepth(56).setScale(0.9);
    this.arrows.push({ s, vx: v.vx, vy: v.vy, life: 2.5 });
    sfx.twang();
  }

  hurt(dmg = 1) {
    if (this.h.invuln > 0 || this.over) return;
    this.h.hearts -= dmg; this.hearts.set(this.h.hearts); this.h.invuln = 1.3;
    this.h.vx = this.h.x < this.b.x ? -420 : 420; this.h.vy = -420;
    sfx.hurt(); this.cameras.main.shake(250, 0.01);
    this.hero.setTint(0xff6a5a); this.time.delayedCall(180, () => this.hero.clearTint());
    if (this.h.hearts <= 0) this.lose();
  }

  // ---------------------------------------------------------------- boss
  setBossPose(pose) {
    this.boss.setTexture(this.bossKeys[pose]);
    sizeFor(this.boss, this.bossH, HUMAN_PX);
    face(this.boss, this.h && this.h.x > this.b.x ? 'right' : 'left');
  }

  bossBox() {
    const b = this.boss.getBounds();
    return {
      body: new Phaser.Geom.Rectangle(b.x + b.width * 0.22, b.y + b.height * 0.22, b.width * 0.56, b.height * 0.78),
      head: new Phaser.Geom.Rectangle(b.x + b.width * 0.25, b.y, b.width * 0.5, b.height * 0.22),
    };
  }

  phaseNow() {
    const frac = this.b.hp / this.cfg.boss_hp;
    let i = 0; this.cfg.phases.forEach((p, k) => { if (frac <= p.from) i = k; });
    return i;
  }

  nextMove() {
    if (this.over) return;
    const pi = this.phaseNow(), phase = this.cfg.phases[pi];
    if (pi !== this.b.phase) {
      this.b.phase = pi;
      if (phase.say) bark(this, phase.say.speaker, phase.say.text, 3200);
      sfx.drum();
      this.time.delayedCall(1600, () => this.nextMove());
      return;
    }
    let moves = phase.moves.filter(m => m !== 'swipe' || Math.abs(this.h.x - this.b.x) < this.cfg.moves.swipe.reach + 140);
    if (moves.includes('swipe')) moves = ['swipe', 'swipe', ...moves]; // she swipes when you come close
    const move = Phaser.Utils.Array.GetRandom(moves);
    this.b.busy = true;
    this[`move_${move}`](this.cfg.moves[move], () => {
      this.b.busy = false;
      if (this.over) return;
      const [a, b] = phase.pause;
      this.time.delayedCall(Phaser.Math.FloatBetween(a, b) * 1000, () => this.nextMove());
    });
  }

  telegraphMark(x, key, seconds) {
    const m = this.add.image(x, FEET - 4, key).setDepth(47).setAlpha(0);
    this.tweens.add({ targets: m, alpha: 1, duration: 150 });
    this.tweens.add({ targets: m, scale: 1.15, yoyo: true, repeat: -1, duration: 160 });
    this.time.delayedCall(seconds * 1000, () => m.destroy());
    return m;
  }

  /** Stamp: a shockwave rolls along the ground. The lotus under the hero means: jump. */
  move_stomp(cfg, done) {
    this.setBossPose('walk'); sfx.warn();
    this.tweens.add({ targets: this.boss, y: FEET - 30, duration: cfg.telegraph * 1000, ease: 'Sine.easeOut' });
    const lotus = this.telegraphMark(this.h.x, 'glyph.lotus', cfg.telegraph + 0.6); lotus.setScale(0.6);
    this.time.delayedCall(cfg.telegraph * 1000, () => {
      if (this.over) return done();
      this.boss.y = FEET; this.setBossPose('stand');
      sfx.stomp(); this.cameras.main.shake(300, 0.014);
      const dir = this.h.x < this.b.x ? -1 : 1;
      const wave = this.add.image(this.b.x, FEET - 40, 'dust').setScale(0.7, 0.45).setDepth(57);
      this.hazards.push({ s: wave, update: dt => {
        wave.x += dir * cfg.wave_speed * dt; wave.angle += dir * 200 * dt;
        if (Math.abs(wave.x - this.h.x) < 60 && this.h.y > FEET - 70) this.hurt(cfg.damage);
        if (wave.x < -150 || wave.x > W + 150) { wave.destroy(); return false; } return true;
      } });
      this.time.delayedCall(500, done);
    });
  }

  /** She rains stones: shadow-stars mark where they will land. */
  move_stones(cfg, done) {
    this.setBossPose('attack'); sfx.warn();
    const n = Phaser.Math.Between(cfg.count[0], cfg.count[1]);
    const xs = [Phaser.Math.Clamp(this.h.x + Phaser.Math.Between(-30, 30), 60, W - 300)];
    while (xs.length < n) { const x = Phaser.Math.Between(60, this.b.x - 180); if (xs.every(o => Math.abs(o - x) > 120)) xs.push(x); }
    xs.forEach(x => this.telegraphMark(x, 'glyph.star', cfg.telegraph + 0.45));
    this.time.delayedCall(cfg.telegraph * 1000, () => {
      xs.forEach((x, i) => this.time.delayedCall(i * 70, () => {
        if (this.over) return;
        const st = this.add.image(x, -60, 'stone').setDepth(58).setScale(0.9);
        sfx.whoosh();
        this.tweens.add({ targets: st, y: FEET - 30, angle: 220, duration: 420, ease: 'Quad.easeIn', onComplete: () => {
          sfx.hit(); const puff = this.add.image(x, FEET - 40, 'dust').setScale(0.5).setDepth(57);
          this.tweens.add({ targets: puff, alpha: 0, scale: 0.8, duration: 500, onComplete: () => puff.destroy() });
          if (Math.abs(this.h.x - x) < 64 && this.h.y > FEET - 150) this.hurt(cfg.damage);
          this.tweens.add({ targets: st, alpha: 0, delay: 300, duration: 300, onComplete: () => st.destroy() });
        } });
      }));
      this.time.delayedCall(700, () => { this.setBossPose('stand'); done(); });
    });
  }

  /** Too close: she lunges and claws. */
  move_swipe(cfg, done) {
    sfx.warn();
    const dir = this.h.x < this.b.x ? -1 : 1;
    this.tweens.add({ targets: this.boss, x: this.b.x - dir * 40, duration: cfg.telegraph * 1000, ease: 'Sine.easeOut' });
    this.time.delayedCall(cfg.telegraph * 1000, () => {
      if (this.over) return done();
      this.setBossPose('attack'); face(this.boss, dir > 0 ? 'right' : 'left'); sfx.hit();
      this.tweens.add({ targets: this.boss, x: this.b.x + dir * 130, duration: 140, yoyo: true, hold: 120, onComplete: () => { this.boss.x = this.b.x; this.setBossPose('stand'); done(); } });
      this.time.delayedCall(140, () => { if (Math.abs(this.h.x - (this.b.x + dir * 130)) < cfg.reach * 0.6) this.hurt(cfg.damage); });
    });
  }

  /** Phase two: she vanishes into her dust and rises under you. Watch for the shadow-star. */
  move_vanish(cfg, done) {
    sfx.whoosh(); this.b.gone = true;
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(this.b.x + Phaser.Math.Between(-120, 120), FEET - Phaser.Math.Between(60, 380), 'dust').setDepth(60).setScale(0.5).setAlpha(0.9);
      puffs.push(p); this.tweens.add({ targets: p, scale: 1.3, alpha: 0, duration: 1100, onComplete: () => p.destroy() });
    }
    this.tweens.add({ targets: this.boss, alpha: 0, duration: 500 });
    const star = this.telegraphMark(this.h.x, 'glyph.star', cfg.telegraph);
    const follow = this.time.addEvent({ delay: 16, loop: true, callback: () => { star.x = Phaser.Math.Linear(star.x, this.h.x, 0.06); } });
    this.time.delayedCall(cfg.telegraph * 0.65 * 1000, () => follow.remove()); // the mark stops following: get out
    this.time.delayedCall(cfg.telegraph * 1000, () => {
      if (this.over) return done();
      const x = Phaser.Math.Clamp(star.x, 160, W - 160);
      this.b.x = x; this.boss.x = x; this.boss.y = FEET + 200; this.boss.alpha = 1; this.b.gone = false;
      this.setBossPose('attack'); sfx.stomp(); this.cameras.main.shake(350, 0.016);
      this.tweens.add({ targets: this.boss, y: FEET, duration: 260, ease: 'Back.easeOut' });
      if (Math.abs(this.h.x - x) < 110) this.hurt(cfg.damage);
      this.time.delayedCall(cfg.vulnerable * 1000, () => { // dazed, then she strides back
        if (this.over) return done();
        this.setBossPose('walk');
        this.tweens.add({ targets: this.boss, x: this.b.home, duration: 900, ease: 'Sine.easeInOut', onUpdate: () => { this.b.x = this.boss.x; },
          onComplete: () => { this.b.x = this.b.home; this.setBossPose('stand'); done(); } });
      });
    });
  }

  damageBoss(n, weak) {
    this.b.hp = Math.max(0, this.b.hp - n); this.bar.set(this.b.hp / this.cfg.boss_hp);
    weak ? sfx.weak() : sfx.hit();
    this.boss.setTint(weak ? 0xffe08a : 0xff9a8a); this.time.delayedCall(90, () => this.boss.clearTint());
    if (this.b.hp <= 0) this.win();
  }

  // ---------------------------------------------------------------- outcomes
  win() {
    this.over = true; this.controls.enabled = false; this.aimDots.clear();
    this.time.removeAllEvents();
    this.hero.setAlpha(1);
    const fx = this.boss.x;
    sfx.stomp(); this.cameras.main.shake(900, 0.02);
    this.tweens.killTweensOf(this.boss);
    this.tweens.add({ targets: this.boss, angle: this.boss.flipX ? 18 : -18, y: FEET + 40, alpha: 0, duration: 1600, ease: 'Quad.easeIn' });
    for (let i = 0; i < 10; i++) {
      const p = this.add.image(fx + Phaser.Math.Between(-160, 160), FEET - Phaser.Math.Between(20, 300), 'dust').setDepth(60).setScale(0.6);
      this.tweens.add({ targets: p, scale: 1.6, alpha: 0, duration: 1800, delay: i * 80, onComplete: () => p.destroy() });
    }
    this.hazards.forEach(h => h.s.destroy()); this.hazards = [];
    this.time.delayedCall(1500, () => {
      setDrone('dawn');
      this.stage.heal(fx, 3600);
      this.hero.setTexture(this.heroKeys.stand);
      titleCard(this, 'The land heals', '', 3000);
    });
    this.time.delayedCall(6200, () => {
      this.cameras.main.fadeOut(900, 248, 239, 217);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.standalone ? 'Complete' : 'Story', { chapter: this.ch.id, resume: true }));
    });
  }

  lose() {
    this.over = true; this.controls.enabled = false; this.aimDots.clear();
    this.time.removeAllEvents();
    this.tweens.add({ targets: this.hero, angle: this.h.dir === 'right' ? -80 : 80, y: FEET + 10, duration: 600 });
    this.time.delayedCall(900, () => {
      bark(this, 'note', 'Rama is struck down. Tap to rise again.', 60000);
      this.input.once('pointerup', () => this.scene.restart({ chapter: this.ch.id, standalone: this.standalone }));
    });
  }

  // ---------------------------------------------------------------- frame
  update(_t, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05), h = this.h;
    this.controls.update();
    this.elapsed += dt;
    this.stage.setDusk(Math.min(1, this.elapsed / this.cfg.duskTimer));
    if (!this.duskSaid && this.elapsed > this.cfg.duskTimer * 0.5 && !this.over) { this.duskSaid = true; bark(this, 'vishvamitra', this.cfg.dusk, 2600); }

    // hero movement
    const aiming = !!this.controls.aim && !this.over;
    const mx = this.over ? 0 : this.controls.moveX * (aiming ? 0.35 : 1);
    h.vx = Phaser.Math.Linear(h.vx, mx * SPEED, 0.25);
    h.x = Phaser.Math.Clamp(h.x + h.vx * dt, 70, W - 70);
    h.vy += GRAVITY * dt; h.y = Math.min(FEET, h.y + h.vy * dt); if (h.y >= FEET) h.vy = 0;
    if (aiming) h.dir = this.controls.aim.dx >= 0 ? 'right' : 'left';
    else if (Math.abs(mx) > 0.1) h.dir = mx > 0 ? 'right' : 'left';
    if (Math.abs(mx) > 0.1) h.step += dt;
    h.cool -= dt; h.invuln -= dt;

    if (!this.over) {
      const stride = Math.floor(h.step / 0.22) % 2;
      this.hero.setTexture(aiming ? this.heroKeys.draw : Math.abs(mx) > 0.1 && stride ? this.heroKeys.walk : this.heroKeys.stand);
      sizeFor(this.hero, this.heroH, HUMAN_PX);
      face(this.hero, h.dir);
      this.hero.setPosition(h.x, h.y);
      this.hero.setAlpha(h.invuln > 0 ? (Math.floor(h.invuln * 12) % 2 ? 0.35 : 1) : 1);
    }

    // aim preview: the arc the arrow will fly
    this.aimDots.clear();
    if (aiming && this.controls.aim.power >= 0.12) {
      const p = this.bowPoint(), v = this.launch(this.controls.aim), g = this.cfg.arrow.gravity;
      for (let i = 1; i <= 14; i++) {
        const t = i * 0.05;
        this.aimDots.fillStyle(0xf8efd9, 1 - i / 16).fillCircle(p.x + v.vx * t, p.y + v.vy * t + 0.5 * g * t * t, 5);
      }
    }

    // arrows
    const box = this.b.gone || this.b.dead ? null : this.bossBox();
    this.arrows = this.arrows.filter(a => {
      a.vy += this.cfg.arrow.gravity * dt; a.s.x += a.vx * dt; a.s.y += a.vy * dt;
      a.s.rotation = Math.atan2(a.vy, a.vx); a.life -= dt;
      if (box && !this.over) {
        const tip = { x: a.s.x + Math.cos(a.s.rotation) * 50, y: a.s.y + Math.sin(a.s.rotation) * 50 };
        if (box.head.contains(tip.x, tip.y)) { this.damageBoss(this.cfg.arrow.damage * this.cfg.weakSpot.multiplier, true); a.s.destroy(); return false; }
        if (box.body.contains(tip.x, tip.y)) { this.damageBoss(this.cfg.arrow.damage, false); a.s.destroy(); return false; }
      }
      if (a.life <= 0 || a.s.y > FEET + 20 || a.s.x < -100 || a.s.x > W + 100) {
        if (a.s.y > FEET + 20) { a.s.y = FEET + 10; this.tweens.add({ targets: a.s, alpha: 0, delay: 600, duration: 400, onComplete: () => a.s.destroy() }); }
        else a.s.destroy();
        return false;
      }
      return true;
    });

    this.hazards = this.hazards.filter(hz => hz.update(dt));
    if (!this.b.busy && !this.over && !this.b.gone) face(this.boss, this.h.x > this.b.x ? 'right' : 'left');
  }
}
