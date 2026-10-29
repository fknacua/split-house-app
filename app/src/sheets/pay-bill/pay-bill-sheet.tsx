import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert, AppSheet, DateField, MoneyInput, type AppSheetRef } from '@/components';
import { useBill, useMarkBillPaid } from '@/hooks';
import { ApiRequestError } from '@/lib/api';
import { todayKey, type BillPaySheet } from '@splithouse/shared';
import { BillSummary } from './components/bill-summary';
import {
  payBillFormSchema,
  toMarkBillPaidRequest,
  toPayBillFormValues,
  type PayBillFormValues,
} from './helpers';
import type { PayBillSheetProps } from './types';

/**
 * Mark bill paid: records that the user paid the utility company, with the amount (Current Charges
 * filled in) and the day (today). It pays nothing. The text comes from the bill response
 * (`useBill`), so a screen that has not loaded the bill shows a skeleton until it arrives. Each
 * screen that offers it mounts its own and opens it through the ref. On success Home, History and
 * the bill are refetched, then the sheet closes.
 */
export const PayBillSheet = forwardRef<AppSheetRef, PayBillSheetProps>(function PayBillSheet({ month }, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const [opened, setOpened] = useState(false);
  const latest = useBill(month).data?.paySheet ?? null;
  // Once the bill is paid the refetched response has no sheet text; keep the last one shown, so the
  // sheet does not empty while it slides closed.
  const [sheet, setSheet] = useState<BillPaySheet | null>(null);
  if (latest && latest !== sheet) setSheet(latest);
  const markPaid = useMarkBillPaid(month);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<PayBillFormValues>({
    resolver: zodResolver(payBillFormSchema),
    mode: 'onChange',
  });

  // Filled in each time the sheet opens, or as soon as the bill arrives when it opened before that.
  const filled = useRef(false);
  useEffect(() => {
    if (!opened || !sheet || filled.current) return;
    reset(toPayBillFormValues(sheet));
    filled.current = true;
  }, [opened, sheet, reset]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        filled.current = false;
        markPaid.reset();
        setOpened(true);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [markPaid],
  );

  // Awaited rather than a per-call `onSuccess`, which TanStack skips when its observer is not
  // listening; the refetches finish first, then the sheet closes.
  const save = handleSubmit(async (values) => {
    try {
      await markPaid.mutateAsync(toMarkBillPaidRequest(values));
    } catch {
      return; // The failed state shows from `markPaid.error`.
    }
    sheetRef.current?.close();
  });
  const saving = markPaid.isPending;

  return (
    <AppSheet
      ref={sheetRef}
      title="Mark bill paid"
      subtitle={sheet?.subtitle}
      actionLabel={sheet?.actionLabel ?? 'Mark as paid'}
      onAction={save}
      saving={saving}
      failed={markPaid.isError}
      // The default text covers an unreachable server; the backend's own message says what else went wrong.
      failedMessage={markPaid.error instanceof ApiRequestError ? markPaid.error.message : undefined}
      disabled={!sheet || !isValid}
      onClose={() => setOpened(false)}
    >
      <BillSummary sheet={sheet} />
      <MoneyInput
        placeholder="0.00"
        clearable
        fieldControlProps={{
          control,
          name: 'paidCents',
          label: 'Amount paid',
          required: true,
          helper: 'Change it if the amount you paid was different',
          disabled: saving || !sheet,
        }}
      />
      <DateField
        maxDate={todayKey()}
        fieldControlProps={{ control, name: 'paidOn', label: 'Paid on', required: true, disabled: saving || !sheet }}
      />
      {sheet ? <Alert variant={sheet.note.tone} message={sheet.note.text} /> : null}
    </AppSheet>
  );
});
