// Shared UI pieces: dialogue box with portrait, choices, title cards, hearts and the boss bar.
// Drawn as paper plates with a double ink border, in keeping with the art.
import Phaser from 'phaser';
import { W, H, PAL, FONT } from './layout.js';
import { sfx } from './audio.js';

const SPEAKERS = { VISHVAMITRA: 'vishvamitra', RAMA: 'rama', LAKSHMANA: 'lakshmana', TATAKA: 'tataka' };

/** Split "SPEAKER: words" into { speaker, text }. */
export function parseLine(line) {
  const m = /^([A-Z][A-Z ]+):\s*(.*)$/.exec(line.trim());
  return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: null, text: line.trim() };
}

function plate(scene, x, y, w, h, depth) {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  g.fillStyle(PAL.paper, 0.96).fillRoundedRect(x, y, w, h, 14);
  g.lineStyle(5, PAL.black).strokeRoundedRect(x, y, w, h, 14);
  g.lineStyle(2, PAL.madder).strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 10);
  return g;
}

export class Dialogue {
  constructor(scene) {
    this.scene = scene;
    const y = H - 190, d = 960;
    this.box = scene.add.container(0, 0).setDepth(d).setScrollFactor(0).setVisible(false);
    this.box.add(plate(scene, 40, y, W - 80, 160, d));
    this.portraitFrame = scene.add.rectangle(110, y + 80, 128, 128, PAL.black).setStrokeStyle(4, PAL.gold);
    this.portrait = scene.add.image(110, y + 80, '__DEFAULT').setDisplaySize(120, 120);
    this.name = scene.add.text(196, y + 22, '', { fontFamily: FONT.serif, fontSize: '24px', fontStyle: 'bold', color: '#96283a' });
    this.text = scene.add.text(196, y + 56, '', { fontFamily: FONT.serif, fontSize: '27px', color: '#1d1613', wordWrap: { width: W - 300 }, lineSpacing: 6 });
    this.more = scene.add.text(W - 70, y + 128, '▸', { fontFamily: FONT.serif, fontSize: '28px', color: '#96283a' }).setOrigin(1, 0.5);
    this.box.add([this.portraitFrame, this.portrait, this.name, this.text, this.more]);
    scene.tweens.add({ targets: this.more, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    this.choices = [];
  }

  /** Show one line; resolves when the reader taps past it. */
  say(line) {
    const { speaker, text } = parseLine(line);
    const id = speaker && SPEAKERS[speaker];
    const hasPortrait = id && this.scene.textures.exists(`portrait.${id}`);
    this.portrait.setVisible(!!hasPortrait); this.portraitFrame.setVisible(!!hasPortrait);
    if (hasPortrait) this.portrait.setTexture(`portrait.${id}`).setDisplaySize(120, 120);
    const x = hasPortrait ? 196 : 80;
    this.name.setX(x).setText(speaker ? speaker[0] + speaker.slice(1).toLowerCase() : '');
    this.text.setX(x).setY(speaker ? H - 134 : H - 150).setWordWrapWidth(W - x - 110).setFontStyle(speaker ? 'normal' : 'italic');
    this.box.setVisible(true);
    this.full = text; this.shown = 0; this.text.setText('');
    this.more.setVisible(false);
    return new Promise(resolve => {
      this.resolve = resolve;
      this.timer?.remove();
      this.timer = this.scene.time.addEvent({ delay: 18, loop: true, callback: () => {
        this.shown += 2; this.text.setText(this.full.slice(0, this.shown));
        if (this.shown >= this.full.length) { this.timer.remove(); this.more.setVisible(true); }
      } });
    });
  }

  /** Tap: finish typing, or continue. */
  advance() {
    if (!this.resolve || this.choices.length) return;
    if (this.shown < this.full.length) { this.shown = this.full.length; this.text.setText(this.full); this.timer.remove(); this.more.setVisible(true); return; }
    const r = this.resolve; this.resolve = null; sfx.tap(); r();
  }

  /** Show choices; resolves with the chosen index. */
  choose(options) {
    this.box.setVisible(false);
    return new Promise(resolve => {
      const n = options.length, w = 560, h = 70, y0 = H / 2 - (n * (h + 18)) / 2;
      options.forEach((label, i) => {
        const y = y0 + i * (h + 18), c = this.scene.add.container(0, 0).setDepth(970).setScrollFactor(0);
        c.add(plate(this.scene, W / 2 - w / 2, y, w, h, 970));
        c.add(this.scene.add.text(W / 2, y + h / 2, label, { fontFamily: FONT.serif, fontSize: '28px', color: '#1d1613' }).setOrigin(0.5));
        const hit = this.scene.add.zone(W / 2, y + h / 2, w, h).setInteractive().setScrollFactor(0);
        hit.on('pointerup', () => { sfx.tap(); this.choices.forEach(o => o.destroy()); this.choices = []; resolve(i); });
        c.add(hit);
        this.choices.push(c);
      });
    });
  }

  hide() { this.box.setVisible(false); }
}

/** A title card that slides in and fades out. */
export function titleCard(scene, title, sub = '', hold = 2200) {
  const c = scene.add.container(W / 2, 120).setDepth(965).setScrollFactor(0).setAlpha(0);
  const t = scene.add.text(0, 0, title, { fontFamily: FONT.serif, fontSize: '44px', fontStyle: 'bold', color: '#f8efd9', stroke: '#1d1613', strokeThickness: 8 }).setOrigin(0.5);
  c.add(t);
  if (sub) c.add(scene.add.text(0, 52, sub, { fontFamily: FONT.serif, fontSize: '27px', fontStyle: 'italic', color: '#f8efd9', stroke: '#1d1613', strokeThickness: 8 }).setOrigin(0.5));
  scene.tweens.add({ targets: c, alpha: 1, y: 140, duration: 500, ease: 'Sine.easeOut' });
  scene.time.delayedCall(hold, () => scene.tweens.add({ targets: c, alpha: 0, duration: 600, onComplete: () => c.destroy() }));
  return c;
}

/** A short line of speech over the action (no tap needed). */
export function bark(scene, speaker, text, hold = 2600) {
  const c = scene.add.container(W / 2, H - 70).setDepth(965).setScrollFactor(0);
  const label = scene.add.text(0, 0, `${speaker[0].toUpperCase() + speaker.slice(1)}: ${text}`, { fontFamily: FONT.serif, fontSize: '26px', color: '#1d1613', wordWrap: { width: 900 }, align: 'center' }).setOrigin(0.5);
  const b = label.getBounds();
  c.add(plate(scene, -b.width / 2 - 28, -b.height / 2 - 16, b.width + 56, b.height + 32, 965)); c.add(label);
  c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 250 });
  scene.time.delayedCall(hold, () => scene.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() }));
}

/** Lotus hearts for the hero. */
export class Hearts {
  constructor(scene, max) {
    this.icons = Array.from({ length: max }, (_, i) => scene.add.image(48 + i * 52, 46, 'glyph.lotus').setScale(0.36).setScrollFactor(0).setDepth(960));
    this.set(max);
  }
  set(n) { this.icons.forEach((ic, i) => ic.setAlpha(i < n ? 1 : 0.18).setScale(i < n ? 0.36 : 0.28)); }
}

/** Boss health bar with name. */
export class BossBar {
  constructor(scene, name) {
    const x = W / 2, y = 40, w = 520;
    this.w = w;
    scene.add.text(x, y - 4, name, { fontFamily: FONT.serif, fontSize: '22px', fontStyle: 'bold', color: '#f8efd9', stroke: '#1d1613', strokeThickness: 6 }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(960);
    scene.add.rectangle(x, y + 14, w + 8, 24, PAL.black).setScrollFactor(0).setDepth(960);
    this.fill = scene.add.rectangle(x - w / 2, y + 14, w, 16, PAL.kusum).setOrigin(0, 0.5).setScrollFactor(0).setDepth(961);
  }
  set(frac) { this.fill.width = this.w * Phaser.Math.Clamp(frac, 0, 1); }
}
