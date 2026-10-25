import { Text, View } from 'react-native';

import { Progress } from '@/components';
import type { HomeCollectingBodyProps } from '../types';

/** The hero body while payments come in: what you are fronting, then how much of the utilities bill is covered. */
export function HomeCollectingBody({ body }: HomeCollectingBodyProps) {
  const { fronting, coverage } = body;

  return (
    <>
      <View className="gap-0.5">
        <Text className="font-manrope-semibold text-caption text-on-selected opacity-85">
          {fronting.label}
        </Text>
        <Text
          className="font-manrope-extrabold text-hero tracking-[-0.8px] text-on-selected"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {fronting.value}
        </Text>
        <Text className="font-manrope-semibold text-caption text-on-selected opacity-85">
          {fronting.note}
        </Text>
      </View>
      <View className="gap-2">
        <View className="flex-row justify-between">
          <Text className="font-manrope-bold text-label text-on-selected">{coverage.label}</Text>
          <Text
            className="font-manrope-bold text-label text-on-selected"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {coverage.text}
          </Text>
        </View>
        <Progress value={coverage.percent} accessibilityLabel={`${coverage.label}: ${coverage.text}`} />
        <Text className="font-manrope-semibold text-caption text-on-selected opacity-85">
          {coverage.note}
        </Text>
      </View>
    </>
  );
}
