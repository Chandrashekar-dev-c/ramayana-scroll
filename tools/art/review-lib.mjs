// Shared helpers for the art review step (run-gemini.mjs and pick.mjs).
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';

export const RESULTS = 'art/results.jsonl';
export const reviewDir = id => `art/review/${id}`;

/** id -> promptHash of the picked image (last entry wins). */
export function loadResults() {
  const picked = new Map();
  if (!existsSync(RESULTS)) return picked;
  for (const line of readFileSync(RESULTS, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(line);
    if (r.status === 'picked') picked.set(r.id, r.promptHash); else picked.delete(r.id);
  }
  return picked;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** A local contact sheet of every job that has candidates, with the checklist beside them. */
export function writeReviewPage(manifest) {
  mkdirSync('art/review', { recursive: true });
  const picked = loadResults();
  const rows = manifest.assets.map(job => {
    const dir = reviewDir(job.id);
    if (!existsSync(dir)) return '';
    const cands = readdirSync(dir).filter(f => f.startsWith('cand-') && readFileSync(`${dir}/${f}`).length > 0).sort();
    if (!cands.length) return '';
    const done = picked.get(job.id) === job.promptHash;
    const imgs = cands.map(f => `<figure><img src="${esc(job.id)}/${f}" loading="lazy"><figcaption>${f.match(/\d+/)[0]}</figcaption></figure>`).join('');
    return `<section class="${done ? 'done' : ''}"><h2>${esc(job.id)}${done ? ' · picked' : ''}</h2><code>node tools/art/pick.mjs ${esc(job.id)} N</code><div class="row">${imgs}</div></section>`;
  }).join('\n');
  writeFileSync('art/review/index.html', `<!doctype html><meta charset="utf-8"><title>Art review</title>
<style>body{font:14px system-ui;margin:16px;background:#f2e4c3;color:#1d1613}section{margin:0 0 28px}section.done{opacity:.45}
.row{display:flex;gap:8px;overflow-x:auto}figure{margin:0}img{height:240px;border:1px solid #0003;background:#fff}
figcaption{text-align:center;font-weight:600}code{background:#fff8;padding:2px 6px}aside{position:sticky;top:0;background:#f8efd9;padding:8px 12px;border:1px solid #0002;margin-bottom:16px}</style>
<aside><b>Reject if:</b> wrong finger or head count · not facing right / face turned to viewer · cropped figure or drawn ground line · background not flat magenta · wrong colours, crown or held object · looks like clean vector clip art instead of the reference painting · any revered figure looks undignified</aside>
${rows || '<p>No candidates yet.</p>'}`);
}
