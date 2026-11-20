// The director reads a chapter's Ink screenplay and stages it on the Ramlila stage.
//   plain line         narration
//   NAME: line         dialogue (NAME is a character id in capitals)
//   >> verb args       a stage direction:
//      scene <backdrop> [clear] [style=..]   set the place (the pop-up page folds and rises again if it is open)
//      cast <id[:stage]> at <0..1> [pose= face=left y= scale=]   place someone before the curtain opens
//      enter <id[:stage]> from left|right to <0..1> [in <s>] [nowait] [pose=]
//      exit <id> to left|right [in <s>] [nowait]
//      move <id> to <0..1> [in <s>] [nowait] [keepface]
//      pose <id> <pose>         face <id> left|right        set <id> key=value ...
//      prop <key> <name> at <0..1> [state= front=true y=]   prop <key> remove
//      curtain open|close       raise or fold the page       light dim|full|night   wait <s>   shake <n>
//      look folio|evening|dawn|dusk|night   lamps <n>   mantra <from> <to,to>   (gold lights travel)
//      sound <cue>              music <mood> [kanda]        title <text> [/ sub]
//      prompt <text>            (the question shown with the next choices)
//      battle <level>           (leave the stage for the open field; returns when won)
//      astra <symbol>           (trace an astra's sign on stage)
//      together                 (the next directions start at once; `wait` or a line ends the group)
//      wash                     (the chapter's closing flourish)
import { Story } from 'inkjs';
import { gsap } from 'gsap';
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { t, has } from '../core/i18n.js';
import { showLine, tickLine, lineTyping, finishTyping, hideLine, choose, toast } from '../ui/dom.js';
import { cue, setMood } from '../audio/music.js';
import chars from '../data/characters.json';

const stories = import.meta.glob('./compiled/*.json');
export async function loadStory(id) {
  const f = stories[`./compiled/${id}.json`];
  if (!f) throw new Error('No story for ' + id);
  const m = await f(); return m.default || m;
}

/** Stage pace: written times are scaled by this, so the whole play can breathe slower. */
const TEMPO = 1.4;

const SPEAKERS = Object.fromEntries(chars.map((c) => [c.id.toUpperCase(), c.id]));
export function nameOf(id) { const k = 'name.' + id; return has(k) ? t(k) : id.replace(/^\w/, (c) => c.toUpperCase()); }

function parseArgs(rest) {
  let json = null;
  const j = rest.indexOf('{');
  if (j >= 0) { try { json = JSON.parse(rest.slice(j)); } catch { json = null; } rest = rest.slice(0, j); }
  const words = [], kv = {};
  for (const w of rest.trim().split(/\s+/).filter(Boolean)) {
    const m = w.match(/^(\w+)=(.*)$/);
    if (m) kv[m[1]] = m[2] === 'true' ? true : m[2] === 'false' ? false : isNaN(+m[2]) ? m[2] : +m[2];
    else words.push(w);
  }
  return { words, kv, json };
}

export class Director {
  /** host: { battle(level) -> Promise, astra(symbol) -> Promise, kanda } */
  constructor(ch, json, stage, host) {
    this.ch = ch; this.stage = stage; this.host = host;
    this.story = new Story(json);
    this.kanda = ch.lanka ? 'lanka' : ch.kanda;
    this.waiting = null; this.lineActive = false; this.skipping = false; this.tweens = new Set();
    this.prompt = ''; this.group = null; this.linesShown = 0; this.overlay = null; this.done = false;
    this.started = false; this.cancelled = false;
  }

  /** Stop the play: the chapter was left. Every pending wait resolves and nothing more runs. */
  cancel() {
    this.cancelled = true;
    for (const tw of [...this.tweens]) tw.kill();
    this.tweens.clear();
    if (this.waiting) { const r = this.waiting; this.waiting = null; r(); }
  }

  // ---------------------------------------------------------------- the play
  async run() {
    const s = this.story;
    while (!this.cancelled) {
      while (s.canContinue && !this.cancelled) {
        const raw = s.Continue().trim();
        if (!raw) continue;
        if (raw.startsWith('>>')) { await this.direct(raw.slice(2).trim()); continue; }
        await this.flushGroup();
        await this.ensureOpen();
        const m = raw.match(/^([A-Z][A-Z_]*):\s*(.*)$/);
        if (m && SPEAKERS[m[1].replace(/_/g, '')]) await this.say(SPEAKERS[m[1].replace(/_/g, '')], m[2]);
        else await this.say(null, raw);
      }
      if (this.cancelled) return;
      if (!s.currentChoices.length) break;
      await this.flushGroup();
      await this.ensureOpen();
      hideLine(); this.stage.speaker(null);
      let i = 0;
      if (this.skipping) this.skipping = false; // a choice always waits for the player
      i = await choose(this.prompt, s.currentChoices.map((c, k) => ({ label: c.text.replace(/^"|"$/g, (q) => q), main: k === 0 })));
      this.prompt = '';
      if (this.cancelled) return;
      s.ChooseChoiceIndex(i);
      // remember the player's choices as flags for later chapters
      for (const [k, v] of Object.entries(s.variablesState._globalVariables ? Object.fromEntries(s.variablesState._globalVariables) : {})) save.data.flags[k] = v && v.value !== undefined ? v.value : v;
    }
    if (this.cancelled) return;
    await this.flushGroup();
    hideLine(); this.stage.speaker(null);
    this.done = true;
  }

  async ensureOpen() {
    if (this.stage.curtainOpen >= 1 || this.opening) return this.opening;
    this.opening = this.curtain('open').then(() => { this.opening = null; });
    return this.opening;
  }

  // ---------------------------------------------------------------- lines
  say(id, text) {
    if (this.cancelled) return Promise.resolve();
    const actor = id ? this.stage.actors.get(id) : null;
    this.stage.speaker(actor);
    if (this.skipping) return Promise.resolve();
    const hint = this.linesShown++ < 2 && !save.seen('hint.tap.done') ? t(app.isTouch ? 'hint.tapToContinue' : 'hint.clickToContinue') : null;
    if (this.linesShown >= 3) save.markSeen('hint.tap.done');
    showLine(id ? nameOf(id) : '', text, { colour: actor ? actor.colour : null, hint });
    bus.emit('scene:line', text);
    this.lineActive = true;
    return new Promise((r) => { this.waiting = r; });
  }

  // ---------------------------------------------------------------- directions
  async direct(line) {
    if (this.cancelled) return;
    const sp = line.indexOf(' ');
    const verb = sp < 0 ? line : line.slice(0, sp), rest = sp < 0 ? '' : line.slice(sp + 1);
    const { words, kv, json } = parseArgs(rest);
    const st = this.stage;
    const p = this.verb(verb, words, kv, json, st);
    if (this.group) { if (p) this.group.push(p); return; }
    if (p) await p;
  }

  async flushGroup() { if (!this.group) return; const g = this.group; this.group = null; await Promise.all(g); }

  tween(target, vars) {
    if (this.cancelled) return Promise.resolve();
    return new Promise((resolve) => {
      // a zero-length tween completes inside gsap.to, before `tw` is assigned, so the
      // handler must not depend on it
      let tw = null, finished = false;
      tw = gsap.to(target, { ...vars, onComplete: () => { finished = true; if (tw) this.tweens.delete(tw); resolve(); } });
      if (finished) return;
      this.tweens.add(tw);
      if (this.skipping) tw.progress(1);
    });
  }
  wait(s) { return this.tween({ k: 0 }, { k: 1, duration: s, ease: 'none' }); }

  // positions come from whatever the chapter is shown on (the scene or the old stage)
  offstage(side) { return this.stage.offstage(side); }
  actorAt(id) { return this.stage.actors.get(id); }

  verb(verb, w, kv, json, st) {
    const stageX = (at) => st.x(at), FLOOR = st.floor, ACT = st.act;
    switch (verb) {
      case 'together': this.group = []; return null;
      case 'scene': return this.scene(w[0], w.includes('clear'), kv);
      case 'music': setMood(w[1] || this.kanda, /battle|war/.test(w[0]) ? 'battle' : /grief|dark/.test(w[0]) ? 'grief' : w[0] === 'silence' ? 'silent' : 'calm'); return null;
      case 'cast': {
        const [id, stg] = w[0].split(':');
        st.addActor(id, id, stg, { x: stageX(+w[2]), pose: kv.pose, facing: kv.face === 'left' ? -1 : 1, y: kv.y, scale: kv.scale });
        return null;
      }
      case 'enter': {
        const [id, stg] = w[0].split(':');
        const side = w[w.indexOf('from') + 1] || 'left', to = +w[w.indexOf('to') + 1];
        const a = st.addActor(id, id, stg, { x: this.offstage(side), pose: kv.pose, facing: side === 'left' ? 1 : -1, y: kv.y, scale: kv.scale });
        if (kv.pose) a.hold = kv.pose;
        const dur = w.includes('in') ? +w[w.indexOf('in') + 1] * TEMPO : Math.min(4.5, Math.max(1.4, Math.abs(stageX(to) - a.x) / 120));
        const p = this.tween(a, { x: stageX(to), duration: dur, ease: 'sine.inOut' }).then(() => { if (kv.face) a.fig.facing = kv.face === 'left' ? -1 : 1; });
        return w.includes('nowait') ? null : p;
      }
      case 'exit': {
        const a = this.actorAt(w[0]); if (!a) return null;
        const side = w[w.indexOf('to') + 1] || 'right';
        const x = this.offstage(side);
        const dur = w.includes('in') ? +w[w.indexOf('in') + 1] * TEMPO : Math.min(4.5, Math.max(1.3, Math.abs(x - a.x) / 130));
        const p = this.tween(a, { x, duration: dur, ease: 'sine.in' }).then(() => st.removeActor(w[0]));
        return w.includes('nowait') ? null : p;
      }
      case 'move': {
        const a = this.actorAt(w[0]); if (!a) return null;
        const to = stageX(+w[w.indexOf('to') + 1]);
        a.keepFace = w.includes('keepface');
        const dur = w.includes('in') ? +w[w.indexOf('in') + 1] * TEMPO : Math.min(4, Math.max(0.9, Math.abs(to - a.x) / 120));
        const vars = { x: to, duration: dur, ease: 'sine.inOut' };
        if (kv.y !== undefined) vars.y = FLOOR + kv.y * ACT;
        const p = this.tween(a, vars).then(() => { a.keepFace = false; if (kv.face) a.fig.facing = kv.face === 'left' ? -1 : 1; });
        return w.includes('nowait') ? null : p;
      }
      case 'pose': { const a = this.actorAt(w[0]); if (a) a.setPose(w[1], kv.in ?? 0.7); return null; }
      case 'face': { const a = this.actorAt(w[0]); if (a) a.fig.facing = w[1] === 'left' ? -1 : 1; return null; }
      case 'set': {
        const a = this.actorAt(w[0]); if (!a) return null;
        if (kv.face !== undefined) a.fig.facing = kv.face === -1 || kv.face === 'left' ? -1 : 1;
        if (kv.pose) a.setPose(kv.pose);
        if (kv.alpha !== undefined) return this.tween(a.fig, { alpha: kv.alpha, duration: 0.5 });
        if (kv.y !== undefined) a.y = FLOOR + kv.y * ACT;
        if (kv.scale !== undefined) a.fig.scale = ACT * kv.scale;
        if (kv.visible !== undefined) a.fig.view.visible = !!kv.visible;
        if (kv.at !== undefined) a.x = stageX(kv.at);
        return null;
      }
      case 'prop': {
        if (w[1] === 'remove') { st.removeProp(w[0]); return null; }
        const x = stageX(+w[w.indexOf('at') + 1]);
        const pr = st.addProp(w[0], w[1], x, { state: kv.state, front: kv.front, y: kv.y, dir: kv.dir, colour: kv.colour });
        pr.view.alpha = 0;
        return this.tween(pr.view, { alpha: 1, duration: this.stage.curtainOpen > 0 ? 0.5 : 0.01 });
      }
      case 'curtain': return this.curtain(w[0] || 'open');
      case 'light': return this.light(w[0]);
      case 'look': {
        // on a folded page the light is simply set; on an open one it changes slowly, lamp by lamp
        const from = st.dark; st.setLook(w[0]); const to = st.dark;
        if (st.curtainOpen <= 0 || this.skipping) return null;
        st.dark = from;
        return this.tween(st, { dark: to, duration: 1.6, ease: 'sine.inOut' });
      }
      case 'lamps': st.setLamps(+w[0] || 0); return null;
      case 'strike': return this.strike(w[0], w[1], kv);
      case 'freeze': { const a = this.actorAt(w[0]); if (a && a.freeze) a.freeze(w[1] || a.hold); return null; }
      case 'pan': return this.pan(w, kv);
      case 'gild': { const a = this.actorAt(w[0]); if (a && st.gild && !this.skipping) { st.gild(a, kv.hold ?? 3.5); cue('chime'); } return null; }
      case 'mantra': { const from = this.actorAt(w[0]); const tos = (w[1] || '').split(',').map((k) => this.actorAt(k)).filter(Boolean); if (!this.skipping) { st.mantra(from, tos); cue('chime'); } return this.wait(this.skipping ? 0 : 2.6); }
      case 'wait': return this.wait(+w[0] || 1);
      case 'shake': { if (!this.skipping) this.shake(+w[0] || 3); return null; }
      case 'sound': cue(w[0]); return null;
      case 'title': { const [a, b] = [w.join(' ').split(' / ')[0], w.join(' ').split(' / ')[1]]; this.overlay = { kind: 'title', title: a, sub: b || '', t: 0, dur: 2.6 }; return this.wait(2.6); }
      case 'prompt': this.prompt = w.join(' '); return null;
      case 'battle': return this.battle(w[0], { night: w.includes('night') });
      case 'astra': return this.host.astra(w[0]);
      case 'wash': { this.stage.festive = 14; cue('wash'); return this.wait(1.6).then(() => { this.stage.festive = 1; }); }
      case 'play': case 'heads': { toast('This scene’s game arrives in a later phase', 2.4); return null; }
      case 'clear': st.clearActors(); st.clearProps(); return null;
      default: console.warn('[director] unknown direction', verb); return null;
    }
  }

  async scene(id, clear, kv) {
    const st = this.stage;
    if (this.cancelled) return;
    if (st.curtainOpen <= 0 || this.skipping) {
      // while the page is folded, set the place and leave it folded: it rises with the cast
      // already standing in it, when the first line is spoken
      if (clear) { st.clearActors(); st.clearProps(); }
      st.setCloth(id, kv.style || 'bharni-bright', kv.colour !== false);
      if (this.skipping && st.curtainOpen > 0) st.clothDrop = 1;
      return;
    }
    // the cloth rolls up, the stagehands change it, and it rolls down again
    hideLine(); st.speaker(null);
    cue('clothRoll');
    const fadeActors = clear ? [...st.actors.values()].map((a) => this.tween(a.fig, { alpha: 0, duration: 0.4 })) : [];
    await Promise.all([this.tween(st, { clothDrop: 0, duration: 0.85, ease: 'power2.in' }), ...fadeActors]);
    if (this.cancelled) return;
    if (clear) { st.clearActors(); st.clearProps(); }
    st.setCloth(id, kv.style || 'bharni-bright', kv.colour !== false);
    cue('clothRoll');
    await this.tween(st, { clothDrop: 1, duration: 1.2, ease: 'bounce.out' });
  }

  /** A drum stroke: the camera crashes in on someone, they snap into a pose and hold it. */
  strike(id, pose, kv = {}) {
    const st = this.stage, a = this.actorAt(id);
    if (!a || !('zoom' in st)) { cue('drum'); return null; }
    if (pose) a.freeze(pose);
    cue(kv.sound || 'drum');
    if (this.skipping || app.reducedMotion) return null;
    st.zoomX = a.x - (st.cam + st.panX); st.zoomY = a.y - 120 * (st.act || 1);
    st.tremor = 0;
    const amount = kv.zoom || 1.2;
    return this.tween(st, { zoom: amount, duration: 0.09, ease: 'power4.out' })
      .then(() => this.wait(kv.hold ?? 0.75))
      .then(() => { st.tremor = 1; return this.tween(st, { zoom: 1, duration: 1.1, ease: 'sine.inOut' }); });
  }

  /** A journey: the eye travels slowly across the painted place. pan to <0..1> [in s] | pan home */
  pan(w, kv) {
    const st = this.stage;
    if (!('panX' in st)) return null;
    const home = w[0] === 'home';
    const at = home ? 0.5 : +w[w.indexOf('to') + 1];
    const target = home ? 0 : (st.x(at) - st.x(0.5)) * 0.9;
    const dur = w.includes('in') ? +w[w.indexOf('in') + 1] * TEMPO : 4 * TEMPO;
    st.panning = true; st.camTo = 0;
    const p = this.tween(st, { panX: target, duration: dur, ease: 'sine.inOut' }).then(() => { st.panning = !home; });
    return w.includes('nowait') ? null : p;
  }

  /** The end of a chapter: the picture recedes into the dark before the page folds. */
  pullBack() {
    const st = this.stage;
    if (!('recede' in st) || this.cancelled) return Promise.resolve();
    st.speaker(null);
    return this.tween(st, { recede: 1, duration: 2.2, ease: 'sine.inOut' });
  }

  curtain(which) {
    const st = this.stage, open = which === 'open';
    if ((open && st.curtainOpen >= 1) || (!open && st.curtainOpen <= 0)) return Promise.resolve();
    if (!this.skipping) cue('curtain');
    return this.tween(st, { curtainOpen: open ? 1 : 0, duration: open ? 2.4 : 1.6, ease: open ? 'power2.inOut' : 'power2.in' });
  }

  light(which) {
    const st = this.stage;
    const dark = which === 'dim' ? 0.45 : which === 'night' ? 0.85 : 0;
    const tw = [this.tween(st, { dark, duration: 1.4, ease: 'sine.inOut' })];
    if (st.wash && 'base' in st.wash) tw.push(this.tween(st.wash, { base: which === 'night' ? 0.22 : 0.15, duration: 1.4 }));
    return Promise.all(tw);
  }

  shake(n) {
    const v = this.stage.view; const ox = v.x, oy = v.y;
    const tl = gsap.timeline({ onComplete: () => v.position.set(ox, oy) });
    for (let i = 0; i < 6; i++) tl.to(v, { x: ox + (Math.random() - 0.5) * n * 2, y: oy + (Math.random() - 0.5) * n, duration: 0.04 });
    tl.to(v, { x: ox, y: oy, duration: 0.05 });
  }

  async battle(level, o = {}) {
    await this.flushGroup();
    hideLine(); this.stage.speaker(null);
    this.skipping = false;
    await this.curtain('close');
    if (this.cancelled) return;
    await this.host.battle(level, o);
    if (this.cancelled) return;
    await this.curtain('open');
  }

  // ---------------------------------------------------------------- input
  skip() {
    this.skipping = true;
    for (const tw of [...this.tweens]) tw.progress(1);
    if (this.waiting) { const r = this.waiting; this.waiting = null; this.lineActive = false; hideLine(); r(); }
  }

  update(dt) {
    if (this.overlay) { this.overlay.t += dt; if (this.overlay.t > this.overlay.dur) this.overlay = null; }
    if (!this.lineActive) return;
    tickLine(dt, 40);
    const tapped = input.pointer.justDown || input.consume('confirm') || input.consume('jump') || input.consume('action');
    if (!tapped) return;
    if (lineTyping()) { finishTyping(); return; }
    this.lineActive = false;
    const r = this.waiting; this.waiting = null;
    if (r) r();
  }
}
