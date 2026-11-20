// Event bus. Sound, HUD, stats and analytics react to events instead of wrapping functions.
// Events used: chapter:start, chapter:end, enemy:die, enemy:telegraph, hero:hurt, hero:shoot,
// arrow:hit, boss:phase, boss:telegraph, boss:die, checkpoint, astra:ready, astra:fire,
// scene:line, ui:tap, hub:paint, save:changed, mode:change, cue (generic sound cue).

const handlers = new Map();

export const bus = {
  on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type).delete(fn);
  },
  emit(type, data) {
    const set = handlers.get(type);
    if (set) for (const fn of set) fn(data);
    const any = handlers.get('*');
    if (any) for (const fn of any) fn(type, data);
  },
};
