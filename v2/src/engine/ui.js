// Shared UI: dialogue box with portrait, choices, title cards, barks, teaching prompts, hearts,
// the boss bar, the pause button and woodcut impact flashes. Paper plates with a double ink border.
import Phaser from 'phaser';
import { view, PAL, FONT } from './layout.js';
import { sfx } from './audio.js';
import { settings } from './settings.js';

const SPEAKERS = { VISHVAMITRA: 'vishvamitra', RAMA: 'rama', LAKSHMANA: 'lakshmana', TATAKA: 'tataka' };
const cap = s => s[0].toUpperCase() + s.slice(1).toLowerCase();

/** Split "SPEAKER: words" into { speaker, text }. */
export function parseLine(line) {
  const m = /^([A-Z][A-Z ]+):\s*(.*)$/.exec(line.trim());
  return m ? { speaker: m[1].trim(), text: m[2] } : { speaker: null, text: line.trim() };
}

export function plate(scene, x, y, w, h, depth) {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  g.fillStyle(PAL.paper, 0.97).fillRoundedRect(x, y, w, h, 14);
  g.lineStyle(5, PAL.black).strokeRoundedRect(x, y, w, h, 14);
  g.lineStyle(2, PAL.madder).strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 10);
  return g;
}

export class Dialogue {
  constructor(scene) {
    this.scene = scene;
    const { w, h } = view(scene), bw = Math.min(w - 80, 1240), x0 = (w - bw) / 2, y = h - 190, d = 960;
    this.x0 = x0; this.bw = bw;
    this.box = scene.add.container(0, 0).setDepth(d).setScrollFactor(0).setVisible(false);
    this.box.add(plate(scene, x0, y, bw, 160, d));
    this.portraitFrame = scene.add.rectangle(x0 + 70, y + 80, 128, 128, PAL.black).setStrokeStyle(4, PAL.gold);
    this.portrait = scene.add.image(x0 + 70, y + 80, '__DEFAULT').setDisplaySize(120, 120);
    this.name = scene.add.text(0, y + 22, '', { fontFamily: FONT.serif, fontSize: '24px', fontStyle: 'bold', color: '#96283a' });
    this.text = scene.add.text(0, y + 56, '', { fontFamily: FONT.serif, fontSize: '27px', color: '#1d1613', lineSpacing: 6, wordWrap: { width: bw - 260 } });
    this.more = scene.add.text(x0 + bw - 30, y + 128, '▸', { fontFamily: FONT.serif, fontSize: '28px', color: '#96283a' }).setOrigin(1, 0.5);
    this.box.add([this.portraitFrame, this.portrait, this.name, this.text, this.more]);
    scene.tweens.add({ targets: this.more, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    this.choices = [];
  }

  /** Show one line; resolves when the reader taps past it. */
  say(line) {
    const { speaker, text } = parseLine(line), { h } = view(this.scene);
    const id = speaker && SPEAKERS[speaker];
    const hasPortrait = id && this.scene.textures.exists(`portrait.${id}`);
    this.portrait.setVisible(!!hasPortrait); this.portraitFrame.setVisible(!!hasPortrait);
    if (hasPortrait) this.portrait.setTexture(`portrait.${id}`).setDisplaySize(120, 120);
    const x = this.x0 + (hasPortrait ? 156 : 40);
    this.name.setX(x).setText(speaker ? cap(speaker) : '');
    this.text.setX(x).setY(speaker ? h - 134 : h - 150).setWordWrapWidth(this.x0 + this.bw - x - 60).setFontStyle(speaker ? 'normal' : 'italic');
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
    const { cx, cy } = view(this.scene);
    return new Promise(resolve => {
      const n = options.length, w = 560, h = 70, y0 = cy - (n * (h + 18)) / 2;
      options.forEach((label, i) => {
        const y = y0 + i * (h + 18), c = this.scene.add.container(0, 0).setDepth(970).setScrollFactor(0);
        c.add(plate(this.scene, cx - w / 2, y, w, h, 970));
        c.add(this.scene.add.text(cx, y + h / 2, label, { fontFamily: FONT.serif, fontSize: '28px', color: '#1d1613' }).setOrigin(0.5));
        const hit = this.scene.add.zone(cx, y + h / 2, w, h).setInteractive().setScrollFactor(0);
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
  const { cx } = view(scene);
  const c = scene.add.container(cx, 120).setDepth(965).setScrollFactor(0).setAlpha(0);
  c.add(scene.add.text(0, 0, title, { fontFamily: FONT.serif, fontSize: '44px', fontStyle: 'bold', color: '#f8efd9', stroke: '#1d1613', strokeThickness: 8 }).setOrigin(0.5));
  if (sub) c.add(scene.add.text(0, 52, sub, { fontFamily: FONT.serif, fontSize: '27px', fontStyle: 'italic', color: '#f8efd9', stroke: '#1d1613', strokeThickness: 8 }).setOrigin(0.5));
  scene.tweens.add({ targets: c, alpha: 1, y: 140, duration: 500, ease: 'Sine.easeOut' });
  scene.time.delayedCall(hold, () => scene.tweens.add({ targets: c, alpha: 0, duration: 600, onComplete: () => c.destroy() }));
  return c;
}

let barkNow = null;
/** Remove whatever line is on screen (when the moment it belonged to has passed). */
export function clearBark() { barkNow?.destroy(); barkNow = null; }
/** A short line over the action (no tap needed). One at a time; a new one replaces the old. */
export function bark(scene, speaker, text, hold = 2600) {
  const { cx, h } = view(scene);
  barkNow?.destroy();
  const c = scene.add.container(cx, h - 70).setDepth(965).setScrollFactor(0);
  const who = speaker === 'hint' || speaker === 'note' ? '' : `${cap(speaker)}: `;
  const label = scene.add.text(0, 0, who + text, { fontFamily: FONT.serif, fontSize: '26px', color: '#1d1613', wordWrap: { width: 900 }, align: 'center', fontStyle: speaker === 'hint' ? 'italic' : 'normal' }).setOrigin(0.5);
  const b = label.getBounds();
  c.add(plate(scene, -b.width / 2 - 28, -b.height / 2 - 16, b.width + 56, b.height + 32, 965)); c.add(label);
  c.setAlpha(0); scene.tweens.add({ targets: c, alpha: 1, duration: 250 });
  barkNow = c;
  scene.time.delayedCall(hold, () => scene.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => { c.destroy(); if (barkNow === c) barkNow = null; } }));
  return c;
}

/** A teaching prompt above a point in the world ("Jump!"), shown while a danger is telegraphed. */
export function prompt(scene, x, y, text, hold = 1200) {
  const t = scene.add.text(x, y, text, { fontFamily: FONT.serif, fontSize: '34px', fontStyle: 'bold', color: '#f8efd9', stroke: '#96283a', strokeThickness: 8 }).setOrigin(0.5).setDepth(940);
  scene.tweens.add({ targets: t, y: y - 16, yoyo: true, repeat: -1, duration: 260 });
  scene.time.delayedCall(hold, () => t.destroy());
  return t;
}

/** Woodcut impact frame: a black-and-paper starburst for a few frames (the art plan's impact layer). */
export function impact(scene, x, y, big = false) {
  const g = scene.add.graphics().setDepth(70).setPosition(x, y);
  const spikes = big ? 14 : 9, r1 = big ? 120 : 60, r0 = r1 * 0.35;
  const pts = []; for (let i = 0; i < spikes * 2; i++) { const a = (i / (spikes * 2)) * Math.PI * 2 + Math.random() * 0.2, r = i % 2 ? r0 : r1 * (0.75 + Math.random() * 0.4); pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  g.fillStyle(PAL.black, 1).fillPoints(pts, true);
  g.fillStyle(big ? PAL.turmeric : PAL.paper, 1).fillCircle(0, 0, r0 * 0.9);
  g.lineStyle(3, PAL.black).strokeCircle(0, 0, r0 * 0.9);
  g.setRotation(Math.random() * Math.PI).setScale(0.6);
  scene.tweens.add({ targets: g, scale: 1, alpha: 0, duration: big ? 260 : 160, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
}

/** Camera shake that respects the reduce-motion setting. */
export const shake = (scene, ms, amt) => { if (settings.motion) scene.cameras.main.shake(ms, amt); };

/** Lotus hearts for the hero. */
export class Hearts {
  constructor(scene, max) {
    this.icons = Array.from({ length: max }, (_, i) => scene.add.image(48 + i * 52, 46, 'glyph.lotus').setScale(0.36).setScrollFactor(0).setDepth(960));
    this.set(max);
  }
  set(n) { this.icons.forEach((ic, i) => ic.setAlpha(i < n ? 1 : 0.18).setScale(i < n ? 0.36 : 0.28)); }
}

/** Boss health bar with name, and a notch where the next phase begins. */
export class BossBar {
  constructor(scene, name, notches = []) {
    const { cx } = view(scene), y = 40, w = 520;
    this.w = w;
    scene.add.text(cx, y - 4, name, { fontFamily: FONT.serif, fontSize: '22px', fontStyle: 'bold', color: '#f8efd9', stroke: '#1d1613', strokeThickness: 6 }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(960);
    scene.add.rectangle(cx, y + 14, w + 8, 24, PAL.black).setScrollFactor(0).setDepth(960);
    this.fill = scene.add.rectangle(cx - w / 2, y + 14, w, 16, PAL.kusum).setOrigin(0, 0.5).setScrollFactor(0).setDepth(961);
    for (const f of notches) scene.add.rectangle(cx - w / 2 + w * f, y + 14, 4, 24, PAL.paper).setScrollFactor(0).setDepth(962);
  }
  set(frac) { this.fill.width = this.w * Phaser.Math.Clamp(frac, 0, 1); }
}

/** The round pause button, top right. */
export function pauseButton(scene, onPress) {
  const { w } = view(scene), x = w - 56, y = 48;
  const c = scene.add.container(x, y).setDepth(965).setScrollFactor(0);
  c.add(scene.add.circle(0, 0, 30, PAL.paper, 0.92).setStrokeStyle(4, PAL.black));
  c.add(scene.add.rectangle(-8, 0, 7, 24, PAL.black)); c.add(scene.add.rectangle(8, 0, 7, 24, PAL.black));
  const hit = scene.add.zone(0, 0, 90, 90).setInteractive(); c.add(hit);
  hit.on('pointerdown', (_p, _x, _y, e) => e?.stopPropagation());
  hit.on('pointerup', () => { sfx.tap(); onPress(); });
  return c;
}
