// The GPU renderer. One PixiJS application draws the painted world; the ink canvas on top
// carries the hand-drawn overlays. The stage root is scaled so world units match the
// logical screen (720 high), exactly like the ink canvas.
import { Application, Container, TilingSprite, Sprite } from 'pixi.js';
import { app } from '../core/app.js';
import { noiseTexture, vignetteTexture } from './tex.js';

export const gfx = {
  /** @type {Application} */ pixi: null,
  /** @type {Container} */ root: null,
  /** @type {Container} the active mode draws here */ scene: null,
  /** @type {Container} paper grain and vignette, above everything */ finish: null,
  grain: null,
  vignette: null,
  ready: false,
};

export async function initGfx(canvas) {
  const pixi = new Application();
  await pixi.init({
    canvas, autoStart: false, antialias: true, backgroundColor: 0x1d1613,
    resolution: app.dpr, autoDensity: false, preference: 'webgl', powerPreference: 'high-performance',
    width: app.cssW, height: app.cssH,
  });
  gfx.pixi = pixi;
  gfx.root = new Container();
  gfx.scene = new Container();
  gfx.finish = new Container();
  gfx.root.addChild(gfx.scene, gfx.finish);
  pixi.stage.addChild(gfx.root);
  // the wall itself: a fine grain over the whole picture, so colour sits on a surface
  gfx.grain = new TilingSprite({ texture: noiseTexture(), width: 4000, height: 720 });
  gfx.grain.blendMode = 'multiply'; gfx.grain.alpha = 0.32;
  gfx.vignette = new Sprite(vignetteTexture());
  gfx.vignette.alpha = 0.55;
  gfx.finish.addChild(gfx.grain, gfx.vignette);
  gfx.ready = true;
  resizeGfx();
  return pixi;
}

export function resizeGfx() {
  if (!gfx.pixi) return;
  gfx.pixi.renderer.resolution = app.dpr;
  gfx.pixi.renderer.resize(app.cssW, app.cssH);
  gfx.root.scale.set(app.cssH / 720);
  gfx.grain.width = app.W; gfx.vignette.width = app.W; gfx.vignette.height = 720;
}

/** Swap what the GPU shows. The old content is only detached: its owner destroys it. */
export function setScene(container, o = {}) {
  gfx.scene.removeChildren();
  if (container) gfx.scene.addChild(container);
  gfx.vignette.alpha = o.vignette ?? 0.55;
  gfx.grain.alpha = o.grain ?? 0.32;
}

export function renderGfx() { if (gfx.ready) gfx.pixi.renderer.render(gfx.pixi.stage); }
