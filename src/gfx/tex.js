// Textures made in code: painted canvases become GPU textures once and are reused.
import { Texture } from 'pixi.js';
import { makeCanvas } from '../core/app.js';

const byCanvas = new WeakMap();

/** A texture for a painted canvas. Pass scale when the canvas holds `scale` px per unit. */
export function canvasTexture(cv) {
  let t = byCanvas.get(cv);
  if (!t) { t = Texture.from(cv); byCanvas.set(cv, t); }
  return t;
}

/** Re-upload a canvas whose pixels changed. */
export function refresh(cv) { const t = byCanvas.get(cv); if (t) t.source.update(); return t; }

let soft = null;
/** A soft white disc: the base for every lamp glow and light pool. */
export function softDisc() {
  if (soft) return soft;
  const n = 256, c = makeCanvas(n, n), x = c.getContext('2d');
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  soft = Texture.from(c);
  return soft;
}

let dot = null;
/** A small hard dot with a soft rim, for sparks, dust and petals. */
export function dotTexture() {
  if (dot) return dot;
  const n = 32, c = makeCanvas(n, n), x = c.getContext('2d');
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  dot = Texture.from(c);
  return dot;
}

let grain = null;
/** Wall grain: fine speckle with a few fibres, multiplied over the picture. */
export function noiseTexture() {
  if (grain) return grain;
  const n = 256, c = makeCanvas(n, n), x = c.getContext('2d');
  const img = x.createImageData(n, n);
  let s = 1234567;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < n * n; i++) {
    const v = 236 + Math.floor(rnd() * 20) - (rnd() < 0.04 ? 30 : 0);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v - 4; img.data[i * 4 + 2] = v - 12; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = 0.12; x.strokeStyle = '#6b4a2a'; x.lineWidth = 0.6;
  for (let i = 0; i < 40; i++) { x.beginPath(); const a = rnd() * n, b = rnd() * n; x.moveTo(a, b); x.quadraticCurveTo(a + rnd() * 20 - 10, b + rnd() * 20 - 10, a + rnd() * 30 - 15, b + rnd() * 30 - 15); x.stroke(); }
  grain = Texture.from(c);
  grain.source.addressMode = 'repeat';
  return grain;
}

let vig = null;
/** Lamp-lit edges: the corners fall away into warm dark. */
export function vignetteTexture() {
  if (vig) return vig;
  const w = 512, h = 288, c = makeCanvas(w, h), x = c.getContext('2d');
  const g = x.createRadialGradient(w / 2, h * 0.55, h * 0.25, w / 2, h * 0.55, w * 0.62);
  g.addColorStop(0, 'rgba(29,22,19,0)'); g.addColorStop(0.6, 'rgba(29,22,19,0.08)'); g.addColorStop(1, 'rgba(29,22,19,0.75)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  vig = Texture.from(c);
  return vig;
}

let flameTex = null;
/** One painted lamp flame: a teardrop with a turmeric heart. */
export function flameTexture() {
  if (flameTex) return flameTex;
  const w = 48, h = 96, c = makeCanvas(w, h), x = c.getContext('2d');
  const drop = (sc, fill) => { x.beginPath(); x.moveTo(w / 2, h * (1 - sc * 0.95)); x.bezierCurveTo(w / 2 + w * 0.42 * sc, h * (1 - sc * 0.4), w / 2 + w * 0.3 * sc, h * 0.97, w / 2, h * 0.97); x.bezierCurveTo(w / 2 - w * 0.3 * sc, h * 0.97, w / 2 - w * 0.42 * sc, h * (1 - sc * 0.4), w / 2, h * (1 - sc * 0.95)); x.fillStyle = fill; x.fill(); };
  drop(1, '#e58a1f'); drop(0.72, '#f2c23a'); drop(0.4, '#fbf5e4');
  flameTex = Texture.from(c);
  return flameTex;
}

/** Painted canvases can be shared (the stage cloth and a battlefield may show the same
 * chunk), so each owner retains the texture and it is freed only when the last lets go. */
const refs = new WeakMap();
export function retain(cv) { refs.set(cv, (refs.get(cv) || 0) + 1); return canvasTexture(cv); }
/** Let go of a painted canvas's GPU copy; freed when nobody holds it. */
export function dropTexture(cv) {
  const n = (refs.get(cv) || 1) - 1;
  if (n > 0) { refs.set(cv, n); return; }
  refs.delete(cv);
  const t = byCanvas.get(cv); if (t) { t.destroy(true); byCanvas.delete(cv); }
}
