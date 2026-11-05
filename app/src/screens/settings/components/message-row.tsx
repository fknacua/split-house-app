import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components';
import type { MessageRowProps } from '../types';

/** One template in the Messages card: name, detail and a chevron. Opens the template editor; the nudge's comes at 10.5. */
export function MessageRow({ row, separated }: MessageRowProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.name}
      onPress={() => {
        if (row.kind === 'MONTHLY') router.push({ pathname: '/settings/template/[kind]', params: { kind: row.kind } });
      }}
      className={`min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-2.5 active:opacity-70 ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-manrope-bold text-label text-on-surface">{row.name}</Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.detail}</Text>
      </View>
      <Icon as={ChevronRight} className="text-on-surface-variant" />
    </Pressable>
  );
}
