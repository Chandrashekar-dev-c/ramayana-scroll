// Unit tests for the parts of the core that have no browser dependency.
// Run: npm test   (the beat runner and battles are covered end to end by npm run smoke)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migrate, freshSave, SAVE_VERSION } from '../src/core/save.js';
import { Rng, hashStr } from '../src/core/rng.js';
import { grade, SYMBOLS } from '../src/play/astra.js';

test('an empty or missing save becomes a fresh save at the current version', () => {
  for (const old of [null, undefined, {}, 'junk', 42]) {
    const s = migrate(old);
    assert.equal(s.v, SAVE_VERSION);
    assert.deepEqual(s.done, {});
    assert.equal(s.settings.lang, 'en');
  }
});

test('a version 0 save keeps its progress and gains new settings', () => {
  const s = migrate({ done: { sage: true }, seals: { sage: { finish: true } }, settings: { music: 0.2 } });
  assert.equal(s.v, SAVE_VERSION);
  assert.equal(s.done.sage, true);
  assert.equal(s.settings.music, 0.2);
  assert.equal(s.settings.sfx, freshSave().settings.sfx);
  assert.equal(s.settings.lankaWoven, true);
});

test('a current save passes through unchanged', () => {
  const cur = { ...freshSave(), done: { tataka: true }, pride: 3 };
  const s = migrate(JSON.parse(JSON.stringify(cur)));
  assert.equal(s.pride, 3);
  assert.equal(s.done.tataka, true);
});

test('seeded randomness repeats exactly', () => {
  const a = new Rng('battle:tataka'), b = new Rng('battle:tataka');
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
  assert.notEqual(new Rng('x').next(), new Rng('y').next());
  assert.equal(hashStr('ramayana'), hashStr('ramayana'));
});

test('a clean trace of a glyph grades high; a wrong glyph grades lower', () => {
  const circle = SYMBOLS.sun.pts.map(([x, y]) => [300 + x * 120, 300 + y * 120]);
  const wobbly = circle.map(([x, y], i) => [x + Math.sin(i) * 6, y + Math.cos(i * 1.3) * 6]);
  assert.ok(grade(circle, 'sun') > 0.8, 'clean circle');
  assert.ok(grade(wobbly, 'sun') > 0.5, 'shaky circle still counts');
  assert.ok(grade(circle, 'lotus') < grade(circle, 'sun'), 'circle is not the lotus');
  assert.equal(grade([[0, 0], [1, 1]], 'sun'), 0, 'a tap is not a trace');
});

test('every text key with a placeholder keeps it in English', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../src/i18n/en.json', import.meta.url)));
  for (const [k, n] of [['lock.finish', 'name'], ['hint.tapPlace', 'place'], ['stat.kills', 'n'], ['stat.time', 't']]) assert.match(en[k], new RegExp(`\\{${n}\\}`), k);
});

test('every chapter script reaches its battles and labels', () => {
  const dir = new URL('../src/data/scripts/', import.meta.url);
  for (const f of fs.readdirSync(dir)) {
    const sc = JSON.parse(fs.readFileSync(new URL(f, dir)));
    assert.ok(sc.length > 0, f);
    const labels = new Set(sc.filter((b) => b.label).map((b) => b.label));
    for (const b of sc) if (b.goto) assert.ok(labels.has(b.goto), `${f}: ${b.goto}`);
  }
});
