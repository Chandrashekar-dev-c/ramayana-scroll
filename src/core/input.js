// One input layer for touch, mouse, keyboard and gamepad. Systems read actions, not devices.
import { app, toLogical } from './app.js';
import { save } from './save.js';

export const DEFAULT_KEYS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'],
  // up aims and steers; Space jumps, so aiming up no longer makes Rama jump. J draws the bow.
  down: ['KeyS', 'ArrowDown'], jump: ['Space'], roll: ['ShiftLeft', 'ShiftRight'], draw: ['KeyJ'],
  astra: ['KeyE'], rage: ['KeyR'], pause: ['Escape'], confirm: ['Enter'], action: ['KeyF'],
};

export const input = {
  axis: 0, axisY: 0,
  held: { draw: false, mouseDraw: false, padDraw: false, jump: false, roll: false, left: false, right: false, up: false, down: false, action: false },
  pressed: {},
  pointer: { x: 0, y: 0, down: false, justDown: false, justUp: false, sx: 0, sy: 0, moved: 0, type: 'mouse' },
  aim: { x: 0, y: 0, dx: 0, dy: 0, source: 'mouse', padX: 0, padY: 0 },
  wheel: 0, pinch: 1, panX: 0, panY: 0,
  device: 'mouse',
  keys: {},
  enabled: true,

  press(a) { this.pressed[a] = true; },
  consume(a) { if (this.pressed[a]) { this.pressed[a] = false; return true; } return false; },
  endTick() {
    for (const k in this.pressed) this.pressed[k] = false;
    this.pointer.justDown = false; this.pointer.justUp = false;
    this.wheel = 0; this.pinch = 1; this.panX = 0; this.panY = 0;
  },
  drawHeld() { return this.held.draw || this.held.mouseDraw || this.held.padDraw; },
  releaseAll() {
    for (const k in this.held) this.held[k] = false;
    for (const k in this.keys) this.keys[k] = false;
    pointers.clear(); pinchDist = 0; drawToggleOn = false;
    this.axis = 0; this.axisY = 0; this.pointer.down = false;
  },
};

// a saved keymap from an older build may lack newer actions (draw, rage): fill them in
function keymap() { const k = save.data.settings.keys; return k ? { ...DEFAULT_KEYS, ...k } : DEFAULT_KEYS; }
function actionsFor(code) {
  const map = keymap(); const out = [];
  for (const a in map) if (map[a].includes(code)) out.push(a);
  return out;
}

const pointers = new Map();
let pinchDist = 0;
let drawToggleOn = false;

function refreshAxis() {
  const h = input.held;
  input.axis = (h.right ? 1 : 0) - (h.left ? 1 : 0);
  input.axisY = (h.down ? 1 : 0) - (h.up ? 1 : 0);
}

export function initInput() {
  const c = app.canvas;
  window.addEventListener('keydown', (e) => {
    // Form controls and the open panel's buttons handle their own keys (arrows pick an option, Enter presses a button).
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.target instanceof HTMLButtonElement && e.target.closest('#panel')) return;
    input.device = 'key';
    if (input.keys[e.code]) return;
    input.keys[e.code] = true;
    const acts = actionsFor(e.code);
    for (const a of acts) { if (a in input.held) input.held[a] = true; input.press(a); }
    if (acts.length && !e.metaKey && !e.ctrlKey) e.preventDefault();
    input.press('anykey');
    refreshAxis();
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
    // an action stays held while any other key bound to it is still down
    const map = keymap();
    for (const a of actionsFor(e.code)) if (a in input.held) input.held[a] = map[a].some((k) => input.keys[k]);
    refreshAxis();
  });
  window.addEventListener('blur', () => input.releaseAll());

  c.addEventListener('pointerdown', (e) => {
    const p = toLogical(e.clientX, e.clientY);
    pointers.set(e.pointerId, p);
    input.device = e.pointerType === 'touch' ? 'touch' : 'mouse';
    if (pointers.size === 1) {
      Object.assign(input.pointer, { x: p.x, y: p.y, sx: p.x, sy: p.y, down: true, justDown: true, moved: 0, type: e.pointerType });
      if (e.pointerType === 'mouse' && e.button === 0) input.held.mouseDraw = true;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    try { c.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    e.preventDefault();
  });
  c.addEventListener('pointermove', (e) => {
    const p = toLogical(e.clientX, e.clientY);
    const prev = pointers.get(e.pointerId);
    if (e.pointerType === 'mouse') { input.aim.x = p.x; input.aim.y = p.y; input.aim.source = 'mouse'; }
    if (!prev) { input.pointer.x = p.x; input.pointer.y = p.y; return; }
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      input.panX += p.x - prev.x; input.panY += p.y - prev.y;
      input.pointer.moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
      input.pointer.x = p.x; input.pointer.y = p.y;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) input.pinch *= d / pinchDist;
      pinchDist = d;
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      input.pointer.down = false; input.pointer.justUp = true; input.held.mouseDraw = false;
    }
    pinchDist = 0;
  };
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
  c.addEventListener('wheel', (e) => { input.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** Wire a DOM touch button to an action. `kind` is hold, tap or draw. */
export function bindButton(el, action, kind = 'hold') {
  let sx = 0, sy = 0, id = null;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    input.device = e.pointerType === 'touch' ? 'touch' : 'mouse';
    id = e.pointerId; sx = e.clientX; sy = e.clientY;
    try { el.setPointerCapture(id); } catch { /* ignore */ }
    el.classList.add('on');
    if (kind === 'draw') {
      input.aim.source = 'touch'; input.aim.dx = 0; input.aim.dy = 0;
      if (save.data.settings.toggleDraw) { drawToggleOn = !drawToggleOn; input.held.draw = drawToggleOn; }
      else input.held.draw = true;
    } else if (kind === 'hold') { input.held[action] = true; input.press(action); refreshAxis(); }
    else input.press(action);
  });
  el.addEventListener('pointermove', (e) => {
    if (kind !== 'draw' || e.pointerId !== id) return;
    const k = 720 / window.innerHeight;
    input.aim.dx = (e.clientX - sx) * k; input.aim.dy = (e.clientY - sy) * k;
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; el.classList.remove('on');
    if (kind === 'draw') { if (!save.data.settings.toggleDraw) input.held.draw = false; }
    else if (kind === 'hold') { input.held[action] = false; refreshAxis(); }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

const padPrev = {};
/** Poll the first connected gamepad. Called once per tick. */
export function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (!gp) {
    // the pad went away: let go of everything it was holding
    if (input.device === 'pad' || input.held.padDraw) { input.held.padDraw = false; for (const k of ['left', 'right', 'up', 'down', 'jump', 'roll', 'action']) input.held[k] = false; refreshAxis(); input.device = 'key'; }
    return;
  }
  const dead = (v) => (Math.abs(v) < 0.25 ? 0 : v);
  const lx = dead(gp.axes[0] || 0), ly = dead(gp.axes[1] || 0);
  const rx = dead(gp.axes[2] || 0), ry = dead(gp.axes[3] || 0);
  const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
  const active = lx || ly || rx || ry || gp.buttons.some((x) => x.pressed);
  if (active) input.device = 'pad';
  if (input.device !== 'pad') return;
  input.axis = lx > 0.3 ? 1 : lx < -0.3 ? -1 : 0;
  input.axisY = ly > 0.3 ? 1 : ly < -0.3 ? -1 : 0;
  input.held.left = input.axis < 0; input.held.right = input.axis > 0;
  input.held.up = input.axisY < 0; input.held.down = input.axisY > 0;
  if (rx || ry) { input.aim.source = 'pad'; input.aim.padX = rx; input.aim.padY = ry; }
  input.held.padDraw = b(7) || b(5);
  const edge = (i, a, hold) => {
    const now = b(i);
    if (now && !padPrev[i]) { input.press(a); if (a === 'jump') input.press('confirm'); }
    if (hold) input.held[hold] = now;
    padPrev[i] = now;
  };
  edge(0, 'jump', 'jump'); edge(1, 'roll', 'roll'); edge(3, 'astra'); edge(9, 'pause'); edge(2, 'action', 'action');
}
