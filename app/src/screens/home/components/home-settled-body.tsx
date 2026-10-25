import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';
import type { HomeSettledBodyProps } from '../types';
import { HomeTile } from './home-tile';

/** The hero body once the month is settled: a check beside the title, and the two tiles. */
export function HomeSettledBody({ body }: HomeSettledBodyProps) {
  return (
    <>
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-full bg-primary">
          <Icon as={Check} size={24} className="text-on-primary" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text
            accessibilityRole="header"
            className="font-manrope-extrabold text-title tracking-[-0.4px] text-on-selected"
          >
            {body.title}
          </Text>
          <Text className="font-manrope-semibold text-caption text-on-selected opacity-90">
            {body.text}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2.5">
        {body.tiles.map((tile) => (
          <HomeTile key={tile.label} label={tile.label} value={tile.value} />
        ))}
      </View>
    </>
  );
}
