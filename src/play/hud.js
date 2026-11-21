// The HUD is part of the painting (Rule E): health is a border band that loses its pattern,
// the boon meter is a sun whose rays fill in, boss health is a vine of lotuses that wilt,
// and wave progress fills the frame. Objective text always sits on a paper plate.
import { app } from '../core/app.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { shape, line, rectPts, plate } from '../art/ink.js';
import { pattern } from '../art/patterns.js';
import * as M from '../art/motifs.js';
import { BORDER, GROUND } from '../art/layout.js';
import { drawFrame } from '../art/borders.js';
import { symbolPoints } from './astra.js';
import { controlPoint } from '../ui/dom.js';

// the sun sits in the same safe-area-inset row as the health band it is drawn beside
export function sunRect() { return { x: BORDER + 14 + app.safe.l + 262 + 34, y: BORDER + 30 + app.safe.t, r: 34 }; }

/** Rama's rage badge (the Kodanda), just right of the boon sun. */
export function rageRect() { const s = sunRect(); return { x: s.x + 74, y: s.y, r: 30 }; }

function drawRage(ctx, b) {
  const r = rageRect(), h = b.hero, full = h.rage >= 100, on = h.rageT > 0;
  const k = on ? h.rageT / 7 : h.rage / 100;
  ctx.save(); ctx.translate(r.x, r.y + 2);
  // a round plate with the bow drawn on it; the vermilion fill rises with the rage
  ctx.fillStyle = PAL.paper; ctx.strokeStyle = PAL.black; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = on || full ? '#a82414' : PAL.kusum; ctx.fillRect(-20, 20 - 40 * k, 40, 40 * k); ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = full || on ? PAL.gold : PAL.black; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(-14, 0, 18, -1.05, 1.05); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.strokeStyle = PAL.black; ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(-5, 15); ctx.stroke();
  ctx.restore();
  if (full && !on) M.usableRing(ctx, r.x, r.y + 2, 32, b.time);
}

export function drawHud(ctx, b) {
  const W = app.W, h = b.hero;
  const x0 = BORDER + 14 + app.safe.l, y0 = BORDER + 14 + app.safe.t;
  drawFrame(ctx, { progress: b.waveProgress(), night: b.night });

  // health: a band of lotus pips on a patterned strip; each pip wilts as Rama is hurt
  const segs = 10, sw = 25, ratio = Math.max(0, h.hp / h.maxHp);
  shape(ctx, rectPts(x0 - 4, y0 - 2, segs * sw + 6, 26), { mode: 'colour', fill: PAL.paper, pattern: pattern(ctx, 'lotusRow', null, PAL.wash || PAL.cream, 0.9), w: 1.3, seed: 2, amp: 0.5 });
  for (let i = 0; i < segs; i++) {
    const k = Math.max(0, Math.min(1, ratio * segs - i));
    M.lotusBud(ctx, x0 + i * sw + sw / 2 - 1, y0 + 20, 10, { wilt: 1 - k, seed: i + 2, colour: k > 0 });
  }
  // boon sun
  if (b.boonOn) {
    const s = sunRect();
    const max = b.tun.boon.max;
    M.sun(ctx, s.x, s.y + 2, 17, { rays: 12, lit: Math.floor((b.boon / max) * 12 + 0.001), colour: true, face: b.boon >= max, lineFill: PAL.paper });
    if (b.boon >= max && b.level.astras) M.usableRing(ctx, s.x, s.y + 2, 38, b.time);
  }
  if (b.rageOn) drawRage(ctx, b);
  // objective plate and wave dots
  let oy = y0 + 4;
  if (b.objective) {
    const r = plate(ctx, t(b.objective), W / 2, y0, { valign: 'top', size: 21, seed: 3 });
    oy = r.y + r.h + 10;
    if (b.waveTotal > 1) {
      for (let i = 0; i < b.waveTotal; i++) {
        const cx = W / 2 + (i - (b.waveTotal - 1) / 2) * 20;
        ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(cx, oy + 4, 6, 0, 7); ctx.fill();
        ctx.fillStyle = i < b.waveDone ? PAL.turmeric : PAL.paper; ctx.beginPath(); ctx.arc(cx, oy + 4, 4.2, 0, 7); ctx.fill();
      }
      oy += 20;
    }
  }
  // boss vine: lotuses wilt as the boss is hurt
  const bosses = b.bosses.filter((q) => !q.dead && q.state !== 'fled' && !q.def.passive);
  bosses.forEach((boss, bi) => {
    const n = 8, vw = Math.min(360, W * 0.3), vx = W - BORDER - 80 - vw - app.safe.r, vy = y0 + 20 + bi * 52;
    // a slim gold-framed bar under the vine gives the exact measure
    const ratioB = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = PAL.black; ctx.fillRect(vx - 2, vy + 20, vw + 4, 9); ctx.fillStyle = PAL.gold; ctx.fillRect(vx - 1, vy + 21, vw + 2, 7);
    ctx.fillStyle = PAL.paper; ctx.fillRect(vx + 1, vy + 23, vw - 2, 3); ctx.fillStyle = PAL.madder; ctx.fillRect(vx + 1, vy + 23, (vw - 2) * ratioB, 3);
    const pts = []; for (let i = 0; i <= 16; i++) pts.push([vx + (vw * i) / 16, vy + (i % 2 ? -5 : 5)]);
    line(ctx, pts, { w: 2.2, color: PAL.black, smooth: true, seed: 4, amp: 0.3, flat: true });
    line(ctx, pts, { w: 1, color: PAL.leaf, smooth: true, seed: 4, amp: 0.3, flat: true });
    const ratio2 = Math.max(0, boss.hp / boss.maxHp);
    for (let i = 0; i < n; i++) {
      const k = Math.max(0, Math.min(1, ratio2 * n - i));
      M.lotusBud(ctx, vx + ((i + 0.5) * vw) / n, vy + 2, 13, { wilt: 1 - k, seed: i + 5 });
    }
  });
  // protect meter (the sacred fire) and timers
  if (b.protect) {
    const px = x0, py = y0 + 34;
    plate(ctx, t(b.protect.label), px, py, { align: 'left', valign: 'top', size: 16, padX: 10, padY: 5 });
    for (let i = 0; i < 6; i++) {
      const lit = b.protect.hp / b.protect.max > i / 6;
      if (lit) M.lampFlame(ctx, px + 16 + i * 22, py + 66, 22, b.time, i);
      else line(ctx, [[px + 8 + i * 22, py + 66], [px + 24 + i * 22, py + 66]], { w: 1.4, seed: i });
    }
  }
  if (b.timer) {
    const k = Math.max(0, Math.min(1, b.timer.t / b.timer.dur));
    const px = x0, py = y0 + (b.protect ? 108 : 34);
    plate(ctx, t(b.timer.label), px, py, { align: 'left', valign: 'top', size: 16, padX: 10, padY: 5 });
    shape(ctx, rectPts(px, py + 36, 200, 14), { mode: 'colour', fill: PAL.paper, w: 1.3, seed: 2 });
    ctx.fillStyle = PAL.kusum; ctx.fillRect(px + 2, py + 38, 196 * k, 10);
  }
  // low health: the four veiled naina-jogins lift their eyes, one by one
  if (ratio < 0.5 && !h.dead) {
    const looks = [ratio < 0.5, ratio < 0.4, ratio < 0.3, ratio < 0.2];
    const pos = [[BORDER + 34, 720 - BORDER - 40, 1], [W - BORDER - 34, 720 - BORDER - 40, -1], [BORDER + 34, BORDER + 96, 1], [W - BORDER - 34, BORDER + 96, -1]];
    pos.forEach(([px, py, fl], i) => M.nainaJogin(ctx, px, py, 22, looks[i] ? 1 : 0, fl));
  }
  // hints and labels
  if (b.hint) {
    const hy = app.isTouch ? 250 : GROUND + 96;
    plate(ctx, b.hint.text, W / 2, hy, { size: 26, bold: true, gap: PAL.indigo, seed: 5 });
    if (b.hint.hand) { const cp = controlPoint(b.hint.hand); if (cp) drawHand(ctx, cp[0], cp[1] - 50, b.time); else if (b.hint.hand !== 'draw' || !app.isTouch) drawHand(ctx, W / 2 - 8, hy + 62, b.time); }
  }
  if (b.line) plate(ctx, b.line.text, W / 2, 164, { size: 22, italic: !b.line.speaker, seed: 6 });
  if (b.banner) {
    plate(ctx, b.banner.title + (b.banner.sub ? '\n' + b.banner.sub : ''), W / 2, 300, { size: 34, font: '"Yatra One", serif', padX: 34, padY: 18, gap: PAL.madder });
  }
  if (b.goRight) {
    const gx = W - BORDER - 90, gy = 360;
    shape(ctx, [[gx - 30, gy - 16], [gx + 6, gy - 16], [gx + 6, gy - 34], [gx + 44, gy], [gx + 6, gy + 34], [gx + 6, gy + 16], [gx - 30, gy + 16]], { mode: 'colour', fill: PAL.turmeric, gap: PAL.white, w: 1.6, seed: 2 + (Math.floor(b.time * 2) % 2) });
  }
  // astra tracing
  if (b.astra) {
    const a = b.astra, cx = W / 2, cy = 330, size = 150;
    plate(ctx, t(a.key) + '\n' + t(b.diffName === 'story' ? 'hint.astraTap' : app.isTouch ? 'hint.astraTrace' : 'hint.astraTraceMouse'), cx, 110, { size: 22, gap: PAL.indigo });
    const pts = symbolPoints(a.symbol, cx, cy, size);
    line(ctx, pts, { w: 16, color: PAL.black, smooth: false, seed: 1, amp: 0, flat: true });
    ctx.setLineDash([2, 18]); line(ctx, pts, { w: 10, color: PAL.white, seed: 1, amp: 0, flat: true }); ctx.setLineDash([]);
    M.usableRing(ctx, pts[0][0], pts[0][1], 24, b.time);
    if (a.pts.length > 1) { line(ctx, a.pts, { w: 9, color: PAL.black, seed: 2, amp: 0, flat: true }); line(ctx, a.pts, { w: 5, color: PAL.indigo, seed: 2, amp: 0, flat: true }); }
    const k = Math.max(0, 1 - a.t / b.tun.boon.traceTime);
    ctx.fillStyle = PAL.black; ctx.fillRect(cx - 122, cy + size + 38, 244, 10); ctx.fillStyle = PAL.turmeric; ctx.fillRect(cx - 120, cy + size + 40, 240 * k, 6);
  }
}

/** A small painted hand that taps: shows a gesture without a paragraph. */
export function drawHand(ctx, x, y, time, o = {}) {
  const dy = Math.abs(Math.sin(time * 5)) * 8;
  ctx.save(); ctx.translate(x, y - dy);
  shape(ctx, [[-10, 26], [-12, 4], [-5, 2], [-4, -24], [3, -24], [4, -2], [9, -4], [10, 0], [15, -2], [16, 3], [20, 2], [20, 20], [14, 30]], { mode: 'colour', fill: PAL.skin, gap: null, w: 1.6, seed: 3, smooth: false });
  line(ctx, [[-10, 26], [14, 30]], { w: 3, color: PAL.turmeric, seed: 1 });
  ctx.restore();
  if (dy < 2) { ctx.strokeStyle = PAL.indigo; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 26, 12, 0, 7); ctx.stroke(); }
  void o;
}
