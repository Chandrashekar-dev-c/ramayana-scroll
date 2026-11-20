// A walk through a chapter's land: walk with the left thumb, touch glowing marks to read them,
// and reach the end trigger. Everything comes from the chapter's `walk` data.
import Phaser from 'phaser';
import { GROUND_Y, HUMAN_PX, view } from '../engine/layout.js';
import { Stage } from '../art/stage.js';
import { Controls } from '../engine/controls.js';
import { face, poseKey, setPose } from '../engine/assets.js';
import { dust, lotusKey } from '../art/fx.js';
import { bark, titleCard } from '../engine/ui.js';
import { sfx, setDrone } from '../engine/audio.js';
import { applyFinish } from '../fx/finish.js';
import { pauseButton } from '../engine/ui.js';
import { chapter } from '../engine/chapters.js';

export class WalkScene extends Phaser.Scene {
  constructor() { super('Walk'); }

  create({ chapter: id, standalone }) {
    this.ch = chapter(id); this.cfg = this.ch.walk; this.standalone = standalone;
    const hero = this.ch.hero;
    this.heroKey = `char.${hero.id}.${hero.stage}`;
    this.stage = new Stage(this, this.cfg.backdrop, { trees: 7, span: this.cfg.length });
    this.wx = 260; // hero's position in the world
    this.hero = this.add.image(0, GROUND_Y + 8, poseKey(this, this.heroKey, 'stand')).setOrigin(0.5, 1).setDepth(50);
    this.dir = 'right'; setPose(this.hero, this.heroKey, 'stand', hero.height, HUMAN_PX, 'right');
    // companions walk behind, each a little slower to catch up (chapter data `walk.followers`)
    this.followers = (this.cfg.followers ?? []).map(f => {
      const key = `char.${f.id}.${f.stage ?? 'default'}`;
      const s = this.add.image(0, GROUND_Y + 8, poseKey(this, key, 'stand')).setOrigin(0.5, 1).setDepth(49);
      return { ...f, key, s, wx: this.wx - f.gap, step: 0, dir: 'right' };
    });
    this.step = 0;

    this.marks = this.cfg.hotspots.map(h => {
      const img = this.add.image(0, GROUND_Y - 40, lotusKey(this)).setDepth(45);
      const s = 70 / img.width; img.setScale(s);
      this.tweens.add({ targets: img, scale: s * 1.2, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
      return { ...h, img, read: false };
    });

    this.controls = new Controls(this);
    this.controls.on('tap', (x, y) => this.touch(x, y));
    setDrone('dusk');
    const pause = () => { this.scene.launch('Pause', { from: this.scene.key, chapter: this.chapterId ?? this.ch.id, data: { chapter: this.chapterId ?? this.ch.id } }); this.scene.pause(); };
    pauseButton(this, pause); this.controls.on('pause', pause);
    applyFinish(this);
    this.cameras.main.fadeIn(500, 29, 22, 19);
    titleCard(this, this.ch.title, this.ch.kanda);
    this.time.delayedCall(2600, () => bark(this, 'hint', this.cfg.hint, 4200));
    this.ending = false;
  }

  /** Screen x of a world position: the camera keeps the hero in the left-middle of the screen. */
  get scroll() { const W = this.scale.width; return Phaser.Math.Clamp(this.wx - W * 0.38, 0, this.cfg.length - W * 0.8); }

  touch(x) {
    for (const m of this.marks) {
      const sx = m.x - this.scroll;
      if (Math.abs(sx - x) < 140 && Math.abs(m.x - this.wx) < 380) {
        m.read = true; m.img.setTint(0xb0a090); sfx.chime(2); bark(this, 'note', m.text, 3800); return;
      }
    }
  }

  update(_t, dtMs) {
    const dt = dtMs / 1000;
    this.controls.update();
    const mx = this.ending ? 0 : this.controls.moveX;
    this.wx = Phaser.Math.Clamp(this.wx + mx * this.cfg.speed * dt, 120, this.cfg.length);
    if (mx) { this.dir = mx > 0 ? 'right' : 'left'; this.step += dt; }
    const walking = mx !== 0, stride = Math.floor(this.step / 0.22) % 2;
    setPose(this.hero, this.heroKey, walking ? (stride ? 'walk' : 'walk2') : 'stand', this.ch.hero.height, HUMAN_PX, this.dir);
    this.hero.y = GROUND_Y + 8 - (walking ? Math.abs(Math.sin(this.step * 14)) * 6 : 0);

    const s = this.scroll;
    this.stage.setScroll(s);
    this.hero.x = this.wx - s;
    for (const m of this.marks) m.img.x = m.x - s;
    for (const f of this.followers) { // follow at a distance, walking when they move
      const target = this.wx - (this.dir === 'right' ? f.gap : -f.gap);
      const d = target - f.wx, v = Phaser.Math.Clamp(d * 2.5, -this.cfg.speed, this.cfg.speed);
      f.wx += v * dt; const moving = Math.abs(v) > 25;
      if (moving) { f.dir = v > 0 ? 'right' : 'left'; f.step += dt; }
      if (!this.ending || !f.endPose) setPose(f.s, f.key, moving ? (Math.floor(f.step / 0.24) % 2 ? 'walk' : 'walk2') : 'stand', f.height, HUMAN_PX * 0.95, f.dir);
      f.s.x = f.wx - s; f.s.y = GROUND_Y + 8 - (moving ? Math.abs(Math.sin(f.step * 12)) * 5 : 0);
    }

    if (!this.ending && this.wx >= this.cfg.end.x) this.finish();
  }

  finish() {
    this.ending = true; this.controls.enabled = false;
    sfx.stomp(); this.cameras.main.shake(700, 0.012);
    const W = view(this).w;
    for (const f of this.followers) if (f.endPose) setPose(f.s, f.key, f.endPose, f.height, HUMAN_PX * 0.95, 'right');
    setPose(this.hero, this.heroKey, 'stand', this.ch.hero.height, HUMAN_PX, 'right');
    if (this.cfg.end.dust) for (let i = 0; i < 9; i++) {
      const d = dust(this, W + 200 + i * 60, GROUND_Y - 80 - Math.random() * 200, 260 + Math.random() * 160).setDepth(70).setAlpha(0.95);
      this.tweens.add({ targets: d, x: W * 0.35 + i * 90, duration: 1800 + i * 120, ease: 'Sine.easeOut' });
    }
    this.time.delayedCall(2400, () => {
      this.cameras.main.fadeOut(600, 120, 90, 60);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.standalone ? 'Battle' : 'Story', { chapter: this.ch.id, resume: true, standalone: this.standalone }));
    });
  }
}
