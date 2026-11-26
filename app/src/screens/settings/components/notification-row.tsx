import { Text, View } from 'react-native';

import { Switch } from '@/components';
import type { NotificationRowProps } from '../types';

/**
 * One switch in the Notifications card: the group's name and when it reminds, with its Switch. While notifications
 * are blocked the switch shows off and disabled, and the text is muted.
 */
export function NotificationRow({ row, separated, blocked, onChange }: NotificationRowProps) {
  return (
    <View
      className={`min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-2 ${
        separated ? 'border-t border-outline-variant' : ''
      }`}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={`font-manrope-bold text-label ${blocked ? 'text-on-surface-variant' : 'text-on-surface'}`}
        >
          {row.name}
        </Text>
        <Text
          className={`font-manrope-semibold text-caption ${
            blocked ? 'text-on-disabled' : 'text-on-surface-variant'
          }`}
        >
          {row.detail}
        </Text>
      </View>
      <Switch
        value={blocked ? false : row.on}
        onChange={onChange}
        disabled={blocked}
        accessibilityLabel={row.name}
      />
    </View>
  );
}
