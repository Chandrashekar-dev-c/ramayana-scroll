# Ramayana Scroll v2

The fresh-start build (design plan: "Ramayana Scroll — Fresh Start Design Plan"). One complete
chapter, Tataka's Wasteland, built as the template every other chapter follows.

```
npm install
npm run dev            # http://localhost:5173   (?scene=Battle or ?scene=Walk jumps straight in)
npm run build && npm run preview
node tools/playtest.mjs out/   # plays the whole chapter in headless Chrome, saves screenshots
```

## How a chapter is made

A chapter is two files; no chapter-specific code beyond a boss's moves:

| File | What it holds |
| --- | --- |
| `content/ink/<id>.ink` | The story, in Ink. Lines are `SPEAKER: words`. Tags hand control to the game: `# panel <id>`, `# look dusk/dawn`, `# walk`, `# battle` |
| `content/chapters/<id>.json` | Tuning for that chapter's walk (length, marks to read, end trigger) and battle (boss, hearts, phases, move timings, arrow physics) |

Images are referred to by id in `content/assets.json`, so replacing a stand-in with final art is a
one-line change. Backdrop layers without a file are painted in code (`src/art/backdrops.js`).

## Layout

| Path | Role |
| --- | --- |
| `src/scenes/` | Boot, Title, Story (runs Ink), Walk, Battle, Complete |
| `src/engine/` | Controls (one scheme for all modes), dialogue and HUD, audio, asset registry, chapter registry |
| `src/art/` | Placeholder backdrops and the parallax stage with the land-healing effect |
| `src/fx/finish.js` | The shared paint finish laid over every scene (tune it here) |

## Controls

The first game's scheme. Move thumb (left): press and slide to walk, flick up to jump, flick
down to roll. Bow thumb (right): tap to read or advance; **hold** to draw. A ring fills around
Rama as he draws; drag up or down to angle the shot. Release early for a quick arrow (1 damage) or
at full draw, when the ring turns gold and the flight shows in rice-paste dots, for a heavy one
(3 damage, flies flatter). Head hits count double. Settings (pause button) swap the thumbs, add aim
help, set difficulty, vibration, sound and screen shake. Keyboard: A/D walk, W jump, S roll,
hold J to draw (Up aims higher), Enter advances, Esc pauses. Mouse: hold the button and point.

## Adding a boss

A boss is `src/bosses/<id>.js` (one function per move: telegraph, act, call `done()`) plus its
moves, phases and timings in the chapter JSON. The battle scene supplies the helpers: `mark`
(ground warning), `teach` (first-time prompt with slow motion), `hazard`, `hurt`, `pose`, `puff`,
`impact`, `shake`. Difficulty scales every telegraph through `t()`.

## The whole game

`content/chapters/index.json` lists all 47 chapters in story order (from the first game), each
`playable`, `planned` or `undecided`. The Chapters screen shows them all; a chapter lights up as
soon as its JSON and Ink script exist.

## Stand-ins

Rama and Tataka are cut from the Gemini pilot sheets; portraits and the story panel come from the
reference frame. Lakshmana and Vishvamitra appear only in the panel and dialogue until their art
exists.
