/** Map SerpApi google_shopping items → app raw offers (see scripts/samples/). */

export function flattenShopping(json) {
  if (Array.isArray(json.shopping_results)) return json.shopping_results;
  const out = [];
  (json.categorized_shopping_results || []).forEach(function (c) {
    (c.shopping_results || []).forEach(function (it) { out.push(it); });
  });
  return out;
}

export function mapSerpOffer(item) {
  if (!item || item.extracted_price == null) return null;
  const headline = Number(item.extracted_price);
  if (!isFinite(headline) || headline <= 0) return null;

  const priceStr = String(item.price || '');
  const inst = item.installment;
  let preco = headline;
  let precoAvista = null;
  if (inst && inst.extracted_price != null && inst.period) {
    const total = Number(inst.extracted_price) * Number(inst.period);
    if (isFinite(total) && total > 0) preco = Math.round(total * 100) / 100;
    if (/\bagora\b|pix|à vista|avista/i.test(priceStr)) precoAvista = headline;
  } else if (/\bagora\b|pix|à vista|avista/i.test(priceStr)) {
    precoAvista = headline;
  }

  const link = item.link || item.product_link || '';
  const extra = {
    product_id: item.product_id || '',
    rating: item.rating,
    reviews: item.reviews,
    moeda: /\bR\s*\$/i.test(priceStr) ? 'BRL' : undefined
  };
  if (inst) extra.parcelas = inst.period ? inst.period + 'x ' + (inst.price || '') : inst.price;
  if (item.second_hand_condition) extra.second_hand = item.second_hand_condition;

  return {
    loja: String(item.source || '').trim() || 'Loja',
    titulo: String(item.title || '').trim(),
    preco: preco,
    precoTexto: priceStr || ('R$ ' + preco.toLocaleString('pt-BR')),
    precoAvista: precoAvista,
    link: link,
    extra: extra
  };
}

export function saneSerpOffer(o, prevDayMin) {
  if (!o || o.preco < 100 || o.preco > 200000) return false;
  if (prevDayMin != null && prevDayMin > 500 && o.preco < prevDayMin * 0.35) return false;
  if (prevDayMin != null && o.preco > prevDayMin * 2.5) return false;
  return true;
}

export function prevDayMinFromRaw(raw, today) {
  const keys = Object.keys(raw || {}).filter(function (k) { return k < today; }).sort();
  if (!keys.length) return null;
  const offers = raw[keys[keys.length - 1]] || [];
  let min = null;
  offers.forEach(function (o) {
    if (o.preco != null && (min == null || o.preco < min)) min = o.preco;
  });
  return min;
}
