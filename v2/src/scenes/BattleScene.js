// A boss battle. Generic: the hero, the bow, arrows, hearts, phases, teaching, checkpoints and the
// ending live here; the boss's moves live in src/bosses/<id>.js and its tuning in the chapter JSON.
//
// The bow is the first game's: hold the bow thumb to draw, a ring fills around the hero, drag up or
// down to angle; release early for a quick arrow, or at full draw (ring turns gold, the flight shows
// in rice-paste dots) for a heavy one.
import Phaser from 'phaser';
import { GROUND_Y, HUMAN_PX, PAL, view } from '../engine/layout.js';
import { Stage } from '../art/stage.js';
import { Controls } from '../engine/controls.js';
import { face, sizeFor } from '../engine/assets.js';
import { Hearts, BossBar, bark, clearBark, titleCard, prompt, impact, shake, pauseButton } from '../engine/ui.js';
import { sfx, setMusic, healSwell } from '../engine/audio.js';
import { settings, diff, buzz } from '../engine/settings.js';
import { applyFinish } from '../fx/finish.js';
import { chapter } from '../engine/chapters.js';
import { BOSSES } from '../bosses/index.js';

const FEET = GROUND_Y + 8;
const MAX_BOSS_HEIGHT = 1.7; // Tataka is 2.3 in the data; capped so she fits a landscape phone

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create(data) {
    const { chapter: id, standalone, fromPhase = 0 } = data;
    this.data0 = data;
    this.ch = chapter(id); this.cfg = this.ch.battle; this.standalone = standalone;
    this.bossDef = BOSSES[this.cfg.boss];
    this.T = this.cfg.tuning; this.view = view(this);
    const hero = this.ch.hero, hk = s => `char.${hero.id}.${hero.stage}.${s}`;
    this.heroKeys = { stand: hk('stand'), walk: hk('walk'), draw: hk('draw') };
    const bk = s => `char.${this.cfg.boss}.default.${s}`;
    this.bossKeys = { stand: bk('stand'), walk: bk('walk'), attack: bk('attack') };
    this.FEET = FEET; this.sfx = sfx;
    this.over = false; this.freeze = 0; this.slow = 1; this.seen = new Set();

    this.stage = new Stage(this, this.cfg.backdrop, { trees: this.cfg.heal.treeCount });

    // hero
    const hearts = Math.max(1, this.cfg.heroHearts + diff().hearts);
    this.h = { x: 260, y: FEET, vy: 0, vx: 0, dir: 'right', hearts, max: hearts, invuln: 0, step: 0, cool: 0,
      drawT: 0, angle: 0, fullCue: false, coyote: 0, jumpBuf: 0, rollT: 0, rollDir: 1 };
    this.hero = this.add.image(this.h.x, FEET, this.heroKeys.stand).setOrigin(0.5, 1).setDepth(50);
    this.heroH = hero.height;
    this.hearts = new Hearts(this, hearts);
    this.ring = this.add.graphics().setDepth(55);

    // boss
    this.maxHp = Math.round(this.cfg.boss_hp * diff().bossHp);
    this.home = this.view.w - 260;
    const startFrac = this.cfg.phases[fromPhase].from;
    this.b = { hp: Math.round(this.maxHp * startFrac), phase: fromPhase, busy: false, gone: false };
    this.boss = this.add.image(this.home, FEET, this.bossKeys.stand).setOrigin(0.5, 1).setDepth(48);
    this.bossH = Math.min(MAX_BOSS_HEIGHT, 2.3);
    this.pose('idle');
    this.breath = this.tweens.add({ targets: this.boss, scaleY: this.boss.scaleY * 1.015, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    this.bar = new BossBar(this, this.bossDef.name, this.cfg.phases.slice(1).map(p => p.from));
    this.bar.set(this.b.hp / this.maxHp);

    this.arrows = []; this.hazards = [];
    this.controls = new Controls(this, { bow: true });
    this.controls.on('jump', () => { this.h.jumpBuf = this.T.inputBuffer; });
    this.controls.on('roll', () => this.roll());
    this.controls.on('drawStart', () => { if (this.h.cool <= 0 && !this.over) sfx.drawStart(); });
    this.controls.on('release', () => this.release());
    this.controls.on('pause', () => this.openPause());
    pauseButton(this, () => this.openPause());

    this.elapsed = 0; this.duskSaid = fromPhase > 0;
    setMusic('battle');
    applyFinish(this);
    this.cameras.main.fadeIn(500, 120, 90, 60);
    const phase = this.cfg.phases[fromPhase];
    if (fromPhase === 0) {
      sfx.roar();
      titleCard(this, this.cfg.intro, this.cfg.rule, 3600);
      this.time.delayedCall(700, () => bark(this, 'hint', this.cfg.hint, 5200));
    } else titleCard(this, 'Rise again', this.cfg.rule, 2400);
    if (phase.say) this.time.delayedCall(fromPhase === 0 ? 6200 : 600, () => bark(this, phase.say.speaker, phase.say.text, 3600));
    this.time.delayedCall(fromPhase === 0 ? 4200 : 2200, () => this.nextMove());
  }

  // ---------------------------------------------------------------- helpers the boss module uses
  /** A telegraph time in seconds, scaled by difficulty (`pause` = a recovery window, scaled the other way). */
  t(s, recover = false) { const d = diff(); return recover ? s * d.pause : s * d.telegraph; }
  pose(name, dir) {
    const key = this.bossKeys[this.bossDef.poses[name]] ?? this.bossKeys.stand;
    this.boss.setTexture(key);
    sizeFor(this.boss, this.bossH, HUMAN_PX);
    face(this.boss, dir ?? (this.h.x > this.boss.x ? 'right' : 'left'));
  }
  get home() { return this._home; }
  set home(v) { this._home = v; }
  mark(x, key, seconds) {
    const m = this.add.image(x, FEET - 4, key).setDepth(47).setAlpha(0);
    (this.marks ??= new Set()).add(m); m.once('destroy', () => this.marks.delete(m));
    this.tweens.add({ targets: m, alpha: 1, duration: 150 });
    this.tweens.add({ targets: m, scale: (m.scale || 1) * 1.15, yoyo: true, repeat: -1, duration: 160 });
    this.time.delayedCall(seconds * 1000, () => m.destroy());
    return m;
  }
  /** The first time each danger appears: slow time briefly and say what to do. */
  teach(kind, text) {
    if (this.seen.has(kind)) return;
    this.seen.add(kind);
    prompt(this, this.h.x, FEET - this.hero.displayHeight - 50, text, 1400);
    this.slow = 0.5; this.time.timeScale = 0.5; this.tweens.timeScale = 0.5;
    this.time.delayedCall(450, () => { this.slow = 1; this.time.timeScale = 1; this.tweens.timeScale = 1; }); // 0.9s real time
  }
  hazard(update, sprite) { this.hazards.push({ update, sprite }); }
  puff(x, y, scale = 0.5, ms = 500) {
    const p = this.add.image(x, y, 'dust').setScale(scale).setDepth(57);
    this.tweens.add({ targets: p, alpha: 0, scale: scale * 1.6, duration: ms, onComplete: () => p.destroy() });
  }
  gone(v) { this.b.gone = v; }
  shake(ms, amt) { shake(this, ms, amt); }
  buzz(ms) { buzz(ms); }
  impact(x, y, big) { impact(this, x, y, big); }

  // ---------------------------------------------------------------- hero
  roll() {
    const h = this.h, R = this.T.roll;
    if (this.over || h.y < FEET - 1 || h.rollT > 0) return;
    h.rollT = R.time; h.rollDir = this.controls.moveX ? Math.sign(this.controls.moveX) : (h.dir === 'right' ? 1 : -1);
    h.invuln = Math.max(h.invuln, R.invulnerable); h.drawT = 0; sfx.roll();
    this.puff(h.x, FEET - 20, 0.35, 400);
  }

  bowPoint() {
    const d = this.hero.displayWidth, top = this.hero.y - this.hero.displayHeight, s = this.h.dir === 'right' ? 1 : -1;
    return { x: this.hero.x + s * 0.3 * d, y: top + this.hero.displayHeight * 0.36 };
  }

  /** Velocity and gravity of an arrow at this power (0..1) and the current aim. */
  launch(power) {
    const B = this.cfg.bow, a = Phaser.Math.DegToRad(this.h.angle), s = this.h.dir === 'right' ? 1 : -1;
    const speed = B.minSpeed + (B.maxSpeed - B.minSpeed) * power;
    return { vx: Math.cos(a) * speed * s, vy: -Math.sin(a) * speed, g: B.minGravity + (B.maxGravity - B.minGravity) * power };
  }

  aim() {
    const B = this.cfg.bow, h = this.h, a = this.controls.aimFromDrag(), p = this.bowPoint();
    let ang;
    if (a.mouse) {
      if (Math.abs(a.mouse.x - h.x) > 18) h.dir = a.mouse.x >= h.x ? 'right' : 'left';
      ang = Phaser.Math.RadToDeg(Math.atan2(p.y - a.mouse.y, Math.abs(a.mouse.x - p.x)));
    } else {
      if (a.flip) h.dir = a.flip > 0 ? 'right' : 'left';
      ang = a.angle;
    }
    if (settings.aimAssist && !this.b.gone) { // lean toward the head
      const hb = this.bossBox().head, t = Phaser.Math.RadToDeg(Math.atan2(p.y - hb.centerY, Math.abs(hb.centerX - p.x)));
      ang = a.mouse ? ang * 0.6 + t * 0.4 : t + ang * 0.5;
    }
    h.angle = Phaser.Math.Clamp(ang, -B.aimDown, B.aimUp);
  }

  release() {
    const h = this.h, B = this.cfg.bow;
    if (this.over || h.drawT <= 0.04) { h.drawT = 0; return; }
    const power = Math.min(1, h.drawT / B.fullDraw), full = power >= 1, L = this.launch(power), p = this.bowPoint();
    const s = this.add.image(p.x, p.y, 'arrow').setDepth(56).setScale(full ? 1.05 : 0.85);
    if (full) s.setTint(0xffe9a8);
    this.arrows.push({ s, vx: L.vx, vy: L.vy, g: L.g, full, dmg: full ? B.fullDamage : B.quickDamage, life: 2.4 });
    sfx.twang(power); if (full) buzz(15);
    h.drawT = 0; h.fullCue = false; h.cool = B.cooldown; h.shot = 0.16;
  }

  hurt(dmg = 1) {
    const h = this.h;
    if (h.invuln > 0 || this.over) return;
    h.hearts -= dmg; this.hearts.set(h.hearts); h.invuln = this.T.hurtInvulnerable;
    h.vx = h.x < this.boss.x ? -420 : 420; h.vy = -420; h.drawT = 0;
    sfx.hurt(); buzz(120); shake(this, 250, 0.01);
    this.hero.setTint(0xff6a5a); this.time.delayedCall(180, () => this.hero.clearTint());
    if (h.hearts <= 0) this.lose();
  }

  // ---------------------------------------------------------------- boss
  bossBox() {
    const b = this.boss.getBounds();
    return {
      body: new Phaser.Geom.Rectangle(b.x + b.width * 0.22, b.y + b.height * 0.22, b.width * 0.56, b.height * 0.78),
      head: new Phaser.Geom.Rectangle(b.x + b.width * 0.25, b.y, b.width * 0.5, b.height * 0.22),
    };
  }

  phaseNow() {
    const frac = this.b.hp / this.maxHp;
    let i = 0; this.cfg.phases.forEach((p, k) => { if (frac <= p.from) i = k; });
    return i;
  }

  nextMove() {
    if (this.over) return;
    const pi = this.phaseNow(), phase = this.cfg.phases[pi];
    if (pi !== this.b.phase) { // a new phase: the story speaks, then the fight resumes
      this.b.phase = pi;
      if (phase.say) bark(this, phase.say.speaker, phase.say.text, 3600);
      if (phase.dusk) this.duskSaid = true;
      sfx.roar(); this.time.delayedCall(1800, () => this.nextMove());
      return;
    }
    const reach = this.cfg.moves.swipe?.reach ?? 0;
    let moves = phase.moves.filter(m => m !== 'swipe' || Math.abs(this.h.x - this.boss.x) < reach + 140);
    if (moves.includes('swipe')) moves = ['swipe', 'swipe', ...moves]; // she swipes when you come close
    if (this.lastMove && moves.length > 1) moves = moves.filter(m => m !== this.lastMove || m === 'swipe');
    const move = Phaser.Utils.Array.GetRandom(moves);
    this.lastMove = move; this.b.busy = true;
    this.bossDef[move](this, this.cfg.moves[move], () => {
      this.b.busy = false;
      if (this.over) return;
      const [a, b] = phase.pause;
      this.time.delayedCall(this.t(Phaser.Math.FloatBetween(a, b), true) * 1000, () => this.nextMove());
    });
  }

  damageBoss(n, weak, at) {
    this.b.hp = Math.max(0, this.b.hp - n); this.bar.set(this.b.hp / this.maxHp);
    weak ? sfx.weak() : sfx.hit();
    impact(this, at.x, at.y, n >= 3);
    this.freeze = n >= 3 ? this.T.hitPauseFull : this.T.hitPause;
    this.boss.setTint(weak ? 0xffe08a : 0xff9a8a); this.time.delayedCall(90, () => this.boss.clearTint());
    if (!this.b.busy) { // flinch
      const dir = this.h.x < this.boss.x ? 1 : -1;
      this.tweens.add({ targets: this.boss, x: this.boss.x + dir * (n >= 3 ? 14 : 6), duration: 60, yoyo: true });
    }
    if (n >= 3) buzz(25);
    if (this.b.hp <= 0) this.win();
  }

  // ---------------------------------------------------------------- outcomes
  win() {
    this.over = true; this.controls.enabled = false; this.ring.clear();
    this.time.removeAllEvents(); this.time.timeScale = 1; this.tweens.timeScale = 1;
    this.hero.setAlpha(1).setTexture(this.heroKeys.stand); sizeFor(this.hero, this.heroH, HUMAN_PX);
    const fx = this.boss.x;
    this.freeze = 0.25; sfx.fall(); shake(this, 900, 0.02); buzz(200);
    impact(this, fx, FEET - 240, true);
    this.tweens.killTweensOf(this.boss);
    this.tweens.add({ targets: this.boss, angle: this.boss.flipX ? 18 : -18, y: FEET + 40, alpha: 0, duration: 1600, ease: 'Quad.easeIn' });
    for (let i = 0; i < 10; i++) this.time.delayedCall(i * 80, () => this.puff(fx + Phaser.Math.Between(-160, 160), FEET - Phaser.Math.Between(20, 300), 0.6, 1800));
    this.hazards.forEach(h => h.sprite?.destroy()); this.hazards = [];
    this.marks?.forEach(m => m.destroy()); clearBark();
    this.time.delayedCall(1500, () => {
      setMusic('dawn'); healSwell();
      this.stage.heal(fx, 3600);
      titleCard(this, this.cfg.healTitle, '', 3000);
    });
    this.time.delayedCall(6400, () => {
      this.cameras.main.fadeOut(900, 248, 239, 217);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.standalone ? 'Complete' : 'Story', { chapter: this.ch.id, resume: true }));
    });
  }

  lose() {
    this.over = true; this.controls.enabled = false; this.ring.clear();
    this.marks?.forEach(m => m.destroy());
    this.time.removeAllEvents(); this.time.timeScale = 1; this.tweens.timeScale = 1;
    this.tweens.add({ targets: this.hero, angle: this.h.dir === 'right' ? -80 : 80, y: FEET + 10, duration: 600 });
    const checkpoint = this.b.phase; // later phases resume where they began
    this.time.delayedCall(900, () => {
      bark(this, 'note', checkpoint > 0 ? 'Rama is struck down. Tap to rise again, at the falling of the dusk.' : 'Rama is struck down. Tap to rise again.', 60000);
      this.input.once('pointerup', () => this.scene.restart({ ...this.data0, fromPhase: checkpoint }));
    });
  }

  openPause() {
    if (this.over) return;
    this.scene.launch('Pause', { from: this.scene.key, chapter: this.ch.id, data: this.data0 });
    this.scene.pause();
  }

  // ---------------------------------------------------------------- frame
  update(_t, dtMs) {
    let dt = Math.min(dtMs / 1000, 0.05) * this.slow;
    this.controls.update();
    if (this.freeze > 0) { this.freeze -= dt; return; } // hit-pause
    const h = this.h, T = this.T, B = this.cfg.bow;
    this.elapsed += dt;
    this.stage.setDusk(Math.min(1, this.elapsed / this.cfg.duskTimer + (this.b.phase > 0 ? 0.5 : 0)));

    // movement, jump (with coyote time and a buffer) and roll
    const drawing = this.controls.drawing && !this.over && h.rollT <= 0;
    const mx = this.over ? 0 : this.controls.moveX;
    if (h.rollT > 0) { h.rollT -= dt; h.vx = h.rollDir * T.roll.speed; h.dir = h.rollDir > 0 ? 'right' : 'left'; }
    else h.vx = Phaser.Math.Linear(h.vx, mx * (drawing ? T.drawWalk : T.walk), 0.3);
    if (!drawing && h.rollT <= 0 && Math.abs(mx) > 0.1) h.dir = mx > 0 ? 'right' : 'left';
    h.x = Phaser.Math.Clamp(h.x + h.vx * dt, 70, this.view.w - 70);
    const onGround = h.y >= FEET - 0.5;
    h.coyote = onGround ? T.coyoteTime : h.coyote - dt; h.jumpBuf -= dt;
    if (h.jumpBuf > 0 && h.coyote > 0 && h.rollT <= 0 && !this.over) { h.vy = -T.jumpVelocity; h.jumpBuf = 0; h.coyote = 0; sfx.jump(); }
    h.vy += T.gravity * dt; h.y = Math.min(FEET, h.y + h.vy * dt); if (h.y >= FEET) h.vy = 0;
    if (Math.abs(h.vx) > 30 && onGround) h.step += dt;
    h.cool -= dt; h.invuln -= dt; h.shot -= dt;

    // the bow: draw while held, the ring fills
    if (drawing && h.cool <= 0) {
      if (h.drawT === 0 && !this.controls.aimFromDrag().mouse && Math.abs(mx) < 0.1 && !this.b.gone) h.dir = this.boss.x >= h.x ? 'right' : 'left';
      h.drawT += dt; this.aim();
      if (h.drawT >= B.fullDraw && !h.fullCue) { h.fullCue = true; sfx.fullDraw(); buzz(10); }
    }

    // hero sprite
    if (!this.over) {
      const stride = Math.floor(h.step / 0.2) % 2;
      this.hero.setTexture(h.drawT > 0 || h.shot > 0 ? this.heroKeys.draw : Math.abs(h.vx) > 30 && stride ? this.heroKeys.walk : this.heroKeys.stand);
      sizeFor(this.hero, this.heroH, HUMAN_PX);
      if (h.rollT > 0) this.hero.scaleY *= 0.72; // a low crouching dash
      face(this.hero, h.dir);
      this.hero.setPosition(h.x, h.y);
      this.hero.setAngle(h.drawT > 0 ? (h.dir === 'right' ? -1 : 1) * h.angle * 0.12 : 0); // lean into the aim
      this.hero.setAlpha(h.invuln > 0 && h.rollT <= 0 ? (Math.floor(h.invuln * 12) % 2 ? 0.4 : 1) : 1);
    }

    // the charge ring, and at full draw the flight in rice-paste dots
    this.ring.clear();
    if (h.drawT > 0 && !this.over) {
      const k = Math.min(1, h.drawT / B.fullDraw), cx = h.x, cy = h.y - this.hero.displayHeight * 0.45, r = this.hero.displayHeight * 0.36;
      const a0 = -Math.PI / 2, a1 = a0 + k * Math.PI * 2;
      this.ring.lineStyle(8, PAL.black, 0.9).beginPath().arc(cx, cy, r, a0, a1).strokePath();
      this.ring.lineStyle(4, k >= 1 ? PAL.turmeric : PAL.indigo, 1).beginPath().arc(cx, cy, r, a0, a1).strokePath();
      if (k >= 1) {
        const L = this.launch(1), p = this.bowPoint();
        let x = p.x, y = p.y, vy = L.vy;
        for (let i = 0; i < 18; i++) {
          x += L.vx * 0.035; vy += L.g * 0.035; y += vy * 0.035;
          if (y > FEET) break;
          this.ring.fillStyle(PAL.black, 1).fillCircle(x, y, 7);
          this.ring.fillStyle(PAL.white, 1).fillCircle(x, y, 5);
        }
      }
    }

    // arrows
    const box = this.b.gone || this.over ? null : this.bossBox();
    this.arrows = this.arrows.filter(a => {
      a.vy += a.g * dt; a.s.x += a.vx * dt; a.s.y += a.vy * dt;
      a.s.rotation = Math.atan2(a.vy, a.vx); a.life -= dt;
      if (box) {
        const tip = { x: a.s.x + Math.cos(a.s.rotation) * 50, y: a.s.y + Math.sin(a.s.rotation) * 50 };
        const head = box.head.contains(tip.x, tip.y);
        if (head || box.body.contains(tip.x, tip.y)) {
          this.damageBoss(a.dmg * (head ? this.cfg.weakSpot.multiplier : 1), head, tip);
          a.s.destroy(); return false;
        }
      }
      if (a.s.y > FEET + 12) { a.s.y = FEET + 6; this.tweens.add({ targets: a.s, alpha: 0, delay: 700, duration: 400, onComplete: () => a.s.destroy() }); return false; }
      if (a.life <= 0 || a.s.x < -100 || a.s.x > this.view.w + 100) { a.s.destroy(); return false; }
      return true;
    });

    this.hazards = this.hazards.filter(hz => hz.update(dt));
    if (!this.b.busy && !this.over && !this.b.gone) face(this.boss, h.x > this.boss.x ? 'right' : 'left');
  }
}
