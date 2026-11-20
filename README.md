# Ramayana Scroll

The Ramayana staged as a village Ramlila, its characters painted in the Mithila manner and
told after Valmiki, with reverence. Landscape, phone-first, English (version 1).

**This branch is the overhaul (v2).** Phases 1 and 2 are done: the new engine, and the
first four chapters of the Bala Kanda (the sage at the gate, the road and the mantras, Tataka,
the guarding of the yajna) staged at final quality. The other 42 chapters are migrated to the
new story format and are restaged in Phase 4. The v1 game stays live on `master` until the
overhaul is merged.

## Run it

```
npm install
npm run dev        # compiles the Ink chapters, then http://localhost:5173 (?chapter=tataka jumps in, ?debug shows fps)
npm run build      # compiles chapters, checks the data, bundles to dist/, reports size
npm run preview    # serves dist/ on :4173
npm run smoke      # plays the four staged chapters end to end in headless Chrome (needs preview running)
npm test           # unit tests: save, randomness, astra grading, pose blending, every chapter compiles and plays
npm run migrate    # (one-time) rebuilds content/ink from the old scripts; keeps hand-staged files unless --force
```

## How it is built

- **Two canvases.** PixiJS (WebGL) draws the painted world: backdrops, figures, props, lamp
  light, particles and colour grading. A transparent 2D "ink" canvas on top carries what is
  drawn by hand every frame: warnings on the ground, targets, arrows and the HUD.
- **The art is still drawn in code.** Every figure, motif, backdrop and border comes from
  the original ink module and character data (`src/art`, `src/data/characters.json`). The GPU
  composites painted canvases; nothing is an image file.
- **Live figures** (`src/gfx/live.js`). Poses are joint angles (`src/art/poses.js`); a figure
  blends between them, breathes, blinks and nods while it speaks. Each in-between is painted
  once and cached as a texture.
- **The painted scene** (`src/stage/scene.js`) takes the best technique from several traditions,
  each where it serves the moment:
  - *Mithila* line and figures: the character designs, double outline and patterns
  - a *Pahari miniature* folio: the page frame with its floral margin and red rules
  - *pop-up paper book* depth: the place is three cut-paper planes that rise from the fold and
    slide at different speeds as the eye moves
  - *shadow-theatre* light and motion: brightness is the number of lamps lit, never a blue
    filter; figures hold 12 fps drawings, tremble slightly in the puppeteer's hand, and freeze
    on a drum stroke
  - *watercolour* washes for dawn, river and distance; *firefly* points of gold for mantras;
    *gilded illumination* (a gold-leaf nimbus) for the divine
  - a director's camera: crash zooms on percussion (`>> strike`), slow pans for journeys
    (`>> pan`), and a pull back into the dark at a chapter's end
  - in battle, a *woodcut* frame (carved black on paper) for a beat on heavy blows and the
    fall of a boss
  The old Ramlila stage (`src/stage/stage.js`) is kept for reference.
- **Chapters are Ink screenplays** (`content/ink/*.ink`), compiled at build time:

  ```
  Ayodhya, on the river Sarayu.                    narration
  VISHVAMITRA: Give me your eldest son, Rama.       dialogue
  >> enter vishvamitra from right to 0.78 in 2.4    a stage direction
  >> battle tataka                                  leave the stage for the open field
  * ["Take him, with my blessing."]                 a choice (Ink)
  ```

  The full list of directions is at the top of `src/story/director.js`. `npm run ink`
  checks every direction in the staged chapters against the known characters, poses,
  backdrops and levels.
- **Combat keeps the original rules** (`src/battle`): data-driven enemies, bosses with one
  rule each, telegraphs, checkpoints, astras. The GPU view adds impact sparks, dust, petals,
  flashes, the dusk grade in Tataka's second phase, and the land healing outward in a soft
  circle of colour when she falls.
- **Music** (`src/audio/music.js`, Tone.js): a tanpura cycle, bansuri phrases in each kanda's
  raga, tabla thekas in fights, temple bells and conch, all through one reverb.
- **Tweens run on the game's clock** (GSAP driven by the loop), so pausing pauses the stage.

The previous engine is kept in `legacy/` for reference while the remaining chapters are
restaged; it is not built.

## Open items for the owner

- **Sita's trial by fire (Agni Pariksha)** is still a placeholder; nothing is built until you decide.
- **Sarga references** in the chapter notes are marked "(verify)".
- **Mini-games** from the old game (17 kinds) are trimmed to a smaller set in Phase 4; until
  then a migrated chapter shows a note where its game will be.
- **Release** (Play Store, price, date) stays deferred.
