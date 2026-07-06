import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ymStr, dayStr, monthDiff, ymAdd, parseAmount,
  colLetter, planBillSplit, computeSplitTotals, itemTotal, round2
} from '../lib/finance-math.mjs';

describe('ymStr / monthDiff / ymAdd', () => {
  it('ymStr pads month', () => {
    assert.equal(ymStr(2026, 0), '2026-01');
    assert.equal(ymStr(2026, 11), '2026-12');
  });
  it('monthDiff counts months between YM strings', () => {
    assert.equal(monthDiff('2026-01', '2026-03'), 2);
    assert.equal(monthDiff('2025-12', '2026-01'), 1);
    assert.equal(monthDiff('2026-03', '2026-01'), -2);
  });
  it('ymAdd shifts months', () => {
    assert.equal(ymAdd('2026-01', 2), '2026-03');
    assert.equal(ymAdd('2026-11', 2), '2027-01');
  });
  it('dayStr builds ISO date', () => {
    assert.equal(dayStr(2026, 5, 3), '2026-06-03');
  });
});

describe('parseAmount', () => {
  it('parses comma decimals', () => {
    assert.equal(parseAmount('12,50'), 12.5);
  });
  it('evaluates simple expressions', () => {
    assert.equal(parseAmount('45+12'), 57);
  });
  it('rejects unsafe input', () => {
    assert.ok(isNaN(parseAmount('alert(1)')));
  });
});

describe('colLetter', () => {
  it('maps column index to A1 letters', () => {
    assert.equal(colLetter(0), 'A');
    assert.equal(colLetter(25), 'Z');
    assert.equal(colLetter(26), 'AA');
  });
});

describe('planBillSplit', () => {
  const bill = { id: 'b1', name: 'Rent', amount: 1000, installments: 6, startMonth: '2026-01' };
  it('truncates at current month', () => {
    const r = planBillSplit(bill, '2026-04');
    assert.equal(r.status, 'truncated');
    assert.equal(r.bill.installments, 3);
  });
  it('deletes when no elapsed installments', () => {
    const r = planBillSplit(bill, '2026-01');
    assert.equal(r.status, 'deleted');
  });
  it('gone when bill missing', () => {
    assert.equal(planBillSplit(null, '2026-04').status, 'gone');
  });
});

describe('computeSplitTotals', () => {
  it('splits items with service fee', () => {
    const state = {
      people: [{ id: 'a', name: 'Me' }, { id: 'b', name: 'Jo' }],
      items: [{
        id: 'i1', name: 'Pizza', qty: 2, price: 40, priceMode: 'total',
        assign: { a: 1, b: 1 }
      }]
    };
    const r = computeSplitTotals(state, true, '10');
    assert.equal(round2(r.totals.a), 22);
    assert.equal(round2(r.totals.b), 22);
    assert.equal(round2(r.grand), 44);
  });
  it('flags unassigned qty', () => {
    const state = {
      people: [{ id: 'a', name: 'Me' }],
      items: [{ id: 'i1', qty: 2, price: 10, priceMode: 'total', assign: { a: 1 } }]
    };
    assert.equal(computeSplitTotals(state, false, 0).anyUnassigned, true);
  });
});

describe('itemTotal', () => {
  it('multiplies unit price by qty', () => {
    assert.equal(itemTotal({ priceMode: 'unit', price: 5, qty: 3 }), 15);
  });
  it('uses total mode as flat price', () => {
    assert.equal(itemTotal({ priceMode: 'total', price: 40, qty: 2 }), 40);
  });
});
