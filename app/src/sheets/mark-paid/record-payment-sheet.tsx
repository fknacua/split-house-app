import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { Alert, AppSheet, BareDateField, FormField, type AppSheetRef } from '@/components';
import { useRecordPayment, useRecordPaymentSheet, type RecordPaymentSheetRequest } from '@/hooks';
import { queryKeys } from '@/lib';
import { ApiRequestError } from '@/lib/api';
import { formatDateMedium, todayKey, type RecordPaymentConfirm } from '@splithouse/shared';
import { AmountField } from './components/amount-field';
import { DiscardPaymentDialog } from './components/discard-payment-dialog';
import { ForField } from './components/for-field';
import { FromField } from './components/from-field';
import { RecordConfirmDialog } from './components/record-confirm-dialog';
import { RecordPaymentSkeleton } from './components/record-payment-skeleton';
import { SettledCard } from './components/settled-card';
import { toggleAllTicked, toggleTicked } from './helpers';
import type { RecordPaymentSheetRef } from './types';

const CLOSED: RecordPaymentSheetRequest = { personId: null, chargeIds: null, ticked: null };

/**
 * Record payment (`RecordPayment`): one person's payment for one or more of their unpaid charges,
 * each paid in full. Every string comes from `GET /api/record-payment`; picking someone else fetches
 * their list with nothing ticked, and a tick fetches `POST /api/record-payment/preview`, so Amount
 * received (read-only, the ticked total), the count and Record's label stay the server's. Received on
 * starts on today; clearing it shows a field error and disables Record.
 *
 * Record asks first (`Confirm` `recordPayment` / `recordMulti`, text from the server), then saves
 * while the dialog shows its spinner, and on success closes back to where it opened. A failed save
 * closes the dialog and leaves the sheet open with the danger Alert and Retry, ticks kept; Retry saves
 * without asking again, and any change brings the confirm back. Cancel with changes asks
 * `Discard this payment?`; a swipe down, the scrim or back close it without asking.
 */
export const RecordPaymentSheet = forwardRef<RecordPaymentSheetRef>(function RecordPaymentSheet(_, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [request, setRequest] = useState<RecordPaymentSheetRequest>(CLOSED);
  // Null until the day is changed: the sheet's own (today) is used until then.
  const [paidOn, setPaidOn] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // The dialog keeps the text it opened with, so a refetch after the save doesn't empty it.
  const [confirm, setConfirm] = useState<RecordPaymentConfirm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Bumped on each Record tap, so the dialog starts with For closed.
  const [confirmCount, setConfirmCount] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const query = useRecordPaymentSheet(request, opened);
  const save = useRecordPayment();
  const data = query.data;
  // While a new tick set or person loads, the old sheet stays up but can't be recorded.
  const stale = query.isPlaceholderData;
  const day = paidOn ?? data?.paidOn ?? '';
  const saving = save.isPending;

  useImperativeHandle(
    ref,
    () => ({
      open: (opening = {}) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.allRecordPaymentSheets });
        setRequest({ personId: null, chargeIds: opening.chargeIds ?? null, ticked: null });
        setPaidOn(null);
        setDirty(false);
        setConfirmOpen(false);
        setDiscardOpen(false);
        save.reset();
        setOpened(true);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [queryClient, save]
  );

  // Any change is a new payment: the failed state goes, so Record asks again.
  const change = (next: RecordPaymentSheetRequest) => {
    save.reset();
    setDirty(true);
    setRequest(next);
  };

  const pickPerson = (personId: string) => {
    if (personId !== data?.from.personId) change({ personId, chargeIds: null, ticked: null });
  };

  const tick = (ticked: string[]) => {
    const personId = data?.from.personId;
    if (personId) change({ personId, chargeIds: null, ticked });
  };

  const pickDay = (key: string) => {
    save.reset();
    setDirty(true);
    setPaidOn(key);
  };

  const submit = async () => {
    const values = data?.record.request;
    if (!values || day === '') return;
    try {
      await save.mutateAsync({ ...values, paidOn: day });
    } catch {
      setConfirmOpen(false); // The failed state shows from `save.error`.
      return;
    }
    setConfirmOpen(false);
    sheetRef.current?.close();
  };

  const record = () => {
    if (save.isError) {
      void submit();
      return;
    }
    setConfirm(data?.confirm ?? null);
    setConfirmCount((n) => n + 1);
    setConfirmOpen(true);
  };

  const settled = data?.settled ?? null;

  return (
    <>
      <AppSheet
        ref={sheetRef}
        title={data?.title ?? 'Record payment'}
        subtitle={data?.subtitle}
        actionLabel={data?.record.label ?? 'Record payment'}
        actionIcon={Check}
        onAction={record}
        onCancel={() => (dirty ? setDiscardOpen(true) : sheetRef.current?.close())}
        saving={saving}
        failed={save.isError}
        // The default text covers an unreachable server; the backend's own message says what else went wrong.
        failedMessage={save.error instanceof ApiRequestError ? save.error.message : undefined}
        disabled={!data?.record.request || day === '' || stale}
        onClose={() => setOpened(false)}
      >
        {/* A refusal (a charge paid meanwhile) says why; an unreachable server shows the app's prompt. */}
        {query.error instanceof ApiRequestError ? <Alert variant="danger" message={query.error.message} /> : null}
        {!data && !query.error ? <RecordPaymentSkeleton /> : null}
        {data && settled ? <SettledCard settled={settled} /> : null}
        {data && !settled ? (
          <>
            <FromField from={data.from} value={request.personId ?? data.from.personId} disabled={saving} onChange={pickPerson} />
            <ForField
              for={data.for}
              disabled={saving}
              onToggle={(chargeId) => tick(toggleTicked(data.for.rows, chargeId))}
              onToggleAll={() => tick(toggleAllTicked(data.for.rows))}
            />
            <AmountField amount={data.amount} hasTicks={data.record.request !== null} disabled={saving} />
            <FormField
              label="Received on"
              required
              disabled={saving}
              error={day === '' ? 'Enter the day it was received' : undefined}
            >
              <BareDateField
                accessibilityLabel="Received on"
                value={day}
                onChange={pickDay}
                maxDate={todayKey()}
                disabled={saving}
                invalid={day === ''}
              />
            </FormField>
          </>
        ) : null}
      </AppSheet>
      <RecordConfirmDialog
        key={confirmCount}
        open={confirmOpen}
        confirm={confirm}
        receivedOn={day === '' ? '' : formatDateMedium(day)}
        saving={saving}
        onConfirm={() => void submit()}
        onGoBack={() => setConfirmOpen(false)}
      />
      <DiscardPaymentDialog
        open={discardOpen}
        onKeepEditing={() => setDiscardOpen(false)}
        onDiscard={() => {
          setDiscardOpen(false);
          sheetRef.current?.close();
        }}
      />
    </>
  );
});
