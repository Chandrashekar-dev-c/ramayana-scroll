// Seeded randomness. Gameplay and art never call Math.random.

/** @param {number} a */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string (FNV-1a). */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export class Rng {
  /** @param {number|string} seed */
  constructor(seed) {
    this.seed = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
    this._f = mulberry32(this.seed);
  }
  next() { return this._f(); }
  range(a, b) { return a + (b - a) * this._f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this._f() * arr.length)]; }
  chance(p) { return this._f() < p; }
  /** A new independent generator derived from this seed and a label. */
  fork(label) { return new Rng(hashStr(this.seed + ':' + label)); }
}

/** Cheap stateless noise in [-1, 1] for a seed and an index: used for stable line wobble. */
export function noise(seed, i) {
  let h = Math.imul(seed ^ Math.imul(i + 1, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return ((h >>> 0) / 2147483648) - 1;
}
