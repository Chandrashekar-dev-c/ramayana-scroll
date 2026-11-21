// The hero: movement, the bow, jump, roll, parry, a three-hit close combo, and Rama's rage.
// Feel: speed eases in and out, landings squash and raise dust, a bow drawn in the air hangs for
// a moment, the arrow's path shows as rice-paste dots, and a release just after the ring fills is
// a Perfect Draw. Traversal: a roll in the air is an air-dash (Vayu step); Rama slides down and
// kicks off walls, and vaults up onto a ledge he only just misses.
// Parry is manual (Q, LT, the shield button); in Story mode the old automatic kick still parries.
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
    parryCd: 0, parryBuf: 0,
    airDash: 1, airDashT: 0, wallDir: 0, wallCoyote: 0, wallJumpLock: 0, vaultT: 0, vaultFrom: null, vaultTo: null,
    comboStep: 0, comboT: 0, comboWin: 0, comboHit: new Set(), comboStruck: false,
  };
}

/** The three-hit close combo: a bow-sweep, a rising arc that pops a foe up, a heavy kick. */
export const COMBO = [
  null,
  { name: 'sweep', pose: 'strike1', startup: 0.06, active: 0.10, dmg: 1.5, knock: 60, pop: 0, stun: 0.25, boon: 2, rage: 6, reach: 92 },
  { name: 'rise', pose: 'strike2', startup: 0.08, active: 0.12, dmg: 2.0, knock: 80, pop: 320, stun: 0.6, boon: 3, rage: 8, reach: 96 },
  { name: 'dharma', pose: 'strike3', startup: 0.11, active: 0.14, dmg: 3.5, knock: 260, pop: 0, stun: 1.2, boon: 4, rage: 14, reach: 112 },
];
const comboDur = (st) => st.startup + st.active + 0.06;

/** A parry that met a blow or a shot: refreshes the parry and the air-dash, feeds boon and rage. */
export function onParrySuccess(b, h, kind = 'normal') {
  const gold = kind === 'gold';
  h.parryCd = 0; h.airDash = 1;
  b.addBoon(gold ? 10 : 6);
  addRage(b, gold ? 30 : 18);
  b.hitStop = gold ? 0.11 : 0.08;
  b.camZoomTo = 1.06;
  if (gold) { h.drawT = Math.max(h.drawT, b.tun.bow.fullDraw); h.fullCue = true; b.slowMo = { t: 0.25, scale: 0.3 }; }
}

/** -1 when Rama is pressed against a wall on his left, +1 on his right, 0 when not. */
export function wallContact(b, h) {
  if (h.onGround) return 0;
  if (h.x <= b.bounds.left + 31) return -1;
  if (h.x >= b.bounds.right - 31) return 1;
  for (const w of b.walls || []) {
    if (h.y - 120 > w.y2 || h.y < w.y1) continue;
    if (h.x + 22 >= w.x1 - 2 && h.x < w.x1) return 1;
    if (h.x - 22 <= w.x2 + 2 && h.x > w.x2) return -1;
  }
  return 0;
}

/** The surfaces Rama can stand on: shelves from the level, live platforms, arrow footholds. */
export function surfaces(b) {
  const out = [];
  for (const s of b.level.shelves || []) out.push({ x1: s.x1, x2: s.x2, y: GROUND - s.h });
  for (const p of b.platforms || []) if (!p.broken) out.push({ x1: p.x, x2: p.x + p.w, y: p.y, ref: p });
  for (const f of b.footholds || []) out.push({ x1: f.x, x2: f.x + f.w, y: f.y, ref: f });
  return out;
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
  h.parryCd -= dt; h.wallJumpLock -= dt; h.comboWin -= dt;

  // manual parry: buffered a moment so a press a hair early still counts
  if (input.consume('parry')) h.parryBuf = T.parryBuffer;
  if (h.parryBuf > 0) h.parryBuf -= dt;
  if (h.parryBuf > 0 && h.parryCd <= 0 && canAct && h.rollT <= 0) {
    h.parryT = T.parryWindow; h.parryCd = T.parryCooldown; h.kickAnim = 0.22; h.parryBuf = 0;
    h.drawT = 0; h.fullCue = false; h.comboT = 0;
    bus.emit('cue', 'swish');
  }

  // the close combo; any of jump, roll, parry or the bow cancels a swing, and cancelling the
  // third into the bow gives the draw a head start
  if (canAct && input.consume('strike') && h.rollT <= 0 && h.vaultT <= 0) {
    if (h.comboT <= 0) {
      h.comboStep = h.comboWin > 0 ? (h.comboStep % 3) + 1 : 1;
      h.comboT = comboDur(COMBO[h.comboStep]); h.comboWin = T.comboWindow + h.comboT;
      h.comboHit.clear(); h.comboStruck = false; h.drawT = 0; h.fullCue = false;
      bus.emit('cue', 'swish');
    } else h.comboQueued = true;
  }
  if (h.comboT > 0) {
    const P = input.pressed, cancel = P.jump || P.roll || P.parry || h.parryT > 0 || input.drawHeld();
    if (cancel) { if (input.drawHeld() && h.comboStep === 3) h.drawT = 0.35; h.comboT = 0; h.comboQueued = false; }
    else {
      h.comboT -= dt;
      const st = COMBO[h.comboStep], el = comboDur(st) - h.comboT;
      if (el >= st.startup && el <= st.startup + st.active && b.meleeHit) b.meleeHit(h, st);
      if (h.comboT <= 0 && h.comboQueued) { h.comboQueued = false; h.comboStep = (h.comboStep % 3) + 1; h.comboT = comboDur(COMBO[h.comboStep]); h.comboWin = T.comboWindow + h.comboT; h.comboHit.clear(); h.comboStruck = false; bus.emit('cue', 'swish'); }
    }
  }

  const rollTime = T.rollTime * (b.boon_vayu ? 1.3 : 1);
  // a roll pressed in the air is the Vayu step: a short flat dash, one per jump
  if (canAct && !h.onGround && h.airDash > 0 && h.airDashT <= 0 && h.vaultT <= 0 && input.consume('roll')) {
    h.airDash = 0; h.airDashT = T.airDashTime; h.rollDir = ax || h.facing; h.facing = h.rollDir;
    h.vx = h.rollDir * T.airDashSpeed; h.vy = 0; h.rollInv = T.airDashTime; h.rollStart = b.time; h.drawT = 0; h.comboT = 0;
    for (let i = 0; i < 3; i++) h.after.push({ x: h.x - h.rollDir * i * 18, y: h.y, pose: 'jump', facing: h.facing, rot: 0, t: 0.18, gold: true });
    bus.emit('cue', 'dash');
  }
  if (canAct && input.consume('roll') && h.onGround && h.rollT <= 0) {
    // rollInv (not inv) protects the roll, so a shockwave, stomp or charge still has to be jumped
    h.rollT = rollTime * (rage ? 0.8 : 1); h.rollDir = ax || h.facing; h.drawT = 0; h.fullCue = false; h.rollStart = b.time;
    h.rollInv = T.rollInvulnerable * (b.boon_vayu ? 1.3 : 1); bus.emit('cue', 'roll');
  }
  if (h.rollInv > 0) h.rollInv -= dt;

  if (h.vaultT > 0) {
    // vaulting onto a ledge: a short eased lift, no control until feet are on top
    h.vaultT -= dt;
    const k = 1 - Math.max(0, h.vaultT) / 0.14, e = k * k * (3 - 2 * k);
    h.x = h.vaultFrom.x + (h.vaultTo.x - h.vaultFrom.x) * e; h.y = h.vaultFrom.y + (h.vaultTo.y - h.vaultFrom.y) * e;
    h.vx = 0; h.vy = 0;
    if (h.vaultT <= 0) { h.x = h.vaultTo.x; h.y = h.vaultTo.y; h.onGround = true; h.airDash = 1; }
  } else if (h.airDashT > 0) {
    h.airDashT -= dt; h.vx = h.rollDir * T.airDashSpeed; h.vy = 0;
  } else if (h.rollT > 0) {
    h.rollT -= dt; h.vx = h.rollDir * T.rollSpeed * rageK; h.facing = h.rollDir;
  } else if (canAct) {
    const wantsDraw = b.canShoot !== false && input.drawHeld() && h.shootCd <= 0;
    const speed = (wantsDraw ? T.drawWalk : T.walk) * rageK * (h.comboT > 0 ? 0.25 : 1);
    // ease in and out of a walk: quicker on the ground than in the air
    const accel = h.onGround ? 18 : 10;
    // just after a wall-kick the push away from the wall can't be undone at once
    if (h.wallJumpLock <= 0) h.vx += (ax * speed - h.vx) * Math.min(1, accel * dt);
    if (Math.abs(h.vx) < 2 && !ax) h.vx = 0;
    if (ax && !wantsDraw && h.comboT <= 0) h.facing = Math.sign(ax);
    // jump, with a little buffering and coyote time
    if (input.consume('jump')) h.jumpBuf = F.inputBuffer;
    h.jumpBuf -= dt; h.coyote = h.onGround ? F.coyoteTime : h.coyote - dt;
    // Hanuman's cupped hands: a jump from beside him throws Rama high
    const vaulter = (b.allies || []).find((a) => a.role === 'vault' && Math.abs(a.x - h.x) < 60);
    if (h.jumpBuf > 0 && h.coyote > 0 && vaulter) { h.vy = -T.vaultBoost; h.onGround = false; h.jumpBuf = 0; h.coyote = 0; h.airDash = 1; h.squash = -0.14; bus.emit('cue', 'vault'); }
    if (h.jumpBuf > 0 && h.coyote > 0) { h.vy = -T.jumpVelocity; h.onGround = false; h.jumpBuf = 0; h.coyote = 0; h.squash = -0.1; bus.emit('cue', 'jump'); }
    // the wall-kick: a jump while touching (or just leaving) a wall springs away from it
    if (h.jumpBuf > 0 && !h.onGround && h.wallCoyote > 0) {
      h.vx = -h.wallDir * T.wallJumpVx; h.vy = -T.wallJumpVy; h.facing = -h.wallDir;
      h.wallJumpLock = 0.12; h.airDash = 1; h.jumpBuf = 0; h.wallCoyote = 0; h.squash = -0.1;
      bus.emit('cue', 'jump');
    }
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

  if (h.vaultTo) { if (h.vaultT <= 0) h.vaultTo = null; finishMove(b, h, dt, rage, rollTime); return; }
  // integrate; a bow drawn while falling hangs Rama in the air for a breath (at most 0.45s)
  let g = T.gravity;
  if (!h.onGround && h.drawT > 0 && h.vy > 0 && h.airHang < 0.45) { g *= 0.25; h.airHang += dt; }
  if (h.airDashT > 0) g = 0;
  if (b.updraft && !h.onGround) h.vy -= b.updraft * dt; // a thermal lifting him
  h.vy += g * dt;
  // sliding down a wall he is pushing against: the fall is slowed and he can kick off
  const wd = wallContact(b, h);
  if (wd) { h.wallDir = wd; h.wallCoyote = 0.10; } else if (h.wallCoyote > 0) h.wallCoyote -= dt;
  h.sliding = !!(wd && !h.onGround && h.vy > 0 && Math.sign(ax) === wd);
  if (h.sliding) { h.vy = Math.min(h.vy, T.wallSlideMaxVy); if (Math.floor(b.time * 12) % 3 === 0) b.fx.push({ kind: 'dust', x: h.x + wd * 20, y: h.y - 70, vx: -wd * 20, t: 0, dur: 0.35, seed: b.time * 7 }); }
  const py = h.y, wasGround = h.onGround, fallV = h.vy;
  h.x += h.vx * dt; h.y += h.vy * dt;
  // solid walls stop him from the side
  for (const w of b.walls || []) {
    if (h.y - 120 > w.y2 || h.y < w.y1) continue;
    if (h.x + 22 > w.x1 && h.x < (w.x1 + w.x2) / 2) h.x = w.x1 - 22;
    else if (h.x - 22 < w.x2 && h.x >= (w.x1 + w.x2) / 2) h.x = w.x2 + 22;
  }
  let floor = GROUND, standing = null;
  // down on a shelf drops through it; the short timer keeps the shelf from catching Rama again
  // on the next frame (onGround is already false by then)
  h.dropT -= dt;
  if (canAct && input.held.down && h.onGround && h.y < GROUND - 1) h.dropT = 0.22;
  if (h.dropT <= 0) for (const s of surfaces(b)) if (h.x > s.x1 && h.x < s.x2 && py <= s.y + 1 && h.vy >= 0 && s.y < floor) { floor = s.y; standing = s.ref || null; }
  if (h.y >= floor) { h.y = floor; h.vy = 0; h.onGround = true; } else h.onGround = false;
  h.standing = h.onGround ? standing : null;
  if (h.onGround) h.airDash = 1;
  // a ledge just missed: falling past the lip of a surface while pushing toward it, he vaults up
  if (!h.onGround && h.vy >= 0 && ax && h.vaultT <= 0 && h.airDashT <= 0) {
    for (const s of surfaces(b)) {
      const lip = ax > 0 ? s.x1 : s.x2, dist = (lip - h.x) * ax;
      if (dist > 0 && dist < 40 && h.y > s.y && h.y - s.y < 70) {
        h.vaultT = 0.14; h.vaultFrom = { x: h.x, y: h.y }; h.vaultTo = { x: lip + ax * 24, y: s.y }; h.vy = 0; bus.emit('cue', 'jump'); break;
      }
    }
  }
  finishMove(b, h, dt, rage, rollTime, wasGround, fallV);
  if (b.diff.aimAssist) autoKick(b, h, canAct);
}

function finishMove(b, h, dt, rage, rollTime, wasGround = true, fallV = 0) {
  const T = b.tun.hero;
  if (!wasGround && h.onGround) {
    // landing: squash, and a few puffs of ink dust
    h.airHang = 0; h.squash = Math.min(0.2, 0.06 + fallV / 6000);
    if (fallV > 300) for (let i = 0; i < 5; i++) b.fx.push({ kind: 'dust', x: h.x + (i - 2) * 14, y: h.y - 2, vx: (i - 2) * 40, t: 0, dur: 0.45, seed: i });
  }
  h.x = Math.max(b.bounds.left + 30, Math.min(b.bounds.right - 30, h.x));
  if (Math.abs(h.vx) > 1 && h.onGround) h.walkT += dt; else if (h.onGround) h.walkT = 0;
  if ((rage || h.rollT > 0) && Math.floor(b.time * 30) % 2 === 0) h.after.push({ x: h.x, y: h.y, pose: heroPose(h), facing: h.facing, rot: h.rollT > 0 ? (1 - h.rollT / rollTime) * Math.PI * 2 * h.rollDir : 0, t: 0.18, gold: rage || h.perfectDodge > 0 });
  if (h.perfectDodge > 0) h.perfectDodge -= dt;
  void T;
}

// Story mode keeps the automatic kick: when an enemy or a low shot is within arm's reach Rama
// kicks by himself, and the kick's first moments are a parry window.
function autoKick(b, h, canAct) {
  const T = b.tun.hero;
  if (h.kickT <= 0 && h.rollT <= 0 && h.onGround && canAct && h.comboT <= 0) {
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
  if (h.comboT > 0) return COMBO[h.comboStep].pose;
  if (h.kickAnim > 0) return 'kick';
  if (h.vaultT > 0) return 'climb';
  if (h.sliding) return 'wallSlide';
  if (!h.onGround) return 'jump';
  if (h.drawT > 0) return h.drawT < 0.18 ? 'draw0' : h.drawT < 0.5 ? 'draw1' : 'draw2';
  if (h.shootAnim > 0) return 'shoot';
  if (Math.abs(h.vx) > 1) return WALK[Math.floor(h.walkT * 9) % 4];
  return 'stand';
}

/** A tapered ink smear following the swing: thin at the start, thick at the cut, fading out. */
export function drawSmear(ctx, x, y, facing, step, k) {
  if (k < 0.15 || k > 0.95) return;
  const [a0, a1, r, cy] = step === 1 ? [-0.6, 0.7, 70, -95] : step === 2 ? [1.1, -1.3, 64, -100] : [-0.1, 0.5, 96, -55];
  const n = 10, end = a0 + (a1 - a0) * Math.min(1, (k - 0.15) / 0.5);
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.globalAlpha = k > 0.7 ? (0.95 - k) / 0.25 : 1;
  ctx.fillStyle = step === 3 ? PAL.madder : PAL.black;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = a0 + (end - a0) * (i / n), w = (step === 3 ? 7 : 4) * Math.sin((i / n) * Math.PI); ctx.lineTo(Math.cos(a) * (r + w) + 10, cy + Math.sin(a) * (r + w)); }
  for (let i = n; i >= 0; i--) { const a = a0 + (end - a0) * (i / n), w = (step === 3 ? 7 : 4) * Math.sin((i / n) * Math.PI); ctx.lineTo(Math.cos(a) * (r - w) + 10, cy + Math.sin(a) * (r - w)); }
  ctx.closePath(); ctx.fill(); ctx.restore();
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
  // a swing leaves a tapered brush-stroke smear; a raised parry shows as a ring of ink
  if (h.comboT > 0) drawSmear(ctx, h.x, h.y, h.facing, h.comboStep, 1 - h.comboT / comboDur(COMBO[h.comboStep]));
  if (h.parryT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, h.parryT / 0.1) * 0.8; ctx.strokeStyle = PAL.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x + h.facing * 30, h.y - 80, 46, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
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
