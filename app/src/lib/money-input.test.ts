import { formatCents } from '@splithouse/shared';
import { describe, expect, it } from 'vitest';

import { centsToInputText, parseMoneyToCents, sanitizeMoneyInput } from './money-input';

describe('parseMoneyToCents', () => {
  it.each([
    ['1862.86', 186286],
    ['$1,862.86', 186286],
    ['1862', 186200],
    ['1862.5', 186250],
    ['.5', 50],
    ['5.', 500],
    ['0.07', 7],
    ['-15', -1500],
    ['-$15.00', -1500],
  ])('parses %j as %i', (text, expected) => {
    expect(parseMoneyToCents(text)).toBe(expected);
  });

  it.each(['1.005', 'abc', '', '.', '1,86', '--1', '$-15', '1.2.3'])('rejects %j', (text) => {
    expect(parseMoneyToCents(text)).toBeNull();
  });

  it('round-trips with formatCents', () => {
    for (const cents of [0, 1, 99, 100, 186286, -1500]) {
      expect(parseMoneyToCents(formatCents(cents))).toBe(cents);
    }
  });
});

describe('centsToInputText', () => {
  it.each([
    [186286, '1862.86'],
    [5, '0.05'],
    [0, '0.00'],
    [-1500, '-15.00'],
  ])('renders %i as %s', (cents, expected) => {
    expect(centsToInputText(cents)).toBe(expected);
  });
});

describe('sanitizeMoneyInput', () => {
  it.each([
    ['1862.86', '1862.86'],
    ['$1,862.86', '1862.86'],
    ['1862.', '1862.'],
    ['.', '.'],
    ['1.234', '1.23'],
    ['1.2.3', '1.23'],
    ['abc12', '12'],
    ['', ''],
  ])('cleans %j to %j', (text, expected) => {
    expect(sanitizeMoneyInput(text)).toBe(expected);
  });

  it('drops the minus unless negatives are allowed', () => {
    expect(sanitizeMoneyInput('-15')).toBe('15');
    expect(sanitizeMoneyInput('-15', true)).toBe('-15');
    expect(sanitizeMoneyInput('-', true)).toBe('-');
  });

  it('keeps only a leading minus', () => {
    expect(sanitizeMoneyInput('1-5', true)).toBe('15');
    expect(sanitizeMoneyInput('--5', true)).toBe('-5');
  });
});
