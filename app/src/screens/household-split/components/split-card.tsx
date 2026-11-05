import { CircleAlert } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, Icon } from '@/components';
import type { SplitCardProps } from '../types';

/** One calculated line, such as `Shared rent`. */
function CalcLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="font-manrope-bold text-label text-on-surface-variant">{label}</Text>
      <Text className="font-manrope-bold text-label text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/** A card of the `Splits` board: its title, the tenant rows, what is calculated from them, then the split control. */
export function SplitCard({ title, children, leftLabel, left, total, error, split }: SplitCardProps) {
  return (
    <Card padded={false} className="gap-2 px-4 py-3.5">
      <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
        {title}
      </Text>
      {children}
      {error ? (
        <View className="flex-row items-center gap-1">
          <Icon as={CircleAlert} size={14} className="text-danger" />
          <Text className="min-w-0 flex-1 font-manrope-semibold text-caption text-danger">{error}</Text>
        </View>
      ) : null}
      <View className="gap-2 border-t border-outline-variant pt-2.5">
        <CalcLine label={leftLabel} value={left} />
        {total ? <CalcLine label={total.label} value={total.value} /> : null}
      </View>
      {split}
    </Card>
  );
}
