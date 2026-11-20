// A walk through a chapter's land: walk with the left thumb, touch glowing marks to read them,
// and reach the end trigger. Everything comes from the chapter's `walk` data.
import Phaser from 'phaser';
import { GROUND_Y, HUMAN_PX, view } from '../engine/layout.js';
import { Stage } from '../art/stage.js';
import { Controls } from '../engine/controls.js';
import { face, sizeFor } from '../engine/assets.js';
import { bark, titleCard } from '../engine/ui.js';
import { sfx, setDrone } from '../engine/audio.js';
import { applyFinish } from '../fx/finish.js';
import { pauseButton } from '../engine/ui.js';
import { chapter } from '../engine/chapters.js';

export class WalkScene extends Phaser.Scene {
  constructor() { super('Walk'); }

  create({ chapter: id, standalone }) {
    this.ch = chapter(id); this.cfg = this.ch.walk; this.standalone = standalone;
    const hero = this.ch.hero, key = s => `char.${hero.id}.${hero.stage}.${s}`;
    this.keys = { stand: key('stand'), walk: key('walk') };
    this.stage = new Stage(this, this.cfg.backdrop, { trees: 9, span: this.cfg.length });
    this.wx = 260; // hero's position in the world
    this.hero = this.add.image(0, GROUND_Y + 8, this.keys.stand).setOrigin(0.5, 1).setDepth(50);
    sizeFor(this.hero, hero.height, HUMAN_PX);
    this.baseScale = this.hero.scale;
    this.dir = 'right'; face(this.hero, 'right');
    this.step = 0;

    this.marks = this.cfg.hotspots.map(h => {
      const img = this.add.image(0, GROUND_Y - 30, `glyph.${h.glyph}`).setScale(0.55).setDepth(45);
      this.tweens.add({ targets: img, scale: 0.68, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
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
    this.hero.setTexture(walking && stride ? this.keys.walk : this.keys.stand);
    face(this.hero, this.dir);
    sizeFor(this.hero, this.ch.hero.height, HUMAN_PX);
    this.hero.y = GROUND_Y + 8 - (walking ? Math.abs(Math.sin(this.step * 14)) * 6 : 0);

    const s = this.scroll;
    this.stage.setScroll(s);
    this.hero.x = this.wx - s;
    for (const m of this.marks) m.img.x = m.x - s;

    if (!this.ending && this.wx >= this.cfg.end.x) this.finish();
  }

  finish() {
    this.ending = true; this.controls.enabled = false;
    sfx.stomp(); this.cameras.main.shake(700, 0.012);
    const W = view(this).w;
    if (this.cfg.end.dust) for (let i = 0; i < 9; i++) {
      const d = this.add.image(W + 200 + i * 60, GROUND_Y - 60 - Math.random() * 220, 'dust').setScale(1.2 + Math.random()).setDepth(70).setAlpha(0.95);
      this.tweens.add({ targets: d, x: W * 0.35 + i * 90, duration: 1800 + i * 120, ease: 'Sine.easeOut' });
    }
    this.time.delayedCall(2400, () => {
      this.cameras.main.fadeOut(600, 120, 90, 60);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.standalone ? 'Battle' : 'Story', { chapter: this.ch.id, resume: true, standalone: this.standalone }));
    });
  }
}
