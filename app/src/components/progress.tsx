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
 * One segment of {@link SegmentedProgress}: a step that is done or not, and whether it is optional.
 */
export interface ProgressSegment {
  /** Drawn hollow (a 1.5px outline) instead of filled, like "Not in total" on Splits. */
  optional: boolean;
  /** Green when done, `track` when not. */
  done: boolean;
}

/** A segment's look: required steps fill, optional ones are outlined. Green when done either way. */
function segmentClass({ optional, done }: ProgressSegment): string {
  if (optional) return `border-[1.5px] ${done ? 'border-success' : 'border-track'}`;
  return done ? 'bg-success' : 'bg-track';
}

/**
 * Setup steps bar (custom Progress, screen mapping doc): one 4px segment per step, such as
 * "2 of 5 steps done" on Welcome. Required steps fill `success` when done; optional steps are
 * hollow, with a `success` outline when done and a `track` one when not.
 *
 * @param segments - One per step, in order.
 * @param done - How many steps are done, read out as the bar's value.
 * @param accessibilityLabel - What the bar measures, read out by screen readers.
 * @param className - Extra classes for the row of segments.
 */
export function SegmentedProgress({
  segments,
  done,
  accessibilityLabel,
  className,
}: {
  segments: ProgressSegment[];
  done: number;
  accessibilityLabel: string;
  className?: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: segments.length, now: done }}
      className={`flex-row gap-1 ${className ?? ''}`}
    >
      {segments.map((segment, i) => (
        <View key={i} className={`h-1 min-w-0 flex-1 rounded-sm ${segmentClass(segment)}`} />
      ))}
    </View>
  );
}
