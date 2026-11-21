// DOM pieces: dialogue box, panels, top bar, toast and touch buttons. Buttons call the
// current handler by name at click time, never a function captured at load.
import { t } from '../core/i18n.js';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';
import { bindButton, input } from '../core/input.js';
import { app } from '../core/app.js';

const $ = (id) => document.getElementById(id);

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

export function button(label, onClick, o = {}) {
  return el('button', { class: 'btn' + (o.main ? ' main' : ''), type: 'button', disabled: o.disabled, 'aria-label': o.aria, onclick: (e) => { e.stopPropagation(); bus.emit('ui:tap'); onClick(e); } }, label, o.small ? el('small', {}, o.small) : null);
}

// ---------------------------------------------------------------- dialogue
const dlg = { full: '', shown: 0, typing: false, onDone: null };
export function showLine(who, text, o = {}) {
  const box = $('dialogue');
  box.classList.remove('hidden');
  box.classList.toggle('top', !!o.top);
  box.querySelector('.who').textContent = who || '';
  box.querySelector('.who').style.display = who ? '' : 'none';
  const say = box.querySelector('.say');
  say.classList.toggle('narr', !who);
  dlg.full = text; dlg.shown = 0; dlg.typing = true; dlg.el = say;
  say.textContent = '';
  const more = box.querySelector('.more'); more.style.visibility = 'hidden'; more.textContent = o.hint ? o.hint + ' ▸' : '▸';
}
export function tickLine(dt, speed) {
  if (!dlg.typing) return;
  dlg.shown += dt * speed;
  const n = Math.min(dlg.full.length, Math.floor(dlg.shown));
  dlg.el.textContent = dlg.full.slice(0, n);
  if (n >= dlg.full.length) finishTyping();
}
export function lineTyping() { return dlg.typing; }
export function finishTyping() { dlg.typing = false; if (dlg.el) dlg.el.textContent = dlg.full; $('dialogue').querySelector('.more').style.visibility = 'visible'; }
export function hideLine() { $('dialogue').classList.add('hidden'); dlg.typing = false; }

// ---------------------------------------------------------------- panels
let panelClose = null;
let returnFocus = null; // where keyboard focus was before the panel opened, to give it back
export function panel(content, o = {}) {
  const p = $('panel');
  if (p.classList.contains('hidden')) returnFocus = document.activeElement;
  p.innerHTML = '';
  p.className = 'center plate' + (o.cls ? ' ' + o.cls : '');
  p.append(...[].concat(content));
  p.classList.remove('hidden');
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-modal', 'true');
  const head = p.querySelector('h1, h2');
  if (head) { head.id = head.id || 'panel-title'; p.setAttribute('aria-labelledby', head.id); } else p.removeAttribute('aria-labelledby');
  panelClose = o.onClose || null;
  const f = p.querySelector('button');
  if (f && !app.isTouch) setTimeout(() => f.focus(), 30);
  return p;
}
export function closePanel() {
  const p = $('panel'); p.classList.add('hidden'); p.innerHTML = '';
  const c = panelClose; panelClose = null; if (c) c();
  if (p.classList.contains('hidden') && returnFocus && returnFocus.focus && document.contains(returnFocus)) { try { returnFocus.focus(); } catch { /* gone */ } }
  returnFocus = null;
}
// keep Tab inside an open panel (it is modal)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const p = $('panel'); if (!p || p.classList.contains('hidden')) return;
  const items = [...p.querySelectorAll('button, select, input, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (!p.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
export function panelOpen() { return !$('panel').classList.contains('hidden'); }

/** A choice on a plate. Resolves with the chosen index. The pause menu can cover it and
 * put it back (reopenChoice), so the promise is never left hanging. */
let pendingChoice = null;
function renderChoice(c) {
  const kids = [];
  if (c.prompt) kids.push(el('p', { style: 'font-style:italic' }, c.prompt));
  const row = el('div', { class: c.o.grid ? 'heads' : 'col' });
  c.options.forEach((op, i) => row.append(button(op.label, () => { if (pendingChoice !== c) return; pendingChoice = null; closePanel(); bus.emit('cue', 'choose'); c.resolve(i); }, { small: op.small, main: op.main })));
  kids.push(row);
  panel(kids, { cls: c.o.cls });
}
export function choose(prompt, options, o = {}) {
  return new Promise((resolve) => { pendingChoice = { prompt, options, o, resolve }; renderChoice(pendingChoice); });
}
export function choicePending() { return !!pendingChoice; }
export function reopenChoice() { if (pendingChoice) renderChoice(pendingChoice); }
/** Drop a choice whose chapter is being left (restart, hub, title). */
export function cancelChoice() { pendingChoice = null; }

export function showBusy(text) { const b = $('busy'); b.textContent = text; b.classList.remove('hidden'); }
export function hideBusy() { $('busy').classList.add('hidden'); }

/** A new build has taken over: offer a reload, never force one mid-chapter. */
export function updateReady(text, label) {
  const tEl = $('toast'); clearTimeout(tEl._t); tEl._t = null; tEl.innerHTML = ''; tEl.append(el('span', {}, text + ' '), button(label, () => location.reload(), { main: true }));
  tEl.classList.remove('hidden');
}

export function toast(text, dur = 2) {
  const tEl = $('toast');
  if (tEl.querySelector('button')) return; // never cover the "new version" reload offer
  tEl.textContent = text; tEl.classList.remove('hidden');
  clearTimeout(tEl._t); tEl._t = setTimeout(() => tEl.classList.add('hidden'), dur * 1000);
}

// ---------------------------------------------------------------- top bar
export function topbar(items) {
  const bar = $('topbar'); bar.innerHTML = '';
  if (!items || !items.length) { bar.classList.add('hidden'); return; }
  for (const it of items) bar.append(button(it.label, it.on, { aria: it.aria }));
  bar.classList.remove('hidden');
}

// ---------------------------------------------------------------- touch controls
const ICONS = {
  left: '<svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="#1d1613" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="#1d1613" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m4 15 8-8 8 8" fill="none" stroke="#1d1613" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m4 9 8 8 8-8" fill="none" stroke="#1d1613" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  draw: '<svg viewBox="0 0 24 24"><path d="M6 2c8 4 8 16 0 20" fill="none" stroke="#1d1613" stroke-width="2.6"/><path d="M6 2v20M4 12h16m-4-4 4 4-4 4" fill="none" stroke="#28367c" stroke-width="2.2" stroke-linecap="round"/></svg>',
  jump: '<svg viewBox="0 0 24 24"><path d="M12 20V5m-6 6 6-6 6 6" fill="none" stroke="#1d1613" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  roll: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-3-5.7" fill="none" stroke="#1d1613" stroke-width="3" stroke-linecap="round"/><path d="m14 3 3 3-3.5 2.5" fill="none" stroke="#1d1613" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rage: '<svg viewBox="0 0 24 24"><path d="M6 2c8 4 8 16 0 20" fill="none" stroke="#a82414" stroke-width="2.8"/><path d="M6 2v20" stroke="#1d1613" stroke-width="1.6"/><path d="m13 6 3 6-3 6m4-12 3 6-3 6" fill="none" stroke="#a82414" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  action: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#1d1613" stroke-width="3"/><circle cx="12" cy="12" r="2.5" fill="#e6ac17"/></svg>',
};
const LABEL_KEYS = { rage: 'act.rage', draw: 'btn.draw', jump: 'btn.jump', roll: 'btn.roll', action: 'btn.action', left: 'btn.left', right: 'btn.right', up: 'btn.up', down: 'btn.down' };

/**
 * Show touch buttons. set: array of names among left, right, up, down, draw, jump, roll, action.
 * Layout keeps the middle third of the screen clear; left-handed mode mirrors it.
 */
let lastTouchSet = null;
export function touchControls(set) {
  lastTouchSet = set;
  const box = $('touch'); box.innerHTML = '';
  if (!set || !set.length || !app.isTouch) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const vh = window.innerHeight, vw = window.innerWidth;
  const s = Math.max(56, Math.min(96, vh * 0.17)), big = Math.max(84, Math.min(140, vh * 0.27)), m = 10;
  const lh = save.data.settings.leftHanded;
  const place = (name, side, x, y, size, kind) => {
    const b = el('div', { class: 'tb', role: 'button', 'aria-label': t(LABEL_KEYS[name]), html: ICONS[name] });
    b.dataset.name = name;
    b.style.width = b.style.height = size + 'px';
    const sx = `calc(${x}px + var(--sa${side === 'left' ? 'l' : 'r'}))`;
    if ((side === 'left') !== lh) b.style.left = sx; else b.style.right = sx;
    b.style.bottom = `calc(${y}px + var(--sab))`;
    bindButton(b, name, kind);
    box.append(b);
  };
  if (set.includes('left')) place('left', 'left', m, m, s, 'hold');
  if (set.includes('right')) place('right', 'left', m * 2 + s, m, s, 'hold');
  // with left/right on the bottom row, up and down stack in a column beside them (Jatayu's flight
  // needs all four); on their own they stack above each other
  const hasLR = set.includes('left') || set.includes('right');
  const udx = hasLR ? m * 3 + s * 2 : m + s * 0.5;
  if (set.includes('up')) place('up', 'left', udx, hasLR ? m * 2 + s : m * 2 + s, s, 'hold');
  if (set.includes('down')) place('down', 'left', udx, m, s, 'hold');
  if (set.includes('draw')) place('draw', 'right', m, m, big, 'draw');
  if (set.includes('jump')) place('jump', 'right', m + (big - s) / 2, m * 2 + big, s, 'tap');
  if (set.includes('roll')) place('roll', 'right', m * 2 + big, m, s, 'tap');
  if (set.includes('rage')) place('rage', 'right', m * 2 + big, m * 2 + s, s, 'tap');
  // action is held, not tapped: hiding in Lanka, rowing hard and flying fast all hold it
  if (set.includes('action')) place('action', 'right', set.includes('draw') ? m * 2 + big : m, set.includes('draw') ? m * 2 + s : m, set.includes('draw') ? s : big, 'hold');
  void vw;
  for (const b of box.querySelectorAll('.tb')) b.tabIndex = 0;
}
/** Lay the touch buttons out again (after a resize, a turn of the phone, or the left-handed setting). */
export function refreshTouchControls() { touchControls(lastTouchSet); }
let touchResizeT = null;
window.addEventListener('resize', () => { clearTimeout(touchResizeT); touchResizeT = setTimeout(refreshTouchControls, 120); });
window.addEventListener('orientationchange', () => setTimeout(refreshTouchControls, 200));

/** Centre of a touch button in logical units, or null when it is not on screen. */
export function controlPoint(name) {
  if (!name) return null;
  const b = document.querySelector(`#touch .tb[data-name="${name}"]`);
  if (!b) return null;
  const r = b.getBoundingClientRect(), c = app.canvas.getBoundingClientRect();
  return [((r.left + r.width / 2 - c.left) / c.width) * app.W, ((r.top + r.height / 2 - c.top) / c.height) * 720];
}

/** Flash one touch button (used with the painted hand when a control is taught). */
export function flashButton(name, dur = 1.6) {
  const b = document.querySelector(`#touch .tb[data-name="${name}"]`);
  if (!b) return;
  b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), dur * 1000);
}
bus.on('hint', (h) => { if (h.button) flashButton(h.button, h.dur); });

export function setDraftNote(show) { const d = $('draftNote'); d.textContent = t('lang.draft'); d.classList.toggle('hidden', !show); }
export function setLoading(k) { const b = $('loadbar'); if (b) b.style.width = Math.round(k * 100) + '%'; }
export function hideLoading() { const l = $('loading'); if (l) l.remove(); }

/** Show the "Grinding the colours…" plate while the next scene loads, for at least minMs. */
export async function withGrinding(work, minMs = 700) {
  const plate = document.createElement('div');
  plate.id = 'grinding';
  plate.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--cream);font:400 26px "Yatra One",serif;color:var(--madder);z-index:55';
  plate.innerHTML = '<div style="text-align:center"><div>Grinding the colours…</div><div style="width:220px;height:12px;border:2px solid var(--black);margin:12px auto 0;background:var(--paper)"><i style="display:block;height:100%;width:0;background:var(--madder);animation:rs-grind 1.1s ease-in-out infinite"></i></div></div>';
  document.body.append(plate);
  const started = Date.now();
  try { return await work(); }
  finally {
    const wait = Math.max(0, minMs - (Date.now() - started));
    setTimeout(() => plate.remove(), wait);
  }
}
export function showRotate(on) { $('rotate').classList.toggle('hidden', !on); }

export function sealSvg(on) {
  return `<svg class="seal" viewBox="0 0 30 30" aria-hidden="true"><g stroke="#1d1613" stroke-width="1.6" fill="${on ? '#d9788d' : '#f8efd9'}">` +
    '<path d="M15 4c3 4 3 10 0 14-3-4-3-10 0-14z"/><path d="M5 10c5 0 9 4 10 8-5 0-9-3-10-8z"/><path d="M25 10c-5 0-9 4-10 8 5 0 9-3 10-8z"/></g>' +
    `<path d="M5 22h20" stroke="${on ? '#3f8038' : '#1d1613'}" stroke-width="2.4"/></svg>`;
}
export { input };
