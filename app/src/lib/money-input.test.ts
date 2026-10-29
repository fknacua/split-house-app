import { describe, expect, it } from 'vitest';

import { centsToInputText, sanitizeMoneyInput } from './money-input';

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
