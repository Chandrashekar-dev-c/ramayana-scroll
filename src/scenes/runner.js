// The chapter runner: one system for every chapter. A chapter is a script of beats; a
// beat can be a scene beat, an interaction, a battle or a trial.
import { app, setMode } from '../core/app.js';
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { t, has } from '../core/i18n.js';
import tuning from '../data/tuning.json';
import { PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { character, fig, WALK, BASE_U } from '../art/figures.js';
import { drawBackdrop, isNight } from '../art/backdrops.js';
import { drawFrame } from '../art/borders.js';
import { drawProp } from '../art/props.js';
import { plate } from '../art/ink.js';
import * as M from '../art/motifs.js';
import { showLine, tickLine, lineTyping, finishTyping, hideLine, topbar, touchControls, choose } from '../ui/dom.js';
import { createBattle, updateBattle, renderBattle, battleSeals } from '../play/battle.js';
import { setMood, cue } from '../audio/audio.js';
import { createInteraction } from './interactions.js';
import { createTrial } from '../trials/index.js';
import { CHAPTERS, chapterById, kandaOf } from '../data/chapters.js';
import { showWin, showFail, openPause } from '../ui/screens.js';
import { drawHand } from '../play/hud.js';

const scripts = import.meta.glob('../data/scripts/*.json');
const levels = import.meta.glob('../data/levels/*.json');

export async function loadScript(id) {
  const f = scripts[`../data/scripts/${id}.json`];
  if (!f) throw new Error('No script for ' + id);
  const m = await f(); return m.default || m;
}
export async function loadLevel(id) {
  const f = levels[`../data/levels/${id}.json`];
  if (!f) throw new Error('No level ' + id);
  const m = await f(); return m.default || m;
}

export function nameOf(who) {
  const k = 'name.' + who;
  return has(k) ? t(k) : who;
}

/** Start a chapter. from: optional checkpoint { beat, battle } */
export async function startChapter(id, from) {
  const ch = chapterById(id);
  const script = await loadScript(id);
  const r = new Runner(ch, script, from);
  save.data.chapter = id; save.commit();
  setMode('chapter', r);
}

class Runner {
  constructor(ch, script, from) {
    this.ch = ch; this.script = script.slice(); this.pc = from ? from.beat : 0;
    this.kanda = kandaOf(ch);
    this.lanka = ch.type === 'lanka';
    this.actors = new Map(); this.props = new Map();
    this.bg = { id: 'court', style: 'bharni-bright', colour: true }; this.camX = 640 - app.W / 2; this.camTo = null;
    this.wash = null; this.waitT = 0; this.cur = null; this.sub = null; this.time = 0; this.card = null; this.shakeT = 0;
    this.stats = { kills: 0, headshots: 0, time: 0, hits: 0, shots: 0 }; this.seals = { finish: true, gentle: true, fast: true }; this.anySeals = false;
    this.from = from; this.skipping = false; this.tapHintShown = save.seen('hint.tap'); this.dialogTop = false; this.flags = {};
    this.overlay = null; this.endedTo = null;
  }
  label() { return t('aria.' + (this.sub ? (this.sub.kind === 'battle' ? 'battle' : 'trial') : 'scene')); }

  enter() {
    app.loop.setMenuFps(false);
    bus.emit('chapter:start', this.ch);
    setMood(this.lanka ? 'lanka' : this.kanda, 'calm');
    this.ui();
    // replay the scene state up to a checkpoint beat silently
    if (this.from && this.from.beat) {
      const target = this.from.beat; this.pc = 0; this.skipping = true;
      while (this.pc < target) { const b = this.script[this.pc++]; if (!b.battle && !b.trial && !b.do && !b.heads && !b.say && !b.narrate && !b.title && !b.wait) this.instant(b); }
      this.skipping = false;
    }
    this.next();
  }
  exit() { hideLine(); topbar(null); touchControls(null); }
  ui() {
    const items = [{ label: '❚❚', aria: t('btn.pause'), on: () => this.pause() }];
    if (!this.sub || this.sub.kind !== 'battle') items.unshift({ label: t('btn.skip'), on: () => this.skip() });
    topbar(items);
    touchControls(this.sub && this.sub.controls ? this.sub.controls : null);
  }
  pause() { if (this.paused) return; this.paused = true; input.releaseAll(); openPause({ onResume: () => { this.paused = false; }, onRestart: () => { this.paused = false; this.restartCheckpoint(true); }, chapter: this.ch }); }

  // ------------------------------------------------------------ beats
  next() {
    hideLine(); this.cur = null;
    if (this.pc >= this.script.length) { this.end(); return; }
    const b = this.script[this.pc++];
    this.cur = b; this.beatT = 0;
    if (this.instant(b)) { this.next(); return; }
    this.start(b);
  }

  /** Apply a beat that takes no time. Returns true when the beat is complete. */
  instant(b) {
    if (b.bg !== undefined) { this.bg = { id: b.bg, style: b.style || (this.lanka ? 'kachni' : 'bharni-bright'), colour: b.colour !== undefined ? b.colour : !this.lanka }; this.camX = (b.cam ?? 640) - app.W / 2; return true; }
    if (b.actor) {
      const old = this.actors.get(b.actor);
      const spec = character(b.char || (old && old.char) || b.actor, b.stage || (old && old.stage));
      this.actors.set(b.actor, { ...(old || {}), char: b.char || (old && old.char) || b.actor, stage: b.stage || (old && old.stage), spec, x: b.x ?? (old ? old.x : 640), y: b.y ?? (old ? old.y : GROUND), pose: b.pose || (old ? old.pose : 'stand'), facing: b.face ?? (old ? old.facing : 1), mode: b.mode !== undefined ? b.mode : old ? old.mode : null, alpha: b.alpha ?? (old ? old.alpha : 1), scale: b.scale ?? (old ? old.scale : 1), rot: b.rot ?? (old ? old.rot : 0), colourUp: b.colourUp, hidden: b.hidden ?? (old ? old.hidden : false), moveTo: old ? old.moveTo : null });
      return true;
    }
    if (b.exit) { for (const id of [].concat(b.exit)) { if (id === '*') this.actors.clear(); else this.actors.delete(id); } return true; }
    if (b.prop) { const old = this.props.get(b.prop); const who = b.who && this.actors.get(b.who); this.props.set(b.prop, { name: b.name || (old && old.name) || b.prop, x: b.x ?? (who ? who.x : old ? old.x : 640), y: b.y ?? (old ? old.y : GROUND), state: b.state ?? (old ? old.state : undefined), dir: b.dir ?? (old ? old.dir : 1), colour: b.colour ?? (old ? old.colour : undefined), scale: b.scale ?? (old ? old.scale : 1), rot: 0, lanka: b.lanka, broken: b.broken ?? (old && old.broken), width: b.width ?? (old && old.width), front: b.front ?? (old && old.front), who: b.who ?? (old && old.who) }); return true; }
    if (b.unprop) { for (const id of [].concat(b.unprop)) { if (id === '*') this.props.clear(); else this.props.delete(id); } return true; }
    if (b.noop) return true;
    if (b.goto) { const i = this.script.findIndex((x) => x.label === b.goto); if (i >= 0) this.pc = i; return true; }
    if (b.pose) { const a = this.actors.get(b.pose); if (a) { if (b.p) a.pose = b.p; if (b.face !== undefined) a.facing = b.face; if (b.mode !== undefined) a.mode = b.mode; if (b.alpha !== undefined) a.alpha = b.alpha; if (b.scale !== undefined) a.scale = b.scale; if (b.rot !== undefined) a.rot = b.rot; } return true; }
    if (b.set) { this.flags[b.set] = true; save.data.flags[b.set] = true; return true; }
    if (b.cue) { if (!this.skipping) cue(b.cue); return true; }
    if (b.mood) { setMood(b.kanda || (this.lanka ? 'lanka' : this.kanda), b.mood); return true; }
    if (b.shake) { if (!this.skipping) this.shakeT = 0.3; this.shakeA = save.data.settings.reducedMotion ? 2 : b.shake; return true; }
    if (b.dialog) { this.dialogTop = b.dialog === 'top'; return true; }
    if (b.colourAll !== undefined) { this.bg.colour = b.colourAll; return true; }
    if (b.if) { const yes = this.flags[b.if] || save.data.flags[b.if]; const list = yes ? b.then : b.else; if (list) this.script.splice(this.pc, 0, ...list); return true; }
    if (b.cam !== undefined && b.dur === undefined) { this.camX = b.cam - app.W / 2; return true; }
    if (this.skipping) {
      if (b.move) { const a = this.actors.get(b.move); if (a) { a.x = b.x; if (b.y !== undefined) a.y = b.y; a.pose = 'stand'; if (b.exitAfter) this.actors.delete(b.move); } return true; }
      if (b.cam !== undefined) { this.camX = b.cam - app.W / 2; return true; }
      if (b.wash) { this.applyWash(b); return true; }
      if (b.say || b.narrate || b.wait || b.title || b.meanwhile) return true;
    }
    return false;
  }

  start(b) {
    if (b.say || b.narrate) {
      const who = b.say ? (b.nk ? t(b.nk) : nameOf(b.as || b.say)) : '';
      showLine(who, t(b.k), { top: this.dialogTop || !!b.top });
      if (!this.tapHintShown) { this.tapHintShown = true; save.markSeen('hint.tap'); this.tapHint = 3; }
      bus.emit('scene:line', b.k);
      return;
    }
    if (b.move) {
      const a = this.actors.get(b.move); if (!a) { this.next(); return; }
      const d = Math.abs(b.x - a.x);
      a.moveTo = b.x; a.moveSpeed = b.speed || (b.time ? Math.max(40, d / b.time) : 140); a.walkT = 0; a.endPose = b.end || (a.pose && !a.pose.startsWith('walk') ? a.pose : 'stand');
      if (['sit', 'kneel', 'grieve', 'hurt', 'dead', 'hide'].includes(a.endPose)) a.endPose = 'stand';
      a.exitAfter = !!b.exitAfter; a.moveY = b.y; a.moveY0 = a.y; a.moveD = d || 1; a.moveFrom = a.x;
      if (!b.keepFace && d > 1) a.facing = b.x >= a.x ? 1 : -1;
      if (b.face !== undefined) a.faceAfter = b.face;
      if (d < 1 && b.y === undefined) { a.moveTo = null; this.next(); return; }
      if (b.nowait) { this.next(); }
      return;
    }
    if (b.wait) { this.waitT = b.wait; return; }
    if (b.title || b.meanwhile) { this.card = { title: b.meanwhile ? t('lanka.meanwhile') : t(b.title), sub: b.sub ? t(b.sub) : b.meanwhile ? '' : '', t: 0, dur: b.dur || 2.6 }; return; }
    if (b.cam !== undefined) { this.camTo = { from: this.camX, to: b.cam - app.W / 2, t: 0, dur: b.dur }; return; }
    if (b.wash) { this.wash = { target: b.wash, to: b.to || 'colour', t: 0, dur: b.dur || tuning.scene.wash, x: b.x }; cue('wash'); return; }
    if (b.choice) { this.runChoice(b); return; }
    if (b.do || b.heads) { this.sub = createInteraction(b.do || 'heads', b, this); this.sub.kind = 'interaction'; this.ui(); return; }
    if (b.trial) { this.sub = createTrial(b.trial, b, this); this.sub.kind = 'trial'; this.anySeals = true; setMood(this.lanka ? 'lanka' : this.kanda, b.music || 'battle'); this.ui(); return; }
    if (b.battle) { this.startBattle(b); return; }
    // unknown beat: skip it rather than stall
    console.warn('[runner] unknown beat', b);
    this.next();
  }

  async runChoice(b) {
    const i = await choose(b.prompt ? t(b.prompt) : '', b.choice.map((o) => ({ label: t(o.k), small: o.sub ? t(o.sub) : '' })));
    const op = b.choice[i];
    if (op.set) { this.flags[op.set] = true; save.data.flags[op.set] = true; }
    if (op.flag) { this.flags[op.flag] = op.value ?? true; save.data.flags[op.flag] = op.value ?? true; }
    if (op.goto) { const j = this.script.findIndex((x) => x.label === op.goto); if (j >= 0) this.pc = j; }
    if (op.then) this.script.splice(this.pc, 0, ...op.then);
    this.next();
  }

  async startBattle(b, cp) {
    const level = await loadLevel(b.battle);
    if (!save.data.difficulty && !level.practice) {
      const opts = ['story', 'normal', 'hard'];
      const i = await choose(t('diff.ask'), opts.map((d) => ({ label: t('diff.' + d), small: t('diff.' + d + '.sub'), main: d === 'normal' })));
      save.data.difficulty = opts[i]; save.commit();
    }
    this.levelBeat = this.pc - 1;
    const battle = createBattle(level, { kanda: this.kanda, seed: app.seed, checkpoint: cp || (this.from && this.from.battle) || null, hp: cp ? cp.hp : this.from && this.from.battle ? this.from.battle.hp : undefined, boon: cp ? cp.boon : 0, prevTime: this.stats.time });
    this.from = null;
    this.sub = { kind: 'battle', b: battle, level, controls: ['left', 'right', 'draw', 'jump', 'roll'] };
    this.anySeals = true;
    setMood(this.lanka ? 'lanka' : this.kanda, 'battle');
    this.ui();
  }

  restartCheckpoint(fromPause) {
    hideLine();
    if (this.sub && this.sub.kind === 'battle') {
      const b = this.sub.b; const cp = b.savedCheckpoint || null;
      this.startBattle(this.script[this.levelBeat], cp);
      return;
    }
    if (this.sub && this.sub.restart) { this.sub.restart(); return; }
    if (fromPause) startChapter(this.ch.id);
  }

  skip() {
    if (this.sub && this.sub.kind === 'trial') { this.sub.done = true; this.sub.skipped = true; return; }
    hideLine(); this.card = null; this.waitT = 0;
    if (this.sub && this.sub.kind === 'interaction') { if (this.sub.skip) this.sub.skip(); else this.sub.done = true; return; }
    // fast-forward scene beats until something the player must play
    if (this.cur && this.cur.move) { const a = this.actors.get(this.cur.move); if (a) { a.x = a.moveTo; a.moveTo = null; a.pose = a.endPose; } }
    this.skipping = true;
    while (this.pc < this.script.length) {
      const b = this.script[this.pc];
      if (b.battle || b.trial) break;
      if (b.choice) { this.pc++; const op = b.choice[0]; if (op.flag) save.data.flags[op.flag] = op.value ?? true; if (op.then) this.script.splice(this.pc, 0, ...op.then); if (op.goto) { const j = this.script.findIndex((x) => x.label === op.goto); if (j >= 0) this.pc = j; } continue; }
      if (b.do || b.heads) { if (b.heads && b.mode !== 'silence' && !save.data.headsChosen[b.heads] && b.voices && b.voices.length) save.data.headsChosen[b.heads] = b.voices[0]; this.pc++; if (b.after) { this.script.splice(this.pc, 0, ...b.after); } if (b.do === 'tap') for (const q of b.targets) if (q.then) for (const bt of q.then) this.instant(bt); continue; }
      this.pc++;
      if (!this.instant(b)) { /* timed beats are dropped while skipping */ }
    }
    this.skipping = false;
    if (this.wash) { this.applyWash(this.wash); this.wash = null; }
    this.next();
  }

  applyWash(w) {
    const to = w.to || 'colour';
    if (w.target === 'all' || w.wash === 'all' || w.target === 'bg' || w.wash === 'bg') this.bg.colour = to === 'colour';
    const id = w.target || w.wash;
    if (id === 'all' || id === 'actors') for (const a of this.actors.values()) a.mode = to === 'colour' ? null : 'line';
    const a = this.actors.get(id); if (a) a.mode = to === 'colour' ? null : 'line';
  }

  // ------------------------------------------------------------ update
  update(dt) {
    if (this.paused) { input.endTick(); return; }
    if (input.consume('pause')) { this.pause(); input.endTick(); return; }
    this.time += dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.tapHint > 0) this.tapHint -= dt;
    // sub controllers
    if (this.sub) {
      if (this.sub.kind === 'battle') {
        const B = this.sub.b;
        updateBattle(B, dt);
        if (B.outcome === 'win') { this.bg = { id: B.level.backdrop, style: B.level.style, colour: true }; this.camX = 640 - app.W / 2; const s = battleSeals(B); this.mergeSeals(s, B.stats); this.sub = null; this.ui(); setMood(this.lanka ? 'lanka' : this.kanda, 'calm'); this.next(); }
        else if (B.outcome === 'lose') { B.outcome = 'shown'; this.fail(B.loseKey, this.tipFor(B)); }
        return;
      }
      this.sub.update(dt);
      if (this.sub.done) {
        const s = this.sub; this.sub = null;
        if (s.kind === 'trial') { this.mergeSeals(s.seals || { finish: true, gentle: !s.skipped, fast: !s.skipped }, s.stats); setMood(this.lanka ? 'lanka' : this.kanda, 'calm'); }
        if (s.result && s.result.then) this.script.splice(this.pc, 0, ...s.result.then);
        if (s.result && s.result.gotoLabel) { const j = this.script.findIndex((x) => x.label === s.result.gotoLabel); if (j >= 0) this.pc = j; }
        if (this.cur && this.cur.after) this.script.splice(this.pc, 0, ...this.cur.after);
        this.ui(); input.endTick(); this.next();
      } else if (this.sub.failed) { const k = this.sub.failed; this.sub.failed = null; this.fail(k, this.sub.tip); }
      input.endTick();
      return;
    }
    const b = this.cur;
    // walking actors
    for (const a of this.actors.values()) {
      if (a.moveTo == null) continue;
      const d = a.moveTo - a.x, st = a.moveSpeed * dt;
      if (Math.abs(d) <= st) { a.x = a.moveTo; a.moveTo = null; a.pose = a.endPose; if (a.moveY !== undefined) a.y = a.moveY; if (a.faceAfter !== undefined) { a.facing = a.faceAfter; a.faceAfter = undefined; } if (a.exitAfter) for (const [k, v] of this.actors) if (v === a) this.actors.delete(k); }
      else { a.x += Math.sign(d) * st; a.walkT += dt; if (a.moveY !== undefined) a.y = a.moveY0 + (a.moveY - a.moveY0) * Math.min(1, Math.abs(a.x - a.moveFrom) / a.moveD); if (a.spec.body !== 'bird') a.pose = WALK[Math.floor(a.walkT * Math.min(10, a.moveSpeed / 22)) % 4]; }
    }
    if (this.camTo) { this.camTo.t += dt; const k = Math.min(1, this.camTo.t / this.camTo.dur); this.camX = this.camTo.from + (this.camTo.to - this.camTo.from) * (k * k * (3 - 2 * k)); if (k >= 1) { this.camTo = null; if (b && b.cam !== undefined) this.next(); } }
    if (this.wash) { this.wash.t += dt; if (this.wash.t >= this.wash.dur) { this.applyWash(this.wash); this.wash = null; if (b && b.wash) this.next(); } }
    const tapped = input.pointer.justDown || input.consume('confirm') || input.consume('jump') || input.consume('action');
    if (b) {
      if (b.say || b.narrate) {
        tickLine(dt, tuning.scene.typeSpeed * (b.slow ? 0.6 : 1));
        if (tapped) { if (lineTyping()) finishTyping(); else this.next(); }
      } else if (b.move && !b.nowait) { const a = this.actors.get(b.move); if (!a || a.moveTo == null) this.next(); else if (tapped && b.skippable !== false) { a.x = a.moveTo; } }
      else if (b.wait) { this.waitT -= dt; if (this.waitT <= 0 || (tapped && b.tap !== false)) this.next(); }
      else if (b.title || b.meanwhile) { this.card.t += dt; if (this.card.t >= this.card.dur || (tapped && this.card.t > 0.5)) { this.card = null; this.next(); } }
    }
    input.endTick();
  }

  tipFor(B) {
    const lv = B.level.tips && B.level.tips[B.loseTip];
    if (lv && lv !== save.data.lastTip) { save.data.lastTip = lv; return lv; }
    if (B.timer && B.loseKey === 'lose.rite' && B.level.timerTip) return B.level.timerTip;
    const k = this.ch.id + '.tip';
    const answers = { jump: 'tip.jump', roll: 'tip.roll', move: 'tip.move', shoot: 'tip.shoot', kick: 'tip.kick' };
    const last = save.data.lastTip;
    let tip = has(k) ? k : answers[B.loseTip] || 'tip.general';
    if (tip === last && answers[B.loseTip] && answers[B.loseTip] !== tip) tip = answers[B.loseTip];
    else if (tip === last) tip = tip === 'tip.general' ? 'tip.watch' : 'tip.general';
    save.data.lastTip = tip;
    return tip;
  }

  fail(key, tip) {
    input.releaseAll();
    cue('fail');
    showFail({ title: t(key || 'lose.default'), tip: tip ? t(tip) : '', onRetry: () => this.restartCheckpoint(), onSkip: this.sub && this.sub.kind === 'trial' && this.sub.fails >= tuning.trial.skipAfterFails ? () => { this.sub.done = true; this.sub.skipped = true; } : null, onMenu: () => import('../hub/hub.js').then((m) => m.openHub()) });
  }

  mergeSeals(s, stats) {
    for (const k of ['gentle', 'fast']) if (s[k] === false) this.seals[k] = false;
    if (stats) for (const k in stats) if (typeof stats[k] === 'number') this.stats[k] = (k === 'time' ? 0 : this.stats[k] || 0) + stats[k];
  }

  end() {
    if (this.ended) return; this.ended = true;
    hideLine(); topbar(null); touchControls(null);
    const ch = this.ch;
    const firstTime = !save.data.done[ch.id];
    save.data.done[ch.id] = true;
    const prev = save.data.seals[ch.id] || {};
    const seals = this.anySeals ? this.seals : { finish: true, gentle: true, fast: true };
    save.data.seals[ch.id] = { finish: true, gentle: prev.gentle || seals.gentle, fast: prev.fast || seals.fast };
    const order = CHAPTERS.filter((c) => c.playable !== false);
    const idx = order.findIndex((c) => c.id === ch.id);
    const nxt = order.slice(idx + 1).find((c) => !(save.data.settings.lankaWoven === false && c.type === 'lanka')) || null;
    if (ch.id === 'coronation') { save.data.unlocked = true; save.data.allOpen = true; }
    save.data.chapter = nxt ? nxt.id : null; save.data.pendingWash = firstTime ? ch.id : null;
    save.commit();
    bus.emit('chapter:end', { id: ch.id, seals });
    showWin({ ch, seals: save.data.seals[ch.id], earned: seals, stats: this.anySeals ? this.stats : null, next: nxt });
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    if (this.sub && this.sub.kind === 'battle') { renderBattle(ctx, this.sub.b); return; }
    if (this.sub && this.sub.fullscreen) { this.sub.render(ctx); return; }
    this.renderScene(ctx);
    if (this.sub) this.sub.render(ctx);
    if (this.card) {
      const k = Math.min(1, this.card.t / 0.4);
      ctx.save(); ctx.globalAlpha = k;
      plate(ctx, this.card.title + (this.card.sub ? '\n' + this.card.sub : ''), app.W / 2, 300, { size: 38, font: '"Yatra One", serif', padX: 40, padY: 22, gap: this.lanka ? PAL.terracotta : PAL.madder });
      ctx.restore();
    }
    if (this.tapHint > 0 && this.cur && (this.cur.say || this.cur.narrate)) { plate(ctx, t(app.isTouch ? 'hint.tapToContinue' : 'hint.clickToContinue'), app.W / 2, 470, { size: 18, seed: 4 }); if (app.isTouch) drawHand(ctx, app.W / 2, 540, this.time); }
  }

  renderScene(ctx, o = {}) {
    const W = app.W;
    ctx.save();
    if (this.shakeT > 0) ctx.translate(Math.sin(this.time * 70) * this.shakeA, Math.cos(this.time * 53) * this.shakeA * 0.6);
    const w = this.wash;
    const heal = w && (w.target === 'all' || w.target === 'bg') && w.to === 'colour' ? { x: this.camX + (w.x ?? W / 2), r: (w.t / w.dur) * W * 1.2 } : null;
    const unheal = w && (w.target === 'all' || w.target === 'bg') && w.to === 'line';
    drawBackdrop(ctx, this.bg.id, this.bg.style, this.camX, W, { colour: this.bg.colour && !unheal, heal });
    if (unheal) { ctx.save(); ctx.globalAlpha = 1 - w.t / w.dur; drawBackdrop(ctx, this.bg.id, this.bg.style, this.camX, W, { colour: true }); ctx.restore(); }
    ctx.save(); ctx.translate(-this.camX, 0);
    const kach = this.lanka;
    for (const [id, p] of this.props) if (!p.front) drawProp(ctx, p.name, p.x, p.y, { t: this.time, state: p.state, dir: p.dir, colour: p.colour ?? (kach ? false : true), night: isNight(this.bg.id) && p.colour === false, scale: p.scale, lanka: p.lanka || kach, moving: p.moving, spin: this.time * 6, broken: p.broken, width: p.width, rot: p.rot });
    const list = [...this.actors.entries()].sort((a, b) => (a[1].z || 0) - (b[1].z || 0));
    for (const [id, a] of list) {
      if (a.hidden) continue;
      let mode = a.mode || (kach ? 'kachni' : 'colour');
      let drain = 0;
      if (w && (w.target === id || w.target === 'actors' || (w.target === 'all'))) { const k = w.t / w.dur; if (w.to === 'colour') { mode = 'colour'; drain = 1 - k; } else { mode = 'colour'; drain = k; } }
      if (a.colourUp != null) this.drawColourUp(ctx, a);
      else fig(ctx, a.spec, a.pose, a.x, a.y, { facing: a.facing, mode, alpha: a.alpha, scale: a.scale, rot: a.rot, drain, heads: id === 'ravana' || a.char === 'ravana' ? { pride: save.data.pride || 0, ...(a.heads || {}) } : undefined });
    }
    for (const [id, p] of this.props) if (p.front) drawProp(ctx, p.name, p.who && this.actors.get(p.who) ? this.actors.get(p.who).x : p.x, p.who && this.actors.get(p.who) ? this.actors.get(p.who).y : p.y, { t: this.time, state: p.state, dir: p.dir, colour: p.colour ?? !kach, scale: p.scale, lanka: p.lanka || kach, broken: p.broken, width: p.width, facing: p.who && this.actors.get(p.who) ? this.actors.get(p.who).facing : 1, height: p.who && this.actors.get(p.who) ? this.actors.get(p.who).spec.build.height : 1 });
    ctx.restore();
    drawFrame(ctx, { colour: this.bg.colour && !this.lanka, night: isNight(this.bg.id) });
    ctx.restore();
    void o;
  }

  /** Ahalya: colour flows into her from the feet up. */
  drawColourUp(ctx, a) {
    const k = a.colourUp;
    fig(ctx, a.spec, a.pose, a.x, a.y, { facing: a.facing, mode: 'line', alpha: Math.max(0.25, a.alpha) });
    if (k <= 0) return;
    const H = BASE_U * a.spec.build.height * 1.7;
    ctx.save(); ctx.beginPath(); ctx.rect(a.x - 200, a.y - H * k, 400, H * k + 20); ctx.clip();
    fig(ctx, a.spec, a.pose, a.x, a.y, { facing: a.facing, mode: 'colour' });
    ctx.restore();
  }
}

export { Runner };
export const sceneDraw = { M };
