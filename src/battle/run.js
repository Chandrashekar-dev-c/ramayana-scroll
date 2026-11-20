// One fight in the open field: the battle model (unchanged rules from the original game),
// its GPU view and its ink layer, with retry from the last checkpoint.
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { save } from '../core/save.js';
import { t, has } from '../core/i18n.js';
import { setScene } from '../gfx/gfx.js';
import { createBattle, updateBattle, renderBattleInk } from './battle.js';
import { enemyBoxes } from './enemies.js';
import { BattleView } from './view.js';
import { showFail } from '../ui/screens.js';
import { dimControlsOver } from '../ui/dom.js';
import { setMood, cue } from '../audio/music.js';

const levels = import.meta.glob('../data/levels/*.json');
export async function loadLevel(id) {
  const f = levels[`../data/levels/${id}.json`];
  if (!f) throw new Error('No level ' + id);
  const m = await f(); return m.default || m;
}

export class BattleRun {
  static async create(levelId, o = {}) { return new BattleRun(await loadLevel(levelId), o); }

  constructor(level, o = {}, cp = null) {
    this.level = level; this.o = o;
    this.controls = ['left', 'right', 'draw', 'jump', 'roll'];
    this.finished = new Promise((r) => { this.resolve = r; });
    this.start(cp);
  }

  start(cp) {
    this.b = createBattle(this.level, { kanda: this.o.kanda, seed: app.seed, checkpoint: cp, hp: cp ? cp.hp : undefined, boon: cp ? cp.boon : 0 });
    this.view = new BattleView(this.b);
    this.shake = { x: 0, y: 0 };
    this.lastMood = null;
  }

  restart() {
    const cp = this.b.savedCheckpoint || null;
    const old = this.view;
    this.start(cp);
    setScene(this.view.view, { vignette: 0.32, grain: 0.22 });
    old.destroy();
  }

  update(dt) {
    const b = this.b;
    if (b.outcome === 'win' || b.outcome === 'shown') { input.endTick(); return; }
    updateBattle(b, dt);
    this.view.update(dt);
    if (b.mood !== this.lastMood) { this.lastMood = b.mood; if (b.mood === 'boss') setMood(this.o.kanda, 'boss'); }
    if (b.outcome === 'win') { this.resolve(); }
    else if (b.outcome === 'lose') {
      b.outcome = 'shown';
      input.releaseAll(); cue('fail');
      showFail({ title: t(b.loseKey || 'lose.default'), tip: this.tip(), onRetry: () => this.restart() });
    }
    input.endTick();
  }

  tip() {
    const b = this.b, lv = b.level.tips && b.level.tips[b.loseTip];
    if (lv) return t(lv);
    const k = { jump: 'tip.jump', roll: 'tip.roll', move: 'tip.move', shoot: 'tip.shoot', kick: 'tip.kick' }[b.loseTip];
    return t(k && has(k) ? k : 'tip.general');
  }

  render(ctx) {
    const b = this.b;
    if (b.shakeT > 0 && b.shakeA > 0) { this.shake.x = (Math.random() - 0.5) * b.shakeA * 2.2; this.shake.y = (Math.random() - 0.5) * b.shakeA * 2.2; } else { this.shake.x = 0; this.shake.y = 0; }
    this.view.sync(this.shake);
    renderBattleInk(ctx, b, this.shake);
    // dim any touch button with an enemy behind it
    if (app.isTouch && app.frame % 6 === 0) {
      const rects = [];
      for (const e of b.enemies) if (!e.dead && !e.dying) { const bx = enemyBoxes(e).body; rects.push({ x: (bx.x - b.camX) * b.zoom, y: 548 + (bx.y - 548) * b.zoom, w: bx.w * b.zoom, h: bx.h * b.zoom }); }
      dimControlsOver(rects);
    }
  }

  destroy() { this.view.destroy(); }
}
