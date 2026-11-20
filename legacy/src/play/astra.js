// Astras are fired by tracing an aripan-style symbol. The cleaner the stroke, the stronger
// the effect; a missed stroke still fires a weak version. In Story difficulty one tap fires
// it at full strength, and the keyboard and gamepad can fire it without tracing.
const TAU = Math.PI * 2;

function gen(fn, n = 48) { const p = []; for (let i = 0; i <= n; i++) p.push(fn(i / n)); return p; }

export const SYMBOLS = {
  sun: { closed: true, pts: gen((t) => [Math.cos(t * TAU - Math.PI / 2), Math.sin(t * TAU - Math.PI / 2)]) },
  wind: { closed: false, pts: gen((t) => { const a = t * TAU * 1.6, r = 0.15 + t * 0.85; return [Math.cos(a) * r, Math.sin(a) * r]; }) },
  serpent: { closed: false, pts: gen((t) => [t * 2 - 1, Math.sin(t * TAU * 1.5) * 0.5]) },
  lotus: { closed: false, pts: [[-1, 0.6], [-0.66, -0.6], [-0.33, 0.6], [0, -0.9], [0.33, 0.6], [0.66, -0.6], [1, 0.6]] },
  brahma: { closed: true, pts: [[-1, 0.8], [0, -0.9], [1, 0.8], [-1, 0.8]] },
};

function pathLen(p) { let d = 0; for (let i = 1; i < p.length; i++) d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return d; }

export function resample(p, n = 32) {
  const L = pathLen(p), step = L / (n - 1), out = [p[0]];
  let acc = 0;
  const q = p.map((a) => [a[0], a[1]]);
  for (let i = 1; i < q.length; i++) {
    const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc + d >= step && d > 0) {
      const k = (step - acc) / d;
      const np = [q[i - 1][0] + k * (q[i][0] - q[i - 1][0]), q[i - 1][1] + k * (q[i][1] - q[i - 1][1])];
      out.push(np); q.splice(i, 0, np); acc = 0;
    } else acc += d;
  }
  while (out.length < n) out.push(q[q.length - 1]);
  return out.slice(0, n);
}

function normalise(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); cx += x; cy += y; }
  cx /= p.length; cy /= p.length;
  const s = Math.max(x1 - x0, y1 - y0, 1e-6);
  return p.map(([x, y]) => [(x - cx) / s, (y - cy) / s]);
}

function dist(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]); return d / a.length; }

/** Grade a traced stroke against a symbol: 0 (missed) to 1 (clean). */
export function grade(stroke, symbolId) {
  const sym = SYMBOLS[symbolId] || SYMBOLS.sun;
  if (!stroke || stroke.length < 6 || pathLen(stroke) < 60) return 0;
  const n = 32;
  const s = normalise(resample(stroke, n));
  const t = normalise(resample(sym.pts, n));
  let best = Infinity;
  const shifts = sym.closed ? 8 : 1;
  for (let k = 0; k < shifts; k++) {
    const sh = Math.round((k / shifts) * n);
    const rot = t.map((_, i) => t[(i + sh) % n]);
    best = Math.min(best, dist(s, rot), dist(s, [...rot].reverse()));
  }
  return Math.max(0, Math.min(1, 1.3 - best / 0.2));
}

/** Symbol points scaled for drawing, centred on (cx, cy). */
export function symbolPoints(symbolId, cx, cy, size) {
  const sym = SYMBOLS[symbolId] || SYMBOLS.sun;
  return sym.pts.map(([x, y]) => [cx + x * size, cy + y * size]);
}
