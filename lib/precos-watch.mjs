import { jbBool } from './finance-math.mjs';

/**
 * PrecosBuscas sheet rows (header + data) → watch entries for SerpApi / public JSON.
 * Columns: ID, Termo, Teto, Obrigatorias, Proibidas, Arquivada, Criado
 */
export function buscasRowsToWatch(rows) {
  const out = [];
  const seen = new Set();
  if (!rows || !rows.length) return out;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const id = String(r[0] || '').trim();
    const termo = String(r[1] || '').trim();
    if (!id || !termo) continue;
    if (jbBool(r[5])) continue;
    if (seen.has(id)) {
      const idx = out.findIndex(function (e) { return e.id === id; });
      if (idx >= 0) out.splice(idx, 1);
    }
    seen.add(id);
    out.push({ id: id, termo: termo });
  }
  return out;
}

export function formatPrecosWatchJson(entries) {
  return JSON.stringify(entries, null, 2) + '\n';
}
