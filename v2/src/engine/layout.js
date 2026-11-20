// Design height is fixed at 720; the width grows with the phone (Phaser Scale.EXPAND), from 1280
// on a 16:9 screen to about 1560 on a tall phone. Lay things out against view(scene), not a constant.
export const W = 1280;
export const H = 720;
export const GROUND_Y = 600; // feet line for walk and battle
export const HUMAN_PX = 330; // on-screen height of an average man (height 1.0)

/** The current visible size: { w, h, cx, cy }. */
export const view = scene => { const w = scene.scale.width, h = scene.scale.height; return { w, h, cx: w / 2, cy: h / 2 }; };

// The game's pigment palette (same names as the art prompts).
export const PAL = {
  cream: 0xf2e4c3, paper: 0xf8efd9, black: 0x1d1613, indigo: 0x28367c, turmeric: 0xe6ac17,
  gold: 0xc8921f, kusum: 0xcf2a1c, madder: 0x96283a, saffron: 0xe58a1f, leaf: 0x3f8038,
  ochre: 0xc78c2e, earth: 0x9c6a3a, brown: 0x754527, violet: 0x6d5a7e, dusk: 0x8a4a3a, white: 0xfbf5e4,
};
export const FONT = { serif: 'Georgia, "Times New Roman", serif', sans: 'system-ui, sans-serif' };
