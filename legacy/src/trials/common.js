// Shared helpers for the full-screen trials.
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { plate, shape, rectPts } from '../art/ink.js';
import * as M from '../art/motifs.js';
import { drawFrame } from '../art/borders.js';
import { drawHand } from '../play/hud.js';

export function baseTrial(b, r, controls) {
  return {
    done: false, t: 0, fullscreen: true, controls, fails: 0, failed: null, tip: b.tip || null, hits: 0, seals: null, stats: { time: 0, hits: 0 },
    line: null, lineT: 0, hint: null, hintT: 0,
    say(k, dur = 2.6) { this.line = t(k); this.lineT = dur; },
    hintOnce(k, dur = 2.4) { this.hint = t(k); this.hintT = dur; },
    tick(dt) { this.t += dt; this.stats.time += dt; if (this.lineT > 0) { this.lineT -= dt; if (this.lineT <= 0) this.line = null; } if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.hint = null; } },
    overlay(ctx, o = {}) {
      const W = app.W;
      drawFrame(ctx, { progress: o.progress || 0, night: o.night });
      if (o.objective) plate(ctx, t(o.objective), W / 2, 58, { size: 20, gap: PAL.indigo });
      if (this.line) plate(ctx, this.line, W / 2, o.lineY ?? 150, { size: 21, italic: true, seed: 6 });
      if (this.hint) { plate(ctx, this.hint, W / 2, 250, { size: 24, bold: true, gap: PAL.indigo }); if (app.isTouch && o.hand) drawHand(ctx, o.hand.x, o.hand.y, this.t); }
    },
    finish(seals) { this.seals = seals; this.stats.hits = this.hits; this.done = true; },
  };
}

/** Vertical steering for flying and rowing trials: keys, stick, or the touch up/down buttons. */
export function steer() {
  return (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0) + (input.pointer.down && input.device === 'mouse' ? 0 : 0);
}

/** A distance meter painted as a dotted path with a lotus at the goal. */
export function distanceMeter(ctx, k, label) {
  const W = app.W, x0 = W * 0.3, x1 = W * 0.7, y = 100;
  ctx.fillStyle = PAL.black;
  for (let x = x0; x <= x1; x += 14) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
  M.lotusBud(ctx, x1 + 14, y + 6, 12, { seed: 2 });
  const px = x0 + (x1 - x0) * Math.min(1, k);
  shape(ctx, rectPts(px - 6, y - 8, 12, 16), { mode: 'colour', fill: PAL.orange, w: 1.4 });
  if (label) plate(ctx, label, x0 - 70, y, { size: 15 });
}

export function hitTest(ax, ay, aw, ah, bx, by, bw, bh) { return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2; }
export { M, PAL };
