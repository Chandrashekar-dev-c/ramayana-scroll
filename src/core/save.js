// Versioned save in local storage. Every read and write is guarded; when storage is
// blocked the game runs from memory.
import { bus } from './events.js';

const KEY = 'ramayana-scroll';
const SETTINGS_KEY = 'ramayana-settings';
export const SAVE_VERSION = 1;

export function defaultSettings() {
  return {
    lang: 'en', music: 0.6, sfx: 0.8, textSize: 'normal', reducedMotion: false,
    leftHanded: false, lankaWoven: true, toggleDraw: false, analytics: false,
  };
}

export function freshSave() {
  return {
    v: SAVE_VERSION, chapter: null, checkpoint: 0, done: {}, seals: {}, flags: {},
    pride: 0, headsChosen: {}, difficulty: null, settings: defaultSettings(),
    seen: {}, allOpen: false, unlocked: false,
  };
}

// One migration step per version: MIGRATIONS[n] upgrades a save from version n to n + 1.
const MIGRATIONS = {
  0: (s) => ({ ...freshSave(), ...s, v: 1 }),
};

export function migrate(old) {
  let s = old && typeof old === 'object' ? old : {};
  let v = Number.isInteger(s.v) ? s.v : 0;
  while (v < SAVE_VERSION) { s = MIGRATIONS[v](s); v = s.v; }
  const base = freshSave();
  return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
}

let memory = {};
let storageOk = true;

function read(key) {
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { storageOk = false; return memory[key] ?? null; }
}
function write(key, value) {
  memory[key] = value;
  try { window.localStorage.setItem(key, JSON.stringify(value)); }
  catch { storageOk = false; }
}

export const save = {
  data: freshSave(),
  get storageOk() { return storageOk; },
  load() {
    let data = null;
    try { data = migrate(read(KEY)); } catch { data = null; }
    if (!data) data = freshSave();
    const mirrored = read(SETTINGS_KEY);
    if (mirrored && typeof mirrored === 'object') data.settings = { ...data.settings, ...mirrored };
    this.data = data;
    return data;
  },
  commit() {
    write(KEY, this.data);
    write(SETTINGS_KEY, this.data.settings);
    bus.emit('save:changed', this.data);
  },
  reset() {
    const settings = this.data.settings;
    this.data = freshSave();
    this.data.settings = settings;
    this.commit();
  },
  seen(id) { return !!this.data.seen[id]; },
  markSeen(id) { if (!this.data.seen[id]) { this.data.seen[id] = 1; this.commit(); } },
};
