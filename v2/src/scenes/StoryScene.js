// Plays a chapter's Ink script. Lines show in the dialogue box over a painted panel; the tags
// `# walk` and `# battle` hand control to those scenes, which come back here when they finish.
import Phaser from 'phaser';
import { Story } from 'inkjs';
import { W, H } from '../engine/layout.js';
import { Dialogue } from '../engine/ui.js';
import { Controls } from '../engine/controls.js';
import { setDrone } from '../engine/audio.js';
import { applyFinish } from '../fx/finish.js';
import { inkFor } from '../engine/chapters.js';

const MODES = { walk: 'Walk', battle: 'Battle' };

export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }

  init(data) {
    this.chapterId = data.chapter;
    // Resuming after a walk or battle: the same Story object continues where it stopped.
    this.resume = data.resume ? this.registry.get('story.pending') : null;
    if (!data.resume) this.registry.set('story', new Story(inkFor(this.chapterId)));
    this.story = this.registry.get('story');
  }

  create() {
    this.panel = this.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false);
    this.cm = this.cameras.main.filters.internal.addColorMatrix();
    this.dialogue = new Dialogue(this);
    this.controls = new Controls(this);
    this.controls.on('tap', () => this.dialogue.advance());
    if (this.resume) { // show the same picture as before the walk or battle
      const panel = this.registry.get('story.panel'), mood = this.registry.get('story.look');
      if (panel) this.setPanel(panel);
      if (mood) this.look(mood);
    }
    applyFinish(this);
    this.cameras.main.fadeIn(500, 29, 22, 19);
    this.run();
  }

  setPanel(id) {
    if (!this.textures.exists(`panel.${id}`)) return;
    this.registry.set('story.panel', id);
    this.panel.setTexture(`panel.${id}`).setVisible(true);
    this.panel.setScale(Math.max(W / this.panel.width, H / this.panel.height));
    this.panel.setY(H / 2 - 40); // keep faces above the dialogue box
    this.tweens.add({ targets: this.panel, scale: this.panel.scale * 1.06, duration: 24000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  look(mood) {
    this.registry.set('story.look', mood);
    const m = this.cm.colorMatrix; m.reset();
    if (mood === 'dusk') { m.saturate(-0.3); m.brightness(0.94, true); }
    if (mood === 'dawn') { m.saturate(0.25); m.brightness(1.08, true); }
    setDrone(mood);
  }

  /** Apply tags in order; returns the mode to hand over to, with the tags still to apply after it. */
  applyTags(tags) {
    for (let i = 0; i < tags.length; i++) {
      const [cmd, arg] = tags[i].trim().split(/\s+/);
      if (MODES[cmd]) return { mode: MODES[cmd], rest: tags.slice(i + 1) };
      if (cmd === 'panel') this.setPanel(arg);
      if (cmd === 'look') this.look(arg);
    }
    return null;
  }

  async run() {
    const s = this.story;
    if (this.resume) {
      const { line, rest } = this.resume; this.resume = null;
      this.applyTags(rest);
      if (line) await this.dialogue.say(line);
    }
    while (true) {
      while (s.canContinue) {
        const line = s.Continue().trim();
        const hand = this.applyTags(s.currentTags || []);
        if (hand) {
          this.registry.set('story.pending', { line, rest: hand.rest });
          this.dialogue.hide();
          this.cameras.main.fadeOut(400, 29, 22, 19);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(hand.mode, { chapter: this.chapterId }));
          return;
        }
        if (line) await this.dialogue.say(line);
      }
      if (s.currentChoices.length) {
        const i = await this.dialogue.choose(s.currentChoices.map(c => c.text));
        s.ChooseChoiceIndex(i);
        continue;
      }
      break;
    }
    this.cameras.main.fadeOut(700, 29, 22, 19);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Complete', { chapter: this.chapterId }));
  }

  update() { this.controls.update(); }
}
