import type { RecordPaymentChargeRow } from '@splithouse/shared';
import { describe, expect, it } from 'vitest';

import { selectAllState, toggleAllTicked, toggleTicked } from './helpers';

// Jordan's For list with only his rent ticked.
const row = (chargeId: string, ticked: boolean): RecordPaymentChargeRow => ({
  chargeId,
  title: chargeId,
  amount: '$1.00',
  detail: null,
  chip: { label: 'Upcoming', tone: 'neutral' },
  ticked,
});
const ROWS = [row('jordan-rent', true), row('jordan-aircon', false), row('jordan-utilities', false)];

describe('toggleTicked', () => {
  it('ticks or unticks one charge, keeping the list order', () => {
    expect(toggleTicked(ROWS, 'jordan-utilities')).toEqual(['jordan-rent', 'jordan-utilities']);
    expect(toggleTicked(ROWS, 'jordan-rent')).toEqual([]);
  });
});

describe('toggleAllTicked and selectAllState', () => {
  it('ticks every charge while some or none are, and clears them once all are', () => {
    expect(toggleAllTicked(ROWS)).toEqual(['jordan-rent', 'jordan-aircon', 'jordan-utilities']);
    expect(toggleAllTicked(ROWS.map((r) => ({ ...r, ticked: true })))).toEqual([]);
    expect(toggleAllTicked(ROWS.map((r) => ({ ...r, ticked: false })))).toHaveLength(3);
  });

  it('reads all, some (part-ticked) or none', () => {
    expect(selectAllState(ROWS.map((r) => ({ ...r, ticked: true })))).toEqual({ value: true, indeterminate: false });
    expect(selectAllState(ROWS)).toEqual({ value: false, indeterminate: true });
    expect(selectAllState(ROWS.map((r) => ({ ...r, ticked: false })))).toEqual({ value: false, indeterminate: false });
    expect(selectAllState([])).toEqual({ value: false, indeterminate: false });
  });
});
