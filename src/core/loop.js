// Fixed 60 Hz simulation with an accumulator; rendering interpolates. Delta time is capped
// so a tab switch never skips a fight.
export const STEP = 1 / 60;

export function createLoop({ update, render }) {
  let last = 0, acc = 0, running = false, raf = 0, slow = 1, menuFps = false, lastRender = 0;
  const stats = { fps: 60, frameMs: 0, scriptMs: 0, worstMs: 0 };

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (menuFps && now - lastRender < 30) return; // about 30 fps in menus
    const t0 = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt * slow;
    let n = 0;
    while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    render(acc / STEP);
    lastRender = now;
    const ms = performance.now() - t0;
    stats.scriptMs = stats.scriptMs * 0.95 + ms * 0.05;
    stats.frameMs = stats.frameMs * 0.9 + dt * 100;
    stats.fps = dt > 0 ? stats.fps * 0.95 + (1 / dt) * 0.05 : stats.fps;
    if (ms > stats.worstMs) stats.worstMs = ms;
  }

  return {
    stats,
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
    setSlow(v) { slow = v; },
    setMenuFps(v) { menuFps = v; },
    /** Advance the simulation by hand (tests and the debug panel). */
    stepFrames(n) { for (let i = 0; i < n; i++) update(STEP); render(0); },
  };
}
