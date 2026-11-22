import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import {
  Alert,
  AppSheet,
  BareDateField,
  BareSelectField,
  ChipGroup,
  ConnectedButtonGroup,
  FormField,
  MoneyInput,
  TextInput,
  type AppSheetRef,
} from '@/components';
import { useAddCharge, useAddChargePreview, useAddChargeSheet, useDebouncedValue } from '@/hooks';
import { queryKeys } from '@/lib';
import { ApiRequestError } from '@/lib/api';
import { PREVIEW_DELAY_MS } from '@/screens/household-person';
import type { AddChargeConfirm, AddChargeKind, AddChargeValues } from '@splithouse/shared';
import { AddChargeConfirmDialog } from './components/add-charge-confirm-dialog';
import { AddChargeSkeleton } from './components/add-charge-skeleton';
import { CustomAmounts } from './components/custom-amounts';
import { DiscardChargeDialog } from './components/discard-charge-dialog';
import { ShareFields } from './components/share-fields';
import { SplitPreview } from './components/split-preview';
import {
  fieldErrors,
  isChanged,
  newIdempotencyKey,
  UNTOUCHED,
  withCustomAmount,
  withShare,
  withTypedCustom,
  withTypedShares,
} from './helpers';
import type { AddChargeSheetRef, AddChargeTouched } from './types';

/** The backend's own message, when it sent one; the default text covers an unreachable server. */
const messageOf = (error: Error | null) => (error instanceof ApiRequestError ? error.message : undefined);

/**
 * Add charge (`AddCharge`, Charge mode): an unplanned expense in the newest opened month, opened from Home's header.
 * What it’s for, then (for Other) Label, the Amount, Shared | Personal, Who or the split chips, the Due date, Custom's
 * amount fields (starting from Equal) or Per share's share fields (starting from the household's), and the split
 * preview. `GET /api/add-charge` gives the options and the opening preview; every
 * change after that is previewed by `POST /api/add-charge/preview` (taps at once, typing after a pause), so which
 * fields show, the split, Custom's Alert, Save's label and whether it is enabled are always the server's. The app only
 * keeps the typed values and shows each field's error once it has been left empty.
 *
 * Save asks first (`Confirm` `addCharge`, text from the server), then saves while the dialog shows its spinner, and on
 * success closes back to Home. Every Save and Retry from one opening sends the same idempotency key, so a save whose
 * response was lost is never stored twice. A failed save closes the dialog and leaves the sheet open with the danger
 * Alert and Retry, the fields kept; Retry saves without asking again, and any change brings the confirm back. Cancel
 * with changes asks `Discard this charge?`; a swipe down, the scrim or back close it without asking.
 */
export const AddChargeSheet = forwardRef<AddChargeSheetRef>(function AddChargeSheet(_, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const queryClient = useQueryClient();
  const keyRef = useRef(newIdempotencyKey());
  const [opened, setOpened] = useState(false);
  // Null until the first change: the sheet's opening values are used until then.
  const [values, setValues] = useState<AddChargeValues | null>(null);
  const [touched, setTouched] = useState<AddChargeTouched>(UNTOUCHED);
  // A tap previews at once; typing waits for a pause, so it doesn't send a request per key.
  const [tapped, setTapped] = useState(true);
  // The dialog keeps the text it opened with, so a refetch after the save doesn't empty it.
  const [confirm, setConfirm] = useState<AddChargeConfirm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Bumped on each Save tap, so the dialog starts with the split collapsed.
  const [confirmCount, setConfirmCount] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);

  const sheetQuery = useAddChargeSheet(opened);
  const save = useAddCharge();
  const sheet = sheetQuery.data;
  const opening = sheet?.values ?? null;
  const fields = values ?? opening;
  const changed = fields !== null && opening !== null && isChanged(fields, opening);
  const previewed = useDebouncedValue(fields, tapped ? 0 : PREVIEW_DELAY_MS);
  const previewQuery = useAddChargePreview(
    opened && changed && previewed !== null && opening !== null && isChanged(previewed, opening) ? previewed : null,
  );
  // As the sheet opened, its own preview; after a change, the last answer until the next one lands.
  const preview = changed ? (previewQuery.data ?? sheet?.preview ?? null) : (sheet?.preview ?? null);
  const answered =
    !changed || (previewQuery.isSuccess && !previewQuery.isPlaceholderData && JSON.stringify(previewed) === JSON.stringify(fields));
  const saving = save.isPending;
  const canSave = answered && preview?.save.enabled === true && preview.confirm !== null;

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.allAddCharge });
        keyRef.current = newIdempotencyKey();
        setValues(null);
        setTouched(UNTOUCHED);
        setTapped(true);
        setConfirmOpen(false);
        setDiscardOpen(false);
        save.reset();
        setOpened(true);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [queryClient, save],
  );

  // Any change is a new charge: the failed state goes, so Save asks again.
  const change = (next: AddChargeValues, tap: boolean) => {
    save.reset();
    setTapped(tap);
    setValues(next);
  };
  const touch = (field: keyof AddChargeTouched) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  const submit = async () => {
    if (!fields) return;
    try {
      await save.mutateAsync({ ...fields, idempotencyKey: keyRef.current });
    } catch {
      setConfirmOpen(false); // The failed state shows from `save.error`.
      return;
    }
    setConfirmOpen(false);
    sheetRef.current?.close();
  };

  const onSave = () => {
    if (save.isError) {
      void submit();
      return;
    }
    setConfirm(preview?.confirm ?? null);
    setConfirmCount((n) => n + 1);
    setConfirmOpen(true);
  };

  const errors = fields && preview ? fieldErrors(fields, touched, preview.show) : {};
  // Once a field is typed in, it shows what was typed straight away, not the last preview's value.
  const customFields = preview?.custom ? withTypedCustom(preview.custom, fields?.customAmounts ?? []) : null;
  const shareFields = preview?.shares ? withTypedShares(preview.shares, fields?.shares ?? []) : null;

  return (
    <>
      <AppSheet
        ref={sheetRef}
        title={sheet?.title ?? 'Add charge'}
        subtitle={sheet?.subtitle}
        subtitleLoading={!sheet && !sheetQuery.error}
        actionLabel={preview?.save.label ?? 'Save'}
        onAction={onSave}
        onCancel={() => (changed ? setDiscardOpen(true) : sheetRef.current?.close())}
        actionsInRow
        saving={saving}
        failed={save.isError}
        failedMessage={messageOf(save.error)}
        disabled={!canSave}
        onClose={() => setOpened(false)}
      >
        {/* A refusal (no month open) says why; an unreachable server shows the app's prompt. */}
        {sheetQuery.error instanceof ApiRequestError ? <Alert variant="danger" message={sheetQuery.error.message} /> : null}
        {!sheet && !sheetQuery.error ? <AddChargeSkeleton /> : null}
        {sheet && fields && preview ? (
          <>
            <FormField label="What’s it for" required disabled={saving}>
              <BareSelectField
                accessibilityLabel="What’s it for"
                options={sheet.what.options}
                placeholder={sheet.what.placeholder}
                value={fields.kind ?? ''}
                onChange={(kind) => change({ ...fields, kind: kind as AddChargeKind }, true)}
                disabled={saving}
              />
            </FormField>
            {preview.show.label ? (
              <FormField label="Label" required disabled={saving} error={errors.label}>
                <TextInput
                  accessibilityLabel="Label"
                  placeholder="e.g. Fridge repair"
                  value={fields.label}
                  onChange={(label) => change({ ...fields, label }, false)}
                  onBlur={() => touch('label')}
                  invalid={!!errors.label}
                  disabled={saving}
                />
              </FormField>
            ) : null}
            <FormField label="Amount (SGD)" required disabled={saving} error={errors.amount}>
              <MoneyInput
                accessibilityLabel="Amount (SGD)"
                placeholder="Enter amount"
                value={fields.amountCents}
                onChange={(amountCents) => change({ ...fields, amountCents }, false)}
                onBlur={() => touch('amount')}
                invalid={!!errors.amount}
                disabled={saving}
              />
            </FormField>
            {preview.show.scope ? (
              <FormField label="Charge to" disabled={saving}>
                <ConnectedButtonGroup
                  label="Charge to"
                  options={sheet.scopes}
                  value={fields.scope}
                  onChange={(scope) => change({ ...fields, scope }, true)}
                  disabled={saving}
                />
              </FormField>
            ) : null}
            {preview.show.who ? (
              <FormField label="Who" required disabled={saving}>
                <BareSelectField
                  accessibilityLabel="Who"
                  options={sheet.who.options.map((o) => ({ label: o.name, value: o.personId }))}
                  placeholder={sheet.who.placeholder}
                  value={fields.personId ?? ''}
                  onChange={(personId) => change({ ...fields, personId: personId || null }, true)}
                  disabled={saving}
                />
              </FormField>
            ) : null}
            {preview.show.split ? (
              <FormField label="Split" disabled={saving}>
                <ChipGroup
                  label="Split"
                  options={sheet.splits}
                  value={fields.split}
                  onChange={(split) => change({ ...fields, split }, true)}
                  disabled={saving}
                />
              </FormField>
            ) : null}
            <FormField label="Due date" required disabled={saving} error={errors.dueDate}>
              <BareDateField
                accessibilityLabel="Due date"
                placeholder="Select date"
                value={fields.dueDate ?? ''}
                onChange={(key) => {
                  if (key === '') touch('dueDate');
                  change({ ...fields, dueDate: key === '' ? null : key }, true);
                }}
                invalid={!!errors.dueDate}
                disabled={saving}
              />
            </FormField>
            {customFields ? (
              <CustomAmounts
                custom={customFields}
                disabled={saving}
                onChange={(personId, cents) => change(withCustomAmount(fields, customFields.rows, personId, cents), false)}
              />
            ) : null}
            {shareFields ? (
              <ShareFields
                shares={shareFields}
                disabled={saving}
                onChange={(personId, value) => change(withShare(fields, shareFields.rows, personId, value), false)}
              />
            ) : null}
            {preview.preview ? <SplitPreview preview={preview.preview} /> : null}
          </>
        ) : null}
      </AppSheet>
      <AddChargeConfirmDialog
        key={confirmCount}
        open={confirmOpen}
        confirm={confirm}
        saving={saving}
        onConfirm={() => void submit()}
        onGoBack={() => setConfirmOpen(false)}
      />
      <DiscardChargeDialog
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
