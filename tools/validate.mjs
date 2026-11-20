// Data checks: every level names known enemies, bosses, characters and backdrops; every
// chapter has its title, note and source; every ready chapter has a staged screenplay.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const en = J('src/i18n/en.json');
const chars = new Set(J('src/data/characters.json').map((c) => c.id));
const enemies = new Set(J('src/data/enemies.json').map((e) => e.id));
const bosses = new Set(J('src/data/bosses.json').map((b) => b.id));
const backdrops = new Set([...fs.readFileSync(path.join(ROOT, 'src/art/backdrops.js'), 'utf8').matchAll(/^\s{2}(\w+): \{ ground/gm)].map((m) => m[1]));
const problems = [];
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/levels'))) {
  const L = J('src/data/levels/' + f);
  if (!backdrops.has(L.backdrop)) problems.push(`${f}: unknown backdrop ${L.backdrop}`);
  if (L.hero && !chars.has(L.hero.id)) problems.push(`${f}: unknown hero ${L.hero.id}`);
  for (const a of L.allies || []) if (!chars.has(a.id)) problems.push(`${f}: unknown ally ${a.id}`);
  for (const ar of L.arenas || []) for (const s of ar.steps) {
    for (const g of s.groups || []) if (!enemies.has(g.type) && !(g.type.startsWith('elite:') && chars.has(g.type.slice(6)))) problems.push(`${f}: unknown enemy ${g.type}`);
    for (const b of [s.boss, ...(s.bosses || [])].filter(Boolean)) if (!bosses.has(b)) problems.push(`${f}: unknown boss ${b}`);
  }
}
for (const c of J('src/data/chapters.json')) {
  for (const k of [c.title, c.note]) if (!(k in en)) problems.push(`${c.id}: missing text ${k}`);
  if (!c.source || !c.source.text) problems.push(`${c.id}: no source`);
  if (c.ready && !fs.readFileSync(path.join(ROOT, 'content/ink', c.id + '.ink'), 'utf8').includes('Staged for the')) problems.push(`${c.id}: marked ready but not staged`);
}
if (problems.length) { console.error('data problems:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('data: ok');
