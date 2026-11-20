// One control scheme for every mode, carried over from the first game:
//   move thumb (left half)  — press and slide to walk; flick up to jump, flick down to roll
//   bow thumb (right half)  — tap to touch or advance; HOLD to draw the bow: a ring fills as it
//                             draws, drag up or down to angle the shot, release to loose
// The halves swap when settings.lefty is on. Keyboard: A/D walk, W/Space jump, S roll,
// J or mouse button held to draw (mouse position aims), Enter advances. Esc pauses.
import Phaser from 'phaser';
import { settings } from './settings.js';

const DEAD = 10, FULL = 52, FLICK = 46;

export class Controls extends Phaser.Events.EventEmitter {
  constructor(scene, { bow = false } = {}) {
    super();
    this.scene = scene;
    this.bow = bow;
    this.moveX = 0;
    this.stick = null;
    this.draw = null;    // { id, x, y, dx, dy, t } while the bow thumb is down
    this.enabled = true;

    const kb = scene.input.keyboard;
    this.keys = kb.addKeys('A,D,W,S,J,LEFT,RIGHT,UP,DOWN,SPACE,ENTER,ESC');
    const on = (k, f) => kb.on(`keydown-${k}`, f);
    on('W', () => this.jump()); on('UP', () => this.jump()); on('SPACE', () => this.jump());
    on('S', () => this.roll()); on('DOWN', () => this.roll());
    on('ENTER', () => this.enabled && this.emit('tap', scene.scale.width * 0.75, 360));
    on('ESC', () => this.emit('pause'));

    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);

    this.ring = scene.add.circle(0, 0, 62).setStrokeStyle(4, 0xf2e4c3, 0.5).setDepth(900).setVisible(false).setScrollFactor(0);
    this.knob = scene.add.circle(0, 0, 26, 0xf2e4c3, 0.45).setDepth(900).setVisible(false).setScrollFactor(0);
    scene.events.once('shutdown', () => this.destroy());
  }

  /** Is this screen x on the move-thumb side? */
  moveSide(x) { const left = x < this.scene.scale.width / 2; return settings.lefty ? !left : left; }

  jump() { if (this.enabled) this.emit('jump'); }
  roll() { if (this.enabled) this.emit('roll'); }

  /** The bow thumb is down (touch, J key or mouse). */
  get drawing() { return !!this.draw || (this.enabled && this.keys.J.isDown); }

  /** Aim angle in degrees (up is positive) and facing hint from the bow thumb's drag. */
  aimFromDrag() {
    if (!this.draw) return { angle: this.keys.UP.isDown ? 30 : 0, flip: 0 };
    if (this.draw.mouse) return { mouse: { x: this.draw.px, y: this.draw.py } };
    return { angle: -this.draw.dy * 0.4, flip: this.draw.dx < -56 ? -1 : this.draw.dx > 56 ? 1 : 0 };
  }

  down(p) {
    if (!this.enabled) return;
    if (this.moveSide(p.x) && !this.stick) {
      this.stick = { id: p.id, x: p.x, y: p.y };
      this.ring.setPosition(p.x, p.y).setVisible(true); this.knob.setPosition(p.x, p.y).setVisible(true);
    } else if (!this.moveSide(p.x) && !this.draw) {
      const mouse = !p.wasTouch; // a mouse aims by pointing
      this.draw = { id: p.id, x: p.x, y: p.y, dx: 0, dy: 0, px: p.x, py: p.y, t: p.downTime, mouse };
      if (this.bow) this.emit('drawStart');
    }
  }

  move(p) {
    if (this.stick && p.id === this.stick.id) {
      const dx = Phaser.Math.Clamp(p.x - this.stick.x, -62, 62), dy = Phaser.Math.Clamp(p.y - this.stick.y, -62, 62);
      this.knob.setPosition(this.stick.x + dx, this.stick.y + dy);
      const vertical = Math.abs(dy) > Math.abs(dx) * 1.2;
      if (dy < -FLICK && vertical && !this.stick.flicked) { this.stick.flicked = true; this.jump(); }
      if (dy > FLICK && vertical && !this.stick.flicked) { this.stick.flicked = true; this.roll(); }
      if (Math.abs(dy) < 20) this.stick.flicked = false;
    }
    if (this.draw && p.id === this.draw.id) {
      this.draw.dx = p.x - this.draw.x; this.draw.dy = p.y - this.draw.y; this.draw.px = p.x; this.draw.py = p.y;
    }
  }

  up(p) {
    if (this.stick && p.id === this.stick.id) { this.stick = null; this.ring.setVisible(false); this.knob.setVisible(false); }
    if (this.draw && p.id === this.draw.id) {
      const d = this.draw, moved = Math.hypot(d.dx, d.dy), quick = p.upTime - d.t < 280;
      this.draw = null;
      if (!this.enabled) return;
      if (this.bow) this.emit('release');
      else if (moved < 24 && quick) this.emit('tap', p.x, p.y);
    }
  }

  update() {
    let x = 0;
    if (this.stick) { const dx = this.knob.x - this.stick.x; x = Math.abs(dx) < DEAD ? 0 : Phaser.Math.Clamp(dx / FULL, -1, 1); }
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) x = -1;
    if (k.D.isDown || k.RIGHT.isDown) x = 1;
    this.moveX = this.enabled ? x : 0;
    if (this.bow) { // J key acts as the bow thumb
      if (Phaser.Input.Keyboard.JustDown(k.J) && this.enabled) this.emit('drawStart');
      if (Phaser.Input.Keyboard.JustUp(k.J) && this.enabled) this.emit('release');
    }
  }

  destroy() {
    const i = this.scene.input;
    i.off('pointerdown', this.down, this); i.off('pointermove', this.move, this);
    i.off('pointerup', this.up, this); i.off('pointerupoutside', this.up, this);
    this.removeAllListeners();
  }
}
