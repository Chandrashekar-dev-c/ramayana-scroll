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
  box.querySelector('.more').style.visibility = 'hidden';
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
export function panel(content, o = {}) {
  const p = $('panel');
  p.innerHTML = '';
  p.className = 'center plate' + (o.cls ? ' ' + o.cls : '');
  p.append(...[].concat(content));
  p.classList.remove('hidden');
  p.setAttribute('role', 'dialog');
  panelClose = o.onClose || null;
  const f = p.querySelector('button');
  if (f && !app.isTouch) setTimeout(() => f.focus(), 30);
  return p;
}
export function closePanel() { const p = $('panel'); p.classList.add('hidden'); p.innerHTML = ''; const c = panelClose; panelClose = null; if (c) c(); }
export function panelOpen() { return !$('panel').classList.contains('hidden'); }

/** A choice on a plate. Resolves with the chosen index. */
export function choose(prompt, options, o = {}) {
  return new Promise((resolve) => {
    const kids = [];
    if (prompt) kids.push(el('p', { style: 'font-style:italic' }, prompt));
    const row = el('div', { class: o.grid ? 'heads' : 'col' });
    options.forEach((op, i) => row.append(button(op.label, () => { closePanel(); bus.emit('cue', 'choose'); resolve(i); }, { small: op.small, main: op.main })));
    kids.push(row);
    panel(kids, { cls: o.cls });
  });
}

export function toast(text, dur = 2) {
  const tEl = $('toast'); tEl.textContent = text; tEl.classList.remove('hidden');
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
  action: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#1d1613" stroke-width="3"/><circle cx="12" cy="12" r="2.5" fill="#e6ac17"/></svg>',
};
const LABEL_KEYS = { draw: 'btn.draw', jump: 'btn.jump', roll: 'btn.roll', action: 'btn.action', left: 'btn.left', right: 'btn.right', up: 'btn.up', down: 'btn.down' };

/**
 * Show touch buttons. set: array of names among left, right, up, down, draw, jump, roll, action.
 * Layout keeps the middle third of the screen clear; left-handed mode mirrors it.
 */
export function touchControls(set) {
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
  if (set.includes('up')) place('up', 'left', m + s * 0.5, m * 2 + s, s, 'hold');
  if (set.includes('down') && !set.includes('left')) place('down', 'left', m + s * 0.5, m, s, 'hold');
  if (set.includes('draw')) place('draw', 'right', m, m, big, 'draw');
  if (set.includes('jump')) place('jump', 'right', m + (big - s) / 2, m * 2 + big, s, 'tap');
  if (set.includes('roll')) place('roll', 'right', m * 2 + big, m, s, 'tap');
  if (set.includes('action')) place('action', 'right', set.includes('draw') ? m * 2 + big : m, set.includes('draw') ? m * 2 + s : m, set.includes('draw') ? s : big, 'tap');
  void vw;
  // fade when idle
  clearInterval(box._fade);
}

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
export function showRotate(on) { $('rotate').classList.toggle('hidden', !on); }

export function sealSvg(on) {
  return `<svg class="seal" viewBox="0 0 30 30" aria-hidden="true"><g stroke="#1d1613" stroke-width="1.6" fill="${on ? '#d9788d' : '#f8efd9'}">` +
    '<path d="M15 4c3 4 3 10 0 14-3-4-3-10 0-14z"/><path d="M5 10c5 0 9 4 10 8-5 0-9-3-10-8z"/><path d="M25 10c-5 0-9 4-10 8 5 0 9-3 10-8z"/></g>' +
    `<path d="M5 22h20" stroke="${on ? '#3f8038' : '#1d1613'}" stroke-width="2.4"/></svg>`;
}
export { input };
