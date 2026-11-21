// Unit tests for the parry, combo, traversal, arena and boss-stagger code. They drive the real
// modules with a small battle object (no canvas), so each test fails if the behaviour breaks.
// Run: npm test   (tests/setup.mjs lets Node load the JSON data and stubs a few browser globals)
import test from 'node:test';
import assert from 'node:assert/strict';
import tuning from '../src/data/tuning.json';
import { input } from '../src/core/input.js';
import { GROUND } from '../src/art/layout.js';
import { createHero, updateHero, onParrySuccess, wallContact, COMBO } from '../src/play/hero.js';
import { teleOf, ENEMY } from '../src/play/enemies.js';
import { createBoss, addBossStagger, hitBoss, updateBoss, BOSS } from '../src/play/bosses.js';
import { initArena, updateArena, arrowMeetsWall, arrowMeetsProp } from '../src/play/arena.js';

const DT = 1 / 60;

/** A battle object with just what hero, arena and boss code read. */
function battle(diff = 'normal', level = {}) {
  const b = {
    tun: tuning, diff: tuning.difficulty[diff], diffName: diff, level: { shelves: [], arenas: [], ...level },
    time: 0, bounds: { left: 0, right: 1200 }, enemies: [], bosses: [], arrows: [], shots: [], zones: [], fx: [], allies: [],
    boon: 0, boonOn: true, rageOn: true, stats: { headshots: 0, shots: 0 }, hitStop: 0, slowMo: null, camZoomTo: 1,
    addBoon(n) { this.boon += n; }, shake() {}, burst() {}, tink() {}, say() {}, telegraph() {}, foes: function* () {},
    headOf: () => ({ x: 0, y: 0 }), hurtHero(d) { this.hero.hp -= d; }, killEnemy() {}, damageEnemy() {}, toWorld: (x, y) => ({ x, y }),
    rng: { next: () => 0.5 }, onBossKilled() {}, view: () => ({ left: 0, right: 1200 }),
  };
  initArena(b, b.level);
  b.hero = createHero(b, { id: 'rama', stage: 'prince', start: 300 });
  b.hero.y = GROUND;
  return b;
}
const tick = (b, n = 1) => { for (let i = 0; i < n; i++) { b.time += DT; updateArena(b, DT); updateHero(b, DT); input.endTick(); } };
const reset = () => { input.releaseAll(); input.axis = 0; };

test('1. a parry press opens the parry window; a parried gold blow resets the parry and readies a full draw', () => {
  reset();
  const b = battle();
  input.press('parry'); tick(b);
  assert.ok(b.hero.parryT > 0, 'parry window open');
  assert.ok(b.hero.parryCd > 0, 'parry on cooldown');
  b.hero.airDash = 0;
  onParrySuccess(b, b.hero, 'gold');
  assert.equal(b.hero.parryCd, 0);
  assert.equal(b.hero.airDash, 1);
  assert.ok(b.hero.drawT >= tuning.bow.fullDraw, 'gold parry gives an instant full draw');
  assert.ok(b.slowMo && b.slowMo.scale < 1, 'and a moment of slow time');
  // the automatic kick is only for Story mode
  assert.equal(tuning.difficulty.story.aimAssist, true);
  assert.equal(tuning.difficulty.normal.aimAssist, false);
});

test('2. a roll in the air is one flat dash, recharged on landing; a jump against a wall kicks away from it', () => {
  reset();
  const b = battle();
  input.press('jump'); tick(b, 8);
  assert.equal(b.hero.onGround, false);
  input.axis = 1; input.press('roll'); tick(b);
  assert.ok(b.hero.airDashT > 0);
  assert.equal(Math.round(b.hero.vx), tuning.hero.airDashSpeed);
  assert.equal(b.hero.vy, 0, 'no fall during the dash');
  input.press('roll'); tick(b);
  assert.equal(b.hero.airDash, 0, 'only one dash per jump');
  input.axis = 0; tick(b, 90);
  assert.equal(b.hero.onGround, true);
  assert.equal(b.hero.airDash, 1, 'landing recharges it');
  // wall-kick off the arena's right edge
  const h = b.hero; h.x = b.bounds.right - 31; h.y = 300; h.vy = 300; h.onGround = false; h.coyote = 0; // left the ground long ago
  input.axis = 1; tick(b, 3);
  assert.equal(wallContact(b, h), 1);
  assert.ok(h.vy <= tuning.hero.wallSlideMaxVy + 1, 'sliding slows the fall');
  input.press('jump'); tick(b);
  assert.ok(h.vx < 0 && h.vy < 0, 'kicked up and away from the wall');
  reset();
});

test('3. the strike button runs a three-hit string, and the bow cancels the third with a head start', () => {
  reset();
  const b = battle();
  const hits = [];
  b.meleeHit = (h, st) => hits.push(st.name);
  const steps = [];
  for (let k = 0; k < 3; k++) { input.press('strike'); tick(b); steps.push(b.hero.comboStep); tick(b, Math.ceil((COMBO[b.hero.comboStep].startup + COMBO[b.hero.comboStep].active + 0.07) / DT)); }
  assert.deepEqual(steps, [1, 2, 3]);
  assert.ok(hits.includes('sweep') && hits.includes('rise') && hits.includes('dharma'));
  input.press('strike'); tick(b); // a fourth press starts over (the window has not closed)
  assert.equal(b.hero.comboStep, 1);
  tick(b, 30);
  input.press('strike'); tick(b); input.press('strike'); tick(b, 20); input.press('strike'); tick(b, 3);
  assert.equal(b.hero.comboStep, 3);
  input.held.draw = true; tick(b);
  assert.equal(b.hero.comboT, 0, 'the bow cancels the swing');
  assert.ok(b.hero.drawT >= 0.35, 'with a head start on the draw');
  reset();
});

test('4. a full-draw arrow into a wall becomes a foothold for a few seconds; a crumbling ledge breaks under Rama', () => {
  reset();
  const b = battle('normal', { walls: [{ x: 800, y: 200, w: 40, h: 348 }], platforms: [{ x: 200, y: 430, w: 160, crumble: true }] });
  const a = { x: 805, y: 380, vx: 1500, vy: 0, full: true, own: true, life: 2 };
  assert.equal(arrowMeetsWall(b, a), true);
  assert.equal(b.footholds.length, 1);
  assert.equal(b.footholds[0].x, 800 - 58);
  const weak = { x: 805, y: 380, vx: 1500, vy: 0, full: false, own: true, life: 2 };
  arrowMeetsWall(b, weak);
  assert.equal(b.footholds.length, 1, 'a quick shot just bounces off');
  // a low arrow past the arena's edge flies on: foes waiting out there must still be reachable
  assert.equal(arrowMeetsWall(b, { x: b.bounds.right + 20, y: GROUND - 90, vx: 1500, vy: 0, full: true, own: true, life: 2 }), false);
  const flat = battle();
  assert.equal(arrowMeetsWall(flat, { x: flat.bounds.right + 20, y: 200, vx: 1500, vy: 0, full: true, own: true, life: 2 }), false, 'and on a flat level the edge never stops arrows');
  tick(b, Math.ceil(tuning.hero.footholdLife / DT) + 2);
  assert.equal(b.footholds.length, 0, 'and it fades');
  const h = b.hero; h.x = 280; h.y = 380; h.vy = 0; h.onGround = false;
  tick(b, 30);
  assert.equal(h.y, 430, 'landed on the ledge');
  tick(b, 60);
  assert.equal(b.platforms[0].broken, true, 'it crumbled');
  tick(b, 30);
  assert.equal(h.y, GROUND, 'and he fell to the ground');
});

test('5. a shot bell stuns flyers and staggers the boss; wind bends arrows in a gust and an updraft lifts', () => {
  reset();
  const b = battle('normal', { props: [{ type: 'bell', x: 600, y: 200, r: 28 }], wind: { ax: -300, every: 8, gust: 3.5, updraft: true, x0: 250, x1: 350, lift: 2700 } });
  const flyer = { def: ENEMY.flyer, dead: false, dying: false, stun: 0, vx: 50 };
  b.enemies.push(flyer);
  const boss = createBoss(b, 'tataka', 900); b.bosses.push(boss);
  b.addStagger = (q, amt) => addBossStagger(b, q, amt);
  assert.equal(arrowMeetsProp(b, { x: 605, y: 205, vx: 1000, vy: 0 }), true);
  assert.equal(flyer.stun, 2.2);
  assert.equal(boss.stagger, 20);
  assert.equal(arrowMeetsProp(b, { x: 605, y: 205, vx: 1000, vy: 0 }), true);
  assert.equal(boss.stagger, 20, 'the bell needs time before it rings again');
  const arrow = { x: 100, y: 300, vx: 1000, vy: 0 };
  b.arrows.push(arrow); tick(b);
  assert.ok(arrow.vx < 1000, 'the gust pushes the arrow back');
  const h = b.hero; h.x = 300; h.y = 400; h.vy = 0; h.onGround = false;
  tick(b, 10);
  assert.ok(h.y < 400, 'the updraft carries Rama up');
});

test('6. telegraph colours: blows are white, heavy blows gold, jumps and dodges crimson; a shield turns arrows from the front', () => {
  assert.equal(teleOf(ENEMY.grunt.attack), 'normal');
  assert.equal(teleOf(ENEMY.brute.attack), 'gold');
  assert.equal(teleOf(ENEMY.runner.attack), 'crimson');
  assert.equal(teleOf(BOSS.tataka.moves.stomp), 'crimson');
  assert.equal(teleOf(BOSS.tataka.moves.lunge), 'gold');
  assert.equal(ENEMY.shield.blocksFront, true);
  assert.equal(ENEMY.ambusher.flank, true);
});

test('7. stagger: hits fill the bar, a full bar opens the boss and blows land 1.6x harder; Tataka leaps into the distance', () => {
  reset();
  const b = battle();
  b.bounds = { left: 0, right: 2000 };
  const boss = createBoss(b, 'tataka', 1000); b.bosses.push(boss);
  boss.state = 'idle';
  const box = { x: 0, y: 0, w: 10, h: 10, weak: true };
  const hp0 = boss.hp;
  hitBoss(b, boss, { x: 0, y: 0, dmg: 3, own: true }, box);
  const plain = hp0 - boss.hp;
  assert.ok(boss.stagger > 0, 'a hit adds stagger');
  addBossStagger(b, boss, boss.staggerMax);
  assert.equal(boss.staggerT, tuning.boss.staggerPunishTime);
  assert.equal(boss.state, 'weak');
  const hp1 = boss.hp;
  hitBoss(b, boss, { x: 0, y: 0, dmg: 3, own: true }, box);
  // weak state adds its own 1.5x on weak spots, so compare to a plain hit on a weak (but not staggered) boss
  assert.ok(Math.abs((hp1 - boss.hp) - plain * 1.5 * tuning.boss.staggerDamageMult) < 1e-9);
  // the background leap: up and away, then down on the star
  const t2 = battle(); t2.bounds = { left: 0, right: 2000 };
  const q = createBoss(t2, 'tataka', 1200); t2.bosses.push(q); q.phase = 1; q.state = 'idle'; q.t = 9;
  q.comboQueue = ['bgLeap']; q.inCombo = false;
  t2.hero.x = 700;
  updateBoss(t2, q, DT);
  assert.equal(q.plane, 'bg');
  assert.equal(hitBoss(t2, q, { x: 0, y: 0, dmg: 3, own: true }, box), false, 'arrows cannot reach it out there');
  for (let i = 0; i < 120 && q.plane === 'bg'; i++) { t2.time += DT; for (const z of t2.zones) z.t += DT; updateBoss(t2, q, DT); }
  assert.equal(q.plane, 'fg');
  assert.ok(Math.abs(q.x - 700) < 20, 'it lands where Rama stood');
  assert.ok(t2.hero.hp < t2.hero.maxHp, 'and the landing hurts if he stays');
});
