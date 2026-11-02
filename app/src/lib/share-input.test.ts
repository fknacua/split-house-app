import { describe, expect, it } from 'vitest';

import { parseShareInput, sanitizeShareInput, sharesToInputText } from './share-input';

describe('sanitizeShareInput', () => {
  it.each([
    ['1.5', '1.5'],
    ['1.', '1.'],
    ['1.2.3', '1.23'],
    ['1.23456', '1.234'],
    ['a1b', '1'],
    ['-2', '2'],
    ['', ''],
  ])('cleans %s to %s', (text, expected) => {
    expect(sanitizeShareInput(text)).toBe(expected);
  });
});

describe('parseShareInput', () => {
  it.each([
    ['1.5', 1500],
    ['1', 1000],
    ['1.', 1000],
    ['.5', 500],
    ['0.125', 125],
    ['0', 0],
    ['', null],
    ['.', null],
  ])('reads %s as %s', (text, expected) => {
    expect(parseShareInput(text)).toBe(expected);
  });
});

describe('sharesToInputText', () => {
  it.each([
    [1500, '1.5'],
    [1000, '1'],
    [125, '0.125'],
    [1050, '1.05'],
    [0, '0'],
  ])('renders %i as %s', (thousandths, expected) => {
    expect(sharesToInputText(thousandths)).toBe(expected);
  });
});
