/* Finance pure helpers — shared by browser (FinMath) and Node tests. */

export function ymStr(y, m) {
  return y + '-' + String(m + 1).padStart(2, '0');
}

export function dayStr(y, m, d) {
  return ymStr(y, m) + '-' + String(d).padStart(2, '0');
}

export function monthDiff(a, b) {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

export function ymAdd(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return ymStr(d.getFullYear(), d.getMonth());
}

export function parseAmount(v) {
  v = String(v == null ? '' : v).trim();
  if (!v) return NaN;
  if (v.indexOf(',') > -1 && v.indexOf('.') > -1) v = v.replace(/\./g, '').replace(',', '.');
  else if (v.indexOf(',') > -1) v = v.replace(',', '.');
  if (!/^[-+*/().0-9\s]+$/.test(v)) return NaN;
  try {
    const r = Function('"use strict";return (' + v + ')')();
    return (typeof r === 'number' && isFinite(r)) ? r : NaN;
  } catch (_) {
    return NaN;
  }
}

export function colLetter(n) {
  let s = '';
  n = n + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function csvCell(v) {
  v = (v === null || v === undefined) ? '' : String(v);
  if (/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function jbBool(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

export function jbNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function jbDate(v) {
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  return String(v || '');
}

export function jbMonth(v) {
  if (typeof v === 'number') return jbDate(v).slice(0, 7);
  return String(v || '').replace(/^m/, '').slice(0, 7);
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function itemTotal(it) {
  return it.priceMode === 'unit' ? (Number(it.price) || 0) * (Number(it.qty) || 0) : (Number(it.price) || 0);
}

export function itemUnit(it) {
  const q = Number(it.qty) || 0;
  return q > 0 ? itemTotal(it) / q : 0;
}

export function sumAssign(it) {
  let s = 0;
  for (const k in it.assign) s += Number(it.assign[k]) || 0;
  return s;
}

export function billStarted(b, cur) {
  return !b.startMonth || monthDiff(b.startMonth, cur) >= 0;
}

/** Pure plan for truncating/deleting a recurring bill at `cur` month (no DATA mutation). */
export function planBillSplit(bill, cur) {
  if (!bill) return { status: 'gone' };
  const start = bill.startMonth || cur;
  let n = monthDiff(start, cur);
  if (bill.installments > 0) n = Math.min(bill.installments, n);
  if (n <= 0) return { status: 'deleted', prev: Object.assign({}, bill) };
  return { status: 'truncated', bill: Object.assign({}, bill, { installments: n }) };
}

/** Split-bill totals from in-memory state (no DOM). */
export function computeSplitTotals(state, svcEnabled, svcPctRaw) {
  const svc = !!svcEnabled;
  const pct = svc ? (parseFloat(svcPctRaw) || 0) : 0;
  const sub = {};
  (state.people || []).forEach(function (p) { sub[p.id] = 0; });
  let anyUnassigned = false;
  (state.items || []).forEach(function (it) {
    const total = itemTotal(it);
    const unit = it.qty > 0 ? total / it.qty : 0;
    if (sumAssign(it) < it.qty - 1e-9 && total > 0) anyUnassigned = true;
    (state.people || []).forEach(function (p) {
      sub[p.id] += unit * (Number(it.assign[p.id]) || 0);
    });
  });
  const totals = {};
  let grand = 0;
  (state.people || []).forEach(function (p) {
    const v = sub[p.id] * (1 + pct / 100);
    totals[p.id] = v;
    grand += v;
  });
  return { sub: sub, totals: totals, grand: grand, pct: pct, anyUnassigned: anyUnassigned };
}
