import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Alert, AppSheet, DateField, MoneyInput, type AppSheetRef } from '@/components';
import { useSavePayment } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { todayKey } from '@splithouse/shared';
import {
  markPaidFormSchema,
  toAmountState,
  toMarkPaidFormValues,
  toSavePaymentRequest,
  type MarkPaidFormValues,
} from '../helpers';
import type { PaymentSheetProps } from '../types';
import { PaymentSummary } from './payment-summary';

/**
 * The payment sheet Mark paid and Record payment share: the summary, Amount received (filled in),
 * Received on (today) and the difference Alert, saved through `POST /api/charges/:id/payment`. The
 * caller supplies the charge's sheet; a new charge (Record payment's For) refills the form. On
 * success Home, History, the bill and the charge are refetched, then the sheet closes.
 */
export const PaymentSheet = forwardRef<AppSheetRef, PaymentSheetProps>(function PaymentSheet(
  { sheet, loadError, verb, fallbackTitle, fallbackActionLabel, renderFields },
  ref,
) {
  const sheetRef = useRef<AppSheetRef>(null);
  const [opened, setOpened] = useState(false);
  const savePayment = useSavePayment(sheet?.chargeId ?? '');
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidFormSchema),
    mode: 'onChange',
  });
  const paidCents = useWatch({ control, name: 'paidCents' }) ?? null;
  const amount = sheet ? toAmountState(sheet, paidCents, verb) : null;

  // Filled in each time the sheet opens or the charge changes, or as soon as the sheet arrives
  // when it opened before that.
  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!opened || !sheet || filledFor.current === sheet.chargeId) return;
    reset(toMarkPaidFormValues(sheet));
    filledFor.current = sheet.chargeId;
  }, [opened, sheet, reset]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        filledFor.current = null;
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
      title={sheet?.title ?? fallbackTitle}
      subtitle={sheet?.subtitle}
      actionLabel={amount?.actionLabel ?? fallbackActionLabel}
      onAction={save}
      saving={saving}
      failed={savePayment.isError}
      // The default text covers an unreachable server; the backend's own message says what else went wrong.
      failedMessage={savePayment.error instanceof ApiRequestError ? savePayment.error.message : undefined}
      disabled={!sheet || !isValid}
      onClose={() => setOpened(false)}
    >
      {/* A refusal (an unknown charge, or a credit) says why; an unreachable server shows the app's prompt. */}
      {loadError instanceof ApiRequestError ? <Alert variant="danger" message={loadError.message} /> : null}
      {renderFields?.({ saving })}
      <PaymentSummary sheet={sheet} />
      <MoneyInput
        placeholder="0.00"
        clearable
        fieldControlProps={{
          control,
          name: 'paidCents',
          label: 'Amount received',
          required: true,
          helper: amount ? (amount.helper ?? undefined) : 'Change it if they paid a different amount',
          disabled: saving || !sheet,
        }}
      />
      <DateField
        maxDate={todayKey()}
        fieldControlProps={{ control, name: 'paidOn', label: 'Received on', required: true, disabled: saving || !sheet }}
      />
      {/* Where the board had the carry Radio: there is no carry, so it only says what the difference means. */}
      {amount?.difference ? (
        <Alert variant="info" title={amount.difference.title} message={amount.difference.text} />
      ) : null}
    </AppSheet>
  );
});
