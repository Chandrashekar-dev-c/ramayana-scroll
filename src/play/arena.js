// Arena geometry: what a battle can add to the flat ground. Everything here is optional level
// data, so a level without it plays exactly as before.
//
//   platforms  [{ x, y, w, crumble?, bobAmp?, moveX?, speed?, phase? }]   y is the top surface
//   walls      [{ x, y, w, h }]       solid from the side; Rama slides down and kicks off them
//   props      [{ type, x, y, r?, hp?, w?, targetY? }]   bell, brazier, pillar, ropeBridge, dashRing
//   wind       { ax, ay?, every?, gust?, updraft?, x0?, x1?, lift? }   gusts bend arrows; updrafts lift
//   hazardWall { x, speed, dmg }     an advancing wall of fire that pushes from the left
//   minCamY                          how far the camera may rise to follow Rama up (default -220)
//
// Each can sit on the level or on one arena; both are in world units (GROUND is the ground line).
// Also here: arrow footholds (Bana-setu: a full-draw arrow driven into a wall becomes a step for
// three seconds), the fire a shot brazier spills, Lakshmana's ward line, and the vertical camera.
import { bus } from '../core/events.js';
import { app } from '../core/app.js';
import { GROUND } from '../art/layout.js';
import { PAL } from '../art/palette.js';
import { shape, line, rectPts, ellipsePts, dots } from '../art/ink.js';
import * as M from '../art/motifs.js';

const all = (level, key) => [...(level[key] || []), ...(level.arenas || []).flatMap((a) => a[key] || [])];

export function initArena(b, level) {
  b.platforms = all(level, 'platforms').map((p, i) => ({ ...p, baseX: p.x, baseY: p.y, broken: false, crumbleT: 0, respawnT: 0, dx: 0, dy: 0, i }));
  b.walls = all(level, 'walls').map((w) => ({ x1: w.x, x2: w.x + w.w, y1: w.y, y2: w.y + w.h }));
  b.props = all(level, 'props').map((pr, i) => ({ ...pr, hp: pr.hp || (pr.type === 'pillar' ? 3 : 1), cooldown: 0, i, lit: false, down: false }));
  b.footholds = [];
  b.fireStrips = [];
  b.wind = level.wind ? { ...level.wind, timer: 0, on: false } : null;
  b.hazardWall = level.hazardWall ? { ...level.hazardWall } : null;
  b.rekhaWard = null;
  b.camY = 0;
  b.updraft = 0;
  b.vertical = !!level.vertical || b.platforms.some((p) => p.y < 380) || b.walls.some((w) => w.y1 < 300);
  b.minCamY = level.minCamY ?? -220;
}

/** A full-draw arrow that strikes a wall (or the arena's edge, up off the ground) sticks out of it as a foothold. */
export function arrowMeetsWall(b, a) {
  const T = b.tun.hero;
  let hitX = null;
  for (const w of b.walls) if (a.y > w.y1 && a.y < w.y2 && a.x > w.x1 && a.x < w.x2) hitX = a.vx > 0 ? w.x1 : w.x2;
  // the arena's edge takes a foothold only on a climbing level and only above any standing foe's head,
  // so archers waiting just past the edge can still be shot
  if (hitX === null && b.vertical && a.y < GROUND - 190 && (a.x < b.bounds.left || a.x > b.bounds.right) && a.own) hitX = a.x < b.bounds.left ? b.bounds.left : b.bounds.right;
  if (hitX === null) return false;
  a.x = hitX; a.life = 0; a.stuck = 0.6;
  if (a.full && a.own) {
    if (b.footholds.length >= 4) b.footholds.shift();
    b.footholds.push({ x: a.vx > 0 ? hitX - 58 : hitX - 10, y: a.y + 4, w: 68, life: T.footholdLife, dir: Math.sign(a.vx) });
    bus.emit('cue', 'clink');
  } else bus.emit('cue', 'tink');
  return true;
}

/** An arrow passing through a prop sets it off. Returns true when the arrow is spent. */
export function arrowMeetsProp(b, a) {
  for (const pr of b.props) {
    if (pr.down || pr.lowered) continue;
    if (Math.hypot(a.x - pr.x, a.y - pr.y) > (pr.r || 24)) continue;
    triggerProp(b, pr);
    return pr.type !== 'dashRing';
  }
  return false;
}

function triggerProp(b, pr) {
  const h = b.hero;
  switch (pr.type) {
    case 'bell':
      // the temple bell: its note stuns anything flying and shakes the boss's footing
      if (pr.cooldown > 0) return;
      pr.cooldown = 8; pr.ring = 1.2;
      for (const e of b.enemies) if (!e.dead && !e.dying && e.def.flies) { e.stun = 2.2; e.vx = 0; }
      for (const q of b.bosses) if (!q.dead && !q.dying && b.addStagger) b.addStagger(q, 20);
      b.shake(3); bus.emit('cue', 'bell');
      break;
    case 'brazier':
      if (pr.lit) return;
      pr.lit = true; pr.cooldown = 6;
      b.fireStrips.push({ x: pr.x - 110, w: 220, life: 4, dmgPerSec: 2 });
      bus.emit('cue', 'fireWhoosh');
      break;
    case 'pillar':
      pr.hp -= 1; b.burst(pr.x, pr.y, PAL.brown, 8); bus.emit('cue', 'tink');
      if (pr.hp <= 0) {
        // it topples toward the side the arrow came from... away from Rama, onto whoever stands there
        pr.down = true; pr.fallDir = pr.x >= h.x ? 1 : -1; pr.fallT = 0;
        for (const e of b.enemies) if (!e.dead && !e.dying && Math.sign(e.x - pr.x) === pr.fallDir && Math.abs(e.x - pr.x) < 260) { b.damageEnemy(e, 6, false); e.stun = 1.5; }
        b.shake(5); bus.emit('cue', 'crumble');
      }
      break;
    case 'ropeBridge':
      pr.lowered = true;
      b.platforms.push({ x: pr.x, y: pr.targetY ?? pr.y + 120, w: pr.w || 220, baseX: pr.x, baseY: pr.targetY ?? pr.y + 120, broken: false, crumbleT: 0, respawnT: 0, dx: 0, dy: 0, rope: true });
      bus.emit('cue', 'clink');
      break;
    case 'dashRing':
      h.airDash = 1; pr.flash = 0.4; bus.emit('cue', 'glint');
      break;
    default: break;
  }
}

export function updateArena(b, dt) {
  const h = b.hero;
  // moving and bobbing platforms carry whoever stands on them
  for (const p of b.platforms) {
    const ox = p.x, oy = p.y;
    if (p.broken) { p.respawnT -= dt; if (p.respawnT <= 0) { p.broken = false; p.crumbleT = 0; } continue; }
    if (p.bobAmp) p.y = p.baseY + Math.sin(b.time * (p.speed || 1) + (p.phase || 0)) * p.bobAmp;
    if (p.moveX) p.x = p.baseX + Math.sin(b.time * (p.speed || 1) + (p.phase || 0)) * p.moveX;
    p.dx = p.x - ox; p.dy = p.y - oy;
    if (h.standing === p) {
      h.x += p.dx; h.y = p.y;
      if (p.crumble && p.crumbleT === 0) { p.crumbleT = 0.8; bus.emit('cue', 'crumble'); }
    }
    if (p.crumbleT > 0) {
      p.crumbleT -= dt;
      if (p.crumbleT <= 0) { p.broken = true; p.respawnT = 4; p.crumbleT = 0; b.burst(p.x + p.w / 2, p.y + 10, PAL.brown, 12); if (h.standing === p) { h.onGround = false; h.standing = null; } }
    }
  }
  for (const f of b.footholds) f.life -= dt;
  b.footholds = b.footholds.filter((f) => f.life > 0);
  for (const pr of b.props) {
    if (pr.cooldown > 0) { pr.cooldown -= dt; if (pr.cooldown <= 0 && pr.type === 'brazier') pr.lit = false; }
    if (pr.ring > 0) pr.ring -= dt;
    if (pr.flash > 0) pr.flash -= dt;
    if (pr.fallT !== undefined && pr.fallT < 1) pr.fallT += dt * 2.2;
    // the dash ring also works when Rama flies through it
    if (pr.type === 'dashRing' && !h.onGround && h.airDash <= 0 && Math.hypot(h.x - pr.x, h.y - 80 - pr.y) < (pr.r || 22) + 26) triggerProp(b, pr);
  }
  // the brazier's spilled fire burns rakshasas (never Rama: it was his shot)
  for (const fs of b.fireStrips) {
    fs.life -= dt;
    for (const e of b.enemies) if (!e.dead && !e.dying && !e.def.flies && e.x > fs.x && e.x < fs.x + fs.w) { e.hp -= fs.dmgPerSec * dt; if (e.hp <= 0) b.killEnemy(e, 'fire'); }
  }
  b.fireStrips = b.fireStrips.filter((f) => f.life > 0);
  // wind: a gust for a few seconds in every cycle bends arrows in flight; an updraft column lifts Rama
  b.updraft = 0;
  if (b.wind) {
    const w = b.wind, every = w.every || 8, gust = w.gust || 3.5;
    w.timer += dt; w.on = (w.timer % every) < gust;
    if (w.on) {
      for (const a of b.arrows) if (!(a.stuck > 0)) { a.vx += (w.ax || 0) * dt; a.vy += (w.ay || 0) * dt; }
      if (w.updraft && h.x >= w.x0 && h.x <= w.x1) b.updraft = w.lift || 2600;
    }
  }
  // Lakshmana's ward: when Rama's rage rises, a Lakshmana who wards draws a line behind him
  // that no rakshasa may cross (a later tradition's rekha, not Valmiki's)
  const warder = b.allies.find((a) => a.role === 'ward');
  if (warder && !b.rekhaWard && h.rageT > 0 && !b.rekhaUsed) { b.rekhaUsed = true; b.rekhaWard = { x: h.x - h.facing * 60, side: -h.facing, life: 6 }; bus.emit('cue', 'chime'); }
  if (h.rageT <= 0) b.rekhaUsed = false;
  if (b.rekhaWard) {
    const r = b.rekhaWard; r.life -= dt;
    if (r.life <= 0) b.rekhaWard = null;
    else for (const e of b.enemies) {
      if (e.dead || e.dying) continue;
      if ((e.x - r.x) * r.side > 0) continue; // on Rama's side of the line
      if (Math.abs(e.x - r.x) < 30) { e.x = r.x + r.side * 30; e.stun = Math.max(e.stun, 1.2); e.hp -= 2 * dt; if (e.hp <= 0) b.killEnemy(e, 'fire'); }
    }
  }
  // the advancing wall of fire
  if (b.hazardWall) {
    const hw = b.hazardWall; hw.x += hw.speed * dt;
    if (h.x < hw.x + 20) { h.x = hw.x + 24; b.hurtHero(hw.dmg || 8, hw.x, 'move', 'fire'); }
  }
  // the camera rises to follow Rama up to high ledges, and settles back on the ground
  const target = b.vertical ? Math.max(b.minCamY, Math.min(0, h.y - 460)) : 0;
  b.camY += (target - b.camY) * Math.min(1, dt * 5);
}

/** Draw arena geometry, in world space, behind the figures. */
export function drawArena(ctx, b) {
  const t = b.time;
  for (const fs of b.fireStrips) for (let x = fs.x; x < fs.x + fs.w; x += 36) M.flame(ctx, x + 18, GROUND, 26 + Math.sin(t * 8 + x) * 6, { t, seed: Math.floor(x) % 7, tongues: 2 });
  // a wall is a broad painted temple pillar, wide enough to kick off
  for (const w of b.walls) M.pillar(ctx, (w.x1 + w.x2) / 2, w.y2, w.x2 - w.x1, w.y2 - w.y1 - 10, { colour: true, fill: PAL.ochre });
  for (const p of b.platforms) {
    if (p.broken) continue;
    const shake = p.crumbleT > 0 ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(shake, 0);
    if (p.rope) { line(ctx, [[p.x, p.y], [p.x + p.w / 2, p.y + 10], [p.x + p.w, p.y]], { w: 3, color: PAL.brown }); for (let x = p.x + 10; x < p.x + p.w; x += 22) line(ctx, [[x, p.y + 2], [x + 12, p.y + 6]], { w: 5, color: PAL.ochre }); }
    else {
      // a stone slab with a painted border of teeth along its face, like the frame of the wall
      shape(ctx, rectPts(p.x, p.y, p.w, 22), { fill: p.crumble ? PAL.terracotta : PAL.ochre, gap: PAL.brown, w: 2, seed: p.i || 1 });
      ctx.fillStyle = p.crumble ? PAL.black : PAL.madder;
      for (let x = p.x + 6; x < p.x + p.w - 10; x += 14) { ctx.beginPath(); ctx.moveTo(x, p.y + 20); ctx.lineTo(x + 7, p.y + 10); ctx.lineTo(x + 14, p.y + 20); ctx.fill(); }
      if (p.crumble) for (let x = p.x + 18; x < p.x + p.w - 10; x += 34) line(ctx, [[x, p.y + 2], [x + 8, p.y + 12]], { w: 1.4, color: PAL.black });
    }
    ctx.restore();
  }
  for (const f of b.footholds) {
    // an arrow driven into the wall: shaft, fletching, and a faint gold glow while it lasts
    ctx.save(); ctx.globalAlpha = Math.min(1, f.life / 0.6);
    line(ctx, [[f.x, f.y], [f.x + f.w, f.y]], { w: 4, color: PAL.brown });
    const fx = f.dir > 0 ? f.x : f.x + f.w;
    line(ctx, [[fx, f.y], [fx - f.dir * 12, f.y - 8]], { w: 2, color: PAL.madder }); line(ctx, [[fx, f.y], [fx - f.dir * 12, f.y + 8]], { w: 2, color: PAL.madder });
    ctx.restore();
  }
  for (const pr of b.props) drawPropItem(ctx, b, pr, t);
  if (b.rekhaWard) {
    const r = b.rekhaWard, k = Math.min(1, r.life);
    ctx.save(); ctx.globalAlpha = 0.85 * k;
    for (let y = GROUND; y > GROUND - 220; y -= 14) dots(ctx, r.x, y, 0, 1, PAL.turmeric, 1, 3);
    line(ctx, [[r.x - 40, GROUND - 1], [r.x + 40, GROUND - 1]], { w: 4, color: PAL.turmeric });
    ctx.restore();
  }
  if (b.hazardWall) {
    const x = b.hazardWall.x;
    ctx.save(); ctx.fillStyle = 'rgba(168,36,20,0.45)'; ctx.fillRect(x - 900, 0, 900, GROUND); ctx.restore();
    for (let y = GROUND; y > 120; y -= 60) M.flame(ctx, x, y, 70, { t, seed: Math.floor(y) % 7, tongues: 3 });
  }
  if (b.wind && b.wind.on) {
    ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = PAL.white; ctx.lineWidth = 1.6;
    const v = b.view();
    for (let i = 0; i < 14; i++) { const y = 120 + ((i * 97) % 380), x = v.left + ((i * 211 + t * 600 * Math.sign(b.wind.ax || 1)) % (v.right - v.left + 200) + (v.right - v.left + 200)) % (v.right - v.left + 200) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 40, y - 8, x + 80, y); ctx.stroke(); }
    if (b.wind.updraft) { for (let i = 0; i < 6; i++) { const x = b.wind.x0 + ((i + 0.5) / 6) * (b.wind.x1 - b.wind.x0), y = GROUND - ((t * 220 + i * 70) % 420); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 20, x, y - 40); ctx.stroke(); } }
    ctx.restore();
  }
}

function drawPropItem(ctx, b, pr, t) {
  switch (pr.type) {
    case 'bell': {
      const sw = pr.ring > 0 ? Math.sin(t * 20) * 0.35 * pr.ring : 0;
      line(ctx, [[pr.x, Math.min(pr.y - 90, 30)], [pr.x, pr.y - 22]], { w: 2, color: PAL.brown }); // hung from the top of the wall
      ctx.save(); ctx.translate(pr.x, pr.y - 22); ctx.rotate(sw);
      shape(ctx, [[-20, 34], [-14, 4], [0, -6], [14, 4], [20, 34]], { fill: pr.cooldown > 0 ? PAL.ochre : PAL.gold, gap: PAL.brown, w: 2, seed: 4 });
      ctx.restore();
      if (pr.ring > 0) { ctx.save(); ctx.globalAlpha = pr.ring / 1.2; ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(pr.x, pr.y, 30 + (1.2 - pr.ring) * 200 + k * 30, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
      break;
    }
    case 'brazier':
      shape(ctx, [[pr.x - 22, pr.y - 20], [pr.x + 22, pr.y - 20], [pr.x + 12, pr.y + 10], [pr.x - 12, pr.y + 10]], { fill: PAL.brown, gap: PAL.ochre, w: 2, seed: 2 });
      line(ctx, [[pr.x, pr.y + 10], [pr.x, GROUND]], { w: 4, color: PAL.brown });
      M.flame(ctx, pr.x, pr.y - 18, pr.lit ? 40 : 18, { t, seed: 3, tongues: 2 });
      break;
    case 'pillar': {
      const k = pr.down ? Math.min(1, pr.fallT || 0) : 0;
      ctx.save(); ctx.translate(pr.x, GROUND); ctx.rotate(k * pr.fallDir * (Math.PI / 2.1));
      M.pillar(ctx, 0, 0, 30, GROUND - pr.y + 40, { colour: true });
      ctx.restore();
      if (!pr.down) M.usableRing(ctx, pr.x, pr.y, 18, t);
      break;
    }
    case 'ropeBridge':
      if (!pr.lowered) { line(ctx, [[pr.x, pr.y], [pr.x + 6, pr.y - 60]], { w: 3, color: PAL.brown }); shape(ctx, ellipsePts(pr.x, pr.y, 14, 10, 8), { fill: PAL.ochre, w: 2, smooth: true }); M.usableRing(ctx, pr.x, pr.y, 18, t); }
      break;
    case 'dashRing': {
      const r = pr.r || 22, glow = pr.flash > 0 ? 1 : 0.6 + Math.sin(t * 4) * 0.2;
      ctx.save(); ctx.globalAlpha = glow; ctx.strokeStyle = PAL.black; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      break;
    }
    default: break;
  }
}

/** The sky the camera reveals when it rises above the painted wall's top edge. */
export function drawSkyAbove(ctx, b, W) {
  if (b.camY >= -0.5) return;
  const hgt = -b.camY + 2;
  ctx.fillStyle = b.night ? PAL.night : PAL.cream;
  ctx.fillRect(0, -hgt, W, hgt + 2);
  void app;
}
