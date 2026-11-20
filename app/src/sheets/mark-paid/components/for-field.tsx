import { Text, View } from 'react-native';

import { Badge, Checkbox, FormField } from '@/components';
import { selectAllState } from '../helpers';
import type { ForFieldProps } from '../types';

/**
 * For: the picked person's unpaid charges, each a Checkbox row with its title, amount, due line and
 * chip, under a Select all row; the count (`1 of 3 selected`) sits at the end of the label. With
 * nobody picked a disabled box says to pick a person first.
 */
export function ForField({ for: list, disabled, onToggle, onToggleAll }: ForFieldProps) {
  const all = selectAllState(list.rows);
  return (
    <FormField
      label="For"
      required
      disabled={disabled}
      labelAction={
        list.count ? (
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{list.count}</Text>
        ) : undefined
      }
    >
      {list.empty !== null ? (
        <View className="min-h-12 justify-center rounded-field border border-outline-variant bg-disabled px-3.5">
          <Text className="font-manrope-semibold text-label text-on-disabled">{list.empty}</Text>
        </View>
      ) : (
        <View className={`rounded-field border border-outline bg-surface px-3.5 ${disabled ? 'opacity-60' : ''}`}>
          <Checkbox
            label="Select all"
            value={all.value}
            indeterminate={all.indeterminate}
            onChange={onToggleAll}
            disabled={disabled}
            className="min-h-[52px] gap-3"
          >
            <Text className="flex-1 font-manrope-bold text-body text-on-surface">Select all</Text>
          </Checkbox>
          {list.rows.map((row) => (
            <Checkbox
              key={row.chargeId}
              label={row.title}
              value={row.ticked}
              onChange={() => onToggle(row.chargeId)}
              disabled={disabled}
              className="min-h-14 gap-3 border-t border-outline-variant py-2"
            >
              <View className="flex-1 gap-0.5">
                <View className="flex-row justify-between gap-2">
                  <Text className="shrink font-manrope-bold text-body text-on-surface">{row.title}</Text>
                  <Text className="font-manrope-bold text-body text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
                    {row.amount}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.detail ?? ''}</Text>
                  <Badge label={row.chip.label} variant={row.chip.tone} />
                </View>
              </View>
            </Checkbox>
          ))}
        </View>
      )}
    </FormField>
  );
}
