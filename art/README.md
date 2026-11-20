# Character art pipeline

All 70 characters' images are described in one generated manifest, so prompts, file paths and the game's code always agree.

```
src/data/characters.json  ─┐
tools/art/identity.json   ─┴─► tools/art/build-art-prompts.mjs ─► art/prompts.json (+ .jsonl)
                                                                    │
                          Gemini (GEMINI_TASK.md, or tools/art/run-gemini.mjs) ◄┘
                                                                    │
                                     art/raw/characters/<id>/<stage>/*.png
```

## Files

| Path | What it is |
| --- | --- |
| `art/prompts.json` | The manifest: shared style, conventions, and one entry per image |
| `art/prompts.jsonl` | Same jobs, one per line, for batch tools |
| `art/GEMINI_TASK.md` | The brief to hand Gemini |
| `art/reference/tataka-frame.png` | The quality and style reference |
| `art/raw/characters/<id>/<stage>/` | Generated images: `sheet.png`, `rig.png`, `head-<rasa>.png`, `prop.png` |
| `tools/art/identity.json` | Who each character is, and their tier |
| `tools/art/build-art-prompts.mjs` | Builds the manifest from the game data |
| `tools/art/run-gemini.mjs` | Optional: runs the jobs through the Gemini API from your machine |

## What gets generated

| Kind | Per character and stage | Used for |
| --- | --- | --- |
| `sheet` | 3 poses of the same figure (tier C: 3 different individuals) | Locks the design; reference for everything else |
| `rig` | 1 neutral pose, limbs apart | Cut into the parts listed in `rigParts` for puppet animation |
| `head` | 9 rasas (tier A), 3 (tier B: shanta, raudra, karuna), none (tier C) | Swappable expression heads |
| `prop` | The held object, alone | A separate sprite attached to the hand |

Stages come from `stages` in `characters.json` (Rama prince, exile, king; Sita bride, exile, queen; and so on). A stage marked `ghost` (Ahalya unseen) is a code effect, not art.

## Contract with the game code

These rules are in `conventions` in the manifest and in every prompt. The game relies on them:

- **Facing right.** The game mirrors sprites for left-facing characters.
- **Magenta (#FF00FF) background.** The build keys it to transparency.
- **Same box for every figure.** The top of the headdress is near the top edge and the feet are near the bottom edge. Real size comes from `height` in the manifest (an average man = 1.0), so Tataka (2.3) is scaled up in code rather than drawn bigger.
- **Pivots.** Figures pivot at the feet centre; heads pivot at the neck base, bottom centre.
- **Stable ids.** For example, `char.rama.exile.head.karuna`. Code references images by id, never by prompt text.
- **Rig part names.** Each body type has a fixed part list (`rigParts`), so one animation setup per body type works for every character of that type.

## Keeping it future-proof

- **Add or change a character.** Edit `characters.json` (and add a line to `identity.json`), then run `node tools/art/build-art-prompts.mjs`. The build stops if any character has no identity entry.
- **Regenerate only what changed.** Every job has a `promptHash`. Compare it with the hash recorded when the image was made (`results.jsonl`), and redo only the jobs that differ.
- **Change the whole style.** Edit `STYLE` in the build script. Every hash changes, so everything is marked for regeneration.
- **Unknown design codes.** New codes in `characters.json` fall back to plain words (`moonCrown` becomes "moon crown"), so nothing breaks. Add a proper phrase to the vocabulary when you want better wording.
