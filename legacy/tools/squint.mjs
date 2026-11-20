// The squint test: plays each battle for a few seconds, blurs the frame the way a squinting
// eye does, and checks every enemy still stands out from what is behind it. Writes the
// blurred frames to squint/ for a human look. Usage: node tools/squint.mjs [baseUrl]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const MIN = 0.12; // minimum luminance difference between an enemy and its surroundings
fs.mkdirSync('squint', { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(base + '?seed=3');
await p.waitForFunction('window.__ready === true && window.__rs');
const levels = ['tataka', 'yajna', 'viradha', 'janasthana', 'kumbhakarna', 'indrajit', 'ravana'];
let failed = 0;
for (const ch of levels) {
  const r = await p.evaluate(async (ch) => {
    const R = window.__rs, app = R.app; app.loop.stop(); R.save.data.difficulty = 'normal';
    document.getElementById('panel').classList.add('hidden');
    await R.start(ch);
    for (let f = 0; f < 4000; f++) {
      const m = app.mode, B = m.sub && m.sub.b;
      if (!document.getElementById('panel').classList.contains('hidden')) { const bt = document.querySelector('#panel button.btn'); if (bt) bt.click(); await new Promise((z) => setTimeout(z, 0)); }
      if (B) { B.hero.hp = B.hero.maxHp; if (B.enemies.filter((e) => !e.dead && !e.dying).length >= 2 && B.stepT > 3) break; }
      else if (m.sub && m.sub.skip) m.sub.skip();
      else R.input.pointer.justDown = true;
      R.step(1);
      if (f % 50 === 0) await new Promise((z) => setTimeout(z, 0));
    }
    const B = app.mode.sub && app.mode.sub.b;
    if (!B) return { ch, err: 'no battle reached' };
    R.step(1);
    const src = app.canvas, w = src.width, h = src.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.filter = `blur(${Math.round(h / 90)}px) grayscale(1)`; x.drawImage(src, 0, 0);
    const img = x.getImageData(0, 0, w, h).data, k = h / 720;
    const vals = (x0, y0, x1, y1) => { const v = []; for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y += 3) for (let xx = Math.max(0, x0 | 0); xx < Math.min(w, x1); xx += 3) v.push(img[(y * w + xx) * 4] / 255); return v.sort((p, q) => p - q); };
    const pct = (v, q) => (v.length ? v[Math.min(v.length - 1, Math.floor(v.length * q))] : 0);
    const out = [];
    for (const e of B.enemies) {
      if (e.dead || e.dying) continue;
      const bx = B.boxesOf(e), body = bx.body, head = bx.head;
      const l = Math.min(body.x, head.x), r = Math.max(body.x + body.w, head.x + head.w), tp = Math.min(body.y, head.y), bt = Math.max(body.y + body.h, head.y + head.h);
      const a = B.toScreen(l, tp), c2 = B.toScreen(r, bt), ww = c2.x - a.x;
      if (a.x < 40 || c2.x > app.W - 40) continue;
      const x0 = a.x * k, x1 = c2.x * k, y0 = a.y * k, y1 = c2.y * k;
      // the darkest part of the figure against the typical tone around it
      const inside = pct(vals(x0, y0, x1, y1), 0.15), ring = pct([...vals(x0 - ww * k, y0, x0, y1), ...vals(x1, y0, x1 + ww * k, y1)].sort((p, q) => p - q), 0.5);
      out.push({ type: e.type, delta: Math.abs(inside - ring) });
    }
    return { ch, enemies: out, png: c.toDataURL('image/png') };
  }, ch);
  if (r.err) { console.log(`?    ${ch}: ${r.err}`); continue; }
  fs.writeFileSync(`squint/${ch}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
  const worst = r.enemies.reduce((m, e) => Math.min(m, e.delta), 1);
  const ok = !r.enemies.length || worst >= MIN;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${ch.padEnd(12)} ${r.enemies.length} enemies, weakest contrast ${(worst * 100).toFixed(0)}% ${r.enemies.map((e) => e.type + ' ' + (e.delta * 100).toFixed(0) + '%').join(', ')}`);
}
await b.close();
console.log(failed ? `${failed} battle(s) fail the squint test` : 'squint ok: every enemy stands out from the painting');
process.exitCode = failed ? 1 : 0;
