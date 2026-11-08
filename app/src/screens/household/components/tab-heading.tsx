import { Text, View } from 'react-native';

import { Button } from '@/components';
import type { TabHeadingProps } from '../types';

/** The top of a Household tab: the heading, with the tab's one action, if any, at its right. */
export function TabHeading({ title, note, actionLabel, actionIcon, onAction }: TabHeadingProps) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="min-w-0 flex-1 font-manrope-bold text-label text-on-surface">
          {title}
        </Text>
        {actionLabel ? (
          <Button label={actionLabel} variant="ghost" size="small" icon={actionIcon} onPress={onAction} className="-mr-3 px-3" />
        ) : null}
      </View>
      {note ? <Text className="px-1 font-manrope-medium text-caption text-on-surface-variant">{note}</Text> : null}
    </View>
  );
}
