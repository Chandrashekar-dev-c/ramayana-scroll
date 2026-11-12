// Flying trials: Hanuman's leap, the Sanjeevani mountain, Sita's jewels, and Jatayu's fight.
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { Rng } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { character, fig } from '../art/figures.js';
import { shape, line, ellipsePts, hatch, rectPts, dots, plate } from '../art/ink.js';
import { drawProp } from '../art/props.js';
import * as M from '../art/motifs.js';
import { baseTrial, distanceMeter } from './common.js';
import { cue } from '../audio/audio.js';
import { drawHand } from '../play/hud.js';

const SEA = 560;

function sky(ctx, o, st, kind) {
  const W = app.W;
  const night = kind === 'sanjeevani';
  ctx.fillStyle = night ? PAL.night : PAL.cream; ctx.fillRect(0, 0, W, 720);
  if (night) { const k = Math.min(1, o.t / (o.dawnAt || 60)); ctx.save(); ctx.globalAlpha = k * 0.85; ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, W, 720); ctx.restore(); M.sun(ctx, W - 160, 640 - k * 420, 36, { colour: true, face: false }); }
  M.fillers(ctx, 0, W, 40, 400, { kinds: night ? ['star'] : ['bird', 'dots', 'fish'], seed: 7 + Math.floor(st.x / 1200), night, colour: false, density: 0.8 });
  if (kind === 'leap' || kind === 'jatayu') {
    const off = st.x * 0.6;
    if (kind === 'leap') { shape(ctx, rectPts(-10, SEA, W + 20, 200), { mode: 'colour', fill: PAL.river, w: 2 }); ctx.save(); ctx.globalAlpha = 0.6; M.waves(ctx, 0, W, SEA + 18, 720, { t: o.t, gap: 22, speed: 80 }); ctx.restore(); for (let i = -1; i < 7; i++) M.fish(ctx, i * 240 - (off % 240) + 60, SEA + 70 + (i % 2) * 50, 10, { colour: true, fill: PAL.turmeric, dir: -1 }); }
    else { for (let i = -1; i < 8; i++) M.tree(ctx, i * 200 - (off % 200), GROUND + 90, 160, i % 2 ? 'sala' : 'banyan', { colour: false, seed: i + Math.floor(off / 200) }); line(ctx, [[0, GROUND + 90], [W, GROUND + 90]], { w: 2 }); }
  } else {
    const off = st.x * 0.5;
    for (let i = -1; i < 6; i++) M.hill(ctx, i * 300 - (off % 300) + 150, 720, 330, 140 + ((i + Math.floor(off / 300)) % 3) * 40, { colour: kind !== 'sanjeevani', seed: i + Math.floor(off / 300), night });
  }
}

export function createFlight(b, r) {
  const kind = b.kind || 'leap';
  const o = baseTrial(b, r, kind === 'jewels' ? ['action'] : kind === 'jatayu' ? ['left', 'right', 'up', 'down', 'action'] : ['up', 'down', 'action']);
  const rng = new Rng('flight:' + kind);
  const len = b.length || (kind === 'leap' ? 9000 : kind === 'sanjeevani' ? 7000 : kind === 'jewels' ? 5200 : 0);
  const st = { x: 0, y: 300, px: 300, vy: 0, speed: kind === 'jewels' ? 260 : 330, inv: 0, scale: 0.55, obs: [], nextO: 700, ev: null, events: [], drops: [], targets: [], timePen: 0, phase: 1, enemy: null, grip: 0 };
  o.dawnAt = b.dawn || 75;
  const hero = kind === 'jatayu' ? character('jatayu') : character('hanuman');
  if (kind === 'leap') st.events = [{ at: 0.24, id: 'mainaka' }, { at: 0.48, id: 'surasa' }, { at: 0.72, id: 'simhika' }];
  if (kind === 'jewels') { st.y = 220; [0.2, 0.42, 0.64].forEach((a, i) => st.targets.push({ x: len * a + 600, kind: i === 1 ? 'river' : 'forest', got: false })); st.targets.push({ x: len * 0.86 + 600, kind: 'monkeys', got: false, main: true }); }
  if (kind === 'jatayu') { st.enemy = { x: app.W * 0.7, y: 260, hp: 6, hp2: 4, t: 0, atk: 1.6, phase: 1, cut: false }; st.px = 260; }
  o.hintOnce(kind === 'jewels' ? 'hint.drop' : kind === 'jatayu' ? 'hint.jatayu' : 'hint.fly', 3);

  const steerY = (dt, sp = 460) => {
    let dy = (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0);
    if (input.axisY) dy = input.axisY;
    if (input.pointer.down && (input.device === 'touch' || input.device === 'mouse') && input.pointer.x < app.W * 0.75) { const d = input.pointer.y - st.y; dy = Math.abs(d) > 12 ? Math.sign(d) * Math.min(1, Math.abs(d) / 60) : 0; }
    st.y = Math.max(140, Math.min(kind === 'leap' ? SEA - 40 : 600, st.y + dy * sp * dt));
  };

  function spawnObstacles() {
    while (st.nextO < st.x + app.W + 300 && st.nextO < len - 500) {
      const ev = st.events.find((e) => !e.done && Math.abs(st.nextO / len - e.at) < 0.06);
      if (!ev && kind !== 'jewels') {
        const k = kind === 'leap' ? rng.pick(['bird', 'bird', 'spray']) : rng.pick(['storm', 'eagle', 'eagle']);
        st.obs.push({ x: st.nextO, y: k === 'spray' ? SEA : rng.range(170, 520), kind: k, t: 0, vy: 0 });
      }
      st.nextO += rng.range(300, 470) * (kind === 'sanjeevani' ? 0.85 : 1);
    }
  }

  function hurt() { if (st.inv > 0) return; st.inv = 1; o.hits++; st.timePen += kind === 'sanjeevani' ? 3 : 0; cue('hurt'); }

  o.update = (dt) => {
    o.tick(dt);
    st.inv -= dt;
    if (kind === 'jatayu') return updateJatayu(dt);
    const ev = st.ev;
    if (ev) { updateEvent(dt, ev); return; }
    steerY(dt);
    const boost = input.held.action ? 1.35 : 1;
    st.x += st.speed * boost * dt;
    for (const e of st.events) if (!e.done && st.x / len >= e.at) { e.done = true; st.ev = { id: e.id, t: 0, p: 0, step: 0 }; o.say('ch26.' + e.id, 3); return; }
    spawnObstacles();
    for (const q of st.obs) {
      q.t += dt;
      const sx = q.x - st.x + st.px;
      if (q.kind === 'bird') q.x -= 120 * dt;
      if (q.kind === 'eagle') { q.x -= 260 * dt; q.y += Math.sign(st.y - q.y) * 60 * dt; }
      if (q.kind === 'spray') q.vy = Math.max(0, Math.sin(q.t * 1.6)) * 330;
      let hit = false;
      if (q.kind === 'spray') hit = Math.abs(sx - st.px) < 40 && st.y > SEA - q.vy;
      else hit = Math.abs(sx - st.px) < (q.kind === 'storm' ? 110 : 50) && Math.abs(q.y - st.y) < (q.kind === 'storm' ? 70 : 40);
      if (hit) hurt();
    }
    st.obs = st.obs.filter((q) => q.x - st.x > -500);
    if (kind === 'jewels') {
      if (input.consume('action') || input.consume('confirm') || input.consume('jump') || input.pointer.justDown) { st.drops.push({ x: st.x + st.px, y: st.y + 30, vx: st.speed, vy: -40 }); cue('coin'); }
      for (const d of st.drops) {
        d.vy += 600 * dt; d.x += d.vx * dt * 0.3; d.y += d.vy * dt;
        if (d.y > 0 && !d.landed) for (const tg of st.targets) { const top = tg.main ? 470 : 520; if (d.y >= top && Math.abs(d.x - tg.x) < (tg.main ? 120 : 90)) { if (!tg.got) { tg.got = true; cue('chime'); o.say(tg.main ? 'ch19.landed' : 'ch19.trail', 2.2); } d.landed = true; } }
        if (d.y > 720) d.landed = true;
      }
      st.drops = st.drops.filter((d) => !d.landed);
      const main = st.targets.find((q) => q.main);
      if (main && !main.got && st.x + st.px > main.x + 260) { main.x = st.x + st.px + 900; st.missed = (st.missed || 0) + 1; o.say('ch19.again', 2.4); }
      if (main && main.got && st.x > main.x + 400) o.finish({ finish: true, gentle: st.targets.filter((q) => !q.main && q.got).length >= 2, fast: !st.missed });
      if (main && !main.got) st.x = Math.min(st.x, len);
    } else if (st.x >= len) o.finish({ finish: true, gentle: o.hits <= 2, fast: kind === 'sanjeevani' ? o.t + st.timePen < o.dawnAt : o.t < (b.par || 45) });
  };

  function updateEvent(dt, ev) {
    ev.t += dt;
    const W = app.W;
    if (ev.id === 'mainaka') {
      steerY(dt);
      ev.p = Math.min(1, ev.t / 1.5);
      if (st.y < 330 && st.y > 220 && ev.t > 1) { if (!ev.touched) { ev.touched = true; cue('chime'); o.say('ch26.mainakaThanks', 2.4); } }
      if (ev.t > 4.5) { st.ev = null; }
      st.x += st.speed * 0.4 * dt;
    } else if (ev.id === 'surasa') {
      // hold to grow; she grows wider. Then tap to shrink and dart through her open mouth.
      ev.mouth = 0.5 + Math.sin(ev.t * 2.2) * 0.5;
      if (ev.step === 0) { if (input.held.action || input.pointer.down || input.held.jump) { ev.p += dt / 2; st.scale = 0.55 + ev.p * 0.6; } if (ev.p >= 1) { ev.step = 1; o.say('ch26.surasaWide', 2.2); o.hintOnce('hint.shrink', 2.5); } }
      else if (ev.step === 1) { if (input.pointer.justDown || input.consume('action') || input.consume('confirm') || input.consume('jump')) { st.scale = 0.18; ev.step = 2; ev.t2 = 0; cue('chime'); } }
      else if (ev.step === 2) { ev.t2 += dt; if (ev.mouth > 0.75 && !ev.inside) { ev.inside = true; ev.t3 = 0; } if (ev.inside) { ev.t3 += dt; if (ev.t3 > 1.6) { ev.step = 3; st.scale = 0.55; o.say('ch26.surasaBless', 2.6); cue('bell'); ev.t = 0; } } }
      else if (ev.t > 2.4) st.ev = null;
      void W;
    } else if (ev.id === 'simhika') {
      // she seizes his shadow: shake free
      st.y = Math.min(SEA - 40, st.y + 70 * dt);
      const shake = input.consume('up') || input.consume('down') || input.pointer.justDown || input.consume('action') || input.consume('jump');
      if (shake) { ev.p += 0.12; cue('thud'); }
      ev.p = Math.max(0, ev.p - dt * 0.06);
      if (ev.p >= 1 && !ev.freed) { ev.freed = true; ev.t = 0; cue('thunder'); o.say('ch26.simhikaFree', 2.4); }
      if (ev.freed && ev.t > 1.8) st.ev = null;
      if (ev.t > 1 && !ev.freed && !o.hint) o.hintOnce('hint.shake', 2);
    }
  }

  function updateJatayu(dt) {
    const e = st.enemy;
    const ax = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0) + (input.axis || 0) * 0;
    st.px = Math.max(120, Math.min(app.W - 120, st.px + ax * 380 * dt));
    if (input.pointer.down && input.device !== 'pad') { const d = input.pointer.x - st.px; st.px += Math.sign(d) * Math.min(Math.abs(d), 380 * dt); }
    steerY(dt, 420);
    if (e.phase === 3) { e.t += dt; st.y = Math.min(640, st.y + 140 * dt); st.px += 30 * dt; if (e.t > 3.2) o.finish({ finish: true, gentle: o.hits <= 3, fast: o.stats.time < 80 }); return; }
    e.t += dt; e.atk -= dt;
    e.y = 240 + Math.sin(e.t * 0.8) * 90; e.x = app.W * 0.72 + Math.sin(e.t * 0.5) * 80;
    if (e.atk <= 0 && !e.wind) { e.wind = { t: 0, ty: st.y, tx: st.px }; cue(e.phase === 1 ? 'bowCreak' : 'starBell'); }
    if (e.wind) {
      e.wind.t += dt;
      if (e.wind.t >= 0.9) {
        if (e.phase === 1) st.obs.push({ kind: 'spear', x: e.x - 60, y: e.y, vx: -620, vy: (e.wind.ty - e.y) * 0.9, t: 0 });
        else if (Math.hypot(st.px - e.x, st.y - e.y) < 170) hurt();
        e.wind = null; e.atk = e.phase === 1 ? 1.5 : 1.3; e.swing = 0.3;
      }
    }
    e.swing = Math.max(0, (e.swing || 0) - dt);
    for (const q of st.obs) { q.x += q.vx * dt; q.y += q.vy * dt; if (Math.abs(q.x - st.px) < 40 && Math.abs(q.y - st.y) < 30) { q.dead = true; hurt(); } }
    st.obs = st.obs.filter((q) => !q.dead && q.x > -100);
    // strike by flying close; a short cooldown between strikes
    st.cd = (st.cd || 0) - dt;
    if (st.cd <= 0 && Math.hypot(st.px - e.x, st.y - e.y) < 120 && (input.held.action || input.pointer.down || true)) {
      st.cd = 0.9; cue('kick'); st.flash = 0.2;
      if (e.phase === 1) { e.hp--; if (e.hp <= 0) { e.phase = 2; o.say('ch18.phase2', 3); cue('thunder'); } else o.say(['ch18.mules', 'ch18.driver', 'ch18.bow'][Math.min(2, 5 - e.hp >> 1)], 1.6); }
      else { e.hp2--; if (e.hp2 <= 0) { e.phase = 3; e.t = 0; o.say('ch18.wings', 3.2); cue('fail'); } }
      st.px -= 90;
    }
    st.flash = Math.max(0, (st.flash || 0) - dt);
  }

  o.render = (ctx) => {
    const W = app.W;
    sky(ctx, o, st, kind);
    if (kind === 'jatayu') { renderJatayu(ctx); return; }
    // jewel targets
    for (const tg of st.targets) {
      const sx = tg.x - st.x;
      if (sx < -300 || sx > W + 300) continue;
      if (tg.kind === 'monkeys') { M.hill(ctx, sx, 720, 380, 260, { colour: true, fill: PAL.ochre, seed: 3 }); const v = character('vanara'), hn = character('hanuman'); for (let i = 0; i < 5; i++) fig(ctx, i === 2 ? hn : v, 'stand', sx - 90 + i * 45, 470 + Math.abs(i - 2) * 12, { scale: 0.32, facing: -1 }); }
      else if (tg.kind === 'river') { shape(ctx, rectPts(sx - 140, 540, 280, 40), { mode: 'colour', fill: PAL.river, w: 1.6 }); }
      else M.tree(ctx, sx, 600, 120, 'banyan', { colour: true, seed: 4 });
      if (!tg.got) M.usableRing(ctx, sx, tg.main ? 460 : 520, tg.main ? 100 : 70, o.t);
      else dots(ctx, sx, tg.main ? 470 : 530, 30, 7, PAL.gold, 2, 4);
    }
    for (const q of st.obs) {
      const sx = q.x - st.x + st.px;
      if (q.kind === 'bird') M.bird(ctx, sx, q.y, 26, { colour: true, fill: PAL.terracotta, dir: -1 });
      else if (q.kind === 'eagle') { M.bird(ctx, sx, q.y, 34, { colour: true, fill: PAL.brown, dir: -1 }); M.star(ctx, sx, q.y - 34, 8, { rot: o.t * 3 }); }
      else if (q.kind === 'storm') { M.cloud(ctx, sx, q.y, 210, { storm: true, hatch: 6, seed: 3 }); line(ctx, [[sx, q.y + 30], [sx - 14, q.y + 70], [sx + 6, q.y + 70], [sx - 8, q.y + 110]], { w: 4, color: PAL.kusum }); }
      else if (q.kind === 'spray') { const h = q.vy; if (h > 10) { shape(ctx, [[sx - 26, SEA], [sx - 16, SEA - h], [sx, SEA - h - 20], [sx + 16, SEA - h], [sx + 26, SEA]], { mode: 'colour', fill: PAL.white, gap: PAL.kusum, w: 2, smooth: true }); } else { ctx.fillStyle = PAL.kusum; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(sx, SEA - 20 - i * 40, 4, 0, 7); ctx.fill(); } } }
    }
    const ev = st.ev;
    if (ev && ev.id === 'mainaka') drawProp(ctx, 'mainaka', st.px + 260, SEA + 150 - ev.p * 300, { colour: true });
    if (ev && ev.id === 'mainaka' && !ev.touched) M.usableRing(ctx, st.px + 240, 280, 60, o.t);
    if (ev && ev.id === 'surasa') {
      const sx = W * 0.72, w = 1 + (ev.step >= 1 ? 0.6 : ev.p * 0.6), m = ev.mouth;
      fig(ctx, character('surasa'), 'stand', sx, SEA + 140, { facing: -1, scale: 1.1 * w });
      shape(ctx, ellipsePts(sx - 60 * w, 330, 46 * w, 40 * m * w + 4, 12), { mode: 'colour', fill: PAL.black, gap: PAL.kusum, w: 2, smooth: true });
      if (ev.step === 2 && m > 0.6) M.usableRing(ctx, sx - 60 * w, 330, 60 * w, o.t);
      if (ev.step === 0) plate(ctx, t('hint.grow'), W / 2, 200, { size: 22 });
    }
    if (ev && ev.id === 'simhika') { fig(ctx, character('simhika'), 'raise', st.px + 40, SEA + 170, { facing: -1, scale: 0.9 }); shape(ctx, ellipsePts(st.px, SEA + 20, 70, 14, 10), { mode: 'colour', fill: PAL.black, w: 1 }); for (let i = 0; i < 6; i++) line(ctx, [[st.px - 50 + i * 20, SEA + 20], [st.px - 50 + i * 20 + 10, st.y + 30]], { w: 2, color: PAL.kusum }); for (let i = 0; i < 8; i++) M.lotusBud(ctx, W / 2 - 140 + i * 40, 190, 12, { wilt: ev.p > (i + 0.5) / 8 ? 0 : 1, seed: i }); if (ev.freed) dots(ctx, st.px + 40, SEA + 60, 30 + ev.t * 160, 24, PAL.turmeric, 4, 5); }
    // the flyer
    const blink = st.inv > 0 && Math.floor(st.inv * 12) % 2 === 0;
    if (kind === 'jewels') {
      drawProp(ctx, 'pushpaka', st.px, st.y + 60, { t: o.t, scale: 0.6 });
      fig(ctx, character('ravana'), 'stand', st.px + 20, st.y + 20, { scale: 0.42, facing: 1, mode: 'kachni' });
      fig(ctx, character('sita', 'exile'), 'raise', st.px - 40, st.y + 20, { scale: 0.42, facing: -1 });
      for (const d of st.drops) dots(ctx, d.x - st.x, d.y, 4, 5, PAL.gold, 3, 4);
    } else {
      if (kind === 'sanjeevani') drawProp(ctx, 'herbPeak', st.px + 6, st.y - 64, { scale: 0.42, colour: true });
      fig(ctx, hero, Math.floor(o.t * 4) % 2 ? 'fly' : 'fly2', st.px, st.y + 50, { facing: 1, scale: st.scale, alpha: blink ? 0.4 : 1 });
    }
    distanceMeter(ctx, st.x / len, kind === 'leap' ? t('ch26.yojanas', { n: Math.round((st.x / len) * 100) }) : null);
    o.overlay(ctx, { objective: b.k, progress: st.x / len, night: kind === 'sanjeevani' && o.t < o.dawnAt * 0.5, hand: { x: W / 2, y: 420 } });
    if (app.isTouch && o.t < 3 && kind !== 'jewels') drawHand(ctx, 140, 380 + Math.sin(o.t * 3) * 60, o.t);
  };

  function renderJatayu(ctx) {
    const e = st.enemy, W = app.W;
    if (e.phase === 1) { drawProp(ctx, 'pushpaka', e.x, e.y + 50, { t: o.t, scale: 0.7 }); fig(ctx, character('ravana'), e.wind ? 'draw2' : 'stand', e.x + 10, e.y, { scale: 0.5, facing: -1 }); fig(ctx, character('sita', 'exile'), 'raise', e.x + 70, e.y, { scale: 0.45, facing: -1 }); }
    else { fig(ctx, character('ravana'), e.swing > 0 ? 'swing1' : e.wind ? 'swing0' : 'stand', e.x, e.y + 90, { scale: 0.6, facing: -1 }); fig(ctx, character('sita', 'exile'), 'raise', e.x + 80, e.y + 40, { scale: 0.42, facing: -1 }); }
    if (e.wind && e.phase === 2) M.star(ctx, e.x, e.y - 70, 18, { rot: o.t * 3 });
    if (e.wind && e.phase === 1) { ctx.fillStyle = PAL.kusum; for (let i = 1; i < 12; i++) { const k = i / 12; ctx.beginPath(); ctx.arc(e.x - 60 + (e.wind.tx - e.x + 60) * k, e.y + (e.wind.ty - e.y) * k, 4, 0, 7); ctx.fill(); } }
    if (e.phase < 3 && Math.hypot(st.px - e.x, st.y - e.y) < 240) M.usableRing(ctx, e.x, e.y, 70, o.t);
    for (const q of st.obs) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(q.vy, q.vx)); line(ctx, [[-60, 0], [0, 0]], { w: 5, flat: true }); line(ctx, [[-58, 0], [-4, 0]], { w: 2.5, color: PAL.kusum, flat: true }); ctx.restore(); }
    const blink = st.inv > 0 && Math.floor(st.inv * 12) % 2 === 0;
    fig(ctx, hero, e.phase === 3 ? 'hurt' : Math.floor(o.t * 5) % 2 ? 'fly' : 'fly2', st.px, st.y + 60, { facing: 1, scale: 0.7, alpha: blink ? 0.4 : 1, rot: e.phase === 3 ? Math.min(1.2, e.t * 0.5) : 0 });
    if (e.phase === 3 && e.t > 1) { line(ctx, [[st.px + 40, st.y - 40 + e.t * 30], [st.px + 70, st.y - 10 + e.t * 30]], { w: 2, color: PAL.grey }); }
    const hp = e.phase === 1 ? e.hp / 6 : e.phase === 2 ? e.hp2 / 4 : 0;
    for (let i = 0; i < 8; i++) M.lotusBud(ctx, W - 380 + i * 40, 60, 12, { wilt: hp > (i + 0.5) / 8 ? 0 : 1, seed: i });
    o.overlay(ctx, { objective: e.phase === 1 ? 'ch18.obj1' : e.phase === 2 ? 'ch18.obj2' : null, progress: e.phase === 1 ? (6 - e.hp) / 12 : 0.5 + (4 - e.hp2) / 8 });
  }

  o.restart = () => {};
  return o;
}
