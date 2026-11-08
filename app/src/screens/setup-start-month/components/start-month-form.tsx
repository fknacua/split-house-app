import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Alert, Button, MonthPickerSheet, Screen, SubpageFooter, SubpageHeader } from '@/components';
import { monthPickerOpeningYear } from '@/components/month-picker/helpers';
import { useSaveStartMonth } from '@/hooks';
import { formatMonthLabel } from '@splithouse/shared';
import { farAheadNote, startMonthFor } from '../helpers';
import type { StartMonthChoice, StartMonthFormProps } from '../types';
import { StartMonthCard } from './start-month-card';

/**
 * The `FirstRunStart` board (`default`, `next`, `far`): This month and Next month as radios, and Another month,
 * which opens the month picker (`Household starts`) from the month after next with no last month. A picked month
 * shows on card 3, selects it, and shows the far-ahead info Alert, which does not block. Save is always enabled,
 * marks Step 1 and goes back to Welcome; Back goes back with nothing saved.
 */
export function StartMonthForm({ page }: StartMonthFormProps) {
  const router = useRouter();
  const save = useSaveStartMonth();
  const months = { from: page.pickerFrom };
  const other = page.options.find((option) => option.id === 'other');
  const [choice, setChoice] = useState<StartMonthChoice>(page.selected);
  const [otherMonth, setOtherMonth] = useState<string | null>(other?.month ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => monthPickerOpeningYear(otherMonth ?? '', months));
  const month = startMonthFor(page.options, choice, otherMonth);

  const openPicker = () => {
    setPickerYear(monthPickerOpeningYear(otherMonth ?? '', months));
    setPickerOpen(true);
  };

  const onSave = () => {
    if (month === null) return;
    save.mutate({ month }, { onSuccess: () => router.back() });
  };

  return (
    <Screen>
      <SubpageHeader title="Start month" subtitle="When tracking begins" />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-4 pt-2">
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Household starts"
          pointerEvents={save.isPending ? 'none' : 'auto'}
          className="gap-3"
        >
          {page.options.map((option) =>
            option.id === 'other' ? (
              <StartMonthCard
                key={option.id}
                kicker={option.kicker}
                title={otherMonth ? formatMonthLabel(otherMonth) : option.title}
                note={option.note}
                selected={choice === 'other'}
                indicator="calendar"
                onPress={openPicker}
              />
            ) : (
              <StartMonthCard
                key={option.id}
                kicker={option.kicker}
                title={option.title}
                note={option.note}
                selected={choice === option.id}
                indicator="radio"
                onPress={() => setChoice(option.id)}
              />
            ),
          )}
        </View>
        {choice === 'other' && otherMonth ? <Alert variant="info" message={farAheadNote(otherMonth)} /> : null}
      </ScrollView>
      <SubpageFooter>
        {save.error ? <Alert variant="danger" message={save.error.message} className="mb-1.5" /> : null}
        <Button label="Save" loading={save.isPending} disabled={month === null} onPress={onSave} />
      </SubpageFooter>
      <MonthPickerSheet
        open={pickerOpen}
        title="Household starts"
        year={pickerYear}
        onYearChange={setPickerYear}
        months={months}
        value={choice === 'other' ? (otherMonth ?? '') : ''}
        onPick={(picked) => {
          setOtherMonth(picked);
          setChoice('other');
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}
