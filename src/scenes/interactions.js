// Scene interactions: one small action tied to the meaning of each scene.
// Each returns { update(dt), render(ctx), done, result, controls?, skip? }.
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { t, has } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { character, fig, BASE_U } from '../art/figures.js';
import { shape, line, plate, ellipsePts, rectPts, dots, hatch } from '../art/ink.js';
import * as M from '../art/motifs.js';
import { drawProp } from '../art/props.js';
import { showLine, hideLine, tickLine, lineTyping, finishTyping, choose } from '../ui/dom.js';
import { drawHand } from '../play/hud.js';
import { cue } from '../audio/audio.js';
import heads from '../data/heads.json';
import { nameOf } from './runner.js';
import { createKohbar } from '../trials/kohbar.js';
import { SYMBOLS } from '../play/astra.js';

const held = () => input.pointer.down || input.held.action || input.held.jump || input.held.right || input.drawHeld();
const tapped = () => input.pointer.justDown || input.consume('confirm') || input.consume('action') || input.consume('jump');
const near = (p, x, y, r) => Math.hypot(p.x - x, p.y - y) <= r;

function promptPlate(ctx, key, o = {}) { if (key) plate(ctx, t(key), app.W / 2, o.y ?? 92, { size: 22, seed: 2, gap: PAL.indigo }); }

/** A short line that shows in the dialogue box; tap to dismiss. */
function lineQueue() {
  const q = [];
  let cur = null;
  return {
    push(who, k) { q.push({ who, k }); },
    get busy() { return !!cur || q.length > 0; },
    update(dt, tap) {
      if (!cur && q.length) { cur = q.shift(); showLine(cur.who ? nameOf(cur.who) : '', t(cur.k)); return true; }
      if (!cur) return false;
      tickLine(dt, 50);
      if (tap) { if (lineTyping()) finishTyping(); else { cur = null; hideLine(); } }
      return true;
    },
  };
}

function meter(ctx, k, x, y, w, o = {}) {
  shape(ctx, rectPts(x - w / 2, y, w, 16), { mode: 'colour', fill: PAL.paper, w: 1.4, seed: 3 });
  ctx.fillStyle = o.color || PAL.indigo; ctx.fillRect(x - w / 2 + 3, y + 3, (w - 6) * Math.max(0, Math.min(1, k)), 10);
  if (o.lotus) for (let i = 0; i <= 4; i++) M.lotusBud(ctx, x - w / 2 + (w * i) / 4, y - 2, 8, { wilt: k >= i / 4 ? 0 : 1, seed: i });
}

// ---------------------------------------------------------------- hold
function hold(b, r) {
  const o = { done: false, p: 0, lines: (b.lines || []).map((l) => ({ ...l, shown: false })), lq: lineQueue(), stir: 0, stirT: 2.5, wrong: 0, t: 0 };
  const actor = b.actor && r.actors.get(b.actor);
  const s0 = actor ? actor.scale : 1;
  const prop = b.prop && r.props.get(b.prop);
  const px0 = prop ? prop.x : 0;
  let lamps = b.fx === 'lamps' ? [...r.props.entries()].filter(([id]) => id.startsWith('lamp')).map(([, p]) => p) : [];
  if (b.fx === 'lamps' && !lamps.length) { const n = b.count || 7; lamps = Array.from({ length: n }, (_, i) => ({ own: true, x: (b.lampX ?? 640) + (n === 1 ? 0 : (i - (n - 1) / 2) * 70), y: GROUND - 4, state: 1 })); }
  if (actor && b.fx === 'colourUp') actor.colourUp = 0;
  const py0 = prop ? prop.y : 0;
  if (b.cue) cue(b.cue);
  o.update = (dt) => {
    o.t += dt;
    const tap = input.pointer.justDown || input.consume('confirm');
    if (o.lq.update(dt, tap)) return;
    const h = held();
    if (b.fx === 'drive') {
      o.stirT -= dt;
      if (o.stirT <= 0 && o.stir <= 0) { o.stir = 1.4; o.stirWho = Math.floor(o.t * 7) % 3; cue('hiss'); }
      if (o.stir > 0) { o.stir -= dt; if (h) { o.wrong += dt; o.p = Math.max(0, o.p - dt * 0.12); if (o.wrong > 0.3) { o.wrong = 0; o.lq.push('', 'ch9.stir'); o.stir = 0; o.stirT = 2.8; } } if (o.stir <= 0) o.stirT = 2.2 + ((o.t * 13) % 2); }
    }
    if (h) o.p = Math.min(1, o.p + dt / (b.dur || 4));
    else if (b.decay) o.p = Math.max(0, o.p - dt * b.decay);
    if (actor && b.fx === 'grow') actor.scale = s0 + (b.to - s0) * o.p;
    if (prop && b.fx === 'drive') { prop.x = px0 + (b.x - px0) * o.p; prop.moving = h; }
    if (prop && b.fx === 'lift') prop.y = py0 - o.p * (b.lift || 200);
    if (actor && b.fx === 'lift') actor.y = GROUND - o.p * (b.lift || 120);
    if (actor && b.fx === 'colourUp') actor.colourUp = o.p;
    lamps.forEach((l, i) => { l.state = o.p > (i + 1) / (lamps.length + 0.5) ? 0 : 1; });
    for (const l of o.lines) if (!l.shown && o.p >= l.at) { l.shown = true; o.lq.push(l.who, l.k); }
    if (o.p >= 1 && !o.lq.busy) { if (b.fx === 'grow' && actor) actor.scale = b.to; if (actor && b.fx === 'colourUp') { actor.colourUp = null; actor.mode = null; actor.alpha = 1; if (actor.spec.ghost) actor.spec = character(actor.char, 'freed'); } o.done = true; }
  };
  o.render = (ctx) => {
    const W = app.W;
    if (b.fx === 'listen') {
      // Manthara's words coil across the screen, covering the bright colours
      ctx.save(); ctx.globalAlpha = Math.min(0.92, o.p * 1.1);
      const cx = W * 0.38, cy = 320; ctx.strokeStyle = PAL.brown; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); for (let a = 0; a < o.p * 40; a += 0.08) { const rr = 12 + a * 15; const x = cx + Math.cos(a + o.t) * rr, y = cy + Math.sin(a + o.t) * rr * 0.62; if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      ctx.font = 'italic 20px "Alegreya Sans", sans-serif'; ctx.fillStyle = PAL.black;
      const words = t('ch8.coil').split(' ');
      for (let i = 0; i < words.length * o.p * 3; i++) { const a = i * 0.55 + o.t * 0.3; const rr = 40 + i * 13; ctx.fillText(words[i % words.length], cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.62); }
      ctx.restore();
    }
    if (b.fx === 'seasons') { ctx.save(); ctx.globalAlpha = 0.6; M.waves(ctx, 0, W, 60, GROUND - 40, { t: o.t, gap: 26, speed: 40, colour: true }); ctx.restore(); const months = ['ch25.m1', 'ch25.m2', 'ch25.m3', 'ch25.m4']; plate(ctx, t(months[Math.min(3, Math.floor(o.p * 4))]), W / 2, 160, { size: 22, italic: true }); }
    if (b.fx === 'drive' && o.stir > 0) { const xs = [0.35, 0.55, 0.75]; M.nainaJogin(ctx, W * xs[o.stirWho], GROUND - 150, 22, 1, 1); M.star(ctx, W * xs[o.stirWho], GROUND - 210, 12, { fill: PAL.turmeric, gap: PAL.black }); }
    if (b.fx === 'endure') { const k = o.p; ctx.save(); ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = PAL.night; ctx.fillRect(0, 0, W, 720); ctx.restore(); M.moon(ctx, W * (0.2 + k * 0.6), 120 + Math.sin(k * 3.14) * -40, 24, { night: true }); }
    for (const l of lamps) if (l.own) M.diya(ctx, l.x - r.camX, l.y, 13, l.state !== 0, o.t, { colour: true });
    if (!b.hideMeter) meter(ctx, o.p, W / 2, 128, 300, { lotus: true, color: b.fx === 'endure' ? PAL.night : PAL.indigo });
    promptPlate(ctx, b.k);
    if (app.isTouch && o.p < 0.15 && !o.lq.busy) drawHand(ctx, W / 2, 420, o.t);
  };
  o.skip = () => { o.p = 1; if (actor && b.fx === 'colourUp') { actor.colourUp = null; actor.mode = null; actor.alpha = 1; if (actor.spec.ghost) actor.spec = character(actor.char, 'freed'); } if (actor && b.fx === 'grow') actor.scale = b.to; if (prop && b.fx === 'drive') prop.x = b.x; lamps.forEach((l) => { l.state = 0; }); o.done = true; hideLine(); };
  return o;
}

// ---------------------------------------------------------------- tap targets
function tap(b, r) {
  const o = { done: false, t: 0, lq: lineQueue(), focus: 0, anim: [] };
  const targets = b.targets.map((q, i) => ({ ...q, i, hit: false }));
  const pos = (q) => {
    if (q.actor) { const a = r.actors.get(q.actor); if (a) return { x: a.x - r.camX + (q.dx || 0), y: (q.y ?? a.y - BASE_U * a.spec.build.height * 0.6) }; }
    if (q.prop) { const p = r.props.get(q.prop); if (p) return { x: p.x - r.camX + (q.dx || 0), y: q.y ?? p.y - 60 }; }
    return { x: q.x - r.camX, y: q.y };
  };
  const active = () => targets.filter((q) => !q.hit && (!b.ordered || q.i === targets.findIndex((z) => !z.hit)));
  const fire = (q) => {
    q.hit = true; cue(q.cue || 'chime'); bus.emit('ui:tap');
    const a = q.actor && r.actors.get(q.actor), p = q.prop && r.props.get(q.prop);
    const fx = q.fx || '';
    if (fx === 'colourUp' && a) { a.colourUp = 0; o.anim.push({ kind: 'colourUp', a, t: 0 }); }
    else if (fx === 'colour') { if (a) a.mode = null; if (p) p.colour = true; }
    else if (fx === 'fling' && p) o.anim.push({ kind: 'fling', p, t: 0, x0: p.x, y0: p.y });
    else if (fx === 'topple' && p) o.anim.push({ kind: 'topple', p, t: 0 });
    else if (fx === 'light' && p) p.state = 1;
    else if (fx === 'hide' && p) r.props.delete(q.prop);
    else if (fx.startsWith('pose:') && a) a.pose = fx.slice(5);
    else if (fx === 'remove' && a) r.actors.delete(q.actor);
    if (q.then) r.runThen(q.then);
    o.anim.push({ kind: 'burst', x: pos(q).x, y: pos(q).y, t: 0 });
    if (q.k) o.lq.push(q.who || '', q.k);
  };
  o.update = (dt) => {
    o.t += dt;
    for (const an of o.anim) {
      an.t += dt;
      if (an.kind === 'colourUp') { an.a.colourUp = Math.min(1, an.t / 2.2); if (an.t > 2.2) { an.a.colourUp = null; an.a.mode = null; an.a.alpha = 1; if (an.a.spec.ghost) { an.a.spec = character(an.a.char, 'freed'); } } }
      if (an.kind === 'fling') { const k = Math.min(1, an.t / 1.4); an.p.x = an.x0 + k * 1400; an.p.y = an.y0 - Math.sin(k * Math.PI) * 420; }
      if (an.kind === 'topple') { an.p.rot = Math.min(1.4, an.t * 2); an.p.y = GROUND + Math.min(1, an.t) * 20; }
    }
    o.anim = o.anim.filter((an) => an.kind === 'burst' ? an.t < 0.5 : an.t < 2.4);
    const tp = input.pointer.justDown;
    if (o.lq.update(dt, tp || input.consume('confirm'))) return;
    const act = active();
    if (!act.length) { if (!o.anim.some((an) => an.kind !== 'burst')) o.done = true; return; }
    if (tp) { for (const q of act) { const p = pos(q); if (near(input.pointer, p.x, p.y, q.r || 60)) { fire(q); return; } } }
    if (input.consume('right') || input.consume('down')) o.focus = (o.focus + 1) % act.length;
    if (input.consume('left') || input.consume('up')) o.focus = (o.focus + act.length - 1) % act.length;
    if (input.consume('action') || input.consume('jump')) fire(act[Math.min(o.focus, act.length - 1)]);
  };
  o.render = (ctx) => {
    const act = active();
    act.forEach((q) => { const p = pos(q); tapIcon(ctx, q.icon, p.x, p.y, o.t); if (q.lab) plate(ctx, t(q.lab), p.x, p.y + (q.r || 60) * 0.75 + 18, { size: 16, seed: 2 }); });
    act.forEach((q, i) => { const p = pos(q); M.usableRing(ctx, p.x, p.y, (q.r || 60) * 0.75, o.t + i); if (i === Math.min(o.focus, act.length - 1) && input.device !== 'touch' && input.device !== 'mouse') { ctx.strokeStyle = PAL.indigo; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, (q.r || 60) * 0.9, 0, 7); ctx.stroke(); } });
    for (const an of o.anim) if (an.kind === 'burst') dots(ctx, an.x, an.y, 10 + an.t * 80, 12, PAL.turmeric, 4, 3.5 * (1 - an.t));
    if (!o.lq.busy) promptPlate(ctx, b.k);
    if (app.isTouch && o.t < 3 && act.length && !o.lq.busy) { const p = pos(act[0]); drawHand(ctx, p.x + 10, p.y + 70, o.t); }
  };
  o.skip = () => { for (const q of targets) if (!q.hit) { q.hit = true; const a = q.actor && r.actors.get(q.actor); if (q.fx === 'colourUp' && a) { a.colourUp = null; a.mode = null; if (a.spec.ghost) a.spec = character(a.char, 'freed'); } if (q.then) r.runThen(q.then); } hideLine(); o.done = true; };
  return o;
}

/** The small painted sign on a tap target, one per kind of thing to tap. */
function tapIcon(ctx, icon, x, y, t) {
  if (icon === 'ornament') shape(ctx, ellipsePts(x, y, 10, 10, 8), { mode: 'colour', fill: PAL.gold, gap: PAL.madder, w: 1.4, smooth: true });
  else if (icon === 'flower') dots(ctx, x, y, 7, 6, PAL.pink, 3, 3.2);
  else if (icon === 'herb') { line(ctx, [[x, y + 12], [x, y - 8]], { w: 2, color: PAL.leaf }); dots(ctx, x, y - 10, 6, 5, PAL.turmeric, 2, 2.6); }
  else if (icon === 'honey') { shape(ctx, ellipsePts(x, y, 11, 13, 10), { mode: 'colour', fill: PAL.turmeric, gap: PAL.brown, w: 1.4, smooth: true }); dots(ctx, x, y + 16 + (t % 1) * 6, 0, 1, PAL.gold, 1, 3); }
  else if (icon === 'tree') M.tree(ctx, x, y + 14, 34, 'mango', { colour: true, seed: 3 });
  else if (icon === 'pavilion') { M.pillar(ctx, x - 12, y + 14, 6, 30, { colour: true }); M.pillar(ctx, x + 12, y + 14, 6, 30, { colour: true }); shape(ctx, [[x - 18, y - 16], [x, y - 26], [x + 18, y - 16]], { mode: 'colour', fill: PAL.madder, w: 1.2 }); }
  else if (icon === 'place') M.lotusBud(ctx, x, y + 10, 12, { colour: true, seed: 2 });
}

// ---------------------------------------------------------------- give: drag ornaments to waiting hands
function give(b, r) {
  const o = { done: false, t: 0, drag: null, lq: lineQueue() };
  const lines = (b.lines || []).slice(); // said one at a time as each giver empties their hands
  const items = [];
  for (const g of b.from) {
    const a = r.actors.get(g.actor);
    for (let i = 0; i < g.n; i++) items.push({ actor: g.actor, kind: ['necklace', 'bangle', 'earring', 'crown'][i % 4], given: false, ox: (i - (g.n - 1) / 2) * 34, a });
  }
  // hands are placed in world units like the actors, so they line up on any screen width
  const hands = b.hands.map((x, i) => ({ x: x - r.camX, y: b.handY || 560, i, got: 0 }));
  const home = (it) => ({ x: it.a.x - r.camX + it.ox, y: it.a.y - BASE_U * it.a.spec.build.height * 0.72 });
  const drop = (it) => {
    it.given = true; cue('coin');
    const left = items.filter((x) => x.actor === it.actor && !x.given).length;
    if (left === 0) { const a = r.actors.get(it.actor); a.stage = 'exile'; a.spec = character(a.char, 'exile'); cue('chime'); if (lines.length) o.lq.push('', lines.shift()); }
  };
  o.update = (dt) => {
    o.t += dt;
    const p = input.pointer;
    if (o.lq.update(dt, p.justDown || input.consume('confirm'))) return;
    if (items.every((x) => x.given)) { if (lines.length) { o.lq.push('', lines.shift()); return; } o.done = true; return; }
    if (p.justDown && !o.drag) for (const it of items) if (!it.given) { const h = home(it); if (near(p, h.x, h.y, 44)) { o.drag = it; break; } }
    if (o.drag && p.justUp) {
      const hand = hands.find((h) => near(p, h.x, h.y, 90));
      if (hand) { hand.got++; drop(o.drag); }
      o.drag = null;
    }
    if (input.consume('action') || input.consume('confirm') || input.consume('jump')) { const it = items.find((x) => !x.given); if (it) { hands[items.indexOf(it) % hands.length].got++; drop(it); } }
  };
  const drawItem = (ctx, kind, x, y) => {
    if (kind === 'necklace') { line(ctx, ellipsePts(x, y - 6, 14, 12, 10, 0, Math.PI), { w: 4, color: PAL.black, smooth: true }); line(ctx, ellipsePts(x, y - 6, 14, 12, 10, 0, Math.PI), { w: 2, color: PAL.gold, smooth: true, flat: true }); dots(ctx, x, y + 6, 0, 1, PAL.madder, 1, 4); }
    else if (kind === 'bangle') shape(ctx, ellipsePts(x, y, 12, 12, 10), { mode: 'colour', fill: PAL.gold, gap: PAL.madder, w: 1.6, smooth: true });
    else if (kind === 'earring') { shape(ctx, ellipsePts(x, y, 8, 10, 8), { mode: 'colour', fill: PAL.gold, w: 1.4, smooth: true }); dots(ctx, x, y + 12, 0, 1, PAL.white, 1, 3); }
    else shape(ctx, [[x - 14, y + 8], [x - 16, y - 6], [x - 6, y], [x, y - 12], [x + 6, y], [x + 16, y - 6], [x + 14, y + 8]], { mode: 'colour', fill: PAL.gold, w: 1.4 });
  };
  o.render = (ctx) => {
    for (const h of hands) { shape(ctx, [[h.x - 22, h.y], [h.x - 26, h.y - 16], [h.x + 26, h.y - 16], [h.x + 22, h.y]], { mode: 'colour', fill: PAL.skin, w: 1.6, seed: h.i }); if (h.got) drawItem(ctx, 'bangle', h.x, h.y - 26); M.usableRing(ctx, h.x, h.y - 10, 40, o.t + h.i); }
    for (const it of items) if (!it.given && it !== o.drag) { const hm = home(it); drawItem(ctx, it.kind, hm.x, hm.y); }
    if (o.drag) drawItem(ctx, o.drag.kind, input.pointer.x, input.pointer.y);
    if (!o.lq.busy) promptPlate(ctx, b.k);
    if (app.isTouch && o.t < 4 && items.length && !items[0].given) { const h = home(items[0]); drawHand(ctx, h.x + (hands[0].x - h.x) * ((o.t % 2) / 2), h.y + 40 + (hands[0].y - h.y) * ((o.t % 2) / 2), o.t); }
  };
  o.skip = () => { for (const it of items) if (!it.given) { it.given = true; } for (const a of new Set(items.map((x) => x.actor))) { const ac = r.actors.get(a); if (ac) { ac.stage = 'exile'; ac.spec = character(ac.char, 'exile'); } } hideLine(); o.done = true; };
  return o;
}

// ---------------------------------------------------------------- trace: the Lakshmana Rekha
function trace(b, r) {
  const o = { done: false, t: 0, breaks: 0, idx: 0, drawing: false, flare: 0 };
  const cx = (b.cx ?? 640) - r.camX, cy = b.cy ?? 600, rx = b.rx ?? 300, ry = b.ry ?? 60;
  const guide = [];
  const n = 40;
  // a named aripan symbol (the sun disc for the fire astra) is traced from its own shape;
  // otherwise the line is an ellipse round the hut, starting in front
  const sym = b.symbol && SYMBOLS[b.symbol];
  if (sym) for (let i = 0; i <= n; i++) { const q = sym.pts[Math.round((i / n) * (sym.pts.length - 1))]; guide.push([cx + q[0] * rx, cy + q[1] * ry]); }
  else for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI * 2; guide.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  const corners = [0, 10, 20, 30].map((i) => guide[i]);
  o.update = (dt) => {
    o.t += dt;
    const p = input.pointer;
    if (p.justDown) { if (o.idx > 0 && !o.drawing) o.breaks++; o.drawing = true; }
    if (p.justUp && o.drawing && o.idx < guide.length) o.drawing = false;
    const auto = input.held.action || input.held.jump || input.held.right;
    if (auto) o.idx = Math.min(guide.length, o.idx + dt * 14);
    if (o.drawing && p.down) {
      // accept points in order; a small reach so the line can be traced with a thumb
      for (let k = 0; k < 3; k++) { const g = guide[Math.floor(o.idx)]; if (g && near(p, g[0], g[1], 46)) o.idx = Math.floor(o.idx) + 1; }
    }
    if (o.idx >= guide.length) { o.done = true; o.result = { clean: o.breaks === 0 }; if (o.breaks === 0) save.data.flags.rekhaClean = true; cue('chime'); }
  };
  o.render = (ctx) => {
    const k = Math.floor(o.idx);
    ctx.setLineDash([3, 14]); line(ctx, guide, { w: 4, color: PAL.black, amp: 0, flat: true }); ctx.setLineDash([]);
    if (k > 1) { const part = guide.slice(0, k); line(ctx, part, { w: 9, color: PAL.black, amp: 0.5, flat: true }); line(ctx, part, { w: 5.5, color: PAL.white, amp: 0.5, flat: true }); }
    if (b.symbol === 'sun') { for (let i = 0; i < 12; i++) { if (k < (i + 1) * (guide.length / 12)) break; const a = (i / 12) * Math.PI * 2; line(ctx, [[cx + Math.cos(a) * rx * 1.12, cy + Math.sin(a) * ry * 1.12], [cx + Math.cos(a) * rx * 1.35, cy + Math.sin(a) * ry * 1.35]], { w: 4, color: PAL.turmeric }); } }
    else corners.forEach((c, i) => { if (k > i * 10) M.lotus(ctx, c[0], c[1], 16, 1, { flat: true, fill: PAL.pink }); });
    const g = guide[Math.min(k, guide.length - 1)];
    if (o.idx < guide.length) M.usableRing(ctx, g[0], g[1], 26, o.t);
    promptPlate(ctx, b.k);
    if (app.isTouch && k < 2) drawHand(ctx, g[0] + 10, g[1] + 50, o.t);
  };
  o.skip = () => { o.idx = guide.length; o.done = true; };
  return o;
}

// ---------------------------------------------------------------- the great bow (Shiva's bow, Parashurama's bow, the fire astra)
function bow(b, r) {
  const phases = b.phases || ['pull'];
  const o = { done: false, t: 0, ph: 0, p: 0, drag0: null, crackT: -1 };
  const actor = r.actors.get(b.actor || 'rama');
  const prop = b.prop && r.props.get(b.prop);
  o.update = (dt) => {
    o.t += dt;
    if (o.crackT >= 0) { o.crackT += dt; if (o.crackT > 1.4) o.done = true; return; }
    const ph = phases[o.ph], h = held(), p = input.pointer;
    if (ph === 'lift') { if (h) o.p += dt / 2.2; if (prop) prop.lift = o.p; if (actor) actor.pose = h ? 'carry' : 'hold'; }
    else if (ph === 'bend') {
      if (p.down) { if (o.drag0 == null) o.drag0 = p.y; o.p = Math.max(o.p, Math.min(1, Math.abs(p.y - o.drag0) / 160)); }
      else o.drag0 = null;
      if (input.held.down || input.held.action || input.held.jump) o.p += dt / 1.6;
      if (actor) actor.pose = 'kneel';
    } else if (ph === 'pull') {
      if (h) { o.p = Math.min(1, o.p + dt / 1.6); if (actor) actor.pose = o.p < 0.3 ? 'draw0' : o.p < 0.7 ? 'draw1' : 'draw2'; }
      else if (o.p > 0) { if (o.p >= 1) { o.release = true; } else { o.p = 0; if (actor) actor.pose = 'stand'; } }
      if (o.release || (b.autoBreak && o.p >= 1)) {
        if (b.breaks) { o.crackT = 0; cue('thunder'); r.shakeT = 0.6; r.shakeA = save.data.settings.reducedMotion ? 2 : 10; if (prop) prop.state = 1; if (actor) actor.pose = 'stand'; return; }
        o.done = true; if (actor) actor.pose = b.endPose || 'shoot'; cue('fullDraw'); return;
      }
    }
    if (ph !== 'pull' && o.p >= 1) { o.ph++; o.p = 0; cue('chime'); if (prop && ph === 'lift') prop.lift = 1; }
  };
  o.render = (ctx) => {
    const ph = phases[o.ph];
    const key = b.keys ? b.keys[o.ph] : 'hint.' + ph;
    promptPlate(ctx, o.crackT >= 0 ? null : key);
    if (o.crackT < 0) meter(ctx, o.p, app.W / 2, 128, 260, { color: ph === 'pull' && o.p >= 1 ? PAL.turmeric : PAL.indigo });
    if (actor && ph === 'pull' && o.p > 0) { const x = actor.x - r.camX, y = actor.y - 96; ctx.lineWidth = 6; ctx.strokeStyle = PAL.black; ctx.beginPath(); ctx.arc(x, y, 96, -1.57, -1.57 + o.p * 6.283); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = o.p >= 1 ? PAL.turmeric : PAL.indigo; ctx.beginPath(); ctx.arc(x, y, 96, -1.57, -1.57 + o.p * 6.283); ctx.stroke(); }
    if (o.crackT >= 0) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - o.crackT); M.star(ctx, (prop ? prop.x - r.camX : app.W / 2), 300, 60 + o.crackT * 200, { fill: PAL.turmeric, gap: PAL.white, points: 12 }); ctx.restore(); }
    if (app.isTouch && o.p < 0.1) drawHand(ctx, app.W / 2, 420, o.t);
  };
  o.skip = () => { if (prop && b.breaks) prop.state = 1; if (actor) actor.pose = 'stand'; o.done = true; };
  return o;
}

// ---------------------------------------------------------------- walk an actor somewhere
function walk(b, r) {
  const o = { done: false, t: 0 };
  const a = r.actors.get(b.actor);
  o.update = (dt) => {
    o.t += dt;
    const h = held() || input.axis !== 0;
    if (h) { const d = b.x - a.x; a.facing = Math.sign(d) || a.facing; a.x += Math.sign(d) * Math.min(Math.abs(d), (b.speed || 110) * dt); a.walkT = (a.walkT || 0) + dt; a.pose = b.walkPose || ['walk0', 'walk1', 'walk2', 'walk3'][Math.floor(a.walkT * 5) % 4]; }
    else a.pose = b.idle || 'stand';
    if (Math.abs(a.x - b.x) < 2) { a.pose = b.end || 'stand'; o.done = true; }
  };
  o.render = (ctx) => { promptPlate(ctx, b.k); const x = b.x - r.camX; M.usableRing(ctx, x, GROUND - 20, 40, o.t); if (app.isTouch && o.t < 3) drawHand(ctx, app.W / 2, 420, o.t); };
  o.skip = () => { a.x = b.x; a.pose = b.end || 'stand'; o.done = true; };
  o.controls = null;
  return o;
}

// ---------------------------------------------------------------- the ten heads
export const HEAD_INDEX = { scholar: 0, devotee: 1, brother: 2, father: 3, honour: 4, fear: 5, anger: 6, desire: 7, pride: 8, king: 9 };

function tenHeads(b, r) {
  const o = { done: false, t: 0, i: -1, phase: 'speak', lq: lineQueue() };
  const rav = r.actors.get('ravana');
  const voices = b.voices || [];
  const mode = b.mode || 'choose';
  if (rav) rav.heads = { active: null, silent: {} };
  const counts = save.data.voiceCount || {};
  const most = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0] || 'pride';
  let silenceOrder = [];
  if (mode === 'silence') { silenceOrder = Object.keys(HEAD_INDEX).filter((v) => v !== most); if (b.silent) o.lq.push('', b.silent); }
  o.update = async (dt) => {
    o.t += dt;
    const tp = input.pointer.justDown || input.consume('confirm') || input.consume('action') || input.consume('jump');
    if (o.lq.update(dt, tp)) return;
    if (mode === 'silence') {
      if (o.phase === 'speak') {
        if (o.t > 1.1 && silenceOrder.length) { o.t = 0; const v = silenceOrder.shift(); rav.heads = { ...rav.heads, silent: { ...rav.heads.silent, [HEAD_INDEX[v]]: true }, active: HEAD_INDEX[most] }; cue('tink'); }
        if (!silenceOrder.length && o.t > 1.2) { o.phase = 'last'; o.lq.push('head.' + most, b.lines && b.lines[most] ? b.lines[most] : 'heads.last.' + most); }
      } else if (!o.lq.busy) o.done = true;
      return;
    }
    if (o.phase === 'speak') {
      o.i++;
      if (o.i < voices.length) { const v = voices[o.i]; rav.heads = { ...rav.heads, active: HEAD_INDEX[v] }; o.lq.push('head.' + v, b.lines && b.lines[v] ? b.lines[v] : `heads.${b.heads}.${v}`); cue('chime'); return; }
      o.phase = 'choose'; rav.heads = { ...rav.heads, active: null };
      const i = await choose(t('heads.ask'), voices.map((v) => ({ label: t('head.' + v) })), { grid: true });
      const v = voices[i];
      save.data.headsChosen[b.heads] = v;
      save.data.voiceCount = { ...(save.data.voiceCount || {}), [v]: ((save.data.voiceCount || {})[v] || 0) + 1 };
      if (v === 'pride') save.data.pride = Math.min(10, (save.data.pride || 0) + 1);
      else if (heads.find((h) => h.id === v)?.wise) save.data.pride = Math.max(0, (save.data.pride || 0) - 1);
      save.commit();
      rav.heads = { ...rav.heads, active: HEAD_INDEX[v], pride: save.data.pride };
      if (has(`heads.${b.heads}.${v}.then`)) o.lq.push('head.' + v, `heads.${b.heads}.${v}.then`);
      if (b.then) { const lab = b.then[v] || b.then['*']; if (lab) o.result = { gotoLabel: lab }; }
      o.phase = 'end';
      return;
    }
    if (o.phase === 'end' && !o.lq.busy) { rav.heads = { active: null, pride: save.data.pride }; o.done = true; }
  };
  o.render = (ctx) => { if (o.phase === 'speak' && mode === 'choose' && o.i < 0) promptPlate(ctx, 'heads.listen'); };
  o.skip = () => { if (mode === 'choose' && !save.data.headsChosen[b.heads]) save.data.headsChosen[b.heads] = voices[0]; hideLine(); if (rav) rav.heads = null; o.done = true; };
  return o;
}

// ---------------------------------------------------------------- rhythm rows (waking Kumbhakarna, building the bridge)
function rhythm(b, r) {
  const o = { done: false, t: 0, hits: 0, streak: 0, marks: [], next: 1.2, judge: null };
  const period = 60 / (b.bpm || 84);
  const need = b.need || 8;
  const lineX = 260, speed = 260;
  const kinds = b.kinds || ['drum', 'conch', 'drum', 'drumHigh'];
  const actor = b.actor && r.actors.get(b.actor);
  const prop = b.prop && r.props.get(b.prop);
  o.update = (dt) => {
    o.t += dt;
    if (o.t >= o.next) { o.marks.push({ at: o.next + (app.W - lineX) / speed, k: kinds[o.marks.length % kinds.length], hit: false }); o.next += period * (o.marks.length % 4 === 3 ? 2 : 1); }
    const tp = input.pointer.justDown || input.consume('action') || input.consume('jump') || input.consume('confirm');
    if (tp) {
      let best = null, bd = 1;
      for (const m of o.marks) if (!m.hit) { const d = Math.abs(m.at - o.t); if (d < bd) { bd = d; best = m; } }
      if (best && bd < 0.2) {
        best.hit = true; cue(best.k);
        const perfect = bd < (b.strict ? 0.09 : 0.12);
        o.judge = { text: t(perfect ? 'rhythm.perfect' : 'rhythm.good'), t: 0.5 };
        if (perfect || !b.strict) { o.hits++; o.streak++; } else o.streak = 0;
        if (actor && b.fx === 'wake') { actor.rot = Math.sin(o.hits) * 0.04; if (o.hits >= need * 0.5) actor.pose = 'sit'; }
        if (prop && b.fx === 'bridge') prop.state = Math.min(1, o.hits / need);
      } else { o.streak = 0; o.judge = { text: t('rhythm.miss'), t: 0.4 }; }
    }
    for (const m of o.marks) if (!m.hit && o.t - m.at > 0.25) { m.hit = true; m.missed = true; o.streak = 0; }
    o.marks = o.marks.filter((m) => o.t - m.at < 1);
    if (o.judge) { o.judge.t -= dt; if (o.judge.t <= 0) o.judge = null; }
    if (o.hits >= need) { o.done = true; if (actor && b.fx === 'wake') actor.pose = 'stand'; }
  };
  o.render = (ctx) => {
    const y = 210, W = app.W;
    shape(ctx, rectPts(80, y - 50, W - 160, 100), { mode: 'colour', fill: PAL.paper, gap: PAL.turmeric, w: 1.8, seed: 4 });
    // godna-style rows of marks
    for (let x = 100; x < W - 100; x += 18) line(ctx, [[x, y - 40], [x + 6, y - 32]], { w: 1, color: PAL.terracotta, amp: 0.3, flat: true });
    line(ctx, [[lineX, y - 46], [lineX, y + 46]], { w: 3, color: PAL.black, amp: 0.3 });
    M.lotus(ctx, lineX, y, 18, 1, { fill: PAL.pink });
    for (const m of o.marks) {
      const x = lineX + (m.at - o.t) * speed;
      if (x > W - 90 || x < 90 || m.hit && !m.missed) continue;
      if (m.k === 'conch') shape(ctx, [[x - 12, y + 6], [x, y - 14], [x + 14, y - 2], [x + 6, y + 12]], { mode: m.missed ? 'line' : 'colour', fill: PAL.white, w: 1.6, smooth: true });
      else shape(ctx, ellipsePts(x, y, m.k === 'drumHigh' ? 10 : 15, m.k === 'drumHigh' ? 10 : 15, 10), { mode: m.missed ? 'line' : 'colour', fill: m.k === 'drumHigh' ? PAL.turmeric : PAL.madder, gap: PAL.black, w: 1.6, smooth: true });
    }
    if (o.judge) plate(ctx, o.judge.text, lineX, y - 90, { size: 18 });
    meter(ctx, o.hits / need, W / 2, y + 66, 300, { lotus: true });
    promptPlate(ctx, b.k);
    if (app.isTouch && o.hits === 0) drawHand(ctx, W / 2, 440, o.t);
  };
  o.skip = () => { if (prop && b.fx === 'bridge') prop.state = 1; if (actor && b.fx === 'wake') actor.pose = 'stand'; o.done = true; };
  return o;
}

// ---------------------------------------------------------------- the seven sala trees
function sala(b, r) {
  const o = { done: false, t: 0, p: 0, shot: null, tries: 0 };
  const actor = r.actors.get('rama');
  const x0 = (b.x0 ?? 560), gap = b.gap ?? 84, aimY = GROUND - 150;
  const knots = (tt) => Array.from({ length: 7 }, (_, i) => aimY + Math.sin(tt * 1.1 + i * 0.9) * 46 * Math.abs(Math.sin(tt * 0.31)));
  o.update = (dt) => {
    o.t += dt;
    if (o.shot) {
      o.shot.t += dt;
      if (o.shot.ok) { if (o.shot.t > 2.6) { o.done = true; o.result = { tries: o.tries }; } }
      else if (o.shot.t > 1) o.shot = null;
      return;
    }
    if (held()) { o.p = Math.min(1, o.p + dt / 0.9); actor.pose = o.p < 0.3 ? 'draw0' : o.p < 0.8 ? 'draw1' : 'draw2'; }
    else if (o.p > 0) {
      const k = knots(o.t), dev = Math.max(...k.map((y) => Math.abs(y - aimY)));
      o.tries++;
      const ok = o.p >= 1 && dev < 16;
      o.shot = { t: 0, ok, full: o.p >= 1 }; o.p = 0; actor.pose = 'shoot';
      cue(ok ? 'shootFull' : 'shoot');
      if (ok) { cue('thunder'); r.shakeT = 0.4; r.shakeA = 5; }
    }
  };
  o.render = (ctx) => {
    const k = knots(o.t), cx = r.camX;
    k.forEach((y, i) => { const x = x0 + i * gap - cx; M.tree(ctx, x, GROUND + (y - aimY) * 0.4, 300, 'sala', { colour: true, seed: i + 3 }); shape(ctx, ellipsePts(x, y, 9, 9, 8), { mode: 'colour', fill: o.shot && o.shot.ok && o.shot.t > i * 0.08 ? PAL.cream : PAL.brown, gap: PAL.turmeric, w: 1.4, smooth: true }); });
    const ax = actor.x - cx + 40;
    if (o.p >= 1 || o.p > 0.2) { ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.black; for (let x = ax + 20; x < x0 + gap * 7 - cx; x += 24) { ctx.beginPath(); ctx.arc(x, aimY, 3.5, 0, 7); ctx.fill(); ctx.stroke(); } }
    if (o.shot) {
      const reach = o.shot.ok ? (x0 + gap * 7 + 500 - cx) : (x0 - cx);
      const x = ax + Math.min(1, o.shot.t / (o.shot.ok ? 1.2 : 0.3)) * (reach - ax);
      const back = o.shot.ok && o.shot.t > 1.4 ? (o.shot.t - 1.4) / 1.0 : 0;
      const xx = back ? reach + (ax - reach) * Math.min(1, back) : x;
      line(ctx, [[xx - 50, aimY], [xx, aimY]], { w: 6, color: PAL.black, flat: true }); line(ctx, [[xx - 48, aimY], [xx - 4, aimY]], { w: 3, color: PAL.turmeric, flat: true });
    }
    meter(ctx, o.p, app.W / 2, 128, 260, { color: o.p >= 1 ? PAL.turmeric : PAL.indigo });
    promptPlate(ctx, o.tries > 1 && !o.shot ? 'ch23.hint2' : b.k);
    if (app.isTouch && o.tries === 0 && o.p === 0) drawHand(ctx, app.W / 2, 420, o.t);
  };
  o.skip = () => { o.done = true; };
  return o;
}

// ---------------------------------------------------------------- Shabari's berries
function berries(b, r) {
  const o = { done: false, t: 0, sel: null, onPlate: 0, lq: lineQueue() };
  const sweet = [1, 0, 1, 1, 0, 1, 0, 1];
  const list = sweet.map((s, i) => ({ s, i, x: 400 - r.camX + (i % 4) * 60, y: 600 + Math.floor(i / 4) * 50, state: 'basket' }));
  const plateZ = { x: (b.plateX ?? 900) - r.camX, y: 610 }, asideZ = { x: (b.asideX ?? 260) - r.camX, y: 640 };
  const shabari = r.actors.get('shabari');
  // where each berry is drawn right now (the aside pile is laid out in list order)
  const berryPos = (b0) => { if (b0.state !== 'aside') return { x: b0.x, y: b0.y }; const k = list.filter((x) => x.state === 'aside').indexOf(b0); return { x: asideZ.x - 30 + k * 18, y: asideZ.y - 4 }; };
  o.update = (dt) => {
    o.t += dt;
    const p = input.pointer, tp = p.justDown || input.consume('confirm') || input.consume('action');
    if (o.lq.update(dt, tp)) return;
    if (!tp) return;
    const kb = !p.justDown;
    if (o.sel) {
      const toPlate = kb ? o.sel.s === 1 : near(p, plateZ.x, plateZ.y, 80), toAside = kb ? o.sel.s === 0 : near(p, asideZ.x, asideZ.y, 80);
      if (toPlate) { if (o.sel.s) { o.sel.state = 'plate'; o.onPlate++; cue('coin'); } else { o.lq.push('shabari', 'ch21.sourNo'); o.sel.state = 'basket'; } o.sel = null; }
      else if (toAside) { o.sel.state = 'aside'; cue('tink'); o.sel = null; }
      if (o.onPlate >= 5) o.done = true;
      return;
    }
    // a berry set aside can be picked up again, so a sweet one put there by mistake is not lost
    const pickable = (x) => x.state === 'basket' || x.state === 'aside';
    const pick = kb ? list.find((x) => x.state === 'basket') || list.find((x) => x.state === 'aside' && x.s) : list.find((x) => pickable(x) && near(p, berryPos(x).x, berryPos(x).y, 30));
    if (pick) { pick.state = 'tasted'; o.sel = pick; if (shabari) shabari.pose = 'give'; cue('chime'); o.lq.push('shabari', pick.s ? 'ch21.sweet' : 'ch21.sour'); }
    if (o.onPlate >= 5) o.done = true;
  };
  o.render = (ctx) => {
    const bx0 = 400 - r.camX - 120; shape(ctx, [[bx0, 620], [bx0 + 280, 620], [bx0 + 250, 690], [bx0 + 30, 690]], { mode: 'colour', fill: PAL.ochre, gap: PAL.brown, w: 1.8 });
    shape(ctx, ellipsePts(plateZ.x, plateZ.y, 80, 26, 12), { mode: 'colour', fill: PAL.leaf, w: 1.8, smooth: true }); M.usableRing(ctx, plateZ.x, plateZ.y, 90, o.t);
    plate(ctx, t('ch21.forRama'), plateZ.x, plateZ.y + 52, { size: 15 });
    shape(ctx, ellipsePts(asideZ.x, asideZ.y, 50, 18, 10), { mode: 'line', w: 1.4, smooth: true }); plate(ctx, t('ch21.aside'), asideZ.x, asideZ.y + 40, { size: 15 });
    let pi = 0, ai = 0;
    for (const x of list) {
      let px = x.x, py = x.y;
      if (x.state === 'tasted') { px = 640 - r.camX; py = 520; }
      if (x.state === 'plate') { px = plateZ.x - 50 + (pi++) * 24; py = plateZ.y - 4; }
      if (x.state === 'aside') { px = asideZ.x - 30 + (ai++) * 18; py = asideZ.y - 4; }
      shape(ctx, ellipsePts(px, py, 13, 13, 10), { mode: 'colour', fill: x.state === 'tasted' || x.state !== 'basket' ? (x.s ? PAL.madder : PAL.leaf) : PAL.madder, gap: x.state === 'tasted' ? (x.s ? PAL.turmeric : PAL.grey) : null, w: 1.5, smooth: true, seed: x.i });
      if (x.state === 'basket' || (x.state === 'aside' && !o.sel)) M.usableRing(ctx, px, py, x.state === 'aside' ? 14 : 20, o.t + x.i);
    }
    if (!o.lq.busy) promptPlate(ctx, o.sel ? 'ch21.where' : b.k);
  };
  o.skip = () => { o.done = true; };
  return o;
}

// ---------------------------------------------------------------- Sita's resolve
function resolve(b, r) {
  const o = { done: false, t: 0, meter: 0.7, threat: null, ti: 0, emptied: false, lq: lineQueue() };
  const threats = b.threats || ['ch28.t1', 'ch28.t2', 'ch28.t3', 'ch28.t4', 'ch28.t5'];
  o.update = (dt) => {
    o.t += dt;
    const tp = input.pointer.justDown && !o.threat;
    if (o.lq.update(dt, tp || input.consume('confirm'))) return;
    const h = held();
    if (!o.threat) {
      o.meter = Math.min(1, o.meter + dt * 0.05);
      if (o.t > 1.5) { if (o.ti >= threats.length) { o.done = true; o.result = { gentle: !o.emptied }; return; } o.threat = { k: threats[o.ti++], t: 0, dur: 2.6 }; o.t = 0; showLine(nameOf(b.who || 'ravana'), t(o.threat.k)); cue('starLow'); }
    } else {
      tickLine(dt, 60);
      o.threat.t += dt;
      o.meter += (h ? 0.22 : -0.34) * dt;
      // when resolve runs out the threat ends there, so Sita's line can be tapped away
      if (o.meter <= 0) { o.meter = 0.25; o.emptied = true; o.threat = null; o.t = 0; hideLine(); o.lq.push('sita', 'ch28.remember'); return; }
      if (o.threat.t >= o.threat.dur) { o.threat = null; o.t = 0; hideLine(); }
    }
    o.meter = Math.max(0, Math.min(1, o.meter));
  };
  o.render = (ctx) => {
    const W = app.W;
    if (o.threat) { const k = o.threat.t / o.threat.dur; ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = PAL.terracotta; ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(W * 0.3, 400, 260 - k * 120 - i * 30, -1, 1); ctx.stroke(); } ctx.restore(); }
    // the resolve meter is a row of lotuses that bloom
    for (let i = 0; i < 8; i++) M.lotusBud(ctx, W / 2 - 140 + i * 40, 150, 14, { wilt: o.meter > (i + 0.5) / 8 ? 0 : 1, seed: i });
    plate(ctx, t('ch28.resolve'), W / 2, 112, { size: 17 });
    promptPlate(ctx, o.threat ? 'ch28.hold' : null, { y: 200 });
    if (app.isTouch && o.threat && o.ti === 1) drawHand(ctx, W / 2, 420, o.t);
  };
  o.skip = () => { hideLine(); o.done = true; };
  return o;
}

// ---------------------------------------------------------------- lighting Ayodhya
function lamps(b, r) {
  const o = { done: false, t: 0, gust: null, gustT: 3, dur: b.dur || 45, late: false };
  const L = [];
  const n = b.n || 14;
  for (let i = 0; i < n; i++) L.push({ x: 110 + (i % 7) * ((app.W - 220) / 6), y: i < 7 ? 640 : 470, lit: false, i });
  o.update = (dt) => {
    o.t += dt;
    o.gustT -= dt;
    if (!o.gust && o.gustT <= 0) { o.gust = { side: Math.floor(o.t * 3) % 2 ? 1 : -1, t: 0 }; cue('gust'); }
    if (o.gust) { o.gust.t += dt; if (o.gust.t > 1.2 && !o.gust.blown) { o.gust.blown = true; const lit = L.filter((l) => l.lit && (o.gust.side > 0 ? l.x > app.W / 2 : l.x < app.W / 2)); lit.slice(0, 2).forEach((l) => { l.lit = false; }); } if (o.gust.t > 1.8) { o.gust = null; o.gustT = 3 + (o.t % 2); } }
    const p = input.pointer;
    if (p.justDown) for (const l of L) if (!l.lit && near(p, l.x, l.y - 10, 44)) { l.lit = true; cue('coin'); break; }
    if (input.consume('action') || input.consume('confirm') || input.consume('jump')) { const l = L.find((x) => !x.lit); if (l) { l.lit = true; cue('coin'); } }
    if (L.every((l) => l.lit)) { o.done = true; o.result = { fast: !o.late }; o.seals = { finish: true, gentle: true, fast: !o.late }; }
    if (o.t > o.dur && !o.late) { o.late = true; o.dur += 20; }
  };
  o.render = (ctx) => {
    const W = app.W, k = Math.min(1, o.t / o.dur);
    drawProp(ctx, 'pushpaka', W * 0.5 + Math.sin(o.t * 0.4) * W * 0.3, 60 + k * 230, { t: o.t, scale: 0.55 });
    for (const l of L) { M.diya(ctx, l.x, l.y, 14, l.lit, o.t + l.i); if (!l.lit) M.usableRing(ctx, l.x, l.y - 8, 30, o.t + l.i); }
    if (o.gust) { const x0 = o.gust.side > 0 ? W - 40 : 40; ctx.save(); ctx.globalAlpha = Math.min(1, o.gust.t); for (let i = 0; i < 4; i++) { const y = 380 + i * 70; line(ctx, [[x0, y], [x0 - o.gust.side * 120 * Math.min(1, o.gust.t), y - 10], [x0 - o.gust.side * 220 * Math.min(1, o.gust.t), y + 6]], { w: 3, color: PAL.storm, smooth: true }); } ctx.restore(); }
    promptPlate(ctx, b.k);
    plate(ctx, `${L.filter((l) => l.lit).length} / ${L.length}`, W - 120, 150, { size: 18 });
  };
  o.skip = () => { o.done = true; };
  return o;
}

// ---------------------------------------------------------------- charge: hold until full, then release
function charge(b, r) {
  const o = { done: false, t: 0, p: 0 };
  const a = b.actor && r.actors.get(b.actor);
  const poses = b.poses || ['crouch', 'crouch', 'crouch'];
  o.update = (dt) => {
    o.t += dt;
    if (held()) { o.p = Math.min(1, o.p + dt / (b.dur || 1.2)); if (a) a.pose = poses[Math.min(poses.length - 1, Math.floor(o.p * poses.length))]; }
    else if (o.p > 0) {
      if (o.p >= 1) { if (a && b.endPose) a.pose = b.endPose; if (b.cue) cue(b.cue); if (b.shake) { r.shakeT = 0.4; r.shakeA = save.data.settings.reducedMotion ? 2 : b.shake; } o.done = true; }
      else { o.p = 0; if (a) a.pose = 'stand'; }
    }
  };
  o.render = (ctx) => {
    promptPlate(ctx, b.k);
    meter(ctx, o.p, app.W / 2, 128, 260, { color: o.p >= 1 ? PAL.turmeric : PAL.indigo });
    if (a && o.p > 0) { const x = a.x - r.camX, y = a.y - 96; ctx.lineWidth = 6; ctx.strokeStyle = PAL.black; ctx.beginPath(); ctx.arc(x, y, 96, -1.57, -1.57 + o.p * 6.283); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = o.p >= 1 ? PAL.turmeric : PAL.indigo; ctx.beginPath(); ctx.arc(x, y, 96, -1.57, -1.57 + o.p * 6.283); ctx.stroke(); }
    if (app.isTouch && o.p === 0) drawHand(ctx, app.W / 2, 420, o.t);
  };
  o.skip = () => { if (a && b.endPose) a.pose = b.endPose; o.done = true; };
  return o;
}

// ---------------------------------------------------------------- mash: tap again and again (sometimes it is futile)
function mash(b, r) {
  const o = { done: false, t: 0, n: 0, wob: 0 };
  const a = b.actor && r.actors.get(b.actor);
  const stop = b.futile || b.need || 10;
  o.update = (dt) => {
    o.t += dt; o.wob = Math.max(0, o.wob - dt * 4);
    if (input.pointer.justDown || input.consume('action') || input.consume('jump') || input.consume('confirm')) { o.n++; o.wob = 1; cue('thud'); if (a) a.pose = o.n % 2 ? 'swing0' : 'swing1'; }
    if (a) a.rot = Math.sin(o.t * 40) * 0.03 * o.wob;
    if (o.n >= stop) { if (a) { a.rot = 0; a.pose = 'stand'; } o.done = true; }
  };
  o.render = (ctx) => { promptPlate(ctx, b.k); meter(ctx, Math.min(1, o.n / (b.need || stop)), app.W / 2, 128, 260); if (app.isTouch && o.n === 0) drawHand(ctx, app.W / 2, 420, o.t); };
  o.skip = () => { if (a) { a.rot = 0; a.pose = 'stand'; } o.done = true; };
  return o;
}

const KINDS = { charge, mash, hold, tap, give, trace, bow, walk, heads: tenHeads, rhythm, sala, berries, resolve, lamps, kohbar: (b, r) => createKohbar(b, r) };

export function createInteraction(kind, beat, runner) {
  const f = KINDS[kind];
  if (!f) throw new Error('Unknown interaction ' + kind);
  return f(beat, runner);
}
export const INTERACTION_KINDS = Object.keys(KINDS);
