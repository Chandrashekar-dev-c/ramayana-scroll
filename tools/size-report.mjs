// Reports the shipped size and fails above the 400 KB budget (English, fonts included;
// other language packs load on demand and are not counted, nor are the .woff fallbacks, which a
// WOFF2 browser never fetches and the service worker does not precache).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const DIST = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist');
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } };
walk(DIST);
let raw = 0, gz = 0; const rows = [];
for (const f of files) {
  const rel = path.relative(DIST, f);
  if (/(^|\/)(hi|kn|te|ta|sa)-[\w-]+\.js$/.test(rel) || /\.woff$/.test(rel)) continue;
  const b = fs.readFileSync(f); const g = /\.(woff2|png)$/.test(f) ? b.length : zlib.gzipSync(b).length;
  raw += b.length; gz += g; rows.push([rel, b.length, g]);
}
rows.sort((a, b) => b[2] - a[2]);
for (const [r, b, g] of rows.slice(0, 12)) console.log(`${(g / 1024).toFixed(1).padStart(7)} KB  (${(b / 1024).toFixed(1)} raw)  ${r}`);
console.log(`total transferred: ${(gz / 1024).toFixed(1)} KB (budget 400 KB); on disk ${(raw / 1024).toFixed(1)} KB`);
if (gz > 400 * 1024) { console.error('Over the 400 KB budget'); process.exit(1); }
