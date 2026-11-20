// Asset registry: the game refers to images by id, never by file path. Ids come from
// content/assets.json (stand-ins) and every content/art/*.assets.json written by the art importer;
// imported art overrides a stand-in with the same id. Code asks for a pose or a piece by name and
// falls back gracefully when that image does not exist yet.
import base from '../../content/assets.json';

const imported = import.meta.glob('../../content/art/*.assets.json', { eager: true, import: 'default' });
const images = { ...base.images };
for (const m of Object.values(imported)) Object.assign(images, m.images);

export const ASSETS = { ...base, images };

/** Queue every image on a scene's loader. */
export function loadAll(scene) {
  for (const [id, a] of Object.entries(images)) scene.load.image(id, a.file);
}

/** Way the source image faces; sprites flip to face the other way. */
export const facing = id => images[id]?.facing ?? 'right';
/** Height of this pose relative to the character standing (1 = upright). */
export const ratio = id => images[id]?.ratio ?? 1;

/** The first of these texture keys that exists. */
export function pick(scene, ...keys) {
  for (const k of keys.flat()) if (k && scene.textures.exists(k)) return k;
  return null;
}

/** All existing variants `${prefix}.1`, `.2`, … (or just `prefix` if there are none). */
export function variants(scene, prefix) {
  const out = [];
  for (let i = 1; scene.textures.exists(`${prefix}.${i}`); i++) out.push(`${prefix}.${i}`);
  return out.length ? out : scene.textures.exists(prefix) ? [prefix] : [];
}

/** Point a sprite in a direction ('left' | 'right'), whatever way its image was drawn. */
export function face(sprite, dir) {
  sprite.setFlipX(facing(sprite.texture.key) !== dir);
  return sprite;
}

/** Scale a character sprite so it stands `height` (1.0 = average man) tall, allowing for its pose. */
export function sizeFor(sprite, height, humanPx) {
  sprite.setScale((height * ratio(sprite.texture.key) * humanPx) / sprite.height);
  return sprite;
}

/** Fallbacks: when a pose has no image yet, use the nearest one that does. */
const FALLBACK = {
  walk2: ['walk', 'stand'], walk: ['stand'], jump: ['stand'], roll: ['stand'], hurt: ['stand'],
  draw1: ['draw'], drawUp: ['draw'], release: ['draw'], draw: ['attack', 'stand'],
  kneel: ['stand'], namaste: ['stand'], hesitate: ['stand'], listen: ['stand'], point: ['stand'], bless: ['stand'],
  raise: ['walk'], slam: ['stand'], stride: ['walk'], summon: ['attack'], lunge: ['attack'], rise: ['attack'],
  dazed: ['stand'], struck: ['attack', 'stand'], topple: ['stand'], lie: ['stand'],
};

/** Texture key for a character's pose: `char.<id>.<stage>.<pose>`, with fallbacks. */
export function poseKey(scene, charKey, pose) {
  const chain = [pose, ...(FALLBACK[pose] ?? [])];
  return pick(scene, chain.map(p => `${charKey}.${p}`)) ?? `${charKey}.stand`;
}

/** Set a character sprite to a pose and size it. */
export function setPose(sprite, charKey, pose, height, humanPx, dir) {
  const key = poseKey(sprite.scene, charKey, pose);
  if (sprite.texture.key !== key) sprite.setTexture(key);
  sizeFor(sprite, height, humanPx);
  if (dir) face(sprite, dir);
  return sprite;
}
