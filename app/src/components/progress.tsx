import { View } from 'react-native';

import { Progress as NativeProgress, ProgressFilledTrack } from '@/components/ui/progress';

/** Keeps a percentage between 0 and 100 so a bad input cannot overflow the track. */
function clampPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * Progress bar (screen mapping doc: Progress): an 8px `track` bar with a `primary` fill, such as
 * the bill coverage on Home. A thin wrapper over the native gluestack progress in `ui/progress`.
 *
 * @param value - How much is done, in the same unit as `max`.
 * @param max - The full amount. Defaults to 100.
 * @param accessibilityLabel - What the bar measures, read out by screen readers.
 * @param className - Extra classes for the track.
 */
export function Progress({
  value,
  max = 100,
  accessibilityLabel,
  className,
}: {
  value: number;
  max?: number;
  accessibilityLabel: string;
  className?: string;
}) {
  const percent = clampPercent(value, max);
  return (
    <NativeProgress
      value={percent}
      accessibilityLabel={accessibilityLabel}
      className={className}
    >
      <ProgressFilledTrack style={{ width: `${percent}%` }} />
    </NativeProgress>
  );
}

/**
 * Setup steps bar (custom Progress, screen mapping doc): one 4px segment per step, `primary` for
 * done steps and `track` for the rest, such as "2 of 4 steps done" on Welcome.
 *
 * @param total - Number of steps (segments).
 * @param done - How many steps are done, from the first.
 * @param accessibilityLabel - What the bar measures, read out by screen readers.
 * @param className - Extra classes for the row of segments.
 */
export function SegmentedProgress({
  total,
  done,
  accessibilityLabel,
  className,
}: {
  total: number;
  done: number;
  accessibilityLabel: string;
  className?: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now: done }}
      className={`flex-row gap-1 ${className ?? ''}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`h-1 min-w-0 flex-1 rounded-sm ${i < done ? 'bg-primary' : 'bg-track'}`}
        />
      ))}
    </View>
  );
}

/**
 * Two-segment split bar (custom Progress, screen mapping doc): a 6px bar of a `primary` segment
 * and a `track` segment with a 2px gap, such as the 50/50 share on Household. Display only; the
 * percentages come from the server.
 *
 * @param percent - Width of the first (`primary`) segment, 0 to 100. The second takes the rest.
 * @param accessibilityLabel - What the split shows, read out by screen readers.
 * @param className - Extra classes for the bar.
 */
export function SplitProgress({
  percent,
  accessibilityLabel,
  className,
}: {
  percent: number;
  accessibilityLabel: string;
  className?: string;
}) {
  const first = clampPercent(percent, 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(first) }}
      className={`h-1.5 flex-row gap-0.5 overflow-hidden rounded-full ${className ?? ''}`}
    >
      {first > 0 ? <View className="bg-primary" style={{ flex: first }} /> : null}
      {first < 100 ? <View className="bg-track" style={{ flex: 100 - first }} /> : null}
    </View>
  );
}
