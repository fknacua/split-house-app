import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, Checkbox } from '@/components';
import type { ChargesCardProps } from '../types';
import { CardHeader } from './card-header';
import { FieldCard } from './field-card';

/**
 * Nudge mode's charge card: the ticked total with what is ticked and the longest-overdue chip. With
 * two or more overdue charges it opens to a Checkbox row per charge; ticking changes the nudge. Closed
 * as the sheet opens.
 */
export function ChargesCard({ charges, onToggle }: ChargesCardProps) {
  const [open, setOpen] = useState(false);
  const showRows = charges.expandable && open;
  return (
    <FieldCard label={charges.label}>
      <CardHeader
        amount={charges.amount}
        lines={[charges.sub, charges.selected]}
        chip={charges.chip}
        open={charges.expandable ? open : null}
        onToggle={() => setOpen((o) => !o)}
      />
      {showRows ? (
        <View className="pb-1.5">
          {charges.rows.map((row) => (
            <Checkbox
              key={row.chargeId}
              label={row.title}
              value={row.ticked}
              onChange={() => onToggle(row.chargeId)}
              className="min-h-14 gap-3 border-t border-outline-variant py-2"
            >
              <View className="flex-1 gap-0.5">
                <View className="flex-row justify-between gap-2">
                  <Text className="shrink font-manrope-bold text-label text-on-surface">{row.title}</Text>
                  <Text
                    className="font-manrope-bold text-label text-on-surface"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {row.amount}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.detail}</Text>
                  <Badge label={row.chip.label} variant={row.chip.tone} />
                </View>
              </View>
            </Checkbox>
          ))}
        </View>
      ) : null}
    </FieldCard>
  );
}
