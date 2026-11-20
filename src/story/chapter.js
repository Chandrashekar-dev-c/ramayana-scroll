// A chapter: the stage, its director, and the fights it leads to. The stage stays alive
// while a battle plays in the open field, so the play picks up exactly where it left off.
import { app, setMode } from '../core/app.js';
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { line, plate } from '../art/ink.js';
import * as M from '../art/motifs.js';
import { gfx, setScene } from '../gfx/gfx.js';
import { SceneView } from '../stage/scene.js';
import { Director, loadStory } from './director.js';
import { CHAPTERS, chapterById, nextChapter } from './chapters.js';
import { BattleRun } from '../battle/run.js';
import { grade, symbolPoints } from '../battle/astra.js';
import { topbar, touchControls, hideLine, choose, fadeOut, fadeIn, closePanel, panelOpen } from '../ui/dom.js';
import { setMood, cue } from '../audio/music.js';
import { openPause, showWin } from '../ui/screens.js';
import { drawHand } from '../battle/hud.js';

export async function startChapter(id) {
  const ch = chapterById(id);
  const json = await loadStory(id);
  save.data.chapter = id; save.commit();
  setMode('chapter', new ChapterMode(ch, json));
}

class ChapterMode {
  constructor(ch, json) {
    this.ch = ch; this.json = json; this.sub = null; this.astra = null; this.t = 0;
  }
  label() { return t(this.sub ? 'aria.battle' : 'aria.scene'); }

  enter() {
    this.stage = new SceneView();
    setScene(this.stage.view);
    this.stage.setTitle(t(this.ch.title), t('kanda.' + this.ch.kanda));
    this.stage.curtainOpen = 0;
    this.director = new Director(this.ch, this.json, this.stage, {
      battle: (level, o) => this.battle(level, o),
      astra: (symbol) => this.traceAstra(symbol),
    });
    setMood(this.ch.lanka ? 'lanka' : this.ch.kanda, 'calm');
    bus.emit('chapter:start', this.ch);
    this.ui();
    // let the title rest on the folded page a moment, then play
    this.director.wait(1.4).then(() => this.director.run()).then(() => { if (!this.director.cancelled) this.finish(); }).catch((e) => { console.error(e); });
  }

  ui() {
    if (this.sub) { topbar([{ label: '❚❚', aria: t('btn.pause'), on: () => this.pause() }]); touchControls(this.sub.controls); return; }
    topbar([{ label: t('btn.skip'), on: () => this.director.skip() }, { label: '❚❚', aria: t('btn.pause'), on: () => this.pause() }]);
    touchControls(null);
  }

  pause() {
    if (app.paused) return;
    app.paused = true; input.releaseAll();
    openPause({ onResume: () => { app.paused = false; }, onRestart: () => { app.paused = false; if (this.sub) this.sub.restart(); else startChapter(this.ch.id); }, chapter: this.ch });
  }

  // ---------------------------------------------------------------- the open field
  async battle(levelId, o = {}) {
    if (!save.data.difficulty) {
      const opts = ['story', 'normal', 'hard'];
      const i = await choose(t('diff.ask'), opts.map((d) => ({ label: t('diff.' + d), small: t('diff.' + d + '.sub'), main: d === 'normal' })));
      save.data.difficulty = opts[i]; save.commit();
    }
    await fadeOut(380);
    if (this.left) return;
    const run = await BattleRun.create(levelId, { kanda: this.ch.lanka ? 'lanka' : this.ch.kanda, night: !!o.night });
    if (this.left) { fadeIn(300); return; }
    this.sub = run;
    setScene(run.view.view, { vignette: 0.32, grain: 0.22 });
    this.ui();
    setMood(this.ch.lanka ? 'lanka' : this.ch.kanda, 'battle');
    await fadeIn(380);
    await run.finished;
    if (this.left) return;
    await fadeOut(500);
    if (this.left) return;
    this.sub = null;
    run.destroy();
    setScene(this.stage.view);
    this.ui();
    setMood(this.ch.lanka ? 'lanka' : this.ch.kanda, 'calm');
    await fadeIn(500);
  }

  // ---------------------------------------------------------------- an astra on stage
  traceAstra(symbol) {
    hideLine(); this.stage.speaker(null);
    return new Promise((resolve) => {
      this.astra = { symbol, pts: [], t: 0, tracing: false, tries: 0, done: (strength) => {
        this.astra = null; cue('astra');
        this.stage.festive = 20;
        const { x, y } = { x: app.W / 2, y: 340 };
        this.stage.sparks.burst(x, y, 40, { speed: 420, life: 1, size: 8, color: 0xffd36a, blend: 'add', drag: 0.5, g: 80 });
        // the sign's light flows into the prince, and gold leaf rises behind him
        const rama = this.stage.actors.get('rama');
        if (this.stage.bestow) { this.stage.bestow(x, y, rama, 80); this.stage.gild(rama, 3); }
        setTimeout(() => { this.stage.festive = 1; }, 1800);
        resolve(strength);
      } };
      if (this.director.skipping) this.astra.done(0.75);
    });
  }
  updateAstra(dt) {
    const a = this.astra; a.t += dt;
    const p = input.pointer;
    if (save.data.difficulty === 'story' && (p.justDown || input.consume('confirm'))) { a.done(1); return; }
    if (input.consume('astra') || input.consume('confirm')) { a.done(0.75); return; }
    if (p.justDown) { a.tracing = true; a.pts = [[p.x, p.y]]; }
    else if (a.tracing && p.down) { const l = a.pts[a.pts.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) > 4) a.pts.push([p.x, p.y]); }
    if (a.tracing && p.justUp) {
      a.tracing = false;
      const g = grade(a.pts, a.symbol);
      if (g >= 0.4 && a.pts.length >= 10) { a.done(Math.max(0.3, g)); return; }
      a.tries++; a.pts = []; cue('tink');
      if (a.tries >= 3) a.done(0.5);
    }
  }
  drawAstra(ctx) {
    const a = this.astra, cx = app.W / 2, cy = 340, size = 140;
    plate(ctx, t('astra.first') + '\n' + t(app.isTouch ? 'hint.astraTrace' : 'hint.astraTraceMouse'), cx, 136, { size: 21, gap: PAL.indigo });
    const pts = symbolPoints(a.symbol, cx, cy, size);
    // the sign in gold leaf: a dark bed, a gold line that shimmers along its length
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = (w, style) => { ctx.strokeStyle = style; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
    ctx.globalAlpha = 0.55; trace(22, '#2a1810');
    const g = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
    const sh = (a.t * 0.35) % 1;
    g.addColorStop(0, '#9a6a12'); g.addColorStop(Math.max(0, sh - 0.12), '#c8921f'); g.addColorStop(sh, '#fff1b8'); g.addColorStop(Math.min(1, sh + 0.12), '#e6ac17'); g.addColorStop(1, '#9a6a12');
    ctx.globalAlpha = 0.9; trace(10, g);
    for (let i = 0; i < pts.length; i += 4) { const tw = Math.sin(a.t * 4 + i) * 0.5 + 0.5; ctx.globalAlpha = 0.4 + tw * 0.6; ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 1.5 + tw * 1.8, 0, 7); ctx.fill(); }
    ctx.restore();
    M.usableRing(ctx, pts[0][0], pts[0][1], 24, a.t);
    if (a.pts.length > 1) { line(ctx, a.pts, { w: 12, color: '#2a1810', seed: 2, amp: 0, flat: true }); line(ctx, a.pts, { w: 7, color: '#fff1b8', seed: 2, amp: 0, flat: true }); }
    if (app.isTouch && !a.tracing && a.pts.length === 0) drawHand(ctx, pts[0][0] + 10, pts[0][1] + 52, a.t);
  }

  // ---------------------------------------------------------------- loop
  update(dt) {
    this.t += dt;
    if (this.sub) { this.sub.update(dt); return; }
    this.stage.update(dt);
    if (this.astra) { this.updateAstra(dt); input.endTick(); return; }
    this.director.update(dt);
    input.endTick();
  }

  render(ctx) {
    if (this.sub) { this.sub.render(ctx); return; }
    this.stage.sync();
    const o = this.director.overlay;
    if (o && o.kind === 'title') { ctx.save(); ctx.globalAlpha = Math.min(1, o.t * 3, (o.dur - o.t) * 3); plate(ctx, o.title + (o.sub ? '\n' + o.sub : ''), app.W / 2, 300, { size: 34, font: '"Yatra One", serif', padX: 34, padY: 16, gap: PAL.madder }); ctx.restore(); }
    if (this.astra) this.drawAstra(ctx);
  }

  resize() { if (this.stage && !this.sub) { this.stage.rebuild(); } }

  // ---------------------------------------------------------------- the end
  async finish() {
    if (this.left) return;
    hideLine();
    await this.director.pullBack();
    await this.director.curtain('close');
    topbar(null); touchControls(null);
    save.data.done[this.ch.id] = true;
    const nxt = nextChapter(this.ch.id);
    save.data.chapter = nxt ? nxt.id : null;
    save.commit();
    bus.emit('chapter:end', { id: this.ch.id });
    showWin({ ch: this.ch, next: nxt });
  }

  exit() {
    this.left = true;
    this.director.cancel();
    if (this.astra) this.astra = null;
    if (panelOpen()) closePanel();
    hideLine(); topbar(null); touchControls(null);
    if (this.sub) { this.sub.destroy(); this.sub.resolve(); this.sub = null; }
    this.stage.destroy();
  }
}

export { CHAPTERS };
