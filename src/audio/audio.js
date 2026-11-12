// All sound is made in the browser with Web Audio: a tanpura-like drone, bells, conch,
// drums and bansuri phrases, tuned to raga Bhairav on a tonic near 147 Hz.
// Sound reacts to events on the bus; nothing else calls into this module except boot,
// settings and the chapter runner (for mood).
import { bus } from '../core/events.js';
import { save } from '../core/save.js';

const SA = 146.83;
// Bhairav: Sa re Ga ma Pa dha Ni (komal re and dha) as semitone offsets
const BHAIRAV = [0, 1, 4, 5, 7, 8, 11, 12];
// a different scale colour per kanda
const RAGAS = {
  bala: { scale: BHAIRAV, tempo: 1, voice: 'bansuri' },
  ayodhya: { scale: [0, 2, 3, 5, 7, 9, 10, 12], tempo: 0.8, voice: 'bansuri' },     // Kafi-like
  aranya: { scale: [0, 2, 4, 7, 9, 12], tempo: 0.9, voice: 'bansuri' },              // Bhupali-like
  kishkindha: { scale: [0, 2, 4, 5, 7, 9, 10, 12], tempo: 1.1, voice: 'sitar' },     // Khamaj-like
  sundara: { scale: [0, 2, 4, 6, 7, 9, 11, 12], tempo: 1.2, voice: 'sitar' },        // Yaman-like
  yuddha: { scale: [0, 1, 3, 5, 7, 8, 10, 12], tempo: 1.2, voice: 'shehnai' },       // Bhairavi-like
  lanka: { scale: [0, 1, 4, 6, 7, 8, 11, 12], tempo: 0.7, voice: 'veena' },          // Marwa-like, restrained
};

let ac = null, master = null, musicBus = null, sfxBus = null, droneNodes = [], noiseBuf = null;
let mood = { kanda: 'bala', intensity: 'calm' }, phraseT = null, started = false;

const hz = (semi, oct = 0) => SA * Math.pow(2, semi / 12 + oct);

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.connect(master);
  applyVolumes();
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; // audio noise only; not gameplay
  started = true;
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
  wire();
}

export function applyVolumes() {
  if (!ac) return;
  const s = save.data.settings;
  const muted = s.muted ? 0 : 1;
  musicBus.gain.setTargetAtTime(s.music * 0.55 * muted, ac.currentTime, 0.1);
  sfxBus.gain.setTargetAtTime(s.sfx * 0.9 * muted, ac.currentTime, 0.05);
}

function env(g, t, a, peak, dec, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + dec);
}

function tone(freq, { type = 'sine', at = 0, a = 0.01, dec = 0.5, peak = 0.3, out = sfxBus, detune = 0, vib = 0, glide = 0, filter = 0 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t + a + dec);
  const g = ac.createGain(); env(g, t, a, peak, dec);
  let node = o;
  if (vib) { const l = ac.createOscillator(); l.frequency.value = 5.2; const lg = ac.createGain(); lg.gain.value = freq * vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + dec + 0.1); }
  if (filter) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
  node.connect(g); g.connect(out);
  o.start(t); o.stop(t + a + dec + 0.1);
}

function noise({ at = 0, a = 0.01, dec = 0.3, peak = 0.2, freq = 1200, q = 1, type = 'bandpass', out = sfxBus, sweep = 0 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + a + dec);
  const g = ac.createGain(); env(g, t, a, peak, dec);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t); s.stop(t + a + dec + 0.1);
}

const bell = (f, o = {}) => { for (const [k, p] of [[1, 0.3], [2.76, 0.12], [5.4, 0.06]]) tone(f * k, { dec: (o.dec || 1.6) / k, peak: p * (o.vol || 1), at: o.at || 0 }); };
const drum = (f, o = {}) => { tone(f, { glide: 0.5, dec: o.dec || 0.25, peak: o.vol || 0.5, at: o.at || 0 }); noise({ freq: 300, dec: 0.06, peak: 0.08 * (o.vol || 1), at: o.at || 0 }); };

export const CUES = {
  starBell: () => bell(hz(12, 2), { dec: 0.4, vol: 0.8 }),
  starLow: () => bell(hz(7, 1), { dec: 0.6 }),
  dustRush: () => noise({ freq: 900, dec: 0.45, peak: 0.25, sweep: 2.5 }),
  wingBeat: () => { noise({ freq: 500, dec: 0.08, peak: 0.2 }); noise({ freq: 500, dec: 0.08, peak: 0.2, at: 0.14 }); },
  bowCreak: () => tone(hz(1, 1), { type: 'sawtooth', dec: 0.3, peak: 0.08, glide: 1.3, filter: 1200 }),
  shieldClang: () => bell(hz(4, 2), { dec: 0.25 }),
  chime: () => { bell(hz(11, 2), { dec: 0.8, vol: 0.5 }); bell(hz(4, 3), { dec: 0.6, vol: 0.4, at: 0.08 }); },
  scrabble: () => { for (let i = 0; i < 4; i++) noise({ freq: 2500, dec: 0.03, peak: 0.12, at: i * 0.05 }); },
  fireWhoosh: () => noise({ freq: 400, dec: 0.6, peak: 0.25, sweep: 3, type: 'lowpass' }),
  trumpet: () => tone(hz(8, 1), { type: 'sawtooth', a: 0.05, dec: 0.6, peak: 0.12, glide: 1.4, filter: 2000 }),
  hiss: () => noise({ freq: 6000, dec: 0.5, peak: 0.12, type: 'highpass' }),
  horn: () => tone(hz(0), { type: 'sawtooth', a: 0.1, dec: 0.8, peak: 0.1, filter: 800 }),
  stompWarn: () => bell(hz(0, -1), { dec: 1.4, vol: 1.2 }),
  stompLand: () => { drum(70, { vol: 0.8, dec: 0.4 }); noise({ freq: 200, dec: 0.3, peak: 0.25, type: 'lowpass' }); },
  vanish: () => noise({ freq: 300, dec: 1.0, peak: 0.2, sweep: 5 }),
  thud: () => drum(160, { vol: 0.3, dec: 0.12 }),
  thudLow: () => drum(90, { vol: 0.4, dec: 0.2 }),
  inkFade: () => tone(hz(7, 1), { dec: 0.5, peak: 0.06, glide: 0.7 }),
  tink: () => bell(hz(7, 3), { dec: 0.15, vol: 0.4 }),
  drawStart: () => tone(hz(0, 1), { type: 'triangle', dec: 0.08, peak: 0.05 }),
  fullDraw: () => tone(hz(7, 1), { type: 'triangle', a: 0.02, dec: 0.25, peak: 0.12, glide: 1.5 }),
  shoot: () => noise({ freq: 2200, dec: 0.12, peak: 0.18, sweep: 0.4 }),
  shootFull: () => { noise({ freq: 1800, dec: 0.22, peak: 0.25, sweep: 0.3 }); tone(hz(0, 2), { dec: 0.2, peak: 0.06 }); },
  hit: () => drum(220, { vol: 0.25, dec: 0.08 }),
  headshot: () => { drum(260, { vol: 0.25, dec: 0.08 }); bell(hz(12, 2), { dec: 0.3, vol: 0.5 }); },
  hurt: () => { drum(110, { vol: 0.5, dec: 0.2 }); noise({ freq: 700, dec: 0.15, peak: 0.15 }); },
  jump: () => tone(hz(0, 1), { type: 'triangle', dec: 0.12, peak: 0.06, glide: 1.5 }),
  roll: () => noise({ freq: 800, dec: 0.25, peak: 0.1, sweep: 0.5 }),
  kick: () => drum(180, { vol: 0.3, dec: 0.1 }),
  checkpoint: () => { bell(hz(0, 2), { dec: 1.2, vol: 0.6 }); phrase([7, 8, 7, 4], 0.3, 0.18); },
  bossIntro: () => { for (let i = 0; i < 10; i++) drum(80 + i * 3, { vol: 0.25 + i * 0.03, dec: 0.12, at: i * 0.08 }); drum(60, { vol: 0.8, at: 0.85, dec: 0.6 }); },
  bossDown: () => { stopMusic(1.5); },
  conch: () => { tone(hz(0, -1), { type: 'sawtooth', a: 0.25, dec: 1.4, peak: 0.12, filter: 900, vib: 0.01 }); noise({ freq: 600, a: 0.2, dec: 1.2, peak: 0.05 }); },
  bell: () => bell(hz(0, 2), { dec: 2.2 }),
  bigBell: () => { bell(hz(0, 1), { dec: 3.5, vol: 1.2 }); },
  wash: () => phrase([0, 4, 5, 7, 8, 11, 12], 0.16, 0.14),
  tap: () => tone(hz(7, 2), { type: 'triangle', dec: 0.05, peak: 0.04 }),
  choose: () => bell(hz(4, 2), { dec: 0.5, vol: 0.5 }),
  astra: () => { tone(hz(0, 1), { type: 'sawtooth', a: 0.05, dec: 1.2, peak: 0.12, glide: 4, filter: 3000 }); bell(hz(0, 2), { dec: 1.5, at: 0.3 }); },
  astraReady: () => phrase([0, 7, 12], 0.1, 0.14),
  enemyShot: () => noise({ freq: 1500, dec: 0.1, peak: 0.08, sweep: 0.5 }),
  headFall: () => { drum(120, { vol: 0.4 }); bell(hz(1, 1), { dec: 0.8, vol: 0.5 }); },
  headGrow: () => tone(hz(1, 1), { type: 'sawtooth', dec: 0.5, peak: 0.06, glide: 1.5, filter: 900 }),
  gust: () => noise({ freq: 500, a: 0.2, dec: 0.8, peak: 0.25, sweep: 0.4, type: 'lowpass' }),
  drum: () => drum(140, { vol: 0.5 }),
  drumHigh: () => drum(320, { vol: 0.3, dec: 0.1 }),
  splash: () => noise({ freq: 1800, dec: 0.3, peak: 0.15, sweep: 0.5 }),
  thunder: () => { noise({ freq: 120, a: 0.02, dec: 1.6, peak: 0.6, type: 'lowpass' }); drum(50, { vol: 1, dec: 0.8 }); },
  fail: () => phrase([7, 5, 4, 1], 0.22, 0.12),
  coin: () => bell(hz(11, 2), { dec: 0.4, vol: 0.5 }),
  win: () => { bell(hz(0, 2), { dec: 2 }); phrase([0, 4, 7, 8, 7, 11, 12], 0.2, 0.18); },
};

function phrase(notes, step, vol, voice) {
  const v = voice || (RAGAS[mood.kanda] || RAGAS.bala).voice;
  notes.forEach((n, i) => {
    const f = hz(n, 1);
    if (v === 'bansuri') { tone(f, { type: 'sine', a: 0.06, dec: step * 1.6, peak: vol, at: i * step, vib: 0.006 }); noise({ freq: f * 2, dec: step, peak: vol * 0.05, at: i * step }); }
    else if (v === 'sitar' || v === 'veena') { tone(f, { type: 'sawtooth', a: 0.005, dec: step * (v === 'veena' ? 3 : 2), peak: vol * 0.6, at: i * step, filter: 2400 }); tone(f * 2.01, { type: 'sine', dec: step, peak: vol * 0.2, at: i * step }); }
    else tone(f, { type: 'square', a: 0.04, dec: step * 1.4, peak: vol * 0.35, at: i * step, vib: 0.008, filter: 1800 });
  });
}

function stopDrone(fade = 0.8) {
  if (!ac) return;
  for (const n of droneNodes) { try { n.g.gain.setTargetAtTime(0.0001, ac.currentTime, fade / 3); n.o.stop(ac.currentTime + fade + 0.2); } catch { /* already stopped */ } }
  droneNodes = [];
}
function stopMusic(fade = 0.8) { stopDrone(fade); clearTimeout(phraseT); phraseT = null; }

function startDrone() {
  if (!ac) return;
  stopDrone(0.4);
  const m = mood;
  if (m.intensity === 'silent') return;
  const lanka = m.kanda === 'lanka';
  const notes = lanka ? [[0, -1], [6, -1], [0, 0]] : [[7, -1], [0, 0], [0, 0], [0, -1]];
  notes.forEach(([s, oc], i) => {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(s, oc); o.detune.value = (i - 1.5) * 3;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520 + i * 90;
    const g = ac.createGain(); g.gain.value = 0.0001;
    const pulse = ac.createOscillator(); pulse.frequency.value = 0.25 + i * 0.07; const pg = ac.createGain(); pg.gain.value = 0.012;
    pulse.connect(pg); pg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(musicBus);
    const lvl = m.intensity === 'grief' ? 0.025 : lanka ? 0.03 : 0.04;
    g.gain.setTargetAtTime(lvl, ac.currentTime, 0.8);
    o.start(); pulse.start();
    droneNodes.push({ o, g }); droneNodes.push({ o: pulse, g });
  });
  schedulePhrase();
}

function schedulePhrase() {
  clearTimeout(phraseT);
  const r = RAGAS[mood.kanda] || RAGAS.bala;
  const battle = mood.intensity === 'battle';
  const gap = (mood.intensity === 'grief' ? 9000 : battle ? 2600 : 6000) / r.tempo;
  phraseT = setTimeout(() => {
    if (!ac || document.hidden) { schedulePhrase(); return; }
    const sc = r.scale, n = battle ? 6 : 4;
    const notes = []; let idx = Math.floor(sc.length / 2);
    for (let i = 0; i < n; i++) { idx = Math.max(0, Math.min(sc.length - 1, idx + [-1, 1, 1, -2, 2][Math.floor((Date.now() / 7 + i * 3) % 5)])); notes.push(sc[idx]); }
    if (battle) { for (let i = 0; i < 8; i++) drum(i % 4 === 0 ? 90 : 170, { vol: i % 4 === 0 ? 0.22 : 0.1, dec: 0.12, at: i * 0.22 }); }
    if (mood.intensity !== 'drums') phrase(notes, battle ? 0.22 : 0.42, mood.intensity === 'grief' ? 0.07 : 0.1);
    schedulePhrase();
  }, gap);
}

/** kanda: bala..yuddha or lanka; intensity: calm, battle, grief, silent, drums. */
export function setMood(kanda, intensity = 'calm') {
  if (mood.kanda === kanda && mood.intensity === intensity && droneNodes.length) return;
  mood = { kanda, intensity };
  if (started) startDrone();
}

export function cue(name) { if (!ac || !CUES[name]) return; try { CUES[name](); } catch { /* audio failure is never fatal */ } }

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
  bus.on('hub:paint', () => cue('wash'));
  bus.on('ui:tap', () => cue('tap'));
  bus.on('chapter:start', (c) => { cue(c.type === 'lanka' ? 'drum' : 'conch'); });
  bus.on('chapter:end', () => cue('win'));
}
