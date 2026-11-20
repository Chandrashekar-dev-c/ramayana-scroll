// Tataka's moves (Valmiki: she raised dust, rained stones and made herself invisible).
// A boss module gives each move a function (battle, cfg, done). It telegraphs, acts through the
// battle's helpers, and calls done() when finished. Timings come from the chapter JSON and are
// scaled by the difficulty setting (battle.t(seconds)).
import Phaser from 'phaser';


export default {
  id: 'tataka',
  name: 'Tataka',
  // pose roles -> pose images (char.tataka.default.<pose>); missing images fall back automatically
  poses: { idle: 'stand', windup: 'raise', slam: 'slam', stride: 'stride', summon: 'summon', strike: 'lunge', rise: 'rise', dazed: 'dazed' },

  /** Stamp: a shockwave rolls along the ground. The lotus under the hero means: jump. */
  stomp(b, cfg, done) {
    const tel = b.t(cfg.telegraph);
    b.pose('windup'); b.sfx.stompWarn();
    b.tweens.add({ targets: b.boss, y: b.FEET - 34, duration: tel * 1000, ease: 'Sine.easeOut' });
    b.mark(b.h.x, 'lotus', tel + 0.6);
    b.teach('stomp', 'Jump!');
    b.time.delayedCall(tel * 1000, () => {
      if (b.over) return done();
      b.boss.y = b.FEET; b.pose('slam'); b.time.delayedCall(350, () => !b.over && b.pose('idle')); b.sfx.stomp(); b.shake(320, 0.014); b.buzz(60);
      const dir = b.h.x < b.boss.x ? -1 : 1;
      b.impact(b.boss.x + dir * 80, b.FEET - 10, true);
      const wave = b.dust(b.boss.x, b.FEET - 40, 120).setDepth(57); wave.setScale(wave.scaleX * 1.6, wave.scaleY * 0.7);
      b.hazard(dt => {
        wave.x += dir * cfg.wave_speed * dt; wave.angle += dir * 220 * dt;
        if (Math.abs(wave.x - b.h.x) < 58 && b.h.y > b.FEET - 70) b.hurt(cfg.damage);
        if (wave.x < -150 || wave.x > b.view.w + 150) { wave.destroy(); return false; }
        return true;
      }, wave);
      b.time.delayedCall(500, done);
    });
  },

  /** She rains stones: shadow-stars mark where they will land. */
  stones(b, cfg, done) {
    const tel = b.t(cfg.telegraph);
    b.pose('summon'); b.sfx.stonesWarn();
    const n = Phaser.Math.Between(cfg.count[0], cfg.count[1]);
    const xs = [Phaser.Math.Clamp(b.h.x + Phaser.Math.Between(-30, 30), 60, b.boss.x - 160)];
    for (let tries = 0; xs.length < n && tries < 60; tries++) {
      const x = Phaser.Math.Between(60, b.boss.x - 170);
      if (xs.every(o => Math.abs(o - x) > 120)) xs.push(x);
    }
    xs.forEach(x => b.mark(x, 'star', tel + 0.45));
    b.teach('stones', 'Step off the stars!');
    b.time.delayedCall(tel * 1000, () => {
      xs.forEach((x, i) => b.time.delayedCall(i * 70, () => {
        if (b.over) return;
        const st = b.stone(x, -60).setDepth(58);
        b.sfx.stoneFall();
        b.tweens.add({ targets: st, y: b.FEET - 30, angle: 220, duration: 420, ease: 'Quad.easeIn', onComplete: () => {
          b.sfx.stoneLand(); b.puff(x, b.FEET - 40, 0.5);
          if (Math.abs(b.h.x - x) < 64 && b.h.y > b.FEET - 150) b.hurt(cfg.damage);
          b.tweens.add({ targets: st, alpha: 0, delay: 300, duration: 300, onComplete: () => st.destroy() });
        } });
      }));
      b.time.delayedCall(700, () => { b.pose('idle'); done(); });
    });
  },

  /** Come too close and she lunges with her claws. */
  swipe(b, cfg, done) {
    const tel = b.t(cfg.telegraph), dir = b.h.x < b.boss.x ? -1 : 1, home = b.boss.x;
    b.sfx.swipeWarn(); b.teach('swipe', 'Back away!');
    b.tweens.add({ targets: b.boss, x: home - dir * 40, duration: tel * 1000, ease: 'Sine.easeOut' });
    b.time.delayedCall(tel * 1000, () => {
      if (b.over) return done();
      b.pose('strike', dir > 0 ? 'right' : 'left'); b.sfx.swipe();
      b.tweens.add({ targets: b.boss, x: home + dir * 130, duration: 140, yoyo: true, hold: 120,
        onComplete: () => { b.boss.x = home; b.pose('idle'); done(); } });
      b.time.delayedCall(140, () => { if (Math.abs(b.h.x - (home + dir * 130)) < cfg.reach * 0.6) b.hurt(cfg.damage); });
    });
  },

  /** She vanishes into her dust and rises under the hero. The shadow-star stops following just before. */
  vanish(b, cfg, done) {
    const tel = b.t(cfg.telegraph);
    b.sfx.vanish(); b.gone(true);
    for (let i = 0; i < 6; i++) b.puff(b.boss.x + Phaser.Math.Between(-120, 120), b.FEET - Phaser.Math.Between(60, 380), 0.5, 1100);
    b.tweens.add({ targets: b.boss, alpha: 0, duration: 500 });
    const star = b.mark(b.h.x, 'star', tel);
    b.teach('vanish', 'Move away from the star!');
    const follow = b.time.addEvent({ delay: 16, loop: true, callback: () => { star.x = Phaser.Math.Linear(star.x, b.h.x, 0.06); } });
    b.time.delayedCall(tel * 0.65 * 1000, () => follow.remove());
    b.time.delayedCall(tel * 1000, () => {
      if (b.over) return done();
      const x = Phaser.Math.Clamp(star.x, 160, b.view.w - 160);
      b.boss.x = x; b.boss.y = b.FEET + 200; b.boss.alpha = 1; b.gone(false);
      b.pose('rise'); b.sfx.rise(); b.shake(360, 0.016); b.buzz(80);
      b.impact(x, b.FEET - 40, true);
      b.tweens.add({ targets: b.boss, y: b.FEET, duration: 260, ease: 'Back.easeOut' });
      if (Math.abs(b.h.x - x) < 110) b.hurt(cfg.damage);
      b.time.delayedCall(450, () => !b.over && b.pose('dazed'));
      b.time.delayedCall(b.t(cfg.vulnerable, true) * 1000, () => { // dazed, then she strides home
        if (b.over) return done();
        b.pose('stride');
        b.tweens.add({ targets: b.boss, x: b.home, duration: 900, ease: 'Sine.easeInOut',
          onComplete: () => { b.pose('idle'); done(); } });
      });
    });
  },
};
