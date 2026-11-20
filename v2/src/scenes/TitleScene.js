import Phaser from 'phaser';
import { view, H, FONT } from '../engine/layout.js';
import { unlockAudio, sfx } from '../engine/audio.js';
import { applyFinish } from '../fx/finish.js';
import { chapter } from '../engine/chapters.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const W = this.scale.width;
    const ch = chapter('tataka');
    const bg = this.add.image(W / 2, H / 2, this.textures.exists('panel.arrival') ? 'panel.arrival' : 'panel.tataka');
    bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0x8a7a6a);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1d1613, 0.35);
    const style = (size, extra = {}) => ({ fontFamily: FONT.serif, fontSize: `${size}px`, color: '#f8efd9', stroke: '#1d1613', strokeThickness: Math.round(size / 6), ...extra });
    this.add.text(W / 2, 210, 'Ramayana Scroll', style(84, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(W / 2, 290, 'inspired by Madhubani art, after Valmiki', style(26, { fontStyle: 'italic' })).setOrigin(0.5);
    this.add.text(W / 2, 400, `${ch.kanda} · Chapter ${ch.number}`, style(26)).setOrigin(0.5);
    this.add.text(W / 2, 444, ch.title, style(40, { fontStyle: 'bold' })).setOrigin(0.5);
    const go = this.add.text(W / 2, 560, 'Begin', style(40, { fontStyle: 'bold' })).setOrigin(0.5);
    this.tweens.add({ targets: go, alpha: 0.4, yoyo: true, repeat: -1, duration: 800 });
    const list = this.add.text(W / 2, 630, 'All chapters', style(26)).setOrigin(0.5);
    this.add.text(W - 20, H - 16, 'Preview build · stand-in art', style(16, { color: '#e9d5a8' })).setOrigin(1, 1);
    applyFinish(this);

    const start = target => {
      unlockAudio(); sfx.drum();
      if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
        try { this.scale.startFullscreen(); screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* not allowed: fine */ }
      }
      this.cameras.main.fadeOut(500, 29, 22, 19);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target, { chapter: 'tataka' }));
    };
    list.setInteractive().on('pointerup', (_p, _x, _y, e) => { e.stopPropagation(); start('Chapters'); });
    this.input.once('pointerup', () => start('Story'));
  }
}
