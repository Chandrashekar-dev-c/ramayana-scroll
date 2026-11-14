// Title, settings, pause, win plate, failure card and the "making of" gallery.
import { app, setMode } from '../core/app.js';
import { save, defaultSettings } from '../core/save.js';
import { t, LANGUAGES, loadLang, lang, isDraft } from '../core/i18n.js';
import { input, DEFAULT_KEYS } from '../core/input.js';
import { bus } from '../core/events.js';
import { panel, closePanel, button, el, topbar, touchControls, sealSvg, setDraftNote, hideLine } from './dom.js';
import { initAudio, applyVolumes, cue } from '../audio/audio.js';
import { PAL } from '../art/palette.js';
import { plate } from '../art/ink.js';
import { drawFrame } from '../art/borders.js';
import notes from '../data/notes.json';
import credits from '../data/credits.json';
import motifs from '../data/motifs.json';
import { CHAPTERS, nextChapter, allSeals, chapterById } from '../data/chapters.js';
import { renderSheet } from './sheet.js';
import { applyDevMode } from './devpanel.js';

const go = {
  hub: (o) => import('../hub/hub.js').then((m) => m.openHub(o)),
  chapter: (id) => import('../scenes/runner.js').then((m) => m.startChapter(id)),
};

// ---------------------------------------------------------------- title
// iPhone/iPad browsers cannot go full screen, but a home-screen icon opens without browser chrome.
function isIosBrowser() { return /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone; }

// A visible fullscreen toggle. Browsers only allow fullscreen from a tap, so this is a button
// the player presses, and it says so if the browser refuses rather than failing silently.
function fullscreenButton() {
  const canFs = !!document.documentElement.requestFullscreen;
  const label = () => (document.fullscreenElement ? t('btn.exitFull') : t('btn.fullscreen'));
  if (!canFs) return null;
  const b = button(label(), async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      b.textContent = t('btn.fullscreenNo');
      setTimeout(() => { b.textContent = label(); }, 2200);
      return;
    }
    b.textContent = label();
  }, {});
  document.addEventListener('fullscreenchange', () => { b.textContent = label(); });
  return b;
}

class TitleMode {
  constructor() { this.t = 0; }
  label() { return t('aria.title'); }
  enter() { app.loop.setMenuFps(true); topbar(null); touchControls(null); hideLine(); this.show(); }
  exit() { closePanel(); }
  show() {
    const n = nextChapter();
    const started = Object.keys(save.data.done).length > 0;
    const kids = [
      el('h1', { style: 'font-size:2.6em;margin:0' }, t('title.name')),
      el('p', {}, t('title.sub')),
      el('p', { style: 'font-style:italic' }, t('title.reverence')),
      el('p', { class: 'mini' }, t('title.disclaimer')),
    ];
    const row = el('div', { class: 'col' });
    if (started && n) row.append(button(t('btn.continue'), () => this.begin(n.id), { main: true, small: t('chapter.' + n.id + '.title') }));
    else if (!started) row.append(button(t('btn.begin'), () => this.begin(null), { main: true }));
    if (started) row.append(button(t('btn.journeyOpen'), () => this.begin('hub')));
    row.append(button(t('btn.settings'), () => openSettings({ back: () => this.show() })));
    const fs = fullscreenButton(); if (fs) row.append(fs);
    if (isIosBrowser()) row.append(button(t('btn.installIos'), () => panel([el('p', {}, t('install.ios')), button(t('btn.back'), () => closePanel(), { main: true })])));
    if (allSeals()) row.append(button(t('btn.gallery'), () => openGallery({ back: () => this.show() })));
    kids.push(row);
    if (credits.reviewers.length) kids.push(el('p', { class: 'mini' }, t('title.reviewers', { names: credits.reviewers.map((r) => r.name).join(', ') })));
    kids.push(el('p', { class: 'mini' }, t('title.madeBy')));
    panel(kids, { cls: 'title' });
  }
  begin(id) {
    initAudio(); cue('conch');
    try { if (app.isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch { /* not allowed */ }
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch { /* not supported */ }
    closePanel();
    if (id === 'hub') go.hub();
    else if (id) go.chapter(id);
    else go.hub({ intro: true });
  }
  update() { this.t += 1 / 60; input.endTick(); }
  render(ctx) {
    ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, app.W, 720);
    if (!this.wall) import('../hub/hub.js').then((m) => { this.wall = new m.Hub(); this.wall.states = { st: {}, marks: new Set() }; this.wall.cam.z = m.Hub.prototype.fitZoom.call(this.wall); this.wall.cam.x = m.WALL_W / 2; this.wall.cam.y = m.WALL_H / 2; });
    if (this.wall && this.wall.states) { ctx.save(); ctx.globalAlpha = 0.55; this.wall.render(ctx); ctx.restore(); }
    drawFrame(ctx, {});
  }
}
export function openTitle() { setMode('title', new TitleMode()); }

// ---------------------------------------------------------------- settings
export function openSettings(o = {}) {
  const s = save.data.settings;
  const commit = () => { save.commit(); applyVolumes(); document.documentElement.style.setProperty('--text', { normal: 1, large: 1.2, xl: 1.45 }[s.textSize] || 1); app.reducedMotion = s.reducedMotion; document.documentElement.classList.toggle('rm', !!s.reducedMotion); };
  const range = (key, label) => el('label', {}, label, el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key], 'aria-label': label, oninput: (e) => { s[key] = +e.target.value; commit(); } }));
  const check = (key, label) => el('label', {}, label, el('input', { type: 'checkbox', checked: s[key] ? 'checked' : false, onchange: (e) => { s[key] = e.target.checked; commit(); } }));
  const select = (key, label, opts, onChange) => { const sel = el('select', { 'aria-label': label, onchange: (e) => { s[key] = e.target.value; commit(); if (onChange) onChange(e.target.value); } }); for (const [v, l] of opts) { const op = el('option', { value: v }, l); if (s[key] === v) op.selected = true; sel.append(op); } return el('label', {}, label, sel); };
  const diffSel = el('select', { 'aria-label': t('set.difficulty'), onchange: (e) => { save.data.difficulty = e.target.value; save.commit(); } });
  for (const d of ['story', 'normal', 'hard']) { const op = el('option', { value: d }, t('diff.' + d)); if ((save.data.difficulty || 'normal') === d) op.selected = true; diffSel.append(op); }
  const langs = Object.entries(LANGUAGES).filter(([k, v]) => v.status === 'final' || app.debug || new URLSearchParams(location.search).has('lang'));
  const kids = [el('h2', {}, t('btn.settings')), el('div', { class: 'settings' },
    range('music', t('set.music')), range('sfx', t('set.sfx')), check('muted', t('set.mute')),
    select('textSize', t('set.text'), [['normal', t('set.text.normal')], ['large', t('set.text.large')], ['xl', t('set.text.xl')]]),
    check('reducedMotion', t('set.motion')), check('leftHanded', t('set.left')), check('toggleDraw', t('set.toggleDraw')),
    el('label', {}, t('set.dev'), el('input', { id: 'set-dev', type: 'checkbox', checked: s.devMode ? 'checked' : false, onchange: (e) => { s.devMode = e.target.checked; commit(); applyDevMode(); } })),
    el('label', {}, t('set.difficulty'), diffSel),
    el('label', {}, t('set.lanka'), (() => { const sel = el('select', { onchange: (e) => { s.lankaWoven = e.target.value === 'woven'; commit(); } }, el('option', { value: 'woven' }, t('set.lanka.woven')), el('option', { value: 'end' }, t('set.lanka.end'))); sel.value = s.lankaWoven === false ? 'end' : 'woven'; return sel; })()),
    langs.length > 1 ? select('lang', t('set.lang'), langs.map(([k, v]) => [k, v.name]), async (v) => { await loadLang(v); setDraftNote(isDraft()); openSettings(o); }) : null,
  ),
  el('div', { class: 'row' }, !app.isTouch ? button(t('set.keys'), () => openKeys(o)) : null, button(t('set.reset'), () => confirmReset(o)), button(t('btn.back'), () => { closePanel(); if (o.back) o.back(); }, { main: true }))];
  panel(kids);
  void lang; void defaultSettings;
}

function openKeys(o) {
  const s = save.data.settings;
  const keys = s.keys || JSON.parse(JSON.stringify(DEFAULT_KEYS));
  const rows = Object.keys(DEFAULT_KEYS).map((a) => {
    const b = button(keys[a][0], () => {
      b.textContent = t('set.pressKey');
      const h = (e) => { e.preventDefault(); keys[a] = [e.code, ...keys[a].slice(1).filter((k) => k !== e.code)]; s.keys = keys; save.commit(); window.removeEventListener('keydown', h, true); openKeys(o); };
      window.addEventListener('keydown', h, true);
    });
    return el('label', {}, t('act.' + a), b);
  });
  panel([el('h2', {}, t('set.keys')), el('div', { class: 'settings' }, rows), el('div', { class: 'row' }, button(t('set.keysDefault'), () => { delete s.keys; save.commit(); openKeys(o); }), button(t('btn.back'), () => openSettings(o), { main: true }))]);
}

function confirmReset(o) {
  panel([el('p', {}, t('set.resetAsk')), el('div', { class: 'row' }, button(t('set.resetYes'), () => { save.reset(); closePanel(); openTitle(); }), button(t('btn.back'), () => openSettings(o), { main: true }))]);
}

// ---------------------------------------------------------------- pause
export function openPause({ onResume, onRestart, chapter }) {
  const resume = () => { closePanel(); onResume(); };
  panel([
    el('h2', {}, t('chapter.' + chapter.id + '.title')),
    el('div', { class: 'col' },
      button(t('btn.resume'), resume, { main: true }),
      button(t('btn.restartCp'), () => { closePanel(); onRestart(); }),
      button(t('btn.settings'), () => openSettings({ back: () => openPause({ onResume, onRestart, chapter }) })),
      button(t('btn.journeyOpen'), () => { closePanel(); onResume(); go.hub(); }),
      button(t('btn.title'), () => { closePanel(); onResume(); openTitle(); })),
  ]);
  const esc = (e) => { if (e.code === 'Escape') { window.removeEventListener('keydown', esc); resume(); } };
  setTimeout(() => window.addEventListener('keydown', esc), 50);
}

// ---------------------------------------------------------------- win plate
export function showWin({ ch, seals, earned, stats, next }) {
  const note = notes[ch.id] || {};
  const wins = (ch.win && ch.win.length ? ch.win : [1, 2, 3].map((i) => `${ch.id}.win.${i}`)).filter((k) => t(k) !== k).map((k) => el('p', {}, t(k)));
  const sealNames = ['finish', 'gentle', 'fast'];
  const sealRow = el('div', { class: 'seals', html: sealNames.map((k) => `<span title="${t('seal.' + k + (k === 'gentle' && ch.gentle ? '.' + ch.gentle : ''))}">${sealSvg(!!seals[k])}</span>`).join('') });
  const sealText = el('p', { class: 'mini' }, sealNames.map((k) => (seals[k] ? '✓ ' : '· ') + t('seal.' + k + (k === 'gentle' && ch.gentle ? '.' + ch.gentle : ''))).join('   '));
  const kids = [el('h2', {}, t('chapter.' + ch.id + '.title')), ...wins, sealRow, sealText];
  if (stats) {
    const m = Math.floor(stats.time / 60), s = Math.floor(stats.time % 60);
    kids.push(el('div', { class: 'stats' }, el('span', {}, t('stat.kills', { n: stats.kills || 0 })), el('span', {}, t('stat.headshots', { n: stats.headshots || 0 })), el('span', {}, t('stat.time', { t: `${m}:${String(s).padStart(2, '0')}` })), el('span', {}, t('stat.hits', { n: stats.hits || 0 }))));
  }
  if (note.text) {
    const nb = el('div', { class: 'note' });
    for (const k of note.text) nb.append(el('p', {}, t(k)));
    nb.append(el('div', { class: 'src' }, t('note.source') + ' ' + note.source + (note.later ? ' · ' + t('note.later', { what: note.later }) : '')));
    kids.push(nb);
  }
  const row = el('div', { class: 'row' });
  if (next) row.append(button(t('btn.next'), () => { closePanel(); go.hub(); }, { main: true, small: t('chapter.' + next.id + '.title') }));
  row.append(button(t('btn.again'), () => { closePanel(); go.chapter(ch.id); }));
  row.append(button(t('btn.journeyOpen'), () => { closePanel(); go.hub(); }, { main: !next }));
  kids.push(row);
  panel(kids, { cls: 'win' });
  void earned;
}

// ---------------------------------------------------------------- failure card
export function showFail({ title, tip, onRetry, onSkip, onMenu }) {
  const kids = [el('h2', {}, title)];
  if (tip) kids.push(el('p', {}, tip));
  const row = el('div', { class: 'row' }, button(t('btn.retry'), () => { closePanel(); onRetry(); }, { main: true }));
  if (onSkip) row.append(button(t('btn.skipTrial'), () => { closePanel(); onSkip(); }));
  row.append(button(t('btn.journeyOpen'), () => { closePanel(); onMenu(); }));
  kids.push(row);
  panel(kids);
}

// ---------------------------------------------------------------- the making-of gallery
export function openGallery(o = {}) {
  const cv = el('canvas', { style: 'width:100%;height:auto;border:2px solid #1d1613;background:#f2e4c3' });
  const kids = [el('h2', {}, t('gallery.title')), el('p', {}, t('gallery.intro')), cv];
  const motifBox = el('div', { class: 'note' });
  for (const m of motifs) motifBox.append(el('p', {}, el('b', {}, t(m.name) + ': '), t(m.text)));
  kids.push(motifBox);
  kids.push(el('p', { class: 'mini' }, t('gallery.thanks')));
  kids.push(el('div', { class: 'row' }, button(t('btn.back'), () => { closePanel(); if (o.back) o.back(); }, { main: true })));
  panel(kids);
  requestAnimationFrame(() => renderSheet(cv, { mode: 'colour', size: 0.6, cols: 10 }));
}

export { TitleMode };
void bus; void CHAPTERS; void chapterById; void plate;
