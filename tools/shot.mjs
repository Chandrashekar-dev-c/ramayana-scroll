// Dev helper: screenshot a URL with the system Chrome. usage: node tools/shot.mjs <url> <out.png> [w] [h] [waitExpr]
import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const [url, out, w = 1280, h = 720, wait] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text()); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto(url);
await p.waitForFunction(wait || 'window.__done === true', null, { timeout: 15000 }).catch((e) => console.log('wait timeout'));
await p.screenshot({ path: out, fullPage: true });
await b.close();
