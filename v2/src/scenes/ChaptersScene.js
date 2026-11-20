// The whole game on one scroll: all 47 chapters by kanda. Playable ones open; the rest show what
// is coming. As chapters are built (content/chapters/<id>.json + an Ink script) they light up.
import Phaser from 'phaser';
import { view, PAL, FONT } from '../engine/layout.js';
import { chapterIds, progress } from '../engine/chapters.js';
import index from '../../content/chapters/index.json';
import { applyFinish } from '../fx/finish.js';
import { sfx } from '../engine/audio.js';

export class ChaptersScene extends Phaser.Scene {
  constructor() { super('Chapters'); }

  create() {
    const { w, h } = view(this);
    this.add.rectangle(w / 2, h / 2, w, h, PAL.cream);
    this.add.text(w / 2, 46, 'The Scroll', { fontFamily: FONT.serif, fontSize: '42px', fontStyle: 'bold', color: '#1d1613' }).setOrigin(0.5);
    const built = new Set(chapterIds()), done = progress();
    const kandas = [...new Set(index.chapters.map(c => c.kanda))];
    const colW = (w - 60) / kandas.length;
    kandas.forEach((k, ci) => {
      const x = 30 + ci * colW + 8;
      this.add.text(x, 92, k.replace(' Kanda', ''), { fontFamily: FONT.serif, fontSize: '22px', fontStyle: 'bold', color: '#96283a' });
      index.chapters.filter(c => c.kanda === k).forEach((c, ri) => {
        const y = 128 + ri * 38, playable = built.has(c.id);
        const label = `${c.number}. ${c.title}${c.lanka ? ' ✦' : ''}${done[c.id] ? ' ✓' : ''}`;
        const t = this.add.text(x, y, label, { fontFamily: FONT.serif, fontSize: '19px', color: playable ? '#28367c' : '#8d877a', fontStyle: playable ? 'bold' : 'normal', wordWrap: { width: colW - 14 } });
        if (playable) {
          t.setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx.tap(); this.scene.start('Story', { chapter: c.id }); });
          this.tweens.add({ targets: t, alpha: 0.55, yoyo: true, repeat: -1, duration: 900 });
        }
      });
    });
    this.add.text(w / 2, h - 30, '✦ Lanka chapters, woven into the story   ·   blue = ready to play', { fontFamily: FONT.serif, fontSize: '18px', fontStyle: 'italic', color: '#754527' }).setOrigin(0.5);
    const back = this.add.text(40, 46, '‹ Back', { fontFamily: FONT.serif, fontSize: '26px', color: '#96283a' }).setOrigin(0, 0.5);
    back.setInteractive().on('pointerup', () => this.scene.start('Title'));
    applyFinish(this);
  }
}
