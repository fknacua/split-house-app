import { View } from 'react-native';

import { PERSON_COLOR_BG } from '@/lib';
import type { PersonSplitBarProps } from '../types';

/**
 * The bar on a "Household split" row: 8px, with one segment per person in that person's color and
 * 2px gaps. Display only; the percentages come from the server. A segment at 0 is not drawn.
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
