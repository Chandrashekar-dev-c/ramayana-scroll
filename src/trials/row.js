// Guha's Boat: row Rama, Sita and Lakshmana across the Ganga. Steer between logs,
// crocodiles and whirlpools. Decorative fish and lilies are smaller and lighter than hazards.
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { Rng } from '../core/rng.js';
import { PAL } from '../art/palette.js';
import { character, fig } from '../art/figures.js';
import { shape, line, ellipsePts, hatch, rectPts } from '../art/ink.js';
import { drawProp } from '../art/props.js';
import * as M from '../art/motifs.js';
import { baseTrial, distanceMeter } from './common.js';
import { cue } from '../audio/audio.js';

const LANES = [470, 565, 660];

export function createRow(b, r) {
  const o = baseTrial(b, r, ['up', 'down', 'action']);
  const rng = new Rng('row');
  const len = b.length || 5200;
  const st = { x: 0, lane: 1, y: LANES[1], speed: 150, hazards: [], deco: [], nextH: 600, rock: 0, prayed: false, inv: 0 };
  const cast = [character('guha'), character('rama', 'exile'), character('sita', 'exile'), character('lakshmana', 'exile')];
  for (let x = 400; x < len + 800; x += 140) st.deco.push({ x: x + rng.range(-40, 40), lane: rng.int(0, 2), kind: rng.pick(['fish', 'lily', 'fish']), dy: rng.range(-20, 20) });
  o.hintOnce('hint.row', 3);
  o.update = (dt) => {
    o.tick(dt);
    if (input.consume('up')) st.lane = Math.max(0, st.lane - 1);
    if (input.consume('down')) st.lane = Math.min(2, st.lane + 1);
    if (input.pointer.justDown && input.pointer.x > app.W * 0.25 && input.pointer.x < app.W * 0.75) st.lane = input.pointer.y < st.y - 30 ? Math.max(0, st.lane - 1) : input.pointer.y > st.y + 30 ? Math.min(2, st.lane + 1) : st.lane;
    const rowing = input.held.action || input.held.right || input.held.jump;
    st.speed += ((rowing ? 290 : 150) - st.speed) * dt * 2;
    st.y += (LANES[st.lane] - st.y) * Math.min(1, dt * 8);
    st.x += st.speed * dt; st.rock = Math.max(0, st.rock - dt); st.inv -= dt;
    while (st.nextH < st.x + app.W + 200 && st.nextH < len - 300) {
      const kind = rng.pick(['log', 'croc', 'whirl', 'log']);
      const lanes = [0, 1, 2]; const free = lanes.splice(rng.int(0, 2), 1)[0]; void free;
      st.hazards.push({ x: st.nextH, lane: lanes[rng.int(0, lanes.length - 1)], kind, t: 0 });
      if (rng.chance(0.35)) st.hazards.push({ x: st.nextH + 30, lane: lanes[rng.int(0, lanes.length - 1)], kind: rng.pick(['log', 'croc']), t: 0 });
      st.nextH += rng.range(320, 460) * (o.t > 20 ? 0.85 : 1);
    }
    for (const h of st.hazards) {
      h.t += dt;
      if (h.kind === 'croc') h.x -= 40 * dt;
      const sx = h.x - st.x + 240;
      if (!h.hit && st.inv <= 0 && Math.abs(sx - 300) < (h.kind === 'whirl' ? 70 : 90) && h.lane === st.lane) { h.hit = true; o.hits++; st.speed = 40; st.rock = 0.6; st.inv = 0.8; cue(h.kind === 'whirl' ? 'splash' : 'thud'); }
    }
    st.hazards = st.hazards.filter((h) => h.x - st.x > -400);
    if (!st.prayed && st.x > len * 0.5) { st.prayed = true; o.say('ch10.pray', 3.4); }
    if (st.x >= len) o.finish({ finish: true, gentle: o.hits <= 2, fast: o.t < (b.par || 40) });
  };
  o.render = (ctx) => {
    const W = app.W;
    ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, W, 720);
    // far bank and near bank, flat bands
    const off = st.x * 0.5;
    for (let i = -1; i < 8; i++) { const x = i * 220 - (off % 220); M.tree(ctx, x, 410, 150, i % 2 ? 'mango' : 'palm', { colour: true, seed: i + Math.floor(off / 220) }); }
    shape(ctx, rectPts(-10, 410, W + 20, 300), { mode: 'colour', fill: PAL.river, w: 2 });
    ctx.save(); ctx.globalAlpha = 0.65; M.waves(ctx, 0, W, 430, 700, { t: o.t, gap: 22, colour: false, w: 1.4, speed: 30 + st.speed * 0.2 }); ctx.restore();
    for (const d of st.deco) { const sx = d.x - st.x + 240; if (sx < -50 || sx > W + 50) continue; if (d.kind === 'fish') M.fish(ctx, sx, LANES[d.lane] + 30 + d.dy, 9, { colour: true, fill: PAL.turmeric, w: 1, dir: -1 }); else M.lotusBud(ctx, sx, LANES[d.lane] + 34 + d.dy, 9, { fill: PAL.pink, w: 1 }); }
    for (const h of st.hazards) {
      const sx = h.x - st.x + 240, y = LANES[h.lane] + 20;
      if (sx < -150 || sx > W + 150) continue;
      if (h.kind === 'log') { shape(ctx, [[sx - 70, y - 12], [sx + 70, y - 16], [sx + 74, y + 8], [sx - 72, y + 12]], { mode: 'colour', fill: PAL.brown, gap: PAL.kusum, w: 2.2, seed: h.lane }); hatch(ctx, [[sx - 70, y - 12], [sx + 70, y - 16], [sx + 74, y + 8], [sx - 72, y + 12]], { color: PAL.kusum, spacing: 8, angle: 0.8 }); }
      else if (h.kind === 'croc') { shape(ctx, [[sx - 80, y], [sx - 40, y - 18], [sx + 50, y - 16], [sx + 90, y - 6], [sx + 50, y + 4], [sx - 70, y + 8]], { mode: 'colour', fill: PAL.rakshasaLight, gap: PAL.kusum, w: 2.2 }); for (let i = 0; i < 5; i++) M.star(ctx, sx - 40 + i * 20, y - 20, 4, { points: 4 }); ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(sx + 58, y - 12, 4, 0, 7); ctx.fill(); }
      else { for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? PAL.kusum : PAL.black; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx, y, 70 - i * 20, 20 - i * 6, 0, h.t * (3 + i), h.t * (3 + i) + 4.5); ctx.stroke(); } }
    }
    // the boat and its people
    const bx = 300, by = st.y + 26 + Math.sin(o.t * 3) * 3 + Math.sin(st.rock * 20) * st.rock * 8;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(st.rock * 18) * st.rock * 0.1);
    const sc = 0.62;
    [[ -95, 0], [-30, 1], [25, 2], [85, 3]].forEach(([dx, i]) => fig(ctx, cast[i], i === 0 ? (Math.floor(o.t * 3) % 2 ? 'swing0' : 'swing1') : 'sit', dx, -16, { facing: 1, scale: sc }));
    drawProp(ctx, 'boat', 0, 0, { scale: 0.85 });
    ctx.restore();
    distanceMeter(ctx, st.x / len);
    o.overlay(ctx, { objective: b.k || 'ch10.obj', progress: st.x / len, hand: { x: W - 160, y: 600 } });
  };
  o.restart = () => { Object.assign(st, { x: 0, lane: 1, hazards: [], nextH: 600 }); };
  return o;
}
