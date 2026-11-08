import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components';
import type { SettingsMessageRow } from '@splithouse/shared';
import type { MessageRowProps } from '../types';

/** The status line's ink for each tone the server sends. */
const STATUS_INK: Record<SettingsMessageRow['tone'], string> = {
  success: 'text-success',
  muted: 'text-on-surface-variant',
};

/**
 * One template in the Message templates card, on Settings and First run's Custom messages: name, when it is sent,
 * the status in its tone, and a chevron. Opens the template's landing page.
 */
export function MessageRow({ row, separated }: MessageRowProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${row.detail}`}
      onPress={() => router.push({ pathname: '/settings/template/[kind]', params: { kind: row.kind } })}
      className={`min-h-[76px] flex-row items-center gap-3 py-3 pl-4 pr-2.5 active:opacity-70 ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-manrope-bold text-label text-on-surface">{row.name}</Text>
        <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.description}</Text>
        <Text className={`font-manrope-bold text-caption ${STATUS_INK[row.tone]}`}>{row.detail}</Text>
      </View>
      <Icon as={ChevronRight} className="text-on-surface-variant" />
    </Pressable>
  );
}
