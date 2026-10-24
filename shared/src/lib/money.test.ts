import { describe, expect, it } from 'vitest';

import { formatCents } from './money';

describe('formatCents', () => {
  it.each([
    [186286, '$1,862.86'],
    [430000, '$4,300.00'],
    [0, '$0.00'],
    [5, '$0.05'],
    [100000000, '$1,000,000.00'],
  ])('formats %i as %s', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it('puts the minus before the dollar sign for corrections', () => {
    expect(formatCents(-1500)).toBe('-$15.00');
  });

  it('throws on non-integer cents', () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
  });
});
