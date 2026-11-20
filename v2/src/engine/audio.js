// Small synthesised sound set (WebAudio), until the Tone.js raga score is built.
// Raga Bhairav notes for chimes: Sa re Ga ma Pa dha Ni.
let ctx = null, master = null, drone = null;
const BHAIRAV = [261.6, 277.2, 329.6, 349.2, 392.0, 415.3, 493.9, 523.3];

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
}

function tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.3, freq = 800, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}

export const sfx = {
  twang: () => { tone(196, 0.35, { type: 'triangle', vol: 0.35, slide: 0.6 }); noise(0.08, { vol: 0.15, freq: 3000 }); },
  draw: () => tone(110, 0.25, { type: 'sawtooth', vol: 0.05, slide: 1.4 }),
  hit: () => { noise(0.15, { vol: 0.4, freq: 900 }); tone(90, 0.2, { type: 'square', vol: 0.15, slide: 0.5 }); },
  weak: () => { noise(0.12, { vol: 0.4, freq: 1600 }); tone(660, 0.25, { type: 'triangle', vol: 0.2 }); },
  hurt: () => { tone(220, 0.3, { type: 'sawtooth', vol: 0.2, slide: 0.5 }); noise(0.2, { vol: 0.25, freq: 500 }); },
  stomp: () => { tone(55, 0.6, { type: 'sine', vol: 0.6, slide: 0.5 }); noise(0.5, { vol: 0.5, freq: 250 }); },
  whoosh: () => noise(0.5, { vol: 0.2, freq: 1200 }),
  warn: () => { tone(147, 0.18, { type: 'square', vol: 0.08 }); tone(147, 0.18, { type: 'square', vol: 0.08, delay: 0.22 }); },
  tap: () => tone(523, 0.08, { type: 'triangle', vol: 0.12 }),
  chime: i => tone(BHAIRAV[i % BHAIRAV.length] * (i >= BHAIRAV.length ? 2 : 1), 1.2, { type: 'triangle', vol: 0.22 }),
  drum: () => { tone(80, 0.35, { vol: 0.5, slide: 0.6 }); tone(160, 0.12, { type: 'triangle', vol: 0.2, delay: 0.18 }); },
};

/** A low Sa-Pa drone; `mood` picks the root (dusk lower, dawn higher). */
export function setDrone(mood) {
  if (!ctx) return;
  if (drone) { const old = drone; old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.6); setTimeout(() => old.o.forEach(o => o.stop()), 2500); drone = null; }
  if (!mood) return;
  const root = mood === 'dawn' ? 130.8 : 110, g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  const o = [root, root * 1.5, root * 2].map((f, i) => { const os = ctx.createOscillator(); os.type = i === 2 ? 'sine' : 'triangle'; os.frequency.value = f; os.detune.value = (i - 1) * 4; os.connect(g); os.start(); return os; });
  g.gain.setTargetAtTime(0.06, ctx.currentTime, 1.2);
  drone = { o, g };
}
