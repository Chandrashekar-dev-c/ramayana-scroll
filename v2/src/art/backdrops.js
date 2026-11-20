// Placeholder backdrop layers, painted in code in a simple Mithila manner (bold outline, flat fill,
// line patterns). Each layer becomes a texture named `<backdrop>.<layer>` (and `.healed`). When real
// painted layers exist, list their files in content/assets.json and these are skipped.

import { W, H, GROUND_Y } from '../engine/layout.js';

export const TILE = 2048; // repeating layers are this wide and wrap seamlessly

const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const hex = n => `#${n.toString(16).padStart(6, '0')}`;
const INK = '#1d1613';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

/** Draw f at x and, if it crosses an edge, again one tile over, so the layer tiles. */
const wrap = (x, span, f) => { f(x); if (x - span < 0) f(x + TILE); if (x + span > TILE) f(x - TILE); };

function outline(g, w = 4) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

function sky(g) {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#5d4a6e'); grad.addColorStop(0.45, '#b4573a'); grad.addColorStop(0.75, '#e58a1f'); grad.addColorStop(1, '#f0b562');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const r = rng(7);
  for (let i = 0; i < 70; i++) { // rows of short brush strokes, like the painted sky
    const y = 30 + r() * 380, x = r() * W, len = 40 + r() * 140;
    g.strokeStyle = r() > 0.5 ? 'rgba(255,214,150,0.35)' : 'rgba(80,50,80,0.25)'; g.lineWidth = 3 + r() * 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (r() - 0.5) * 6); g.stroke();
  }
  g.beginPath(); g.arc(W * 0.56, 330, 58, 0, Math.PI * 2); g.fillStyle = '#d8411f'; g.fill(); outline(g, 5);
}

function hills(g, h) {
  const r = rng(11), base = h;
  const ridge = (y0, amp, color, seed) => {
    const rr = rng(seed); g.beginPath(); g.moveTo(0, base);
    const pts = 8, ph = rr() * 6;
    for (let i = 0; i <= 64; i++) { const x = (i / 64) * TILE; g.lineTo(x, y0 - amp * (0.6 + 0.4 * Math.sin((i / 64) * Math.PI * 2 * pts / 4 + ph)) * (0.7 + 0.3 * Math.sin((i / 64) * Math.PI * 2 * 3))); }
    g.lineTo(TILE, base); g.closePath(); g.fillStyle = color; g.fill(); outline(g, 3);
  };
  ridge(base - 120, 90, '#7d6b8a', 3);
  ridge(base - 50, 70, '#93788c', 5);
  g.strokeStyle = 'rgba(29,22,19,0.35)'; g.lineWidth = 2; // hatching on the slopes
  for (let i = 0; i < 160; i++) { const x = r() * TILE, y = base - 30 - r() * 110; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y - 6); g.stroke(); }
}

function hut(g, x, y, healed) {
  g.beginPath(); g.rect(x - 60, y - 70, 120, 70); g.fillStyle = healed ? '#c78c2e' : '#6e5a48'; g.fill(); outline(g);
  g.beginPath(); g.rect(x - 14, y - 44, 28, 44); g.fillStyle = INK; g.fill();
  g.beginPath();
  if (healed) { g.moveTo(x - 78, y - 66); g.lineTo(x, y - 128); g.lineTo(x + 78, y - 66); g.closePath(); g.fillStyle = '#e6ac17'; }
  else { g.moveTo(x - 70, y - 66); g.lineTo(x - 20, y - 108); g.lineTo(x - 4, y - 84); g.lineTo(x + 18, y - 100); g.lineTo(x + 40, y - 70); g.closePath(); g.fillStyle = '#4a3a30'; }
  g.fill(); outline(g);
  g.strokeStyle = 'rgba(29,22,19,0.6)'; g.lineWidth = 2; // thatch lines
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * 16, y - 70); g.lineTo(x + i * 8, healed ? y - 118 : y - 92); g.stroke(); }
}

function ruins(g, h, healed) {
  const r = rng(23), y = h;
  for (let i = 0; i < 5; i++) wrap(180 + i * 410 + r() * 120, 90, x => hut(g, x, y, healed));
  if (!healed) { // broken scaffolding
    for (let i = 0; i < 3; i++) wrap(400 + i * 680, 80, x => {
      g.strokeStyle = INK; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x - 40, y - 120); g.moveTo(x + 40, y); g.lineTo(x + 52, y - 110);
      g.moveTo(x - 60, y - 70); g.lineTo(x + 60, y - 84); g.moveTo(x - 46, y - 110); g.lineTo(x + 30, y - 40); g.stroke();
    });
  }
}

function ground(g, healed) {
  const top = 12;
  g.fillStyle = healed ? '#8a6a32' : '#a9773a'; g.fillRect(0, top, TILE, 400);
  g.beginPath(); g.moveTo(0, top); g.lineTo(TILE, top); outline(g, 5);
  const r = rng(31);
  g.strokeStyle = INK; g.lineWidth = 3; // woodcut cracks
  for (let i = 0; i < 90; i++) {
    let x = r() * TILE, yy = top + 10 + r() * 100; g.beginPath(); g.moveTo(x, yy);
    for (let k = 0; k < 4; k++) { x += 14 + r() * 30; yy += (r() - 0.5) * 18; g.lineTo(x, yy); } g.stroke();
  }
  if (healed) {
    for (let i = 0; i < 220; i++) { // grass tufts and small flowers
      const x = r() * TILE, yy = top + r() * 110;
      g.strokeStyle = '#3f8038'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x - 5, yy - 14); g.moveTo(x, yy); g.lineTo(x + 6, yy - 12); g.stroke();
      if (r() > 0.75) { g.beginPath(); g.arc(x, yy - 16, 5, 0, 7); g.fillStyle = r() > 0.5 ? '#cf2a1c' : '#e6ac17'; g.fill(); outline(g, 1.5); }
    }
  }
}

function front(g, h, healed) {
  const r = rng(41);
  for (let i = 0; i < 14; i++) wrap(r() * TILE, 60, x => {
    const y = h - 10 - r() * 30;
    if (healed) { // lotus buds
      g.beginPath(); g.ellipse(x, y, 16, 22, 0, 0, 7); g.fillStyle = '#d9788d'; g.fill(); outline(g, 3);
      g.beginPath(); g.moveTo(x, y + 22); g.lineTo(x, y + 50); g.strokeStyle = '#3f8038'; g.lineWidth = 4; g.stroke();
    } else if (i % 4 === 0) { // skull
      g.beginPath(); g.arc(x, y, 18, 0, 7); g.fillStyle = '#f2e4c3'; g.fill(); outline(g, 3);
      g.beginPath(); g.arc(x - 7, y - 2, 4, 0, 7); g.arc(x + 7, y - 2, 4, 0, 7); g.fillStyle = INK; g.fill();
    } else { // bone
      g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 1.2);
      g.beginPath(); g.rect(-30, -5, 60, 10); g.arc(-30, -6, 7, 0, 7); g.arc(-30, 6, 7, 0, 7); g.arc(30, -6, 7, 0, 7); g.arc(30, 6, 7, 0, 7);
      g.fillStyle = '#f2e4c3'; g.fill(); outline(g, 3); g.restore();
    }
  });
}

export function tree(healed, seed = 5) {
  const [c, g] = canvas(300, 360); const r = rng(seed);
  const branch = (x, y, ang, len, w, depth) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.strokeStyle = INK; g.lineWidth = w + 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = healed ? '#754527' : '#4a3a30'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (depth > 0) { branch(x2, y2, ang - 0.45 - r() * 0.3, len * 0.72, w * 0.68, depth - 1); branch(x2, y2, ang + 0.4 + r() * 0.3, len * 0.7, w * 0.68, depth - 1); }
    else if (healed) {
      g.beginPath(); g.arc(x2, y2, 26 + r() * 10, 0, 7); g.fillStyle = r() > 0.3 ? '#3f8038' : '#2f6b3d'; g.fill(); outline(g, 3);
      if (r() > 0.5) { g.beginPath(); g.arc(x2 + 8, y2 - 6, 6, 0, 7); g.fillStyle = '#cf2a1c'; g.fill(); outline(g, 1.5); }
    }
  };
  branch(150, 355, -Math.PI / 2, 110, 16, 4);
  return c;
}

/** Paints every layer of a backdrop into Phaser textures. */
export function paintBackdrop(scene, id) {
  const add = (key, c) => { if (!scene.textures.exists(key)) scene.textures.addCanvas(key, c); };
  { const [c, g] = canvas(W, H); sky(g); add(`${id}.sky`, c); }
  { const [c, g] = canvas(TILE, 300); hills(g, 300); add(`${id}.hills`, c); }
  for (const healed of [false, true]) {
    const s = healed ? '.healed' : '';
    { const [c, g] = canvas(TILE, 260); ruins(g, 250, healed); add(`${id}.ruins${s}`, c); }
    { const [c, g] = canvas(TILE, H - GROUND_Y + 20); ground(g, healed); add(`${id}.ground${s}`, c); }
    { const [c, g] = canvas(TILE, 90); front(g, 90, healed); add(`${id}.front${s}`, c); }
    add(`tree${s}`, tree(healed));
  }
  // a dust puff for clouds and impacts
  { const [c, g] = canvas(256, 256); const r = rng(51);
    for (let i = 0; i < 22; i++) { const x = 60 + r() * 136, y = 70 + r() * 120, rad = 30 + r() * 40;
      g.beginPath(); g.arc(x, y, rad, 0, 7); g.fillStyle = ['#a07a52', '#8a6a4a', '#b8926a'][i % 3]; g.fill(); outline(g, 3);
      g.beginPath(); g.arc(x, y, rad * 0.55, 0.3, 2.6); g.strokeStyle = 'rgba(29,22,19,0.5)'; g.lineWidth = 2; g.stroke(); }
    add('dust', c); }
  // glyphs: a lotus mark (hotspots, "jump here"), a shadow-star (danger lands here), stone, arrow
  { const [c, g] = canvas(128, 128);
    for (let i = 0; i < 8; i++) { g.save(); g.translate(64, 64); g.rotate((i * Math.PI) / 4); g.beginPath(); g.ellipse(0, -30, 11, 26, 0, 0, 7); g.fillStyle = i % 2 ? '#e6ac17' : '#d9788d'; g.fill(); outline(g, 3); g.restore(); }
    g.beginPath(); g.arc(64, 64, 14, 0, 7); g.fillStyle = '#c8921f'; g.fill(); outline(g, 3); add('glyph.lotus', c); }
  { const [c, g] = canvas(160, 60); g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 26 : 78; g.lineTo(80 + Math.cos(a) * rr, 30 + Math.sin(a) * rr * 0.36); }
    g.closePath(); g.fillStyle = 'rgba(29,22,19,0.55)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#cf2a1c'; g.stroke(); add('glyph.star', c); }
  { const [c, g] = canvas(80, 80); g.beginPath(); g.moveTo(40, 6); g.lineTo(72, 30); g.lineTo(64, 70); g.lineTo(18, 72); g.lineTo(8, 32); g.closePath();
    g.fillStyle = '#8d877a'; g.fill(); outline(g, 4); g.strokeStyle = 'rgba(29,22,19,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(24, 40); g.lineTo(50, 34); g.moveTo(30, 56); g.lineTo(56, 52); g.stroke(); add('stone', c); }
  { const [c, g] = canvas(120, 16); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(2, 8); g.lineTo(100, 8); g.stroke();
    g.strokeStyle = '#c8921f'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(4, 8); g.lineTo(100, 8); g.stroke();
    g.beginPath(); g.moveTo(118, 8); g.lineTo(98, 1); g.lineTo(98, 15); g.closePath(); g.fillStyle = '#c8921f'; g.fill(); outline(g, 2);
    g.beginPath(); g.moveTo(2, 8); g.lineTo(14, 1); g.moveTo(2, 8); g.lineTo(14, 15); g.strokeStyle = '#cf2a1c'; g.lineWidth = 3; g.stroke(); add('arrow', c); }
}
