import { ChevronDown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Icon } from '@/components';
import type { CardHeaderProps } from '../types';

/**
 * The top of the Total and Overdue charges cards: the amount, its caption lines, the chip and, on a
 * card that opens, the chevron, turned while open. At least 64px high.
 */
export function CardHeader({ amount, lines, chip, open, onToggle }: CardHeaderProps) {
  const body = (
    <>
      <View className="flex-1 gap-0.5">
        <Text
          className="font-manrope-extrabold text-sheet-title text-on-surface"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {amount}
        </Text>
        {lines.map((line, i) =>
          line ? (
            <Text key={i} className="font-manrope-semibold text-caption text-on-surface-variant">
              {line}
            </Text>
          ) : null
        )}
      </View>
      {chip ? <Badge label={chip.label} variant={chip.tone} className="self-center" /> : null}
      {open !== null ? (
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon as={ChevronDown} size={20} className="text-on-surface-variant" />
        </View>
      ) : null}
    </>
  );

  if (open === null) return <View className="min-h-16 flex-row items-center gap-2 py-2.5">{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      className="min-h-16 flex-row items-center gap-2 py-2.5 active:opacity-70"
    >
      {body}
    </Pressable>
  );
}
