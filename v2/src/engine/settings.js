// Player settings, saved on the device. Every system reads these; the pause menu changes them.
const KEY = 'ramayana-scroll.v2.settings';

export const DEFAULTS = {
  difficulty: 'normal', // easy | normal | hard
  aimAssist: false,     // nudges the bow toward the enemy's head
  lefty: false,         // swap the two thumbs
  vibrate: true,
  volume: 0.8,
  motion: true,         // false = no screen shake, gentler effects
};

export const DIFFICULTY = {
  easy:   { telegraph: 1.4, pause: 1.3, bossHp: 0.7, hearts: 2, label: 'Gentle' },
  normal: { telegraph: 1.0, pause: 1.0, bossHp: 1.0, hearts: 0, label: 'Balanced' },
  hard:   { telegraph: 0.8, pause: 0.8, bossHp: 1.25, hearts: -1, label: 'Fierce' },
};

let current = { ...DEFAULTS };
try { current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
const listeners = new Set();

export const settings = new Proxy(current, {
  set(target, k, v) {
    target[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(target)); } catch { /* storage blocked */ }
    listeners.forEach(f => f(k, v));
    return true;
  },
});

export const onSettings = f => { listeners.add(f); return () => listeners.delete(f); };
export const diff = () => DIFFICULTY[settings.difficulty] ?? DIFFICULTY.normal;

/** Short vibration on phones that support it. */
export function buzz(ms) { if (settings.vibrate) try { navigator.vibrate?.(ms); } catch { /* not allowed */ } }
