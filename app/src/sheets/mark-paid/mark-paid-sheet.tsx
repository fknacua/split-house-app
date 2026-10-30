import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, AppSheet, DateField, MoneyInput, type AppSheetRef } from '@/components';
import { useChargePayment, useSavePayment } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { todayKey } from '@splithouse/shared';
import { PaymentSummary } from './components/payment-summary';
import { markPaidFormSchema, toMarkPaidFormValues, toSavePaymentRequest, type MarkPaidFormValues } from './helpers';
import type { MarkPaidSheetProps } from './types';

/**
 * Mark paid: records what was received for one charge, with the amount (the expected amount filled
 * in) and the day (today). The text comes from `GET /api/charges/:id/payment`, so the sheet shows a
 * skeleton until it arrives. Each screen that offers it mounts its own and opens it through the ref.
 * On success Home, History, the bill and the charge are refetched, then the sheet closes.
 */
export const MarkPaidSheet = forwardRef<AppSheetRef, MarkPaidSheetProps>(function MarkPaidSheet({ chargeId }, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const [opened, setOpened] = useState(false);
  const query = useChargePayment(chargeId);
  const sheet = query.data ?? null;
  const savePayment = useSavePayment(chargeId);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidFormSchema),
    mode: 'onChange',
  });

  // Filled in each time the sheet opens, or as soon as the sheet arrives when it opened before that.
  const filled = useRef(false);
  useEffect(() => {
    if (!opened || !sheet || filled.current) return;
    reset(toMarkPaidFormValues(sheet));
    filled.current = true;
  }, [opened, sheet, reset]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        filled.current = false;
        savePayment.reset();
        setOpened(true);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [savePayment],
  );

  // Awaited rather than a per-call `onSuccess`, which TanStack skips when its observer is not
  // listening; the refetches finish first, then the sheet closes.
  const save = handleSubmit(async (values) => {
    try {
      await savePayment.mutateAsync(toSavePaymentRequest(values));
    } catch {
      return; // The failed state shows from `savePayment.error`.
    }
    sheetRef.current?.close();
  });
  const saving = savePayment.isPending;

  return (
    <AppSheet
      ref={sheetRef}
      title={sheet?.title ?? 'Mark paid'}
      subtitle={sheet?.subtitle}
      actionLabel={sheet?.actionLabel ?? 'Mark as paid'}
      onAction={save}
      saving={saving}
      failed={savePayment.isError}
      // The default text covers an unreachable server; the backend's own message says what else went wrong.
      failedMessage={savePayment.error instanceof ApiRequestError ? savePayment.error.message : undefined}
      disabled={!sheet || !isValid}
      onClose={() => setOpened(false)}
    >
      {/* A refusal (an unknown charge, or a credit) says why; an unreachable server shows the app's prompt. */}
      {query.error instanceof ApiRequestError ? <Alert variant="danger" message={query.error.message} /> : null}
      <PaymentSummary sheet={sheet} />
      <MoneyInput
        placeholder="0.00"
        clearable
        fieldControlProps={{
          control,
          name: 'paidCents',
          label: 'Amount received',
          required: true,
          helper: 'Change it if they paid a different amount',
          disabled: saving || !sheet,
        }}
      />
      <DateField
        maxDate={todayKey()}
        fieldControlProps={{ control, name: 'paidOn', label: 'Received on', required: true, disabled: saving || !sheet }}
      />
    </AppSheet>
  );
});
