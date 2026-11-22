import { Text, View } from 'react-native';

import { PersonSplitBar } from '@/components';
import { PERSON_COLOR_BG } from '@/lib';
import type { SplitPreviewProps } from '../types';

/**
 * The split preview (`AddCharge`): the heading, then the dashed placeholder while there is nothing to split, or the
 * per-person bar in each person's color (the Household bar, V58) over a card with a row per person: their color dot,
 * their name with the units, shares or route under it, and their amount on the right. Display only; every string
 * comes from the server.
 */
export function SplitPreview({ preview }: SplitPreviewProps) {
  return (
    <View className="gap-2">
      <Text className="font-manrope-bold text-label text-on-surface">{preview.heading}</Text>
      {preview.empty !== null ? (
        <View className="rounded-alert border border-dashed border-outline px-3.5 py-[18px]">
          <Text className="text-center font-manrope-semibold text-caption text-on-surface-variant">{preview.empty}</Text>
        </View>
      ) : (
        <>
          <PersonSplitBar segments={preview.rows} accessibilityLabel={preview.accessibilityLabel ?? preview.heading} />
          <View className="rounded-alert bg-container px-3 py-0.5">
            {preview.rows.map((row, index) => (
              <View
                key={row.personId}
                className={`min-h-11 flex-row items-center gap-2.5 py-1.5 ${index === 0 ? '' : 'border-t border-outline-variant'}`}
              >
                {/* The same dot as Household's legend, so the bar's colors say who is who (V67). */}
                <View className={`h-2.5 w-2.5 rounded-full ${PERSON_COLOR_BG[row.color]}`} />
                <View className="min-w-0 flex-1">
                  <Text className="font-manrope-bold text-label text-on-surface">{row.name}</Text>
                  {row.basis ? (
                    <Text className="font-manrope-semibold text-caption text-on-surface-variant">{row.basis}</Text>
                  ) : null}
                </View>
                <Text className="font-manrope-bold text-label text-on-surface" style={{ fontVariant: ['tabular-nums'] }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
