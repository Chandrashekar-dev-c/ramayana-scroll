// Writes the service worker's precache list after the bundle is known.
import fs from 'node:fs';
import path from 'node:path';

export function swPlugin() {
  let outDir = 'dist';
  return {
    name: 'ramayana-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files = [];
      const walk = (dir, rel = '') => {
        for (const f of fs.readdirSync(dir)) {
          const p = path.join(dir, f), r = rel ? rel + '/' + f : f;
          if (fs.statSync(p).isDirectory()) walk(p, r); else files.push(r);
        }
      };
      walk(outDir);
      // Language packs other than English are cached on demand, when chosen.
      const shell = files.filter((f) => f !== 'sw.js' && !/i18n-(hi|kn|te|ta|sa)|\/(hi|kn|te|ta|sa)-[\w-]+\.js$/.test(f));
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const version = Date.now().toString(36);
      const src = fs.readFileSync(swPath, 'utf8').replace('"__PRECACHE__"', JSON.stringify(shell)).replace('__VERSION__', version);
      fs.writeFileSync(swPath, src);
    },
  };
}
