import { ChevronDown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';

/** Props for {@link ConfirmExpandRow}. */
export interface ConfirmExpandRowProps {
  label: string;
  /** e.g. `3 charges`, `Per unit · 4 people`. */
  value: string;
  /** What the row opens to: a label and value each. */
  items: { label: string; value: string }[];
  expanded: boolean;
  onToggle: () => void;
}

/**
 * A row in a confirm dialog's details box that opens to list what it sums up, with a chevron that turns
 * (`Confirm` `recordMulti`'s For, `addCharge`'s Split per person). It has a divider above it, as every row but the
 * first, and the items sit indented under it.
 */
export function ConfirmExpandRow({ label, value, items, expanded, onToggle }: ConfirmExpandRowProps) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${label}, ${value}`}
        onPress={onToggle}
        className="min-h-11 flex-row items-center justify-between gap-3 border-t border-outline-variant py-2.5 active:opacity-70"
      >
        <Text className="font-manrope-semibold text-label text-on-surface-variant">{label}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="font-manrope-bold text-label text-on-surface">{value}</Text>
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <Icon as={ChevronDown} size={16} className="text-on-surface-variant" />
          </View>
        </View>
      </Pressable>
      {expanded
        ? items.map((item) => (
            <View
              key={item.label}
              className="mb-2 ml-1 flex-row items-baseline justify-between gap-3 border-l-2 border-outline-variant py-0.5 pl-3"
            >
              <Text className="font-manrope-medium text-caption text-on-surface-variant">{item.label}</Text>
              <Text className="font-manrope-semibold text-caption text-on-surface-variant" style={{ fontVariant: ['tabular-nums'] }}>
                {item.value}
              </Text>
            </View>
          ))
        : null}
    </>
  );
}
