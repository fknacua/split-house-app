import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { BareSelectField, FormField, type AppSheetRef } from '@/components';
import { useChargePayment } from '@/hooks';
import { PaymentSheet } from './components/payment-sheet';
import { toPaidChargeOptions } from './helpers';
import type { EditPaymentSheetProps } from './types';

/**
 * Edit payment: the Mark paid sheet on a charge that is already paid, filled in with the stored
 * amount and day; saving replaces the payment. With two or more paid charges a For list above it
 * picks which payment to edit, and choosing one loads that charge's sheet. Opens on `chargeId`.
 */
export const EditPaymentSheet = forwardRef<AppSheetRef, EditPaymentSheetProps>(function EditPaymentSheet(
  { chargeId, charges },
  ref,
) {
  const sheetRef = useRef<AppSheetRef>(null);
  const [chosen, setChosen] = useState(chargeId);
  const query = useChargePayment(chosen);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setChosen(chargeId);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [chargeId],
  );

  return (
    <PaymentSheet
      ref={sheetRef}
      sheet={query.data ?? null}
      loadError={query.error}
      verb="Save"
      fallbackTitle="Edit payment"
      fallbackActionLabel="Save"
      renderFields={({ saving }) =>
        charges.length > 1 ? (
          <FormField label="For" required disabled={saving}>
            <BareSelectField
              accessibilityLabel="For"
              options={toPaidChargeOptions(charges)}
              value={chosen}
              onChange={setChosen}
              disabled={saving}
            />
          </FormField>
        ) : null
      }
    />
  );
});
