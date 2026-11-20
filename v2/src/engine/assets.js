// Asset registry: the game refers to images by id (content/assets.json), never by file path,
// so swapping a stand-in for final art is a one-line change in the JSON.
import manifest from '../../content/assets.json';

export const ASSETS = manifest;

/** Queue every image in the manifest on a scene's loader. */
export function loadAll(scene) {
  for (const [id, a] of Object.entries(manifest.images)) scene.load.image(id, a.file);
}

/** Way the source image faces; sprites flip to face the other way. */
export const facing = id => manifest.images[id]?.facing ?? 'right';

/**
 * Point a sprite in a direction ('left' | 'right'), whatever way its image was drawn.
 * Sprites keep their texture's own facing in setData('srcFacing').
 */
export function face(sprite, dir) {
  sprite.setFlipX(facing(sprite.texture.key) !== dir);
  return sprite;
}

/** Scale a character sprite so it stands `height` (1.0 = average man) tall on screen. */
export function sizeFor(sprite, height, humanPx) {
  sprite.setScale((height * humanPx) / sprite.height);
  return sprite;
}
