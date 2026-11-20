// Signature objects and marks. Every named character carries or wears one thing only they have.
import { shape, line, ellipsePts, dots } from './ink.js';
import { PAL, col } from './palette.js';

/** signature name -> how it is carried. obj is a drawer below; hold says where it sits. */
export const SIGNATURES = {
  none: { obj: null, hold: 'none' },
  kodanda: { obj: 'bow', hold: 'hand', quiver: 'back' },
  bowLeft: { obj: 'bow', hold: 'hand', quiver: 'front', size: 0.92 },
  bowJata: { obj: 'bow', hold: 'hand', size: 0.85 },
  agastyaBow: { obj: 'bow', hold: 'hand', size: 1.1 },
  akshaBow: { obj: 'bow', hold: 'hand', size: 0.8 },
  bowCloud: { obj: 'bow', hold: 'hand', size: 0.95 },
  flower: { obj: null, hold: 'none', mark: 'hairFlower' },
  lotusHand: { obj: 'lotus', hold: 'hand' },
  sandals: { obj: 'sandals', hold: 'head' },
  spear: { obj: 'spear', hold: 'hand' },
  giantSpear: { obj: 'spear', hold: 'hand', size: 1.15 },
  bellSpear: { obj: 'spear', hold: 'hand', bells: true },
  trident: { obj: 'trident', hold: 'hand' },
  parasol: { obj: 'parasol', hold: 'hand' },
  lamp: { obj: 'lamp', hold: 'hand' },
  dreamLamp: { obj: 'lamp', hold: 'hand', tall: true },
  lantern: { obj: 'lantern', hold: 'hand' },
  brooch: { obj: null, hold: 'none', mark: 'brooch' },
  waterPot: { obj: 'pot', hold: 'hand' },
  pitcher: { obj: 'pot', hold: 'hand', size: 1.3 },
  kamandalu: { obj: 'kamandalu', hold: 'hand' },
  jewelBox: { obj: 'box', hold: 'hand' },
  fruitBowl: { obj: 'bowl', hold: 'hand' },
  fireBowl: { obj: 'firePot', hold: 'hand', size: 0.7 },
  firePot: { obj: 'firePot', hold: 'hand' },
  staff: { obj: 'staff', hold: 'hand' },
  staffPlain: { obj: 'staff', hold: 'hand', size: 0.85 },
  staffPlain2: { obj: 'staff', hold: 'hand', size: 0.95 },
  beardStaff: { obj: 'staff', hold: 'hand', size: 1.1 },
  staffScroll: { obj: 'staff', hold: 'hand', scroll: true },
  plough: { obj: 'plough', hold: 'hand' },
  oar: { obj: 'oar', hold: 'hand' },
  basket: { obj: 'basket', hold: 'hand' },
  mace: { obj: 'mace', hold: 'hand' },
  ironClub: { obj: 'club', hold: 'hand' },
  rakClub: { obj: 'club', hold: 'hand', size: 0.8 },
  chandrahasa: { obj: 'sword', hold: 'hand', back: 'veena' },
  kharaSword: { obj: 'sword', hold: 'hand', size: 0.8 },
  axe: { obj: 'axe', hold: 'hand' },
  whisk: { obj: 'whisk', hold: 'hand' },
  stone: { obj: 'stone', hold: 'over' },
  conch: { obj: 'conch', hold: 'hand' },
  rosary: { obj: 'rosary', hold: 'hand' },
  whipReins: { obj: 'whip', hold: 'hand' },
  reinsGold: { obj: 'whip', hold: 'hand', gold: true },
  herbBundle: { obj: 'herbs', hold: 'hand' },
  gateKey: { obj: 'club', hold: 'hand', size: 1.1 },
  garland: { obj: null, hold: 'none', mark: 'garland' },
  necklace: { obj: null, hold: 'none', mark: 'necklace' },
  boneNecklace: { obj: null, hold: 'none', mark: 'bones' },
  armlets: { obj: null, hold: 'none', mark: 'armlets' },
  foldedHands: { obj: null, hold: 'none', fold: true },
  foldedQueen: { obj: null, hold: 'none', fold: true },
  fanNails: { obj: null, hold: 'none', mark: 'nails' },
  deerEars: { obj: null, hold: 'none' },
  beak: { obj: null, hold: 'none' },
  garudaBeak: { obj: null, hold: 'none' },
  wingless: { obj: null, hold: 'none' },
  longArms: { obj: null, hold: 'none' },
};

/**
 * Draw an object with its grip at the origin. The caller has already translated and
 * rotated the context; +x is "forward", -y is "up" along the object's length.
 */
export function drawObject(ctx, name, U, o) {
  const { mode, seed, main, accent, sig = {} } = o;
  const k = sig.size || 1;
  const S = (pts, opt = {}) => shape(ctx, pts, { w: o.lw, seed: seed + pts.length, mode: mode === 'kachni' ? (opt.gold ? 'colour' : 'line') : mode, lineFill: PAL.cream, ...opt });
  const L = (pts, opt = {}) => { if (mode !== 'sil') line(ctx, pts, { w: o.lw, seed, ...opt }); else line(ctx, pts, { w: o.lw * 2, seed }); };
  const wood = PAL.brown, gold = PAL.gold;
  switch (name) {
    case 'bow': {
      const h = 0.4 * U * k, pull = o.pull || 0;
      const arc = [[0, -h], [h * 0.16, -h * 0.8], [h * 0.3, -h * 0.35], [h * 0.26, 0], [h * 0.3, h * 0.35], [h * 0.16, h * 0.8], [0, h]];
      const px = -pull * h * 0.95;
      L([[0, -h], [px, 0], [0, h]], { w: o.lw * 0.5, color: mode === 'sil' ? PAL.black : PAL.black, flat: true });
      line(ctx, arc, { w: o.lw * 2.4, seed, smooth: true, color: PAL.black });
      if (mode !== 'sil' && mode !== 'line') line(ctx, arc, { w: o.lw * 0.9, seed, smooth: true, color: col(accent) === PAL.black ? gold : gold, flat: true });
      if (pull > 0.05) {
        L([[px, 0], [h * 0.75, 0]], { w: o.lw * 0.8, color: mode === 'colour' ? PAL.indigo : PAL.black });
        S([[h * 0.75, -4], [h * 0.75 + 11, 0], [h * 0.75, 4]], { fill: PAL.indigo });
      }
      break;
    }
    case 'spear': case 'trident': {
      const h = 1.05 * U * k * (name === 'trident' ? 0.9 : 1);
      L([[0, h * 0.35], [0, -h * 0.65]], { w: o.lw * 1.3 });
      if (name === 'trident') {
        L([[-h * 0.09, -h * 0.82], [-h * 0.09, -h * 0.66], [h * 0.09, -h * 0.66], [h * 0.09, -h * 0.82]], { w: o.lw });
        L([[0, -h * 0.65], [0, -h * 0.86]], { w: o.lw });
      } else S([[0, -h * 0.82], [h * 0.05, -h * 0.68], [0, -h * 0.63], [-h * 0.05, -h * 0.68]], { fill: PAL.stone });
      if (sig.bells && mode !== 'sil') dots(ctx, 0, -h * 0.55, 7, 5, gold, seed, 2.4);
      break;
    }
    case 'staff': {
      const h = 0.92 * U * k;
      L([[2, h * 0.3], [0, -h * 0.2], [3, -h * 0.7]], { w: o.lw * 1.4, color: mode === 'colour' ? wood : PAL.black, smooth: true });
      if (sig.scroll) S([[-9, -h * 0.5], [9, -h * 0.5], [9, -h * 0.36], [-9, -h * 0.36]], { fill: PAL.paper });
      break;
    }
    case 'sword': {
      const h = 0.74 * U * k;
      // grip and a round pommel at the base
      L([[0, h * 0.17], [0, 0]], { w: o.lw * 2.6, color: mode === 'colour' ? PAL.madder : PAL.black });
      S(ellipsePts(0, h * 0.21, 4.5, 4.5, 8), { fill: mode === 'colour' ? gold : PAL.black, smooth: true });
      // crossguard
      L([[-9, -2], [9, -2]], { w: o.lw * 1.6 });
      // a long tapering blade with a centre fuller
      S([[-3.6, -2], [3.6, -2], [2.4, -h * 0.82], [0, -h], [-2.4, -h * 0.82]], { fill: PAL.stone, gap: mode === 'colour' ? gold : null, smooth: true });
      L([[0, -h * 0.08], [0, -h * 0.82]], { w: o.lw * 0.7 });
      break;
    }
    case 'mace': case 'club': {
      const h = 0.62 * U * k, isMace = name === 'mace';
      // a thick shaft up to the head (short grip below the hand)
      L([[0, h * 0.12], [0, -h * 0.4]], { w: o.lw * (isMace ? 2.4 : 2), color: mode === 'colour' ? (isMace ? gold : wood) : PAL.black });
      if (isMace) {
        // the gada: a tall, heavy fluted head with a collar at its base and a finial on top
        const hy = -h * 0.74, R = h * 0.26;
        S(ellipsePts(0, hy, R, R * 1.45, 16), { fill: gold, gap: PAL.madder, smooth: true, gold: true });
        for (const dx of [-R * 0.52, 0, R * 0.52]) L([[dx, hy - R * 1.15], [dx, hy + R * 1.15]], { w: o.lw * 0.6 });
        L([[-R * 1.02, hy + R * 1.4], [R * 1.02, hy + R * 1.4]], { w: o.lw });
        S(ellipsePts(0, hy - R * 1.6, R * 0.32, R * 0.42, 8), { fill: gold, gap: PAL.madder, smooth: true, gold: true });
      } else {
        S(ellipsePts(0, -h * 0.58, h * 0.17, h * 0.27, 10), { fill: wood, smooth: true });
        dots(ctx, 0, -h * 0.58, h * 0.1, 5, PAL.black, seed, 1.6);
      }
      break;
    }
    case 'axe': {
      const h = 0.7 * U;
      L([[0, h * 0.3], [0, -h * 0.6]], { w: o.lw * 1.4 });
      S([[0, -h * 0.6], [h * 0.3, -h * 0.72], [h * 0.34, -h * 0.4], [0, -h * 0.42]], { fill: PAL.stone, smooth: true });
      break;
    }
    case 'oar': {
      const h = 0.95 * U;
      L([[0, -h * 0.35], [0, h * 0.45]], { w: o.lw * 1.4, color: mode === 'colour' ? wood : PAL.black });
      S([[-8, h * 0.4], [8, h * 0.4], [11, h * 0.68], [0, h * 0.74], [-11, h * 0.68]], { fill: wood, smooth: true });
      break;
    }
    case 'pot': case 'kamandalu': case 'basket': case 'box': case 'bowl': case 'firePot': case 'herbs': {
      const r = 0.075 * U * k;
      if (name === 'kamandalu') L([[-r, -r * 1.5], [0, -r * 2.2], [r, -r * 1.5]], { w: o.lw * 0.8 });
      if (name === 'box') S([[-r, 0], [r, 0], [r, r * 1.3], [-r, r * 1.3]], { fill: gold, gap: PAL.madder, gold: true });
      else if (name === 'basket' || name === 'bowl') S([[-r * 1.3, 0], [r * 1.3, 0], [r * 0.8, r * 1.2], [-r * 0.8, r * 1.2]], { fill: name === 'basket' ? PAL.ochre : PAL.terracotta });
      else if (name === 'herbs') { L([[0, r], [0, -r * 2]], { w: o.lw }); if (mode !== 'sil') dots(ctx, 0, -r * 2, r, 6, PAL.leaf, seed, 3); }
      else S(ellipsePts(0, r * 0.4, r * 1.05, r * 1.15, 10), { fill: name === 'firePot' ? PAL.black : PAL.terracotta, smooth: true, gap: name === 'pot' ? PAL.turmeric : null });
      if (name === 'basket' && mode === 'colour') dots(ctx, 0, -r * 0.3, r * 0.7, 5, PAL.madder, seed, 3);
      if (name === 'firePot') S([[-r * 0.6, -r * 0.6], [-r * 0.2, -r * 2.2], [r * 0.1, -r * 1.2], [r * 0.5, -r * 2.6], [r * 0.7, -r * 0.6]], { fill: PAL.saffron, smooth: true });
      break;
    }
    case 'lamp': case 'lantern': {
      const r = 0.06 * U;
      if (sig.tall || name === 'lantern') L([[0, r], [0, r * 5]], { w: o.lw });
      S([[-r * 1.4, 0], [r * 1.6, 0], [r * 0.6, r * 1.1], [-r * 0.7, r * 1.1]], { fill: gold, smooth: true, gold: true });
      S([[r * 0.9, -r * 0.1], [r * 1.2, -r * 1.9], [r * 1.7, -r * 0.1]], { fill: PAL.saffron, smooth: true, gold: true });
      break;
    }
    case 'parasol': {
      const h = 1.5 * U;
      L([[0, h * 0.2], [0, -h * 0.72]], { w: o.lw * 1.2 });
      S([[-h * 0.3, -h * 0.72], [-h * 0.2, -h * 0.86], [0, -h * 0.92], [h * 0.2, -h * 0.86], [h * 0.3, -h * 0.72]], { fill: PAL.white, gap: gold, smooth: false, gold: true });
      if (mode !== 'sil') for (let i = -2; i <= 2; i++) L([[i * h * 0.12, -h * 0.72], [i * h * 0.12, -h * 0.67]], { w: o.lw * 0.7, color: PAL.madder, flat: true });
      break;
    }
    case 'plough': {
      const h = 0.8 * U;
      L([[0, -h * 0.5], [0, h * 0.4], [h * 0.2, h * 0.55]], { w: o.lw * 1.5, color: mode === 'colour' ? wood : PAL.black });
      S([[h * 0.2, h * 0.5], [h * 0.36, h * 0.62], [h * 0.18, h * 0.62]], { fill: PAL.stone });
      break;
    }
    case 'lotus': {
      const r = 0.07 * U;
      L([[0, r * 3], [0, 0]], { w: o.lw, color: mode === 'colour' ? PAL.leaf : PAL.black });
      for (let i = -2; i <= 2; i++) S([[i * r * 0.5, 0], [i * r * 0.9, -r * 1.8], [i * r * 0.5 + r * 0.5, 0]], { fill: PAL.pink, smooth: true, gold: true });
      break;
    }
    case 'sandals': {
      const r = 0.1 * U;
      S(ellipsePts(-r * 0.6, 0, r * 0.5, r * 0.22, 8), { fill: gold, smooth: true, gold: true });
      S(ellipsePts(r * 0.6, 0, r * 0.5, r * 0.22, 8), { fill: gold, smooth: true, gold: true });
      if (mode !== 'sil') { L([[-r * 0.6, -r * 0.2], [-r * 0.6, -r * 0.6]], { w: o.lw * 0.8 }); L([[r * 0.6, -r * 0.2], [r * 0.6, -r * 0.6]], { w: o.lw * 0.8 }); }
      break;
    }
    case 'stone': {
      const r = 0.2 * U;
      S([[-r, 0], [-r * 0.8, -r * 0.9], [r * 0.2, -r * 1.2], [r, -r * 0.6], [r * 0.9, 0]], { fill: PAL.stone, smooth: false });
      break;
    }
    case 'whisk': {
      const h = 0.4 * U;
      L([[0, h * 0.2], [0, -h * 0.4]], { w: o.lw * 1.2 });
      for (let i = -2; i <= 2; i++) L([[0, -h * 0.4], [i * 5, -h * 0.8], [i * 9, -h * 0.55]], { w: o.lw * 0.6, smooth: true, color: mode === 'colour' ? PAL.white : PAL.black });
      break;
    }
    case 'conch': S([[-10, 0], [0, -12], [14, -4], [8, 8], [-4, 9]], { fill: PAL.white, smooth: true }); break;
    case 'rosary': if (mode !== 'sil') dots(ctx, 0, 14, 10, 9, PAL.brown, seed, 2.2); break;
    case 'whip': {
      const h = 0.5 * U;
      L([[0, h * 0.1], [0, -h * 0.6], [h * 0.3, -h * 0.75], [h * 0.4, -h * 0.4]], { w: o.lw, smooth: true, color: sig.gold && mode === 'colour' ? gold : PAL.black });
      break;
    }
    default: break;
  }
}
