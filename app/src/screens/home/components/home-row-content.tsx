import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components';
import { useOpenTarget } from '../use-open-target';
import type { HomeRowProps } from '../types';
import { HomeActionButton } from './home-action-button';

/** What an open charge row shows: its note, its buttons and a link to more. Lines up under the title. */
export function HomeRowContent({ row }: HomeRowProps) {
  const { target } = row.link;
  const { openTarget } = useOpenTarget();

  return (
    <View className="gap-2.5 pl-12.5">
      {row.note ? (
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.note}</Text>
      ) : null}
      {row.actions.length > 0 ? (
        <View className="flex-row gap-2">
          {row.actions.map((action) => (
            <HomeActionButton key={action.label} action={action} />
          ))}
        </View>
      ) : null}
      {target ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => openTarget(target)}
          className="-mb-3 -mt-1.5 min-h-11 flex-row items-center gap-1 self-start active:opacity-70"
        >
          <Text className="font-manrope-bold text-label text-on-surface">{row.link.label}</Text>
          <Icon as={ArrowRight} size={16} className="text-on-surface" />
        </Pressable>
      ) : null}
    </View>
  );
}
