// The hero: movement, the bow, jump, roll, the automatic kick (which also parries), and
// Rama's rage. Feel: speed eases in and out, landings squash and raise dust, a bow drawn in the
// air hangs for a moment, the arrow's path shows as rice-paste dots, and a release just after
// the ring fills is a Perfect Draw.
import { input } from '../core/input.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { character, fig, WALK } from '../art/figures.js';
import { GROUND } from '../art/layout.js';
import { PAL } from '../art/palette.js';

/** How long after the ring fills a release still counts as a Perfect Draw (0.75s to 0.97s). */
export const PERFECT_WINDOW = 0.22;
export const RAGE_MAX = 100, RAGE_TIME = 7;

export function createHero(b, def) {
  const T = b.tun.hero;
  const maxHp = Math.round(T.hp * b.diff.heroHp);
  return {
    id: def.id, spec: character(def.id, def.stage), x: def.start ?? 200, y: GROUND, vx: 0, vy: 0, facing: 1,
    hp: maxHp, maxHp, onGround: true, drawT: 0, rollT: 0, rollDir: 1, inv: 0, kickT: 0, kickAnim: 0, coyote: 0, jumpBuf: 0,
    walkT: 0, shootCd: 0, shootAnim: 0, hurtAnim: 0, aim: 0, held: 0, dead: false, fullCue: false, w: 44, h: 150,
    rollInv: 0, dropT: 0, squash: 0, airHang: 0, parryT: 0, flashT: 0, rage: 0, rageT: 0, after: [],
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

/** Fill Rama's rage (when this battle allows it). */
export function addRage(b, n) {
  const h = b.hero;
  if (!b.rageOn || h.rageT > 0) return;
  const was = h.rage;
  h.rage = Math.min(RAGE_MAX, h.rage + n * (b.boon_raudra ? 1.5 : 1));
  if (was < RAGE_MAX && h.rage >= RAGE_MAX) bus.emit('rage:ready');
}

export function startRage(b) {
  const h = b.hero;
  if (!b.rageOn || h.rage < RAGE_MAX || h.rageT > 0 || h.dead) return false;
  h.rageT = RAGE_TIME; h.rage = 0;
  bus.emit('rage:start'); bus.emit('cue', 'tankaara');
  b.shake(5); b.slowT = 0.18; b.slow = 0.3;
  if (b.scatter) b.scatter(h.x);
  return true;
}

export function updateHero(b, dt) {
  const h = b.hero, T = b.tun.hero, B = b.tun.bow, F = b.tun.feel;
  if (h.dead) { h.vy += T.gravity * dt; h.y = Math.min(GROUND, h.y + h.vy * dt); return; }
  h.inv -= dt; h.kickT -= dt; h.kickAnim -= dt; h.shootCd -= dt; h.shootAnim -= dt; h.hurtAnim -= dt; h.parryT -= dt; h.flashT -= dt;
  h.squash *= Math.max(0, 1 - dt * 10);
  for (const a of h.after) a.t -= dt;
  h.after = h.after.filter((a) => a.t > 0);
  if (h.rageT > 0) { h.rageT -= dt; if (h.rageT <= 0) { h.rageT = 0; bus.emit('rage:end'); } }
  if (h.held > 0) { h.held -= dt; h.vx = 0; h.drawT = 0; h.fullCue = false; }
  const canAct = h.held <= 0 && !b.frozenInput;
  const ax = canAct ? input.axis : 0;
  const rage = h.rageT > 0, rageK = rage ? 1.25 : 1;
  if (canAct && input.consume('rage')) startRage(b);

  const rollTime = T.rollTime * (b.boon_vayu ? 1.3 : 1);
  if (canAct && input.consume('roll') && h.onGround && h.rollT <= 0) {
    // rollInv (not inv) protects the roll, so a shockwave, stomp or charge still has to be jumped
    h.rollT = rollTime * (rage ? 0.8 : 1); h.rollDir = ax || h.facing; h.drawT = 0; h.fullCue = false; h.rollStart = b.time;
    h.rollInv = T.rollInvulnerable * (b.boon_vayu ? 1.3 : 1); bus.emit('cue', 'roll');
  }
  if (h.rollInv > 0) h.rollInv -= dt;

  if (h.rollT > 0) {
    h.rollT -= dt; h.vx = h.rollDir * T.rollSpeed * rageK; h.facing = h.rollDir;
  } else if (canAct) {
    const wantsDraw = b.canShoot !== false && input.drawHeld() && h.shootCd <= 0;
    const speed = (wantsDraw ? T.drawWalk : T.walk) * rageK;
    // ease in and out of a walk: quicker on the ground than in the air
    const accel = h.onGround ? 18 : 10;
    h.vx += (ax * speed - h.vx) * Math.min(1, accel * dt);
    if (Math.abs(h.vx) < 2 && !ax) h.vx = 0;
    if (ax && !wantsDraw) h.facing = Math.sign(ax);
    // jump, with a little buffering and coyote time
    if (input.consume('jump')) h.jumpBuf = F.inputBuffer;
    h.jumpBuf -= dt; h.coyote = h.onGround ? F.coyoteTime : h.coyote - dt;
    if (h.jumpBuf > 0 && h.coyote > 0) { h.vy = -T.jumpVelocity; h.onGround = false; h.jumpBuf = 0; h.coyote = 0; h.squash = -0.1; bus.emit('cue', 'jump'); }
    if (wantsDraw) {
      if (h.drawT === 0) { const e = nearestEnemy(b, h); if (e && input.aim.source !== 'mouse' && !ax) h.facing = e.x >= h.x ? 1 : -1; bus.emit('cue', 'drawStart'); }
      h.drawT += dt;
      if (rage) h.drawT = Math.max(h.drawT, B.fullDraw); // in rage every draw is a full one
      aimHero(b, h);
      if (h.drawT >= B.fullDraw && !h.fullCue) { h.fullCue = true; h.flashT = 0.18; bus.emit('cue', 'fullDraw'); }
    } else if (h.drawT > 0) {
      const perfect = !rage && h.drawT >= B.fullDraw && h.drawT <= B.fullDraw + PERFECT_WINDOW;
      shoot(b, h, Math.min(1, h.drawT / B.fullDraw), perfect);
      h.drawT = 0; h.fullCue = false; h.shootCd = B.cooldown * (rage ? 0.6 : 1); h.shootAnim = 0.16;
    }
  } else h.vx = 0;

  // integrate; a bow drawn while falling hangs Rama in the air for a breath (at most 0.45s)
  let g = T.gravity;
  if (!h.onGround && h.drawT > 0 && h.vy > 0 && h.airHang < 0.45) { g *= 0.25; h.airHang += dt; }
  h.vy += g * dt;
  const py = h.y, wasGround = h.onGround, fallV = h.vy;
  h.x += h.vx * dt; h.y += h.vy * dt;
  let floor = GROUND;
  // down on a shelf drops through it; the short timer keeps the shelf from catching Rama again
  // on the next frame (onGround is already false by then)
  h.dropT -= dt;
  if (canAct && input.held.down && h.onGround && h.y < GROUND - 1) h.dropT = 0.22;
  if (h.dropT <= 0) for (const s of b.level.shelves || []) if (h.x > s.x1 && h.x < s.x2 && py <= GROUND - s.h + 1 && h.vy >= 0) floor = Math.min(floor, GROUND - s.h);
  if (h.y >= floor) { h.y = floor; h.vy = 0; h.onGround = true; } else h.onGround = false;
  if (!wasGround && h.onGround) {
    // landing: squash, and a few puffs of ink dust
    h.airHang = 0; h.squash = Math.min(0.2, 0.06 + fallV / 6000);
    if (fallV > 300) for (let i = 0; i < 5; i++) b.fx.push({ kind: 'dust', x: h.x + (i - 2) * 14, y: h.y - 2, vx: (i - 2) * 40, t: 0, dur: 0.45, seed: i });
  }
  h.x = Math.max(b.bounds.left + 30, Math.min(b.bounds.right - 30, h.x));
  if (Math.abs(h.vx) > 1 && h.onGround) h.walkT += dt; else if (h.onGround) h.walkT = 0;
  if ((rage || h.rollT > 0) && Math.floor(b.time * 30) % 2 === 0) h.after.push({ x: h.x, y: h.y, pose: heroPose(h), facing: h.facing, rot: h.rollT > 0 ? (1 - h.rollT / rollTime) * Math.PI * 2 * h.rollDir : 0, t: 0.18, gold: rage || h.perfectDodge > 0 });
  if (h.perfectDodge > 0) h.perfectDodge -= dt;

  // the kick: automatic when an enemy, or a low shot, is within arm's reach. Its first moments
  // are a parry window: a shot is sent back, a blow is turned and the striker staggers.
  if (h.kickT <= 0 && h.rollT <= 0 && h.onGround && canAct) {
    let did = false;
    for (const e of b.enemies) {
      if (e.dead || e.dying || e.def.flies || e.illusionGone || e.state === 'climb' && Math.abs(e.x - h.x) > T.kickReach) continue;
      if (Math.abs(e.x - h.x) < T.kickReach + e.def.width * 0.3 && Math.abs(e.y - h.y) < 60 && !e.def.custom) {
        h.facing = e.x >= h.x ? 1 : -1;
        kick(b, h);
        b.kickEnemy(e, h.facing);
        if (!b.saveSeen('hint.kick')) { b.label(h.x, h.y - 190, 'hint.kick'); b.markSeen('hint.kick'); }
        did = true; break;
      }
    }
    if (!did) for (const s of b.shots) {
      if (s.delay > 0 || s.fromHero || s.kind === 'bolt') continue;
      const ahead = (s.x - h.x) * Math.sign(-s.vx || 1);
      if (Math.abs(s.x - h.x) < T.kickReach + 20 && s.y > h.y - 95 && s.y < h.y && Math.sign(h.x - s.x) === Math.sign(s.vx) && ahead > -10) { h.facing = s.x >= h.x ? 1 : -1; kick(b, h); break; }
    }
  }
}

function kick(b, h) {
  const T = b.tun.hero;
  h.kickT = T.kickCooldown; h.kickAnim = 0.22; h.parryT = T.parryWindow || 0.18;
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

function shoot(b, h, power, perfect) {
  const B = b.tun.bow, L = arrowLaunch(b, h, power);
  const full = power >= 1, rage = h.rageT > 0;
  const arrow = { ...L, power, full, perfect, rage, dmg: full ? B.fullDamage : B.quickDamage, pierce: rage ? 99 : full ? B.pierce + (perfect ? 1 : 0) : 0, hit: new Set(), life: 2.4, stuck: 0, own: true, trail: [] };
  b.arrows.push(arrow);
  // the Indra quiver boon: a full draw looses a fan of three
  if (full && b.boon_indra) for (const da of [-7, 7]) { const sv = h.aim; h.aim = sv + da; const L2 = arrowLaunch(b, h, power); h.aim = sv; b.arrows.push({ ...arrow, ...L2, dmg: arrow.dmg * 0.6, pierce: 0, hit: new Set(), trail: [] }); }
  b.stats.shots++;
  if (perfect) { b.addBoon(2); addRage(b, 14); b.fx.push({ kind: 'nib', x: L.x, y: L.y, t: 0, dur: 0.3 }); bus.emit('cue', 'perfect'); }
  bus.emit('hero:shoot', { power, full, perfect });
}

export function heroPose(h) {
  if (h.dead) return 'hurt';
  if (h.hurtAnim > 0) return 'hurt';
  if (h.rollT > 0) return 'crouch';
  if (h.kickAnim > 0) return 'kick';
  if (!h.onGround) return 'jump';
  if (h.drawT > 0) return h.drawT < 0.18 ? 'draw0' : h.drawT < 0.5 ? 'draw1' : 'draw2';
  if (h.shootAnim > 0) return 'shoot';
  if (Math.abs(h.vx) > 1) return WALK[Math.floor(h.walkT * 9) % 4];
  return 'stand';
}

export function drawHero(ctx, b) {
  const h = b.hero;
  const pose = heroPose(h);
  let rot = 0;
  if (h.rollT > 0) rot = (1 - h.rollT / (b.tun.hero.rollTime * (b.boon_vayu ? 1.3 : 1))) * Math.PI * 2 * h.rollDir;
  if (h.dead) rot = -h.facing * Math.min(1.4, h.deadT * 4);
  // afterimages: the roll and the rage leave a fading trail (gold in rage or after a perfect dodge)
  for (const a of h.after) { ctx.save(); ctx.globalAlpha = (a.t / 0.18) * 0.32; fig(ctx, h.spec, a.pose, a.x, a.y, { facing: a.facing, rot: a.rot, mode: a.gold ? 'sil' : 'line', pivot: 0.25 }); ctx.restore(); }
  if (h.rageT > 0) {
    // the rage aura: a pulsing vermilion and gold flame behind Rama
    const k = 0.75 + Math.sin(b.time * 12) * 0.25;
    const gr = ctx.createRadialGradient(h.x, h.y - 80, 10, h.x, h.y - 80, 130 * k);
    gr.addColorStop(0, 'rgba(230,172,23,0.55)'); gr.addColorStop(0.5, 'rgba(168,36,20,0.35)'); gr.addColorStop(1, 'rgba(168,36,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(h.x, h.y - 80, 110 * k, 140 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  const blink = h.inv > 0 && h.rollT <= 0 && Math.floor(h.inv * 14) % 2 === 0;
  // squash on landing (wider and shorter), stretch on take-off, about the feet
  const sq = save.data.settings.reducedMotion ? 0 : h.squash;
  ctx.save(); ctx.translate(h.x, h.y); ctx.scale(1 + sq, 1 - sq); ctx.translate(-h.x, -h.y);
  fig(ctx, h.spec, pose, h.x, h.y, { facing: h.facing, aim: h.aim, rot, alpha: blink ? 0.45 : 1, pivot: h.rollT > 0 ? 0.25 : 0.05 });
  ctx.restore();
  // the charge ring: a thin arc around the hero fills as the draw charges
  if (h.drawT > 0) {
    const B = b.tun.bow, k = Math.min(1, h.drawT / B.fullDraw);
    const inPerfect = h.drawT >= B.fullDraw && h.drawT <= B.fullDraw + PERFECT_WINDOW && h.rageT <= 0;
    ctx.lineCap = 'round';
    ctx.strokeStyle = PAL.black; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(h.x, h.y - 96, 92, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = inPerfect ? PAL.gold : k >= 1 ? PAL.turmeric : PAL.indigo; ctx.lineWidth = inPerfect ? 4.5 : 3; ctx.beginPath(); ctx.arc(h.x, h.y - 96, 92, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    // the nib flash the moment the ring fills
    if (h.flashT > 0) { const L = arrowLaunch(b, h, 1); ctx.save(); ctx.globalAlpha = h.flashT / 0.18; ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.arc(L.x + h.facing * 6, L.y, 9 + (0.18 - h.flashT) * 60, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    // the arrow's path in rice-paste dots, like aripan, at the power it would fly with now
    const L = arrowLaunch(b, h, k);
    for (let i = 1; i <= 12; i++) {
      const tt = i * 0.04, x = L.x + L.vx * tt, y = L.y + L.vy * tt + 0.5 * L.g * tt * tt;
      if (y > GROUND) break;
      ctx.globalAlpha = 0.75 - (i / 12) * 0.65;
      ctx.fillStyle = PAL.black; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill();
      ctx.fillStyle = k >= 1 ? PAL.cream : PAL.white; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
