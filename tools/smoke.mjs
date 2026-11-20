// Plays every staged chapter in headless Chrome against the preview server: skips lines,
// answers choices, traces the astra, wins each fight, and fails on any page error.
// Usage: npm run preview (in another shell), then: node tools/smoke.mjs [url] [shotDir]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright')); }

const url = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || null;
const CHAPTERS = ['sage', 'sarayu', 'tataka', 'yajna'];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
let n = 0;
const shot = async (name) => { if (shots) await page.screenshot({ path: `${shots}/${String(++n).padStart(2, '0')}-${name}.png` }); };
const click = (txt) => page.evaluate((t) => { const b = [...document.querySelectorAll('#panel button, #topbar button')].find((x) => x.textContent.includes(t)); if (b) { b.click(); return true; } return false; }, txt);

await page.goto(url + '?seed=3');
await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
await page.evaluate(() => { const s = window.__rs.save; s.data.difficulty = 'normal'; s.data.settings.devMode = true; s.commit(); });
await shot('title');
let failed = false;
for (const id of CHAPTERS) {
  const t0 = Date.now();
  await page.evaluate((c) => window.__rs.start(c), id);
  let sawBattle = false, sawAstra = false, ended = false, shotStage = false;
  while (Date.now() - t0 < 240000) {
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => window.__rs.state());
    const panel = await page.evaluate(() => { const p = document.getElementById('panel'); return p.classList.contains('hidden') ? '' : p.textContent; });
    if (st.done[id] && /Next chapter|Title screen/.test(panel)) { ended = true; await shot(id + '-end'); break; }
    if (panel && !/Next chapter|Title screen/.test(panel)) { await page.evaluate(() => { const b = document.querySelector('#panel button'); if (b) b.click(); }); continue; }
    if (st.astra) { if (!sawAstra) { sawAstra = true; await page.waitForTimeout(600); await shot(id + '-astra'); } await page.keyboard.press('Enter'); continue; }
    if (st.battle) {
      if (!sawBattle) { sawBattle = true; await page.waitForTimeout(2500); await shot(id + '-battle'); }
      await page.evaluate(() => window.__rs.win());
      continue;
    }
    if (!shotStage && Date.now() - t0 > 5000) { shotStage = true; await shot(id + '-stage'); }
    if (id !== 'yajna' || sawAstra) await click('Skip');
    await page.mouse.click(420, 200);
  }
  const ms = Date.now() - t0;
  console.log(`${ended ? 'ok  ' : 'FAIL'} ${id.padEnd(8)} ${(ms / 1000).toFixed(1)}s${sawBattle ? ' battle' : ''}${sawAstra ? ' astra' : ''}`);
  if (!ended) failed = true;
}
await browser.close();
if (errors.length) { console.log('page errors:\n  ' + [...new Set(errors)].slice(0, 20).join('\n  ')); failed = true; }
process.exit(failed ? 1 : 0);
