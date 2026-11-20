// Plays the Tataka chapter end to end in headless Chrome at phone size and saves screenshots.
//   npm run build && npx vite preview --port 4174 &   then:  node tools/playtest.mjs [outDir]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] || 'playtest';
const URL = process.env.URL || 'http://localhost:4174/?test';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { await p.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const scene = () => p.evaluate(() => window.__game.scene.getScenes(true).map(s => s.scene.key).join(','));
const wait = ms => p.waitForTimeout(ms);
const until = async (key, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if ((await scene()).includes(key)) return true; await wait(200); } throw new Error(`never reached ${key}; at ${await scene()}`); };

await p.goto(URL); await until('Title'); await wait(800); await shot('01-title');
await p.mouse.click(422, 195); await until('Story'); await wait(1500); await shot('02-story');
// advance dialogue until the choice appears
for (let i = 0; i < 8; i++) { await p.keyboard.press('Enter'); await wait(250); await p.keyboard.press('Enter'); await wait(350); }
await shot('03-choice');
await p.mouse.click(422, 166); await wait(500); // first choice
for (let i = 0; i < 12 && !(await scene()).includes('Walk'); i++) { await p.keyboard.press('Enter'); await wait(250); await p.keyboard.press('Enter'); await wait(300); }
await until('Walk'); await wait(1200); await shot('04-walk');
await p.keyboard.down('D'); await wait(2200); await p.keyboard.up('D');
// read the second mark
await p.evaluate(() => { const s = window.__game.scene.getScene('Walk'); const m = s.marks[1]; s.wx = m.x - 120; });
await wait(300);
// game coords -> page coords (the 1280x720 canvas is fitted and centred in 844x390)
const k = 390 / 720, page = (gx, gy) => [gx * k, gy * k]; // EXPAND: height fits, width fills
const mx = await p.evaluate(() => { const s = window.__game.scene.getScene('Walk'); return s.marks[1].x - s.scroll; });
await p.mouse.click(...page(Math.max(700, mx), 560)); await wait(600); await shot('05-walk-mark');
await p.keyboard.down('D'); await until('Story', 30000); await p.keyboard.up('D'); await wait(800); await shot('06-story-dust');
for (let i = 0; i < 8 && !(await scene()).includes('Battle'); i++) { await p.keyboard.press('Enter'); await wait(250); await p.keyboard.press('Enter'); await wait(300); }
await until('Battle'); await wait(2500); await shot('07-battle');
// show the aim arc for a screenshot, then fight: aim at her head with the real launch maths
// hold the bow thumb (J key) to show the charge ring filling and the full-draw path
await p.keyboard.down('J'); await wait(300); await shot('08a-drawing'); await wait(700); await shot('08b-full-draw'); await p.keyboard.up('J');
await wait(4200); await shot('09-battle-move');
const hp0 = await p.evaluate(() => window.__game.scene.getScene('Battle').b.hp);
const fight = await p.evaluate(async () => {
  const s = window.__game.scene.getScene('Battle'); const sleep = ms => new Promise(r => setTimeout(r, ms));
  s.h.invuln = 999; let shots = 0, phase2 = false;
  while (!s.over && shots < 200) {
    if (!s.b.gone && s.h.cool <= 0) {
      // aim like a player at full draw: pick the angle whose flight passes through her head
      const box = s.bossBox(), tx = box.head.centerX, ty = box.head.centerY + 10;
      s.h.dir = tx >= s.h.x ? 'right' : 'left';
      let best = null;
      for (let a = -28; a <= 72; a += 0.5) {
        s.h.angle = a; const p = s.bowPoint(), L = s.launch(1), t = (tx - p.x) / L.vx; if (t <= 0) continue;
        const y = p.y + L.vy * t + 0.5 * L.g * t * t; if (!best || Math.abs(y - ty) < best.e) best = { e: Math.abs(y - ty), a };
      }
      if (best) { s.h.angle = best.a; s.h.drawT = s.cfg.bow.fullDraw; s.release(); shots++; }
    }
    if (s.b.phase === 1) phase2 = true;
    await sleep(420);
  }
  return { shots, over: s.over, hp: s.b.hp, phase2 };
}).catch(e => ({ err: e.message }));
console.log('hp before', hp0, 'fight', JSON.stringify(fight));
await wait(2600); await shot('10-heal');
await until('Story', 15000); await wait(1200); await shot('11-story-dawn');
for (let i = 0; i < 10 && !(await scene()).includes('Complete'); i++) { await p.keyboard.press('Enter'); await wait(250); await p.keyboard.press('Enter'); await wait(300); }
await until('Complete'); await wait(1200); await shot('12-complete');
console.log('errors', errors.length ? errors : 'none');
await b.close();
