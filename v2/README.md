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

Left thumb: press and slide to walk, flick up to jump. Right thumb: tap to read or advance; pull
back and release to loose an arrow (the dotted arc shows its flight). Keyboard: A/D walk, W or
Space jump, Enter advances; mouse-drag on the right half aims.

## Stand-ins

Rama and Tataka are cut from the Gemini pilot sheets; portraits and the story panel come from the
reference frame. Lakshmana and Vishvamitra appear only in the panel and dialogue until their art
exists.
