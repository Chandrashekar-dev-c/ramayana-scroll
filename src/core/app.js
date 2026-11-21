// Shared application state: the canvas, the logical screen and the active mode.
// The logical screen is always 720 units high; its width follows the aspect ratio.
import { bus } from './events.js';

export const H = 720;

export const app = {
  /** @type {HTMLCanvasElement} */ canvas: null,
  /** @type {CanvasRenderingContext2D} */ ctx: null,
  W: 1280, H, scale: 1, dpr: 1, dprCap: 2,
  isTouch: false,
  portrait: false,
  time: 0,           // seconds of simulated time since boot
  frame: 0,
  mode: null,        // current mode object
  modeName: '',
  loop: null,
  debug: false,
  reducedMotion: false,
  seed: 1,
  /** Safe areas in logical units. */
  safe: { l: 0, r: 0, t: 0, b: 0 },
};

export function setMode(name, mode, arg) {
  if (app.mode && app.mode.exit) app.mode.exit();
  app.mode = mode; app.modeName = name;
  if (app.canvas) app.canvas.setAttribute('aria-label', mode.label ? mode.label() : name);
  if (mode.enter) mode.enter(arg);
  bus.emit('mode:change', name);
}

export function resize() {
  const c = app.canvas;
  const cssW = window.innerWidth, cssH = window.innerHeight;
  if (!cssW || !cssH) return; // a hidden or collapsed window (0 high) would divide by zero below
  app.portrait = cssH > cssW * 1.05 && app.isTouch;
  const aspect = Math.max(4 / 3, Math.min(2.4, cssW / Math.max(1, cssH)));
  const dpr = Math.min(window.devicePixelRatio || 1, app.dprCap);
  app.dpr = dpr;
  // Letterbox only when the window is outside the supported aspect range.
  let w = cssW, h = cssH;
  if (cssW / cssH > 2.4) w = cssH * 2.4; else if (cssW / cssH < 4 / 3) h = cssW / (4 / 3);
  c.style.width = w + 'px'; c.style.height = h + 'px';
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  app.W = Math.round(H * aspect);
  app.scale = c.height / H;
  const cs = getComputedStyle(document.documentElement);
  const px = (v) => (parseFloat(cs.getPropertyValue(v)) || 0) * (H / h);
  app.safe = { l: px('--sal'), r: px('--sar'), t: px('--sat'), b: px('--sab') };
  bus.emit('resize', app);
  if (app.mode && app.mode.resize) app.mode.resize();
}

/** Client coordinates to logical coordinates. */
export function toLogical(clientX, clientY) {
  const r = app.canvas.getBoundingClientRect();
  return { x: ((clientX - r.left) / r.width) * app.W, y: ((clientY - r.top) / r.height) * H };
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
