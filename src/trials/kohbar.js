// The Wedding: paint the kohbar wall of the bridal room. Sita hands each motif to the
// player, who drags it to its place. The wall fills in bharni as each is placed.
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { shape, line, plate, rectPts, ellipsePts, hatch } from '../art/ink.js';
import { pattern } from '../art/patterns.js';
import * as M from '../art/motifs.js';
import { character, fig } from '../art/figures.js';
import { drawFrame } from '../art/borders.js';
import { drawHand } from '../play/hud.js';
import { cue } from '../audio/audio.js';

export function createKohbar(b) {
  const W = () => app.W;
  const cx = () => W() / 2 + 90, cy = 380, ww = 640, wh = 520;
  const slots = [
    { id: 'lotus', k: 'ch7.m.lotus', dx: 0, dy: 0, s: 1.2 },
    { id: 'parrotL', k: 'ch7.m.parrots', dx: -150, dy: -150, s: 1 },
    { id: 'parrotR', k: 'ch7.m.parrots', dx: 150, dy: -150, s: 1, flip: true },
    { id: 'fishL', k: 'ch7.m.fish', dx: -150, dy: 150, s: 1 },
    { id: 'fishR', k: 'ch7.m.fish', dx: 150, dy: 150, s: 1, flip: true },
    { id: 'sun', k: 'ch7.m.sun', dx: -220, dy: -10, s: 1 },
    { id: 'moon', k: 'ch7.m.moon', dx: 220, dy: -10, s: 1 },
    { id: 'jogin1', k: 'ch7.m.jogins', dx: -280, dy: -220, s: 1 },
    { id: 'jogin2', k: 'ch7.m.jogins', dx: 280, dy: -220, s: 1, flip: true },
    { id: 'jogin3', k: 'ch7.m.jogins', dx: -280, dy: 220, s: 1 },
    { id: 'jogin4', k: 'ch7.m.jogins', dx: 280, dy: 220, s: 1, flip: true },
  ].map((s) => ({ ...s, placed: false }));
  const sita = character('sita', 'bride');
  const o = { done: false, t: 0, i: 0, drag: false, hx: 0, hy: 0, fullscreen: true, placedT: 0 };
  const hand = () => ({ x: 150 + app.safe.l, y: 470 });
  const pos = (s) => ({ x: cx() + s.dx, y: cy + s.dy });

  function drawMotif(ctx, id, x, y, colour, flip) {
    const c = { colour };
    if (id === 'lotus') {
      line(ctx, [[x, y + 110], [x + 4, y - 120]], { w: 6, color: colour ? PAL.leaf : PAL.black });
      for (let k = -2; k <= 2; k++) line(ctx, [[x, y + 110 - (k + 2) * 46], [x + 10, y + 100 - (k + 2) * 46]], { w: 1.4, color: PAL.black });
      M.lotus(ctx, x, y, 66, 1, { colour, fill: PAL.pink, gap: PAL.turmeric, petals: 8 });
    } else if (id.startsWith('parrot')) {
      M.bird(ctx, x, y, 34, { ...c, fill: PAL.leaf, dir: flip ? -1 : 1 });
      line(ctx, [[x - 30, y + 26], [x + 30, y + 26]], { w: 2, color: colour ? PAL.brown : PAL.black });
    } else if (id.startsWith('fish')) { M.fish(ctx, x, y - 14, 32, { ...c, fill: PAL.turmeric, dir: flip ? -1 : 1 }); M.fish(ctx, x, y + 22, 26, { ...c, fill: PAL.river, dir: flip ? 1 : -1 }); }
    else if (id === 'sun') M.sun(ctx, x, y, 30, { colour, lineFill: PAL.cream });
    else if (id === 'moon') { if (colour) M.moon(ctx, x, y, 34, {}); else line(ctx, ellipsePts(x, y, 34, 34, 14, -1.9, 1.9), { w: 1.6, smooth: true }); }
    else if (id.startsWith('jogin')) M.nainaJogin(ctx, x, y, 40, 0, flip ? -1 : 1, { colour });
  }

  o.update = (dt) => {
    o.t += dt; o.placedT -= dt;
    const s = slots[o.i];
    if (!s) { if (o.placedT <= -1.2) o.done = true; return; }
    const p = input.pointer, h = hand();
    if (p.justDown && Math.hypot(p.x - h.x, p.y - h.y) < 80) o.drag = true;
    if (o.drag) { o.hx = p.x; o.hy = p.y; }
    const place = () => { s.placed = true; o.i++; o.drag = false; o.placedT = 0.4; cue('wash'); };
    if (o.drag && p.justUp) { const q = pos(s); if (Math.hypot(p.x - q.x, p.y - q.y) < 110) place(); else o.drag = false; }
    if (input.consume('action') || input.consume('confirm') || input.consume('jump')) place();
  };
  o.render = (ctx) => {
    const Wd = W();
    ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, Wd, 720);
    const k = slots.filter((s) => s.placed).length / slots.length;
    // the wall: border bands fill as the motifs are placed
    const x0 = cx() - ww / 2, y0 = cy - wh / 2;
    shape(ctx, rectPts(x0 - 22, y0 - 22, ww + 44, wh + 44), { mode: k > 0.5 ? 'colour' : 'line', fill: PAL.madder, pattern: k > 0.5 ? pattern(ctx, 'triangles', null, PAL.turmeric, 1) : null, w: 2.2 });
    shape(ctx, rectPts(x0, y0, ww, wh), { mode: 'colour', fill: PAL.cream, w: 2 });
    if (k < 1) hatch(ctx, rectPts(x0, y0, ww, wh), { color: PAL.terracotta, spacing: 26, angle: 0.8, w: 0.5 });
    for (const s of slots) { const q = pos(s); if (s.placed) drawMotif(ctx, s.id, q.x, q.y, true, s.flip); else { ctx.save(); ctx.globalAlpha = 0.25; drawMotif(ctx, s.id, q.x, q.y, false, s.flip); ctx.restore(); } }
    const s = slots[o.i];
    if (s) { const q = pos(s); M.usableRing(ctx, q.x, q.y, 70, o.t); }
    fig(ctx, sita, s ? 'give' : 'namaste', 110 + app.safe.l, 640, { facing: 1 });
    if (s) { const h = hand(); const dx = o.drag ? o.hx : h.x, dy = o.drag ? o.hy : h.y; drawMotif(ctx, s.id, dx, dy, true, s.flip); if (!o.drag) M.usableRing(ctx, h.x, h.y, 60, o.t); plate(ctx, t('ch7.hands') + ' ' + t(s.k), Wd / 2, 60, { size: 20, gap: PAL.indigo }); if (app.isTouch && o.i < 2 && !o.drag) { const q = pos(s); const f = (o.t % 2) / 2; drawHand(ctx, h.x + (q.x - h.x) * f, h.y + 40 + (q.y - h.y) * f, o.t); } }
    else plate(ctx, t('ch7.wallDone'), Wd / 2, 60, { size: 22 });
    drawFrame(ctx, { progress: k });
  };
  o.skip = () => { for (const s of slots) s.placed = true; o.i = slots.length; o.done = true; };
  o.controls = null;
  return o;
}
