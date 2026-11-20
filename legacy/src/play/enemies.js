// Rank-and-file enemies. Twelve types, each with one behaviour and one counter.
// Behaviour is chosen by attack.kind in data/enemies.json; numbers live in that file.
import defs from '../data/enemies.json';
import { bus } from '../core/events.js';
import { character, enemySpec, fig, WALK } from '../art/figures.js';
import { RAKSHASA_ACCENTS, PAL } from '../art/palette.js';
import { GROUND } from '../art/layout.js';
import { drawProp } from '../art/props.js';
import { shape, ellipsePts, line, dots } from '../art/ink.js';
import * as M from '../art/motifs.js';

export const ENEMY = Object.fromEntries(defs.map((d) => [d.id, d]));
const FLY_Y = GROUND - 300;

export function spawnEnemy(b, type, side, o = {}) {
  let def = ENEMY[type], spec = null, elite = null;
  if (type.startsWith('elite:')) {
    elite = type.slice(6);
    def = { ...ENEMY.brute, id: type, hp: o.hp || 16, speed: 76 };
    spec = character(elite);
    def = { ...def, height: 150 * spec.build.height, width: 80 };
  }
  if (!def) throw new Error('Unknown enemy type ' + type);
  // never two of the same type with the same seed on screen at once
  let seed = 0;
  do { seed = 1 + Math.floor(b.rng.next() * 9973); } while (b.enemies.some((e) => !e.dead && e.type === type && e.seed === seed));
  if (!spec && !def.custom) spec = enemySpec(def.id, def.silhouette, seed, RAKSHASA_ACCENTS[b.kanda] || RAKSHASA_ACCENTS.bala);
  if (def.custom === 'elephant') spec = enemySpec('rider', 'rider', seed, RAKSHASA_ACCENTS[b.kanda] || RAKSHASA_ACCENTS.bala);
  const view = b.view();
  const dir = side === 'left' ? -1 : 1;
  let x = o.x ?? (dir > 0 ? Math.min(view.right + 90 + (o.i || 0) * 30, b.bounds.right + 260) : Math.max(view.left - 90 - (o.i || 0) * 30, b.bounds.left - 260));
  const e = {
    type, def, spec, seed, elite, x, y: def.flies ? FLY_Y - (seed % 5) * 14 : GROUND, vx: 0, vy: 0, facing: -dir,
    hp: def.hp, maxHp: def.hp, state: 'approach', t: 0, stun: 0, walkT: (seed % 10) / 10, drain: 0, dying: false, dead: false,
    hitFlash: 0, struck: false, target: o.target || 'hero', illusion: !!o.illusion, splitT: def.illusions ? 1.4 : 0, add: !!o.add,
  };
  if (def.climbs) { e.x = dir > 0 ? b.bounds.right - 26 : b.bounds.left + 26; e.y = GROUND + 150; e.state = 'climb'; }
  b.enemies.push(e);
  return e;
}

export function enemyBoxes(e) {
  const d = e.def, w = d.width, h = d.height;
  if (d.custom === 'elephant') return { body: { x: e.x - 95, y: e.y - 165, w: 190, h: 165 }, head: { x: e.x - 30 * e.facing - 22, y: e.y - 268, w: 44, h: 44 } };
  if (d.custom === 'naga') return { body: { x: e.x - 80, y: e.y - 40, w: 160, h: 40 }, head: { x: e.x + e.facing * 78 - 22, y: e.y - 96, w: 44, h: 40 } };
  const boxes = { body: { x: e.x - w * 0.36, y: e.y - h * 0.8, w: w * 0.72, h: h * 0.8 }, head: { x: e.x - 17 + e.facing * 4, y: e.y - h * 1.02, w: 34, h: h * 0.24 } };
  if (d.banner) boxes.banner = { x: e.x - 30, y: e.y - h - 150, w: 60, h: 120 };
  return boxes;
}

function targetOf(b, e) {
  if (e.target === 'protect' && b.protect && b.protect.hp > 0) return { x: b.protect.x, y: GROUND, protect: true };
  if (e.target === 'ally' && b.protected && !b.protected.hurt) return { x: b.protected.x, y: GROUND, ally: true };
  return b.hero;
}

function strike(b, e, tgt, dmg, reach) {
  if (tgt.protect) { if (Math.abs(tgt.x - e.x) < reach + 30) b.damageProtect(dmg); return; }
  if (tgt.ally) { if (Math.abs(tgt.x - e.x) < reach + 20) b.allyHurt(); return; }
  const h = b.hero;
  if (Math.abs(h.x - e.x) < reach + 12) b.hurtHero(dmg, e.x, e.def.attack.answer, e.def.attack.kind);
}

export function updateEnemies(b, dt) {
  const sp = b.diff.enemySpeed, tele = b.diff.telegraph;
  for (const e of b.enemies) {
    if (e.dead) continue;
    e.hitFlash -= dt;
    if (e.dying) { e.t += dt; e.drain = Math.min(1, e.t / 0.3); if (e.t > 0.8) e.dead = true; continue; }
    const d = e.def, A = d.attack;
    if (e.stun > 0) { e.stun -= dt; e.x += e.vx * dt; e.vx *= 0.86; if (!d.flies && !d.climbs) e.y = GROUND; if (d.climbs && (e.x < b.bounds.left + 8 || e.x > b.bounds.right - 8)) b.killEnemy(e, 'fall'); continue; }
    const tgt = targetOf(b, e);
    const dx = tgt.x - e.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
    e.t += dt;
    if (e.splitT > 0 && !e.illusion) {
      e.splitT -= dt;
      if (e.splitT <= 0) for (let i = 0; i < d.illusions; i++) { const il = spawnEnemy(b, e.type, 'right', { illusion: true, x: e.x + (i ? 170 : -170) }); il.spec = e.spec; il.hp = 1; il.splitT = 0; b.burst(il.x, il.y - 90, PAL.grey, 8); }
    }
    switch (e.state) {
      case 'climb': {
        e.y -= 110 * sp * dt; e.facing = e.x < (b.bounds.left + b.bounds.right) / 2 ? 1 : -1;
        if (e.y <= GROUND) { e.y = GROUND; e.state = 'approach'; e.t = 0; }
        break;
      }
      case 'approach': {
        e.facing = dir;
        let want = A.kind === 'shoot' || A.kind === 'bolt' || A.kind === 'lob' || A.kind === 'heal' ? d.reach : d.reach * 0.82;
        if (A.kind === 'melee' || A.kind === 'coil') want = d.reach * 0.8;
        let mv = 0;
        if (adx > want) mv = dir; else if ((A.kind === 'shoot' || A.kind === 'lob' || A.kind === 'heal' || A.kind === 'bolt') && adx < want * 0.55) mv = -dir;
        e.x += mv * d.speed * sp * dt; if (mv) e.walkT += dt;
        if (d.flies) e.y += (FLY_Y - (e.seed % 5) * 14 + Math.sin(b.time * 3 + e.seed) * 14 - e.y) * dt * 3;
        const inView = e.x > b.view().left - 20 && e.x < b.view().right + 20;
        if (adx <= want + 6 && inView && e.t > 0.5 && !(e.illusion && A.kind !== 'bolt')) {
          if (A.kind === 'heal' && !b.enemies.some((o) => o !== e && !o.dead && !o.dying && o.hp < o.maxHp)) break;
          e.state = 'windup'; e.t = 0; e.struck = false; e.aimX = tgt.x; e.aimY = tgt.y - 90;
          if (!e.illusion) b.telegraph(e, A.telegraph, A.answer);
          if (A.kind === 'lob') { e.aimX = Math.max(b.bounds.left + 40, Math.min(b.bounds.right - 40, tgt.x + (b.hero.vx || 0) * 0.3)); b.zones.push({ kind: 'fireWarn', x: e.aimX, r: 54, t: 0, dur: A.windup * tele + 0.7, then: { kind: 'fire', dur: A.burn, dmg: A.damage } }); }
          if (A.kind === 'coil') b.zones.push({ kind: 'coil', follow: true, x: b.hero.x, r: 90, t: 0, dur: A.windup * tele, dmg: A.damage, src: e });
        }
        break;
      }
      case 'windup': {
        if (A.kind === 'shoot' || A.kind === 'bolt') { if (e.t < A.windup * tele * 0.6) { e.aimX = tgt.x; e.aimY = tgt.y - 90; } e.facing = Math.sign(e.aimX - e.x) || 1; }
        if (e.t >= A.windup * tele) {
          e.state = 'attack'; e.t = 0;
          if (A.kind === 'melee') { strike(b, e, tgt, A.damage, d.reach); e.state = 'recover'; }
          else if (A.kind === 'charge') { e.dashDir = dir; e.dashFrom = e.x; }
          else if (A.kind === 'dive') { e.fromX = e.x; e.fromY = e.y; e.toX = tgt.x; e.toY = (tgt.y ?? GROUND) - 70; }
          else if (A.kind === 'shoot' || A.kind === 'bolt') {
            if (!e.illusion) { const ox = e.x + e.facing * 30, oy = e.y - d.height * 0.72; const a = Math.atan2(e.aimY - oy, e.aimX - ox); b.shots.push({ x: ox, y: oy, vx: Math.cos(a) * A.projectileSpeed * sp, vy: Math.sin(a) * A.projectileSpeed * sp, dmg: A.damage, kind: A.kind === 'bolt' ? 'bolt' : 'arrow', life: 3, answer: A.answer }); bus.emit('cue', 'enemyShot'); }
            e.state = 'recover';
          } else if (A.kind === 'heal') {
            for (const o of b.enemies) if (o !== e && !o.dead && !o.dying && Math.abs(o.x - e.x) < A.radius && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + A.heal); b.fx.push({ kind: 'vine', x: o.x, y: o.y, t: 0, dur: 0.8, enemy: true }); }
            e.state = 'recover';
          } else e.state = 'recover';
        }
        break;
      }
      case 'attack': {
        if (A.kind === 'charge') {
          e.x += e.dashDir * d.speed * A.dash * sp * dt; e.walkT += dt * 2;
          const h = b.hero;
          if (!e.struck && Math.abs(h.x - e.x) < d.width * 0.5 + 18 && h.y > GROUND - 46 - (d.custom ? 40 : 0)) { e.struck = true; b.hurtHero(A.damage, e.x, A.answer, 'charge'); }
          if (Math.abs(e.x - e.dashFrom) > d.reach + 300 || e.x < b.bounds.left - 60 || e.x > b.bounds.right + 60) { e.state = 'recover'; e.t = 0; }
        } else if (A.kind === 'dive') {
          const k = Math.min(1, e.t / 0.42);
          e.x = e.fromX + (e.toX - e.fromX) * k; e.y = e.fromY + (e.toY - e.fromY) * k * k;
          if (k >= 1) { strike(b, e, tgt, A.damage, 62); e.state = 'recover'; e.t = 0; }
        }
        break;
      }
      case 'recover': {
        if (d.flies) e.y += (FLY_Y - e.y) * dt * 2.2;
        if (e.t >= A.recover / Math.max(0.8, sp)) { e.state = 'approach'; e.t = 0; }
        break;
      }
      default: break;
    }
    if (!d.flies && e.state !== 'climb') e.y = GROUND;
  }
  // remove the dead, keep the array small
  if (b.enemies.length > 40) b.enemies = b.enemies.filter((e) => !e.dead);
}

function enemyPose(e) {
  const k = e.def.attack.kind;
  if (e.dying || e.stun > 0) return 'hurt';
  if (e.def.flies) return e.state === 'attack' ? 'fly' : Math.floor(e.walkT * 6 + e.t * 6) % 2 ? 'fly' : 'fly2';
  if (e.state === 'climb') return 'climb';
  if (e.state === 'windup') return k === 'shoot' ? (e.t < 0.4 ? 'draw1' : 'draw2') : k === 'charge' ? 'crouch' : k === 'lob' || k === 'bolt' || k === 'heal' ? 'raise' : 'swing0';
  if (e.state === 'attack') return k === 'charge' ? (Math.floor(e.walkT * 10) % 2 ? 'charge' : 'charge2') : 'swing1';
  if (e.state === 'recover' && e.t < 0.25) return k === 'shoot' ? 'shoot' : k === 'melee' ? 'swing1' : 'stand';
  if (e.state === 'approach') return WALK[Math.floor(e.walkT * Math.max(4, Math.min(11, e.def.speed / 16))) % 4];
  return 'stand';
}

export function drawEnemy(ctx, b, e) {
  const d = e.def;
  const alpha = (e.dying ? Math.max(0, 1 - (e.t - 0.3) / 0.5) : 1) * (e.illusion ? 0.92 : 1);
  const sink = e.dying ? Math.max(0, e.t - 0.3) * 40 : 0;
  ctx.save(); ctx.globalAlpha = alpha;
  if (d.custom === 'elephant') {
    drawProp(ctx, 'elephant', e.x, e.y + sink, { dir: e.facing, t: b.time, moving: e.state !== 'windup', colour: !e.dying });
    fig(ctx, e.spec, 'sit', e.x - e.facing * 12, e.y - 150 + sink, { facing: e.facing, drain: e.drain });
  } else if (d.custom === 'naga') {
    drawProp(ctx, 'naga', e.x, e.y + sink, { dir: e.facing, t: b.time, colour: !e.dying });
  } else {
    const pose = enemyPose(e);
    fig(ctx, e.spec, pose, e.x + (e.hitFlash > 0 ? -e.facing * 4 : 0), e.y + sink, { facing: e.facing, drain: e.drain, rot: e.dying ? -e.facing * Math.min(0.5, e.t) : 0 });
    if (d.blocksFront && !e.dying) {
      const sx = e.x + e.facing * 34, sy = e.y - d.height * 0.5, up = e.state === 'windup' || e.stun > 0 ? -40 : 0;
      shape(ctx, ellipsePts(sx, sy + up, 20, 46, 10), { mode: 'colour', fill: PAL.rakshasaLight, gap: PAL.ochre, w: 1.8, seed: e.seed, smooth: true });
      dots(ctx, sx, sy + up, 0, 1, PAL.ochre, 1, 5);
    }
    if (d.banner && !e.dying) {
      const bx = e.x, top = e.y - d.height - 150 - (e.state === 'windup' ? 20 : 0);
      line(ctx, [[bx, e.y - d.height * 0.5], [bx, top]], { w: 3, seed: 2 });
      shape(ctx, [[bx, top], [bx + e.facing * 64, top + 14], [bx + e.facing * 50, top + 44], [bx + e.facing * 64, top + 76], [bx, top + 90]], { mode: 'colour', fill: PAL.rakshasaLight, gap: PAL.ochre, w: 1.8, seed: e.seed });
      M.usableRing(ctx, bx + e.facing * 30, top + 45, 54, b.time);
    }
  }
  ctx.restore();
  if (e.dying || e.illusion && e.state !== 'windup') return;
  // telegraphs: each warning is one painted motif
  const A = d.attack, tele = b.diff.telegraph;
  if (e.state === 'windup') {
    const k = Math.min(1, e.t / (A.windup * tele));
    const top = e.y - d.height - (d.custom === 'elephant' ? 120 : 40);
    if (A.telegraph === 'star') M.star(ctx, e.x, top, 13 + k * 9, { rot: b.time * 2, seed: e.seed });
    else if (A.telegraph === 'dustLine') {
      const dir = Math.sign(b.hero.x - e.x) || 1;
      ctx.strokeStyle = PAL.kusum; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -b.time * 120;
      ctx.beginPath(); ctx.moveTo(e.x, GROUND - 6); ctx.lineTo(e.x + dir * (d.reach + 220) * k, GROUND - 6); ctx.stroke(); ctx.setLineDash([]);
      M.star(ctx, e.x, top, 12, { rot: b.time * 2 });
    } else if (A.telegraph === 'redPath') {
      const ox = e.x + e.facing * 30, oy = e.y - d.height * 0.72;
      const a = Math.atan2(e.aimY - oy, e.aimX - ox);
      ctx.fillStyle = PAL.kusum;
      for (let i = 1; i < 22 * k; i++) { ctx.beginPath(); ctx.arc(ox + Math.cos(a) * i * 30, oy + Math.sin(a) * i * 30, 4, 0, 7); ctx.fill(); }
    } else if (A.telegraph === 'shadowStar' && !e.illusion) M.star(ctx, e.x, GROUND - 5, 20, { shadow: true, rot: 0.4, fill: PAL.kusum });
    else if (A.telegraph === 'bannerRaise') M.star(ctx, e.x, top - 110, 12, { rot: b.time * 2 });
    else if (A.telegraph === 'flameTongue') M.star(ctx, e.x, top, 12, { rot: b.time * 2 });
  }
  if (!e.illusion && A.telegraph === 'shadowStar' && e.state !== 'windup' && e.splitT <= 0) M.star(ctx, e.x, GROUND - 4, 11, { shadow: true, rot: 0.4, fill: PAL.kusum });
}
