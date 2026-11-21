// Lets the unit tests import game modules that the browser build normally serves: JSON data
// files load as modules, and the few browser globals touched at import time are stubbed.
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function load(url, context, next) {
  if (url.endsWith('.json')) {
    const { readFile } = await import('node:fs/promises');
    const text = await readFile(new URL(url), 'utf8');
    return { format: 'module', shortCircuit: true, source: 'export default ' + text + ';' };
  }
  return next(url, context);
}`));

const noop = () => {};
const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, addEventListener: noop, removeEventListener: noop, append: noop, appendChild: noop, setAttribute: noop, querySelector: () => null, querySelectorAll: () => [], getContext: () => null });
globalThis.window ??= { addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, location: { search: '' } };
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, getElementById: () => el(), createElement: el, querySelector: () => null, querySelectorAll: () => [], body: el(), documentElement: el(), fonts: { load: async () => {} }, hidden: false };
globalThis.localStorage ??= { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.navigator ??= { getGamepads: () => [], maxTouchPoints: 0, userAgent: 'node' };
globalThis.location ??= { search: '', hash: '' };
