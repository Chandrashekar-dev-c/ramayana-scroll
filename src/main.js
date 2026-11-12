// Boot: fonts, save, language, canvas, input, loop, then the title screen.
import '@fontsource/yatra-one/latin-400.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-700.css';
import '@fontsource/alegreya-sans/latin-400-italic.css';
import { app, resize, setMode } from './core/app.js';
import { createLoop } from './core/loop.js';
import { initInput, input, pollGamepad } from './core/input.js';
import { save } from './core/save.js';
import { loadLang, isDraft } from './core/i18n.js';
import { bus } from './core/events.js';
import { setSpriteScale, clearSprites } from './art/figures.js';
import { clearBackdropCache } from './art/backdrops.js';
import { clearFrameCache } from './art/borders.js';
import { setLoading, hideLoading, showRotate, setDraftNote, panelOpen } from './ui/dom.js';
import { openTitle } from './ui/screens.js';

async function boot() {
  const q = new URLSearchParams(location.search);
  app.debug = q.has('debug');
  app.canvas = document.getElementById('game');
  app.ctx = app.canvas.getContext('2d', { alpha: false });
  app.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  app.seed = (q.get('seed') ? +q.get('seed') : 1) >>> 0;
  setLoading(0.15);
  save.load();
  const s = save.data.settings;
  if (q.get('lang')) s.lang = q.get('lang');
  await loadLang(s.lang || 'en');
  setDraftNote(isDraft());
  document.documentElement.style.setProperty('--text', { normal: 1, large: 1.2, xl: 1.45 }[s.textSize] || 1);
  app.reducedMotion = s.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && !save.seen('rm')) { s.reducedMotion = true; save.markSeen('rm'); }
  setLoading(0.4);
  try { await Promise.race([document.fonts.load('22px "Yatra One"'), new Promise((r) => setTimeout(r, 1200))]); await document.fonts.load('18px "Alegreya Sans"'); } catch { /* fonts are a nicety */ }
  setLoading(0.8);
  initInput();
  const onResize = () => {
    resize();
    setSpriteScale(app.scale);
    clearBackdropCache(); clearFrameCache(); clearSprites();
    showRotate(app.portrait);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 150));
  onResize();

  let frames = 0;
  app.loop = createLoop({
    update(dt) {
      app.time += dt; app.frame++;
      pollGamepad();
      if (app.portrait || !app.mode) { input.endTick(); return; }
      if (panelOpen() && app.modeName === 'chapter' && !app.mode.paused) { input.endTick(); return; }
      app.mode.update(dt);
    },
    render() {
      const ctx = app.ctx;
      ctx.setTransform(app.scale, 0, 0, app.scale, 0, 0);
      if (app.mode) app.mode.render(ctx);
      if (app.debug) drawDebug(ctx);
      if (++frames === 2) { hideLoading(); window.__ready = true; }
    },
  });
  app.loop.start();
  setLoading(1);
  document.addEventListener('visibilitychange', () => { if (document.hidden) input.releaseAll(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !app.debug) navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (q.get('chapter')) { const m = await import('./scenes/runner.js'); m.startChapter(q.get('chapter')); }
  else if (q.has('hub')) { const m = await import('./hub/hub.js'); m.openHub(); }
  else openTitle();
  exposeTestHooks();
}

function drawDebug(ctx) {
  const st = app.loop.stats;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(app.W - 210, 690, 200, 24);
  ctx.fillStyle = '#fff'; ctx.font = '13px monospace';
  ctx.fillText(`${st.fps.toFixed(0)} fps  js ${st.scriptMs.toFixed(1)}ms  ${app.modeName}`, app.W - 204, 707);
  ctx.restore();
}

/** Hooks the smoke test and the debug panel use to drive the game. */
function exposeTestHooks() {
  window.__rs = {
    app, save, bus, input,
    start: async (id, from) => (await import('./scenes/runner.js')).startChapter(id, from),
    hub: async () => (await import('./hub/hub.js')).openHub(),
    chapters: async () => (await import('./data/chapters.js')).CHAPTERS,
    step: (n) => app.loop.stepFrames(n),
    setMode,
  };
}

boot().catch((e) => { console.error(e); const l = document.getElementById('loading'); if (l) l.textContent = 'Something went wrong while grinding the colours. Please reload.'; });
