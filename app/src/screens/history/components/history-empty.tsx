import { History } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components';

/**
 * History with no past months yet (dry-run log D1): a centred icon, a title and one line. It only
 * shows from the first run until the first month ends, when `GET /api/history` returns no groups.
 */
export function HistoryEmpty() {
  return (
    <View className="items-center gap-3 px-6 pt-10">
      <View className="size-12 items-center justify-center rounded-full bg-container">
        <Icon as={History} size={24} className="text-on-surface" />
      </View>
      <View className="items-center gap-1">
        <Text
          accessibilityRole="header"
          className="text-center font-manrope-bold text-label text-on-surface"
        >
          No past months yet
        </Text>
        <Text className="text-center font-manrope-medium text-caption text-on-surface-variant">
          Each month moves here when the next one starts.
        </Text>
      </View>
    </View>
  );
}
