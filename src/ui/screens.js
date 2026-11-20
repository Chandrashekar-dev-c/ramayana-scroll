// Screens: the title (painted on the closed curtain), the chapter list, pause, settings,
// the end of a chapter and a lost fight.
import { app, setMode } from '../core/app.js';
import { save } from '../core/save.js';
import { t, has } from '../core/i18n.js';
import { el, button, panel, closePanel, touchControls, topbar, hideLine, fadeOut, fadeIn } from './dom.js';
import { setScene } from '../gfx/gfx.js';
import { StageView } from '../stage/stage.js';
import { READY, CHAPTERS, isUnlocked, resumeChapter } from '../story/chapters.js';
import { initAudio, applyVolumes, setMood, cue } from '../audio/music.js';
import { gsap } from 'gsap';

const $ = (id) => document.getElementById(id);
async function play(id) { await fadeOut(400); const m = await import('../story/chapter.js'); await m.startChapter(id); fadeIn(500); }

// ---------------------------------------------------------------- title
class TitleMode {
  label() { return 'Ramayana Scroll'; }
  enter() {
    this.stage = new StageView();
    setScene(this.stage.view);
    this.stage.setCloth('court');
    this.stage.curtainOpen = 0;
    this.stage.setTitle('Ramayana', 'A Ramlila in Mithila colours');
    setMood('bala', 'calm');
    this.paint();
  }
  paint() {
    const box = $('title'); box.innerHTML = ''; box.classList.remove('hidden');
    const started = READY.some((c) => save.data.done[c.id]) || save.data.chapter;
    const go = () => { initAudio(); cue('choose'); box.classList.add('hidden'); play(resumeChapter().id); };
    box.append(
      el('div', { class: 'row' },
        button(t(started ? 'btn.continue' : 'btn.begin'), go, { main: true }),
        button(t('menu.chapters'), () => { initAudio(); openChapters(); }),
        button(t('btn.settings'), () => { initAudio(); openSettings(); }),
      ),
      el('div', { class: 'credit' }, t('title.credit')),
    );
  }
  update(dt) { this.stage.update(dt); }
  render() { this.stage.sync(); }
  resize() { this.stage.rebuild(); }
  exit() { $('title').classList.add('hidden'); this.stage.destroy(); }
}
export function openTitle() { setMode('title', new TitleMode()); }

// ---------------------------------------------------------------- chapters
export function openChapters() {
  const list = el('div', { class: 'chapters' });
  for (const c of READY) {
    const open = isUnlocked(c.id), done = save.data.done[c.id];
    list.append(button(el('span', {}, el('span', { class: 'k' }, t('kanda.' + c.kanda)), (done ? '✓ ' : '') + t(c.title)), () => { closePanel(); $('title').classList.add('hidden'); play(c.id); }, { disabled: !open, main: false }));
  }
  const coming = CHAPTERS.length - READY.length;
  panel([el('h2', {}, t('menu.chapters')), list, el('p', { class: 'mini' }, t('menu.coming', { n: coming })), el('div', { class: 'row' }, button(t('btn.close'), closePanel))]);
}

// ---------------------------------------------------------------- settings
export function openSettings(o = {}) {
  const s = save.data.settings;
  const range = (key, label) => el('label', {}, label, el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key] ?? 0.7, oninput: (e) => { s[key] = +e.target.value; applyVolumes(); save.commit(); } }));
  const check = (key, label, after) => el('label', {}, label, el('input', { type: 'checkbox', checked: s[key] ? 'checked' : null, onchange: (e) => { s[key] = e.target.checked; save.commit(); if (after) after(); } }));
  const diff = el('label', {}, t('settings.difficulty'), (() => { const sel = el('select', { onchange: (e) => { save.data.difficulty = e.target.value; save.commit(); } }); for (const d of ['story', 'normal', 'hard']) sel.append(el('option', { value: d, selected: save.data.difficulty === d ? 'selected' : null }, t('diff.' + d))); return sel; })());
  panel([
    el('h2', {}, t('btn.settings')),
    el('div', { class: 'settings' },
      range('music', t('settings.music')), range('sfx', t('settings.sfx')), diff,
      check('leftHanded', t('settings.leftHanded')), check('reducedMotion', t('settings.reducedMotion')),
      check('devMode', t('settings.unlockAll')),
    ),
    el('div', { class: 'row' },
      button(t('settings.erase'), () => { if (confirm(t('settings.eraseAsk'))) { save.reset(); closePanel(); openTitle(); } }),
      button(t('btn.close'), () => { closePanel(); if (o.onClose) o.onClose(); }, { main: true })),
  ]);
}

// ---------------------------------------------------------------- pause
export function openPause({ onResume, onRestart }) {
  const resume = () => { closePanel(); onResume(); };
  panel([
    el('h2', {}, t('btn.pause')),
    el('div', { class: 'col' },
      button(t('btn.resume'), resume, { main: true }),
      button(t('btn.restartCp'), () => { closePanel(); onRestart(); }),
      button(t('btn.settings'), () => openSettings({ onClose: () => openPause({ onResume, onRestart }) })),
      button(t('btn.title'), async () => { closePanel(); app.paused = false; hideLine(); topbar(null); touchControls(null); await fadeOut(300); openTitle(); fadeIn(400); }),
    ),
  ], { onClose: null });
}

// ---------------------------------------------------------------- end of a chapter
export function showWin({ ch, next }) {
  const note = has(ch.note) ? t(ch.note) : '';
  const src = ch.source ? `${ch.source.text}, ${ch.source.kanda} Kanda, sargas ${ch.source.sargas}` : '';
  panel([
    el('h2', {}, t(ch.title)),
    ...(ch.win || []).map((k) => el('p', {}, t(k))),
    note ? el('div', { class: 'note' }, ...note.split('\n').map((p) => el('p', {}, p)), el('div', { class: 'src' }, src)) : null,
    el('div', { class: 'row' },
      next ? button(t('btn.next'), () => { closePanel(); play(next.id); }, { main: true, small: t(next.title) }) : el('p', { style: 'font-style:italic' }, t('menu.sliceEnd')),
      button(t('menu.chapters'), () => { openChapters(); }),
      button(t('btn.title'), async () => { closePanel(); await fadeOut(300); openTitle(); fadeIn(400); })),
  ].filter(Boolean));
}

// ---------------------------------------------------------------- a lost fight
export function showFail({ title, tip, onRetry }) {
  panel([
    el('h2', {}, title),
    tip ? el('p', {}, tip) : null,
    el('div', { class: 'row' },
      button(t('btn.retry'), () => { closePanel(); onRetry(); }, { main: true }),
      button(t('btn.title'), async () => { closePanel(); topbar(null); touchControls(null); await fadeOut(300); openTitle(); fadeIn(400); })),
  ].filter(Boolean));
}

export { gsap };
