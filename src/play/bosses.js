// Bosses. All share one outline (telegraph, attack, vulnerable window, adds); each has one
// rule only it has, kept as a small documented hook in RULES below. Numbers are in
// data/bosses.json.
import defs from '../data/bosses.json';
import { bus } from '../core/events.js';
import { character, fig, WALK, BASE_U } from '../art/figures.js';
import { PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { drawProp } from '../art/props.js';
import * as M from '../art/motifs.js';
import { spawnEnemy } from './enemies.js';

export const BOSS = Object.fromEntries(defs.map((d) => [d.id, d]));
const FLY_Y = GROUND - 310;

export function createBoss(b, id, x) {
  const def = BOSS[id];
  if (!def) throw new Error('Unknown boss ' + id);
  const spec = character(def.character);
  // a mythic boss can be drawn larger than in the story scenes (def.scale), so the fight feels monumental
  const U = BASE_U * spec.build.height * (def.scale || 1);
  const boss = {
    id, def, spec, U, x, y: def.flies ? FLY_Y : GROUND, facing: -1, hp: def.hp, maxHp: def.hp, phase: 0, state: 'intro', t: 0,
    move: null, mv: null, moveIdx: 0, addT: 0, hidden: false, weakT: 0, walkT: 0, data: {}, dying: false, dead: false, hitFlash: 0, parts: def.parts ? { ...def.parts } : null,
  };
  if (boss.parts && id === 'viradha') { boss.maxHp = boss.parts.armF + boss.parts.armB; boss.hp = boss.maxHp; }
  const rule = RULES[id];
  if (rule && rule.init) rule.init(b, boss);
  return boss;
}

/** Centres of Ravana's nine side heads and the middle one, in world units. */
export function tenHeadCentres(boss, pride = 0) {
  const U = boss.U, r = 0.1 * U, hc = [boss.x + boss.facing * 0.012 * U, boss.y - 0.95 * U];
  const order = [4, 3, 5, 2, 6, 1, 7, 0, 8];
  const out = [];
  for (let k = 0; k < order.length; k++) {
    const i = order[k], side = i < 4.5 ? -1 : 1, rank = Math.ceil((k + 1) / 2);
    const a = side * (0.42 + (rank - 1) * 0.36), dist = r * (1.2 + rank * 1.18);
    // same sizes as drawTenHeads: the pride head swells and the others shrink with pride
    out[i] = { x: hc[0] + boss.facing * Math.sin(a) * dist, y: hc[1] + r * 0.2 - Math.cos(a) * dist * 0.42 + rank * r * 0.1, r: r * (0.78 - rank * 0.05) * (i === 8 ? 1 + pride * 0.06 : 1 - pride * 0.022) };
  }
  out[9] = { x: hc[0], y: hc[1], r: r * 1.05 };
  return out;
}

export function bossBoxes(b, boss) {
  const rule = RULES[boss.id];
  if (rule && rule.boxes) return rule.boxes(b, boss);
  const U = boss.U, w = boss.spec.build.width;
  return [
    { name: 'head', x: boss.x - U * 0.14, y: boss.y - U * 1.08, w: U * 0.28, h: U * 0.28, weak: boss.def.weakSpot === 'head' },
    { name: 'body', x: boss.x - U * 0.17 * w, y: boss.y - U * 0.8, w: U * 0.34 * w, h: U * 0.8, weak: boss.def.weakSpot === 'body' },
  ];
}

export function damageBoss(b, boss, dmg, o = {}) {
  if (boss.dying || boss.dead || dmg <= 0) return;
  const rule = RULES[boss.id];
  let hp = boss.hp - dmg;
  if (o.ally) hp = Math.max(1, hp);
  if (rule && rule.clamp) hp = rule.clamp(b, boss, hp, o);
  boss.hp = hp; boss.hitFlash = 0.12;
  const ratio = boss.hp / boss.maxHp;
  const next = boss.def.phases[boss.phase + 1];
  if (next && ratio <= next.from) {
    boss.phase++; bus.emit('boss:phase', { id: boss.id, phase: boss.phase });
    if (next.line) b.say(next.line);
    if (next.mood) b.mood = next.mood;
  }
  if (boss.hp <= 0) killBoss(b, boss);
}

export function killBoss(b, boss) {
  if (boss.dying) return;
  boss.hp = 0; boss.dying = true; boss.state = 'dying'; boss.t = 0; boss.hidden = false;
  bus.emit('boss:die', { id: boss.id });
  if (b.onBossKilled) b.onBossKilled(boss);
  b.zones = b.zones.filter((z) => z.src !== boss);
}

/** Returns true if the arrow is spent. */
export function hitBoss(b, boss, arrow, box) {
  const rule = RULES[boss.id];
  if (rule && rule.hit) { const r = rule.hit(b, boss, arrow, box); if (r !== undefined) return r; }
  if (boss.hidden) return false;
  const B = b.tun.bow;
  let mult = box.weak ? B.headMultiplier * (boss.state === 'weak' ? 1.5 : 1) : boss.def.strictWeak ? 0 : 0.75;
  if (mult === 0) { b.tink(arrow.x, arrow.y); return true; }
  if (!arrow.ally && !arrow.astra) { if (box.weak) { b.stats.headshots++; b.addBoon(b.tun.boon.perHeadshot); } else b.addBoon(b.tun.boon.perHit); }
  b.burst(arrow.x, arrow.y, box.weak ? PAL.turmeric : PAL.white, box.weak ? 12 : 6);
  damageBoss(b, boss, arrow.dmg * mult, { full: arrow.full, ally: arrow.ally });
  return true;
}

function startMove(b, boss) {
  const ph = boss.def.phases[boss.phase];
  if (!ph.moves.length) return;
  const name = ph.moves[boss.moveIdx++ % ph.moves.length];
  const mv = boss.def.moves[name];
  boss.move = name; boss.mv = mv; boss.state = 'windup'; boss.t = 0; boss.did = false;
  const h = b.hero, U = boss.U;
  boss.facing = h.x >= boss.x ? 1 : -1;
  boss.windup = mv.windup * b.diff.telegraph / (ph.speed || 1);
  b.telegraph(boss, mv.telegraph, mv.answer);
  boss.aimX = h.x; boss.aimY = h.y - 90;
  if (name === 'stomp') b.zones.push({ kind: 'lotus', x: boss.x, r: 130 + U * 0.3, t: 0, dur: boss.windup, src: boss });
  else if (name === 'boulder') b.zones.push({ kind: 'redCircle', x: h.x, r: 74, t: 0, dur: boss.windup, dmg: mv.damage, src: boss, fall: 'boulder' });
  else if (name === 'bolts') for (let i = 0; i < (mv.count || 3); i++) b.zones.push({ kind: 'redCircle', x: h.x + (i - 1) * 170 * (i % 2 ? 1 : -1) + (i === 0 ? 0 : h.vx * 0.4), r: 66, t: -i * 0.3, dur: boss.windup, dmg: mv.damage, src: boss, fall: 'bolt' });
  else if (name === 'vanish') { boss.hidden = true; b.zones.push({ kind: 'shadowStar', follow: 0.55, x: h.x, r: 100, t: 0, dur: boss.windup, src: boss }); bus.emit('cue', 'vanish'); }
  else if (name === 'fireRain') for (let i = 0; i < (mv.count || 3); i++) b.zones.push({ kind: 'fireWarn', x: Math.max(b.bounds.left + 50, Math.min(b.bounds.right - 50, h.x + (i - 1) * 190)), r: 56, t: -i * 0.22, dur: boss.windup, src: boss, then: { kind: 'fire', dur: 1.3, dmg: mv.damage } });
  else if (name === 'noose') b.zones.push({ kind: 'coil', follow: true, x: h.x, r: 96, t: 0, dur: boss.windup, dmg: mv.damage, src: boss });
  else if (name === 'hide') { boss.hidden = true; boss.data.slot = Math.floor(b.rng.next() * 3); bus.emit('cue', 'vanish'); }
  else if (name === 'grab') { boss.data.grab = mv.hold; boss.data.grabHits = 0; }
}

function act(b, boss) {
  const name = boss.move, mv = boss.mv, h = b.hero, U = boss.U;
  const sp = b.diff.enemySpeed;
  switch (name) {
    case 'stomp': {
      b.shake(b.tun.feel.stompShake); bus.emit('cue', 'stompLand');
      const r = 130 + U * 0.3;
      if (Math.abs(h.x - boss.x) < r && h.y > GROUND - 30) b.hurtHero(mv.damage, boss.x, 'jump', 'stomp');
      for (const dir of [-1, 1]) b.zones.push({ kind: 'wave', x: boss.x + dir * r, dir, speed: 560, t: 0, dur: 1.1, dmg: mv.damage, src: boss });
      break;
    }
    case 'swipe': case 'swing':
      if (Math.abs(h.x - boss.x) < U * 0.42 + 150 && Math.abs(h.y - boss.y) < U) b.hurtHero(mv.damage, boss.x, 'roll', 'swipe');
      break;
    case 'vanish': {
      const z = b.zones.find((q) => q.kind === 'shadowStar' && q.src === boss);
      boss.x = z ? z.x : h.x; boss.hidden = false; b.shake(4);
      if (Math.abs(h.x - boss.x) < 104 && h.rollInv <= 0) b.hurtHero(mv.damage, boss.x, 'move', 'vanish');
      b.burst(boss.x, GROUND - 40, PAL.ochre, 16);
      break;
    }
    case 'dive': boss.fromX = boss.x; boss.fromY = boss.y; boss.toX = h.x; boss.toY = GROUND; boss.state = 'diving'; boss.t = 0; return;
    case 'bolt': case 'spear': case 'spearThrow': case 'volley': {
      const n = mv.count || 1;
      for (let i = 0; i < n; i++) {
        const ox = boss.x + boss.facing * U * 0.3, oy = boss.y - U * 0.8;
        const a = Math.atan2(boss.aimY + (i - (n - 1) / 2) * 70 - oy, boss.aimX - ox);
        b.shots.push({ x: ox, y: oy, vx: Math.cos(a) * 820 * sp, vy: Math.sin(a) * 820 * sp, dmg: mv.damage, kind: name === 'volley' || name === 'bolt' ? 'arrow' : 'spear', life: 3, delay: i * 0.18, answer: 'move' });
      }
      bus.emit('cue', 'enemyShot');
      break;
    }
    case 'charge': boss.state = 'charging'; boss.t = 0; boss.dashDir = h.x >= boss.x ? 1 : -1; boss.struck = false; return;
    case 'breath': { const dir = h.x >= boss.x ? 1 : -1; h.x += dir * 0; b.gust = { dir, t: 0.5 }; bus.emit('cue', 'gust'); break; }
    case 'hide': case 'noose': case 'boulder': case 'bolts': case 'fireRain': case 'grab': break;
    default: break;
  }
  if (mv.opensWeak) { boss.state = 'weak'; boss.t = 0; boss.weakT = mv.opensWeak; }
  else { boss.state = 'recover'; boss.t = 0; }
}

export function updateBoss(b, boss, dt) {
  if (boss.dead) return;
  boss.hitFlash -= dt; boss.t += dt;
  const rule = RULES[boss.id];
  if (boss.dying) { if (boss.t > 2.4) { boss.dead = true; b.onBossDown(boss); } return; }
  if (boss.state === 'fled') { boss.x += 1500 * dt * (boss.data.fleeDir || 1); boss.y -= 500 * dt; if (boss.t > 1.2) { boss.dead = true; b.onBossDown(boss); } return; }
  if (rule && rule.update && rule.update(b, boss, dt) === false) return;
  const ph = boss.def.phases[boss.phase], spd = ph.speed || 1, h = b.hero, U = boss.U;
  const dx = h.x - boss.x, adx = Math.abs(dx);
  // adds arrive on a timer, up to a cap
  if (ph.adds && boss.state !== 'intro') {
    boss.addT += dt;
    const extra = b.diff.extraSpawn || 0;
    if (boss.addT >= ph.adds.every && b.diffName !== 'story' || (b.diffName === 'story' && boss.phase > 0 && boss.addT >= ph.adds.every * 1.6)) {
      boss.addT = 0;
      if (b.enemies.filter((e) => !e.dead && !e.dying && e.add).length < ph.adds.max + extra) spawnEnemy(b, ph.adds.from[Math.floor(b.rng.next() * ph.adds.from.length)], b.rng.next() < 0.5 ? 'left' : 'right', { add: true });
    }
  }
  switch (boss.state) {
    case 'intro': if (boss.t > 1.3) { boss.state = 'idle'; boss.t = 0; } break;
    case 'idle': {
      boss.facing = dx >= 0 ? 1 : -1;
      if (boss.def.passive) break;
      const want = boss.def.flies ? 330 : 250 + U * 0.2;
      if (adx > want + 60) { boss.x += Math.sign(dx) * (boss.def.flies ? 150 : 74) * spd * dt; boss.walkT += dt; }
      else if (adx < want - 120) { boss.x -= Math.sign(dx) * 60 * spd * dt; boss.walkT += dt; }
      if (boss.def.flies) boss.y += (FLY_Y + Math.sin(b.time * 2) * 16 - boss.y) * dt * 2.4;
      boss.x = Math.max(b.bounds.left + 60, Math.min(b.bounds.right - 60, boss.x));
      if (boss.t > 1.15 / spd) startMove(b, boss);
      break;
    }
    case 'windup': {
      if (boss.t < boss.windup * 0.6) { boss.aimX = h.x; boss.aimY = h.y - 90; }
      if (boss.t >= boss.windup) act(b, boss);
      break;
    }
    case 'diving': {
      const k = Math.min(1, boss.t / 0.5);
      boss.x = boss.fromX + (boss.toX - boss.fromX) * k; boss.y = boss.fromY + (boss.toY - boss.fromY) * k * k;
      if (k >= 1) { if (Math.abs(h.x - boss.x) < 90 && h.rollInv <= 0 && h.y > GROUND - 120) b.hurtHero(boss.mv.damage, boss.x, 'roll', 'dive'); boss.state = 'weak'; boss.t = 0; boss.weakT = boss.mv.opensWeak || 1.2; b.shake(3); }
      break;
    }
    case 'charging': {
      boss.x += boss.dashDir * 640 * spd * dt; boss.walkT += dt * 2; boss.facing = boss.dashDir;
      if (!boss.struck && Math.abs(h.x - boss.x) < U * 0.3 + 40 && h.y > GROUND - 70) { boss.struck = true; b.hurtHero(boss.mv.damage, boss.x, 'jump', 'charge'); }
      if (boss.x <= b.bounds.left + 90 || boss.x >= b.bounds.right - 90 || boss.t > 1.4) { boss.x = Math.max(b.bounds.left + 90, Math.min(b.bounds.right - 90, boss.x)); boss.state = boss.mv.opensWeak ? 'weak' : 'recover'; boss.weakT = boss.mv.opensWeak || 0; boss.t = 0; }
      break;
    }
    case 'weak': if (boss.t >= boss.weakT) { boss.state = 'recover'; boss.t = 0; boss.hidden = false; } break;
    case 'recover': {
      if (boss.def.flies) boss.y += (FLY_Y - boss.y) * dt * 3;
      if (boss.t > 0.55 / spd) { boss.state = 'idle'; boss.t = 0; boss.hidden = false; }
      break;
    }
    default: break;
  }
  if (!boss.def.flies && boss.state !== 'diving') boss.y = GROUND;
}

function bossPose(boss) {
  if (boss.dying) return 'hurt';
  switch (boss.state) {
    case 'intro': return 'raise';
    case 'windup': return boss.move === 'stomp' ? 'raise' : boss.move === 'charge' ? 'crouch' : boss.move === 'breath' ? 'stand' : boss.move === 'spear' || boss.move === 'spearThrow' || boss.move === 'volley' || boss.move === 'bolt' ? 'cast' : 'swing0';
    case 'diving': return 'fly';
    case 'charging': return Math.floor(boss.walkT * 10) % 2 ? 'charge' : 'charge2';
    case 'weak': return boss.move === 'stomp' || boss.move === 'vanish' ? 'raise' : 'hurt';
    case 'recover': return boss.t < 0.25 && (boss.move === 'swipe' || boss.move === 'swing' || boss.move === 'stomp') ? 'swing1' : 'stand';
    case 'idle': return boss.def.flies ? (Math.floor(boss.t * 6) % 2 ? 'fly' : 'fly2') : boss.walkT > 0 ? WALK[Math.floor(boss.walkT * 5) % 4] : 'stand';
    default: return 'stand';
  }
}

export function drawBoss(ctx, b, boss) {
  if (boss.dead) return;
  const rule = RULES[boss.id];
  if (rule && rule.draw && rule.draw(ctx, b, boss) === false) return;
  if (boss.hidden) return;
  let rot = 0, alpha = 1, drain = 0, sink = 0;
  if (boss.dying) {
    // falls in a slow arc; colour drains from her until she is pure line, then the line fades
    rot = -boss.facing * Math.min(1.35, boss.t * 0.9); drain = Math.min(1, boss.t / 1.2); alpha = Math.max(0, 1 - Math.max(0, boss.t - 1.5) / 0.8); sink = Math.max(0, boss.t - 1.4) * 20;
  }
  const breath = boss.state === 'windup' && boss.move === 'breath' ? 1 + Math.min(0.06, boss.t * 0.04) : 1;
  fig(ctx, boss.spec, bossPose(boss), boss.x + (boss.hitFlash > 0 ? -boss.facing * 5 : 0), boss.y + sink, { facing: boss.facing, rot, alpha, drain, pivot: 0.05, scale: breath * (boss.def.scale || 1), heads: boss.data.heads });
  if (boss.dying) return;
  const U = boss.U;
  if (boss.state === 'windup' && boss.mv && boss.mv.telegraph === 'star') M.star(ctx, boss.x, boss.y - U * 1.3 - 20, 20 + Math.min(1, boss.t / boss.windup) * 12, { rot: b.time * 2 });
  if (boss.state === 'windup' && boss.mv && boss.mv.telegraph === 'dustLine') {
    const dir = b.hero.x >= boss.x ? 1 : -1;
    ctx.strokeStyle = PAL.kusum; ctx.lineWidth = 7; ctx.setLineDash([22, 14]); ctx.lineDashOffset = -b.time * 140;
    ctx.beginPath(); ctx.moveTo(boss.x, GROUND - 8); ctx.lineTo(boss.x + dir * 900 * Math.min(1, boss.t / boss.windup), GROUND - 8); ctx.stroke(); ctx.setLineDash([]);
    M.star(ctx, boss.x, boss.y - U * 1.3 - 20, 20, { rot: b.time * 2 });
  }
  if (boss.state === 'windup' && boss.mv && boss.mv.telegraph === 'redPath') {
    const ox = boss.x + boss.facing * U * 0.3, oy = boss.y - U * 0.8, a = Math.atan2(boss.aimY - oy, boss.aimX - ox);
    ctx.fillStyle = PAL.kusum;
    for (let i = 1; i < 26 * Math.min(1, boss.t / boss.windup); i++) { ctx.beginPath(); ctx.arc(ox + Math.cos(a) * i * 34, oy + Math.sin(a) * i * 34, 5, 0, 7); ctx.fill(); }
  }
  // a ring of yellow dots: the weak spot is open
  if (boss.state === 'weak' || (boss.state === 'windup' && boss.move === 'breath')) for (const bx of bossBoxes(b, boss)) if (bx.weak) M.usableRing(ctx, bx.x + bx.w / 2, bx.y + bx.h / 2, Math.max(bx.w, bx.h) * 0.75, b.time);
}

// ---------------------------------------------------------------- one rule each
const RULES = {
  // Tataka: she vanishes; the shadow-star on the ground shows where she will rise.
  tataka: {},

  // Subahu and Maricha: two at once. Maricha is flung away at half health; Subahu falls to the fire astra.
  subahu: {
    clamp(b, boss, hp) {
      if (hp <= boss.maxHp * 0.15 && !boss.data.done) { if (!boss.data.asked) { boss.data.asked = true; b.requestAstra('sun', 'astra.agneya', () => { boss.data.done = true; killBoss(b, boss); }); } return Math.max(1, hp); }
      return hp;
    },
  },
  maricha: {
    clamp(b, boss, hp) {
      if (hp <= boss.maxHp * boss.def.fleeAt) {
        if (!boss.data.asked) { boss.data.asked = true; b.requestAstra('wind', 'astra.manava', () => { boss.state = 'fled'; boss.t = 0; boss.data.fleeDir = boss.x >= b.hero.x ? 1 : -1; b.say('yajna.flung'); }); }
        return Math.max(1, hp);
      }
      return hp;
    },
  },

  // Viradha: no weapon can kill him. Break both arms; then he is buried.
  viradha: {
    boxes(b, boss) {
      const U = boss.U, open = boss.state === 'weak';
      const out = [{ name: 'body', x: boss.x - U * 0.2, y: boss.y - U * 1.05, w: U * 0.4, h: U * 1.05, weak: false }];
      if (boss.parts.armF > 0) out.unshift({ name: 'armF', x: boss.x + boss.facing * U * 0.2 - U * 0.11, y: boss.y - U * 0.9, w: U * 0.22, h: U * 0.24, weak: open, part: 'armF' });
      if (boss.parts.armB > 0) out.unshift({ name: 'armB', x: boss.x - boss.facing * U * 0.2 - U * 0.11, y: boss.y - U * 0.9, w: U * 0.22, h: U * 0.24, weak: open, part: 'armB' });
      return out;
    },
    hit(b, boss, arrow, box) {
      if (!box.part || !box.weak) { b.tink(arrow.x, arrow.y); if (!boss.data.told) { boss.data.told = true; b.say('viradha.rule'); } return true; }
      boss.parts[box.part] = Math.max(0, boss.parts[box.part] - arrow.dmg * 2);
      b.burst(arrow.x, arrow.y, PAL.turmeric, 12); b.addBoon(2); b.stats.headshots++;
      if (boss.parts[box.part] <= 0) { b.say('viradha.arm'); b.shake(5); }
      const left = boss.parts.armF + boss.parts.armB;
      damageBoss(b, boss, boss.hp - left);
      return true;
    },
  },

  // Khara: break the chariot first; then only one fully drawn, blazing arrow ends it.
  // While he rides, the chariot itself can be shot to pieces (parts.chariot); it also breaks
  // when he drops to his second phase.
  khara: {
    init(b, boss) { boss.data.mounted = true; },
    boxes(b, boss) {
      const U = boss.U, w = boss.spec.build.width;
      const out = [
        { name: 'head', x: boss.x - U * 0.14, y: boss.y - U * 1.08, w: U * 0.28, h: U * 0.28, weak: true },
        { name: 'body', x: boss.x - U * 0.17 * w, y: boss.y - U * 0.8, w: U * 0.34 * w, h: U * 0.8, weak: false },
      ];
      if (boss.data.mounted && boss.parts.chariot > 0) out.push({ name: 'chariot', x: boss.x - boss.facing * 40 - 110, y: GROUND - 120, w: 220, h: 120, weak: false, part: 'chariot' });
      return out;
    },
    hit(b, boss, arrow, box) {
      if (box.part !== 'chariot') return undefined;
      boss.parts.chariot = Math.max(0, boss.parts.chariot - arrow.dmg * (arrow.full ? 2 : 1));
      b.burst(arrow.x, arrow.y, PAL.brown, 8); if (!arrow.ally && !arrow.astra) b.addBoon(b.tun.boon.perHit);
      if (boss.parts.chariot <= 0) RULES.khara.dismount(b, boss);
      return true;
    },
    dismount(b, boss) { if (!boss.data.mounted) return; boss.data.mounted = false; b.say('khara.chariot'); b.shake(5); b.burst(boss.x, GROUND - 60, PAL.brown, 18); },
    update(b, boss) { if (boss.data.mounted && boss.phase >= 1) RULES.khara.dismount(b, boss); },
    clamp(b, boss, hp, o) { if (hp <= 0 && !o.full) { if (!boss.data.told) { boss.data.told = true; b.say('khara.rule'); } return 1; } return hp; },
    draw(ctx, b, boss) { if (boss.data.mounted && !boss.dying) drawProp(ctx, 'kharaChariot', boss.x - boss.facing * 40, GROUND, { dir: boss.facing, t: b.time, moving: boss.state === 'charging', spin: boss.walkT * 9 }); },
  },

  // The golden deer: it vanishes when struck and reappears deeper in the forest. Six arrows.
  deer: {
    init(b, boss) { boss.data.hits = 0; boss.facing = 1; },
    boxes(b, boss) { return [{ name: 'body', x: boss.x - 60, y: boss.y - 130, w: 130, h: 130, weak: true }]; },
    hit(b, boss, arrow) {
      if (boss.data.gone > 0) return false;
      boss.data.hits++; b.burst(boss.x, boss.y - 70, PAL.gold, 18); b.stats.headshots++;
      b.mood = 'deer' + boss.data.hits; bus.emit('cue', 'chime');
      if (boss.data.hits >= boss.def.hp) { boss.data.maricha = true; damageBoss(b, boss, 999); return true; }
      boss.hp = boss.def.hp - boss.data.hits;
      boss.data.gone = 0.9; boss.x = Math.min(b.level.arenas[b.arena].right - 200, boss.x + 430 + b.rng.next() * 160);
      b.bounds.right = Math.min(b.level.arenas[b.arena].right, boss.x + 500);
      return true;
    },
    update(b, boss, dt) {
      if (boss.data.gone > 0) { boss.data.gone -= dt; boss.hidden = boss.data.gone > 0; return false; }
      const dx = boss.x - b.hero.x;
      boss.data.moving = dx < 520 && dx > 0;
      if (boss.data.moving) boss.x = Math.min(b.bounds.right - 80, boss.x + 120 * dt);
      boss.state = 'idle'; return false;
    },
    draw(ctx, b, boss) {
      if (boss.hidden) return false;
      if (boss.dying) { fig(ctx, boss.spec, 'hurt', boss.x, GROUND, { facing: -1, drain: Math.min(1, boss.t / 1.2), rot: Math.min(1.3, boss.t), alpha: Math.max(0, 1 - Math.max(0, boss.t - 1.5)) }); return false; }
      drawProp(ctx, 'deer', boss.x, GROUND, { dir: boss.facing, t: b.time, moving: boss.data.moving });
      return false;
    },
  },

  // Kumbhakarna: too big to hurt except in the eyes, and only when he breathes in.
  kumbhakarna: {
    boxes(b, boss) {
      const U = boss.U, open = boss.state === 'weak' || (boss.state === 'windup' && boss.move === 'breath');
      const out = [{ name: 'eyes', x: boss.x - U * 0.13 + boss.facing * U * 0.02, y: boss.y - U * 1.07, w: U * 0.26, h: U * 0.2, weak: open }, { name: 'body', x: boss.x - U * 0.24, y: boss.y - U * 0.85, w: U * 0.48, h: U * 0.85, weak: false }];
      if (boss.data.grab > 0) out.unshift({ name: 'hand', x: boss.x + boss.facing * U * 0.42 - 50, y: boss.y - U * 0.78, w: 100, h: 100, weak: true, hand: true });
      return out;
    },
    hit(b, boss, arrow, box) {
      if (box.hand) { boss.data.grabHits++; b.burst(arrow.x, arrow.y, PAL.turmeric, 10); if (boss.data.grabHits >= 3) { boss.data.grab = 0; b.say('kumbha.free'); b.addBoon(6); boss.state = 'weak'; boss.t = 0; boss.weakT = 2.2; } return true; }
      if (!box.weak && !boss.data.told) { boss.data.told = true; b.say('kumbha.rule'); }
      return undefined;
    },
    update(b, boss, dt) { if (boss.data.grab > 0) { boss.data.grab -= dt; if (boss.data.grab <= 0) b.say('kumbha.escaped'); } },
    draw(ctx, b, boss) {
      if (boss.data.grab > 0 && !boss.dying) {
        const U = boss.U, hx = boss.x + boss.facing * U * 0.42, hy = boss.y - U * 0.62;
        fig(ctx, character('sugriva'), 'hurt', hx, hy, { facing: -boss.facing });
        M.usableRing(ctx, hx, hy - 60, 62, b.time);
      }
    },
  },

  // Indrajit: he hides in the clouds; thinner hatching shows where he is. Roll from the noose.
  indrajit: {
    slots(b) { const v = b.view(); const w = v.right - v.left; return [v.left + w * 0.24, v.left + w * 0.52, v.left + w * 0.8]; },
    boxes(b, boss) {
      if (boss.hidden && boss.move === 'hide') { const s = RULES.indrajit.slots(b); return s.map((x, i) => ({ name: 'cloud' + i, x: x - 110, y: FLY_Y - 80, w: 220, h: 130, weak: i === boss.data.slot, cloud: true })); }
      return [{ name: 'body', x: boss.x - 60, y: boss.y - 170, w: 120, h: 170, weak: boss.state === 'weak' }];
    },
    hit(b, boss, arrow, box) {
      if (box.cloud) {
        if (!box.weak) { b.burst(arrow.x, arrow.y, PAL.storm, 6); return true; }
        boss.hidden = false; boss.x = box.x + 110; boss.y = FLY_Y; boss.state = 'weak'; boss.t = 0; boss.weakT = 1.8;
        b.burst(arrow.x, arrow.y, PAL.turmeric, 14); b.stats.headshots++; b.addBoon(3); damageBoss(b, boss, arrow.dmg * 3, { full: arrow.full }); return true;
      }
      return undefined;
    },
    clamp(b, boss, hp) {
      if (hp <= boss.maxHp * 0.1 && !boss.data.done) { if (!boss.data.asked) { boss.data.asked = true; b.requestAstra('lotus', 'astra.aindra', () => { boss.data.done = true; killBoss(b, boss); }); } return Math.max(1, hp); }
      return hp;
    },
    update(b, boss) { if (boss.hidden && boss.move === 'hide' && boss.state === 'recover') boss.hidden = false; if (boss.hidden && boss.move === 'hide') { const s = RULES.indrajit.slots(b); boss.x = s[boss.data.slot]; } },
    draw(ctx, b, boss) {
      if (boss.hidden && boss.move === 'hide') {
        const s = RULES.indrajit.slots(b);
        s.forEach((x, i) => M.cloud(ctx, x, FLY_Y - 20, 240, { storm: true, hatch: i === boss.data.slot ? 15 : 5, seed: i + 2 }));
        return false;
      }
      if (!boss.dying && !boss.hidden) drawProp(ctx, 'cloudChariot', boss.x, boss.y + 14, { dir: boss.facing, t: b.time });
    },
  },

  // Vali and Sugriva: the brothers grapple. Draw, wait, and release only when Vali is clear.
  // Hitting Sugriva restarts the duel.
  vali: {
    init(b, boss) { boss.data.sug = character('sugriva'); boss.data.cx = boss.x; boss.data.ph = 0; boss.facing = -1; },
    // the brothers trade sides smoothly as they wrestle round each other (a hard sign flip made
    // them jump past each other mid-separation)
    pos(boss) { const sep0 = 40 + Math.max(0, Math.sin(boss.data.ph * 0.9)) * 230 + Math.max(0, Math.sin(boss.data.ph * 2.3 + 1)) * 30; const swap = Math.max(-1, Math.min(1, Math.sin(boss.data.ph * 0.37) * 4)); const sep = Math.max(40, Math.abs(swap) * sep0); const sg = swap >= 0 ? 1 : -1; return { vx: boss.data.cx - sg * sep / 2, sx: boss.data.cx + sg * sep / 2, sep }; },
    boxes(b, boss) {
      const p = RULES.vali.pos(boss), U = boss.U, clear = p.sep > 150;
      return [{ name: 'sugriva', x: p.sx - 40, y: boss.y - U * 1.05, w: 80, h: U * 1.05, sug: true }, { name: 'vali', x: p.vx - 45, y: boss.y - U * 1.1, w: 90, h: U * 1.1, weak: clear }];
    },
    hit(b, boss, arrow, box) {
      if (box.sug) { b.burst(arrow.x, arrow.y, PAL.leaf, 8); b.say('vali.miss'); boss.hp = boss.maxHp; boss.data.ph = 0; b.stats.hits++; bus.emit('cue', 'fail'); return true; }
      if (!box.weak) { b.say('vali.wait'); b.tink(arrow.x, arrow.y); return true; }
      b.burst(arrow.x, arrow.y, PAL.turmeric, 12); b.stats.headshots++;
      damageBoss(b, boss, arrow.dmg, { full: arrow.full });
      return true;
    },
    update(b, boss, dt) { boss.data.ph += dt * 0.9; boss.data.cx = boss.x + Math.sin(b.time * 0.5) * 60; return false; },
    draw(ctx, b, boss) {
      const p = RULES.vali.pos(boss), close = p.sep < 120;
      const pose = close ? (Math.floor(b.time * 3) % 2 ? 'swing0' : 'swing1') : 'stand';
      if (boss.dying) { fig(ctx, boss.spec, 'hurt', p.vx, GROUND, { facing: p.sx > p.vx ? 1 : -1, rot: -Math.min(1.3, boss.t), drain: Math.min(1, boss.t / 1.5) }); fig(ctx, boss.data.sug, 'stand', p.sx, GROUND, { facing: p.vx > p.sx ? 1 : -1 }); return false; }
      fig(ctx, boss.data.sug, close ? (pose === 'swing0' ? 'swing1' : 'swing0') : 'stand', p.sx, GROUND, { facing: p.vx > p.sx ? 1 : -1 });
      M.lotusBud(ctx, p.sx, GROUND - boss.data.sug.build.height * 150 * 0.82, 10, { seed: 2 });
      fig(ctx, boss.spec, pose, p.vx, GROUND, { facing: p.sx > p.vx ? 1 : -1 });
      if (p.sep > 150) M.usableRing(ctx, p.vx, GROUND - boss.U * 0.6, 70, b.time);
      return false;
    },
  },

  // Ravana: ten heads, each with its own pattern. Only the head in colour can be hurt, and
  // heads grow back unless the boon is full. Then the Brahma astra ends it.
  ravana: {
    init(b, boss) { boss.data.heads = { active: 9, gone: {}, pride: b.pride || 0 }; boss.data.headHp = 3; boss.data.swapT = 0; boss.data.regrow = []; boss.data.mounted = true; },
    boxes(b, boss) {
      const U = boss.U, c = tenHeadCentres(boss, b.pride || 0), st = boss.data.heads;
      const out = [];
      const a = c[st.active];
      if (a && !st.gone[st.active]) out.push({ name: 'head', x: a.x - a.r * 1.5, y: a.y - a.r * 1.7, w: a.r * 3, h: a.r * 3.2, weak: true });
      out.push({ name: 'body', x: boss.x - U * 0.22, y: boss.y - U * 0.85, w: U * 0.44, h: U * 0.85, weak: false });
      return out;
    },
    hit(b, boss, arrow, box) {
      if (!box.weak) { if (!boss.data.told) { boss.data.told = true; b.say('ravana.rule'); } b.tink(arrow.x, arrow.y); return true; }
      const st = boss.data.heads;
      b.burst(arrow.x, arrow.y, PAL.turmeric, 12); b.stats.headshots++; b.addBoon(b.tun.boon.perHeadshot);
      boss.data.headHp -= arrow.full ? 2 : 1;
      damageBoss(b, boss, arrow.dmg * 2, { full: arrow.full });
      if (boss.data.headHp <= 0 && !boss.dying) {
        st.gone = { ...st.gone, [st.active]: true }; boss.data.regrow.push({ i: st.active, t: 3.5 }); bus.emit('cue', 'headFall');
        RULES.ravana.next(b, boss);
      }
      return true;
    },
    next(b, boss) {
      const st = boss.data.heads; const free = [];
      for (let i = 0; i < 10; i++) if (!st.gone[i] && i !== st.active) free.push(i);
      boss.data.heads = { ...st, active: free.length ? free[Math.floor(b.rng.next() * free.length)] : st.active };
      boss.data.headHp = 3; boss.data.swapT = 0;
    },
    clamp(b, boss, hp) {
      const floor = boss.maxHp * 0.12;
      if (hp <= floor && !boss.data.done) {
        if (b.boon >= b.tun.boon.max) { if (!boss.data.asked) { boss.data.asked = true; b.requestAstra('brahma', 'astra.brahma', () => { boss.data.done = true; killBoss(b, boss); }); } }
        else if (!boss.data.toldBoon) { boss.data.toldBoon = true; b.say('ravana.boon'); }
        return Math.max(floor, hp);
      }
      return hp;
    },
    update(b, boss, dt) {
      if (boss.data.mounted && boss.phase >= 1) { boss.data.mounted = false; b.shake(5); b.burst(boss.x, GROUND - 60, PAL.gold, 18); }
      boss.data.swapT += dt;
      if (boss.data.swapT > 5.5) RULES.ravana.next(b, boss);
      for (const r of boss.data.regrow) r.t -= dt;
      const back = boss.data.regrow.filter((r) => r.t <= 0);
      if (back.length) { const g = { ...boss.data.heads.gone }; for (const r of back) delete g[r.i]; boss.data.heads = { ...boss.data.heads, gone: g }; boss.data.regrow = boss.data.regrow.filter((r) => r.t > 0); bus.emit('cue', 'headGrow'); }
      if (boss.hp <= boss.maxHp * 0.12 && !boss.data.asked && b.boon >= b.tun.boon.max) damageBoss(b, boss, 0.001);
    },
    draw(ctx, b, boss) { if (boss.data.mounted && !boss.dying) drawProp(ctx, 'chariot', boss.x - boss.facing * 40, GROUND, { dir: boss.facing, t: b.time, moving: boss.state === 'charging', spin: boss.walkT * 9 }); },
  },
};
