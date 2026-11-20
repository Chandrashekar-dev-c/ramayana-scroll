// Reports what a first visit downloads (gzipped). No hard cap now; it warns above 2 MB.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const DIST = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist');
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } };
walk(DIST);
let gz = 0; const rows = [];
for (const f of files) { const b = fs.readFileSync(f); const g = /\.(woff2?|png)$/.test(f) ? b.length : zlib.gzipSync(b).length; gz += g; rows.push([path.relative(DIST, f), b.length, g]); }
rows.sort((a, b) => b[2] - a[2]);
for (const [r, b, g] of rows.slice(0, 8)) console.log(`${(g / 1024).toFixed(1).padStart(7)} KB  (${(b / 1024).toFixed(1)} raw)  ${r}`);
console.log(`total: ${(gz / 1024).toFixed(0)} KB gzipped across ${files.length} files`);
if (gz > 2048 * 1024) console.warn('note: over 2 MB; consider loading Tone.js or PixiJS extras on demand');
