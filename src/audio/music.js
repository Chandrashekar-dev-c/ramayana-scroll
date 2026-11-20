// Music and sound, made in the browser with Tone.js. A tanpura cycle under everything, a
// bansuri that phrases in the chapter's raga with glides and breath, tabla thekas for the
// fights, temple bells and conch for the big moments. Effects keep the old hand-made
// recipes but now share the same room: everything goes through one warm reverb.
import * as Tone from 'tone';
import { bus } from '../core/events.js';
import { save } from '../core/save.js';

const SA = 146.83;
const RAGAS = {
  bala: [0, 1, 4, 5, 7, 8, 11, 12],          // Bhairav: dawn, the prince's first steps
  ayodhya: [0, 2, 3, 5, 7, 9, 10, 12],       // Kafi
  aranya: [0, 2, 4, 7, 9, 12],               // Bhupali
  kishkindha: [0, 2, 4, 5, 7, 9, 10, 12],    // Khamaj
  sundara: [0, 2, 4, 6, 7, 9, 11, 12],       // Yaman
  yuddha: [0, 1, 3, 5, 7, 8, 10, 12],        // Bhairavi
  lanka: [0, 1, 4, 6, 7, 8, 11, 12],         // Marwa
};
const hz = (semi, oct = 0) => SA * Math.pow(2, semi / 12 + oct);
/** One-voice instruments need every note to start after the last one. */
const at = (syn, time) => { const t = Math.max(time, (syn.__last || 0) + 0.006); syn.__last = t; return t; };
/** A poly voice re-triggered on the same pitch is the same voice: keep its starts apart too. */
const lastPitch = new Map();
const atPitch = (name, f, time) => { const k = name + Math.round(f); const t = Math.max(time, (lastPitch.get(k) || 0) + 0.01); lastPitch.set(k, t); return t; };

let ready = false, starting = null;
let master, music, sfx, room, raw;
let tanpura, flute, breath, bayan, dayan, dayanNoise, bell, pluck;
let tanLoop, tablaSeq, fluteLoop;
let mood = { kanda: 'bala', intensity: 'calm' };
let rng = 7;
const rand = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };

/** Start sound on the first tap (browsers require a gesture). Safe to call often. */
export function initAudio() {
  if (ready || starting) return starting;
  starting = Tone.start().then(() => { build(); ready = true; applyVolumes(); setMood(mood.kanda, mood.intensity, true); }).catch(() => { starting = null; });
  return starting;
}

function build() {
  raw = Tone.getContext().rawContext;
  master = new Tone.Gain(0.9).connect(new Tone.Limiter(-2).toDestination());
  room = new Tone.Reverb({ decay: 3.8, preDelay: 0.03, wet: 0.32 }).connect(master);
  music = new Tone.Gain(0.5).connect(room);
  sfx = new Tone.Gain(0.8);
  sfx.connect(master); sfx.connect(new Tone.Gain(0.25).connect(room));
  // tanpura: four strings, plucked in turn, each ringing long with a buzzing bridge
  const chorus = new Tone.Chorus({ frequency: 0.3, delayTime: 3.5, depth: 0.4, wet: 0.35 }).connect(music).start();
  tanpura = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 2, spread: 8 }, envelope: { attack: 0.02, decay: 2.6, sustain: 0.18, release: 3.2 }, volume: -25 });
  const tanFilter = new Tone.Filter({ type: 'lowpass', frequency: 1500, Q: 1.5 }).connect(chorus);
  tanpura.connect(tanFilter);
  // bansuri: a breathy sine with vibrato and glides between notes
  const vib = new Tone.Vibrato({ frequency: 5.2, depth: 0.08 }).connect(music);
  flute = new Tone.MonoSynth({ oscillator: { type: 'sine' }, filter: { Q: 1, type: 'lowpass', rolloff: -12 }, filterEnvelope: { attack: 0.06, decay: 0.3, sustain: 0.8, baseFrequency: 900, octaves: 1.4 }, envelope: { attack: 0.09, decay: 0.2, sustain: 0.75, release: 0.6 }, portamento: 0.08, volume: -14 }).connect(vib);
  breath = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.08, decay: 0.3, sustain: 0.2, release: 0.4 }, volume: -34 }).connect(new Tone.Filter(2600, 'bandpass').connect(music));
  // tabla: bayan (the low drum, its pitch sliding down) and dayan (the bright one)
  bayan = new Tone.MembraneSynth({ pitchDecay: 0.18, octaves: 3.2, envelope: { attack: 0.002, decay: 0.55, sustain: 0, release: 0.3 }, volume: -10 }).connect(music);
  dayan = new Tone.MembraneSynth({ pitchDecay: 0.012, octaves: 1.4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 }, volume: -15 }).connect(music);
  dayanNoise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.04, sustain: 0 }, volume: -30 }).connect(new Tone.Filter(5000, 'highpass').connect(music));
  // short melodic cues get their own plucked voice, so they never clash with the flute
  pluck = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 0.6 }, volume: -16 }).connect(room);
  // temple bell
  bell = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3.01, modulationIndex: 14, envelope: { attack: 0.001, decay: 2.8, sustain: 0, release: 2.5 }, modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.4 }, volume: -20 }).connect(room);

  const T = Tone.getTransport();
  T.bpm.value = 72;
  let s = 0;
  tanLoop = new Tone.Loop((time) => {
    const notes = mood.kanda === 'lanka' ? [hz(6, -2), hz(0, -1), hz(0, -1), hz(0, -2)] : [hz(7, -2), hz(0, -1), hz(0, -1), hz(0, -2)];
    try { tanpura.triggerAttackRelease(notes[s % 4], 1.6, atPitch('tan', notes[s % 4], time), s % 4 === 0 ? 0.9 : 0.7); } catch { /* dropped */ }
    s++;
  }, '4n');
  // keherwa for fights: dha ge na ti | na ka dhi na
  const theka = [{ b: 'dha', v: 1 }, { b: 'ge', v: 0.6 }, { b: 'na', v: 0.7 }, { b: 'ti', v: 0.5 }, { b: 'na', v: 0.7 }, { b: 'ka', v: 0.5 }, { b: 'dhi', v: 0.9 }, { b: 'na', v: 0.6 }];
  tablaSeq = new Tone.Sequence((time, stroke) => {
    if (mood.intensity !== 'battle' && mood.intensity !== 'boss' && mood.intensity !== 'drums') return;
    const { b, v } = stroke, boss = mood.intensity === 'boss';
    try {
      if (b === 'dha' || b === 'ge' || b === 'dhi') bayan.triggerAttackRelease(boss ? 58 : 66, '8n', at(bayan, time), v);
      if (b !== 'ge') { dayan.triggerAttackRelease(hz(0, 1), '16n', at(dayan, time), v * 0.8); dayanNoise.triggerAttackRelease('64n', at(dayanNoise, time), v * 0.5); }
    } catch { /* a stroke that cannot be placed after a slow frame is dropped */ }
  }, theka, '8n');
  fluteLoop = new Tone.Loop((time) => {
    if (mood.intensity === 'silent' || mood.intensity === 'drums') return;
    const battle = mood.intensity === 'battle' || mood.intensity === 'boss';
    if (!battle && rand() < 0.35) return;
    phrase(time, battle);
  }, '2m');
  tanLoop.start(0); tablaSeq.start(0); fluteLoop.start('1m');
  T.start();
  wire();
  document.addEventListener('visibilitychange', () => { if (document.hidden) T.pause(); else if (ready) T.start(); });
}

/** A bansuri phrase in the raga: a few notes rising and falling, ending on a held note. */
function phrase(time, battle) {
  const sc = RAGAS[mood.kanda] || RAGAS.bala;
  const n = battle ? 6 : 4 + Math.floor(rand() * 3);
  let i = Math.floor(sc.length / 2), t = time;
  const step = battle ? 0.24 : 0.46;
  for (let k = 0; k < n; k++) {
    i = Math.max(0, Math.min(sc.length - 1, i + [-1, 1, 1, -2, 2, -1][Math.floor(rand() * 6)]));
    const last = k === n - 1, d = last ? step * 3.2 : step * (0.8 + rand() * 0.6);
    try { flute.triggerAttackRelease(hz(sc[i], 1), d * 0.95, at(flute, t), mood.intensity === 'grief' ? 0.5 : 0.75); } catch { /* a late note is dropped, never fatal */ }
    try { if (k === 0 || last) breath.triggerAttackRelease(d, at(breath, t), 0.6); } catch { /* as above */ }
    t += d;
  }
}

/** kanda: bala..yuddha or lanka; intensity: calm, battle, boss, grief, silent, drums. */
export function setMood(kanda, intensity = 'calm', force) {
  if (!force && mood.kanda === kanda && mood.intensity === intensity) return;
  mood = { kanda, intensity };
  if (!ready) return;
  const T = Tone.getTransport();
  T.bpm.rampTo(intensity === 'boss' ? 104 : intensity === 'battle' ? 96 : intensity === 'grief' ? 54 : 72, 1.5);
  music.gain.rampTo(intensity === 'silent' ? 0 : 0.5, 1.2);
}

export function applyVolumes() {
  if (!ready) return;
  const s = save.data.settings, m = s.muted ? 0 : 1;
  master.gain.rampTo(0.9 * m, 0.1);
  music.gain.rampTo((s.music ?? 0.6) * 0.8 * m, 0.2);
  sfx.gain.rampTo((s.sfx ?? 0.8) * m, 0.1);
}

// ---------------------------------------------------------------- effects
// The old hand-built recipes, now on Tone's context and through the shared room.
let noiseBuf = null;
const now = () => raw.currentTime;
function env(g, t, a, peak, dec, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(end, t + a + dec); }
function tone(freq, { type = 'sine', at = 0, a = 0.01, dec = 0.5, peak = 0.3, glide = 0, filter = 0, vib = 0 } = {}) {
  const t = now() + at, o = raw.createOscillator(), g = raw.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + a + dec);
  let node = o;
  if (filter) { const f = raw.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
  if (vib) { const l = raw.createOscillator(), lg = raw.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + dec + 0.1); }
  node.connect(g); Tone.connect(g, sfx); env(g, t, a, peak, dec);
  o.start(t); o.stop(t + a + dec + 0.1);
}
function noise({ at = 0, a = 0.01, dec = 0.3, peak = 0.2, freq = 1200, q = 1, type = 'bandpass', sweep = 0 } = {}) {
  if (!noiseBuf) { noiseBuf = raw.createBuffer(1, raw.sampleRate, raw.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = now() + at, s = raw.createBufferSource(), f = raw.createBiquadFilter(), g = raw.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + a + dec);
  s.connect(f); f.connect(g); Tone.connect(g, sfx); env(g, t, a, peak, dec);
  s.start(t); s.stop(t + a + dec + 0.05);
}
function drum(freq, { at = 0, vol = 0.5, dec = 0.25 } = {}) { tone(freq, { at, a: 0.002, dec, peak: vol, glide: 0.45 }); noise({ at, dec: 0.04, peak: vol * 0.3, freq: 3000 }); }
function ring(freq, o = {}) { if (bell) try { bell.triggerAttackRelease(freq, o.dec || 1.5, atPitch('bell', freq, Tone.now() + 0.005 + (o.at || 0)), Math.min(1, (o.vol ?? 0.7))); } catch { /* dropped */ } }
function seq(notes, step, vol) { const t0 = Tone.now() + 0.01; notes.forEach((n, i) => pluck && pluck.triggerAttackRelease(hz(n, 1), step * 1.6, atPitch('pluck', hz(n, 1), t0 + i * step), Math.min(1, vol * 6))); }

const CUES = {
  starBell: () => ring(hz(12, 2), { dec: 0.5, vol: 0.6 }),
  starLow: () => ring(hz(7, 1), { dec: 0.8 }),
  dustRush: () => noise({ freq: 900, dec: 0.45, peak: 0.25, sweep: 2.5 }),
  wingBeat: () => { noise({ freq: 500, dec: 0.08, peak: 0.2 }); noise({ freq: 500, dec: 0.08, peak: 0.2, at: 0.14 }); },
  bowCreak: () => tone(hz(1, 1), { type: 'sawtooth', dec: 0.3, peak: 0.08, glide: 1.3, filter: 1200 }),
  shieldClang: () => ring(hz(4, 2), { dec: 0.3 }),
  chime: () => { ring(hz(11, 2), { dec: 1, vol: 0.5 }); ring(hz(4, 3), { dec: 0.8, vol: 0.4, at: 0.08 }); },
  fireWhoosh: () => noise({ freq: 400, dec: 0.6, peak: 0.25, sweep: 3, type: 'lowpass' }),
  hiss: () => noise({ freq: 6000, dec: 0.5, peak: 0.12, type: 'highpass' }),
  horn: () => tone(hz(0), { type: 'sawtooth', a: 0.1, dec: 0.8, peak: 0.1, filter: 800 }),
  stompWarn: () => ring(hz(0, -1), { dec: 1.6, vol: 0.9 }),
  stompLand: () => { drum(70, { vol: 0.8, dec: 0.4 }); noise({ freq: 200, dec: 0.3, peak: 0.25, type: 'lowpass' }); },
  vanish: () => noise({ freq: 300, dec: 1.0, peak: 0.2, sweep: 5 }),
  inkFade: () => tone(hz(7, 1), { dec: 0.5, peak: 0.06, glide: 0.7 }),
  tink: () => ring(hz(7, 3), { dec: 0.2, vol: 0.4 }),
  drawStart: () => tone(hz(0, 1), { type: 'triangle', dec: 0.08, peak: 0.05 }),
  fullDraw: () => { tone(hz(7, 1), { type: 'triangle', a: 0.02, dec: 0.25, peak: 0.12, glide: 1.5 }); ring(hz(7, 2), { dec: 0.4, vol: 0.3 }); },
  shoot: () => noise({ freq: 2200, dec: 0.12, peak: 0.2, sweep: 0.4 }),
  shootFull: () => { noise({ freq: 1800, dec: 0.25, peak: 0.3, sweep: 0.3 }); tone(hz(0, 2), { dec: 0.2, peak: 0.07 }); drum(90, { vol: 0.25, dec: 0.15 }); },
  hit: () => { drum(220, { vol: 0.32, dec: 0.08 }); noise({ freq: 1400, dec: 0.06, peak: 0.12 }); },
  headshot: () => { drum(260, { vol: 0.32, dec: 0.08 }); ring(hz(12, 2), { dec: 0.4, vol: 0.45 }); },
  hurt: () => { drum(110, { vol: 0.55, dec: 0.2 }); noise({ freq: 700, dec: 0.15, peak: 0.15 }); },
  jump: () => tone(hz(0, 1), { type: 'triangle', dec: 0.12, peak: 0.06, glide: 1.5 }),
  roll: () => noise({ freq: 800, dec: 0.25, peak: 0.12, sweep: 0.5 }),
  kick: () => { drum(180, { vol: 0.35, dec: 0.1 }); noise({ freq: 900, dec: 0.05, peak: 0.1 }); },
  checkpoint: () => { ring(hz(0, 2), { dec: 1.6, vol: 0.6 }); seq([7, 8, 7, 4], 0.3, 0.12); },
  bossIntro: () => { for (let i = 0; i < 10; i++) drum(80 + i * 3, { vol: 0.25 + i * 0.03, dec: 0.12, at: i * 0.08 }); drum(55, { vol: 0.9, at: 0.85, dec: 0.7 }); CUES.conch(); },
  bossDown: () => { ring(hz(0, 1), { dec: 3.5, vol: 1 }); },
  conch: () => { tone(hz(0, -1), { type: 'sawtooth', a: 0.3, dec: 1.6, peak: 0.14, filter: 900, vib: 0.008 }); noise({ freq: 600, a: 0.2, dec: 1.2, peak: 0.05 }); },
  bell: () => ring(hz(0, 2), { dec: 2.4 }),
  bellLow: () => ring(hz(7, 0), { dec: 2.4, vol: 0.9 }),
  bigBell: () => ring(hz(0, 1), { dec: 3.5, vol: 1 }),
  wash: () => seq([0, 4, 5, 7, 8, 11, 12], 0.16, 0.1),
  tap: () => tone(hz(7, 2), { type: 'triangle', dec: 0.05, peak: 0.035 }),
  choose: () => ring(hz(4, 2), { dec: 0.6, vol: 0.5 }),
  astra: () => { tone(hz(0, 1), { type: 'sawtooth', a: 0.05, dec: 1.2, peak: 0.12, glide: 4, filter: 3000 }); ring(hz(0, 2), { dec: 2, at: 0.3 }); ring(hz(7, 2), { dec: 2, at: 0.42 }); },
  astraReady: () => seq([0, 7, 12], 0.1, 0.1),
  enemyShot: () => noise({ freq: 1500, dec: 0.1, peak: 0.08, sweep: 0.5 }),
  gust: () => noise({ freq: 500, a: 0.2, dec: 0.8, peak: 0.25, sweep: 0.4, type: 'lowpass' }),
  drum: () => drum(140, { vol: 0.5 }),
  thud: () => drum(160, { vol: 0.3, dec: 0.12 }),
  fail: () => seq([7, 5, 4, 1], 0.22, 0.1),
  grow: () => { ring(hz([0, 1, 4, 5, 7, 8, 11, 12][Math.floor(rand() * 8)], 2), { dec: 0.9, vol: 0.3 }); },
  win: () => { ring(hz(0, 2), { dec: 2.2 }); seq([0, 4, 7, 8, 7, 11, 12], 0.2, 0.12); },
  curtain: () => { noise({ freq: 400, a: 0.3, dec: 1.4, peak: 0.12, sweep: 0.6, type: 'lowpass' }); },
  clothRoll: () => noise({ freq: 700, a: 0.05, dec: 0.5, peak: 0.08, sweep: 1.6 }),
  step: () => noise({ freq: 300, dec: 0.05, peak: 0.04, type: 'lowpass' }),
};

export function cue(name) { if (!ready || !CUES[name]) return; try { CUES[name](); } catch { /* sound is never fatal */ } }

let wired = false;
function wire() {
  if (wired) return; wired = true;
  bus.on('cue', cue);
  bus.on('enemy:telegraph', (s) => cue(s || 'starBell'));
  bus.on('hero:shoot', (d) => cue(d.full ? 'shootFull' : 'shoot'));
  bus.on('hero:hurt', () => cue('hurt'));
  bus.on('arrow:hit', (d) => cue(d.head ? 'headshot' : 'hit'));
  bus.on('enemy:die', () => cue('inkFade'));
  bus.on('checkpoint', () => cue('checkpoint'));
  bus.on('boss:intro', () => cue('bossIntro'));
  bus.on('boss:die', () => cue('bossDown'));
  bus.on('astra:fire', () => cue('astra'));
  bus.on('astra:ready', () => cue('astraReady'));
  bus.on('ui:tap', () => cue('tap'));
  bus.on('chapter:end', () => cue('win'));
}
