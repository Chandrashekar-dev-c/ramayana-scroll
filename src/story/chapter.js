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
import { StageView } from '../stage/stage.js';
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
    this.stage = new StageView();
    setScene(this.stage.view);
    this.stage.setTitle(t(this.ch.title), t('kanda.' + this.ch.kanda));
    this.stage.curtainOpen = 0;
    this.director = new Director(this.ch, this.json, this.stage, {
      battle: (level) => this.battle(level),
      astra: (symbol) => this.traceAstra(symbol),
    });
    setMood(this.ch.lanka ? 'lanka' : this.ch.kanda, 'calm');
    bus.emit('chapter:start', this.ch);
    this.ui();
    // let the title hang on the curtain a moment, then play
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
  async battle(levelId) {
    if (!save.data.difficulty) {
      const opts = ['story', 'normal', 'hard'];
      const i = await choose(t('diff.ask'), opts.map((d) => ({ label: t('diff.' + d), small: t('diff.' + d + '.sub'), main: d === 'normal' })));
      save.data.difficulty = opts[i]; save.commit();
    }
    await fadeOut(380);
    if (this.left) return;
    const run = await BattleRun.create(levelId, { kanda: this.ch.lanka ? 'lanka' : this.ch.kanda });
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
        const { x, y } = { x: app.W / 2, y: 330 };
        this.stage.sparks.burst(x, y, 60, { speed: 520, life: 1.2, size: 9, color: 0xffd36a, blend: 'add', drag: 0.5, g: 120 });
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
    ctx.save(); ctx.globalAlpha = 0.85;
    line(ctx, pts, { w: 18, color: PAL.black, smooth: false, seed: 1, amp: 0, flat: true });
    ctx.setLineDash([2, 18]); line(ctx, pts, { w: 11, color: PAL.turmeric, seed: 1, amp: 0, flat: true }); ctx.setLineDash([]);
    ctx.restore();
    M.usableRing(ctx, pts[0][0], pts[0][1], 24, a.t);
    if (a.pts.length > 1) { line(ctx, a.pts, { w: 10, color: PAL.black, seed: 2, amp: 0, flat: true }); line(ctx, a.pts, { w: 6, color: PAL.turmeric, seed: 2, amp: 0, flat: true }); }
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
