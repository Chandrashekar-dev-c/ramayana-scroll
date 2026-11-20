// Sound: a small synthesised score in raga Bhairav, and the sound effects. WebAudio only, so it
// works offline with no files. Moods: dusk (sparse, low), battle (pulse + phrases), dawn (bright).
import { settings, onSettings } from './settings.js';

let ctx = null, master = null, musicBus = null, sfxBus = null;
// Bhairav: Sa komal-Re Ga Ma Pa komal-Dha Ni Sa', on C
const SA = 130.81;
const SWARA = { S: 0, r: 1, G: 4, m: 5, P: 7, d: 8, N: 11 };
const hz = (note, oct = 0) => SA * 2 ** ((SWARA[note] + 12 * oct) / 12);

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = settings.volume; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  // a touch of space: a simple feedback delay on the music
  const d = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
  d.delayTime.value = 0.32; fb.gain.value = 0.28; wet.gain.value = 0.22;
  musicBus.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(master);
  onSettings((k, v) => { if (k === 'volume') master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); });
}

function tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, at = 0, bus = sfxBus } = {}) {
  if (!ctx) return;
  const t = at || ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.3, freq = 800, q = 0.7, at = 0, bus = sfxBus, type = 'lowpass' } = {}) {
  if (!ctx) return;
  const t = at || ctx.currentTime, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(bus); s.start(t);
}

/** A plucked string (a bowed-sounding sarangi-ish voice is beyond this; the pluck reads as santoor). */
function pluck(freq, at, vol = 0.18, dur = 1.4, bus = musicBus) {
  tone(freq, dur, { type: 'triangle', vol, at, bus, attack: 0.004 });
  tone(freq * 2, dur * 0.5, { type: 'sine', vol: vol * 0.25, at, bus });
}

export const sfx = {
  drawStart: () => tone(98, 0.3, { type: 'sawtooth', vol: 0.04, slide: 1.6 }),
  fullDraw: () => { tone(hz('P', 1), 0.25, { type: 'triangle', vol: 0.12 }); tone(hz('S', 2), 0.35, { type: 'sine', vol: 0.08, at: ctx && ctx.currentTime + 0.05 }); },
  twang: power => { tone(196 + 100 * power, 0.35, { type: 'triangle', vol: 0.3, slide: 0.6 }); noise(0.07, { vol: 0.12, freq: 3500 }); },
  hit: () => { noise(0.12, { vol: 0.45, freq: 1100 }); tone(110, 0.16, { type: 'square', vol: 0.12, slide: 0.5 }); },
  weak: () => { noise(0.1, { vol: 0.4, freq: 2200, type: 'bandpass', q: 2 }); tone(hz('P', 2), 0.3, { type: 'triangle', vol: 0.16 }); },
  hurt: () => { tone(220, 0.3, { type: 'sawtooth', vol: 0.18, slide: 0.45 }); noise(0.25, { vol: 0.3, freq: 500 }); },
  jump: () => noise(0.18, { vol: 0.12, freq: 1600, type: 'bandpass', q: 1.5 }),
  roll: () => noise(0.3, { vol: 0.16, freq: 700 }),
  // Tataka's moves each have a voice
  stompWarn: () => { tone(62, 0.6, { vol: 0.35, slide: 1.3 }); noise(0.5, { vol: 0.15, freq: 200 }); },
  stomp: () => { tone(48, 0.8, { vol: 0.7, slide: 0.5 }); noise(0.7, { vol: 0.6, freq: 260 }); },
  stonesWarn: () => { for (let i = 0; i < 3; i++) noise(0.12, { vol: 0.18, freq: 2600, type: 'bandpass', q: 3, at: ctx && ctx.currentTime + i * 0.11 }); },
  stoneFall: () => noise(0.42, { vol: 0.16, freq: 1400, type: 'bandpass', q: 1 }),
  stoneLand: () => { noise(0.14, { vol: 0.4, freq: 700 }); tone(80, 0.18, { vol: 0.2, slide: 0.6 }); },
  swipeWarn: () => tone(330, 0.35, { type: 'sawtooth', vol: 0.08, slide: 0.7 }),
  swipe: () => noise(0.22, { vol: 0.35, freq: 3000, type: 'highpass' }),
  vanish: () => { noise(1.1, { vol: 0.25, freq: 500 }); tone(hz('r', 0), 1.0, { type: 'sine', vol: 0.15, slide: 0.5 }); },
  rise: () => { tone(55, 0.6, { vol: 0.6, slide: 1.8 }); noise(0.5, { vol: 0.5, freq: 400 }); },
  roar: () => { tone(90, 0.9, { type: 'sawtooth', vol: 0.18, slide: 0.6 }); noise(0.9, { vol: 0.25, freq: 600 }); },
  fall: () => { tone(70, 1.6, { vol: 0.6, slide: 0.35 }); noise(1.4, { vol: 0.5, freq: 300 }); },
  tap: () => tone(hz('S', 2), 0.08, { type: 'triangle', vol: 0.1 }),
  read: () => pluck(hz('G', 1), ctx ? ctx.currentTime : 0, 0.14),
  drum: () => { tone(80, 0.35, { vol: 0.5, slide: 0.6 }); tone(160, 0.12, { type: 'triangle', vol: 0.2, at: ctx && ctx.currentTime + 0.18 }); },
  /** One rising note of the healing, i = 0, 1, 2… up the raga. */
  chime: i => { const notes = ['S', 'r', 'G', 'm', 'P', 'd', 'N']; pluck(hz(notes[i % 7], 1 + Math.floor(i / 7)), ctx ? ctx.currentTime : 0, 0.2, 2); },
};

// ---------------------------------------------------------------- the score
// A step sequencer: a tanpura drone (Pa-Sa-Sa-Sa) plus phrases of Bhairav, and in battle a pulse.
const PHRASES = {
  dusk: [['S', 0, 2], ['r', 0, 1], ['G', 0, 1], ['m', 0, 2], ['G', 0, 1], ['r', 0, 1], ['S', 0, 4], [null, 0, 4],
         ['d', -1, 2], ['N', -1, 1], ['S', 0, 1], ['r', 0, 3], ['S', 0, 5]],
  battle: [['S', 0, 1], ['r', 0, 1], ['G', 0, 1], ['m', 0, 1], ['P', 0, 2], ['d', 0, 1], ['P', 0, 1], ['m', 0, 2], ['G', 0, 1], ['r', 0, 1], ['S', 0, 2], [null, 0, 2],
           ['P', 0, 1], ['d', 0, 1], ['N', 0, 1], ['S', 1, 3], ['N', 0, 1], ['d', 0, 1], ['P', 0, 2]],
  dawn: [['P', 0, 2], ['d', 0, 1], ['N', 0, 1], ['S', 1, 3], [null, 0, 1], ['N', 0, 1], ['S', 1, 1], ['r', 1, 2], ['S', 1, 2], ['N', 0, 1], ['d', 0, 1], ['P', 0, 4], ['G', 0, 2], ['m', 0, 2], ['P', 0, 4]],
};
const TEMPO = { dusk: 0.42, battle: 0.22, dawn: 0.36 }; // seconds per step
let music = null;

export function setMusic(mood) {
  if (!ctx) return;
  if (music?.mood === mood) return;
  if (music) { const m = music; m.stop = true; m.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.8); setTimeout(() => m.gain.disconnect(), 3000); }
  music = null;
  if (!mood || !PHRASES[mood]) return;
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(musicBus); gain.gain.setTargetAtTime(1, ctx.currentTime, 1);
  const m = { mood, gain, stop: false, step: 0, next: ctx.currentTime + 0.1, note: 0, wait: 0 };
  music = m;
  const tick = () => {
    if (m.stop) return;
    while (m.next < ctx.currentTime + 0.3) {
      const t = m.next, step = m.step;
      if (step % 8 === 0) [hz('P', -1), hz('S', 0), hz('S', 0), hz('S', -1)].forEach((f, i) =>
        tone(f, TEMPO[mood] * 9, { type: 'sawtooth', vol: 0.018, at: t + i * TEMPO[mood] * 2, bus: gain, attack: 0.08 }));
      if (mood === 'battle') { // a dhol-like pulse: dha on 1, na on 3, ghe on the off-beats
        if (step % 4 === 0) { tone(70, 0.3, { vol: 0.35, slide: 0.6, at: t, bus: gain }); noise(0.05, { vol: 0.08, freq: 1800, at: t, bus: gain }); }
        if (step % 4 === 2) noise(0.06, { vol: 0.12, freq: 3000, type: 'bandpass', q: 3, at: t, bus: gain });
      }
      if (m.wait <= 0) {
        const ph = PHRASES[mood], [n, oct, len] = ph[m.note % ph.length];
        if (n) pluck(hz(n, oct + (mood === 'dusk' ? 0 : 1)), t, mood === 'battle' ? 0.12 : 0.15, TEMPO[mood] * len * 1.6, gain);
        m.wait = len; m.note++;
      }
      m.wait--; m.step++; m.next += TEMPO[mood];
    }
    setTimeout(tick, 100);
  };
  tick();
}

/** The healing: a rising run up the raga with a swell. */
export function healSwell() {
  if (!ctx) return;
  const notes = ['S', 'r', 'G', 'm', 'P', 'd', 'N'];
  for (let i = 0; i < 15; i++) pluck(hz(notes[i % 7], 1 + Math.floor(i / 7)), ctx.currentTime + i * 0.12, 0.13, 2.2);
  tone(hz('S', 0), 4, { type: 'sine', vol: 0.12, attack: 1.5, bus: musicBus });
  tone(hz('P', 0), 4, { type: 'sine', vol: 0.08, attack: 1.8, bus: musicBus });
}

// old name kept for scenes written against it
export const setDrone = mood => setMusic(mood);
