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
| `tools/art/run-gemini.mjs` | Runs jobs through the Gemini API: 4 candidates per job into `art/review/` |
| `tools/art/clean.mjs` | Keys magenta to transparency and strips drawn ground lines: `art/raw/` to `art/clean/` |
| `tools/art/pick.mjs` | Picks the best candidate into the game's path (or rejects all to regenerate) |
| `art/review/index.html` | Local contact sheet of candidates with the rejection checklist |

## What gets generated

| Kind | Per character and stage | Used for |
| --- | --- | --- |
| `sheet` | 3 poses of the same figure (tier C: 3 different individuals) | Locks the design; reference for everything else |
| `rig` | 1 neutral pose, limbs apart | Cut into the parts listed in `rigParts` for puppet animation |
| `head` | 9 rasas (tier A), 3 (tier B: shanta, raudra, karuna), none (tier C) | Swappable expression heads |
| `extraHead` | Ravana only: 3 variants of a single extra head | Code arranges exactly ten heads in a fan; each can be cut and regrow (`src/data/heads.json`) |
| `prop` | The held object, alone | A separate sprite attached to the hand |

Stages come from `stages` in `characters.json` (Rama prince, exile, king; Sita bride, exile, queen; and so on). A stage marked `ghost` (Ahalya unseen) is a code effect, not art.

## The painted finish is added in code

The art is generated clean on purpose. The game applies one shared paint-finish filter at runtime: paper and pigment grain, slight colour mottling and warmth, matching `art/reference/tataka-frame.png`. Every asset gets an identical finish, cut-out parts stay easy to separate, and the look can be tuned without regenerating anything.

## Contract with the game code

These rules are in `conventions` in the manifest and in every prompt. The game relies on them:

- **Facing right.** The game mirrors sprites for left-facing characters.
- **Magenta (#FF00FF) background.** The build keys it to transparency.
- **Same box for every figure.** The top of the headdress is near the top edge and the feet are near the bottom edge. Real size comes from `height` in the manifest (an average man = 1.0), so Tataka (2.3) is scaled up in code rather than drawn bigger.
- **Pivots.** Figures pivot at the feet centre; heads pivot at the neck base, bottom centre.
- **Stable ids.** For example, `char.rama.exile.head.karuna`. Code references images by id, never by prompt text.
- **Rig part names.** Each body type has a fixed part list (`rigParts`), so one animation setup per body type works for every character of that type.

## Running a batch

1. `GEMINI_API_KEY=... node tools/art/run-gemini.mjs --kind sheet`
2. Open `art/review/index.html` and look at every candidate yourself.
3. `node tools/art/pick.mjs <job id> <n>`, or `... <job id> reject "reason"` to regenerate.
4. `node tools/art/run-gemini.mjs --kind rig,head,extraHead,prop`; each job waits until its sheet is picked.
5. `node tools/art/clean.mjs` writes transparent, game-ready copies to `art/clean/`.

## Keeping it future-proof

- **Add or change a character.** Edit `characters.json` (and add a line to `identity.json`), then run `node tools/art/build-art-prompts.mjs`. The build stops if any character has no identity entry.
- **Regenerate only what changed.** Every job has a `promptHash`. Compare it with the hash recorded when the image was made (`results.jsonl`), and redo only the jobs that differ.
- **Change the whole style.** Edit `STYLE` in the build script. Every hash changes, so everything is marked for regeneration.
- **Unknown design codes.** New codes in `characters.json` fall back to plain words (`moonCrown` becomes "moon crown"), so nothing breaks. Add a proper phrase to the vocabulary when you want better wording.
