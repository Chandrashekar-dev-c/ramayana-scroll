// One control scheme for every mode (see the design plan):
//   left half  — press and slide to walk; flick up to jump
//   right half — tap to touch or advance; press, pull back and release to draw and loose the bow
// Keyboard and mouse map onto the same actions: A/D or arrows walk, W/Up/Space jump,
// mouse drag on the right half aims, click taps.
import Phaser from 'phaser';
import { W } from './layout.js';

export class Controls extends Phaser.Events.EventEmitter {
  constructor(scene, { bow = false } = {}) {
    super();
    this.scene = scene;
    this.bow = bow;
    this.moveX = 0;
    this.aim = null; // { dx, dy, power } while the bow is drawn
    this.stick = null;
    this.draw = null;
    this.enabled = true;

    const kb = scene.input.keyboard;
    this.keys = kb.addKeys('A,D,W,LEFT,RIGHT,UP,SPACE,ENTER');
    kb.on('keydown-W', () => this.jump());
    kb.on('keydown-UP', () => this.jump());
    kb.on('keydown-SPACE', () => this.jump());
    kb.on('keydown-ENTER', () => this.enabled && this.emit('tap', W * 0.75, 360));

    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);

    this.ring = scene.add.circle(0, 0, 62).setStrokeStyle(4, 0xf2e4c3, 0.6).setDepth(900).setVisible(false).setScrollFactor(0);
    this.knob = scene.add.circle(0, 0, 26, 0xf2e4c3, 0.5).setDepth(900).setVisible(false).setScrollFactor(0);
    scene.events.once('shutdown', () => this.destroy());
  }

  jump() { if (this.enabled) this.emit('jump'); }

  down(p) {
    if (!this.enabled) return;
    if (p.x < W / 2 && !this.stick) {
      this.stick = { id: p.id, x: p.x, y: p.y, t: p.downTime };
      this.ring.setPosition(p.x, p.y).setVisible(true); this.knob.setPosition(p.x, p.y).setVisible(true);
    } else if (p.x >= W / 2 && !this.draw) {
      this.draw = { id: p.id, x: p.x, y: p.y, t: p.downTime };
    }
  }

  move(p) {
    if (this.stick && p.id === this.stick.id) {
      const dx = Phaser.Math.Clamp(p.x - this.stick.x, -62, 62), dy = Phaser.Math.Clamp(p.y - this.stick.y, -62, 62);
      this.knob.setPosition(this.stick.x + dx, this.stick.y + dy);
      if (dy < -48 && Math.abs(dy) > Math.abs(dx) && !this.stick.jumped) { this.stick.jumped = true; this.jump(); }
      if (dy > -20) this.stick.jumped = false;
    }
    if (this.draw && p.id === this.draw.id && this.bow) {
      const dx = this.draw.x - p.x, dy = this.draw.y - p.y, len = Math.hypot(dx, dy);
      this.aim = len > 18 ? { dx, dy, power: Phaser.Math.Clamp(len / 220, 0, 1) } : null;
    }
  }

  up(p) {
    if (this.stick && p.id === this.stick.id) {
      this.stick = null; this.ring.setVisible(false); this.knob.setVisible(false);
    }
    if (this.draw && p.id === this.draw.id) {
      const moved = Math.hypot(p.x - this.draw.x, p.y - this.draw.y), quick = p.upTime - this.draw.t < 300;
      if (this.enabled) {
        if (this.aim && this.bow) this.emit('fire', this.aim);
        else if (moved < 20 && quick) this.emit('tap', p.x, p.y);
      }
      this.draw = null; this.aim = null;
    }
  }

  update() {
    let x = 0;
    if (this.stick) {
      const dx = this.knob.x - this.stick.x;
      x = Math.abs(dx) < 10 ? 0 : Phaser.Math.Clamp(dx / 52, -1, 1);
    }
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) x = -1;
    if (k.D.isDown || k.RIGHT.isDown) x = 1;
    this.moveX = this.enabled ? x : 0;
  }

  destroy() {
    const i = this.scene.input;
    i.off('pointerdown', this.down, this); i.off('pointermove', this.move, this);
    i.off('pointerup', this.up, this); i.off('pointerupoutside', this.up, this);
    this.removeAllListeners();
  }
}
