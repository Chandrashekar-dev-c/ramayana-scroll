#!/usr/bin/env node
// Builds the image-generation manifest for every character from the game's own design data.
//
//   node tools/art/build-art-prompts.mjs
//
// Inputs:  src/data/characters.json   (the design data the game already uses)
//          tools/art/identity.json     (who each character is; tier A/B/C)
// Output:  art/prompts.json            (one entry per image, stable ids, paths, rig contract)
//
// Re-run whenever a character is added or changed. Each asset carries a promptHash, so a
// generator only needs to redo images whose hash changed (see art/README.md).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('../../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));
const characters = read('src/data/characters.json');
const identity = read('tools/art/identity.json');
const en = read('src/i18n/en.json');

const MANIFEST_VERSION = 1;

// ---------------------------------------------------------------- shared style (never edit per asset)
const STYLE = 'STYLE: traditional Mithila (Madhubani) painting from Bihar, in the manner of old village wall paintings, hand-painted with natural pigments: lampblack, indigo, turmeric yellow, saffron, madder red, leaf green, ochre and terracotta. Bold black double outlines on every shape, flat colour fills filled with fine hand-drawn patterns (lines, dots, small triangles, lotus and fish motifs), slight pigment texture, no photographic shading, no gradients, no glow, no 3D rendering. Figures in strict side profile with one large almond-shaped eye, stylised elongated bodies, ornamented clothing. Reverent, dignified, storybook clarity. No text, no letters, no signature, no watermark.';
const NEGATIVE = 'photorealistic, 3D render, anime, cartoon, film still, modern digital art, gradient shading, glow, lens flare, blurry, extra fingers, extra limbs, fused hands, deformed face, both eyes visible in profile, text, letters, watermark, signature, cropped figure, cast shadow on background, floor, scenery';
const BG = 'Background: one flat, perfectly uniform solid magenta (#FF00FF) colour filling the whole image, no texture, no floor, no shadow, nothing else.';

// ---------------------------------------------------------------- vocabulary: data codes -> words
const humanize = s => String(s).replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase();
const word = (map, k) => (k == null ? null : map[k] ?? humanize(k));

const PIGMENT = {
  indigo: 'deep indigo', indigoLight: 'light indigo-blue', gold: 'gold', turmeric: 'turmeric yellow', white: 'rice-paste white',
  leaf: 'leaf green', green: 'dark green', madder: 'deep madder red', brown: 'brown', saffron: 'saffron', pink: 'lotus pink',
  river: 'river blue', earth: 'earth brown', orange: 'bright orange', black: 'lampblack', storm: 'storm grey-blue',
  deepBlue: 'midnight blue', ochre: 'ochre', iron: 'iron grey', grey: 'ash grey', terracotta: 'terracotta',
  rakshasa: 'deep green-black', rakshasaLight: 'dark green-grey', skin: 'warm golden-brown', skinPale: 'pale golden',
  skinDark: 'dark brown', stone: 'stone grey',
};
const BODY = {
  human: 'a human figure',
  monkey: 'a vanara: an upright monkey-person with a monkey face, fur and a long curling tail, standing on two legs',
  bear: 'an upright bear-person with a bear face and shaggy fur, standing on two legs',
  bird: 'a giant bird drawn in Mithila style, with large patterned wings, standing on its two feet',
  tenHeads: 'a figure with ten crowned heads in a row side by side across the shoulders, the central head largest, all in profile facing the same way',
};
const STANCE = { upright: 'standing upright', forward: 'leaning slightly forward, alert', bowed: 'head gently bowed', heavy: 'heavy, weighty posture', proud: 'chest out, proud and commanding', stooped: 'stooped with age', anxious: 'tense and anxious' };
const WALK = { steady: 'walking steadily', stride: 'walking with a long purposeful stride', glide: 'gliding gracefully', lumber: 'lumbering with a heavy step', proud: 'striding proudly', stoop: 'walking slowly, stooped', hop: 'hopping forward', anxious: 'hurrying anxiously' };
const EYE = { long: 'long almond eye', wide: 'wide staring eye', round: 'round eye', narrow: 'narrow piercing eye', sleepy: 'heavy-lidded sleepy eye', closed: 'closed eye (blind)' };
const BROW = { soft: 'soft brows', heavy: 'heavy brows', arched: 'gracefully arched brows' };
const BEARD = { white: 'white beard', long: 'long flowing beard' };
const TILAK = { vaishnava: 'Vaishnava tilak (vertical U mark) on the forehead', shaiva: 'Shaiva tilak (three horizontal ash lines) on the forehead', dot: 'small red bindi on the forehead' };
const HEAD = {
  tallCrown: 'tall ornate golden crown', tallestCrown: 'very tall magnificent royal crown', lowCrown: 'low golden crown', veil: 'a veil over the hair',
  jataKnot: 'matted hair tied in a topknot', tallJata: 'matted hair piled high in an ascetic topknot', heavyCrown: 'heavy jewelled crown',
  queenCrown: "queen's crown", bun: 'hair in a bun', mattedCrown: 'matted hair piled into a crown', topknot: 'hair in a topknot',
  headband: 'a simple headband', none: 'bare head', tenCrowns: 'a golden crown on each of the ten heads', pearlCrown: 'crown strung with pearls',
  horns2: 'two horns', horns1: 'a single horn', spikeCrown: 'spiked dark crown', flowerBun: 'hair in a bun decorated with forest flowers',
  tuftedEars: 'tufted ears', wildHair: 'wild long black hair flying out', turban: 'a simple turban', threeHeads: 'three heads side by side',
  headless: 'no head: a face set in the middle of the belly', serpentHood: 'a hood of serpent heads rising behind the head', shellCrown: 'crown of shells and coral',
};
const GARMENT = { dhoti: 'dhoti', sari: 'sari', robe: 'ascetic robe and upper cloth', royal: 'rich royal garments', bare: 'bare torso with a waist cloth', none: 'no clothing beyond its natural feathers or fur', loin: 'short loincloth', fur: 'fur garment', armour: 'battle armour', bark: 'bark-cloth garment of a forest exile' };
const JEWELS = { princely: 'princely gold jewellery (earrings, necklaces, armlets, anklets)', full: 'full royal jewellery', none: 'no jewellery' };
const SIGNATURE = {
  kodanda: 'carries the Kodanda, a tall curved bow, and a quiver of arrows', bowLeft: 'holds a bow in his left hand, quiver on his back', flower: 'holds a flower',
  sandals: "carries Rama's wooden sandals on his head", spear: 'carries a spear', parasol: 'carries a royal parasol', lamp: 'holds an oil lamp', brooch: 'wears a large brooch',
  waterPot: 'carries a water pot', staff: 'holds a wooden staff', bowJata: 'holds a wooden staff', kamandalu: 'carries an ascetic water pot (kamandalu)', plough: 'holds a golden plough',
  none: null, oar: 'holds a boat oar', basket: 'carries a basket of berries', beak: 'great hooked beak', mace: 'carries a large mace (gada)', garland: 'holds a flower garland',
  necklace: 'wears a heavy necklace', armlets: 'wears heavy armlets', beardStaff: 'leans on a staff', stone: 'carries a large stone', chandrahasa: 'holds the Chandrahasa, a curved crescent sword',
  foldedQueen: 'hands folded', giantSpear: 'carries a giant spear', bowCloud: 'holds a dark bow wreathed in cloud', foldedHands: 'hands folded in respect', deerEars: 'deer ears',
  firePot: 'holds a fire pot', boneNecklace: 'necklace of bones and small skulls', bellSpear: 'spear hung with bells', kharaSword: 'holds a broad sword', staffScroll: 'holds a staff and a palm-leaf scroll',
  dreamLamp: 'holds a small lamp', axe: 'carries a great battle axe (parashu)', whipReins: "holds a charioteer's whip and reins", staffPlain: 'holds a plain staff', staffPlain2: 'holds a plain staff',
  jewelBox: 'holds a jewel box', pitcher: 'carries a water pitcher', rosary: 'holds a rosary of beads', fireBowl: 'holds a bowl of sacred fire', agastyaBow: 'holds a divine bow',
  ironClub: 'carries an iron club', trident: 'carries a trident', longArms: 'immensely long arms reaching to the ground', wingless: 'burnt, featherless wing stumps',
  fruitBowl: 'carries a bowl of fruit', gateKey: 'holds a large gate key', akshaBow: 'holds a small bow', garudaBeak: 'great golden beak', herbBundle: 'carries a bundle of herbs',
  reinsGold: 'holds golden reins', conch: 'holds a conch shell', rakClub: 'carries a club', lantern: 'carries a lantern', whisk: 'holds a royal fly-whisk', lotusHand: 'holds a lotus',
};
const PATTERN_FALLBACK = p => `${humanize(p)} pattern`;
const PATTERN = {
  lotusRow: 'a repeating row of small lotus motifs', zigzag: 'zigzag pattern', flowerDots: 'small flowers and dots', singleBorder: 'a single plain border',
  leafSprays: 'sprays of leaves', royalChecks: 'royal check pattern', waveLines: 'wavy lines', flames: 'flame motifs', vine: 'climbing vine pattern',
  coiledSpiral: 'coiled spirals', fireTriangles: 'rows of small flame-triangles', sunRays: 'sun-ray pattern', grainStalks: 'grain stalks', crackedStone: 'cracked-stone pattern',
  fishScale: 'fish-scale pattern', berryDots: 'berry dots', featherChevrons: 'feather chevrons', flameRows: 'rows of flames', sunDiscs: 'sun discs', smallChecks: 'small checks',
  furStrokes: 'fine fur strokes', stoneBlocks: 'stone-block pattern', peacockEyes: 'peacock-eye motifs', moonCrescents: 'moon crescents', mountainTriangles: 'mountain triangles',
  cloudSpirals: 'cloud spirals', fanShapes: 'fan shapes', deerSpots: 'deer spots', batRibs: 'bat-wing ribs', crackedEarth: 'cracked-earth pattern', rustStripes: 'rust stripes',
  scaleArmour: 'scale-armour pattern', fadedFlames: 'faded flames', dreamSpirals: 'dreamy spirals', seaFoam: 'sea-foam and wave pattern', drops: 'falling-drop pattern',
};

const size = (h, w) => {
  const H = h < 0.8 ? 'small' : h < 0.95 ? 'short' : h < 1.05 ? 'average height' : h < 1.2 ? 'tall' : h < 1.6 ? 'very tall' : h < 2.2 ? 'giant' : 'colossal, many times the height of a man';
  const W = w < 0.85 ? 'slender' : w < 1.05 ? 'medium build' : w < 1.3 ? 'sturdy' : 'massive and broad';
  return `${H}, ${W}`;
};
const age = a => (a == null ? null : a <= 0.5 ? 'very young' : a <= 0.6 ? 'young' : a <= 0.8 ? 'youthful' : 'aged');

// ---------------------------------------------------------------- rig contract (part names the game code expects)
const RIG = {
  human: ['head', 'torso', 'upperArmNear', 'foreArmNear', 'upperArmFar', 'foreArmFar', 'waist', 'thighNear', 'shinNear', 'thighFar', 'shinFar'],
  monkey: ['head', 'torso', 'upperArmNear', 'foreArmNear', 'upperArmFar', 'foreArmFar', 'waist', 'thighNear', 'shinNear', 'thighFar', 'shinFar', 'tailBase', 'tailTip'],
  bear: ['head', 'torso', 'upperArmNear', 'foreArmNear', 'upperArmFar', 'foreArmFar', 'waist', 'thighNear', 'shinNear', 'thighFar', 'shinFar'],
  bird: ['head', 'neck', 'body', 'wingNear', 'wingFar', 'tail', 'legNear', 'legFar'],
  tenHeads: ['headCentre', 'headsNear', 'headsFar', 'torso', 'upperArmNear', 'foreArmNear', 'upperArmFar', 'foreArmFar', 'waist', 'thighNear', 'shinNear', 'thighFar', 'shinFar'],
};
const RASAS = {
  shanta: 'serene and calm, eye gently open, relaxed brow, lips closed',
  shringara: 'tender and warm, eye softened, a faint gentle smile',
  hasya: 'bright open smile, eye crinkled with happiness',
  karuna: 'grief, eye lowered and glistening with a tear, brows drawn up in the middle, mouth turned down',
  raudra: 'fury, eye wide and fixed, brows drawn hard down, jaw set',
  veera: 'resolute and fearless, steady forward gaze, firm closed lips, chin raised',
  bhayanaka: 'alarm and dread, eye wide, brows raised, lips parted',
  adbhuta: 'astonished awe, eye wide and bright, brows lifted, mouth slightly open',
  bibhatsa: 'revulsion, eye narrowed, brow creased, lip curled slightly',
};
const RASA_SET = { A: Object.keys(RASAS), B: ['shanta', 'raudra', 'karuna'], C: [] };

// Composition rules the code relies on. Also stated inside every prompt.
const CONVENTIONS = {
  facing: 'right',
  mirroredInCode: true,
  background: '#FF00FF',
  figureBox: { topPct: 6, baselinePct: 92, centredX: true },
  headBox: { crownTopPct: 8, neckBaseAtBottomCentre: true },
  scaleSource: 'meta.height (relative to an average man = 1.0); every figure fills the same box, the game scales by height',
  pivot: 'feet centre on the baseline (figures), neck base (heads)',
};

// ---------------------------------------------------------------- per character
const merge = (base, stage) => {
  const c = structuredClone(base);
  for (const [k, v] of Object.entries(stage || {})) {
    if (k === 'height' || k === 'width') c.build = { ...c.build, [k]: v };
    else if (k === 'colour') c.colour = { ...c.colour, ...v };
    else c[k] = v;
  }
  return c;
};

function describe(c, idn) {
  const f = c.face || {};
  const bits = [
    `${size(c.build.height, c.build.width)}`,
    age(f.age),
    c.body === 'bird' ? `${word(PIGMENT, c.skin)} plumage` : c.body === 'monkey' || c.body === 'bear' ? `${word(PIGMENT, c.skin)} fur and face` : `${word(PIGMENT, c.skin)} skin`,
    word(EYE, f.eye), word(BROW, f.brow),
    f.beard ? word(BEARD, f.beard) : (c.body === 'human' || c.body === 'tenHeads') && !c.female && !f.moustache && c.headdress !== 'headless' ? 'clean-shaven' : null,
    f.moustache ? 'curled moustache' : null,
    f.fangs ? 'fangs' : null,
    f.tilak ? word(TILAK, f.tilak) : null,
    word(HEAD, c.headdress),
    c.garment === 'bare' ? `bare torso, ${word(PIGMENT, c.colour.main)} waist cloth with ${word(PIGMENT, c.colour.accent)} border and ${PATTERN[c.pattern] ?? PATTERN_FALLBACK(c.pattern)}`
      : c.garment && c.garment !== 'none' ? `${word(PIGMENT, c.colour.main)} ${word(GARMENT, c.garment)} with ${word(PIGMENT, c.colour.accent)} borders and ${PATTERN[c.pattern] ?? PATTERN_FALLBACK(c.pattern)}` : `markings in ${word(PIGMENT, c.colour.main)} and ${word(PIGMENT, c.colour.accent)} with ${PATTERN[c.pattern] ?? PATTERN_FALLBACK(c.pattern)}`,
    c.uttariya ? `${word(PIGMENT, c.uttariya.main)} upper cloth with ${word(PIGMENT, c.uttariya.border)} border` : null,
    c.jewels ? word(JEWELS, c.jewels) : null,
    c.wings ? 'great patterned wings' : null,
    c.signature && SIGNATURE[c.signature] !== null ? word(SIGNATURE, c.signature) : null,
  ].filter(Boolean);
  const who = c.female ? 'female' : null;
  return { body: BODY[c.body] ?? humanize(c.body), traits: bits.join(', '), female: who };
}

const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 10);
const assets = [];
const add = a => { a.promptHash = hash(a.prompt + a.aspectRatio + a.size); assets.push(a); };

const missing = [];
for (const base of characters) {
  const idn = identity[base.id];
  if (!idn) { missing.push(base.id); continue; }
  const name = en[`name.${base.id}`] ?? base.id;
  const stageEntries = base.stages ? Object.entries(base.stages).filter(([, s]) => !s.ghost) : [['default', {}]];

  for (const [stage, stageData] of stageEntries) {
    const c = merge(base, stageData);
    const d = describe(c, idn);
    const rigKey = RIG[c.body] ? c.body : 'human';
    const dir = `art/raw/characters/${base.id}/${stage}`;
    const label = stage === 'default' ? name : `${name} (${stage})`;
    const stageNote = stage === 'default' ? '' : ` Shown in the ${stage} stage of the story.`;
    const subject = `${idn.who}.${stageNote} Appearance: ${d.body}${d.female ? ', female' : ''}, ${d.traits}.`;
    const facing = 'All figures face RIGHT in strict side profile.';
    const frame = 'Each figure is whole: top of head or crown near the top edge, feet resting on one shared level ground line near the bottom edge, nothing cropped, nothing overlapping.';
    const crowd = idn.tier === 'C';
    const meta = { character: base.id, name, stage, tier: idn.tier, body: c.body, height: c.build.height, width: c.build.width };
    const sheetId = `char.${base.id}.${stage}.sheet`;

    add({
      id: sheetId, kind: 'sheet', ...meta, file: `${dir}/sheet.png`, aspectRatio: '16:9', size: '2K', dependsOn: [], references: ['style:reference-frame'],
      prompt: crowd
        ? `Character design sheet: three different individuals of the same kind, ${idn.who}, side by side, each with a slightly different face, build and garment colour but the same costume type. ${facing} ${frame} Base appearance: ${d.body}, ${d.traits}. ${BG}\n${STYLE}`
        : `Character design sheet of ${label}, the same figure three times side by side: (1) ${word(STANCE, c.build.stance)}, at rest, (2) ${word(WALK, c.walk)}, mid-step, (3) a characteristic action pose. ${subject} ${facing} ${frame} ${BG}\n${STYLE}`,
    });
    add({
      id: `char.${base.id}.${stage}.rig`, kind: 'rig', ...meta, file: `${dir}/rig.png`, aspectRatio: rigKey === 'bird' || rigKey === 'tenHeads' ? '1:1' : '3:4', size: '2K',
      dependsOn: [sheetId], references: [sheetId], rigParts: RIG[rigKey],
      prompt: `${label}, exactly as in the attached character sheet, one single figure in a neutral rig pose for cut-out animation: strict side profile facing RIGHT, ${rigKey === 'bird' ? 'wings half open and held away from the body, legs straight, tail spread' : 'arms hanging slightly away from the body, legs slightly apart, every limb fully visible'}, nothing overlapping, held props removed. The figure fills the frame from near the top edge to a level ground line near the bottom edge, centred. ${BG}\n${STYLE}`,
    });
    for (const rasa of c.headdress === 'headless' ? [] : RASA_SET[idn.tier]) {
      add({
        id: `char.${base.id}.${stage}.head.${rasa}`, kind: 'head', rasa, ...meta, file: `${dir}/head-${rasa}.png`, aspectRatio: '1:1', size: '2K',
        dependsOn: [sheetId], references: [sheetId],
        prompt: `${c.body === 'tenHeads' ? 'The central head and crown' : 'Head and headdress'} of ${label}, exactly as in the attached character sheet, strict side profile facing RIGHT, from the top of the headdress to the base of the neck, centred, the neck base touching the bottom centre of the image, same size and position in every expression. Expression: ${RASAS[rasa]}. The emotion is shown through the eye, brow and mouth, in the restrained style of traditional Mithila painting. ${BG}\n${STYLE}`,
      });
    }
    if (c.signature && SIGNATURE[c.signature] && !['beak', 'garudaBeak', 'longArms', 'wingless', 'deerEars', 'necklace', 'armlets', 'brooch', 'boneNecklace', 'foldedHands', 'foldedQueen'].includes(c.signature)) {
      add({
        id: `char.${base.id}.${stage}.prop`, kind: 'prop', ...meta, file: `${dir}/prop.png`, aspectRatio: '16:9', size: '2K', dependsOn: [sheetId], references: [sheetId],
        prompt: `Only the object that ${label} carries in the attached character sheet (${label} ${word(SIGNATURE, c.signature).replace(/^(carries|holds|wears) /, '$1 ')}), shown alone, whole and uncropped, laid horizontally and centred, no hands or figure. ${BG}\n${STYLE}`,
      });
    }
  }
}

if (missing.length) { console.error(`No identity entry for: ${missing.join(', ')} (add them to tools/art/identity.json)`); process.exit(1); }

const counts = assets.reduce((m, a) => ((m[a.kind] = (m[a.kind] || 0) + 1), m), {});
const out = {
  manifestVersion: MANIFEST_VERSION,
  generatedFrom: ['src/data/characters.json', 'tools/art/identity.json'],
  conventions: CONVENTIONS,
  style: STYLE,
  negativePrompt: NEGATIVE,
  styleReferences: { 'style:reference-frame': 'art/reference/tataka-frame.png' },
  order: ['sheet', 'rig', 'head', 'prop'],
  counts: { total: assets.length, ...counts },
  assets,
};
mkdirSync(new URL('art/', ROOT), { recursive: true });
writeFileSync(new URL('art/prompts.json', ROOT), JSON.stringify(out, null, 2) + '\n');
// JSONL, one asset per line: easy to feed to batch tools.
writeFileSync(new URL('art/prompts.jsonl', ROOT), assets.map(a => JSON.stringify(a)).join('\n') + '\n');
console.log(`art/prompts.json: ${assets.length} images for ${characters.length} characters`, counts);
