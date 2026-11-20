#!/usr/bin/env node
// Run the art manifest through the Gemini API from your own machine.
//
//   npm i -D @google/genai
//   GEMINI_API_KEY=... node tools/art/run-gemini.mjs --kind sheet            # step 1: sheets
//   open art/review/index.html, then pick the best candidate of each job:
//   node tools/art/pick.mjs char.rama.prince.sheet 3                          # step 2: choose
//   GEMINI_API_KEY=... node tools/art/run-gemini.mjs --kind rig,head,prop    # step 3: the rest
//
// Options:  --only rama,sita    limit to some characters
//           --candidates 4      images per job (default 4)
//           --model <id>        default gemini-nano-banana-2.1
//
// Candidates go to art/review/<job id>/cand-<n>.png; nothing reaches the game's art/raw/ paths
// until you pick one. Safe to stop and re-run: a job is skipped when its picked image matches the
// current promptHash, and candidates already made for the current hash are kept.
// Written against the Gemini image-generation docs as of Nov 2026 (ai.interactions.create);
// check the docs if the SDK call has changed.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { loadResults, reviewDir, writeReviewPage } from './review-lib.mjs';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const kinds = arg('kind', 'sheet').split(',');
const only = arg('only', '') ? arg('only').split(',') : null;
const model = arg('model', 'gemini-nano-banana-2.1');
const want = Number(arg('candidates', '4'));

const manifest = JSON.parse(readFileSync('art/prompts.json', 'utf8'));
const picked = loadResults();
const byId = new Map(manifest.assets.map(a => [a.id, a]));
const refFile = ref => manifest.styleReferences[ref] ?? byId.get(ref)?.file;
const image = path => ({ type: 'image', mime_type: 'image/png', data: readFileSync(path).toString('base64') });

const ai = new GoogleGenAI({});
const jobs = manifest.assets.filter(a => kinds.includes(a.kind) && (!only || only.includes(a.character)));
console.log(`${jobs.length} jobs (${kinds.join(', ')}), ${want} candidates each, model ${model}`);

for (const job of jobs) {
  if (picked.get(job.id) === job.promptHash && existsSync(job.file)) continue;

  // A dependent job copies the picked sheet, so it waits until that sheet is picked.
  const refs = job.references.map(refFile);
  const unready = job.references.find((r, i) => !refs[i] || !existsSync(refs[i]) || (byId.has(r) && picked.get(r) !== byId.get(r).promptHash));
  if (unready) { console.warn(`wait ${job.id}: pick ${unready} first`); continue; }

  const dir = reviewDir(job.id);
  mkdirSync(dir, { recursive: true });
  const hashFile = `${dir}/hash.txt`;
  if (!existsSync(hashFile) || readFileSync(hashFile, 'utf8') !== job.promptHash) {
    for (const f of readdirSync(dir)) if (f.startsWith('cand-')) writeFileSync(`${dir}/${f}`, ''); // stale: blank them
    writeFileSync(hashFile, job.promptHash);
  }
  const have = readdirSync(dir).filter(f => f.startsWith('cand-') && readFileSync(`${dir}/${f}`).length > 0).length;

  for (let n = have + 1; n <= want; n++) {
    try {
      const res = await ai.interactions.create({
        model,
        input: [{ type: 'text', text: `${job.prompt}\nAvoid: ${manifest.negativePrompt}` }, ...refs.map(image)],
        response_format: { type: 'image', aspect_ratio: job.aspectRatio, image_size: job.size },
      });
      writeFileSync(`${dir}/cand-${n}.png`, Buffer.from(res.output_image.data, 'base64'));
      console.log(`ok   ${job.id} #${n}`);
    } catch (e) {
      console.warn(`fail ${job.id} #${n}: ${e.message || e}`);
    }
  }
}
writeReviewPage(manifest);
console.log('Review: open art/review/index.html, then: node tools/art/pick.mjs <job id> <candidate number>');
