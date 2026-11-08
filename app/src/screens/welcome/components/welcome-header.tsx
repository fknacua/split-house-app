import { Text, View } from 'react-native';

import { AppLogo, SegmentedProgress } from '@/components';
import type { WelcomeHeaderProps } from '../types';

/** The top of Welcome: the logo, heading, intro and, once a step is done, the segmented progress bar. */
export function WelcomeHeader({ heading, intro, progress }: WelcomeHeaderProps) {
  return (
    <View className="gap-3 px-1 pt-2">
      <AppLogo />
      <Text accessibilityRole="header" className="font-manrope-extrabold text-title text-on-surface">
        {heading}
      </Text>
      <Text className="font-manrope-medium text-body text-on-surface-variant">{intro}</Text>
      {progress ? (
        <View className="gap-1.5 pt-1">
          <View className="flex-row justify-between gap-3">
            <Text className="font-manrope-bold text-caption text-on-surface">{progress.text}</Text>
            {progress.note ? (
              <Text className="font-manrope-semibold text-caption text-on-surface-variant">{progress.note}</Text>
            ) : null}
          </View>
          <SegmentedProgress
            segments={progress.segments}
            done={progress.done}
            accessibilityLabel={progress.text}
          />
        </View>
      ) : null}
    </View>
  );
}
