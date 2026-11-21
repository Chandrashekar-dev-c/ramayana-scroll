// The painted frame around every screen (Rule G): triangles, a zigzag and corner lotuses.
// Painted once per screen size, in line and in colour; the HUD reveals the coloured frame
// clockwise as waves are cleared, and the loading plate uses it as its progress bar.
import { app, makeCanvas } from '../core/app.js';
import { shape, line, rectPts } from './ink.js';
import { PAL } from './palette.js';
import { BORDER } from './layout.js';
import * as M from './motifs.js';

const cache = new Map();

function paint(W, H, colour, night) {
  const s = Math.min(1.25, Math.max(0.5, app.scale));
  const cv = makeCanvas(W * s, H * s);
  const ctx = cv.getContext('2d'); ctx.scale(s, s);
  const b = BORDER, c = night ? PAL.nightLine : PAL.black;
  const lf = night ? PAL.night : PAL.cream;
  ctx.fillStyle = colour ? PAL.madder : lf;
  ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b); ctx.fillRect(0, 0, b, H); ctx.fillRect(W - b, 0, b, H);
  const tri = (x, y, dx, dy, i) => {
    const pts = dx ? [[x, y + (dy > 0 ? 0 : b - 4)], [x + 11, y + (dy > 0 ? b - 4 : 0)], [x + 22, y + (dy > 0 ? 0 : b - 4)]] : [[x + (dy > 0 ? 0 : b - 4), y], [x + (dy > 0 ? b - 4 : 0), y + 11], [x + (dy > 0 ? 0 : b - 4), y + 22]];
    shape(ctx, pts, { mode: colour ? 'colour' : 'line', fill: i % 2 ? PAL.turmeric : PAL.white, lineColor: c, w: 1.1, seed: i, amp: 0.5 });
  };
  let i = 0;
  for (let x = b; x < W - b - 10; x += 22, i++) { tri(x, 2, 1, 1, i); tri(x, H - b + 2, 1, -1, i + 1); }
  for (let y = b; y < H - b - 10; y += 22, i++) { tri(2, y, 0, 1, i); tri(W - b + 2, y, 0, -1, i + 1); }
  line(ctx, rectPts(1.5, 1.5, W - 3, H - 3), { w: 2.4, color: c, closed: true, seed: 1, amp: 0.4, flat: true });
  line(ctx, rectPts(b, b, W - 2 * b, H - 2 * b), { w: 1.8, color: c, closed: true, seed: 2, amp: 0.5 });
  for (const [cx, cy] of [[b / 2, b / 2], [W - b / 2, b / 2], [b / 2, H - b / 2], [W - b / 2, H - b / 2]]) {
    ctx.fillStyle = colour ? PAL.indigo : lf; ctx.fillRect(cx - b / 2, cy - b / 2, b, b);
    M.lotus(ctx, cx, cy, b * 0.42, 1, { colour, fill: PAL.pink, lineColor: c, w: 1, petals: 6 });
  }
  return cv;
}

export function frameCanvas(colour = false, night = false) {
  const key = `${app.W}|${colour}|${night}|${app.scale.toFixed(2)}`;
  let c = cache.get(key);
  if (!c) { if (cache.size > 6) cache.clear(); c = paint(app.W, 720, colour, night); cache.set(key, c); }
  return c;
}

// Handmade paper: one 256-unit tile of warm seeded grain, laid over the whole view in multiply,
// and a soft sepia vignette, so flat fills read as pigment on a wall or cloth.
let grain = null, vignette = null;
function paperGrain(ctx) {
  if (!grain) {
    const c = makeCanvas(256, 256), x = c.getContext('2d'), img = x.createImageData(256, 256);
    let n = 1234567;
    for (let i = 0; i < img.data.length; i += 4) {
      n = (n * 1103515245 + 12345) & 0x7fffffff; const v = 200 + (n % 56);
      img.data[i] = v; img.data[i + 1] = v - 10; img.data[i + 2] = v - 30; img.data[i + 3] = 10 + (n >> 8) % 13;
    }
    x.putImageData(img, 0, 0);
    grain = ctx.createPattern(c, 'repeat');
  }
  return grain;
}
export function drawPaper(ctx) {
  const W = app.W, H = 720;
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6; ctx.fillStyle = paperGrain(ctx); ctx.fillRect(0, 0, W, H);
  if (!vignette || vignette.W !== W) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(120,80,40,0)'); g.addColorStop(1, 'rgba(120,80,40,0.16)');
    vignette = { W, g };
  }
  ctx.globalAlpha = 1; ctx.fillStyle = vignette.g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Draw the frame. progress 0..1 reveals the coloured frame clockwise from the top-left. */
export function drawFrame(ctx, o = {}) {
  const W = app.W, H = 720;
  if (o.paper !== false) drawPaper(ctx);
  const p = o.colour ? 1 : o.progress || 0;
  // a fully coloured frame covers the line one completely, so skip blitting the line frame then
  if (p < 1) ctx.drawImage(frameCanvas(false, o.night), 0, 0, W, H);
  if (p <= 0) return;
  if (p >= 1) { ctx.drawImage(frameCanvas(true, o.night), 0, 0, W, H); return; }
  const col = frameCanvas(true, o.night);
  const per = 2 * (W + H), d = p * per, b = BORDER;
  ctx.save(); ctx.beginPath();
  ctx.rect(0, 0, Math.min(d, W), b);
  if (d > W) ctx.rect(W - b, 0, b, Math.min(d - W, H));
  if (d > W + H) { const k = Math.min(d - W - H, W); ctx.rect(W - k, H - b, k, b); }
  if (d > 2 * W + H) { const k = Math.min(d - 2 * W - H, H); ctx.rect(0, H - k, b, k); }
  ctx.clip(); ctx.drawImage(col, 0, 0, W, H); ctx.restore();
}

export function clearFrameCache() { cache.clear(); }
