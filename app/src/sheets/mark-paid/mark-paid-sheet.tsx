import { forwardRef } from 'react';

import type { AppSheetRef } from '@/components';
import { useChargePayment } from '@/hooks';
import { PaymentSheet } from './components/payment-sheet';
import type { MarkPaidSheetProps } from './types';

/**
 * Mark paid: records what was received for one charge, with the amount (the expected amount filled
 * in) and the day (today). A different amount renames the button and shows the difference in an
 * info Alert. The text comes from `GET /api/charges/:id/payment`, so the sheet shows a
 * skeleton until it arrives. Each screen that offers it mounts its own and opens it through the ref.
 */
export const MarkPaidSheet = forwardRef<AppSheetRef, MarkPaidSheetProps>(function MarkPaidSheet({ chargeId }, ref) {
  const query = useChargePayment(chargeId);
  return (
    <PaymentSheet
      ref={ref}
      sheet={query.data ?? null}
      loadError={query.error}
      verb="Save"
      fallbackTitle="Mark paid"
      fallbackActionLabel="Mark as paid"
    />
  );
});
