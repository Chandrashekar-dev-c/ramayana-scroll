// Battle mode: arenas, waves, checkpoints, a boss, and the land healing at the end.
// The battle object `b` is the one shared state that hero, enemies, bosses and the HUD read.
import tuning from '../data/tuning.json';
import { app } from '../core/app.js';
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { Rng } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { character } from '../art/figures.js';
import { isNight, regrowList } from '../art/backdrops.js';
import { shape, line, hatch, ellipsePts, dots } from '../art/ink.js';
import * as M from '../art/motifs.js';
import { createHero, updateHero, drawHero } from './hero.js';
import { spawnEnemy, updateEnemies, drawEnemy, enemyBoxes } from './enemies.js';
import { createBoss, updateBoss, drawBoss, bossBoxes, hitBoss, damageBoss } from './bosses.js';
import { drawHud, sunRect } from './hud.js';
import { grade } from './astra.js';

const inBox = (x, y, bx) => x >= bx.x && x <= bx.x + bx.w && y >= bx.y && y <= bx.y + bx.h;

const TEACH = {
  jump: { key: 'hint.jump', button: 'jump' },
  roll: { key: 'hint.roll', button: 'roll' },
  shootUp: { key: 'hint.shootUp', button: 'draw' },
  shield: { key: 'hint.shield', button: 'roll' },
  climber: { key: 'hint.climber', button: null },
  stomp: { key: 'hint.stomp', button: 'jump' },
};

export function createBattle(level, opts = {}) {
  const diffName = save.data.difficulty || 'normal';
  const b = {
    level, kanda: opts.kanda || 'bala', tun: tuning, diffName, diff: tuning.difficulty[diffName],
    rng: new Rng((opts.seed || 1) + ':' + level.id + ':' + (opts.checkpoint ? opts.checkpoint.step : 0)),
    time: 0, enemies: [], bosses: [], arrows: [], shots: [], zones: [], fx: [], allies: [], targets: [],
    stats: { kills: 0, headshots: 0, shots: 0, hits: 0, time: opts.prevTime || 0 },
    arena: 0, step: -1, stepT: 0, spawnQueue: [], waveTotal: 0, waveDone: 0, objective: null, hint: null, line: null, banner: null,
    camX: 0, zoom: 1, shakeT: 0, shakeA: 0, hitStop: 0, slowT: 0, slow: 1, boon: opts.boon || 0, boonOn: !!level.astras,
    astra: null, outcome: null, healT: -1, ending: null, mood: null, gust: null, goRight: false, checkpoints: [], cpIndex: opts.checkpoint ? opts.checkpoint.step : -1,
    night: isNight(level.backdrop), teachDone: {}, pride: save.data.pride || 0, protect: null, protected: null, timer: null, frozenInput: false,
    allyHurtFlag: false, protectTouched: false, onEnd: opts.onEnd,
  };
  b.hero = createHero(b, { ...level.hero, start: 0 });
  const startArena = opts.checkpoint ? opts.checkpoint.arena : 0;
  b.arena = startArena;
  const A = level.arenas[startArena];
  b.bounds = { left: A.left, right: A.right };
  b.hero.x = opts.checkpoint ? opts.checkpoint.x : A.left + 220;
  if (opts.hp && diffName !== 'story') b.hero.hp = Math.max(Math.round(b.hero.maxHp * 0.5), Math.min(b.hero.maxHp, opts.hp + b.hero.maxHp * tuning.hero.checkpointHeal));
  b.step = opts.checkpoint ? opts.checkpoint.stepInArena : -1;
  // each ally stands a little further back than the last, so two of them (e.g. Lakshmana and Sita) don't overlap
  for (const a of level.allies || []) b.allies.push({ ...a, spec: character(a.id, a.stage), lane: b.allies.length * 52, x: b.hero.x - 90 - b.allies.length * 52, y: GROUND, fireT: 1 + b.allies.length, facing: 1, walkT: 0, shootAnim: 0 });
  if (level.protect) b.protect = { ...level.protect, hp: level.protect.hp, max: level.protect.hp };
  if (level.protected) b.protected = { ...level.protected, spec: character(level.protected.id, level.protected.stage), hurt: false };
  if (!opts.checkpoint && level.title) b.banner = { title: t(level.title), sub: level.kandaTitle ? t(level.kandaTitle) : '', t: 2.4 };
  else if (opts.checkpoint) b.stepT = 0.6;
  installApi(b);
  // trees that come back to life when the boss falls (Tataka's wasteland, the Dandaka forest...)
  if (level.regrow) {
    const lo = Math.min(...level.arenas.map((a) => a.left)) - 900, hi = Math.max(...level.arenas.map((a) => a.right)) + 900;
    b.regrow = regrowList(level.backdrop, lo, hi).map((tr) => ({ ...tr, grow: 0, start: null, cued: false }));
  }
  b.camX = b.hero.x - app.W * tuning.feel.heroScreenX;
  return b;
}

function installApi(b) {
  b.view = () => ({ left: b.camX, right: b.camX + app.W / b.zoom });
  b.toWorld = (sx, sy) => ({ x: b.camX + sx / b.zoom, y: GROUND + (sy - GROUND) / b.zoom });
  b.toScreen = (x, y) => ({ x: (x - b.camX) * b.zoom, y: GROUND + (y - GROUND) * b.zoom });
  b.foes = function* () {
    for (const e of b.enemies) if (!e.dead && !e.dying) yield e;
    for (const q of b.bosses) if (!q.dead && !q.dying && !q.hidden) yield { x: q.x, y: q.y, boss: q };
    for (const q of b.targets) if (!q.hit) yield { x: q.x, y: GROUND, practice: q };
  };
  b.boxesOf = (e) => enemyBoxes(e); // for the hitbox view and the squint test
  b.headOf = (e) => {
    if (e.practice) return { x: e.practice.x, y: e.practice.y };
    if (e.boss) { const bx = bossBoxes(b, e.boss).find((x) => x.weak) || bossBoxes(b, e.boss)[0]; return { x: bx.x + bx.w / 2, y: bx.y + bx.h / 2 }; }
    const h = enemyBoxes(e).head; return { x: h.x + h.w / 2, y: h.y + h.h / 2 };
  };
  b.saveSeen = (k) => save.seen(k);
  b.markSeen = (k) => save.markSeen(k);
  b.say = (key, dur = 3) => { b.line = { text: t(key), t: dur }; bus.emit('scene:line', key); };
  b.label = (x, y, key) => b.fx.push({ kind: 'label', x, y, text: t(key), t: 0, dur: 1.4 });
  b.burst = (x, y, color, n = 10) => b.fx.push({ kind: 'burst', x, y, color, n, t: 0, dur: 0.4, seed: Math.floor(b.rng.next() * 999) });
  b.tink = (x, y) => { b.fx.push({ kind: 'tink', x, y, t: 0, dur: 0.3 }); bus.emit('cue', 'tink'); };
  b.shake = (a) => { if (save.data.settings.reducedMotion) a *= 0.3; b.shakeT = 0.25; b.shakeA = Math.max(b.shakeA, a); };
  b.addBoon = (n) => {
    if (!b.boonOn) return;
    const was = b.boon; b.boon = Math.min(b.tun.boon.max, b.boon + n);
    if (was < b.tun.boon.max && b.boon >= b.tun.boon.max) { bus.emit('astra:ready'); if (!save.seen('hint.astraReady') && b.level.astras) { showHint(b, 'hint.astraReady', null, 2.4); save.markSeen('hint.astraReady'); } }
  };
  b.telegraph = (who, kind, answer) => {
    const snd = { star: who.def && who.def.sound ? who.def.sound.telegraph : 'starBell', lotusOpen: 'stompWarn', dustLine: 'dustRush', redPath: 'bowCreak', shadowStar: 'vanish', nagaCoil: 'hiss', flameTongue: 'fireWhoosh', inhale: 'gust', redHatchCircle: 'starLow', bannerRaise: 'horn' }[kind];
    bus.emit('enemy:telegraph', who.def && who.def.sound && kind !== 'lotusOpen' ? who.def.sound.telegraph : snd);
    const step = b.level.arenas[b.arena].steps[b.step];
    let teach = null;
    if (kind === 'lotusOpen') teach = 'stomp';
    else if (step && step.teach === answer) teach = answer;
    if (teach && !b.teachDone[teach] && (!save.seen('teach.' + teach) || b.teachFails[teach] >= 2)) {
      b.teachDone[teach] = true; save.markSeen('teach.' + teach);
      b.slowT = b.tun.feel.teachTime; b.slow = b.tun.feel.teachSlow;
      showHint(b, TEACH[teach].key, TEACH[teach].button, 1.8);
    }
  };
  b.teachFails = {};
  b.kickEnemy = (e, dir) => {
    bus.emit('cue', 'kick');
    if (e.def.custom) return;
    e.stun = 0.5; e.vx = dir * b.tun.hero.kickKnock * (e.def.climbs ? 3 : 1); e.state = 'approach'; e.t = 0;
    damageEnemy(b, e, b.tun.hero.kickDamage, false, true);
  };
  b.killEnemy = (e, how) => {
    if (e.dying) return;
    e.dying = true; e.t = 0; e.hp = 0;
    if (!e.illusion) { b.stats.kills++; b.addBoon(b.tun.boon.perKill); }
    bus.emit('enemy:die', { type: e.type, how });
  };
  b.hurtHero = (dmg, fromX, answer, kind) => {
    const h = b.hero;
    if (h.dead || h.inv > 0 || b.outcome || b.healT >= 0 || (app.dev && app.dev.god)) return;
    if (h.rollInv > 0 && kind !== 'wave' && kind !== 'stomp' && kind !== 'charge') return;
    const amount = Math.max(1, Math.round(dmg * b.diff.damageTaken));
    h.hp -= amount; h.inv = b.tun.hero.hurtInvulnerable; h.hurtAnim = 0.3;
    h.vx = 0; h.x += Math.sign(h.x - fromX || 1) * 26;
    b.stats.hits++; b.shake(3); b.lastHurt = answer;
    if (answer) b.teachFails[answer] = (b.teachFails[answer] || 0) + 1;
    bus.emit('hero:hurt', { amount, kind });
    if (h.hp <= 0) {
      if (!b.diff.restart) { h.hp = h.maxHp; b.label(h.x, h.y - 200, 'story.restored'); return; }
      h.hp = 0; h.dead = true; h.deadT = 0; b.loseTip = b.lastHurt; b.lose('lose.default');
    }
  };
  b.damageProtect = (dmg) => {
    if (!b.protect || b.outcome) return;
    b.protect.hp = Math.max(0, b.protect.hp - Math.max(1, Math.round(dmg / 10))); b.protectTouched = true;
    b.fx.push({ kind: 'burst', x: b.protect.x, y: GROUND - 60, color: PAL.kusum, n: 8, t: 0, dur: 0.4, seed: 3 });
    if (b.protect.hp <= 0) b.lose(b.protect.fail || 'lose.fire');
  };
  b.allyHurt = () => { if (b.protected && !b.outcome) { b.protected.hurt = true; b.allyHurtFlag = true; b.lose('lose.sita'); } };
  b.lose = (key) => { if (b.outcome) return; b.loseKey = key; b.loseDelay = 1.1; };
  b.requestAstra = (symbol, key, cb) => startAstra(b, symbol, key, cb, true);
  b.onBossDown = (boss) => { b.lastBossX = boss.x; };
  b.waveProgress = () => {
    const total = b.level.arenas.reduce((n, a) => n + a.steps.length, 0);
    let done = 0; for (let i = 0; i < b.arena; i++) done += b.level.arenas[i].steps.length;
    return Math.min(1, (done + Math.max(0, b.step)) / Math.max(1, total));
  };
}

function showHint(b, key, button, dur = 2) {
  const k = button === 'draw' && input.device === 'mouse' ? key + '.mouse' : key;
  const text = t(k === key || !k.endsWith('.mouse') ? key : k);
  b.hint = { text: text === k ? t(key) : text, t: dur, hand: app.isTouch ? button : null };
  bus.emit('hint', { button, dur });
}

function damageEnemy(b, e, dmg, head, kick) {
  if (e.dying || e.dead) return;
  e.hp -= dmg; e.hitFlash = 0.1;
  if (!kick) { e.x += Math.sign(e.x - b.hero.x || 1) * b.tun.feel.knockback; }
  if (e.illusion) { b.burst(e.x, e.y - 80, PAL.grey, 10); e.dying = true; e.t = 0.3; return; }
  if (e.hp <= 0) b.killEnemy(e, head ? 'head' : 'body');
}

// ---------------------------------------------------------------- astras
function startAstra(b, symbol, key, cb, forced) {
  if (b.astra) return;
  b.astra = { symbol, key, cb, forced, pts: [], t: 0, tracing: false };
  input.releaseAll();
  bus.emit('astra:start');
}

function fireAstra(b, strength) {
  const a = b.astra; b.astra = null;
  bus.emit('astra:fire', { strength });
  b.fx.push({ kind: 'astra', t: 0, dur: 0.9, symbol: a.symbol, strength });
  b.shake(6);
  if (!a.forced) b.boon = 0;
  if (a.cb) { a.cb(strength); return; }
  const dmg = b.tun.boon.astraDamage * (0.4 + strength * 0.6);
  for (const e of b.enemies) if (!e.dead && !e.dying) damageEnemy(b, e, dmg, false);
  for (const q of b.bosses) if (!q.dead && !q.dying) damageBoss(b, q, b.tun.boon.astraBossDamage * (0.4 + strength * 0.6));
}

function updateAstra(b, dt) {
  const a = b.astra;
  a.t += dt;
  const p = input.pointer;
  if (b.diffName === 'story') { if (p.justDown || input.consume('astra') || input.consume('confirm') || input.consume('jump')) fireAstra(b, 1); return; }
  if (input.consume('astra') || input.consume('confirm')) { fireAstra(b, 0.75); return; }
  if (p.justDown) { a.tracing = true; a.pts = [[p.x, p.y]]; }
  else if (a.tracing && p.down) { const l = a.pts[a.pts.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) > 4) a.pts.push([p.x, p.y]); }
  if (a.tracing && p.justUp) { const g = grade(a.pts, a.symbol); a.tracing = false; if (g >= 0.4 && a.pts.length >= 10) { fireAstra(b, Math.max(0.3, g)); return; } a.pts = []; }
  if (a.t > b.tun.boon.traceTime) fireAstra(b, 0.3);
}

// ---------------------------------------------------------------- steps
function arenaSteps(b) { return b.level.arenas[b.arena].steps; }

function nextStep(b) {
  const steps = arenaSteps(b);
  b.step++; b.stepT = 0;
  if (b.step >= steps.length) {
    if (b.arena + 1 < b.level.arenas.length) { b.objective = null; b.walking = true; b.bounds.right = b.level.arenas[b.arena + 1].right; b.goRight = true; return; }
    finish(b); return;
  }
  const s = steps[b.step];
  if (s.wave) {
    b.objective = s.wave; b.waveDone = 0; b.waveTotal = 0; b.spawnQueue = [];
    const extra = b.diff.extraSpawn || 0;
    let tAcc = 0.4, i = 0;
    for (const g of s.groups) {
      const n = g.n + (g.type !== 'brute' && g.type !== 'elephant' ? extra : 0) - (b.diffName === 'story' && g.n > 2 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const side = g.side === 'both' ? (k % 2 ? 'left' : 'right') : g.side || 'right';
        b.spawnQueue.push({ at: tAcc + (g.delay || 0), type: g.type, side, target: g.target, i: i++ });
        tAcc += g.gap ?? 1.4;
      }
    }
    b.waveTotal = b.spawnQueue.length; b.waveSpawned = 0;
    if (s.teach === 'shield' || s.teach === 'climber' || s.teach === 'shootUp') b.pendingTeach = s.teach;
  } else if (s.checkpoint !== undefined) {
    const x = s.x ?? Math.min(b.bounds.right - 80, b.hero.x + 140);
    b.checkpoints.push({ x, t: 0 });
    const counts = !(b.diff.bossCheckpointOnly && !(arenaSteps(b)[b.step + 1] && arenaSteps(b)[b.step + 1].boss));
    if (counts) { b.cpIndex = b.step; b.savedCheckpoint = { arena: b.arena, stepInArena: b.step, step: b.step + b.arena * 100, x: Math.min(x, b.hero.x + 40), hp: b.hero.hp, boon: b.boon }; }
    b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + Math.round(b.hero.maxHp * b.tun.hero.checkpointHeal));
    bus.emit('checkpoint', b.savedCheckpoint);
    if (s.checkpoint) b.say(s.checkpoint);
    b.stepT = 0; b.cpWait = 1.2;
  } else if (s.boss || s.bosses) {
    const ids = s.bosses || [s.boss];
    b.objective = s.objective || null; b.waveTotal = 0;
    ids.forEach((id, k) => { const q = createBoss(b, id, s.x ?? Math.min(b.bounds.right - 220, b.hero.x + 620) + k * 180); b.bosses.push(q); });
    b.zoom = Math.min(...b.bosses.map((q) => q.def.zoom || 1));
    if (s.intro) b.banner = { title: t(s.intro), sub: t(b.bosses[0].def.rule), t: 2.6 };
    bus.emit('boss:intro', ids[0]);
    b.mood = 'boss';
  } else if (s.say) { b.say(s.say, s.dur || 3); b.cpWait = s.wait ?? 1.6; }
  else if (s.targets) {
    b.objective = s.objective; b.waveTotal = s.targets.length; b.waveDone = 0;
    b.targets = s.targets.map((q, k) => ({ ...q, hit: false, k, standT: 0 }));
    if (s.hint) showHint(b, s.hint, 'draw', s.hintDur || 4);
  } else if (s.teachAstra) {
    b.boonOn = true; b.boon = b.tun.boon.max;
    startAstra(b, s.teachAstra, s.key || 'astra.first', () => { b.boon = 0; b.say(s.after || 'astra.learned'); }, true);
  } else if (s.timer) { b.timer = { t: 0, dur: s.timer.dur, label: s.timer.label, fail: s.timer.fail }; }
}

function stepDone(b) {
  const s = arenaSteps(b)[b.step];
  if (!s) return false;
  if (s.wave) return b.spawnQueue.length === 0 && !b.enemies.some((e) => !e.dead && !e.dying && !e.illusion);
  if (s.checkpoint !== undefined || s.say) return b.stepT >= (b.cpWait || 1);
  if (s.boss || s.bosses) return b.bosses.every((q) => q.dead);
  if (s.targets) return b.targets.every((q) => q.hit);
  if (s.teachAstra) return !b.astra && b.stepT > 1.2;
  if (s.timer) return true;
  return true;
}

function finish(b) {
  b.objective = null; b.goRight = false; b.timer = null;
  for (const e of b.enemies) if (!e.dead && !e.dying) b.killEnemy(e, 'end');
  b.healX = (b.lastBossX ?? b.hero.x) * b.zoom;
  b.healSpeed = 760;
  b.healDur = 3.2;
  if (b.regrow) {
    // life spreads outward from where the boss fell, one tree after another
    let far = 0;
    for (const tr of b.regrow) { tr.start = Math.abs(tr.x - b.healX) / b.healSpeed; if (tr.start < 3.4) far = Math.max(far, tr.start); }
    b.healDur = Math.max(3.2, far + 1);
  }
  if (b.level.heal) { b.healT = 0; bus.emit('cue', 'wash'); b.mood = null; }
  b.ending = { lines: b.level.end || [], i: 0, t: b.level.heal ? -b.healDur : -0.6 };
}

// ---------------------------------------------------------------- update
export function updateBattle(b, dt) {
  if (b.outcome) return;
  // overlays that pause the fight
  if (b.loseDelay !== undefined) { b.loseDelay -= dt; b.hero.deadT = (b.hero.deadT || 0) + dt; if (b.loseDelay <= 0) b.outcome = 'lose'; updateFx(b, dt); return; }
  if (b.astra) { updateAstra(b, dt); input.endTick(); return; }
  if (b.slowT > 0) { b.slowT -= dt; dt *= b.slow; }
  if (b.hitStop > 0) { b.hitStop -= dt; updateFx(b, dt); return; }
  b.time += dt; b.stats.time += dt;
  for (const k of ['hint', 'line']) if (b[k]) { b[k].t -= dt; if (b[k].t <= 0) b[k] = null; }
  if (b.banner) { b.banner.t -= dt; if (b.banner.t <= 0) b.banner = null; }

  // the astra ring on the HUD sun, or the astra key
  if (b.level.astras && b.boon >= b.tun.boon.max && !b.ending) {
    const s = sunRect(), p = input.pointer;
    if (input.consume('astra') || (p.justDown && Math.hypot(p.x - s.x, p.y - s.y) < 48)) { startAstra(b, b.level.astraSymbol || 'sun', 'astra.ready'); input.endTick(); return; }
  }

  // steps
  if (!b.banner || b.step >= 0) {
    b.stepT += dt;
    if (b.step < 0) { if (!b.banner) nextStep(b); }
    else if (b.walking) {
      const next = b.level.arenas[b.arena + 1];
      if (b.hero.x > next.left + 180) { b.walking = false; b.goRight = false; b.arena++; b.bounds.left = next.left; b.step = -1; nextStep(b); }
    } else if (!b.ending && stepDone(b)) nextStep(b);
  }
  // spawns
  if (b.spawnQueue.length) {
    b.spawnT = (b.spawnT || 0) + dt;
    while (b.spawnQueue.length && b.spawnQueue[0].at <= b.stepT) {
      const q = b.spawnQueue.shift();
      const e = spawnEnemy(b, q.type, q.side, { i: 0, target: q.target });
      b.waveSpawned++;
      if (b.pendingTeach && ((b.pendingTeach === 'shield' && e.def.blocksFront) || (b.pendingTeach === 'climber' && e.def.climbs) || (b.pendingTeach === 'shootUp' && e.def.flies))) {
        const tch = b.pendingTeach; b.pendingTeach = null;
        if (!save.seen('teach.' + tch)) { save.markSeen('teach.' + tch); b.slowT = b.tun.feel.teachTime * 1.4; b.slow = b.tun.feel.teachSlow; showHint(b, TEACH[tch].key, TEACH[tch].button, 2.4); }
      }
    }
  }
  b.waveDone = b.waveTotal ? Math.max(0, b.waveSpawned - b.enemies.filter((e) => !e.dead && !e.dying && !e.illusion).length) : 0;
  if (arenaSteps(b)[b.step] && arenaSteps(b)[b.step].targets) b.waveDone = b.targets.filter((q) => q.hit).length;

  updateHero(b, dt);
  if (b.gust) { b.gust.t -= dt; b.hero.x += b.gust.dir * 420 * dt; if (b.gust.t <= 0) b.gust = null; }
  updateEnemies(b, dt);
  for (const q of b.bosses) updateBoss(b, q, dt);
  updateAllies(b, dt);
  updateArrows(b, dt);
  updateShots(b, dt);
  updateZones(b, dt);
  updateFx(b, dt);
  if (b.timer && !b.ending) { b.timer.t += dt; if (b.timer.t >= b.timer.dur) b.lose(b.timer.fail || 'lose.timer'); }
  if (b.shakeT > 0) { b.shakeT -= dt; if (b.shakeT <= 0) b.shakeA = 0; }
  for (const c of b.checkpoints) c.t += dt;

  // the ending: land heals, last lines, then win
  if (b.ending) {
    if (b.healT >= 0) b.healT += dt;
    if (b.regrow && b.healT >= 0) for (const tr of b.regrow) {
      const k = (b.healT - tr.start) / 0.8;
      tr.grow = Math.max(0, Math.min(1, k));
      if (k > 0 && !tr.cued && tr.start < 3.4) { tr.cued = true; bus.emit('cue', 'grow'); }
    }
    b.ending.t += dt;
    const e = b.ending;
    if (e.t >= 0) {
      if (e.i < e.lines.length) { if (!b.line) { b.say(e.lines[e.i], 2.6); e.i++; } }
      else if (!b.line) { b.outcome = 'win'; }
    }
  }
  updateCamera(b, dt);
  input.endTick();
}

function updateCamera(b, dt) {
  const h = b.hero, W = app.W / b.zoom;
  let target = h.x - W * (b.bosses.length ? 0.3 : b.tun.feel.heroScreenX) + h.vx * b.tun.feel.cameraLead;
  const live = b.bosses.find((q) => !q.dead);
  if (live) {
    // keep the whole boss and a hero's width ahead of it on screen
    const lo = Math.min(h.x, live.x) - 160, hi = Math.max(h.x, live.x) + 220 + live.U * 0.4;
    target = Math.max(hi - W, Math.min(lo, target));
  }
  const lo = b.walking ? b.bounds.left - 100 : b.bounds.left - 60, hi = b.bounds.right + 60 - W;
  target = Math.max(lo, Math.min(Math.max(lo, hi), target));
  b.camX += (target - b.camX) * Math.min(1, dt * 6);
}

function updateAllies(b, dt) {
  const h = b.hero;
  for (const a of b.allies) {
    a.shootAnim -= dt;
    const want = h.x - h.facing * (b.tun.ally.follow + (a.lane || 0));
    const dx = want - a.x;
    if (Math.abs(dx) > 30 && !a.fixed) { a.x += Math.sign(dx) * Math.min(Math.abs(dx) * 3, 240) * dt; a.walkT += dt; } else a.walkT = 0;
    if (!a.fire) continue;
    a.fireT -= dt;
    if (a.fireT <= 0) {
      a.fireT = b.tun.ally.fireEvery;
      let best = null, bd = 1e9;
      for (const e of b.enemies) if (!e.dead && !e.dying && !e.illusion) { const d = Math.abs(e.x - a.x); if (d < bd && d < 900) { bd = d; best = e; } }
      let tx = null;
      if (best) tx = { x: best.x, y: enemyBoxes(best).body.y + 30 };
      else { const q = b.bosses.find((x) => !x.dead && !x.dying && !x.hidden && !x.def.passive); if (q) { const bx = bossBoxes(b, q); const box = bx[bx.length - 1]; tx = { x: box.x + box.w / 2, y: box.y + box.h / 2 }; } }
      if (!tx) continue;
      a.facing = tx.x >= a.x ? 1 : -1; a.shootAnim = 0.25;
      const ox = a.x + a.facing * 30, oy = GROUND - 118, ang = Math.atan2(tx.y - oy, tx.x - ox), sp = 1250;
      b.arrows.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, g: 200, power: 0.5, full: false, dmg: b.tun.ally.damage, pierce: 0, hit: new Set(), life: 2, stuck: 0, own: false, ally: true });
      bus.emit('cue', 'shoot');
    }
  }
}

function updateArrows(b, dt) {
  for (const a of b.arrows) {
    if (a.stuck > 0) { a.stuck -= dt; continue; }
    a.life -= dt;
    const px = a.x, py = a.y;
    a.vy += a.g * dt; a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.y >= GROUND - 2) { a.y = GROUND - 2; a.stuck = 0.6; a.life = 0; continue; }
    // practice targets
    for (const q of b.targets) {
      if (a.hit.has(q)) continue;
      if (Math.hypot(a.x - q.x, a.y - q.y) < (q.r || 34)) {
        a.hit.add(q); if (!q.hit) { q.hit = true; b.burst(q.x, q.y, PAL.turmeric, 12); bus.emit('arrow:hit', { head: true }); }
        if (a.pierce-- <= 0) { a.stuck = 0.6; a.life = 0; }
        break;
      }
    }
    if (a.life <= 0) continue;
    // enemies
    for (const e of b.enemies) {
      if (e.dead || e.dying || a.hit.has(e)) continue;
      const bx = enemyBoxes(e);
      const head = inBox(a.x, a.y, bx.head) || segBox(px, py, a.x, a.y, bx.head);
      const body = !head && (inBox(a.x, a.y, bx.body) || segBox(px, py, a.x, a.y, bx.body));
      const flag = bx.banner && inBox(a.x, a.y, bx.banner);
      if (!head && !body && !flag) continue;
      a.hit.add(e);
      if (e.def.blocksFront && !flag && Math.sign(a.vx) === -e.facing && e.state !== 'windup' && e.stun <= 0) { b.tink(a.x, a.y); a.life = 0; break; }
      let dmg = a.dmg;
      if (head) dmg *= b.tun.bow.headMultiplier;
      if (flag) dmg *= 3;
      if (e.def.custom === 'elephant' && !head) dmg *= 0.5;
      if (head && a.own) { b.stats.headshots++; b.addBoon(b.tun.boon.perHeadshot); } else if (a.own) b.addBoon(b.tun.boon.perHit);
      b.burst(a.x, a.y, head ? PAL.turmeric : PAL.white, head ? 12 : 7);
      bus.emit('arrow:hit', { head });
      damageEnemy(b, e, dmg, head);
      if (!a.ally) b.hitStop = b.tun.feel.hitPause;
      if (a.pierce-- <= 0) { a.life = 0; break; }
    }
    if (a.life <= 0) continue;
    for (const q of b.bosses) {
      if (q.dead || q.dying || a.hit.has(q)) continue;
      for (const box of bossBoxes(b, q)) {
        if (!(inBox(a.x, a.y, box) || segBox(px, py, a.x, a.y, box))) continue;
        a.hit.add(q);
        if (a.ally) { if (!q.hidden) { damageBoss(b, q, a.dmg * 0.5, { ally: true }); b.burst(a.x, a.y, PAL.white, 5); } a.life = 0; break; }
        const spent = hitBoss(b, q, a, box);
        if (spent) { bus.emit('arrow:hit', { head: box.weak }); b.hitStop = b.tun.feel.hitPause; a.life = 0; }
        break;
      }
      if (a.life <= 0) break;
    }
    if (a.x < b.camX - 300 || a.x > b.camX + app.W / b.zoom + 300) a.life = 0;
  }
  b.arrows = b.arrows.filter((a) => a.life > 0 || a.stuck > 0);
}

function segBox(x0, y0, x1, y1, bx) {
  for (let k = 0.25; k < 1; k += 0.25) if (inBox(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, bx)) return true;
  return false;
}

function updateShots(b, dt) {
  const h = b.hero;
  for (const s of b.shots) {
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.kind !== 'bolt') s.vy += 300 * dt;
    if (s.y > GROUND) { s.life = 0; continue; }
    // the protected ally or the altar can be hit too
    if (b.protected && !b.protected.hurt && Math.abs(s.x - b.protected.x) < 26 && s.y > GROUND - 150) { s.life = 0; b.allyHurt(); continue; }
    if (Math.abs(s.x - h.x) < 24 && s.y > h.y - 150 && s.y < h.y) { s.life = 0; b.hurtHero(s.dmg, s.x - s.vx, s.answer, 'shot'); }
  }
  b.shots = b.shots.filter((s) => s.life > 0);
}

function updateZones(b, dt) {
  const h = b.hero;
  for (const z of b.zones) {
    z.t += dt;
    if (z.follow === true && z.t < z.dur * 0.6) z.x += (h.x - z.x) * Math.min(1, dt * 5);
    else if (typeof z.follow === 'number' && z.t < z.dur * z.follow) z.x += (h.x - z.x) * Math.min(1, dt * 3);
    if (z.kind === 'wave') {
      z.x += z.dir * z.speed * dt;
      if (!z.struck && Math.abs(h.x - z.x) < 26 && h.y > GROUND - 34) { z.struck = true; b.hurtHero(z.dmg, z.x - z.dir * 10, 'jump', 'wave'); }
    }
    if (z.t >= z.dur && !z.fired) {
      z.fired = true;
      if (z.kind === 'redCircle') {
        b.fx.push({ kind: 'fall', x: z.x, t: 0, dur: 0.3, what: z.fall });
        if (Math.abs(h.x - z.x) < z.r && h.y > GROUND - 120) b.hurtHero(z.dmg, z.x, 'move', 'boulder');
        b.shake(2);
      } else if (z.kind === 'fireWarn' && z.then) { b.zones.push({ kind: 'fire', x: z.x, r: z.r, t: 0, dur: z.then.dur, dmg: z.then.dmg }); bus.emit('cue', 'fireWhoosh'); }
      else if (z.kind === 'coil') {
        if (Math.abs(h.x - z.x) < z.r * 0.7 && h.rollInv <= 0) { b.hurtHero(z.dmg, z.x, 'roll', 'noose'); h.held = 0.7; }
        if (z.src && z.src.def && !z.src.boss) { /* the enemy recovers on its own timer */ }
      }
    }
    if (z.kind === 'fire' && Math.abs(h.x - z.x) < z.r * 0.8 && h.y > GROUND - 60) b.hurtHero(z.dmg, z.x, 'move', 'fire');
  }
  b.zones = b.zones.filter((z) => (z.kind === 'wave' ? z.t < z.dur : z.kind === 'fire' ? z.t < z.dur : z.t < z.dur + 0.15));
}

function updateFx(b, dt) {
  for (const f of b.fx) f.t += dt;
  b.fx = b.fx.filter((f) => f.t < f.dur);
}

// ---------------------------------------------------------------- render (ink layer)
// The painted world and the figures are drawn on the GPU by battle/view.js. This draws
// what sits on top as ink: warnings on the ground, targets, arrows, shots, small marks,
// and the HUD. Same camera as the GPU view.
export function renderBattleInk(ctx, b, shake, lens) {
  const z = b.zoom;
  ctx.save();
  if (shake) ctx.translate(shake.x, shake.y);
  ctx.save();
  // a crash zoom moves the world, never the HUD
  if (lens && lens.z !== 1) { ctx.translate(lens.x, lens.y); ctx.scale(lens.z, lens.z); ctx.translate(-lens.x, -lens.y); }
  ctx.translate(0, GROUND); ctx.scale(z, z); ctx.translate(-b.camX, -GROUND);
  drawZones(ctx, b);
  for (const c of b.checkpoints) { const k = Math.min(1, c.t / 0.8); M.lotusBud(ctx, c.x, GROUND - 2, 18 * k + 2, { wilt: 0, seed: 3 }); line(ctx, [[c.x, GROUND], [c.x, GROUND - 4]], { w: 2 }); }
  for (const q of b.targets) drawTarget(ctx, q, b);
  for (const q of b.bosses) drawBoss(ctx, b, q);
  for (const e of b.enemies) if (!e.dead) drawEnemy(ctx, b, e);
  drawHero(ctx, b);
  for (const a of b.arrows) drawArrow(ctx, a);
  for (const s of b.shots) if (!(s.delay > 0)) drawShot(ctx, s);
  drawFx(ctx, b);
  if (app.dev && app.dev.hitboxes) drawHitboxes(ctx, b);
  ctx.restore();
  drawHud(ctx, b);
  ctx.restore();
}

function drawHitboxes(ctx, b) {
  ctx.save(); ctx.lineWidth = 2;
  const box = (q, c) => { ctx.strokeStyle = c; ctx.strokeRect(q.x, q.y, q.w, q.h); };
  for (const e of b.enemies) if (!e.dead && !e.dying) { const bx = enemyBoxes(e); box(bx.body, '#0a0'); box(bx.head, '#f0f'); if (bx.banner) box(bx.banner, '#fa0'); }
  for (const q of b.bosses) if (!q.dead) for (const bx of bossBoxes(b, q)) box(bx, bx.weak ? '#f0f' : '#0a0');
  const h = b.hero; box({ x: h.x - 22, y: h.y - 150, w: 44, h: 150 }, '#00f');
  ctx.restore();
}

function drawZones(ctx, b) {
  for (const z of b.zones) {
    const k = Math.min(1, z.t / z.dur);
    if (z.kind === 'lotus') M.lotus(ctx, z.x, GROUND - 2, z.r * (0.3 + k * 0.7), k, { flat: true, fill: PAL.kusum, gap: PAL.white, petals: 10 });
    else if (z.kind === 'wave') M.scaleBand(ctx, z.x - z.dir * 40, GROUND - 1, 56, 18, z.dir);
    else if (z.kind === 'redCircle' || z.kind === 'fireWarn') {
      const pts = ellipsePts(z.x, GROUND - 2, z.r, z.r * 0.32, 16);
      shape(ctx, pts, { mode: 'line', lineColor: PAL.kusum, w: 3, smooth: true, seed: 3 });
      hatch(ctx, pts, { color: PAL.kusum, spacing: 9 - k * 4, angle: 0.8, w: 1.6, smooth: true });
      if (z.kind === 'fireWarn') M.star(ctx, z.x, GROUND - 40 - (1 - k) * 200, 10, { rot: b.time * 3 });
      else { const y = GROUND - 30 - (1 - k) * 420; if (z.fall === 'boulder') M.rock(ctx, z.x, y + 30, 44, 34, { colour: true, seed: 4 }); else line(ctx, [[z.x, y - 40], [z.x, y]], { w: 4, color: PAL.kusum }); }
    } else if (z.kind === 'shadowStar') M.star(ctx, z.x, GROUND - 4, 24 + k * 20, { shadow: true, rot: 0.4, points: 8 });
    else if (z.kind === 'fire') { for (let i = -1; i <= 1; i++) M.flame(ctx, z.x + i * z.r * 0.6, GROUND, 46 + (i ? 0 : 20), { t: b.time, seed: i + 5 }); }
    else if (z.kind === 'coil') M.nagaCoil(ctx, z.x, GROUND - 80, z.r, k, { rot: b.time * 2 });
  }
}


function drawTarget(ctx, q, b) {
  const lit = q.hit;
  line(ctx, [[q.x, GROUND], [q.x, q.y + 24]], { w: 2.4, seed: q.k });
  if (q.kind === 'pot') M.pot(ctx, q.x, q.y + 26, 50, { colour: lit, seed: q.k });
  else if (q.kind === 'mango') { shape(ctx, ellipsePts(q.x, q.y, 26, 32, 12), { mode: lit ? 'colour' : 'line', fill: PAL.turmeric, gap: PAL.leaf, w: 1.8, smooth: true, seed: q.k }); }
  else M.lotusBud(ctx, q.x, q.y + 20, 28, { colour: lit, seed: q.k });
  if (!lit) M.usableRing(ctx, q.x, q.y, (q.r || 34) + 8, b.time);
}

function drawArrow(ctx, a) {
  const ang = Math.atan2(a.vy, a.vx), L = a.full ? 64 : 52;
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.stuck > 0 ? Math.atan2(a.vy, a.vx) : ang);
  ctx.globalAlpha = a.stuck > 0 ? Math.min(1, a.stuck * 2) : 1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.black; ctx.lineWidth = a.full ? 6.5 : 4.5; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
  ctx.strokeStyle = a.ally ? PAL.gold : a.full ? PAL.turmeric : PAL.indigo; ctx.lineWidth = a.full ? 3.5 : 2.2; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-4, 0); ctx.stroke();
  ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = a.full ? PAL.kusum === PAL.kusum ? PAL.turmeric : PAL.turmeric : PAL.white;
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 9, -7); ctx.lineTo(-L + 6, 0); ctx.lineTo(-L - 9, 7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}

function drawShot(ctx, s) {
  const ang = Math.atan2(s.vy, s.vx);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
  if (s.kind === 'bolt') { M.star(ctx, 0, 0, 13, { rot: s.life * 8, points: 6 }); }
  else {
    const L = s.kind === 'spear' ? 90 : 50;
    ctx.strokeStyle = PAL.black; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.strokeStyle = PAL.kusum; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-4, 0); ctx.stroke();
    ctx.fillStyle = PAL.kusum; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 1.4; ctx.stroke();
  }
  ctx.restore();
}

function drawFx(ctx, b) {
  for (const f of b.fx) {
    const k = f.t / f.dur;
    if (f.kind === 'burst') dots(ctx, f.x, f.y, 8 + k * 30, f.n, f.color === PAL.white ? PAL.black : f.color, f.seed, 3.4 * (1 - k * 0.6));
    else if (f.kind === 'tink') { ctx.strokeStyle = PAL.black; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.6; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 6, f.y + Math.sin(a) * 6); ctx.lineTo(f.x + Math.cos(a) * (12 + k * 10), f.y + Math.sin(a) * (12 + k * 10)); ctx.stroke(); } }
    else if (f.kind === 'label') { ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - 0.6) * 2.5; plateText(ctx, f.text, f.x, f.y - k * 30); ctx.restore(); }
    else if (f.kind === 'vine') { ctx.save(); ctx.globalAlpha = 1 - k; M.vineBand(ctx, f.x - 40, f.x + 40, f.y - 60 - k * 40, { colour: true, h: 12 }); ctx.restore(); }
    else if (f.kind === 'fall') dots(ctx, f.x, GROUND - 10, 20 + k * 50, 12, f.what === 'boulder' ? PAL.brown : PAL.kusum, 5, 4 * (1 - k));
    else if (f.kind === 'astra') {
      const v = b.view();
      ctx.save(); ctx.globalAlpha = 1 - k;
      const cx = (v.left + v.right) / 2;
      if (f.symbol === 'sun' || f.symbol === 'brahma') M.sun(ctx, cx, GROUND - 330, 60 + k * 260, { colour: true, face: false });
      else if (f.symbol === 'wind') for (let i = 0; i < 5; i++) M.cloud(ctx, cx - 400 + i * 200 + k * 300, GROUND - 260 + (i % 2) * 80, 200, { hatch: 0, seed: i });
      else M.lotus(ctx, cx, GROUND - 300, 80 + k * 300, 1, { fill: PAL.turmeric });
      ctx.restore();
    }
  }
}

function plateText(ctx, text, x, y) {
  ctx.font = '700 22px "Alegreya Sans", sans-serif';
  const w = ctx.measureText(text).width + 22;
  shape(ctx, [[x - w / 2, y - 16], [x + w / 2, y - 16], [x + w / 2, y + 16], [x - w / 2, y + 16]], { mode: 'colour', fill: PAL.paper, gap: PAL.turmeric, w: 1.4, seed: 2 });
  ctx.fillStyle = PAL.black; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}

export function battleSeals(b) {
  const L = b.level;
  const gentle = L.gentle === 'ally' ? !b.allyHurtFlag : L.gentle === 'protect' ? !b.protectTouched : b.stats.hits <= (L.gentleHits ?? 3);
  return { finish: true, gentle, fast: b.stats.time <= (L.par || 600) };
}
