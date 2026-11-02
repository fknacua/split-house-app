import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components';
import { PERSON_COLOR_BG } from '@/lib';
import type { ColorSwatchProps } from '../types';

/**
 * One color choice: a 48px circle. The selected one has a check and a ring in the text color, with a
 * 3px gap where the page shows through.
 */
export function ColorSwatch({ color, name, selected, onPress }: ColorSwatchProps) {
  return (
    <View className="w-1/4 items-center">
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={name}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        className={`size-12 items-center justify-center rounded-full ${PERSON_COLOR_BG[color]}`}
      >
        {selected ? (
          <>
            <View pointerEvents="none" className="absolute -inset-[5px] rounded-full border-2 border-on-surface" />
            <Icon as={Check} size={22} className="text-on-person" />
          </>
        ) : null}
      </Pressable>
    </View>
  );
}
