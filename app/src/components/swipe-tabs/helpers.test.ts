import { describe, expect, it } from 'vitest';

import { swipeStep } from './helpers';

describe('swipeStep', () => {
  it('moves to the next tab on a long swipe left and the previous on a long swipe right', () => {
    expect(swipeStep(-60, 0)).toBe(1);
    expect(swipeStep(60, 0)).toBe(-1);
  });

  it('counts a short, fast flick', () => {
    expect(swipeStep(-25, -500)).toBe(1);
    expect(swipeStep(25, 500)).toBe(-1);
  });

  it('ignores a short, slow swipe', () => {
    expect(swipeStep(-59, -499)).toBe(0);
    expect(swipeStep(59, 499)).toBe(0);
  });

  it('ignores a swipe flicked back the other way before lifting', () => {
    expect(swipeStep(-25, 800)).toBe(0);
    expect(swipeStep(25, -800)).toBe(0);
  });
});
