// Chapter list and hub places, with the rules for what unlocks and what is painted.
import chapters from './chapters.json';
import places from './places.json';
import { save } from '../core/save.js';

export const CHAPTERS = chapters;
export const PLACES = places;
export const KANDAS = ['bala', 'ayodhya', 'aranya', 'kishkindha', 'sundara', 'yuddha'];

const byId = Object.fromEntries(chapters.map((c) => [c.id, c]));
export function chapterById(id) { const c = byId[id]; if (!c) throw new Error('Unknown chapter ' + id); return c; }
export function kandaOf(ch) { return ch.kanda; }

/** Chapters in play order, honouring the "Lanka chapters woven in / at the end" setting. */
export function playOrder() {
  const list = chapters.filter((c) => c.playable !== false);
  if (save.data.settings.lankaWoven !== false) return list;
  return [...list.filter((c) => c.type !== 'lanka'), ...list.filter((c) => c.type === 'lanka')];
}

export function isUnlocked(id) {
  // Developer mode opens every chapter on the wall (remove with the dev mode, see README).
  if (save.data.allOpen || save.data.settings.devMode) return true;
  const order = playOrder();
  const i = order.findIndex((c) => c.id === id);
  if (i <= 0) return i === 0;
  return order.slice(0, i).every((c) => save.data.done[c.id]);
}

/** The chapter that must be finished first, for the locked line. */
export function blocker(id) {
  const order = playOrder();
  const i = order.findIndex((c) => c.id === id);
  return order.slice(0, i).find((c) => !save.data.done[c.id]) || null;
}

export function nextChapter() {
  const order = playOrder();
  return order.find((c) => !save.data.done[c.id]) || null;
}

/**
 * Place states after applying every finished chapter in order: 'line' (outline only),
 * 'kachni' (Lanka, visited, still unpainted) or 'colour'. Marks are small extras (flames,
 * a feather, gold dots) a chapter leaves on the wall.
 */
export function placeStates(upTo) {
  const st = Object.fromEntries(places.map((p) => [p.id, 'line']));
  const marks = new Set();
  for (const c of chapters) {
    if (!save.data.done[c.id] || c.id === upTo) continue;
    for (const p of c.paint || []) st[p] = 'colour';
    for (const p of c.kachni || []) if (st[p] !== 'colour') st[p] = 'kachni';
    for (const p of c.unpaint || []) st[p] = 'line';
    for (const m of c.marks || []) marks.add(m);
    for (const m of c.unmarks || []) marks.delete(m);
  }
  return { st, marks };
}

export function placeOf(chId) { return places.find((p) => p.chapters.includes(chId)) || null; }

export function allSeals() {
  return chapters.filter((c) => c.playable !== false).every((c) => { const s = save.data.seals[c.id]; return s && s.finish && s.gentle && s.fast; });
}
