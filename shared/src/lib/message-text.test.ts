import { describe, expect, it } from 'vitest';

import { countMessageCharacters } from './message-text';

describe('countMessageCharacters', () => {
  it('counts plain text and new lines', () => {
    expect(countMessageCharacters('')).toBe(0);
    expect(countMessageCharacters('Hi {name}!\n\n{lines}')).toBe(19);
  });

  it('counts a simple emoji as 1', () => {
    expect(countMessageCharacters('Salamat! 🙏')).toBe(10);
    expect(countMessageCharacters('😊')).toBe(1);
  });

  it('counts an emoji with a variation selector or skin tone as 1', () => {
    expect(countMessageCharacters('❤️')).toBe(1);
    expect(countMessageCharacters('👍🏽')).toBe(1);
  });

  it('counts a joined emoji sequence as 1', () => {
    expect(countMessageCharacters('👨‍👩‍👧‍👦')).toBe(1);
    expect(countMessageCharacters('🏳️‍🌈')).toBe(1);
  });

  it('counts a flag and a keycap as 1 each', () => {
    expect(countMessageCharacters('🇸🇬🇵🇭')).toBe(2);
    expect(countMessageCharacters('1️⃣')).toBe(1);
  });

  it('counts a letter with a combining accent as 1', () => {
    expect(countMessageCharacters('José')).toBe(4);
  });
});
