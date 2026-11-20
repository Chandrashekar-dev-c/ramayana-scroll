// The chapter list. Every chapter of the story is here; the ones marked ready are staged
// for the new engine (the rest arrive in Phase 4 and show as "coming").
import chapters from '../data/chapters.json';
import { save } from '../core/save.js';

export const CHAPTERS = chapters.filter((c) => c.playable);
const byId = Object.fromEntries(chapters.map((c) => [c.id, c]));
export function chapterById(id) { const c = byId[id]; if (!c) throw new Error('Unknown chapter ' + id); return c; }
export const READY = CHAPTERS.filter((c) => c.ready);

export function nextChapter(id) {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return CHAPTERS.slice(i + 1).find((c) => c.ready) || null;
}
export function isUnlocked(id) {
  if (save.data.allOpen || save.data.settings.devMode) return true;
  const i = READY.findIndex((c) => c.id === id);
  return i <= 0 || READY.slice(0, i).every((c) => save.data.done[c.id]);
}
export function resumeChapter() { return READY.find((c) => !save.data.done[c.id]) || READY[0]; }
