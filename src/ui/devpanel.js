// Developer mode. Turned on from Settings ("Developer mode"); shows a small DEV button
// that opens this panel. Remove the setting before release (see README).
import { app } from '../core/app.js';
import { save } from '../core/save.js';
import { t } from '../core/i18n.js';
import { panel, closePanel, button, el, withGrinding } from './dom.js';

/** Live developer switches, read by the battle and the loop. */
export const dev = { god: false, hitboxes: false, slow: 1, fps: true };
app.dev = dev;

let fab = null;

export function applyDevMode() {
  const on = !!save.data.settings.devMode;
  app.debug = on && dev.fps;
  if (!on) { dev.god = false; dev.hitboxes = false; dev.slow = 1; if (app.loop) app.loop.setSlow(1); }
  if (on && !fab) {
    fab = el('button', { class: 'btn devfab', type: 'button', 'aria-label': 'Developer panel', onclick: (e) => { e.stopPropagation(); openDevPanel(); } }, 'DEV');
    document.getElementById('ui').append(fab);
  }
  if (fab) fab.classList.toggle('hidden', !on);
}

const go = {
  chapter: (id) => withGrinding(() => import('../scenes/runner.js').then((m) => m.startChapter(id))),
  hub: () => withGrinding(() => import('../hub/hub.js').then((m) => m.openHub())),
};

export async function openDevPanel() {
  const { CHAPTERS } = await import('../data/chapters.js');
  const list = CHAPTERS.filter((c) => c.playable !== false);
  const sel = el('select', { id: 'dev-chapter', 'aria-label': 'Chapter' });
  for (const c of list) { const o = el('option', { value: c.id }, `${c.n}. ${t('chapter.' + c.id + '.title')}`); if (save.data.chapter === c.id) o.selected = true; sel.append(o); }
  const diff = el('select', { id: 'dev-diff', 'aria-label': 'Difficulty', onchange: (e) => { save.data.difficulty = e.target.value; save.commit(); } });
  for (const d of ['story', 'normal', 'hard']) { const o = el('option', { value: d }, d); if ((save.data.difficulty || 'normal') === d) o.selected = true; diff.append(o); }
  const toggle = (id, label, key) => el('label', {}, label, el('input', { id, type: 'checkbox', checked: dev[key] ? 'checked' : false, onchange: (e) => { dev[key] = e.target.checked; if (key === 'fps') app.debug = dev.fps; } }));
  const slow = el('select', { id: 'dev-slow', 'aria-label': 'Game speed', onchange: (e) => { dev.slow = +e.target.value; app.loop.setSlow(dev.slow); } });
  for (const v of [0.25, 0.5, 1, 2]) { const o = el('option', { value: v }, v + '×'); if (dev.slow === v) o.selected = true; slow.append(o); }
  const inBattle = () => app.modeName === 'chapter' && app.mode.sub && app.mode.sub.kind === 'battle';
  const msg = el('p', { class: 'mini', role: 'status' }, 'Developer tools. Turn off in Settings.');
  panel([
    el('h2', {}, 'Developer'),
    el('div', { class: 'settings' },
      el('label', {}, 'Chapter', sel),
      el('div', { class: 'row' },
        button('Play chapter', () => { closePanel(); go.chapter(sel.value); }, { main: true }),
        button('Open the wall', () => { closePanel(); go.hub(); })),
      el('label', {}, 'Difficulty', diff),
      el('label', {}, 'Game speed', slow),
      toggle('dev-god', 'God mode (no damage)', 'god'),
      toggle('dev-hit', 'Show hitboxes', 'hitboxes'),
      toggle('dev-fps', 'Show frame rate', 'fps')),
    el('div', { class: 'row' },
      button('Win this battle', () => { if (inBattle()) { app.mode.sub.b.outcome = 'win'; closePanel(); } else msg.textContent = 'Not in a battle.'; }),
      button('Skip this beat', () => { if (app.modeName === 'chapter') { closePanel(); app.mode.skip(); } else msg.textContent = 'Not in a chapter.'; }),
      button('Mark all done', () => { for (const c of list) { save.data.done[c.id] = true; save.data.seals[c.id] = { finish: true, gentle: true, fast: true }; } save.data.allOpen = true; save.data.unlocked = true; save.commit(); msg.textContent = 'Every chapter marked done, with all seals.'; }),
      button('Unlock all', () => { save.data.allOpen = true; save.commit(); msg.textContent = 'Every chapter is open.'; }),
      button('Erase progress', () => { save.reset(); msg.textContent = 'Progress erased. Settings kept.'; })),
    msg,
    el('div', { class: 'row' }, button(t('btn.close'), () => closePanel(), { main: true })),
  ]);
}

// Hotkeys while developer mode is on: ` opens the panel, G god mode, H hitboxes, [ ] speed.
window.addEventListener('keydown', (e) => {
  if (!save.data.settings.devMode || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.code === 'Backquote') openDevPanel();
  else if (e.code === 'KeyG') dev.god = !dev.god;
  else if (e.code === 'KeyH') dev.hitboxes = !dev.hitboxes;
  else if (e.code === 'BracketLeft' || e.code === 'BracketRight') { const steps = [0.25, 0.5, 1, 2]; const i = Math.max(0, Math.min(3, steps.indexOf(dev.slow) + (e.code === 'BracketRight' ? 1 : -1))); dev.slow = steps[i]; app.loop.setSlow(dev.slow); }
});
