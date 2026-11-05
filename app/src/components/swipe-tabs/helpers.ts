/** How far a swipe has to travel to count, in dp. */
const SWIPE_DISTANCE = 60;
/** How fast a shorter swipe has to be to count, in dp per second. */
const SWIPE_VELOCITY = 500;

/**
 * Which way a finished sideways swipe moves through the tabs.
 *
 * @param translationX How far the finger moved, negative for left.
 * @param velocityX How fast it was moving when it lifted, negative for left.
 * @returns 1 for the next tab, -1 for the previous one, 0 for a swipe too short and slow to count.
 */
export function swipeStep(translationX: number, velocityX: number): -1 | 0 | 1 {
  if (translationX < 0 && (translationX <= -SWIPE_DISTANCE || velocityX <= -SWIPE_VELOCITY)) return 1;
  if (translationX > 0 && (translationX >= SWIPE_DISTANCE || velocityX >= SWIPE_VELOCITY)) return -1;
  return 0;
}
