// Hanuman in Lanka: the night search (stealth) and the burning (rooftops).
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { Rng } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { character, fig, WALK } from '../art/figures.js';
import { shape, line, ellipsePts, hatch, rectPts, dots, plate } from '../art/ink.js';
import { drawBackdrop } from '../art/backdrops.js';
import * as M from '../art/motifs.js';
import { baseTrial } from './common.js';
import { cue } from '../audio/audio.js';

// ---------------------------------------------------------------- Lanka by night
export function createStealth(b, r) {
  const o = baseTrial(b, r, ['left', 'right', 'action']);
  const len = b.length || 4200;
  const hn = character('hanuman');
  const guardSpec = character('guard');
  const st = { x: 120, vx: 0, hidden: false, sus: 0, cp: 120, walkT: 0, facing: 1, caught: 0 };
  const covers = [];
  for (let x = 420; x < len - 200; x += 330) covers.push({ x: x + ((x * 7) % 90), kind: (x / 330) % 2 > 1 ? 'pillar' : 'pot' });
  const guards = [];
  for (let x = 800; x < len - 300; x += 640) guards.push({ x, home: x, dir: -1, range: 170, t: (x % 5) * 0.7, look: 1, turnT: 2 + (x % 3) });
  o.hintOnce('hint.hide', 3);
  o.update = (dt) => {
    o.tick(dt);
    const ax = input.axis || (input.pointer.down && input.device === 'touch' && input.pointer.x > app.W * 0.3 && input.pointer.x < app.W * 0.7 ? Math.sign(input.pointer.x - (st.x - camX())) : 0);
    const hideKey = input.held.action || input.held.down;
    const cover = covers.find((c) => Math.abs(c.x - st.x) < 40);
    st.hidden = !!(hideKey && cover);
    if (st.hidden) { st.vx = 0; st.x += (cover.x - st.x) * Math.min(1, dt * 10); }
    else { st.vx = ax * 150; st.x = Math.max(60, Math.min(len, st.x + st.vx * dt)); if (ax) { st.facing = ax; st.walkT += dt; } }
    for (const g of guards) {
      g.t += dt; g.turnT -= dt;
      if (g.turnT <= 0) { g.look = -g.look; g.turnT = 2.2 + ((g.t * 3) % 1.5); cue('chime'); }
      g.x = g.home + Math.sin(g.t * 0.35) * g.range;
      g.dir = g.look;
    }
    // sight: a cone in front of each guard, ending at about 300 units
    let seen = false;
    for (const g of guards) { const d = (st.x - g.x) * g.dir; if (d > 0 && d < 300 && !st.hidden) seen = true; }
    st.sus = Math.max(0, Math.min(1, st.sus + (seen ? dt * 0.75 : -dt * 0.3)));
    if (st.sus >= 1) { st.sus = 0; st.x = st.cp; o.hits++; o.fails++; cue('fail'); o.say('ch27.seen', 2.4); }
    for (const c of covers) if (st.hidden && c.x > st.cp && Math.abs(c.x - st.x) < 40) st.cp = c.x;
    if (st.x >= len - 10) o.finish({ finish: true, gentle: o.hits === 0, fast: o.t < (b.par || 70) });
  };
  const camX = () => Math.max(0, Math.min(len - app.W + 200, st.x - app.W * 0.4));
  o.render = (ctx) => {
    const cx = camX(), W = app.W;
    drawBackdrop(ctx, 'lankaNight', 'kachni', cx, W, { colour: false });
    ctx.save(); ctx.translate(-cx, 0);
    for (const g of guards) {
      const tip = g.x + g.dir * 300;
      const cone = [[g.x + g.dir * 20, GROUND - 120], [tip, GROUND - 200], [tip, GROUND]];
      ctx.save(); ctx.globalAlpha = 0.85; hatch(ctx, cone, { color: PAL.turmeric, spacing: 10, angle: g.dir > 0 ? 0.3 : -0.3, w: 2 }); ctx.restore();
      line(ctx, cone.concat([cone[0]]), { w: 1.6, color: PAL.turmeric, flat: true });
      fig(ctx, guardSpec, 'stand', g.x, GROUND, { facing: g.dir, mode: 'kachni' });
      M.lampFlame(ctx, g.x + g.dir * 30, GROUND - 100, 18, o.t, 3);
    }
    for (const c of covers) {
      if (c.kind === 'pot') M.pot(ctx, c.x, GROUND, 90, { colour: false, night: true, fill: PAL.gold }); else M.pillar(ctx, c.x, GROUND, 40, 200, { colour: false, night: true });
      if (Math.abs(c.x - st.x) < 60 && !st.hidden) M.usableRing(ctx, c.x, GROUND - 50, 40, o.t);
    }
    fig(ctx, hn, st.hidden ? 'hide' : Math.abs(st.vx) > 1 ? WALK[Math.floor(st.walkT * 9) % 4] : 'stand', st.x, GROUND, { facing: st.facing, scale: 0.45, alpha: st.hidden ? 0.55 : 1 });
    ctx.restore();
    // suspicion meter: eyes that open
    for (let i = 0; i < 5; i++) M.nainaJogin(ctx, W / 2 - 100 + i * 50, 150, 16, st.sus > (i + 0.5) / 5 ? 1 : 0, 1);
    plate(ctx, t('ch27.suspicion'), W / 2, 110, { size: 15 });
    o.overlay(ctx, { objective: b.k || 'ch27.obj', progress: st.x / len, night: true, hand: { x: W - 140, y: 600 } });
  };
  return o;
}

// ---------------------------------------------------------------- Lanka burns
export function createRooftops(b, r) {
  const o = baseTrial(b, r, ['left', 'right', 'jump']);
  const rng = new Rng('roofs');
  const roofs = [];
  let x = 0;
  for (let i = 0; i < 16; i++) { const w = rng.range(260, 420), h = rng.range(170, 330); roofs.push({ x, w, top: 720 - h, lit: false, i, grove: i === 9 }); x += w + (i === 8 ? 220 : rng.range(70, 150)); }
  const len = x - 200;
  const hn = character('hanuman');
  const st = { x: 80, y: roofs[0].top, vy: 0, vx: 0, ground: true, facing: 1, walkT: 0, shots: [], shotT: 2, safe: 80, inv: 0 };
  const need = roofs.filter((q) => !q.grove).length - 3;
  o.hintOnce('hint.roofs', 3);
  const roofAt = (px) => roofs.find((q) => px > q.x && px < q.x + q.w && !q.grove);
  o.update = (dt) => {
    o.tick(dt); st.inv -= dt;
    const ax = input.axis;
    st.vx = ax * 300; if (ax) { st.facing = ax; st.walkT += dt; }
    if ((input.consume('jump') || input.consume('up') || (input.pointer.justDown && input.device === 'touch' && input.pointer.x > app.W * 0.3 && input.pointer.x < app.W * 0.7)) && st.ground) { st.vy = -860; st.ground = false; cue('jump'); }
    st.vy += 2100 * dt; st.x = Math.max(20, st.x + st.vx * dt);
    const ny = st.y + st.vy * dt;
    const roof = roofAt(st.x);
    if (roof && st.y <= roof.top + 1 && ny >= roof.top) { st.y = roof.top; st.vy = 0; st.ground = true; st.safe = st.x; if (!roof.lit) { roof.lit = true; cue('fireWhoosh'); } }
    else { st.y = ny; if (!roof || st.y > roof.top + 4) st.ground = false; }
    if (st.y > 760) { st.x = st.safe; const q = roofAt(st.safe); st.y = q ? q.top : 300; st.vy = 0; o.hits++; o.say('ch30.fall', 1.6); }
    // archers below loose arrows along painted red paths
    st.shotT -= dt;
    if (st.shotT <= 0) { st.shotT = 1.6 + rng.next() * 1.2; st.shots.push({ x: st.x + rng.range(200, 420), y: 720, tx: st.x + 120 + st.vx * 0.6, ty: st.y - 60, t: 0, warn: 0.9 }); cue('bowCreak'); }
    for (const s of st.shots) {
      s.t += dt;
      if (s.t > s.warn) { const k = (s.t - s.warn) / 0.5; s.cx = s.x + (s.tx - s.x) * k * 1.6; s.cy = s.y + (s.ty - s.y) * k * 1.6; if (!s.hit && st.inv <= 0 && Math.abs(s.cx - st.x) < 30 && Math.abs(s.cy - (st.y - 60)) < 60) { s.hit = true; st.inv = 1; o.hits++; cue('hurt'); } }
    }
    st.shots = st.shots.filter((s) => s.t < s.warn + 0.8);
    const lit = roofs.filter((q) => q.lit).length;
    if (!o.groveSaid && st.x > roofs[8].x + roofs[8].w) { o.groveSaid = true; o.say('ch30.grove', 3); }
    if (st.x >= len && lit >= need) o.finish({ finish: true, gentle: o.hits <= 2, fast: o.t < (b.par || 70) });
    else if (st.x >= len && !o.moreSaid) { o.moreSaid = true; o.say('ch30.more', 2.4); }
  };
  o.render = (ctx) => {
    const W = app.W, cx = Math.max(0, Math.min(len - W + 400, st.x - W * 0.35));
    drawBackdrop(ctx, 'lankaRoofs', 'kachni', cx * 0.5, W, { colour: false });
    ctx.save(); ctx.translate(-cx, 0);
    for (const q of roofs) {
      if (q.grove) { for (let i = 0; i < 3; i++) M.tree(ctx, q.x + 60 + i * 90, 720, 260, 'ashoka', { colour: true, seed: i }); continue; }
      M.building(ctx, q.x + q.w / 2, 720, q.w, 720 - q.top + 50, { colour: false, lanka: true, tiers: 1, seed: q.i, night: true });
      line(ctx, [[q.x, q.top], [q.x + q.w, q.top]], { w: 3, color: PAL.nightLine });
      if (q.lit) for (let i = 0; i < 4; i++) M.flame(ctx, q.x + 40 + i * (q.w - 80) / 3, q.top, 56 + (i % 2) * 24, { t: o.t, seed: q.i * 4 + i });
    }
    for (const s of st.shots) {
      if (s.t <= s.warn) { ctx.fillStyle = PAL.kusum; for (let i = 1; i < 10; i++) { const k = i / 10; ctx.beginPath(); ctx.arc(s.x + (s.tx - s.x) * k, s.y + (s.ty - s.y) * k, 4, 0, 7); ctx.fill(); } }
      else { const a = Math.atan2(s.ty - s.y, s.tx - s.x); ctx.save(); ctx.translate(s.cx, s.cy); ctx.rotate(a); line(ctx, [[-50, 0], [0, 0]], { w: 5, flat: true }); line(ctx, [[-48, 0], [-4, 0]], { w: 2.5, color: PAL.kusum, flat: true }); ctx.restore(); }
    }
    const blink = st.inv > 0 && Math.floor(st.inv * 12) % 2 === 0;
    fig(ctx, hn, !st.ground ? 'jump' : Math.abs(st.vx) > 1 ? WALK[Math.floor(st.walkT * 9) % 4] : 'stand', st.x, st.y, { facing: st.facing, scale: 0.7, alpha: blink ? 0.4 : 1 });
    M.flame(ctx, st.x - st.facing * 70, st.y - 70, 26, { t: o.t, seed: 2, tongues: 2 });
    ctx.restore();
    const lit = roofs.filter((q) => q.lit).length;
    plate(ctx, `${lit} / ${need}`, W - 120, 120, { size: 18 });
    o.overlay(ctx, { objective: b.k || 'ch30.obj', progress: Math.min(1, lit / need), night: true });
  };
  return o;
}
