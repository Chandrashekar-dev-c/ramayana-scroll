// A side-scrolling stage built from a backdrop's layers, with parallax and the land-healing effect.
// Used by every walk and battle; a chapter only names its backdrop. Painted layers (imported art)
// are used when they exist; otherwise the code-drawn placeholders from backdrops.js.
//
// Each layer is tiled seamlessly by mirroring it (image | flipped image), scaled to a set height,
// and anchored by its bottom edge. Dead and healed versions of a layer share one scale and anchor.
import Phaser from 'phaser';
import { H, GROUND_Y, view } from '../engine/layout.js';
import { pick, variants } from '../engine/assets.js';
import { sfx } from '../engine/audio.js';

const LAYERS = [ // name, parallax factor, bottom y, display height, depth
  ['hills', 0.15, GROUND_Y - 120, 230, 10],
  ['ruins', 0.45, GROUND_Y + 30, 250, 20],
  ['ground', 1, H, 150, 40],
  ['front', 1.35, H + 6, 96, 80],
];

/** A seamless tile of a texture: the image followed by its mirror image. Cached as `<key>.tile`. */
function mirrorTile(scene, key) {
  const tk = `${key}.tile`;
  if (scene.textures.exists(tk)) return tk;
  const src = scene.textures.get(key).getSourceImage(), w = src.width, h = src.height;
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.save(); g.translate(w * 2, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); g.restore();
  scene.textures.addCanvas(tk, c);
  return tk;
}

export class Stage {
  constructor(scene, id, { trees = 7, healed = false, span } = {}) {
    this.scene = scene;
    this.scroll = 0;
    const W = view(scene).w; span = span ?? W;
    const sky = scene.add.image(W / 2, H / 2, `${id}.sky`).setDepth(0);
    sky.setScale(Math.max(W / sky.width, H / sky.height));
    const dawnKey = pick(scene, `${id}.sky.dawn`);
    this.dawn = dawnKey ? scene.add.image(W / 2, H / 2, dawnKey).setDepth(1).setAlpha(healed ? 1 : 0) : null;
    if (this.dawn) this.dawn.setScale(Math.max(W / this.dawn.width, H / this.dawn.height));

    this.layers = {};
    for (const [name, f, bottom, height, depth] of LAYERS) {
      const deadKey = `${id}.${name}`, aliveKey = pick(scene, `${id}.${name}.healed`);
      const s = height / scene.textures.get(deadKey).getSourceImage().height;
      const make = (key, d) => {
        const tk = mirrorTile(scene, key), th = scene.textures.get(tk).getSourceImage().height;
        return scene.add.tileSprite(0, bottom, W, th * s, tk).setOrigin(0, 1).setTileScale(s).setDepth(d);
      };
      const dead = make(deadKey, depth);
      const alive = aliveKey ? make(aliveKey, depth + 1).setAlpha(healed ? 1 : 0) : null;
      if (alive && healed) dead.setAlpha(0);
      this.layers[name] = { f, s, dead, alive };
    }

    // Trees stand just in front of the ruins plane and scroll with it.
    const deadT = variants(scene, 'tree.dead'), aliveT = variants(scene, 'tree.healed');
    const painted = deadT.length > 0;
    this.trees = Array.from({ length: trees }, (_, i) => {
      const v = i % Math.max(1, deadT.length);
      const keys = painted ? [deadT[v], aliveT[v] ?? aliveT[0]] : ['tree', 'tree.healed'];
      const wx = 120 + i * ((span * 0.45 + W) / trees) + Phaser.Math.Between(-40, 40);
      const sprite = scene.add.image(0, GROUND_Y - 30, healed ? keys[1] : keys[0]).setOrigin(0.5, 1).setDepth(25);
      const s = (Phaser.Math.FloatBetween(270, 340)) / sprite.height;
      sprite.setScale(s);
      return { wx, s, sprite, keys };
    });
    this.dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x2a1830, 0).setDepth(90).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.cm = scene.cameras.main.filters.internal.addColorMatrix();
    this.setLife(healed ? 1 : 0);
    this.setScroll(0);
  }

  /** 0 = dead land (drained colour), 1 = healed (full colour). */
  setLife(v) {
    this.life = v;
    const m = this.cm.colorMatrix; m.reset(); m.saturate(-0.22 * (1 - v)); m.brightness(1 + 0.1 * (1 - v), true); // painted art is already dark at dusk
  }

  /** Darken toward dusk: 0 = afternoon, 1 = sunset. */
  setDusk(v) { this.dim.setFillStyle(0x6a3a5a, 0.14 * v); }

  setScroll(x) {
    this.scroll = x;
    for (const { f, s, dead, alive } of Object.values(this.layers)) {
      dead.tilePositionX = (x * f) / s;
      if (alive) alive.tilePositionX = dead.tilePositionX;
    }
    for (const t of this.trees) t.sprite.x = t.wx - x * 0.45;
  }

  /** The land comes back to life, spreading outward from screen x `fromX`. */
  heal(fromX, duration = 3200) {
    const scene = this.scene;
    scene.tweens.addCounter({ from: this.life, to: 1, duration, onUpdate: tw => this.setLife(tw.getValue()) });
    for (const { dead, alive } of Object.values(this.layers)) if (alive) {
      scene.tweens.add({ targets: alive, alpha: 1, duration, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: dead, alpha: 0, duration: duration * 1.2, ease: 'Sine.easeInOut' });
    }
    if (this.dawn) scene.tweens.add({ targets: this.dawn, alpha: 1, duration: duration * 1.3, ease: 'Sine.easeInOut' });
    const order = [...this.trees].sort((a, b) => Math.abs(a.sprite.x - fromX) - Math.abs(b.sprite.x - fromX));
    order.forEach((t, i) => scene.time.delayedCall(300 + i * (duration / order.length), () => {
      const h = t.sprite.displayHeight;
      t.sprite.setTexture(t.keys[1]); const s = h / t.sprite.height; t.s = s;
      t.sprite.setScale(s, s * 0.05);
      scene.tweens.add({ targets: t.sprite, scaleY: s, duration: 700, ease: 'Back.easeOut' });
      sfx.chime(i);
    }));
    // small life returning along the ground: blooms, shoots, flowers, and a bird crossing the sky
    const bits = [pick(scene, 'fx.bloom'), pick(scene, 'fx.shoot'), pick(scene, 'fx.flowers')].filter(Boolean);
    const W = view(scene).w;
    if (bits.length) for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Clamp(fromX + (i % 2 ? 1 : -1) * (40 + i * 70) + Phaser.Math.Between(-20, 20), 30, W - 30);
      scene.time.delayedCall(400 + i * 170, () => {
        const b = scene.add.image(x, H - 70 + Phaser.Math.Between(-20, 20), bits[i % bits.length]).setOrigin(0.5, 1).setDepth(42);
        const s = Phaser.Math.FloatBetween(46, 70) / b.height; b.setScale(s, 0.01);
        scene.tweens.add({ targets: b, scaleY: s, duration: 500, ease: 'Back.easeOut' });
      });
    }
    const birdKey = pick(scene, 'fx.bird');
    if (birdKey) scene.time.delayedCall(duration * 0.5, () => {
      const bird = scene.add.image(-80, 160, birdKey).setDepth(30); bird.setScale(70 / bird.height);
      scene.tweens.add({ targets: bird, x: W + 100, y: 110, duration: 4200, ease: 'Sine.easeInOut', onComplete: () => bird.destroy() });
      scene.tweens.add({ targets: bird, angle: 6, yoyo: true, repeat: -1, duration: 260 });
    });
    scene.tweens.add({ targets: this.dim, fillAlpha: 0, duration });
  }
}
