// The live layer over a painted backdrop: what the cached chunks cannot do because it moves.
// Lamp flames flicker and glow, water scallops scroll, clouds drift, a few petals, motes, embers
// or fireflies hang in the air, pennants flutter, and flames "boil" (their ink line re-drawn a few
// times a second, as a hand-painted animation would). Everything is driven by time and the camera
// alone: no per-frame allocation of particles, no randomness, so it never drifts out of step.
import { GROUND } from './layout.js';
import { PAL } from './palette.js';
import * as M from './motifs.js';
import { layerItems, backdropInfo, FAR_SPEED } from './backdrops.js';

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

// what drifts in the air of each kind of place
const BIOME = {
  petals: new Set(['forest', 'deepForest', 'ashram', 'hermitage', 'mithila', 'grove', 'panchavati', 'chitrakuta', 'pampa', 'nandigram', 'city', 'road', 'riverbank']),
  motes: new Set(['court', 'chamber', 'kingRoom', 'lankaCourt', 'cave']),
  embers: new Set(['waste', 'lankaRoofs', 'battlefield', 'camp']),
};

function biomeOf(id, info) {
  if (info.night) return 'fireflies';
  if (BIOME.embers.has(id)) return 'embers';
  if (BIOME.motes.has(id)) return 'motes';
  if (BIOME.petals.has(id)) return 'petals';
  return null;
}

/**
 * Draw the live layer in screen space, right after the backdrop and before the figures.
 * o: { colour, quiet, startle: { x, t }, reducedMotion, mood }
 */
export function drawAtmosphere(ctx, id, camX, W, t, o = {}) {
  const info = backdropInfo(id); if (!info) return;
  const colour = o.colour !== false;
  const calm = o.reducedMotion ? 0.35 : 1;
  const boil = Math.floor(t * 3.5) % 3; // the ink-boil frame: 3 hand-drawn variants cycling ~3.5 times a second

  // drifting clouds in the far sky (day only, not indoors)
  if (!info.night && info.ground !== 'floor' && info.ground !== 'none') {
    const farX = camX * FAR_SPEED;
    for (let i = 0; i < 3; i++) {
      const span = W + 600, x = ((i * 523 + t * (9 + i * 4) * calm - farX * 0.6) % span + span) % span - 300;
      ctx.save(); ctx.globalAlpha = colour ? 0.55 : 0.4;
      M.cloud(ctx, x, 150 + i * 46 + Math.sin(t * 0.2 + i) * 6, 120 + i * 30, { hatch: colour ? 0 : 7, seed: i + 11 });
      ctx.restore();
    }
  }

  // water: scalloped Madhubani wave arcs travelling along the band
  if (info.band || info.ground === 'sea') {
    const y0 = info.ground === 'sea' ? GROUND - 30 : GROUND - (info.band === 'sea' ? 60 : 36);
    ctx.save(); ctx.strokeStyle = colour ? PAL.white : PAL.black; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const span = W + 160, x = ((i * 173 + t * 34 * calm - camX) % span + span) % span - 80, y = y0 + (i % 3) * 9;
      ctx.beginPath(); ctx.arc(x, y, 9, Math.PI, TAU); ctx.arc(x + 18, y, 9, Math.PI, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // lamp stands: a flickering teardrop flame and a warm pulsing halo
  for (const it of layerItems(id, 'lampStand', camX - 60, camX + W + 60)) {
    const x = it.x - camX, y = it.y - it.size - 12, k = 0.75 + 0.25 * Math.sin(t * 9 + it.k * 2.3) * calm;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 46 * k);
    g.addColorStop(0, 'rgba(230,172,23,0.45)'); g.addColorStop(1, 'rgba(230,172,23,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46 * k, 0, TAU); ctx.fill();
    M.flame(ctx, x - 4, y + 8, 16 * k, { t, seed: it.k * 3 + boil, tongues: 1 });
  }

  // pennants: a ribbon tail that flutters from each banner's tip
  for (const it of layerItems(id, 'bannerPole', camX - 80, camX + W + 80)) {
    const x = it.x - camX + 40, y = it.y - it.size * it.vary + 12;
    const pts = []; for (let i = 0; i <= 6; i++) pts.push([x + i * 7, y + Math.sin(t * 6 * calm - i * 0.9 + it.k) * (2 + i * 1.2)]);
    ctx.save(); ctx.strokeStyle = PAL.black; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = colour ? (it.k % 2 ? PAL.madder : PAL.saffron) : PAL.cream; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
  }

  // the biome's particles: 15–25 per screen, placed by hash and moved by time
  const kind = biomeOf(id, info);
  if (kind) {
    const n = o.quiet ? 15 : 22;
    for (let i = 0; i < n; i++) {
      const hx = hash(i + 1), hy = hash(i + 101), sp = 0.4 + hash(i + 201) * 0.8;
      let x, y;
      if (kind === 'petals') { x = ((hx * (W + 200) + t * 30 * sp * calm - camX * 0.9) % (W + 200) + W + 200) % (W + 200) - 100; y = ((hy * 560 + t * 22 * sp * calm) % 560) + 60; }
      else if (kind === 'embers') { x = ((hx * (W + 200) + Math.sin(t * sp + i) * 30 - camX) % (W + 200) + W + 200) % (W + 200) - 100; y = GROUND - ((hy * 520 + t * 40 * sp * calm) % 520); }
      else if (kind === 'motes') { x = ((hx * W + Math.sin(t * 0.3 * sp + i) * 40 - camX * 0.5) % W + W) % W; y = 120 + hy * 420 + Math.cos(t * 0.4 * sp + i) * 20; }
      else { x = ((hx * (W + 100) - camX * 0.6) % (W + 100) + W + 100) % (W + 100) - 50 + Math.sin(t * 0.7 * sp + i) * 30; y = 120 + hy * (GROUND - 160) + Math.cos(t * 0.9 * sp + i) * 20; }
      ctx.save();
      if (kind === 'petals') { ctx.translate(x, y); ctx.rotate(t * 2 * sp + i); ctx.fillStyle = colour ? (i % 3 ? PAL.pink : PAL.kusum) : PAL.cream; ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      else if (kind === 'embers') { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + i); ctx.fillStyle = i % 2 ? PAL.orange : PAL.kusum; ctx.beginPath(); ctx.arc(x, y, 1.8 + sp, 0, TAU); ctx.fill(); }
      else if (kind === 'motes') { ctx.globalAlpha = 0.35; ctx.fillStyle = PAL.turmeric; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
      else { const k = Math.max(0, Math.sin(t * 2 * sp + i * 1.7)); ctx.globalAlpha = 0.2 + k * 0.8; ctx.fillStyle = 'rgba(230,172,23,0.3)'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.fillStyle = PAL.turmeric; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  // a big impact shakes loose a flurry of leaves around where it struck
  const st = o.startle;
  if (st && t - st.t >= 0 && t - st.t < 1.8 && !info.night && info.ground !== 'floor') {
    const k = (t - st.t) / 1.8, sx = st.x - camX;
    for (let i = 0; i < 14; i++) {
      const a = hash(i + 7) * TAU, d = 40 + hash(i + 17) * 260;
      const x = sx + Math.cos(a) * d * k, y = GROUND - 260 + Math.sin(a) * 60 + k * k * 240;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(x, y); ctx.rotate(k * 8 + i);
      ctx.fillStyle = colour ? (i % 2 ? PAL.leaf : PAL.green) : PAL.cream; ctx.strokeStyle = PAL.black; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  // a soft mood wash: indigo night, vermilion over Lanka by day
  if (info.night) { ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = PAL.indigo; ctx.fillRect(0, 0, W, 720); ctx.restore(); }
  else if (info.lanka && colour) { ctx.save(); ctx.globalAlpha = 0.045; ctx.fillStyle = PAL.madder; ctx.fillRect(0, 0, W, 720); ctx.restore(); }
}
