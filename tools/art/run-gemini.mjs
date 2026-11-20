#!/usr/bin/env node
// Optional: run the art manifest through the Gemini API from your own machine.
//
//   npm i -D @google/genai
//   GEMINI_API_KEY=... node tools/art/run-gemini.mjs --kind sheet          # sheets first, then review them
//   GEMINI_API_KEY=... node tools/art/run-gemini.mjs --kind rig,head,prop  # after the sheets are approved
//   ... --only rama,sita     limit to some characters
//   ... --model <id>         default gemini-nano-banana-2.1
//
// Skips any job whose image exists and whose promptHash matches art/results.jsonl, so it is safe
// to stop and re-run. Written against the Gemini image-generation docs as of Nov 2026
// (ai.interactions.create); check the docs if the SDK call has changed.

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { GoogleGenAI } from '@google/genai';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const kinds = arg('kind', 'sheet').split(',');
const only = arg('only', '') ? arg('only').split(',') : null;
const model = arg('model', 'gemini-nano-banana-2.1');

const manifest = JSON.parse(readFileSync('art/prompts.json', 'utf8'));
const resultsPath = 'art/results.jsonl';
const done = new Map();
if (existsSync(resultsPath)) for (const line of readFileSync(resultsPath, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line); if (r.status === 'ok') done.set(r.id, r.promptHash);
}

const byId = new Map(manifest.assets.map(a => [a.id, a]));
const refFile = ref => manifest.styleReferences[ref] ?? byId.get(ref)?.file;
const image = path => ({ type: 'image', mime_type: 'image/png', data: readFileSync(path).toString('base64') });

const ai = new GoogleGenAI({});
const jobs = manifest.assets.filter(a => kinds.includes(a.kind) && (!only || only.includes(a.character)));
console.log(`${jobs.length} jobs (${kinds.join(', ')}) with ${model}`);

for (const job of jobs) {
  if (done.get(job.id) === job.promptHash && existsSync(job.file)) continue;
  const refs = job.references.map(refFile);
  const missingRef = refs.find(f => !f || !existsSync(f));
  if (missingRef !== undefined) { console.warn(`skip ${job.id}: reference not generated yet (${missingRef ?? job.references})`); continue; }
  try {
    const res = await ai.interactions.create({
      model,
      input: [{ type: 'text', text: `${job.prompt}\nAvoid: ${manifest.negativePrompt}` }, ...refs.map(image)],
      response_format: { type: 'image', aspect_ratio: job.aspectRatio, image_size: job.size },
    });
    mkdirSync(dirname(job.file), { recursive: true });
    writeFileSync(job.file, Buffer.from(res.output_image.data, 'base64'));
    appendFileSync(resultsPath, JSON.stringify({ id: job.id, file: job.file, promptHash: job.promptHash, status: 'ok' }) + '\n');
    console.log(`ok   ${job.id}`);
  } catch (e) {
    appendFileSync(resultsPath, JSON.stringify({ id: job.id, file: job.file, promptHash: job.promptHash, status: 'failed', note: String(e.message || e) }) + '\n');
    console.warn(`fail ${job.id}: ${e.message || e}`);
  }
}
