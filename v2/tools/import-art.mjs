#!/usr/bin/env node
// Turns generated images into game sprites, following content/art/<level>.import.json.
//
//   node tools/import-art.mjs [content/art/tataka.import.json]     (npm run art)
//
// For each image: crop the decorative border if asked, remove the background, strip a drawn ground
// line, split strips into named pieces, trim each to its content, and record it in the level's
// asset manifest with the size of each pose relative to the strip's upright figure.
//
// Background removal works for any flat background colour (bright or dark magenta, whatever the
// model produced): it samples the colour at the image's edges, flood-fills inward from the edges
// through pixels close to it, and stops at the figures' black outlines. Small enclosed pockets of
// the same colour (between an arm and the body) are cleared too; costume colours elsewhere stay.
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const cfgPath = process.argv[2] || 'content/art/tataka.import.json';
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const srcDir = join('content/art/source', cfgPath.match(/([^/]+)\.import\.json$/)[1]);
const outDir = cfg.out;
mkdirSync(outDir, { recursive: true });

const findSrc = name => ['.png', '.webp', '.jpg', '.jpeg'].map(e => join(srcDir, name + e)).find(existsSync);

async function load(file, border) {
  let img = sharp(file).ensureAlpha();
  const meta = await img.metadata();
  if (border) { // the reference frame's border is ~4.5% of the shorter side
    const b = Math.round(Math.min(meta.width, meta.height) * 0.085);
    img = img.extract({ left: b, top: b, width: meta.width - 2 * b, height: meta.height - 2 * b });
  }
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** The most common colour around the image's edges (the background), averaged within its bucket. */
function edgeColour({ data, w, h }, inset = 0) {
  const buckets = new Map(), add = i => {
    const k = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4);
    const b = buckets.get(k) || [0, 0, 0, 0]; b[0]++; b[1] += data[i]; b[2] += data[i + 1]; b[3] += data[i + 2]; buckets.set(k, b);
  };
  const i0 = inset, x1 = w - 1 - inset, y1 = h - 1 - inset;
  for (let x = i0; x <= x1; x += 2) { add((i0 * w + x) * 4); add((y1 * w + x) * 4); }
  for (let y = i0; y <= y1; y += 2) { add((y * w + i0) * 4); add((y * w + x1) * 4); }
  const [n, r, g, bl] = [...buckets.values()].sort((p, q) => q[0] - p[0])[0];
  return [r / n, g / n, bl / n];
}

function key(img, { inset = 0, near = 70, pocket = 34 } = {}) {
  const { data, w, h } = img, bg = edgeColour(img, inset);
  const dist = i => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
  const seen = new Uint8Array(w * h), stack = [];
  const push = (x, y) => { const p = y * w + x; if (!seen[p] && dist(p * 4) < near) { seen[p] = 1; stack.push(p); } };
  // a framed image: what's left of the frame outside the inset ring is cleared, the fill starts on the ring
  if (inset) for (let p = 0; p < w * h; p++) { const x = p % w, y = (p / w) | 0; if (x < inset || y < inset || x >= w - inset || y >= h - inset) seen[p] = 1; }
  for (let x = inset; x < w - inset; x++) { push(x, inset); push(x, h - 1 - inset); }
  for (let y = inset; y < h - inset; y++) { push(inset, y); push(w - 1 - inset, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (seen[p] || dist(i) < pocket) { data[i + 3] = 0; continue; }
    // soft, de-tinted edge where a figure meets the background
    const x = p % w, y = (p / w) | 0;
    const nb = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
    if (nb) { const k = Math.max(0, 1 - (dist(i) - near) / 60); data[i + 3] = Math.round(255 * (1 - k * 0.7)); }
  }
  // take the background's tint out of the edge band (2px), where antialiasing mixed it in
  for (let pass = 0; pass < 2; pass++) {
    const edge = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 0) {
      const x = p % w, y = (p / w) | 0, t = q => data[q * 4 + 3] === 0;
      if ((x > 0 && t(p - 1)) || (x < w - 1 && t(p + 1)) || (y > 0 && t(p - w)) || (y < h - 1 && t(p + w))) edge[p] = 1;
    }
    for (let p = 0; p < w * h; p++) if (edge[p]) {
      const i = p * 4, m = Math.min(data[i], data[i + 2]) - data[i + 1];
      if (m > 18) { data[i] -= m * 0.85; data[i + 2] -= m * 0.85; data[i + 3] = Math.min(data[i + 3], 200); }
      if (pass === 1 && dist(i) < near * 1.6) data[i + 3] = Math.round(data[i + 3] * 0.4);
    }
  }
  return bg;
}

/** Clear a thin drawn line along the bottom (models add one even when told not to), keeping feet. */
function stripGroundLine({ data, w, h }) {
  const op = (x, y) => data[(y * w + x) * 4 + 3] > 128;
  const rowFull = y => { let n = 0; for (let x = 0; x < w; x++) if (op(x, y)) n++; return n > w * 0.35; };
  for (let y = h - 1; y > h * 0.75; y--) {
    if (!rowFull(y)) continue;
    let top = y; while (top > h * 0.75 && rowFull(top - 1) && y - top < 8) top--;
    if (y - top >= 8) return;
    const probe = Math.max(0, top - 5);
    for (let x = 0; x < w; x++) if (!op(x, probe)) for (let yy = Math.max(0, top - 2); yy <= Math.min(h - 1, y + 2); yy++) data[(yy * w + x) * 4 + 3] = 0;
    y = top;
  }
}

/** Within a box, clear small detached shapes (slivers of a neighbouring pose); keep the main figure. */
function keepMain(img, b) {
  const { data, w } = img, lab = new Int32Array(b.w * b.h).fill(-1), sizes = [], boxes = [];
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const q = y * b.w + x; if (lab[q] >= 0 || data[((b.y + y) * w + b.x + x) * 4 + 3] <= 40) continue;
    const id = sizes.length, st = [q]; lab[q] = id; let n = 0, x0 = x, x1 = x, y0 = y, y1 = y;
    while (st.length) {
      const c = st.pop(), cx = c % b.w, cy = (c / b.w) | 0; n++;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
        const nq = ny * b.w + nx; if (lab[nq] >= 0 || data[((b.y + ny) * w + b.x + nx) * 4 + 3] <= 40) continue;
        lab[nq] = id; st.push(nq);
      }
    }
    sizes.push(n); boxes.push({ x0, x1, y0, y1 });
  }
  if (!sizes.length) return;
  const big = sizes.indexOf(Math.max(...sizes)), M = boxes[big];
  const keep = sizes.map((n, k) => k === big || n > sizes[big] * 0.08 ||
    (boxes[k].x0 >= M.x0 - 4 && boxes[k].x1 <= M.x1 + 4 && boxes[k].y0 >= M.y0 - 4 && boxes[k].y1 <= M.y1 + 4)); // inside the figure: keep (jewels, a separate hand)
  for (let q = 0; q < lab.length; q++) if (lab[q] >= 0 && !keep[lab[q]]) data[((b.y + ((q / b.w) | 0)) * w + b.x + (q % b.w)) * 4 + 3] = 0;
}

/** Opaque bounding box of a region. */
function bbox({ data, w }, x0, y0, x1, y1) {
  let minX = x1, minY = y1, maxX = x0, maxY = y0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (data[(y * w + x) * 4 + 3] > 40) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return maxX < minX ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Cut n pieces along an axis at the emptiest lines near the even divisions. */
function cuts(img, n, axis) {
  const { data, w, h } = img, len = axis === 'x' ? w : h, other = axis === 'x' ? h : w;
  const proj = new Float64Array(len);
  for (let a = 0; a < len; a++) for (let b = 0; b < other; b++) {
    const [x, y] = axis === 'x' ? [a, b] : [b, a];
    proj[a] += data[(y * w + x) * 4 + 3];
  }
  const span = bbox(img, 0, 0, w, h), lo = axis === 'x' ? span.x : span.y, hi = lo + (axis === 'x' ? span.w : span.h);
  const step = (hi - lo) / n, out = [lo];
  for (let k = 1; k < n; k++) {
    const c = lo + step * k, r = step * 0.35;
    let best = Math.round(c);
    for (let a = Math.max(0, Math.round(c - r)); a < Math.min(len, Math.round(c + r)); a++) if (proj[a] < proj[best]) best = a;
    out.push(best);
  }
  out.push(hi);
  return out;
}

async function save(img, box, file) {
  await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png({ compressionLevel: 9 }).toFile(file);
}

const manifest = { $comment: `Generated by tools/import-art.mjs from ${cfgPath}. Do not edit; edit the import file and re-run.`, images: {} };
let missing = 0;
for (const item of cfg.items) {
  const file = findSrc(item.src);
  if (!file) { console.warn(`missing  ${item.src}`); missing++; continue; }
  const img = await load(file, item.border);
  if (item.key) { key(img, { inset: item.border ? Math.round(Math.min(img.w, img.h) * 0.03) : 0, ...(item.tolerance && { near: item.tolerance, pocket: Math.round(item.tolerance / 2) }) }); if (item.split || item.id?.startsWith('char.')) stripGroundLine(img); }
  const rel = id => `${outDir.replace(/^public\//, '')}/${id}.png`;
  if (item.split) {
    const axis = item.axis || 'x', c = cuts(img, item.split.length, axis);
    const boxes = item.split.map((_, k) => {
      const b0 = axis === 'x' ? bbox(img, c[k], 0, c[k + 1], img.h) : bbox(img, 0, c[k], img.w, c[k + 1]);
      if (!b0) return null;
      if (!item.keepAll) keepMain(img, b0);
      return bbox(img, b0.x, b0.y, b0.x + b0.w, b0.y + b0.h);
    });
    const refH = boxes[item.ref ?? 0]?.h;
    for (const [k, id] of item.split.entries()) {
      const b = boxes[k];
      if (!b) { console.warn(`empty    ${id}`); continue; }
      await save(img, b, join(outDir, `${id}.png`));
      manifest.images[id] = { file: rel(id), facing: item.facing || 'right', ratio: +(b.h / refH).toFixed(3), from: item.src, px: [b.w, b.h] };
    }
    console.log(`split    ${item.src} -> ${item.split.length}`);
  } else {
    const b = item.key ? bbox(img, 0, 0, img.w, img.h) : { x: 0, y: 0, w: img.w, h: img.h };
    await save(img, b, join(outDir, `${item.id}.png`));
    manifest.images[item.id] = { file: rel(item.id), facing: item.facing || 'right', from: item.src, px: [b.w, b.h] };
    console.log(`image    ${item.src} -> ${item.id}`);
  }
}
writeFileSync(cfg.manifest, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${Object.keys(manifest.images).length} sprites -> ${cfg.manifest}${missing ? `, ${missing} sources missing` : ''}`);
