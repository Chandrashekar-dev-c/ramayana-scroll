# Task for Gemini: generate the Ramayana Scroll character art

You are generating the character art for a game. Work through `prompts.jsonl` (one image per line) and save every image at the exact path in its `file` field. The game's code depends on those paths, names and composition rules, so do not rename, resize, crop or restyle anything.

## Inputs

- `prompts.jsonl` — 549 image jobs for 70 characters. The same data with shared settings is in `prompts.json`.
- `reference/tataka-frame.png` — the style reference. Attach it to every job whose `references` contains `style:reference-frame`.

## Order (important)

1. Generate every `kind: "sheet"` job first.
2. **Stop and wait for my approval of the sheets.** Every other image copies the approved sheet, so a wrong sheet would spoil all of them.
3. After approval, generate `rig`, then `head`, then `prop` jobs. For each, attach the image named in its `references` (the approved sheet for that character and stage), so the character looks identical.

## For every job

- Use the job's `prompt` text exactly. Use `negativePrompt` from `prompts.json` if your tool takes one.
- Aspect ratio = `aspectRatio`, resolution = `size`.
- Generate 4 candidates, keep the one that passes every check below, and save it to `file` as PNG.
- Record in `results.jsonl` one line per job: `{"id", "file", "promptHash", "status": "ok" | "failed", "note"}`. Copy `promptHash` from the job unchanged; it tells the game which images are up to date.

## Checks (reject the candidate if any fails)

1. Five fingers on every hand; correct number of arms, legs and heads; no fused or extra limbs.
2. Matches the description: skin colour, garment colour, headdress, forehead mark, held object.
3. Facing **right**, strict side profile, one eye visible.
4. Whole figure inside the frame: top of the headdress near the top edge, feet near the bottom edge with **no drawn ground line**. Heads: neck base at the bottom centre.
5. Background is one flat, uniform magenta (#FF00FF) everywhere: no floor, shadow, texture or scenery.
6. Matches the reference painting's finish: thick double outlines, hand-painted pigment grain and dense patterning. Reject clean vector or clip-art looks, smooth shading, text or watermarks.
7. Each held object appears once per figure (no duplicated swords or bows); Ravana has exactly ten heads, all in profile.
8. Deities and revered figures (Rama, Sita, Lakshmana, Hanuman, the sages) look dignified, never comic or distorted.

If a job fails all 4 candidates, try 4 more; if it still fails, mark it `failed` with a note and move on.

## When done

Report: how many succeeded and how many failed, plus the list of failed ids with the reason for each.
