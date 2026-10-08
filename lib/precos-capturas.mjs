/** Build raw day→offers map from PrecosCapturas sheet rows. */

export function rawFromCapturaRows(rows, buscaId) {
  const raw = {};
  const id = String(buscaId);
  (rows || []).forEach(function (c) {
    if (String(c.buscaId) !== id) return;
    const day = String(c.data || '').slice(0, 10);
    if (!day) return;
    try {
      const offers = JSON.parse(c.json || '[]');
      if (Array.isArray(offers) && offers.length) raw[day] = offers;
    } catch (_) { /* skip bad json */ }
  });
  return raw;
}

export function mergeRawDays(into, part) {
  Object.keys(part || {}).forEach(function (d) { into[d] = part[d]; });
  return into;
}
