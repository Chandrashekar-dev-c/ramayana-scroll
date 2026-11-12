// Builds the game's data from the authoring sources in content/:
//   content/legacy/*      chapter scripts, levels, chapter list, places and English text
//   content/extra.json    text keys the engine itself uses (buttons, hints, trial lines)
//   content/levels.json   levels written directly in the engine's format
// Writes src/data/{chapters,places,marks,notes}.json, src/data/scripts/*.json,
// src/data/levels/*.json and src/i18n/en.json. Run: node tools/build-content.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const L = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/legacy', p), 'utf8'));
const W = 1280;          // stage width the scripts were positioned on
const GROUND = 548;
// Scripts were laid out on a 0..1 stage. Map it into the band every aspect ratio shows
// (a 4:3 screen sees world x 160..1120 around the centre at 640).
const xAt = (at) => Math.round(170 + at * 940);

const chapters = L('chapters.json');
const places = L('places.json');
const hubmarks = L('hubmarks.json');
const en = L('en.json');
const extra = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/extra.json'), 'utf8'));
const ownLevels = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/levels.json'), 'utf8'));
const scriptFiles = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'content/legacy/scripts')).map((f) => { const d = L('scripts/' + f); return [d.id, d]; }));
const levelFiles = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'content/legacy/levels')).map((f) => { const d = L('levels/' + f); return [d.id, d]; }));
const problems = [];

const CHAR_ALIAS = { young: 'youngAscetic' };
const ch_ = (c) => CHAR_ALIAS[c] || c;
const MOOD = (m) => (!m ? 'calm' : /battle|war/.test(m) ? 'battle' : /grief|dark|silence/.test(m) ? (m === 'silence' ? 'silent' : 'grief') : 'calm');
const CUE = { bellLow: 'starLow', bellSoft: 'bell', coilHiss: 'hiss', release: 'shootFull', boulder: 'stompLand', headVoice: 'chime' };

// ---------------------------------------------------------------- scripts
function convertScript(sc, segEnd, ctx) {
  const out = [];
  const chars = ctx.chars;
  const push = (b, label) => { if (label) b.label = label; out.push(b); };
  // the opening state: backdrop, cast, props
  if (sc.backdrop) push({ bg: sc.backdrop, style: sc.style, colour: sc.style === 'kachni' ? false : undefined });
  if (sc.music) push({ mood: MOOD(sc.music) });
  for (const c of sc.cast || []) { chars[c.id] = ch_(c.as || c.id); push({ actor: c.id, char: ch_(c.as || c.id), x: xAt(c.at), face: c.face ?? 1, stage: c.stage, pose: c.pose, mode: c.mode, scale: c.scale, y: c.y ? GROUND + c.y : undefined }); }
  for (const p of sc.props || []) push(propBeat(p));
  for (const b of sc.beats) {
    const conv = convertBeat(b, segEnd, ctx);
    if (!conv.length) { if (b.label) push({ noop: true }, b.label); continue; }
    if (b.label) conv[0].label = b.label;
    out.push(...conv);
  }
  return out;
}

function propBeat(p) {
  if (p.remove) return { unprop: [p.id] };
  const o = { prop: p.id, name: p.name, x: p.who ? undefined : p.name === 'rekha' ? 640 : p.at != null ? xAt(p.at) : undefined, state: p.state, dir: p.dir, colour: p.colour, scale: p.scale, broken: p.broken, width: p.width, front: p.front, y: p.y ? GROUND + p.y : undefined, who: p.who };
  return o;
}

function opsToBeats(ops, ctx) { return (ops || []).flatMap((o) => convertBeat(o, null, ctx)); }

function convertBeat(b, segEnd, ctx) {
  const chars = ctx.chars;
  switch (b.do) {
    case 'backdrop': { const o = []; if (b.clear) o.push({ exit: ['*'] }, { unprop: ['*'] }); o.push({ bg: b.id, style: b.style, colour: b.colour }); return o; }
    case 'narrate': return [{ narrate: true, k: b.text, top: b.top }];
    case 'say': return [{ say: b.who, as: chars[b.who] && chars[b.who] !== b.who ? chars[b.who] : undefined, nk: b.name, k: b.text }];
    case 'enter': {
      chars[b.who] = ch_(b.as || chars[b.who] || b.who);
      const to = xAt(b.to ?? 0.5), from = b.side === 'left' ? -300 : b.side === 'right' ? 1580 : to;
      const time = b.time ?? 1.5;
      const actor = { actor: b.who, char: chars[b.who], x: time < 0.2 ? to : from, face: b.side === 'right' ? -1 : 1, stage: b.stage, mode: b.mode || (b.colour === false ? 'line' : undefined), scale: b.scale, y: b.y ? GROUND + b.y : GROUND, hidden: false };
      if (time < 0.2) return [actor];
      return [actor, { move: b.who, x: to, speed: Math.max(60, Math.abs(to - from) / time), nowait: !!b.async }];
    }
    case 'exit': {
      const x = b.side === 'left' ? -320 : 1600, time = b.time ?? 1.6;
      return [{ move: b.who, x, speed: Math.max(80, 900 / time), nowait: !!b.async, exitAfter: true }];
    }
    case 'pose': return [{ pose: b.who, p: b.pose }];
    case 'set': {
      const o = { actor: b.who, char: chars[b.who] || ch_(b.who) };
      for (const k of ['pose', 'mode', 'alpha', 'stage', 'scale', 'rot']) if (b[k] !== undefined) o[k] = b[k];
      if (b.face !== undefined) o.face = b.face;
      if (b.at !== undefined) o.x = xAt(b.at);
      if (b.y !== undefined) o.y = GROUND + b.y;
      if (b.visible !== undefined) o.hidden = !b.visible;
      return [o];
    }
    case 'prop': return [propBeat(b)];
    case 'move': { const to = xAt(b.to); return [{ move: b.who, x: to, time: b.time ?? 1.4, keepFace: b.keepFace, y: b.y !== undefined ? GROUND + b.y : undefined }]; }
    case 'wash': return [{ wash: 'all', to: 'colour', dur: 2.6 }];
    case 'sound': return [{ cue: CUE[b.cue] || b.cue }];
    case 'music': return [{ mood: MOOD(b.mood) }];
    case 'shake': return [{ shake: b.amount ?? 6 }];
    case 'wait': return [{ wait: b.time ?? 1 }];
    case 'title': return [{ title: b.text, sub: b.sub }];
    case 'choice': return [{ choice: b.options.map((o) => ({ k: o.text, goto: o.goto, flag: o.flag, value: o.value })), prompt: b.prompt }];
    case 'goto': return [{ goto: b.to }];
    case 'end': return segEnd ? [{ goto: segEnd }] : [];
    case 'heads': return [{ heads: ctx.id, voices: b.voices, lines: b.lines, then: b.then }];
    case 'headsSilence': return [{ heads: ctx.id, do: 'heads', mode: 'silence', lines: b.lines, silent: b.silent }];
    case 'interact': return convertInteract(b.kind, b.args || {}, ctx);
    default: problems.push(`${ctx.id}: unknown beat ${b.do}`); return [];
  }
}

function convertInteract(kind, a, ctx) {
  const hint = a.hint;
  const lines = (a.texts || []).map((k, i, arr) => ({ at: (i + 1) / (arr.length + 1), k, who: a.from }));
  switch (kind) {
    case 'walkTo': return [{ do: 'walk', actor: a.who, x: xAt(a.to), speed: a.speed, k: hint || 'hint.walk', idle: a.carry ? 'carry' : undefined, walkPose: a.carry }];
    case 'hold': {
      const fx = { colour: 'colourUp', grow: 'grow', lamp: 'lamps', lamps: 'lamps', lift: 'lift', night: 'endure', seasons: 'seasons', tail: 'grow', whisper: 'listen' }[a.visual] || 'none';
      return [{ do: 'hold', fx, actor: a.who, prop: a.prop, dur: a.time || 3, k: hint || 'hint.hold', count: a.visual === 'lamp' ? 1 : a.count, lampX: a.at != null ? xAt(a.at) : undefined, to: a.scale || (a.visual === 'tail' ? 1.25 : 1.6), lift: a.height, hideMeter: a.noMeter, lines, cue: CUE[a.cue] || a.cue, endure: a.endure, from: a.from }];
    }
    case 'holdRelease': return [{ do: 'charge', actor: a.who, dur: a.time || 1.2, poses: a.pose, endPose: a.endPose, shake: a.shake, cue: CUE[a.cue] || a.cue, k: hint || 'hint.holdRelease', after: opsToBeats(a.ops, ctx) }];
    case 'mash': return [{ do: 'mash', actor: a.who, need: a.need, futile: a.futile, k: hint || 'hint.mash' }];
    case 'resolve': return [...opsToBeats(a.ops, ctx), { do: 'resolve', who: a.from || 'ravana', threats: a.threats }];
    case 'tapSpots': return [{ do: 'tap', k: hint || 'hint.tap', ordered: a.ordered, targets: a.spots.map((sp) => ({ x: sp.at != null ? xAt(sp.at) : undefined, actor: sp.who, y: GROUND - (sp.y ?? 80), lab: sp.label, k: sp.text, icon: sp.icon, cue: CUE[sp.cue] || sp.cue, then: opsToBeats(sp.ops, ctx), r: 64 })) }];
    case 'dragPlace': {
      if (ctx.id === 'wedding') return [{ do: 'kohbar' }];
      const from = {}; for (const it of a.items) from[it.who] = (from[it.who] || 0) + 1;
      const hands = [...new Set(a.items.map((it) => xAt(it.to[0])))];
      return [{ do: 'give', k: hint || 'hint.drag', from: Object.entries(from).map(([actor, n]) => ({ actor, n })), hands, handY: GROUND - 20, lines: a.items.filter((it) => it.text).map((it) => it.text) }];
    }
    case 'drive': { const chariot = Object.entries(ctx.props).find(([, n]) => n === 'chariot'); return [{ do: 'hold', fx: 'drive', prop: chariot ? chariot[0] : 'chariot', x: 1700, dur: 9, k: 'exile.drive' }]; }
    case 'greatBow': return [{ do: 'bow', phases: ['lift', 'bend', 'pull'], prop: 'cart', actor: 'rama', breaks: true, keys: ['hint.lift', 'hint.bend', 'hint.pullBow'] }];
    case 'trace':
      if (a.symbol) return [{ do: 'trace', k: 'hint.trace', cx: xAt(a.at ?? 0.5), cy: GROUND - (a.y ?? 300), rx: a.size || 110, ry: a.size || 110, symbol: a.symbol }];
      return [{ do: 'trace', k: hint || 'hint.trace', cx: 640, cy: GROUND + 16, rx: Math.round(((a.rect[1] - a.rect[0]) * 940) / 2 + 40), ry: 50 }];
    case 'rhythm': return [{ do: 'rhythm', k: hint || 'hint.rhythm', need: a.need, bpm: a.bpm, fx: a.prop ? 'bridge' : 'wake', prop: a.prop, actor: a.prop ? 'nala' : 'kumbhakarna', strict: !!a.streak, kinds: a.icon === 'stone' ? ['drum', 'drumHigh', 'drum', 'drumHigh'] : undefined }];
    case 'boat': return [{ trial: 'row', k: 'ch10.obj', par: 45 }];
    case 'burn': return [{ trial: 'rooftops', k: 'ch30.obj', par: 80 }];
    case 'stealth': return [{ trial: 'stealth', k: 'ch27.obj', par: 75 }];
    case 'leap': return [{ trial: 'flight', kind: 'leap', k: 'ch26.obj', par: 50 }];
    case 'jatayu': return [{ trial: 'flight', kind: 'jatayu' }];
    case 'drop': return [{ trial: 'flight', kind: 'jewels', k: 'ch19.obj' }];
    case 'mountainFlight': return a.calm ? [{ trial: 'flight', kind: 'sanjeevani', calm: true, length: 3200, k: 'ch36.north' }] : [{ trial: 'flight', kind: 'sanjeevani', dawn: a.time || 48, length: 6400, k: 'ch36.obj' }];
    case 'lamps': return [{ do: 'lamps', k: 'ch39.obj', dur: 45 }];
    case 'sala': return [{ do: 'sala', k: 'ch23.obj', x0: 520, gap: 84 }];
    case 'berries': return [{ do: 'berries', k: 'ch21.obj', plateX: 980, asideX: 240 }];
    case 'battle': return [{ battle: a.level }];
    case 'duel': return [{ battle: 'valiDuel' }];
    default: problems.push(`${ctx.id}: unknown interaction ${kind}`); return [];
  }
}

// ---------------------------------------------------------------- levels
function convertLevel(lv) {
  const out = { id: lv.id, backdrop: lv.backdrop, style: lv.style, hero: { id: lv.hero.id, stage: lv.hero.stage }, astras: !!lv.astras, shelves: lv.shelves, tips: lv.tips, practice: lv.id === 'sarayuTargets' || undefined };
  out.allies = (lv.party || []).filter((p) => p.ai === 'archerSupport').map((p) => ({ id: p.id, stage: p.stage, fire: true }));
  const prot = (lv.party || []).find((p) => p.ai === 'protected');
  if (prot) { out.protected = { id: prot.id, stage: prot.stage, x: (lv.arenas[0].left + 140) }; out.gentle = 'ally'; }
  if (lv.protect) { out.protect = { x: lv.protect.x, hp: 12, label: lv.protect.label, kind: lv.protect.prop || 'altar', fail: 'lose.fire' }; out.gentle = 'protect'; }
  out.arenas = lv.arenas.map((a) => ({ left: a.left, right: a.right, steps: [] }));
  let arena = 0;
  for (const st of lv.steps) {
    if (st.arena !== undefined) arena = st.arena;
    const A = out.arenas[arena].steps;
    switch (st.type) {
      case 'banner': out.title = st.title; out.kandaTitle = st.sub; break;
      case 'wave': {
        if (st.line) A.push({ say: st.line, wait: 0.2 });
        A.push({ wave: st.objective, teach: st.teach, groups: st.spawn.map(([type, n]) => ({ type, n, side: st.side || 'right', gap: st.gap ?? 1.4, target: st.target })) });
        break;
      }
      case 'checkpoint': A.push({ checkpoint: st.line || null }); break;
      case 'boss': A.push(Array.isArray(st.boss) ? { bosses: st.boss, intro: st.intro } : { boss: st.boss, intro: st.intro }); break;
      case 'heal': out.heal = true; break;
      case 'scene': out.end = st.lines; break;
      case 'timer': A.push({ timer: { dur: st.time, label: st.label, fail: 'lose.rite' } }); out.timerTip = st.tip; break;
      case 'timerStop': A.push({ timerStop: true }); break;
      case 'targets': A.push({ targets: st.targets.map((q) => ({ kind: q.kind, x: q.x, y: GROUND - q.y, r: 38 })), objective: st.objective, hint: 'hint.holdDraw' }); break;
      default: problems.push(`level ${lv.id}: unknown step ${st.type}`);
    }
  }
  // the yajna fire: rakshasas on foot go for the altar
  if (lv.protect) for (const a of out.arenas) for (const s of a.steps) if (s.wave) for (const g of s.groups) if (g.type !== 'flyer' && !g.target) g.target = 'protect';
  if (prot) for (const a of out.arenas) for (const s of a.steps) if (s.wave) s.groups.forEach((g, i) => { if (!g.target && i % 2 === 1 && g.type === 'grunt') g.target = 'ally'; });
  return out;
}

// ---------------------------------------------------------------- chapters, places, marks
const LANKA_PLACES = new Set(['lankaGate', 'ravanaCourt', 'lankaRoofs', 'lankaWalls', 'lankaPalace']);
const NO_PAINT = new Set(['dasharatha', 'shurpanakha', 'deer', 'rekha', 'jatayu', 'l5', 'falls', 'exile']);
const KANDA_TIER = { bala: 0, ayodhya: 1, aranya: 2, kishkindha: 3, sundara: 4, yuddha: 5 };
const ICON = { city: 'city', river: 'river', waste: 'waste', hut: 'ashram', grove: 'grove', palace: 'palace', hill: 'hill', forest: 'forest', mountain: 'ridge', sky: 'sky', cave: 'rocks', sea: 'shore', lanka: 'lanka', field: 'field' };
const PLACE_ICON = { panchavati: 'hut', pampa: 'lake', mithila: 'mithila', bridge: 'bridge', himalaya: 'camp', rishyamukha: 'trees', mahendra: 'ocean', ashokaGrove: 'grove', gautamaAshram: 'hermitage', nikumbhila: 'grove' };

const outPlaces = places.map((p) => ({ id: p.id, tier: KANDA_TIER[p.tier], x: Math.min(2300, Math.max(100, p.x)), icon: PLACE_ICON[p.id] || ICON[p.icon] || 'hill', lanka: LANKA_PLACES.has(p.id), chapters: [] }));
const placeById = Object.fromEntries(outPlaces.map((p) => [p.id, p]));

const out = [];
const scripts = {};
let seq = 0;
for (const c of chapters) {
  const ctx = { id: c.id, chars: {}, props: {} };
  // collect prop ids so interactions can find them
  for (const sid of [c.script, c.after].filter(Boolean)) { const sc = scriptFiles[sid]; if (!sc) { problems.push(`${c.id}: missing script ${sid}`); continue; } for (const p of sc.props || []) ctx.props[p.id] = p.name; for (const b of sc.beats) if (b.do === 'prop' && b.name) ctx.props[b.id] = b.name; }
  const segs = [];
  if (c.script) segs.push({ kind: 'script', id: c.script });
  if (c.level) segs.push({ kind: 'level', id: c.level });
  if (c.after) segs.push({ kind: 'script', id: c.after });
  const beats = [];
  segs.forEach((sg, i) => {
    const endLabel = `__seg${i + 1}`;
    if (sg.kind === 'script') beats.push(...convertScript(scriptFiles[sg.id], endLabel, ctx));
    else beats.push({ battle: sg.id });
    beats.push({ noop: true, label: endLabel });
  });
  scripts[c.id] = beats;
  const pl = placeById[c.place];
  if (pl) pl.chapters.push(c.id); else problems.push(`${c.id}: no place ${c.place}`);
  const lankaCh = c.type === 'lanka';
  const ch = {
    id: c.id, n: lankaCh ? 'L' + c.order : String(c.order), type: c.type, kanda: c.kanda, place: c.place,
    win: c.win || (c.level && levelFiles[c.level] && levelFiles[c.level].win) || [],
    gentle: c.seals.protect === 'sita' ? 'ally' : c.level === 'yajna' ? 'protect' : null, par: c.seals.parTime || 600,
    paint: [], kachni: [], unpaint: [], seq: seq++,
  };
  if (lankaCh || LANKA_PLACES.has(c.place)) ch.kachni.push(c.place);
  else if (!NO_PAINT.has(c.id)) ch.paint.push(c.place);
  out.push(ch);
}
const chById = Object.fromEntries(out.map((c) => [c.id, c]));
// fades: a place loses its colour after one chapter and regains it at another
for (const m of hubmarks) if (m.kind === 'fade') { chById[m.after].unpaint.push(m.place); chById[m.until].paint.push(m.place); }
// after the battle, Lanka is painted for the first time; the homecoming paints everything else
chById.after.paint.push(...LANKA_PLACES, 'battlefield');
chById.lighting.paint.push(...outPlaces.filter((p) => !LANKA_PLACES.has(p.id) && p.id !== 'panchavati' && p.id !== 'ayodhya').map((p) => p.id));
chById.coronation.paint.push(...outPlaces.map((p) => p.id));
chById.ashoka.paint.push('ashokaGrove');
// the placeholder for Sita's trial by fire: kept in data, never played until the owner decides
const agniIdx = out.findIndex((c) => c.id === 'lighting');
out.splice(agniIdx, 0, { id: 'agni', n: '—', type: 'scene', kanda: 'yuddha', place: 'battlefield', playable: false, win: [], paint: [], kachni: [], unpaint: [], placeholder: true });

const marks = hubmarks.filter((m) => m.kind !== 'fade');

// ---------------------------------------------------------------- levels
const levels = {};
for (const id in levelFiles) levels[id] = convertLevel(levelFiles[id]);
for (const id in ownLevels) levels[id] = ownLevels[id];

// ---------------------------------------------------------------- text and notes
const strings = { ...en };
for (const k in extra) if (!(k in strings) || extra.__override?.includes(k)) strings[k] = extra[k];
delete strings.__override;
const notes = {};
for (const c of chapters) {
  const s = c.source || {};
  const text = [];
  if (strings[c.note]) for (const [i, para] of strings[c.note].split(/\n\s*\n|\n/).entries()) { const k = `${c.note}.${i + 1}`; strings[k] = para; text.push(k); }
  notes[c.id] = { text, source: `${s.text || 'Valmiki'}, ${s.kanda || ''} Kanda, sargas ${s.sargas || '(verify)'}`, later: s.later ? (typeof s.later === 'string' ? s.later : 'later tradition') : null, claim: strings[c.note] ? strings[c.note].slice(0, 140) : '', reviewer: s.reviewedBy || null };
}

// ---------------------------------------------------------------- write
const write = (rel, data) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n'); };
fs.rmSync(path.join(ROOT, 'src/data/scripts'), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, 'src/data/levels'), { recursive: true, force: true });
for (const id in scripts) write(`src/data/scripts/${id}.json`, scripts[id]);
for (const id in levels) write(`src/data/levels/${id}.json`, levels[id]);
write('src/data/chapters.json', out);
write('src/data/places.json', outPlaces);
write('src/data/marks.json', marks);
write('src/data/notes.json', notes);
const sorted = Object.fromEntries(Object.keys(strings).sort().map((k) => [k, strings[k]]));
write('src/i18n/en.json', sorted);
console.log(`content: ${out.length} chapters, ${Object.keys(scripts).length} scripts, ${Object.keys(levels).length} levels, ${Object.keys(strings).length} strings`);
if (problems.length) { console.log('problems:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
