import { forwardRef } from 'react';
import { View } from 'react-native';

import { AppSheet, type AppSheetRef } from '@/components';
import type { NudgeChargeSheetProps } from '../types';
import { ChargeRow } from './charge-row';

/**
 * Nudge about which charge? Not drawn (agreed with Francis, 2026-10-30): Nudge again opens it when
 * no charge was chosen and two or more are overdue. One row per overdue charge; a tap closes the
 * sheet and nudges about that charge. There is no confirm button, only Cancel.
 */
export const NudgeChargeSheet = forwardRef<AppSheetRef, NudgeChargeSheetProps>(function NudgeChargeSheet(
  { rows, onChoose },
  ref
) {
  return (
    <AppSheet ref={ref} title="Nudge about which charge?" snapPoint="50%">
      {/* One child, so the body's gap doesn't split the rows. */}
      <View>
        {rows.map((row, i) => (
          <ChargeRow key={row.chargeId} row={row} first={i === 0} onPress={() => onChoose(row)} />
        ))}
      </View>
    </AppSheet>
  );
});
