#!/usr/bin/env node
// Choose the best candidate for a job and put it where the game (and later jobs) expect it.
//
//   node tools/art/pick.mjs char.rama.prince.sheet 3
//   node tools/art/pick.mjs char.rama.prince.sheet reject "Ravana has nine heads"   # none usable; regenerate
//
// Copies art/review/<id>/cand-3.png to the job's file path and records it in art/results.jsonl.

import { readFileSync, copyFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { RESULTS, reviewDir, writeReviewPage } from './review-lib.mjs';

const [id, choice, ...noteParts] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync('art/prompts.json', 'utf8'));
const job = manifest.assets.find(a => a.id === id);
if (!job || !choice) { console.error('usage: node tools/art/pick.mjs <job id> <candidate number | reject> [note]'); process.exit(1); }

if (choice === 'reject') {
  rmSync(reviewDir(id), { recursive: true, force: true }); // next run makes fresh candidates
  appendFileSync(RESULTS, JSON.stringify({ id, promptHash: job.promptHash, status: 'rejected', note: noteParts.join(' ') }) + '\n');
  console.log(`rejected ${id}; the next run will generate new candidates`);
} else {
  const src = `${reviewDir(id)}/cand-${choice}.png`;
  if (!existsSync(src)) { console.error(`no ${src}`); process.exit(1); }
  mkdirSync(dirname(job.file), { recursive: true });
  copyFileSync(src, job.file);
  appendFileSync(RESULTS, JSON.stringify({ id, file: job.file, promptHash: job.promptHash, status: 'picked', candidate: Number(choice) }) + '\n');
  console.log(`picked ${id} #${choice} -> ${job.file}`);
}
writeReviewPage(manifest);
