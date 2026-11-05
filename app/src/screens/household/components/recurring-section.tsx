import { Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { AppSheetRef } from '@/components';
import type { HouseholdRecurringCharge, HouseholdTarget } from '@splithouse/shared';
import type { RecurringSectionProps } from '../types';
import { HouseholdCard } from './household-card';
import { RecurringSheet } from './recurring-sheet';
import { RemoveRecurringDialog } from './remove-recurring-dialog';
import { TabHeading } from './tab-heading';

/**
 * The Recurring tab, not drawn: the heading with Add charge, then the charges running in the month shown, on the same
 * card as People. The sheet only exists while open, and always edits the latest saved values, whichever month is shown.
 */
export function RecurringSection({ recurring }: RecurringSectionProps) {
  const sheetRef = useRef<AppSheetRef>(null);
  // Null while closed, so each opening mounts a new sheet that starts from the values it is given.
  const [opening, setOpening] = useState<{ charge: HouseholdRecurringCharge | null } | null>(null);
  const [removing, setRemoving] = useState<HouseholdRecurringCharge | null>(null);

  const openSheet = (charge: HouseholdRecurringCharge | null) => {
    setOpening({ charge });
    requestAnimationFrame(() => sheetRef.current?.open());
  };

  const openTarget = (target: HouseholdTarget) => {
    if (target.kind === 'add-recurring') {
      openSheet(null);
    } else if (target.kind === 'edit-recurring') {
      openSheet(recurring.sheet.charges.find((charge) => charge.chargeId === target.chargeId) ?? null);
    }
  };

  return (
    <View className="gap-2">
      <TabHeading
        title={recurring.title}
        note={recurring.pendingNote}
        actionLabel={recurring.add.label}
        actionIcon={Plus}
        onAction={() => openTarget(recurring.add.target)}
      />
      {recurring.rows.length === 0 ? (
        <Text className="px-1 font-manrope-medium text-body text-on-surface-variant">{recurring.emptyText}</Text>
      ) : null}
      {recurring.rows.map((row) => (
        <HouseholdCard key={row.chargeId} card={row} onOpen={openTarget} />
      ))}
      {opening ? (
        <RecurringSheet
          ref={sheetRef}
          sheet={recurring.sheet}
          charge={opening.charge}
          onRemove={setRemoving}
          onClose={() => setOpening(null)}
        />
      ) : null}
      <RemoveRecurringDialog charge={removing} onClose={() => setRemoving(null)} />
    </View>
  );
}
