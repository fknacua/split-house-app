import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import {
  Alert,
  AppSheet,
  BareDateField,
  Button,
  DEFAULT_FAILED_MESSAGE,
  FormField,
  type AppSheetRef,
} from '@/components';
import { useEditPaymentSheet, useRemovePayment, useSavePaymentDate } from '@/hooks';
import { queryKeys } from '@/lib';
import { ApiRequestError } from '@/lib/api';
import { todayKey } from '@splithouse/shared';
import { DiscardEditDialog } from './components/discard-edit-dialog';
import { EditPaymentSkeleton } from './components/edit-payment-skeleton';
import { PaymentRows } from './components/payment-rows';
import { RemovePaymentDialog } from './components/remove-payment-dialog';
import type { EditPaymentSheetRef } from './types';

/** The backend's own message, when it sent one; the default text covers an unreachable server. */
const messageOf = (error: Error | null) => (error instanceof ApiRequestError ? error.message : undefined);

/**
 * Edit payment (`EditPayment`): one paid charge's payment, opened from Charge details. From, For and
 * Amount received are read-only rows; only Received on can change (required, not after today), and
 * Save stays disabled until it does. Every string but the field's comes from
 * `GET /api/charges/:id/payment`. While it loads, a skeleton in the loaded layout holds every height,
 * the subtitle's line included, so the sheet doesn't grow when the data arrives.
 *
 * Save stores the new day with no confirm. A failed save keeps the sheet open with the danger Alert
 * and Retry, the day kept. `Remove payment` asks first (`Confirm` `removePayment`, text from the
 * server); a failed removal stays in that dialog. Cancel after a change asks `Discard changes?`; a
 * swipe down, the scrim or back close it without asking. After a save or a removal the sheet closes
 * and the screens behind it refetch.
 */
export const EditPaymentSheet = forwardRef<EditPaymentSheetRef>(function EditPaymentSheet(_, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const queryClient = useQueryClient();
  const [chargeId, setChargeId] = useState<string | null>(null);
  // Null until the day is changed: the stored one is used until then.
  const [paidOn, setPaidOn] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const query = useEditPaymentSheet(chargeId);
  const save = useSavePaymentDate(chargeId ?? '');
  const remove = useRemovePayment(chargeId ?? '');
  const data = query.data;
  const day = paidOn ?? data?.paidOn ?? '';
  const changed = !!data && day !== data.paidOn;
  const saving = save.isPending;

  useImperativeHandle(
    ref,
    () => ({
      open: (id) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.allEditPaymentSheets });
        setChargeId(id);
        setPaidOn(null);
        setRemoveOpen(false);
        setDiscardOpen(false);
        save.reset();
        remove.reset();
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [queryClient, save, remove]
  );

  const pickDay = (key: string) => {
    save.reset();
    setPaidOn(key);
  };

  const submit = () => {
    if (!changed || day === '') return;
    save.mutate({ paidOn: day }, { onSuccess: () => sheetRef.current?.close() });
  };

  const confirmRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        setRemoveOpen(false);
        sheetRef.current?.close();
      },
    });

  return (
    <>
      <AppSheet
        ref={sheetRef}
        title={data?.title ?? 'Edit payment'}
        subtitle={data?.subtitle}
        subtitleLoading={!data && !query.error}
        actionLabel="Save"
        onAction={submit}
        onCancel={() => (changed ? setDiscardOpen(true) : sheetRef.current?.close())}
        actionsInRow
        fitContent
        saving={saving}
        failed={save.isError}
        failedMessage={messageOf(save.error)}
        disabled={!changed || day === ''}
      >
        {/* A refusal (the payment was removed meanwhile) says why; an unreachable server shows the app's prompt. */}
        {query.error instanceof ApiRequestError ? <Alert variant="danger" message={query.error.message} /> : null}
        {!data && !query.error ? <EditPaymentSkeleton /> : null}
        {data ? (
          <>
            <PaymentRows rows={data.rows} />
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
            <Button
              label={data.remove.label}
              variant="ghost-danger"
              size="small"
              icon={Trash2}
              disabled={saving}
              onPress={() => {
                remove.reset();
                setRemoveOpen(true);
              }}
            />
          </>
        ) : null}
      </AppSheet>
      <RemovePaymentDialog
        open={removeOpen}
        confirm={data?.remove.confirm ?? null}
        removing={remove.isPending}
        error={remove.isError ? (messageOf(remove.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
        onKeep={() => setRemoveOpen(false)}
        onRemove={confirmRemove}
      />
      <DiscardEditDialog
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
