// One-time migration: the old chapter scripts (content/legacy) become Ink screenplays in
// content/ink, one file per chapter, with every line of English text carried over.
//   plain line       narration
//   NAME: line       dialogue
//   >> verb args     a stage direction (see src/story/directions.js for the full list)
// Run: node tools/migrate-to-ink.mjs [--force]   (existing .ink files are kept unless --force)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const L = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/legacy', p), 'utf8'));
const chapters = L('chapters.json');
const en = L('en.json');
const scripts = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'content/legacy/scripts')).map((f) => { const d = L('scripts/' + f); return [d.id, d]; }));
const force = process.argv.includes('--force');
const OUT = path.join(ROOT, 'content/ink');
fs.mkdirSync(OUT, { recursive: true });

const text = (k) => (k in en ? String(en[k]) : `[missing ${k}]`);
/** Escape Ink's special characters so a line of English stays a line of English. */
function esc(s) {
  s = s.replace(/\\/g, '\\\\').replace(/([{}[\]|#])/g, '\\$1').replace(/\/\//g, '/\\/').replace(/->/g, '-\\>').replace(/<>/g, '<\\>');
  if (/^[*\-=~+]/.test(s)) s = '\\' + s;
  return s;
}
const ident = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');
const side = (s) => (s === 'left' ? 'left' : 'right');
const num = (n) => (typeof n === 'number' ? +n.toFixed(3) : n);
const kv = (o, skip = []) => Object.entries(o).filter(([k, v]) => !skip.includes(k) && v !== undefined).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : num(v)}`).join(' ');

function who(b) { return b.stage ? `${b.who}:${b.stage}` : b.who; }

function convert(sc, vars, out) {
  if (sc.backdrop) out.push(`>> scene ${sc.backdrop}${sc.style && sc.style !== 'bharni-bright' ? ' style=' + sc.style : ''}`);
  if (sc.music) out.push(`>> music ${sc.music}`);
  for (const c of sc.cast || []) out.push(`>> cast ${c.stage ? c.id + ':' + c.stage : c.id} at ${num(c.at)}${c.pose ? ' pose=' + c.pose : ''}${c.face === -1 ? ' face=left' : ''}${c.y ? ' y=' + c.y : ''}${c.scale ? ' scale=' + c.scale : ''}${c.mode ? ' mode=' + c.mode : ''}`);
  for (const p of sc.props || []) out.push(`>> prop ${p.id} ${p.name} at ${num(p.at ?? 0.5)}${(() => { const r = kv(p, ['id', 'name', 'at']); return r ? ' ' + r : ''; })()}`);
  for (const b of sc.beats) {
    if (b.label) { out.push(`-> ${ident(b.label)}`); out.push(`= ${ident(b.label)}`); }
    switch (b.do) {
      case 'narrate': out.push(esc(text(b.text))); break;
      case 'say': {
        const name = (b.name ? text(b.name) : b.who).toString();
        out.push(`${ident(b.who).toUpperCase()}: ${esc(text(b.text))}`);
        void name;
        break;
      }
      case 'enter': out.push(`>> enter ${who(b)} from ${side(b.side)} to ${num(b.to ?? 0.5)}${b.time ? ' in ' + b.time : ''}${b.async ? ' nowait' : ''}${(() => { const r = kv(b, ['do', 'who', 'side', 'to', 'time', 'async', 'stage', 'label']); return r ? ' ' + r : ''; })()}`); break;
      case 'exit': out.push(`>> exit ${b.who} to ${side(b.side)}${b.time ? ' in ' + b.time : ''}${b.async ? ' nowait' : ''}${b.y !== undefined ? ' y=' + b.y : ''}`); break;
      case 'move': out.push(`>> move ${b.who} to ${num(b.to)}${b.time ? ' in ' + b.time : ''}${b.y !== undefined ? ' y=' + b.y : ''}${b.keepFace ? ' keepface' : ''}`); break;
      case 'pose': out.push(`>> pose ${b.who} ${b.pose}`); break;
      case 'set': out.push(`>> set ${b.who} ${kv(b, ['do', 'who', 'label'])}`); break;
      case 'backdrop': out.push(`>> scene ${b.id}${b.clear ? ' clear' : ''}${b.style ? ' style=' + b.style : ''}${b.colour === false ? ' colour=false' : ''}`); break;
      case 'prop': out.push(b.remove ? `>> prop ${b.id} remove` : `>> prop ${b.id} ${b.name || b.id} at ${num(b.at ?? 0.5)}${(() => { const r = kv(b, ['do', 'id', 'name', 'at', 'label']); return r ? ' ' + r : ''; })()}`); break;
      case 'sound': out.push(`>> sound ${b.cue}`); break;
      case 'music': out.push(`>> music ${b.mood}`); break;
      case 'wait': out.push(`>> wait ${b.time}`); break;
      case 'shake': out.push(`>> shake ${b.amount ?? 3}`); break;
      case 'wash': out.push('>> wash'); break;
      case 'title': out.push(`>> title ${text(b.text)}${b.sub ? ' / ' + text(b.sub) : ''}`); break;
      case 'goto': out.push(`-> ${ident(b.to)}`); break;
      case 'end': break;
      case 'choice': {
        if (b.prompt) out.push(`>> prompt ${esc(text(b.prompt))}`);
        for (const o of b.options) {
          out.push(`* [${esc(text(o.text))}]`);
          if (o.flag) { const v = ident(o.flag); vars.add(v); out.push(`  ~ ${v} = "${o.value ?? 'true'}"`); }
          out.push(o.goto ? `  -> ${ident(o.goto)}` : '  -> continue_' + vars.size);
        }
        if (b.options.some((o) => !o.goto)) { out.push(`= continue_${vars.size}`); }
        break;
      }
      case 'interact': {
        const a = b.args || {};
        if (b.kind === 'battle') out.push(`>> battle ${a.level}`);
        else if (b.kind === 'trace' && a.symbol) out.push(`>> astra ${a.symbol}`);
        else out.push(`>> play ${b.kind} ${JSON.stringify(a)}`);
        break;
      }
      case 'heads': out.push(`>> heads ${JSON.stringify({ voices: b.voices, lines: b.lines, then: b.then })}`); break;
      case 'headsSilence': out.push(`>> heads ${JSON.stringify({ silent: b.silent, lines: b.lines })}`); break;
      default: out.push(`// unconverted: ${JSON.stringify(b)}`);
    }
  }
}

let wrote = 0, kept = 0;
for (const c of chapters) {
  const file = path.join(OUT, `${c.id}.ink`);
  if (fs.existsSync(file) && !force) { kept++; continue; }
  const vars = new Set();
  const body = [];
  if (c.script) convert(scripts[c.script], vars, body);
  if (c.level) body.push(`>> battle ${c.level}`);
  if (c.after && scripts[c.after]) convert(scripts[c.after], vars, body);
  const head = [
    `// ${text(c.title)} — ${c.kanda} kanda${c.type === 'lanka' ? ', Lanka' : ''}`,
    `// Source: ${c.source.text}, ${c.source.kanda} Kanda, sargas ${c.source.sargas}${c.source.later ? ' (later tradition)' : ''}`,
    `// Migrated from the old script format. Not yet staged for the Ramlila stage.`,
    ...[...vars].map((v) => `VAR ${v} = ""`),
    '',
  ];
  // stage directions may carry JSON: escape what Ink would read as logic
  const lines = body.map((l) => (l.startsWith('>> ') ? '>> ' + l.slice(3).replace(/\\/g, '\\\\').replace(/([{}[\]#])/g, '\\$1').replace(/\/\//g, '/\\/') : l));
  fs.writeFileSync(file, [...head, ...lines, '-> END', ''].join('\n'));
  wrote++;
}
console.log(`ink: wrote ${wrote}, kept ${kept} (of ${chapters.length} chapters)`);
