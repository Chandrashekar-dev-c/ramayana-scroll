// Pause and settings, over whichever scene is paused. Every choice is saved on the device.
import Phaser from 'phaser';
import { view, PAL, FONT } from '../engine/layout.js';
import { plate } from '../engine/ui.js';
import { settings, DIFFICULTY } from '../engine/settings.js';
import { sfx } from '../engine/audio.js';

const VOLUMES = [0, 0.4, 0.8, 1];

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create({ from, chapter, data }) {
    const { w, h, cx } = view(this);
    this.add.rectangle(cx, h / 2, w, h, PAL.black, 0.62).setInteractive();
    const pw = 620, ph = 600, x0 = cx - pw / 2, y0 = (h - ph) / 2;
    plate(this, x0, y0, pw, ph, 0);
    this.add.text(cx, y0 + 46, 'Paused', { fontFamily: FONT.serif, fontSize: '40px', fontStyle: 'bold', color: '#1d1613' }).setOrigin(0.5);

    const rows = [
      ['Difficulty', () => DIFFICULTY[settings.difficulty].label, () => { const k = Object.keys(DIFFICULTY); settings.difficulty = k[(k.indexOf(settings.difficulty) + 1) % k.length]; }],
      ['Aim help', () => (settings.aimAssist ? 'On' : 'Off'), () => { settings.aimAssist = !settings.aimAssist; }],
      ['Bow on the left (left-handed)', () => (settings.lefty ? 'On' : 'Off'), () => { settings.lefty = !settings.lefty; }],
      ['Vibration', () => (settings.vibrate ? 'On' : 'Off'), () => { settings.vibrate = !settings.vibrate; }],
      ['Sound', () => (settings.volume === 0 ? 'Off' : `${Math.round(settings.volume * 100)}%`), () => { settings.volume = VOLUMES[(VOLUMES.indexOf(settings.volume) + 1) % VOLUMES.length] ?? 0.8; }],
      ['Screen shake', () => (settings.motion ? 'On' : 'Off'), () => { settings.motion = !settings.motion; }],
    ];
    rows.forEach(([label, value, change], i) => {
      const y = y0 + 112 + i * 58;
      this.add.text(x0 + 44, y, label, { fontFamily: FONT.serif, fontSize: '25px', color: '#1d1613' }).setOrigin(0, 0.5);
      const v = this.add.text(x0 + pw - 44, y, value(), { fontFamily: FONT.serif, fontSize: '25px', fontStyle: 'bold', color: '#28367c' }).setOrigin(1, 0.5);
      this.add.rectangle(cx, y + 29, pw - 80, 1, PAL.black, 0.15);
      this.add.zone(cx, y, pw - 60, 54).setInteractive().on('pointerup', () => { change(); v.setText(value()); sfx.tap(); });
    });

    const button = (label, bx, f) => {
      const t = this.add.text(bx, y0 + ph - 62, label, { fontFamily: FONT.serif, fontSize: '28px', fontStyle: 'bold', color: '#f8efd9', backgroundColor: '#96283a', padding: { x: 22, y: 10 } }).setOrigin(0.5);
      t.setInteractive().on('pointerup', () => { sfx.tap(); f(); });
    };
    button('Resume', cx - 170, () => { this.scene.resume(from); this.scene.stop(); });
    button('Restart', cx, () => { this.scene.stop(from); this.scene.stop(); this.scene.start(from, { ...data, fromPhase: 0 }); });
    button('Chapters', cx + 175, () => { this.scene.stop(from); this.scene.stop(); this.scene.start('Chapters'); });
    this.input.keyboard.once('keydown-ESC', () => { this.scene.resume(from); this.scene.stop(); });
  }
}
