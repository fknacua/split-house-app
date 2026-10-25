import { Text, View } from 'react-native';

import type { HomeStepsProps } from '../types';

/**
 * The month's three steps as a segmented bar with a label under each segment. Done and current
 * steps are filled; the current one is bold. `compact` tightens the spacing for the pinned card.
 */
export function HomeSteps({ steps, compact = false }: HomeStepsProps) {
  return (
    <View accessibilityLabel="Month progress" className="flex-row gap-1.5">
      {steps.map((step) => {
        const reached = step.state !== 'todo';
        return (
          <View key={step.label} className={`min-w-0 flex-1 ${compact ? 'gap-1' : 'gap-[5px]'}`}>
            <View className={`h-1 rounded-sm ${reached ? 'bg-on-selected' : 'bg-background'}`} />
            <Text
              className={`text-caption text-on-selected ${reached ? '' : 'opacity-75'} ${
                step.state === 'current' ? 'font-manrope-extrabold' : 'font-manrope-semibold'
              }`}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
