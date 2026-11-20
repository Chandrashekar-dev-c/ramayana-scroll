// Every playable chapter needs a source entry: Valmiki reference, the claim its note makes,
// and whether it comes from later tradition. Reviewer names are reported, not required.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const notes = J('src/data/notes.json'), en = J('src/i18n/en.json');
const errs = []; let unreviewed = 0;
for (const c of J('src/data/chapters.json')) {
  if (c.playable === false) continue;
  const n = notes[c.id];
  if (!n) { errs.push(`${c.id}: no source entry`); continue; }
  if (!n.text || !n.text.length || n.text.some((k) => !en[k])) errs.push(`${c.id}: note text missing`);
  if (!n.source || !/Kanda/.test(n.source)) errs.push(`${c.id}: no Valmiki reference`);
  if (!n.claim) errs.push(`${c.id}: no claim recorded`);
  if (!n.reviewer) unreviewed++;
}
if (errs.length) { console.error('Chapter notes check failed:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`notes ok: every chapter has a source entry (${unreviewed} still awaiting a reviewer)`);
