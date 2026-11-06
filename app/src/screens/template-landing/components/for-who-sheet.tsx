import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppSheet, type AppSheetRef } from '@/components';
import type { ForWhoSheetProps } from '../types';

/**
 * For who: one row per person without a custom template, `{name} · {type}`. A tap closes the sheet and opens that
 * person's new custom template. There is no confirm button, only Cancel, as in Nudge about which charge?.
 */
export const ForWhoSheet = forwardRef<AppSheetRef, ForWhoSheetProps>(function ForWhoSheet({ forWho, onChoose }, ref) {
  return (
    <AppSheet ref={ref} title={forWho.title} snapPoint="50%">
      {/* One child, so the body's gap doesn't split the rows. */}
      <View>
        {forWho.rows.map((row) => (
          <Pressable
            key={row.personId}
            accessibilityRole="button"
            onPress={() => onChoose(row.personId)}
            className="min-h-12 justify-center rounded-xl px-3 active:bg-container"
          >
            <Text className="font-manrope-medium text-body text-on-surface">{row.label}</Text>
          </Pressable>
        ))}
      </View>
    </AppSheet>
  );
});
