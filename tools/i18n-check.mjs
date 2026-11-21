// Lists missing and extra keys per language; fails if a key used in English is missing in a
// language marked final, or if code or data uses a key English does not have.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8'));
const status = Object.fromEntries([...fs.readFileSync(path.join(ROOT, 'src/core/i18n.js'), 'utf8').matchAll(/(\w\w): \{ name: '[^']+', status: '(\w+)' \}/g)].map((m) => [m[1], m[2]]));
let fail = false;
// keys referenced by data
const used = new Set();
const scan = (v) => { if (typeof v === 'string') { if (/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(v) && !/\.(json|js|png|svg)$/.test(v)) used.add(v); } else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === 'object') for (const k in v) if (!['label', 'goto', 'then_label', 'flag', 'id'].includes(k)) scan(v[k]); };
for (const dir of ['src/data/scripts', 'src/data/levels']) for (const f of fs.readdirSync(path.join(ROOT, dir))) scan(JSON.parse(fs.readFileSync(path.join(ROOT, dir, f), 'utf8')));
for (const f of ['chapters.json', 'notes.json', 'bosses.json', 'heads.json', 'motifs.json']) scan(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data', f), 'utf8')));
// literal keys in code: t('a.b'), say('a.b'), and similar
const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkDir(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
for (const f of walkDir(path.join(ROOT, 'src'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\b(?:t|say|hintOnce|showHint\(b,|label\([^,]+,[^,]+,)\s*\(?'([a-z][\w]*(?:\.[\w]+)+)'/g)) used.add(m[1]);
// name.* and head.* are optional (nameOf falls back to the id) and hint.*.mouse has a fallback;
// every other family is checked explicitly below instead of being skipped
const ignore = /^(name\.|head\.|hint\.\w+\.mouse$)/;
const missing = [...used].filter((k) => !(k in en) && !ignore.test(k) && !k.startsWith('sfx.'));
// dynamic families must still exist
const chapters = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/chapters.json'), 'utf8'));
for (const c of chapters) { if (!en['chapter.' + c.id + '.title']) missing.push('chapter.' + c.id + '.title'); if (!en['place.' + c.place]) missing.push('place.' + c.place); }
for (const k of ['story', 'normal', 'hard']) for (const s of ['', '.sub']) if (!en['diff.' + k + s]) missing.push('diff.' + k + s);
const need = (k) => { if (!en[k]) missing.push(k); };
for (const k of ['bala', 'ayodhya', 'aranya', 'kishkindha', 'sundara', 'yuddha']) need('kanda.' + k);
for (const c of chapters) if (c.playable !== false) { need('type.' + c.type); if (c.gentle) need('seal.gentle.' + c.gentle); }
for (const k of ['finish', 'gentle', 'fast']) need('seal.' + k);
const keysSrc = fs.readFileSync(path.join(ROOT, 'src/core/input.js'), 'utf8').split('export const DEFAULT_KEYS = {')[1].split('};')[0];
for (const m of keysSrc.matchAll(/(\w+): \[/g)) need('act.' + m[1]);
for (const k of ['battle', 'trial', 'scene', 'map', 'title']) need('aria.' + k);
// keys a script hands to an interaction by name (threats, lines, voices) are data too
const heads = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/heads.json'), 'utf8'));
scan(heads);
if (missing.length) { fail = true; console.error('English is missing keys used by the game:\n  ' + [...new Set(missing)].join('\n  ')); }
for (const f of fs.readdirSync(path.join(ROOT, 'src/i18n'))) {
  const lang = f.replace('.json', ''); if (lang === 'en') continue;
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n', f), 'utf8'));
  const miss = Object.keys(en).filter((k) => !(k in d)), extra = Object.keys(d).filter((k) => !(k in en));
  console.log(`${lang} (${status[lang] || '?'}): ${Object.keys(d).length} keys, ${miss.length} missing, ${extra.length} extra`);
  if (status[lang] === 'final' && miss.length) { fail = true; console.error(`  ${lang} is marked final but misses ${miss.length} keys`); }
}
if (fail) process.exit(1);
console.log(`i18n ok: ${Object.keys(en).length} English keys, ${used.size} referenced`);
