# Ramayana Scroll

The whole Ramayana as a playable wall painting, inspired by Madhubani art and told after
Valmiki, with reverence. Landscape, phone-first, offline, English (version 1).

46 chapters: 40 of Rama's story and 6 Lanka chapters woven in, in the corrected story
order from the "Chapter beats" tab. Every place on the painted house wall fills with colour
as its chapters are finished.

## Run it

```
npm install
npm run dev        # http://localhost:5173  (?debug shows fps; ?chapter=tataka jumps in; ?hub opens the wall)
npm run build      # rebuilds content, runs every check, bundles to dist/, reports size
npm run preview    # serves dist/ on :4173
npm run smoke      # plays every chapter in headless Chrome (needs preview running)
```

`dist/` is a static site: copy it to any web host. It installs as a PWA and plays offline.

## How it is built

- **No engine, no image files.** Every figure, motif, backdrop and border is drawn in code
  through one ink module (`src/art/ink.js`): seeded wobble, a nib that swells and thins,
  the Mithila double outline. Characters are data (`src/data/characters.json`) drawn by one
  figure renderer; the design sheet (`dev/sheet.html`, and the making-of gallery) shows all
  70 in a line-up.
- **One chapter system.** A chapter is a script of beats (`src/data/scripts/*.json`) that
  the runner plays: scene beats, small interactions, trials and battles.
- **Data-driven combat.** Enemies, bosses, the ten heads and all tuning numbers live in
  `src/data/*.json`. Each boss has one rule, kept as a small documented hook in
  `src/play/bosses.js`.
- **Event bus, seeded randomness, fixed 60 Hz step, versioned save with migrations,
  text keyed by stable ids.** No monkey-patching.

## Content pipeline

Chapter text and scripts are authored in `content/legacy/` (scripts, levels, chapter list,
places, English text), plus `content/extra.json` (engine text) and `content/levels.json`.
`npm run content` converts them into the runtime data in `src/data/` and `src/i18n/en.json`.
Edit `content/`, not the generated files.

## Checks (all run before every build)

| Tool | Fails when |
|---|---|
| `tools/validate-data.mjs` | unknown character, enemy, boss, backdrop, prop, interaction, trial or label; a pattern shared by two named characters |
| `tools/i18n-check.mjs` | a key used by code or data is missing in English, or in any language marked final |
| `tools/notes-check.mjs` | a chapter has no source entry (Valmiki reference, claim, later-tradition flag) |
| `tools/size-report.mjs` | the shipped game exceeds 400 KB |
| `tools/smoke-test.mjs` | any chapter fails to finish, any JS error, any failed request |

## Open items for the owner

- **Sita's trial by fire (Agni Pariksha)** is a non-playable placeholder (`agni` in
  `src/data/chapters.json`) between chapters 38 and 39. Nothing is built until you decide.
- **Sarga references** in every chapter note are marked "(verify)" and need checking
  against a critical edition; no chapter has a named reviewer yet.
- **Languages:** Hindi, Kannada, Telugu, Tamil and Sanskrit are drafts and hidden. Try
  loading with `?lang=hi`.
- **Sound** is synthesised (raga Bhairav and a raga colour per kanda) and needs tuning by ear.
- **The Ravana Scroll** door appears on the wall after the coronation; the chapters
  themselves are not in version 1.
- **Release** (Play Store, price, date) is deferred, as decided; the paywall flag in
  `tuning.json` is off.
