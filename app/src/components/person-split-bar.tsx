import { View } from 'react-native';

import { PERSON_COLOR_BG } from '@/lib';
import type { PersonColor } from '@splithouse/shared';

/** One person's part of a {@link PersonSplitBar}. */
export interface PersonSplitBarSegment {
  personId: string;
  /** The segment's width, 0 to 100. A segment at 0 is not drawn. */
  percent: number;
  color: PersonColor;
}

/** Props for {@link PersonSplitBar}. */
export interface PersonSplitBarProps {
  /** Each person's width and color, in order. */
  segments: PersonSplitBarSegment[];
  /** What the split shows, read out by screen readers. */
  accessibilityLabel: string;
}

/**
 * The per-person split bar (screen mapping doc: a custom Progress): 8px, with one segment per person in that
 * person's color and 2px gaps. Display only; the percentages come from the server. A segment at 0 is not drawn.
 * Used by Household's split rows and Add charge's split preview.
 */
export function PersonSplitBar({ segments, accessibilityLabel }: PersonSplitBarProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      className="h-2 flex-row gap-0.5 overflow-hidden rounded-full"
    >
      {segments
        .filter((segment) => segment.percent > 0)
        .map((segment) => (
          <View
            key={segment.personId}
            className={PERSON_COLOR_BG[segment.color]}
            style={{ flex: segment.percent }}
          />
        ))}
    </View>
  );
}
