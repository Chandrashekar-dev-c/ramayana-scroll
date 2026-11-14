// The hub: one long painted house wall in six tiers, one per kanda. Rama's path comes down
// from Ayodhya in colour; Ravana's path climbs out of Lanka in kachni line. Finishing a
// chapter paints its place.
import { app, setMode, makeCanvas } from '../core/app.js';
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { shape, line, plate, rectPts, ellipsePts, hatch, dots } from '../art/ink.js';
import { pattern } from '../art/patterns.js';
import * as M from '../art/motifs.js';
import { drawProp } from '../art/props.js';
import { character, fig } from '../art/figures.js';
import { drawFrame } from '../art/borders.js';
import marksData from '../data/marks.json';
import { PLACES, CHAPTERS, KANDAS, placeStates, isUnlocked, blocker, nextChapter, placeOf, chapterById, allSeals } from '../data/chapters.js';
import { panel, closePanel, panelOpen, button, el, topbar, touchControls, sealSvg, toast } from '../ui/dom.js';
import { setMood, cue } from '../audio/audio.js';
import { drawHand } from '../play/hud.js';
import { startChapter } from '../scenes/runner.js';
import { openTitle, openSettings, openGallery } from '../ui/screens.js';

export const WALL_W = 2400, TIER_H = 380, WALL_H = TIER_H * 6 + 60;
const tierY = (i) => 40 + i * TIER_H;
const MARKS = marksData;

/** Vignettes for places, drawn small at (x, base y). */
function vignette(ctx, p, x, y, colour, o = {}) {
  const c = { colour, seed: p.x | 0, lanka: p.lanka };
  switch (p.icon) {
    case 'city': M.building(ctx, x - 70, y, 110, 170, { ...c, tiers: 3, banner: true }); M.building(ctx, x + 60, y, 100, 120, { ...c, tiers: 2 }); M.tree(ctx, x + 140, y, 120, 'mango', c); break;
    case 'palace': M.pillar(ctx, x - 80, y, 26, 160, c); M.pillar(ctx, x + 80, y, 26, 160, c); drawProp(ctx, 'throne', x, y, { colour, scale: 0.6, lanka: p.lanka }); break;
    case 'river': shape(ctx, rectPts(x - 150, y - 34, 300, 34), { mode: colour ? 'colour' : 'line', fill: PAL.river, w: 1.4 }); M.waves(ctx, x - 140, x + 140, y - 26, y - 6, { colour: false, gap: 12 }); M.tree(ctx, x - 90, y - 34, 140, 'palm', c); M.tree(ctx, x + 100, y - 34, 120, 'mango', c); drawProp(ctx, 'boat', x, y - 18, { colour, scale: 0.45 }); break;
    case 'waste': M.tree(ctx, x - 80, y, 140, 'bare', c); M.rock(ctx, x + 60, y, 80, 50, c); if (colour) M.fillers(ctx, x - 140, x + 140, y - 160, y - 20, { colour: true, kinds: ['bird', 'flower'], seed: 4, density: 6 }); break;
    case 'ashram': M.hut(ctx, x - 40, y, 140, 120, c); M.tree(ctx, x + 90, y, 180, 'banyan', c); drawProp(ctx, 'altar', x + 10, y, { colour, scale: 0.5, state: colour ? 1 : 0, t: o.t || 0 }); break;
    case 'hermitage': M.hut(ctx, x, y, 140, 120, c); M.tree(ctx, x - 100, y, 160, 'ashoka', c); break;
    case 'mithila': M.building(ctx, x - 40, y, 140, 190, { ...c, tiers: 3, banner: true, fill: PAL.pink }); M.tree(ctx, x + 90, y, 150, 'bamboo', c); M.lotusBud(ctx, x + 40, y - 6, 14, { colour }); break;
    case 'hill': M.hill(ctx, x, y, 260, 150, c); M.tree(ctx, x + 70, y - 20, 110, 'mango', c); break;
    case 'forest': M.tree(ctx, x - 70, y, 200, 'sala', c); M.tree(ctx, x + 20, y, 180, 'banyan', c); M.tree(ctx, x + 110, y, 170, 'sala', c); break;
    case 'hut': M.tree(ctx, x - 110, y, 190, 'banyan', c); M.hut(ctx, x, y, 150, 130, c); M.tree(ctx, x + 110, y, 160, 'ashoka', c); break;
    case 'ridge': M.hill(ctx, x, y, 300, 170, { ...c, fill: PAL.stone }); break;
    case 'sky': M.cloud(ctx, x - 60, y - 120, 140, { hatch: 0 }); M.cloud(ctx, x + 80, y - 70, 110, { hatch: 0 }); break;
    case 'lake': shape(ctx, ellipsePts(x, y - 16, 150, 26, 14), { mode: colour ? 'colour' : 'line', fill: PAL.river, w: 1.4, smooth: true }); for (let i = -1; i <= 1; i++) M.lotusBud(ctx, x + i * 70, y - 16, 16, { colour }); M.tree(ctx, x + 150, y, 140, 'ashoka', c); break;
    case 'rocks': M.hill(ctx, x - 40, y, 220, 170, { ...c, fill: PAL.ochre }); M.tree(ctx, x + 110, y, 160, 'palm', c); break;
    case 'trees': for (let i = 0; i < 7; i++) M.tree(ctx, x - 150 + i * 50, y, 160, 'sala', { ...c, seed: i }); break;
    case 'shore': M.waves(ctx, x - 160, x + 160, y - 30, y - 4, { colour, gap: 10 }); M.tree(ctx, x - 60, y - 30, 160, 'palm', c); M.hill(ctx, x + 90, y - 20, 160, 110, c); break;
    case 'ocean': shape(ctx, rectPts(x - 170, y - 60, 340, 60), { mode: colour ? 'colour' : 'line', fill: PAL.river, w: 1.4 }); M.waves(ctx, x - 160, x + 160, y - 54, y - 6, { colour: false, gap: 12 }); drawProp(ctx, 'mainaka', x + 80, y - 30, { colour, scale: 0.4 }); break;
    case 'grove': for (let i = 0; i < 3; i++) M.tree(ctx, x - 90 + i * 90, y, 180, 'ashoka', { ...c, seed: i }); break;
    case 'bridge': M.waves(ctx, x - 170, x + 170, y - 40, y - 4, { colour, gap: 12 }); drawProp(ctx, 'bridge', x - 160, y - 30, { colour, width: 320 }); break;
    case 'field': M.tree(ctx, x - 120, y, 120, 'bare', c); line(ctx, [[x - 40, y], [x - 40, y - 150]], { w: 1.6 }); shape(ctx, [[x - 40, y - 150], [x + 10, y - 138], [x - 40, y - 124]], { mode: colour ? 'colour' : 'line', fill: PAL.saffron, w: 1.2 }); drawProp(ctx, 'chariot', x + 70, y, { colour, scale: 0.5 }); break;
    case 'camp': drawProp(ctx, 'herbPeak', x - 50, y, { colour, scale: 0.6 }); M.hut(ctx, x + 100, y, 100, 90, c); break;
    case 'lanka': M.building(ctx, x, y, 170, 220, { ...c, lanka: true, tiers: 3, banner: true }); M.building(ctx, x - 130, y, 90, 120, { ...c, lanka: true, tiers: 2 }); M.building(ctx, x + 130, y, 90, 140, { ...c, lanka: true, tiers: 2 }); break;
    case 'cave': M.hill(ctx, x, y, 260, 180, { ...c, fill: PAL.ochre }); shape(ctx, [[x - 40, y], [x - 30, y - 70], [x + 30, y - 70], [x + 40, y]], { mode: 'colour', fill: PAL.black, w: 1.4, smooth: true }); break;
    default: M.lotusBud(ctx, x, y, 30, { colour }); break;
  }
}

const cache = { key: '', cv: null };

function paintWall(states) {
  const s = 0.5;
  const cv = makeCanvas(WALL_W * s, WALL_H * s);
  const ctx = cv.getContext('2d'); ctx.scale(s, s);
  ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, WALL_W, WALL_H);
  for (let i = 0; i < 30; i++) { ctx.globalAlpha = 0.18; ctx.fillStyle = i % 2 ? PAL.wash : PAL.washDark; ctx.beginPath(); ctx.ellipse((i * 397) % WALL_W, (i * 211) % WALL_H, 200, 90, i, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  const kandaDone = (k) => CHAPTERS.filter((c) => c.kanda === k && c.playable !== false && c.type !== 'lanka').every((c) => save.data.done[c.id]);
  for (let i = 0; i < 6; i++) {
    const y = tierY(i);
    // vine border between tiers; a tier's border is painted when the kanda is complete
    M.vineBand(ctx, 0, WALL_W, y, { colour: kandaDone(KANDAS[i]), h: 22, step: 60 });
    line(ctx, [[0, y - 14], [WALL_W, y - 14]], { w: 1.6 }); line(ctx, [[0, y + 14], [WALL_W, y + 14]], { w: 1.6 });
    plate(ctx, t('kanda.' + KANDAS[i]), 120, y + 44, { size: 24, font: '"Yatra One", serif', seed: i });
    M.fillers(ctx, 40, WALL_W - 40, y + 40, y + TIER_H - 140, { colour: false, seed: 30 + i, density: 0.5 });
  }
  M.vineBand(ctx, 0, WALL_W, tierY(6), { colour: allDone(), h: 22, step: 60 });
  for (const p of PLACES) {
    if (!placeOnRamaWall(p)) continue; // places that are all Ravana's belong on his wall
    const st = states.st[p.id];
    const y = tierY(p.tier) + TIER_H - 60;
    vignette(ctx, p, p.x, y, st === 'colour', {});
    if (st === 'kachni') { ctx.save(); ctx.globalAlpha = 0.6; hatch(ctx, ellipsePts(p.x, y - 90, 170, 110, 14), { color: PAL.terracotta, spacing: 11, angle: 0.8, smooth: true }); ctx.restore(); }
  }
  // marks left by chapters: a feather, gold dots, flames, Ravana's kachni line...
  const P = (id) => PLACES.find((p) => p.id === id);
  const base = (p) => [p.x, tierY(p.tier) + TIER_H - 70];
  for (const m of MARKS) {
    if (!save.data.done[m.after] || (m.until && save.data.done[m.until])) continue;
    const at = m.at && P(m.at); const from = m.from && P(m.from), to = m.to && P(m.to);
    if (at) {
      const [x, y] = base(at); const dx = m.dx || 0;
      if (m.kind === 'feather') line(ctx, [[x - 60, y - 150], [x, y - 180], [x + 30, y - 170]], { w: 4, color: PAL.grey, smooth: true });
      else if (m.kind === 'goldDots') for (let i = 0; i < 9; i++) dots(ctx, x - 200 + i * 50, y - 60 + Math.sin(i) * 20, 0, 1, PAL.gold, 1, 7);
      else if (m.kind === 'flame') M.flame(ctx, x + dx + 120, y, 40, { seed: 2 });
      else if (m.kind === 'flames') for (let i = 0; i < 6; i++) M.flame(ctx, x - 170 + i * 68, y + 10, 34, { seed: i });
      else if (m.kind === 'holes') for (let i = 0; i < 7; i++) { ctx.fillStyle = PAL.white; ctx.strokeStyle = PAL.black; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 150 + i * 50, y - 80, 7, 0, 7); ctx.fill(); ctx.stroke(); }
      else if (m.kind === 'lamps') for (let i = 0; i < 9; i++) M.diya(ctx, x - 200 + i * 50, y + 34, 9, true, i);
      else if (m.kind === 'sandals') drawProp(ctx, 'sandalsThrone', x + 170, y + 10, { scale: 0.5, state: 1 });
    } else if (from && to) {
      const a = base(from), b2 = base(to);
      const pts = []; for (let k = 0; k <= 1.0001; k += 0.04) pts.push([a[0] + (b2[0] - a[0]) * k, a[1] - 40 + (b2[1] - a[1]) * k - Math.sin(k * Math.PI) * 60]);
      if (m.kind === 'ravanaLine') line(ctx, pts, { w: 3, color: PAL.terracotta, smooth: true });
      else if (m.kind === 'bridge') { line(ctx, pts, { w: 8, color: PAL.black, smooth: true }); line(ctx, pts, { w: 4, color: PAL.stone, smooth: true, flat: true }); }
      else for (const q of pts) { ctx.fillStyle = m.gold ? PAL.gold : PAL.black; ctx.beginPath(); ctx.arc(q[0], q[1], m.gold ? 5 : 3.5, 0, 7); ctx.fill(); }
    }
  }
  if (save.data.unlocked) { const x = WALL_W - 120, y = tierY(5) + TIER_H - 60; line(ctx, [[x - 300, y - 30], [x - 100, y - 60], [x - 40, y - 60]], { w: 2, color: PAL.terracotta, smooth: true }); drawProp(ctx, 'door', x, y, { colour: false, scale: 0.7 }); }
  return cv;
}

function allDone() { return CHAPTERS.filter((c) => c.playable !== false).every((c) => save.data.done[c.id]); }

// ---------------------------------------------------------------- Ravana's thread (a separate wall)
// The six Lanka chapters are Ravana's court, told from his side. They live on their own dark wall,
// reached by auto-flip (when the next chapter is one of his) or the toggle. The main wall never shows them.
const RAVANA_IDS = CHAPTERS.filter((c) => c.type === 'lanka').map((c) => c.id);
const isRavanaCh = (id) => RAVANA_IDS.includes(id);
/** True when a place has at least one chapter that is NOT part of Ravana's thread. */
function placeOnRamaWall(p) { return p.chapters.some((id) => !isRavanaCh(id)); }
/** The six court nodes, two rows of three, in screen space. */
function ravanaNodes() {
  const W = app.W, cols = [W * 0.24, W * 0.5, W * 0.76];
  return RAVANA_IDS.map((id, i) => ({ id, x: cols[i % 3], y: i < 3 ? 214 : 476 }));
}
function renderRavanaWall(ctx, hub) {
  const W = app.W;
  // a dark court: indigo ground, Ravana's ten-headed shadow behind, terracotta kachni hatching
  ctx.fillStyle = PAL.black; ctx.fillRect(0, 0, W, 720);
  ctx.save(); ctx.globalAlpha = 0.16;
  for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? PAL.indigo : PAL.madder; ctx.beginPath(); ctx.ellipse((i * 331) % W, (i * 197) % 720, 180, 70, i, 0, 7); ctx.fill(); }
  ctx.restore();
  // Ravana's ten-headed shadow looms behind the court
  ctx.save(); ctx.globalAlpha = 0.14; fig(ctx, character('ravana'), 'stand', W / 2, 760, { scale: 2.6, mode: 'line', facing: 1 }); ctx.restore();
  plate(ctx, t('ravana.wall.title'), W / 2, 66, { size: 28, font: '"Yatra One", serif', bg: PAL.black, color: PAL.turmeric, gap: PAL.madder, padX: 24, padY: 11 });
  const next = nextChapter();
  for (const nd of ravanaNodes()) {
    const ch = chapterById(nd.id), open = isUnlocked(nd.id), done = save.data.done[nd.id];
    ctx.save(); ctx.translate(nd.x, nd.y); ctx.globalAlpha = open ? 1 : 0.4;
    drawProp(ctx, 'throne', 0, 36, { colour: done, scale: 0.62, lanka: true, t: hub.t });
    if (next && nd.id === next.id) M.usableRing(ctx, 0, 4, 80, hub.t);
    if (!open) { ctx.strokeStyle = PAL.turmeric; ctx.lineWidth = 3; ctx.strokeRect(-11, -4, 22, 18); ctx.beginPath(); ctx.arc(0, -4, 9, Math.PI, 0); ctx.stroke(); }
    ctx.restore();
    plate(ctx, `${ch.n}. ${t('chapter.' + nd.id + '.title')}`, nd.x, nd.y + 92, { size: 16, bg: done ? PAL.madder : PAL.black, color: done ? '#fbf5e4' : PAL.turmeric, gap: done ? PAL.turmeric : PAL.indigo, padX: 12, padY: 6 });
    if (done) { ctx.fillStyle = PAL.turmeric; const seals = save.data.seals[nd.id] || {}; ['finish', 'gentle', 'fast'].forEach((k, i) => { if (seals[k]) { ctx.beginPath(); ctx.arc(nd.x - 18 + i * 18, nd.y - 80, 5, 0, 7); ctx.fill(); } }); }
  }
}

class Hub {
  constructor(o = {}) {
    this.cam = { x: WALL_W / 2, y: 300, z: 0.6 }; this.t = 0; this.o = o; this.intro = o.intro ? 0 : -1; this.wash = null; this.marker = null; this.target = null; this.fit = false;
    this.view = 'rama'; // 'rama' = the main wall, 'ravana' = his court (the Lanka thread)
  }
  label() { return t('aria.map'); }
  fitZoom() { return Math.min(app.W / WALL_W, 720 / WALL_H) * 0.98; }
  enter() {
    app.loop.setMenuFps(true);
    setMood('bala', 'calm');
    const upcoming = nextChapter(); if (upcoming) import('../scenes/runner.js').then((m) => m.prefetchChapter(upcoming.id)).catch(() => {});
    touchControls(null);
    // auto-flip to Ravana's wall when the next chapter is one of his court scenes
    const up = nextChapter();
    this.view = up && isRavanaCh(up.id) ? 'ravana' : 'rama';
    this.setTopbar();
    const pending = save.data.pendingWash;
    const focus = pending ? placeOf(pending) : placeOf((nextChapter() || CHAPTERS[0]).id);
    if (focus) { this.cam.x = focus.x; this.cam.y = tierY(focus.tier) + TIER_H / 2; }
    this.cam.z = Math.max(0.42, Math.min(0.8, app.W / 1600));
    if (this.intro >= 0) { this.cam.x = PLACES[0].x; this.cam.y = tierY(0) + TIER_H / 2; }
    if (pending) {
      this.states = placeStates(pending);
      this.wash = { place: focus, t: 0, ch: pending };
      cue('bell');
      save.data.pendingWash = null; save.commit();
    } else this.states = placeStates();
    this.invalidate();
    this.hintPlace = !save.data.done[CHAPTERS[0].id] ? PLACES[0] : null;
  }
  exit() { topbar(null); closePanel(); }
  setTopbar() {
    topbar([
      { label: t(this.view === 'ravana' ? 'btn.ramaWall' : 'btn.ravanaWall'), on: () => this.flipView() },
      { label: t('btn.journey'), on: () => this.toggleFit() },
      { label: t('btn.menu'), on: () => openTitle() },
    ]);
  }
  flipView() { this.view = this.view === 'ravana' ? 'rama' : 'ravana'; closePanel(); this.setTopbar(); cue('bell'); }
  invalidate() { cache.key = ''; }
  toggleFit() { this.fit = !this.fit; this.zoomTo = this.fit ? this.fitZoom() : Math.max(0.42, Math.min(0.8, app.W / 1600)); if (this.fit) { this.panTo = { x: WALL_W / 2, y: WALL_H / 2 }; } }
  wallCanvas() {
    const key = JSON.stringify(this.states.st) + Object.keys(save.data.done).join() + save.data.unlocked;
    if (cache.key !== key) { cache.cv = paintWall(this.states); cache.key = key; }
    return cache.cv;
  }
  update(dt) {
    this.t += dt;
    const c = this.cam;
    if (this.view === 'ravana') {
      if (!panelOpen()) {
        const p = input.pointer;
        if (p.justUp && p.moved < 12) { const nd = ravanaNodes().find((n) => Math.hypot(n.x - p.x, n.y + 24 - p.y) < 100); if (nd) this.openRavanaCard(nd.id); }
        if (input.consume('confirm') || input.consume('action')) { const n = nextChapter(); if (n && isRavanaCh(n.id)) this.openRavanaCard(n.id); }
      }
      input.endTick(); return;
    }
    if (this.intro >= 0) {
      // the opening pan: Ayodhya down to Lanka, then back to Ayodhya; any tap skips
      this.intro += dt;
      const k = Math.min(1, this.intro / 4);
      const lanka = PLACES.find((p) => p.id === 'lankaPalace') || PLACES[PLACES.length - 1];
      c.y = tierY(0) + TIER_H / 2 + (tierY(5) - tierY(0)) * Math.sin(k * Math.PI) * 1; c.x = PLACES[0].x + (lanka.x - PLACES[0].x) * Math.sin(k * Math.PI);
      if (k >= 1 || input.pointer.justDown) { this.intro = -1; c.x = PLACES[0].x; c.y = tierY(0) + TIER_H / 2; }
      input.endTick(); return;
    }
    if (this.wash) { this.wash.t += dt; if (this.wash.t > 3 || input.pointer.justDown) { this.wash = null; this.states = placeStates(); this.invalidate(); bus.emit('hub:paint'); this.startMarker(); } input.endTick(); return; }
    if (this.marker) { this.marker.t += dt; if (this.marker.t >= 2 || input.pointer.justDown) { const m = this.marker; this.marker = null; c.x = m.to.x; c.y = tierY(m.to.tier) + TIER_H / 2; } else { const k = this.marker.t / 2; c.x = this.marker.from.x + (this.marker.to.x - this.marker.from.x) * k; c.y = tierY(this.marker.from.tier) + TIER_H / 2 + (tierY(this.marker.to.tier) - tierY(this.marker.from.tier)) * k; } input.endTick(); return; }
    if (panelOpen()) { input.endTick(); return; }
    // pan, zoom
    const p = input.pointer;
    if (p.down && p.moved > 8) { c.x -= input.panX / c.z; c.y -= input.panY / c.z; this.panTo = null; }
    if (input.wheel) { c.z *= Math.pow(0.999, input.wheel); this.zoomTo = null; }
    if (input.pinch !== 1) { c.z *= input.pinch; this.zoomTo = null; }
    c.x += (input.axis) * 600 * dt / c.z; c.y += input.axisY * 600 * dt / c.z;
    if (this.zoomTo) { c.z += (this.zoomTo - c.z) * Math.min(1, dt * 6); if (Math.abs(this.zoomTo - c.z) < 0.002) this.zoomTo = null; }
    if (this.panTo) { c.x += (this.panTo.x - c.x) * Math.min(1, dt * 6); c.y += (this.panTo.y - c.y) * Math.min(1, dt * 6); }
    c.z = Math.max(this.fitZoom(), Math.min(1.4, c.z));
    const hw = app.W / 2 / c.z, hh = 360 / c.z;
    c.x = Math.max(Math.min(hw, WALL_W / 2), Math.min(Math.max(WALL_W - hw, WALL_W / 2), c.x));
    c.y = Math.max(Math.min(hh, WALL_H / 2), Math.min(Math.max(WALL_H - hh, WALL_H / 2), c.y));
    if (p.justUp && p.moved < 10) {
      const w = this.toWall(p.x, p.y);
      const hit = PLACES.find((q) => placeOnRamaWall(q) && Math.abs(q.x - w.x) < 190 && w.y > tierY(q.tier) + 40 && w.y < tierY(q.tier) + TIER_H);
      if (hit) this.openCard(hit);
      else if (save.data.unlocked && w.x > WALL_W - 220 && w.y > tierY(5) + 100) this.openScroll();
    }
    if (input.consume('confirm') || input.consume('action')) { const n = nextChapter(); if (n) this.openCard(placeOf(n.id)); }
    input.endTick();
  }
  startMarker() {
    const n = nextChapter(); if (!n) return;
    const to = placeOf(n.id); const from = this.wash ? this.wash.place : null;
    if (to && from && to !== from) this.marker = { from, to, t: 0 };
  }
  toWall(sx, sy) { const c = this.cam; return { x: c.x + (sx - app.W / 2) / c.z, y: c.y + (sy - 360) / c.z }; }
  openCard(p) {
    this.hintPlace = null;
    const rows = [];
    for (const id of p.chapters) {
      const ch = chapterById(id);
      if (ch.playable === false || isRavanaCh(id)) continue; // Ravana's chapters live on his own wall
      const open = isUnlocked(id), seals = save.data.seals[id] || {};
      const sealRow = el('span', { html: ['finish', 'gentle', 'fast'].map((k) => sealSvg(!!seals[k])).join('') });
      const label = `${ch.n}. ${t('chapter.' + id + '.title')}`;
      if (open) rows.push(el('div', { class: 'ch' }, button(label, () => { closePanel(); startChapter(id); }, { main: id === (nextChapter() || {}).id, small: t('type.' + ch.type) }), sealRow));
      else { const bl = blocker(id); rows.push(el('div', { class: 'ch lock' }, el('span', {}, label), el('span', {}, t('lock.finish', { name: bl ? t('chapter.' + bl.id + '.title') : '' })))); }
    }
    panel([el('h2', {}, t('place.' + p.id)), el('div', { class: 'col' }, rows), button(t('btn.close'), () => closePanel())], { cls: 'card' });
  }
  openScroll() { panel([el('h2', {}, t('scroll.title')), el('p', {}, t('scroll.body')), button(t('btn.close'), () => closePanel())]); }
  openRavanaCard(id) {
    const ch = chapterById(id), open = isUnlocked(id), seals = save.data.seals[id] || {};
    const sealRow = el('span', { html: ['finish', 'gentle', 'fast'].map((k) => sealSvg(!!seals[k])).join('') });
    const label = `${ch.n}. ${t('chapter.' + id + '.title')}`;
    const row = open
      ? el('div', { class: 'ch' }, button(label, () => { closePanel(); startChapter(id); }, { main: id === (nextChapter() || {}).id, small: t('type.' + ch.type) }), sealRow)
      : el('div', { class: 'ch lock' }, el('span', {}, label), el('span', {}, t('lock.finish', { name: (blocker(id) ? t('chapter.' + blocker(id).id + '.title') : '') })));
    panel([el('h2', {}, t('ravana.wall.title')), el('div', { class: 'col' }, [row]), button(t('btn.close'), () => closePanel())], { cls: 'card' });
  }
  render(ctx) {
    const c = this.cam, W = app.W;
    if (this.view === 'ravana') { renderRavanaWall(ctx, this); return; }
    ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, W, 720);
    ctx.save();
    ctx.translate(W / 2, 360); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y);
    ctx.drawImage(this.wallCanvas(), 0, 0, WALL_W, WALL_H);
    if (this.wash) {
      const p = this.wash.place, k = Math.min(1, this.wash.t / 3), y = tierY(p.tier) + TIER_H - 60;
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, y - 100, 20 + k * 260, 0, 7); ctx.clip();
      ctx.fillStyle = PAL.cream; ctx.fillRect(p.x - 300, y - 360, 600, 380);
      const after = placeStates();
      vignette(ctx, p, p.x, y, after.st[p.id] === 'colour', { t: this.t });
      ctx.restore();
    }
    // place labels and markers: labels sit under their markers and stay inside the view
    const next = nextChapter();
    const nextPlace = next ? placeOf(next.id) : null;
    for (const p of PLACES) {
      if (!placeOnRamaWall(p)) continue;
      const y = tierY(p.tier) + TIER_H - 20;
      const st = this.states.st[p.id];
      const lit = st === 'colour';
      const lb = plate(ctx, t('place.' + p.id), p.x, y + 4, { size: 20, bg: lit ? PAL.paper : PAL.cream, gap: lit ? PAL.turmeric : PAL.cream, seed: p.x | 0 });
      if (p === nextPlace && !isRavanaCh(next.id)) { M.usableRing(ctx, p.x, y - 120, 150, this.t); }
      void lb;
    }
    if (this.marker || nextPlace) {
      const m = this.marker; const k = m ? m.t / 2 : 1;
      const from = m ? m.from : nextPlace, to = m ? m.to : nextPlace;
      const mx = from.x + (to.x - from.x) * k, my = tierY(from.tier) + (tierY(to.tier) - tierY(from.tier)) * k + TIER_H - 60;
      fig(ctx, character('rama', 'prince'), m ? ['walk0', 'walk1', 'walk2', 'walk3'][Math.floor(this.t * 8) % 4] : 'stand', mx + 170, my, { scale: 0.55, facing: to.x >= from.x ? 1 : -1 });
    }
    ctx.restore();
    drawFrame(ctx, { colour: allDone() });
    if (this.hintPlace && this.intro < 0) { const s = { x: (this.hintPlace.x - c.x) * c.z + W / 2, y: (tierY(0) + TIER_H - 140 - c.y) * c.z + 360 }; plate(ctx, t('hint.tapPlace', { place: t('place.' + this.hintPlace.id) }), s.x, Math.max(120, s.y - 170 * c.z), { size: 22, gap: PAL.indigo }); if (app.isTouch) drawHand(ctx, s.x, s.y + 40, this.t); }
    if (this.marker) plate(ctx, t('hint.tapSkip'), W / 2, 680, { size: 15 });
  }
}

export function openHub(o = {}) { setMode('hub', new Hub(o)); }
export { Hub, vignette };
void allSeals; void toast; void openSettings; void openGallery;
