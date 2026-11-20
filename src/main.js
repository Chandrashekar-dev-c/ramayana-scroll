// Boot: fonts, save, language, the two canvases, the GPU renderer, input, the loop, then
// the title on the closed curtain.
import '@fontsource/yatra-one/latin-400.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-700.css';
import '@fontsource/alegreya-sans/latin-400-italic.css';
import { gsap } from 'gsap';
import { app, resize } from './core/app.js';
import { createLoop } from './core/loop.js';
import { initInput, input, pollGamepad } from './core/input.js';
import { save } from './core/save.js';
import { loadLang } from './core/i18n.js';
import { bus } from './core/events.js';
import { initGfx, resizeGfx, renderGfx } from './gfx/gfx.js';
import { setFigureScale, tickFigures } from './gfx/live.js';
import { setSpriteScale, clearSprites } from './art/figures.js';
import { clearBackdropCache } from './art/backdrops.js';
import { clearFrameCache } from './art/borders.js';
import { setLoading, hideLoading, showRotate, panelOpen } from './ui/dom.js';
import { openTitle } from './ui/screens.js';
import { initAudio } from './audio/music.js';

// iPhone Safari zooms on rapid taps and pinches: stop both on the game surface only.
let lastEnd = 0;
document.addEventListener('touchend', (e) => { if (e.target && e.target.id !== 'game') return; const n = Date.now(); if (n - lastEnd < 350) e.preventDefault(); lastEnd = n; }, { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));

// Tweens run on the game's own clock, so pausing the game pauses the stage too.
gsap.ticker.remove(gsap.updateRoot);
let clock = 0;

async function boot() {
  const q = new URLSearchParams(location.search);
  app.debug = q.has('debug');
  app.canvas = document.getElementById('game');
  app.glCanvas = document.getElementById('gl');
  app.ctx = app.canvas.getContext('2d');
  app.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  app.seed = (q.get('seed') ? +q.get('seed') : 1) >>> 0;
  app.paused = false;
  setLoading(0.15);
  save.load();
  if (app.debug) save.data.settings.devMode = true;
  await loadLang('en');
  app.reducedMotion = save.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  setLoading(0.35);
  try { await Promise.race([Promise.all([document.fonts.load('46px "Yatra One"'), document.fonts.load('18px "Alegreya Sans"'), document.fonts.load('italic 18px "Alegreya Sans"')]), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fonts are a nicety */ }
  setLoading(0.55);
  resize();
  await initGfx(app.glCanvas);
  setLoading(0.85);
  initInput();
  // the dialogue box and panels take taps too
  document.getElementById('dialogue').addEventListener('pointerdown', (e) => { e.preventDefault(); input.press('confirm'); });
  // sound starts on the first touch anywhere
  const unlock = () => { initAudio(); };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  const onResize = () => {
    resize(); resizeGfx();
    setSpriteScale(app.scale); setFigureScale(app.scale);
    clearBackdropCache(); clearFrameCache(); clearSprites();
    showRotate(app.portrait);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 150));
  onResize();

  app.loop = createLoop({
    update(dt) {
      app.time += dt; app.frame++;
      pollGamepad();
      if (app.portrait || !app.mode || app.paused) { input.endTick(); return; }
      if (panelOpen() && app.modeName === 'chapter') { input.endTick(); return; }
      clock += dt; gsap.updateRoot(clock);
      app.mode.update(dt);
    },
    render() {
      const ctx = app.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
      ctx.setTransform(app.scale, 0, 0, app.scale, 0, 0);
      if (app.mode) app.mode.render(ctx);
      tickFigures();
      renderGfx();
      if (app.debug) drawDebug(ctx);
      if (app.frame > 1 && !app.shown) { app.shown = true; hideLoading(); window.__ready = true; }
    },
  });
  app.loop.start();
  setLoading(1);
  document.addEventListener('visibilitychange', () => { if (document.hidden) input.releaseAll(); });
  if (q.get('chapter')) { const m = await import('./story/chapter.js'); m.startChapter(q.get('chapter')); }
  else openTitle();
  exposeTestHooks();
}

function drawDebug(ctx) {
  const st = app.loop.stats;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(app.W - 230, 690, 220, 24);
  ctx.fillStyle = '#fff'; ctx.font = '13px monospace';
  ctx.fillText(`${st.fps.toFixed(0)} fps  js ${st.scriptMs.toFixed(1)}ms  ${app.modeName}`, app.W - 224, 707);
  ctx.restore();
}

/** Hooks the smoke test uses to drive the game. */
function exposeTestHooks() {
  window.__rs = {
    app, save, bus, input, gsap,
    start: async (id) => (await import('./story/chapter.js')).startChapter(id),
    step: (n) => app.loop.stepFrames(n),
    /** Win the current fight (smoke test). */
    win: () => { const m = app.mode; if (m && m.sub && m.sub.b && !m.sub.b.outcome) { m.sub.b.outcome = 'win'; m.sub.resolve(); return true; } return false; },
    state: () => ({ mode: app.modeName, battle: !!(app.mode && app.mode.sub), astra: !!(app.mode && app.mode.astra), done: { ...save.data.done } }),
  };
}

boot().catch((e) => { console.error(e); const l = document.getElementById('loading'); if (l) l.textContent = 'Something went wrong while lighting the lamps. Please reload.'; });
