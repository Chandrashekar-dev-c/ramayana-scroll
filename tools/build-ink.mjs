// Compiles every chapter in content/ink to JSON for the game (src/story/compiled), and checks
// each stage direction against the known verbs, characters, poses, backdrops, props and
// levels, so a typo fails the build instead of the show. Run: node tools/build-ink.mjs
import fs from 'node:fs';
import path from 'node:path';
import { Compiler } from 'inkjs/compiler/Compiler';
import { Story } from 'inkjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IN = path.join(ROOT, 'content/ink'), OUT = path.join(ROOT, 'src/story/compiled');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const chars = new Set(J('src/data/characters.json').map((c) => c.id));
const levels = new Set(fs.readdirSync(path.join(ROOT, 'src/data/levels')).map((f) => f.replace('.json', '')));
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const poses = new Set([...src('src/art/poses.js').matchAll(/^\s{2}(\w+): \{ /gm)].map((m) => m[1]));
const backdrops = new Set([...src('src/art/backdrops.js').matchAll(/^\s{2}(\w+): \{ ground/gm)].map((m) => m[1]));
const VERBS = new Set(['scene', 'music', 'cast', 'enter', 'exit', 'move', 'pose', 'face', 'set', 'prop', 'sound', 'wait', 'shake', 'wash', 'title', 'prompt', 'battle', 'astra', 'play', 'heads', 'curtain', 'light', 'clear', 'speak', 'together', 'cloth']);
const STAGED = new Set(['sage', 'sarayu', 'tataka', 'yajna']); // fully checked; the rest still carry old directions

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const problems = [];
let n = 0;
for (const f of fs.readdirSync(IN).filter((x) => x.endsWith('.ink')).sort()) {
  const id = f.replace('.ink', '');
  const text = fs.readFileSync(path.join(IN, f), 'utf8');
  let json;
  try {
    const c = new Compiler(text);
    const story = c.Compile();
    if (c.errors && c.errors.length) { problems.push(...c.errors.map((e) => `${f}: ${e}`)); continue; }
    json = story.ToJson();
    new Story(json); // loads
  } catch (e) { problems.push(`${f}: ${e.message || e}`); continue; }
  // check the stage directions of staged chapters
  if (STAGED.has(id)) {
    text.split('\n').forEach((line, i) => {
      const m = line.trim().match(/^>>\s*(\w+)\s*(.*)$/);
      if (!m) {
        const d = line.trim().match(/^([A-Z_]+):\s/);
        if (d && !chars.has(d[1].toLowerCase()) && !chars.has(d[1].toLowerCase().replace(/_(\w)/g, (_, c) => c.toUpperCase()))) problems.push(`${f}:${i + 1} unknown speaker ${d[1]}`);
        return;
      }
      const [, verb, rest] = m; const args = rest.split(/\s+/);
      const where = `${f}:${i + 1}`;
      if (!VERBS.has(verb)) problems.push(`${where} unknown direction "${verb}"`);
      if (['cast', 'enter'].includes(verb) && !chars.has(args[0].split(':')[0])) problems.push(`${where} unknown character ${args[0]}`);
      if (verb === 'pose' && !poses.has(args[1])) problems.push(`${where} unknown pose ${args[1]}`);
      if (verb === 'scene' && !backdrops.has(args[0])) problems.push(`${where} unknown backdrop ${args[0]}`);
      if (verb === 'battle' && !levels.has(args[0])) problems.push(`${where} unknown level ${args[0]}`);
      for (const a of args) { const kv = a.match(/^pose=(\w+)$/); if (kv && !poses.has(kv[1])) problems.push(`${where} unknown pose ${kv[1]}`); }
    });
  }
  fs.writeFileSync(path.join(OUT, `${id}.json`), json);
  n++;
}
if (problems.length) { console.error('ink problems:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ink: compiled ${n} chapters`);
