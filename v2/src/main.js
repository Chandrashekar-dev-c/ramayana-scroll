import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { WalkScene } from './scenes/WalkScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { CompleteScene } from './scenes/CompleteScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { ChaptersScene } from './scenes/ChaptersScene.js';
import { W, H } from './engine/layout.js';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#1d1613',
  // EXPAND: height stays 720, width grows to fill tall phones, so there are no black bars.
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  fps: { target: 60 },
  scene: [BootScene, TitleScene, ChaptersScene, StoryScene, WalkScene, BattleScene, CompleteScene, PauseScene],
});

// For automated play-tests (tools/playtest.mjs): exposes the game in dev and with ?test.
if (import.meta.env.DEV || new URLSearchParams(location.search).has('test')) window.__game = game;
