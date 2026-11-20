import Phaser from 'phaser';
import { W, H, PAL, FONT } from '../engine/layout.js';
import { chapter, markDone } from '../engine/chapters.js';
import { applyFinish } from '../fx/finish.js';
import { setDrone, sfx } from '../engine/audio.js';

export class CompleteScene extends Phaser.Scene {
  constructor() { super('Complete'); }

  create({ chapter: id }) {
    const ch = chapter(id);
    markDone(id);
    setDrone('dawn');
    this.add.rectangle(W / 2, H / 2, W, H, PAL.cream);
    const g = this.add.graphics();
    g.lineStyle(8, PAL.black).strokeRect(40, 40, W - 80, H - 80);
    g.lineStyle(3, PAL.madder).strokeRect(58, 58, W - 116, H - 116);
    const t = (y, s, size, extra = {}) => this.add.text(W / 2, y, s, { fontFamily: FONT.serif, fontSize: `${size}px`, color: '#1d1613', align: 'center', wordWrap: { width: W - 260 }, ...extra }).setOrigin(0.5, 0);
    t(110, `${ch.kanda} · Chapter ${ch.number}`, 26, { color: '#96283a' });
    t(150, ch.title, 52, { fontStyle: 'bold' });
    t(230, 'complete', 30, { fontStyle: 'italic' });
    t(310, ch.note, 24, { lineSpacing: 6 });
    t(500, `Source: ${ch.source}`, 20, { color: '#754527' });
    const again = t(570, 'Play again', 32, { fontStyle: 'bold', color: '#28367c' });
    again.setInteractive().on('pointerup', () => { sfx.tap(); this.scene.start('Story', { chapter: id }); });
    applyFinish(this);
    this.cameras.main.fadeIn(600, 29, 22, 19);
  }
}
