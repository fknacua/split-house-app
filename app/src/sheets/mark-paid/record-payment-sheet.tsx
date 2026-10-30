import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import type { AppSheetRef } from '@/components';
import { usePaymentOptions } from '@/hooks';
import { PaymentPickers } from './components/payment-pickers';
import { PaymentSheet } from './components/payment-sheet';
import { choosePayment } from './helpers';
import type { PaymentPick, RecordPaymentSheetProps } from './types';

/**
 * Record payment: money received outside a row. The Mark paid sheet with From and For above it;
 * each charge brings its own sheet text from `GET /api/months/:month/payment-options`, so choosing
 * one only swaps the text and refills the form. Saving goes through the charge's own payment
 * endpoint, one charge per payment. Opens on the person or charge given, or the most urgent.
 */
export const RecordPaymentSheet = forwardRef<AppSheetRef, RecordPaymentSheetProps>(function RecordPaymentSheet(
  { month, personId, chargeId },
  ref,
) {
  const sheetRef = useRef<AppSheetRef>(null);
  const query = usePaymentOptions(month);
  const [pick, setPick] = useState<PaymentPick>({ personId, chargeId });
  const choice = choosePayment(query.data, pick);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setPick({ personId, chargeId });
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [personId, chargeId],
  );

  return (
    <PaymentSheet
      ref={sheetRef}
      sheet={choice?.charge.sheet ?? null}
      loadError={query.error}
      verb="Record"
      fallbackTitle="Record payment"
      fallbackActionLabel="Record payment"
      renderFields={({ saving }) => (
        <PaymentPickers options={query.data} choice={choice} disabled={saving} onPick={setPick} />
      )}
    />
  );
});
