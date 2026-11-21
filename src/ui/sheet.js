// The design sheet: every character in a line-up, as silhouette, line art and colour.
// The debug panel and the "making of" gallery both use it.
import { CHARACTER_IDS, character, drawFigure, enemySpec, BASE_U, POSES } from '../art/figures.js';
import { PAL } from '../art/palette.js';
import enemies from '../data/enemies.json';

export function sheetEntries(set) {
  if (set === 'enemies') {
    const out = [];
    for (const e of enemies) for (let s = 1; s <= 4; s++) out.push({ spec: e.custom ? null : enemySpec(e.id, e.silhouette, s * 7919 + e.id.length, ['ochre', 'terracotta', 'grey', 'pink']), label: e.id, custom: e.custom });
    return out.filter((x) => x.spec);
  }
  if (set === 'poses') return Object.keys(POSES).map((p) => ({ spec: character('rama', 'exile'), label: p, pose: p }));
  const out = [];
  for (const id of CHARACTER_IDS) {
    const base = character(id);
    out.push({ spec: base, label: id });
    if (id === 'rama' || id === 'sita' || id === 'lakshmana') for (const st of Object.keys(base.stages).slice(1)) out.push({ spec: character(id, st), label: id + ' · ' + st });
  }
  return out;
}

export function renderSheet(canvas, { mode = 'colour', pose = 'stand', set = 'cast', size = 1, cols = 12 } = {}) {
  const items = sheetEntries(set);
  const cellW = 190 * size, cellH = 330 * size;
  const rows = Math.ceil(items.length / cols);
  canvas.width = cols * cellW; canvas.height = rows * cellH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAL.cream; ctx.fillRect(0, 0, canvas.width, canvas.height);
  items.forEach((it, i) => {
    const x = (i % cols) * cellW + cellW / 2, y = Math.floor(i / cols) * cellH + cellH - 34 * size;
    ctx.save(); ctx.translate(x, y);
    // cellH already carries size, so the fit ratio does too; multiplying by size again shrank figures by size²
    const k = Math.min(size, (cellH - 70 * size) / (BASE_U * it.spec.build.height * 1.6));
    ctx.scale(k, k);
    drawFigure(ctx, it.spec, it.pose || pose, { mode });
    ctx.restore();
    ctx.fillStyle = PAL.black; ctx.font = `${13 * size}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(it.label, x, y + 22 * size);
  });
  return items.length;
}
