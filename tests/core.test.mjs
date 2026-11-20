// Unit tests for the parts with no browser dependency. Run: npm test
// (the stage, director and battles are covered end to end by npm run smoke)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Story } from 'inkjs';
import { migrate, freshSave, SAVE_VERSION } from '../src/core/save.js';
import { Rng, hashStr } from '../src/core/rng.js';
import { grade, SYMBOLS } from '../src/battle/astra.js';
import { blendPose, POSES } from '../src/art/poses.js';

test('an empty or missing save becomes a fresh save at the current version', () => {
  for (const old of [null, undefined, {}, 'junk', 42]) {
    const s = migrate(old);
    assert.equal(s.v, SAVE_VERSION);
    assert.deepEqual(s.done, {});
  }
});

test('a current save passes through unchanged', () => {
  const cur = { ...freshSave(), done: { tataka: true } };
  assert.equal(migrate(JSON.parse(JSON.stringify(cur))).done.tataka, true);
});

test('seeded randomness repeats exactly', () => {
  const a = new Rng('battle:tataka'), b = new Rng('battle:tataka');
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
  assert.equal(hashStr('ramayana'), hashStr('ramayana'));
});

test('a clean trace of the sun grades high; a wrong sign grades lower', () => {
  const circle = SYMBOLS.sun.pts.map(([x, y]) => [300 + x * 120, 300 + y * 120]);
  assert.ok(grade(circle, 'sun') > 0.8);
  assert.ok(grade(circle, 'lotus') < grade(circle, 'sun'));
  assert.equal(grade([[0, 0], [1, 1]], 'sun'), 0);
});

test('a pose blend moves every joint part of the way, and ends exactly on each pose', () => {
  const a = POSES.stand, b = POSES.namaste;
  assert.deepEqual(blendPose(a, b, 0), a);
  assert.deepEqual(blendPose(a, b, 1), b);
  const m = blendPose(a, b, 0.5);
  for (const j of ['armF', 'armB', 'legF', 'legB']) for (const i of [0, 1]) assert.equal(m[j][i], (a[j][i] + b[j][i]) / 2, j + i);
});

test('every compiled chapter loads and plays to its end down the first choices', () => {
  const dir = new URL('../src/story/compiled/', import.meta.url);
  const files = fs.readdirSync(dir);
  assert.equal(files.length, 46, 'all 46 chapters are compiled');
  for (const f of files) {
    const s = new Story(fs.readFileSync(new URL(f, dir), 'utf8'));
    let lines = 0, guard = 0;
    while (guard++ < 2000) { while (s.canContinue) { s.Continue(); lines++; } if (!s.currentChoices.length) break; s.ChooseChoiceIndex(0); }
    assert.ok(lines > 0, f + ' has lines');
  }
});

test('the four staged chapters use only known speakers and reach a battle where they should', () => {
  const chars = new Set(JSON.parse(fs.readFileSync(new URL('../src/data/characters.json', import.meta.url))).map((c) => c.id.toUpperCase()));
  for (const [id, battles] of [['sage', 0], ['sarayu', 1], ['tataka', 1], ['yajna', 1]]) {
    const src = fs.readFileSync(new URL(`../content/ink/${id}.ink`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/^([A-Z_]+):\s/gm)) assert.ok(chars.has(m[1].replace(/_/g, '')), `${id}: ${m[1]}`);
    assert.equal((src.match(/^>> battle /gm) || []).length, battles, id);
  }
});
