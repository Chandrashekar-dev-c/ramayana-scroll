// Chapter registry. Adding a chapter = a JSON in content/chapters/ + an Ink script in content/ink/.
const data = import.meta.glob('../../content/chapters/*.json', { eager: true, import: 'default' });
const inks = import.meta.glob('../../content/ink/*.ink', { eager: true, import: 'default' });

const byId = Object.fromEntries(Object.values(data).map(c => [c.id, c]));

export const chapter = id => {
  const c = byId[id];
  if (!c) throw new Error(`No chapter "${id}" in content/chapters/`);
  return c;
};

export const inkFor = id => {
  const json = inks[`../../content/ink/${chapter(id).ink}.ink`];
  if (!json) throw new Error(`No Ink script for chapter "${id}"`);
  return json;
};

export const chapterIds = () => Object.keys(byId);

// Progress lives on the device.
const KEY = 'ramayana-scroll.v2.progress';
export function progress() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }

export function markDone(id) {
  try { const p = JSON.parse(localStorage.getItem(KEY) || '{}'); p[id] = { done: true, at: Date.now() }; localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}
