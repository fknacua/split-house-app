import { useState } from 'react';
import { Text, View } from 'react-native';

import type { TotalCardProps } from '../types';
import { CardHeader } from './card-header';
import { FieldCard } from './field-card';

/**
 * Monthly mode's Total: what the message asks for, how many charges and when, whom they collect for
 * and the chip, opening to one row per charge. Closed as the sheet opens.
 */
export function TotalCard({ total }: TotalCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <FieldCard label="Total">
      <CardHeader
        amount={total.amount}
        lines={[total.sub, total.paysFor]}
        chip={total.chip}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />
      {open ? (
        <View className="pb-2">
          {total.rows.map((row, i) => (
            <View
              key={i}
              className="min-h-9 flex-row items-center justify-between gap-3 border-t border-outline-variant"
            >
              <Text className="shrink font-manrope-semibold text-label text-on-surface-variant">{row.title}</Text>
              <Text
                className="font-manrope-bold text-label text-on-surface"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {row.amount}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </FieldCard>
  );
}
