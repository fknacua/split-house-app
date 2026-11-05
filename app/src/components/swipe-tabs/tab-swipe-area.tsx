import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { swipeStep } from './helpers';

/** How far the finger moves sideways before the swipe takes over, in dp. */
const ACTIVE_OFFSET_X = 20;
/** How far it moves up or down before the swipe gives way to scrolling, in dp. */
const FAIL_OFFSET_Y = 12;

/**
 * Lets a sideways swipe anywhere on the page switch tabs. It acts when the finger lifts, and the page doesn't follow
 * the finger. Moving mostly up or down leaves the page to scroll as usual.
 *
 * @param onSwipe - Called when a swipe finishes: 1 for the next tab, -1 for the previous one.
 * @param children - The scrolling page.
 */
export function TabSwipeArea({ onSwipe, children }: { onSwipe: (step: 1 | -1) => void; children: ReactNode }) {
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-ACTIVE_OFFSET_X, ACTIVE_OFFSET_X])
    .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
    .onEnd(({ translationX, velocityX }) => {
      const step = swipeStep(translationX, velocityX);
      if (step !== 0) onSwipe(step);
    });

  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} className="min-h-0 flex-1">
        {children}
      </View>
    </GestureDetector>
  );
}
