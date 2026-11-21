// Smoke test: plays through every chapter in a real browser and fails on any error,
// failed request or a chapter that does not finish. Usage:
//   node tools/smoke-test.mjs [baseUrl] [--shots dir] [--only id,id] [--strict]
// Scenes are tapped through; interactions and trials are played for up to 30 seconds and only
// then skipped (each skip is reported, and --strict fails on them, so a softlock shows up);
// battles are fought by a simple autoplayer on Story difficulty.
// Playwright comes from this project or PLAYWRIGHT_DIR; Chrome from CHROME_PATH or Playwright's own.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR || '/opt/npm-tools/node_modules', '/')); ({ chromium } = require('playwright')); }
const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith('http')) || 'http://localhost:4173/';
const shotDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const size = args.includes('--size') ? args[args.indexOf('--size') + 1].split('x').map(Number) : [1280, 720];
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-sandbox'] });
const strict = args.includes('--strict');
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
const errors = [];
let current = 'boot';
page.on('pageerror', (e) => errors.push(`[${current}] pageerror: ${e.message} ${(e.stack || '').split('\n')[1] || ''}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${current}] console: ${m.text()}`); if (m.type() === 'warning' && m.text().includes('[i18n]')) errors.push(`[${current}] ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`[${current}] request failed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[${current}] HTTP ${r.status()}: ${r.url()}`); });
await page.goto(base + '?seed=7');
await page.waitForFunction('window.__ready === true && window.__rs', null, { timeout: 20000 });
const ids = await page.evaluate(async () => (await window.__rs.chapters()).filter((c) => c.playable !== false).map((c) => c.id));
const list = only || ids;
const results = [];

for (const id of list) {
  current = id;
  const t0 = Date.now();
  const r = await page.evaluate(async (id) => {
    const R = window.__rs, app = R.app, input = R.input;
    app.loop.stop();
    R.save.data.difficulty = 'story';
    R.save.data.done = {}; // each chapter on its own
    const panel = () => document.getElementById('panel');
    const panelOpen = () => !panel().classList.contains('hidden');
    document.getElementById('panel').classList.add('hidden'); document.getElementById('panel').innerHTML = '';
    await R.start(id);
    const log = [];
    let frames = 0, battleFrames = 0, subFrames = 0, lastSub = null, shots = 0;
    const step = (n = 1) => { R.step(n); frames += n; };
    while (frames < 60 * 60 * 14) {
      if (R.save.data.done[id] && panelOpen()) return { ok: true, frames, log };
      if (panelOpen()) {
        const b = panel().querySelector('button.btn');
        if (b) b.click();
        await new Promise((z) => setTimeout(z, 0));
        step(2); continue;
      }
      const m = app.mode;
      if (!m || app.modeName !== 'chapter') { step(2); await new Promise((z) => setTimeout(z, 0)); continue; }
      const sub = m.sub;
      if (sub !== lastSub) { subFrames = 0; lastSub = sub; if (sub) log.push(sub.kind + (sub.level ? ':' + sub.level.id : '')); }
      subFrames++;
      if (sub && sub.kind === 'battle') {
        const B = sub.b; battleFrames++;
        input.device = 'touch'; input.aim.source = 'touch'; input.aim.dx = 0; input.aim.dy = 0;
        B.hero.hp = B.hero.maxHp;
        if (B.astra) { input.pointer.justDown = true; step(1); continue; }
        const enemy = [...B.foes()][0];
        input.axis = B.goRight || (B.walking) ? 1 : enemy ? 0 : 1;
        input.held.right = input.axis > 0;
        const ph = battleFrames % 60;
        input.held.draw = ph < 52;
        if (battleFrames % 240 === 100) input.press('jump');
        if (battleFrames % 300 === 200) input.press('roll');
        // keep the run short: after two minutes of fighting, help the hero along
        if (battleFrames > 7200) { for (const e of B.enemies) e.hp = 0.1; for (const q of B.bosses) if (!q.dying) { q.hp = Math.min(q.hp, 1); } }
        if (battleFrames > 9000) for (const q of B.bosses) if (!q.dying && !q.dead) { q.hp = 0; q.dying = true; q.state = 'dying'; q.t = 0; q.hidden = false; }
        if (battleFrames > 12000) return { ok: false, frames, log, why: 'battle did not end', step: B.step, arena: B.arena, bosses: B.bosses.map((q) => [q.id, q.hp, q.state]) };
        if (B.outcome === 'shown') return { ok: false, frames, log, why: 'lost a battle on Story' };
        step(1); shots++;
        continue;
      }
      input.held.draw = false; input.axis = 0; input.held.right = false;
      if (sub) {
        // exercise the interaction or trial for a while, holding and tapping, then skip it
        input.pointer.down = subFrames % 90 < 70; input.held.action = input.pointer.down;
        input.pointer.x = app.W / 2; input.pointer.y = 400;
        if (subFrames % 25 === 0) { input.pointer.justDown = true; input.press('action'); }
        // a working interaction finishes on its own within this time; only a stuck one gets skipped
        if (subFrames > 60 * 30) { log.push('SKIPPED ' + sub.kind + (sub.kind === 'interaction' && m.cur ? ':' + (m.cur.do || m.cur.heads) : '')); input.pointer.down = false; input.held.action = false; if (sub.skip && sub.kind !== 'trial') sub.skip(); else m.skip(); }
        step(1); continue;
      }
      input.pointer.down = false; input.held.action = false;
      if (frames % 8 === 0) input.pointer.justDown = true;
      step(1);
      await (frames % 600 === 0 ? new Promise((z) => setTimeout(z, 0)) : null);
    }
    return { ok: false, frames, log, why: 'timeout', pc: app.mode && app.mode.pc, beat: app.mode && JSON.stringify(app.mode.cur) };
  }, id).catch((e) => ({ ok: false, why: 'evaluate: ' + e.message }));
  if (shotDir) await page.screenshot({ path: `${shotDir}/${String(list.indexOf(id) + 1).padStart(2, '0')}-${id}.png` });
  if (r.ok && strict && (r.log || []).some((l) => l.startsWith('SKIPPED'))) { r.ok = false; r.why = 'had to skip: ' + r.log.filter((l) => l.startsWith('SKIPPED')).join(', '); }
  results.push({ id, ...r, secs: ((Date.now() - t0) / 1000).toFixed(1) });
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${id.padEnd(12)} ${(r.frames / 60 | 0)}s game ${((Date.now() - t0) / 1000).toFixed(1)}s real ${r.ok ? '' : r.why + ' ' + JSON.stringify(r).slice(0, 300)}`);
}
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} chapters finished; ${errors.length} errors`);
for (const e of [...new Set(errors)].slice(0, 40)) console.log('  ' + e);
process.exitCode = failed.length || errors.length ? 1 : 0;
