import Phaser from 'phaser';
import { loadAll, ASSETS } from '../engine/assets.js';
import { paintBackdrop } from '../art/backdrops.js';
import { W, H, PAL, FONT } from '../engine/layout.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.rectangle(W / 2 - 200, H / 2, 0, 10, PAL.gold).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 404, 16).setStrokeStyle(3, PAL.cream);
    this.add.text(W / 2, H / 2 - 40, 'Unrolling the scroll…', { fontFamily: FONT.serif, fontSize: '26px', color: '#f2e4c3' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 400 * v; });
    loadAll(this);
  }

  create() {
    for (const id of Object.keys(ASSETS.backdrops)) paintBackdrop(this, id);
    const p = new URLSearchParams(location.search);
    // ?scene=Battle (or Walk) jumps straight into a section, for testing.
    const jump = p.get('scene');
    if (jump) this.scene.start(jump, { chapter: p.get('chapter') || 'tataka', standalone: true });
    else this.scene.start('Title');
  }
}
