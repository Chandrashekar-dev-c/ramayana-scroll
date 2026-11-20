// A side-scrolling stage built from a backdrop's layers, with parallax and the land-healing effect.
// Used by every walk and battle; a chapter only names its backdrop.
import Phaser from 'phaser';
import { H, GROUND_Y, view } from '../engine/layout.js';
import { TILE } from './backdrops.js';
import { sfx } from '../engine/audio.js';

const LAYERS = [ // name, parallax factor, y of the layer's top, depth
  ['hills', 0.15, GROUND_Y - 330, 10],
  ['ruins', 0.45, GROUND_Y - 248, 20],
  ['ground', 1, GROUND_Y - 14, 40],
  ['front', 1.35, H - 86, 80],
];

export class Stage {
  constructor(scene, id, { trees = 7, healed = false, span } = {}) {
    this.scene = scene;
    const W = view(scene).w; span = span ?? W;
    this.scroll = 0;
    scene.add.image(W / 2, H / 2, `${id}.sky`).setDisplaySize(W, H).setDepth(0);
    this.layers = {};
    for (const [name, f, y, depth] of LAYERS) {
      const make = key => scene.add.tileSprite(0, y, W, scene.textures.get(key).getSourceImage().height, key).setOrigin(0, 0).setDepth(depth);
      const dead = make(`${id}.${name}`);
      const alive = scene.textures.exists(`${id}.${name}.healed`) ? make(`${id}.${name}.healed`).setAlpha(healed ? 1 : 0).setDepth(depth + 1) : null;
      this.layers[name] = { f, dead, alive };
    }
    // Trees stand on the ruins plane, so they scroll with it.
    this.trees = Array.from({ length: trees }, (_, i) => {
      const wx = 120 + i * ((span * 0.45 + W) / trees) + Phaser.Math.Between(-40, 40);
      const s = Phaser.Math.FloatBetween(0.62, 0.9);
      const dead = scene.add.image(0, GROUND_Y - 90, healed ? 'tree.healed' : 'tree').setOrigin(0.5, 1).setScale(s).setDepth(25);
      return { wx, s, sprite: dead, healed };
    });
    this.dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x2a1830, 0).setDepth(90).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.cm = scene.cameras.main.filters.internal.addColorMatrix();
    this.setLife(healed ? 1 : 0);
    this.setScroll(0);
  }

  /** 0 = dead land (drained colour), 1 = healed (full colour). */
  setLife(v) {
    this.life = v;
    const m = this.cm.colorMatrix; m.reset(); m.saturate(-0.4 * (1 - v));
  }

  /** Darken toward dusk: 0 = afternoon, 1 = sunset. */
  setDusk(v) { this.dim.setFillStyle(0x6a3a5a, 0.22 * v); }

  setScroll(x) {
    this.scroll = x;
    for (const { f, dead, alive } of Object.values(this.layers)) {
      dead.tilePositionX = (x * f) % TILE;
      if (alive) alive.tilePositionX = dead.tilePositionX;
    }
    for (const t of this.trees) t.sprite.x = t.wx - x * 0.45;
  }

  /** The land comes back to life, spreading outward from screen x `fromX`. */
  heal(fromX, duration = 3200) {
    const scene = this.scene;
    scene.tweens.addCounter({ from: this.life, to: 1, duration, onUpdate: tw => this.setLife(tw.getValue()) });
    for (const { alive } of Object.values(this.layers)) if (alive) scene.tweens.add({ targets: alive, alpha: 1, duration, ease: 'Sine.easeInOut' });
    const order = [...this.trees].sort((a, b) => Math.abs(a.sprite.x - fromX) - Math.abs(b.sprite.x - fromX));
    order.forEach((t, i) => scene.time.delayedCall(300 + i * (duration / order.length), () => {
      t.sprite.setTexture('tree.healed').setScale(t.s, 0.05);
      scene.tweens.add({ targets: t.sprite, scaleY: t.s, duration: 700, ease: 'Back.easeOut' });
      sfx.chime(i);
    }));
    scene.tweens.add({ targets: this.dim, fillAlpha: 0, duration });
  }
}
