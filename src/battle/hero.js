// The hero: movement, the bow, jump, roll and the automatic kick.
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { character, fig, WALK } from '../art/figures.js';
import { GROUND } from '../art/layout.js';
import { PAL } from '../art/palette.js';

export function createHero(b, def) {
  const T = b.tun.hero;
  const maxHp = Math.round(T.hp * b.diff.heroHp);
  return {
    id: def.id, spec: character(def.id, def.stage), x: def.start ?? 200, y: GROUND, vx: 0, vy: 0, facing: 1,
    hp: maxHp, maxHp, onGround: true, drawT: 0, rollT: 0, rollDir: 1, inv: 0, kickT: 0, kickAnim: 0, coyote: 0, jumpBuf: 0,
    walkT: 0, shootCd: 0, shootAnim: 0, hurtAnim: 0, aim: 0, held: 0, dead: false, fullCue: false, w: 44, h: 150,
  };
}

function nearestEnemy(b, h, dirOnly) {
  let best = null, bd = 1e9;
  for (const e of b.foes()) {
    const d = Math.abs(e.x - h.x);
    if (dirOnly && Math.sign(e.x - h.x) !== h.facing) continue;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function updateHero(b, dt) {
  const h = b.hero, T = b.tun.hero, B = b.tun.bow, F = b.tun.feel;
  if (h.dead) { h.vy += T.gravity * dt; h.y = Math.min(GROUND, h.y + h.vy * dt); return; }
  h.inv -= dt; h.kickT -= dt; h.kickAnim -= dt; h.shootCd -= dt; h.shootAnim -= dt; h.hurtAnim -= dt;
  if (h.held > 0) { h.held -= dt; h.vx = 0; h.drawT = 0; }
  const canAct = h.held <= 0 && !b.frozenInput;
  const ax = canAct ? input.axis : 0;

  if (canAct && input.consume('roll') && h.onGround && h.rollT <= 0) {
    h.rollT = T.rollTime; h.rollDir = ax || h.facing; h.drawT = 0; h.inv = Math.max(h.inv, T.rollInvulnerable);
    h.rollInv = T.rollInvulnerable; bus.emit('cue', 'roll');
  }
  if (h.rollInv > 0) h.rollInv -= dt;

  if (h.rollT > 0) {
    h.rollT -= dt; h.vx = h.rollDir * T.rollSpeed; h.facing = h.rollDir;
  } else if (canAct) {
    const wantsDraw = b.canShoot !== false && input.drawHeld() && h.shootCd <= 0;
    const speed = wantsDraw ? T.drawWalk : T.walk;
    h.vx = ax * speed;
    if (ax && !wantsDraw) h.facing = Math.sign(ax);
    // jump, with a little buffering and coyote time
    if (input.consume('jump')) h.jumpBuf = F.inputBuffer;
    h.jumpBuf -= dt; h.coyote = h.onGround ? F.coyoteTime : h.coyote - dt;
    if (h.jumpBuf > 0 && h.coyote > 0) { h.vy = -T.jumpVelocity; h.onGround = false; h.jumpBuf = 0; h.coyote = 0; bus.emit('cue', 'jump'); }
    if (wantsDraw) {
      if (h.drawT === 0) { const e = nearestEnemy(b, h); if (e && input.aim.source !== 'mouse' && !ax) h.facing = e.x >= h.x ? 1 : -1; bus.emit('cue', 'drawStart'); }
      h.drawT += dt;
      aimHero(b, h);
      if (h.drawT >= B.fullDraw && !h.fullCue) { h.fullCue = true; bus.emit('cue', 'fullDraw'); }
    } else if (h.drawT > 0) {
      shoot(b, h, Math.min(1, h.drawT / B.fullDraw));
      h.drawT = 0; h.fullCue = false; h.shootCd = B.cooldown; h.shootAnim = 0.16;
    }
  } else h.vx = 0;

  // integrate
  h.vy += T.gravity * dt;
  const py = h.y;
  h.x += h.vx * dt; h.y += h.vy * dt;
  let floor = GROUND;
  for (const s of b.level.shelves || []) if (h.x > s.x1 && h.x < s.x2 && py <= GROUND - s.h + 1 && h.vy >= 0 && !(input.held.down && h.onGround)) floor = Math.min(floor, GROUND - s.h);
  if (h.y >= floor) { h.y = floor; h.vy = 0; h.onGround = true; } else h.onGround = false;
  h.x = Math.max(b.bounds.left + 30, Math.min(b.bounds.right - 30, h.x));
  if (Math.abs(h.vx) > 1 && h.onGround) h.walkT += dt; else if (h.onGround) h.walkT = 0;

  // the kick: automatic when an enemy is within arm's reach
  if (h.kickT <= 0 && h.rollT <= 0 && h.onGround && canAct) {
    for (const e of b.enemies) {
      if (e.dead || e.dying || e.def.flies || e.illusionGone || e.state === 'climb' && Math.abs(e.x - h.x) > T.kickReach) continue;
      if (Math.abs(e.x - h.x) < T.kickReach + e.def.width * 0.3 && Math.abs(e.y - h.y) < 60 && !e.def.custom) {
        h.kickT = T.kickCooldown; h.kickAnim = 0.22; h.facing = e.x >= h.x ? 1 : -1;
        b.kickEnemy(e, h.facing);
        if (!b.saveSeen('hint.kick')) { b.label(h.x, h.y - 190, 'hint.kick'); b.markSeen('hint.kick'); }
        break;
      }
    }
  }
}

function aimHero(b, h) {
  const B = b.tun.bow, a = input.aim;
  let ang = 0;
  if (input.device === 'mouse' || (a.source === 'mouse' && input.device !== 'touch' && input.device !== 'pad' && input.held.mouseDraw)) {
    const p = b.toWorld(a.x, a.y);
    const ox = h.x, oy = h.y - 118;
    if (Math.abs(p.x - ox) > 18) h.facing = p.x >= ox ? 1 : -1;
    ang = (Math.atan2(oy - p.y, Math.abs(p.x - ox)) * 180) / Math.PI;
  } else if (input.device === 'pad') {
    if (Math.abs(a.padX) > 0.3) h.facing = a.padX > 0 ? 1 : -1;
    ang = Math.hypot(a.padX, a.padY) > 0.3 ? (Math.atan2(-a.padY, Math.abs(a.padX)) * 180) / Math.PI : 0;
  } else if (input.device === 'touch') {
    if (a.dx < -56) h.facing = -1; else if (a.dx > 56) h.facing = 1;
    ang = -a.dy * 0.4;
  } else {
    ang = input.held.up ? 30 : input.held.down ? -15 : 0;
  }
  if (b.diff.aimAssist) {
    const e = nearestEnemy(b, h, true);
    if (e) { const hb = b.headOf(e); const t = (Math.atan2(h.y - 118 - hb.y, Math.abs(hb.x - h.x)) * 180) / Math.PI; ang = input.device === 'mouse' ? ang * 0.6 + t * 0.4 : t + ang * 0.5; }
  }
  h.aim = Math.max(-B.aimDown, Math.min(B.aimUp, ang));
}

export function arrowLaunch(b, h, power) {
  const B = b.tun.bow, a = (h.aim * Math.PI) / 180;
  const speed = B.minSpeed + (B.maxSpeed - B.minSpeed) * power;
  return { x: h.x + h.facing * 34, y: h.y - 118 - Math.sin(a) * 30, vx: Math.cos(a) * speed * h.facing, vy: -Math.sin(a) * speed, g: B.minGravity + (B.maxGravity - B.minGravity) * power };
}

function shoot(b, h, power) {
  const B = b.tun.bow, L = arrowLaunch(b, h, power);
  const full = power >= 1;
  b.arrows.push({ ...L, power, full, dmg: full ? B.fullDamage : B.quickDamage, pierce: full ? B.pierce : 0, hit: new Set(), life: 2.4, stuck: 0, own: true });
  b.stats.shots++;
  bus.emit('hero:shoot', { power, full });
}

export function heroPose(h) {
  if (h.dead) return 'hurt';
  if (h.hurtAnim > 0) return 'hurt';
  if (h.rollT > 0) return 'crouch';
  if (h.kickAnim > 0) return 'kick';
  if (!h.onGround) return 'jump';
  if (h.drawT > 0) return h.drawT < 0.18 ? 'draw0' : h.drawT < 0.5 ? 'draw1' : 'draw2';
  if (h.shootAnim > 0) return 'shoot';
  if (Math.abs(h.vx) > 1) return WALK[Math.floor(h.walkT * 6) % 4];
  return 'stand';
}

/** How the hero should look this frame: pose, rotation, alpha, pivot. */
export function heroLook(b) {
  const h = b.hero;
  let rot = 0;
  if (h.rollT > 0) rot = (1 - h.rollT / b.tun.hero.rollTime) * Math.PI * 2 * h.rollDir;
  if (h.dead) rot = -h.facing * Math.min(1.4, (h.deadT || 0) * 4);
  const blink = h.inv > 0 && h.rollT <= 0 && Math.floor(h.inv * 14) % 2 === 0;
  return { pose: heroPose(h), rot, alpha: blink ? 0.45 : 1, pivot: h.rollT > 0 ? 0.25 : 0.05 };
}

export function drawHero(ctx, b) {
  const h = b.hero;
  const pose = heroPose(h);
  let rot = 0;
  if (h.rollT > 0) rot = (1 - h.rollT / b.tun.hero.rollTime) * Math.PI * 2 * h.rollDir;
  if (h.dead) rot = -h.facing * Math.min(1.4, h.deadT * 4);
  const blink = h.inv > 0 && h.rollT <= 0 && Math.floor(h.inv * 14) % 2 === 0;
  // the figure itself is drawn on the GPU (battle/view.js); this draws the bow's charge ring
  void pose; void rot; void blink;
  // the charge ring: a thin arc around the hero fills as the draw charges
  if (h.drawT > 0) {
    const k = Math.min(1, h.drawT / b.tun.bow.fullDraw);
    ctx.lineCap = 'round';
    ctx.strokeStyle = PAL.black; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(h.x, h.y - 96, 92, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = k >= 1 ? PAL.turmeric : PAL.indigo; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y - 96, 92, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    if (k >= 1) {
      // the arrow path at full draw, in rice-paste dots like aripan
      const L = arrowLaunch(b, h, 1);
      let x = L.x, y = L.y, vy = L.vy;
      for (let i = 0; i < 16; i++) {
        x += L.vx * 0.035; vy += L.g * 0.035; y += vy * 0.035;
        if (y > GROUND) break;
        ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill();
        ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      }
    }
  }
}
