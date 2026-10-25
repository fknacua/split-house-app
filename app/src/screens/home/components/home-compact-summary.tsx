import { Text, View } from 'react-native';

import type { HomeCompactSummaryProps } from '../types';
import { HomeSteps } from './home-steps';

// The design's drop shadow under the pinned card.
const COMPACT_SHADOW = '0 6px 12px -8px rgba(0,0,0,0.35)';

/** The hero shrunk to its date, one status line and the steps, pinned under the header once the hero scrolls away. */
export function HomeCompactSummary({ hero }: HomeCompactSummaryProps) {
  return (
    <View
      className="absolute inset-x-0 top-0 z-10 bg-background px-4 pb-2.5 pt-1"
      style={{ boxShadow: COMPACT_SHADOW }}
    >
      <View className="gap-2 rounded-2xl bg-selected px-3.5 pb-3 pt-2.5">
        <View className="gap-0.5">
          <Text className="font-manrope-semibold text-caption text-on-selected opacity-85">
            {hero.dateLine}
          </Text>
          <Text className="font-manrope-extrabold text-[17px] leading-[22px] tracking-[-0.2px] text-on-selected">
            {hero.compactStatus}
          </Text>
        </View>
        <HomeSteps steps={hero.steps} compact />
      </View>
    </View>
  );
}
