// Dev probe: open a URL, collect errors, screenshot. usage: node tools/probe.mjs <url> <out.png> [w h] [waitMs] [script.js]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const [url, out, w = 1280, h = 720, wait = 2500, script] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push('[' + m.type() + '] ' + m.text()); });
p.on('pageerror', (e) => errs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
p.on('requestfailed', (r) => errs.push('[reqfail] ' + r.url()));
await p.goto(url);
await p.waitForFunction('window.__ready === true', null, { timeout: 15000 }).catch(() => errs.push('not ready'));
if (script) { const fn = fs.readFileSync(script, 'utf8'); await p.evaluate(fn).catch((e) => errs.push('[script] ' + e.message)); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
console.log(errs.slice(0, 30).join('\n') || 'no errors');
await b.close();
