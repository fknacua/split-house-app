import { Undo } from 'lucide-react-native';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { Alert, Button, ConfirmDialog, Screen, SubpageFooter, SubpageHeader } from '@/components';
import { DatedHeading } from '@/screens/household-landlord';
import { EditSaveActions, EditSummaryCard, useEditFlow } from '@/screens/household-person';
import { hasSplitChanges, toSplitEdit, toSplitFormValues, type SplitFormValues } from '../helpers';
import type { SplitFormProps } from '../types';
import { CountSplitControl } from './count-split-control';
import { NumberRow } from './number-row';
import { RoomRow } from './room-row';
import { SplitCard } from './split-card';
import { SplitControl } from './split-control';

/**
 * The `Splits` board: Rent, Utilities and Aircon cards, each with the split between the owner and primary tenant, all
 * saved together from next month. Rent splits by percent, and Utilities and Aircon by count. Only tenants' shares, the
 * total shares and the splits can be typed; rent and units are read-only, since they belong to rooms. The server checks
 * every field and writes the amounts and the summary. Leaving with unsaved changes asks first.
 */
export function SplitForm({ form }: SplitFormProps) {
  // The refetch after a save changes the response while the screen is closing, so the form keeps what it opened on.
  const [opened] = useState(form);
  const { control, setValue } = useForm<SplitFormValues>({ defaultValues: toSplitFormValues(opened) });
  const values = useWatch({ control }) as SplitFormValues;
  const dirty = hasSplitChanges(values, opened);
  const flow = useEditFlow(toSplitEdit(values), dirty);
  const { errors, warnings, guard } = flow;
  const amounts = flow.splitAmounts ?? opened.amounts;
  const hasFieldErrors = Object.keys(errors).some((key) => key !== 'form');
  // With no primary tenant there is nothing to split, so the cards have no control.
  const people = opened.splitTitle && opened.primary ? { title: opened.splitTitle, owner: opened.owner, primary: opened.primary } : null;

  return (
    <Screen>
      <SubpageHeader title={opened.title} onBack={guard.requestLeave} />
      {/* Edge-to-edge Android does not resize for the keyboard, so the padding keeps the focused field in view. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-4 pb-4 pt-2">
          <View pointerEvents={flow.saving ? 'none' : 'auto'} className="gap-4">
            <DatedHeading title={opened.datedTitle} note={opened.pendingNote} />
            <SplitCard
              title={opened.rent.title}
              leftLabel={opened.rent.leftLabel}
              left={amounts.rent.left}
              split={
                people ? (
                  <SplitControl
                    {...people}
                    cardTitle={opened.rent.title}
                    bps={values.rentPrimaryBps}
                    savedBps={opened.values.rentPrimaryBps}
                    onChange={(bps) => setValue('rentPrimaryBps', bps)}
                    amount={amounts.rent}
                    error={errors.rentPrimaryBps}
                    warning={warnings.rentPrimaryBps}
                  />
                ) : null
              }
            >
              {opened.rent.rows.map((row) => (
                <RoomRow key={row.personId} row={row} />
              ))}
            </SplitCard>
            <SplitCard
              title={opened.utilities.title}
              leftLabel={opened.utilities.leftLabel}
              left={amounts.utilities.left}
              error={errors.leftToSplit}
              split={
                people ? (
                  <CountSplitControl
                    {...people}
                    cardTitle={opened.utilities.title}
                    unit="shares"
                    typed={values.utilitiesPrimaryShares}
                    counts={amounts.utilities.counts}
                    onChange={(shares) => setValue('utilitiesPrimaryShares', shares)}
                    error={errors.utilitiesPrimaryShares}
                    warning={warnings.utilitiesPrimaryShares}
                    dimmed={!!errors.leftToSplit}
                  />
                ) : null
              }
            >
              {opened.values.tenantShares.map((tenant, index) => {
                const key = `tenantShares.${tenant.personId}`;
                return (
                  <NumberRow
                    key={tenant.personId}
                    label={tenant.name}
                    color={tenant.color}
                    value={values.tenantShares[index]?.utilityShares ?? null}
                    onChange={(shares) => setValue(`tenantShares.${index}.utilityShares`, shares)}
                    error={errors[key]}
                    warning={warnings[key]}
                  />
                );
              })}
              <NumberRow
                label={opened.utilities.totalLabel}
                color={null}
                value={values.totalShares}
                onChange={(shares) => setValue('totalShares', shares)}
                error={errors.totalShares}
              />
            </SplitCard>
            <SplitCard
              title={opened.aircon.title}
              leftLabel={opened.aircon.leftLabel}
              left={amounts.aircon.left}
              total={{ label: opened.aircon.totalLabel, value: opened.aircon.total }}
              split={
                people ? (
                  <CountSplitControl
                    {...people}
                    cardTitle={opened.aircon.title}
                    unit="units"
                    typed={values.airconPrimaryUnits}
                    counts={amounts.aircon.counts}
                    onChange={(units) => setValue('airconPrimaryUnits', units)}
                    error={errors.airconPrimaryUnits}
                    warning={warnings.airconPrimaryUnits}
                  />
                ) : null
              }
            >
              {opened.aircon.rows.map((row) => (
                <RoomRow key={row.personId} row={row} />
              ))}
            </SplitCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SubpageFooter>
        <EditSummaryCard groups={flow.groups} loading={dirty && !flow.answered && !flow.previewFailed} />
        {hasFieldErrors ? <Alert variant="danger" message="Some errors in the form" className="mb-1.5" /> : null}
        <EditSaveActions flow={flow} disabled={!dirty} />
        <Button label="Cancel" variant="ghost" disabled={flow.saving} onPress={guard.requestLeave} />
      </SubpageFooter>
      <ConfirmDialog
        open={guard.asking}
        icon={Undo}
        title="Discard changes?"
        body="Your edits to the household split haven’t been saved. If you leave now, they’ll be lost."
        cancelLabel="Keep editing"
        onCancel={guard.keepEditing}
        confirmLabel="Discard"
        onConfirm={guard.discard}
      />
    </Screen>
  );
}
