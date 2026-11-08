import { CalendarDays } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import type { StartMonthCardProps } from '../types';

/**
 * One Start month card (`FirstRunStart.dc.html`): at least 96px high on `surface`, the kicker, the month and an
 * optional warning note, with a radio ring or a calendar icon on the right. The selected card has a 2px `primary`
 * border; the others keep a transparent one, so choosing never shifts the layout. Custom on `Pressable`, as Welcome's
 * rows are, since gluestack's `Radio` root drew cards broken on device (see `RadioCardGroup`).
 */
export function StartMonthCard({ kicker, title, note, selected, indicator, onPress }: StartMonthCardProps) {
  return (
    <Pressable
      accessibilityRole={indicator === 'radio' ? 'radio' : 'button'}
      accessibilityState={indicator === 'radio' ? { checked: selected } : { selected }}
      onPress={onPress}
      className={`min-h-24 flex-row items-center gap-3 rounded-card border-2 bg-surface p-4 ${
        selected ? 'border-primary' : 'border-transparent'
      }`}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{kicker}</Text>
        <Text className="font-manrope-extrabold text-[18px] leading-6 text-on-surface">{title}</Text>
        {note ? <Text className="font-manrope-semibold text-caption text-on-warning-container">{note}</Text> : null}
      </View>
      {indicator === 'calendar' ? (
        <Icon as={CalendarDays} size={22} className="text-on-surface-variant" />
      ) : (
        <View
          className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
            selected ? 'border-primary' : 'border-outline'
          }`}
        >
          {selected ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
        </View>
      )}
    </Pressable>
  );
}
