// The shared paint finish (decided after the art pilot): the art is drawn clean, and the game lays
// one pigment-and-paper surface over every scene, so all assets match and the look is tunable here.
import Phaser from 'phaser';
import { view } from '../engine/layout.js';

export const FINISH = { grain: 0.3, mottle: 0.2, vignette: 0.16 };

function grainTexture(scene) {
  if (scene.textures.exists('finish.grain')) return;
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), img = g.createImageData(s, s), d = img.data;
  // value noise at two scales: fine paper tooth + soft pigment mottling, both tileable
  const cell = 32, n = s / cell, lat = Array.from({ length: n * n }, () => Math.random());
  const at = (x, y) => lat[((y % n + n) % n) * n + ((x % n + n) % n)];
  const smooth = t => t * t * (3 - 2 * t);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    const m = (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
    const fine = Math.random();
    const v = 255 - (fine * 60 * FINISH.grain + m * 120 * FINISH.mottle);
    const i = (y * s + x) * 4; d[i] = v; d[i + 1] = v * 0.97; d[i + 2] = v * 0.9; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  scene.textures.addCanvas('finish.grain', c);
}

/** Add the finish to a scene: grain multiplied over everything, a soft vignette on the camera. */
export function applyFinish(scene) {
  grainTexture(scene);
  const { w, h } = view(scene);
  scene.add.tileSprite(w / 2, h / 2, w, h, 'finish.grain').setScrollFactor(0).setDepth(950).setBlendMode(Phaser.BlendModes.MULTIPLY);
  scene.cameras.main.filters.external.addVignette(0.5, 0.5, 1.1, FINISH.vignette, 0x1d1613);
}
