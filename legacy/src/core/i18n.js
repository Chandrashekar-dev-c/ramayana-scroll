// Text is keyed by stable ids. One file per language, loaded on demand.
const loaders = import.meta.glob('../i18n/*.json');

/** Languages and their review status. Only reviewed languages appear in the picker. */
export const LANGUAGES = {
  en: { name: 'English', status: 'final' },
  hi: { name: 'हिन्दी', status: 'draft' },
  kn: { name: 'ಕನ್ನಡ', status: 'draft' },
  te: { name: 'తెలుగు', status: 'draft' },
  ta: { name: 'தமிழ்', status: 'draft' },
  sa: { name: 'संस्कृतम्', status: 'draft' },
};

let strings = {};
let fallback = {};
let current = 'en';
const warned = new Set();

export async function loadLang(lang) {
  const path = `../i18n/${lang}.json`;
  if (!loaders[path]) lang = 'en';
  const mod = await loaders[`../i18n/${lang}.json`]();
  strings = mod.default || mod;
  if (lang !== 'en' && !Object.keys(fallback).length) {
    const en = await loaders['../i18n/en.json']();
    fallback = en.default || en;
  }
  current = lang;
  document.documentElement.lang = lang;
}

export function lang() { return current; }
export function isDraft() { return LANGUAGES[current]?.status === 'draft'; }
export function has(key) { return key in strings || key in fallback; }

/** @param {string} key @param {Record<string, string|number>} [vars] */
export function t(key, vars) {
  let s = strings[key] ?? fallback[key];
  if (s == null) {
    if (!warned.has(key)) { warned.add(key); console.warn('[i18n] missing key', key); }
    return key;
  }
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}
