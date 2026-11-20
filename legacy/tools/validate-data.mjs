// Fails the build when game data is inconsistent: unknown characters, enemies, bosses,
// backdrops, props, interactions or trials; broken labels; or chapters without places.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const errs = [];
const chars = new Set(J('src/data/characters.json').map((c) => c.id));
const enemies = new Set(J('src/data/enemies.json').map((e) => e.id));
const bosses = new Set(J('src/data/bosses.json').map((b) => b.id));
const backdrops = new Set([...src('src/art/backdrops.js').matchAll(/^\s{2}(\w+): \{ ground:/gm)].map((m) => m[1]));
const props = new Set([...src('src/art/props.js').matchAll(/case '(\w+)'/g)].map((m) => m[1]));
const kinds = new Set([...src('src/scenes/interactions.js').matchAll(/const KINDS = \{([^}]+)\}/g)][0][1].split(',').map((s) => s.trim().split(':')[0]).filter(Boolean));
const trials = new Set(['row', 'flight', 'stealth', 'rooftops', 'kohbar']);
const chapters = J('src/data/chapters.json');
const places = J('src/data/places.json');
const levels = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'src/data/levels')).map((f) => [f.replace('.json', ''), J('src/data/levels/' + f)]));
// a pattern belongs to one named character only
const owner = {};
for (const c of J('src/data/characters.json')) { if (c.crowd) continue; if (owner[c.pattern]) errs.push(`pattern ${c.pattern} used by ${owner[c.pattern]} and ${c.id}`); owner[c.pattern] = c.id; }
for (const ch of chapters) {
  if (ch.playable === false) continue;
  if (!places.some((p) => p.chapters.includes(ch.id))) errs.push(`chapter ${ch.id} has no place on the wall`);
  const file = path.join(ROOT, 'src/data/scripts', ch.id + '.json');
  if (!fs.existsSync(file)) { errs.push(`chapter ${ch.id} has no script`); continue; }
  const sc = J('src/data/scripts/' + ch.id + '.json');
  const labels = new Set(sc.filter((b) => b.label).map((b) => b.label));
  const walk = (list, where) => list.forEach((b, i) => {
    const at = `${ch.id}[${where}${i}]`;
    if (b.actor && !chars.has(b.char || b.actor)) errs.push(`${at}: unknown character ${b.char || b.actor}`);
    if (b.bg && !backdrops.has(b.bg)) errs.push(`${at}: unknown backdrop ${b.bg}`);
    if (b.prop && b.name && !props.has(b.name)) errs.push(`${at}: unknown prop ${b.name}`);
    if (b.do && !kinds.has(b.do)) errs.push(`${at}: unknown interaction ${b.do}`);
    if (b.trial && !trials.has(b.trial)) errs.push(`${at}: unknown trial ${b.trial}`);
    if (b.battle && !levels[b.battle]) errs.push(`${at}: unknown level ${b.battle}`);
    if (b.goto && !labels.has(b.goto)) errs.push(`${at}: goto to missing label ${b.goto}`);
    if (b.choice) for (const o of b.choice) if (o.goto && !labels.has(o.goto)) errs.push(`${at}: choice goes to missing label ${o.goto}`);
    if (b.then && Array.isArray(b.then)) walk(b.then, where + i + '.then.');
    if (b.after) walk(b.after, where + i + '.after.');
    if (b.targets) b.targets.forEach((q, k) => q.then && walk(q.then, `${where}${i}.t${k}.`));
  });
  walk(sc, '');
}
for (const [id, lv] of Object.entries(levels)) {
  if (!backdrops.has(lv.backdrop)) errs.push(`level ${id}: unknown backdrop ${lv.backdrop}`);
  if (!chars.has(lv.hero.id)) errs.push(`level ${id}: unknown hero ${lv.hero.id}`);
  for (const a of lv.arenas) for (const s of a.steps) {
    if (s.wave) for (const g of s.groups) { const t = g.type.startsWith('elite:') ? g.type.slice(6) : g.type; if (!(g.type.startsWith('elite:') ? chars.has(t) : enemies.has(t))) errs.push(`level ${id}: unknown enemy ${g.type}`); }
    for (const b of [].concat(s.boss || [], s.bosses || [])) if (!bosses.has(b)) errs.push(`level ${id}: unknown boss ${b}`);
  }
}
if (errs.length) { console.error('Data check failed:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`data ok: ${chapters.length} chapters, ${Object.keys(levels).length} levels, ${chars.size} characters, ${backdrops.size} backdrops`);
