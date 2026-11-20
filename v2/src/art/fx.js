// Effect sprites by role, using painted art when it exists and the code-drawn placeholders otherwise.
import Phaser from 'phaser';
import { pick, variants } from '../engine/assets.js';

/** A random painted dust cloud (or the placeholder), sized to `h` pixels tall. */
export function dust(scene, x, y, h = 160) {
  const keys = variants(scene, 'fx.dust');
  const img = scene.add.image(x, y, keys.length ? Phaser.Utils.Array.GetRandom(keys) : 'dust');
  img.setScale(h / img.height);
  if (keys.length) img.setFlipX(Math.random() < 0.5).setAngle(Phaser.Math.Between(-15, 15));
  return img;
}

export function stone(scene, x, y, h = 70) {
  const keys = variants(scene, 'fx.stone');
  const img = scene.add.image(x, y, keys.length ? Phaser.Utils.Array.GetRandom(keys) : 'stone');
  return img.setScale(h / img.height);
}

/** Arrow sprite: 110 px long; the full-draw one glows. */
export function arrow(scene, x, y, full) {
  const key = pick(scene, full ? 'fx.arrow.full' : 'fx.arrow', 'fx.arrow', 'arrow');
  const img = scene.add.image(x, y, key);
  img.setScale((full ? 124 : 110) / img.width);
  if (full && key === 'arrow') img.setTint(0xffe9a8);
  return img;
}

/** A ground mark: 'lotus' (jump here) or 'star' (danger lands here), laid flat on the ground. */
export function mark(scene, x, y, kind) {
  const key = pick(scene, `fx.mark.${kind}`, `glyph.${kind}`);
  const img = scene.add.image(x, y, key);
  const painted = key.startsWith('fx.');
  const w = kind === 'star' ? 170 : 110;
  img.setScale(w / img.width, (w / img.width) * (painted ? 0.38 : 1));
  return img;
}

export const lotusKey = scene => pick(scene, 'fx.mark.lotus', 'glyph.lotus');
