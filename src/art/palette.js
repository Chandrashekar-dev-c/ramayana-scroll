// Natural pigments only: plants, soot and earth. No neon, gradients, glow or soft shadows.
// The colour language (who may use which pigment) is in the brief, Rule B.
export const PAL = {
  cream: '#f2e4c3',      // unpainted wall: empty, safe space
  paper: '#f8efd9',      // plates behind text
  wash: '#e9d5a8',       // cow-dung wash blotches
  washDark: '#dcc48f',
  black: '#1c140d',      // lampblack, warm as soot ink is (never pure black)
  indigo: '#2c3a76',     // Rama and the player's own arrows (a dusty plant indigo)
  indigoLight: '#4c62b4',
  turmeric: '#e6ac17',   // allies and anything usable
  gold: '#c8921f',
  kusum: '#cf2a1c',      // danger only: blows, zones, enemy projectiles
  madder: '#96283a',     // character red (never used for danger marks)
  orange: '#dc6426',     // Hanuman
  saffron: '#e58a1f',
  leaf: '#3f8038',       // safe ground, healing
  green: '#2f6b3d',
  rakshasa: '#26382c',   // lampblack with green
  rakshasaLight: '#3d5a45',
  pink: '#d9788d',
  terracotta: '#b4532c',
  brown: '#754527',
  earth: '#9c6a3a',
  ochre: '#c78c2e',
  grey: '#8d877a',
  stone: '#a9a495',
  storm: '#5b6471',
  iron: '#6c6f75',
  white: '#fbf5e4',      // rice paste
  river: '#3c7fa8',
  deepBlue: '#1c2a60',
  skin: '#dba973',
  skinDark: '#b07a4a',
  skinPale: '#ecc998',
  night: '#1f2a5e',      // indigo ground for night scenes
  nightLine: '#8fa0de',
};

/** Resolve a palette name or pass a raw colour through. */
export function col(name) { return PAL[name] || name; }

/** Shifted rakshasa palettes so armies feel local to each kanda. */
export const RAKSHASA_ACCENTS = {
  bala: ['ochre', 'terracotta', 'grey', 'pink'],
  ayodhya: ['ochre', 'terracotta', 'grey', 'pink'],
  aranya: ['leaf', 'ochre', 'earth', 'terracotta'],
  kishkindha: ['earth', 'ochre', 'stone', 'terracotta'],
  sundara: ['gold', 'terracotta', 'grey', 'ochre'],
  yuddha: ['gold', 'terracotta', 'gold', 'iron'],
};
