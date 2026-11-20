#!/usr/bin/env node
// Turns picked art into game-ready transparent PNGs.
//
//   node tools/art/clean.mjs                 # every picked image in art/raw/
//   node tools/art/clean.mjs path/to/a.png   # just these files (written beside them as *.clean.png)
//
// art/raw/characters/<id>/<stage>/x.png  ->  art/clean/characters/<id>/<stage>/x.png
//
// 1. Keys the flat magenta background to transparency, with soft edges and the pink fringe removed.
// 2. Removes a drawn ground line under the feet (image models add one even when told not to):
//    a long thin opaque band near the bottom is cleared, except directly under a foot.
// The painted finish is NOT added here; the game applies it at runtime so it can be tuned.

import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

export async function clean(input, output) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 4;

  // 1. magenta key: how far a pixel is from magenta decides its alpha
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const k = Math.min(1, Math.max(0, (Math.min(r, b) - g - 70) / 110)); // 1 = pure background
    if (k > 0) {
      data[i + 3] = Math.round(data[i + 3] * (1 - k));
      // despill: pull the magenta cast out of edge pixels
      data[i] = Math.round(g + (r - g) * (1 - k));
      data[i + 2] = Math.round(g + (b - g) * (1 - k));
    }
  }

  // 2. ground line: rows in the bottom fifth where a long run is opaque
  const opaque = (x, y) => data[px(x, y) + 3] > 128;
  const isLineRow = y => { let n = 0; for (let x = 0; x < W; x++) if (opaque(x, y)) n++; return n > W * 0.35; };
  let removed = 0;
  for (let y = H - 1; y > H * 0.8; y--) {
    if (!isLineRow(y)) continue;
    let top = y; while (top > H * 0.8 && isLineRow(top - 1) && y - top < 10) top--;
    if (y - top >= 10) { y = top; continue; } // too thick to be a drawn line: leave it
    // clear the band plus its soft anti-aliased edges, except where a foot stands above it
    const probe = Math.max(0, top - 6), from = Math.max(0, top - 3), to = Math.min(H - 1, y + 3);
    for (let x = 0; x < W; x++) {
      if (opaque(x, probe)) continue;
      for (let yy = from; yy <= to; yy++) data[px(x, yy) + 3] = 0;
    }
    removed++;
    y = top;
  }

  mkdirSync(dirname(output), { recursive: true });
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(output);
  return { removedLines: removed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jobs = args.length
    ? args.map(f => [f, f.replace(/\.(png|jpe?g)$/i, '.clean.png')])
    : walk('art/raw').filter(f => f.endsWith('.png')).map(f => [f, join('art/clean', relative('art/raw', f))]);
  for (const [i, o] of jobs) {
    const r = await clean(i, o);
    console.log(`${o}${r.removedLines ? `  (removed ${r.removedLines} ground line)` : ''}`);
  }
}
