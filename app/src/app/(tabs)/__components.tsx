import { Redirect, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import {
  Bell,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  History,
  House,
  Send,
  Settings,
  Trash2,
  TriangleAlert,
  Undo2,
  UserMinus,
  Users,
} from 'lucide-react-native';

import {
  Accordion,
  Alert,
  AppSheet,
  type AppSheetRef,
  Badge,
  BottomNavBar,
  Button,
  type ButtonVariant,
  Card,
  ChipGroup,
  ConfirmDialog,
  ConnectedButtonGroup,
  DateField,
  FieldControl,
  FieldControlProps,
  MoneyInput,
  MonthSelectField,
  type NavItem,
  PageHeader,
  PhoneInput,
  Progress,
  Screen,
  SegmentedProgress,
  SelectField,
  SkeletonBlock,
  SkeletonCard,
  SkeletonPersonCards,
  SkeletonRowList,
  Spinner,
  SplitProgress,
  SubpageHeader,
  Switch,
  SwitchRow,
  TextareaInput,
  TextInput,
  TouchTargetCheck,
  TouchTargetCheckProvider,
} from '@/components';
import {
  addMonths,
  cents,
  currentMonth,
  e164Phone,
  formatCents,
  monthRange,
  positiveCents,
  requiredText,
  todayKey,
} from '@/lib';
import { type ThemePreference, useThemePreference } from '@/lib/theme-preference';

const SCOPE_OPTIONS = [
  { label: 'Shared', value: 'shared' },
  { label: 'Personal', value: 'personal' },
] as const;
const SAMPLE_OPTIONS = [
  { label: 'Priya', value: 'priya' },
  { label: 'Sam', value: 'sam' },
  { label: 'Jordan', value: 'jordan' },
] as const;
const METHOD_OPTIONS = [
  { label: 'Per share (5)', value: 'share' },
  { label: 'Per unit (6)', value: 'unit' },
  { label: 'Custom', value: 'custom' },
] as const;
const WHO_OPTIONS = SAMPLE_OPTIONS;
// Mock items: the test page doesn't depend on the app's real tabs.
const MOCK_NAV_ITEMS: NavItem[] = [
  { key: 'one', label: 'One', icon: House },
  { key: 'two', label: 'Two', icon: History },
  { key: 'three', label: 'Three', icon: Users },
  { key: 'four', label: 'Four', icon: Settings },
];
const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'outline',
  'warning',
  'outline-warning',
  'danger',
  'outline-danger',
  'ghost',
];
const BUTTON_STATE_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Loading', value: 'loading' },
  { label: 'Disabled', value: 'disabled' },
] as const;

const demoSchema = z.object({
  empty: z.string(),
  filled: z.string(),
  optional: z.string(),
  invalid: z.string(),
  disabled: z.string(),
  live: requiredText,
  note: z.string(),
  noteFilled: z.string(),
  noteInvalid: z.string(),
  noteDisabled: z.string(),
  phone: e164Phone,
  phoneFilled: z.string(),
  phoneInvalid: z.string(),
  phoneDisabled: z.string(),
  moneyLive: positiveCents,
  moneyInvalid: cents,
  moneyFilled: cents,
  moneyCorrection: cents,
  moneyDisabled: cents,
});

type DemoValues = z.infer<typeof demoSchema>;

/** A form binding built outside the JSX, annotated so `name` is still checked against the form. */
function invalidAmountField(control: Control<DemoValues>): FieldControlProps<DemoValues> {
  return {
    control,
    name: 'invalid',
    label: 'Amount',
    required: true,
    error: 'Enter an amount greater than 0.',
  };
}

/** The Form fields section: every field state, plus one field validated live on blur. */
function FormFieldsDemo() {
  const { control, handleSubmit, reset } = useForm<DemoValues>({
    resolver: zodResolver(demoSchema),
    mode: 'onBlur',
    defaultValues: {
      empty: '',
      filled: 'Aircon service',
      optional: '',
      invalid: '',
      disabled: 'November 2026',
      live: '',
      note: '',
      noteFilled: 'Hi Alex, here is the breakdown for November 2026.',
      noteInvalid: '',
      noteDisabled: 'Hi Alex, here is the breakdown for November 2026.',
      phone: '',
      phoneFilled: '+6591234567',
      phoneInvalid: '+65',
      phoneDisabled: '+6591234567',
      moneyFilled: 186286,
      moneyCorrection: -1500,
      moneyDisabled: 430000,
    },
  });
  const [submitted, setSubmitted] = useState<string>('Not submitted');
  const [bareText, setBareText] = useState('');
  const [bareNote, setBareNote] = useState('');
  const [bareNote2, setBareNote2] = useState('');
  const [bareMoney, setBareMoney] = useState<number | null>(null);
  const moneyLive = useWatch({ control, name: 'moneyLive' });

  return (
    <View className="gap-4">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Form fields</Text>
      <TouchTargetCheck>
        <TextInput
          fieldControlProps={{
            control,
            name: 'empty',
            label: 'Current Charges',
            required: true,
            helper: 'Required. The split uses this number.',
          }}
          placeholder="0.00"
        />
      </TouchTargetCheck>
      <TextInput fieldControlProps={{ control, name: 'filled', label: 'What’s it for', required: true }} />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        This one uses the render-prop FieldControl instead of fieldControlProps.
      </Text>
      <FieldControl
        control={control}
        name="optional"
        label="What’s it for"
        helper="Shown on the charge in the message."
      >
        {(bind) => <TextInput {...bind} placeholder="e.g. Aircon service" />}
      </FieldControl>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        This one passes a shared FieldControlProps object.
      </Text>
      <TextInput fieldControlProps={invalidAmountField(control)} />
      <TextInput
        fieldControlProps={{ control, name: 'disabled', label: 'Month being fixed', disabled: true }}
      />
      <TextareaInput
        fieldControlProps={{
          control,
          name: 'note',
          label: 'Message template',
          helper: 'Placeholders like {name} are filled in when sent.',
        }}
        placeholder="Write the message"
      />
      <TextareaInput
        fieldControlProps={{ control, name: 'noteFilled', label: 'Message template', required: true }}
      />
      <TextareaInput
        fieldControlProps={{
          control,
          name: 'noteInvalid',
          label: 'Message template',
          required: true,
          error: 'Write a message.',
        }}
      />
      <TextareaInput
        fieldControlProps={{ control, name: 'noteDisabled', label: 'Message template', disabled: true }}
      />
      <PhoneInput
        fieldControlProps={{
          control,
          name: 'phone',
          label: 'WhatsApp number',
          required: true,
          helper: 'Starts with +65. Change the code for another country. Checked when you leave the field.',
        }}
      />
      <PhoneInput
        fieldControlProps={{ control, name: 'phoneFilled', label: 'WhatsApp number', required: true }}
      />
      <PhoneInput
        fieldControlProps={{
          control,
          name: 'phoneInvalid',
          label: 'WhatsApp number',
          required: true,
          error: 'Enter a valid phone number',
        }}
      />
      <PhoneInput
        fieldControlProps={{ control, name: 'phoneDisabled', label: 'WhatsApp number', disabled: true }}
      />
      <MoneyInput
        fieldControlProps={{
          control,
          name: 'moneyLive',
          label: 'Current Charges',
          required: true,
          helper: 'Type 1862.86: it shows $1,862.86 when you leave the field. Checked on blur.',
        }}
      />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Form value: {typeof moneyLive === 'number' ? `${moneyLive} cents` : 'empty'}
      </Text>
      <MoneyInput fieldControlProps={{ control, name: 'moneyFilled', label: 'Amount', required: true }} />
      <MoneyInput
        allowNegative
        fieldControlProps={{
          control,
          name: 'moneyCorrection',
          label: 'Correction',
          helper: 'Corrections can be negative: use the +/- button.',
        }}
      />
      <MoneyInput
        fieldControlProps={{
          control,
          name: 'moneyInvalid',
          label: 'Amount',
          required: true,
          error: 'Enter an amount above $0.00',
        }}
      />
      <MoneyInput fieldControlProps={{ control, name: 'moneyDisabled', label: 'Landlord rent', disabled: true }} />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Live: the first WhatsApp number and Label are checked on blur and on Submit; leave one empty and tap away to see the error.
      </Text>
      <TextInput
        fieldControlProps={{
          control,
          name: 'live',
          label: 'Label',
          required: true,
          helper: 'Checked when you leave the field.',
        }}
        placeholder="Required"
      />
      <Button
        size="small"
        variant="outline"
        label="Submit"
        onPress={handleSubmit((v) => setSubmitted(`Submitted label: ${v.live}`))}
      />
      <Button size="small" variant="ghost" label="Reset" onPress={() => reset()} />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">{submitted}</Text>
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Bare inputs</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        No label or form state; they stand on their own.
      </Text>
      <TextInput value={bareText} onChange={setBareText} accessibilityLabel="Search" placeholder="Search" />
      <TextareaInput value={bareNote} onChange={setBareNote} accessibilityLabel="Note" placeholder="Note" />
      <MoneyInput value={bareMoney} onChange={setBareMoney} accessibilityLabel="Amount" />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Bare money value: {bareMoney === null ? 'empty' : `${bareMoney} cents (${formatCents(bareMoney)})`}
      </Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Lines: 2 tall when empty, grows to 4 then scrolls inside. Add line breaks to check.
      </Text>
      <TextareaInput
        value={bareNote2}
        onChange={setBareNote2}
        accessibilityLabel="Short note"
        placeholder="Short note"
        lines={2}
        maxLines={4}
      />
    </View>
  );
}

const PAYER_OPTIONS = [
  { label: 'Primary tenant', value: 'primary' },
  { label: 'Tenant 1', value: 'tenant1' },
  { label: 'Tenant 2', value: 'tenant2' },
];

const pickersSchema = z.object({
  who: z.string().min(1, 'Choose who paid'),
  whoFilled: z.string(),
  whoInvalid: z.string(),
  whoDisabled: z.string(),
  month: z.string().min(1, 'Choose a month'),
  monthFilled: z.string(),
  monthDisabled: z.string(),
  date: z.string().min(1, 'Choose a date'),
  dateFilled: z.string(),
  dateOptional: z.string(),
  dateInvalid: z.string(),
  dateDisabled: z.string(),
  switchOn: z.boolean(),
  switchOff: z.boolean(),
  switchInvalid: z.boolean(),
  switchDisabledOn: z.boolean(),
  switchDisabledOff: z.boolean(),
});

type PickersValues = z.infer<typeof pickersSchema>;

/** The Pickers section: Select and month list in every state, plus the bare (no form) versions. */
function PickersDemo() {
  const thisMonth = currentMonth();
  const today = todayKey();
  const months = monthRange(addMonths(thisMonth, -1), 4);
  const { control } = useForm<PickersValues>({
    resolver: zodResolver(pickersSchema),
    mode: 'onBlur',
    defaultValues: {
      who: '',
      whoFilled: 'tenant2',
      whoInvalid: '',
      whoDisabled: 'tenant1',
      month: '',
      monthFilled: thisMonth,
      monthDisabled: thisMonth,
      date: '',
      dateFilled: today,
      dateOptional: today,
      dateInvalid: '',
      dateDisabled: today,
      switchOn: true,
      switchOff: false,
      switchInvalid: false,
      switchDisabledOn: true,
      switchDisabledOff: false,
    },
  });
  const [bareSwitch, setBareSwitch] = useState(false);
  const [bareSwitchRow, setBareSwitchRow] = useState(true);
  const switchOn = useWatch({ control, name: 'switchOn' });
  const [bareWho, setBareWho] = useState('');
  const [bareMonth, setBareMonth] = useState('');
  const [bareDate, setBareDate] = useState('');
  const date = useWatch({ control, name: 'date' });
  const who = useWatch({ control, name: 'who' });
  const month = useWatch({ control, name: 'month' });

  return (
    <View className="gap-4">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Pickers</Text>
      <TouchTargetCheck>
        <SelectField
          options={PAYER_OPTIONS}
          placeholder="Choose who paid"
          fieldControlProps={{ control, name: 'who', label: 'From', required: true }}
        />
      </TouchTargetCheck>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Live value: {who === '' ? '(none)' : who}. Open the list and close it without picking to see
        the required error on blur.
      </Text>
      <SelectField
        options={PAYER_OPTIONS}
        clearable
        fieldControlProps={{ control, name: 'whoFilled', label: 'From (filled, clearable)', required: true }}
      />
      <SelectField
        options={PAYER_OPTIONS}
        placeholder="Choose who paid"
        fieldControlProps={{
          control,
          name: 'whoInvalid',
          label: 'From (error)',
          required: true,
          error: 'Choose who paid.',
        }}
      />
      <SelectField
        options={PAYER_OPTIONS}
        fieldControlProps={{ control, name: 'whoDisabled', label: 'From (disabled)', disabled: true }}
      />
      <TouchTargetCheck>
        <MonthSelectField
          months={months}
          clearable
          placeholder="Choose a month"
          fieldControlProps={{ control, name: 'month', label: 'Bill month (clearable)', required: true }}
        />
      </TouchTargetCheck>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Live value: {month === '' ? '(none)' : month}
      </Text>
      <MonthSelectField
        months={months}
        fieldControlProps={{ control, name: 'monthFilled', label: 'Bill month (filled)', required: true }}
      />
      <MonthSelectField
        months={months}
        fieldControlProps={{ control, name: 'monthDisabled', label: 'Month being fixed (disabled)', disabled: true }}
      />
      <TouchTargetCheck>
        <DateField
          placeholder="Choose a date"
          maxDate={today}
          fieldControlProps={{ control, name: 'date', label: 'Received on', required: true }}
        />
      </TouchTargetCheck>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Live value: {date === '' ? '(none)' : date}. The dialog opens on today and stops at today
        (maxDate). Close it without picking to see the required error.
      </Text>
      <DateField
        clearable={false}
        fieldControlProps={{
          control,
          name: 'dateFilled',
          label: 'Received on (filled, not clearable)',
          required: true,
        }}
      />
      <DateField
        placeholder="No due date"
        fieldControlProps={{
          control,
          name: 'dateOptional',
          label: 'Due date (optional)',
          helper: 'Tap × to clear it.',
        }}
      />
      <DateField
        placeholder="Choose a date"
        fieldControlProps={{
          control,
          name: 'dateInvalid',
          label: 'Received on (error)',
          required: true,
          error: 'Choose a date.',
        }}
      />
      <DateField
        fieldControlProps={{ control, name: 'dateDisabled', label: 'Received on (disabled)', disabled: true }}
      />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Bare, no form</Text>
      <DateField
        value={bareDate}
        onChange={setBareDate}
        accessibilityLabel="Date"
        placeholder="Choose a date"
      />
      <SelectField
        value={bareWho}
        onChange={setBareWho}
        accessibilityLabel="Who"
        options={PAYER_OPTIONS}
        placeholder="Choose who paid"
      />
      <MonthSelectField
        value={bareMonth}
        onChange={setBareMonth}
        accessibilityLabel="Month"
        months={months}
        placeholder="Choose a month"
      />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Bare values: {bareWho === '' ? '(none)' : bareWho} / {bareMonth === '' ? '(none)' : bareMonth}
      </Text>

      <Text className="font-manrope-bold text-sheet-title text-on-surface">Switch</Text>
      <TouchTargetCheck>
        <SwitchRow
          label="Fixes a past month"
          description="Turn on to pick the month being corrected"
          fieldControlProps={{ control, name: 'switchOn' }}
        />
      </TouchTargetCheck>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Live value: {switchOn ? 'on' : 'off'}
      </Text>
      <SwitchRow label="Off, no hint" fieldControlProps={{ control, name: 'switchOff' }} />
      <SwitchRow
        label="Error"
        description="Shown instead of this hint"
        fieldControlProps={{ control, name: 'switchInvalid', error: 'Turn this on to continue.' }}
      />
      <SwitchRow
        label="Disabled, on"
        description="Notifications are blocked on this phone"
        fieldControlProps={{ control, name: 'switchDisabledOn', disabled: true }}
      />
      <SwitchRow
        label="Disabled, off"
        fieldControlProps={{ control, name: 'switchDisabledOff', disabled: true }}
      />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Bare, no form</Text>
      <SwitchRow
        label="Row with no form"
        description="Value and handler come from the screen"
        value={bareSwitchRow}
        onChange={setBareSwitchRow}
      />
      <View className="flex-row items-center gap-3">
        <Switch value={bareSwitch} onChange={setBareSwitch} accessibilityLabel="Bare switch" />
        <Text className="font-manrope-medium text-caption text-on-surface-variant">
          Bare switch, no label: {bareSwitch ? 'on' : 'off'}
        </Text>
      </View>
    </View>
  );
}

type SheetMode = 'idle' | 'saving' | 'failed';

/** Bottom sheet scaffold section (plan 2.14): the three fixed states and a fake save flow. */
function SheetDemo() {
  const sheetRef = useRef<AppSheetRef>(null);
  const attempts = useRef(0);
  const [mode, setMode] = useState<SheetMode>('idle');
  const [note, setNote] = useState('Aircon servicing');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState('Nothing saved yet');

  const openIn = (next: SheetMode) => {
    attempts.current = 0;
    setMode(next);
    sheetRef.current?.open();
  };

  // Fake save: the first try fails, the retry succeeds and closes the sheet.
  const fakeSave = () => {
    setMode('saving');
    attempts.current += 1;
    setTimeout(() => {
      if (attempts.current < 2) {
        setMode('failed');
        return;
      }
      setResult(`Saved "${note}" after ${attempts.current} tries`);
      setMode('idle');
      sheetRef.current?.close();
    }, 1200);
  };

  return (
    <View className="gap-3">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">
        Bottom sheet scaffold
      </Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Fake save: the first save fails, Retry succeeds. While saving, Cancel, swipe-down and the
        scrim are locked on purpose. The “Open (saving)” demo never finishes, so leave it with the
        Android back gesture (back is not locked yet). {result}.
      </Text>
      <Button label="Open sheet (idle, fake save)" onPress={() => openIn('idle')} />
      <View className="flex-row gap-2">
        <Button
          size="small"
          variant="outline"
          label="Open (saving)"
          className="flex-1"
          onPress={() => openIn('saving')}
        />
        <Button
          size="small"
          variant="outline"
          label="Open (failed)"
          className="flex-1"
          onPress={() => openIn('failed')}
        />
      </View>
      <AppSheet
        ref={sheetRef}
        title="Record payment"
        subtitle="Money you received for November"
        actionLabel="Record payment"
        saving={mode === 'saving'}
        failed={mode === 'failed'}
        onAction={fakeSave}
        disabled={note.trim() === ''}
      >
        <TextInput
          value={note}
          onChange={setNote}
          disabled={mode === 'saving'}
          placeholder="What’s it for"
          accessibilityLabel="What’s it for"
        />
        <TextInput
          value={amount}
          onChange={setAmount}
          disabled={mode === 'saving'}
          keyboardType="decimal-pad"
          placeholder="Amount"
          accessibilityLabel="Amount"
        />
        {Array.from({ length: 8 }, (_, i) => (
          <View key={i} className="h-14 justify-center rounded-field bg-container px-4">
            <Text className="font-manrope-medium text-body text-foreground">
              Filler row {i + 1}, to make the body scroll
            </Text>
          </View>
        ))}
      </AppSheet>
    </View>
  );
}

type DialogKind = 'removePerson' | 'removeVersion' | 'discard' | 'warnings';

/** Dialog scaffold section (plan 2.15): the three Confirm boards and Save with warnings. */
function SkeletonDemo() {
  return (
    <View className="gap-3">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Skeleton</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Placeholders for a loading screen. They pulse; the layout matches the loaded content.
      </Text>
      <Text className="font-manrope-bold text-label text-on-surface-variant">Card</Text>
      <SkeletonCard />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Row list</Text>
      <SkeletonRowList count={3} />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Person cards</Text>
      <SkeletonPersonCards count={2} />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Blocks</Text>
      <View className="flex-row items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-1.5">
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="h-3 w-40" />
        </View>
      </View>
    </View>
  );
}

const MOCK_ACCORDION_ROWS = [
  { value: 'priya', name: 'Priya', total: 123_69, lines: [['Rent', 123_69]] },
  { value: 'sam', name: 'Sam', total: 82_46, lines: [['Rent', 82_46]] },
  { value: 'jordan', name: 'Jordan', total: 122_69, lines: [['Rent', 82_46], ['Utilities', 40_23]] },
] as const;

/** Cards, progress, accordion and spinner section (plan 2.18), with mock content. */
function SurfacesDemo() {
  const [coverage, setCoverage] = useState(60);
  const [stepsDone, setStepsDone] = useState(2);
  return (
    <View className="gap-3">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Cards</Text>
      <Card>
        <Text className="font-manrope-bold text-label text-on-surface">Padded card</Text>
        <Text className="font-manrope-medium text-body text-on-surface-variant">
          Free-form content with 16px padding and a 12px gap. Flat, no border.
        </Text>
      </Card>
      <Card padded={false}>
        <View className="min-h-12 justify-center px-4">
          <Text className="font-manrope-medium text-body text-on-surface">Unpadded card, row 1</Text>
        </View>
        <View className="min-h-12 justify-center border-t border-outline-variant px-4">
          <Text className="font-manrope-medium text-body text-on-surface">Row 2</Text>
        </View>
      </Card>

      <Text className="font-manrope-bold text-sheet-title text-on-surface">Progress</Text>
      <Progress value={coverage} accessibilityLabel="Bill collected" />
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        {coverage}% collected
      </Text>
      <ConnectedButtonGroup
        fit
        label="Collected"
        value={String(coverage)}
        onChange={(v) => setCoverage(Number(v))}
        options={[
          { label: '0%', value: '0' },
          { label: '60%', value: '60' },
          { label: '100%', value: '100' },
        ]}
      />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Setup steps</Text>
      <SegmentedProgress total={4} done={stepsDone} accessibilityLabel="Setup steps" />
      <ConnectedButtonGroup
        fit
        label="Steps done"
        value={String(stepsDone)}
        onChange={(v) => setStepsDone(Number(v))}
        options={[
          { label: '0', value: '0' },
          { label: '2', value: '2' },
          { label: '4', value: '4' },
        ]}
      />
      <Text className="font-manrope-bold text-label text-on-surface-variant">Split bar</Text>
      <SplitProgress percent={50} accessibilityLabel="Your share 50 percent" />
      <SplitProgress percent={70} accessibilityLabel="Your share 70 percent" />

      <Text className="font-manrope-bold text-sheet-title text-on-surface">Accordion</Text>
      <Card padded={false}>
        <Accordion
          defaultOpen={['priya']}
          rows={MOCK_ACCORDION_ROWS.map((row) => ({
            value: row.value,
            accessibilityLabel: `${row.name}, ${formatCents(row.total)}`,
            header: (
              <View className="flex-1 flex-row items-center justify-between">
                <Text className="font-manrope-bold text-body text-on-surface">{row.name}</Text>
                <Text className="font-manrope-extrabold text-body text-on-surface">
                  {formatCents(row.total)}
                </Text>
              </View>
            ),
            content: (
              <View className="gap-1">
                {row.lines.map(([label, amount]) => (
                  <View key={label} className="flex-row justify-between">
                    <Text className="font-manrope-medium text-body text-on-surface-variant">
                      {label}
                    </Text>
                    <Text className="font-manrope-medium text-body text-on-surface-variant">
                      {formatCents(amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ),
          }))}
        />
      </Card>

      <Text className="font-manrope-bold text-sheet-title text-on-surface">Spinner</Text>
      <View className="flex-row items-center gap-4">
        <Spinner />
        <Spinner size="large" />
        <Text className="font-manrope-medium text-caption text-on-surface-variant">
          Small and large
        </Text>
      </View>
    </View>
  );
}

/** Screen header section (plan 2.17): tab-style title and back-arrow style, with mock content. */
function HeadersDemo() {
  const [backCount, setBackCount] = useState(0);
  const onBack = () => setBackCount((n) => n + 1);

  return (
    <View className="gap-3">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Screen headers</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Back presses here are counted instead of leaving the page: {backCount}. On a real screen
        back uses the router.
      </Text>
      <Text className="font-manrope-bold text-label text-on-surface-variant">Tab title</Text>
      <View className="rounded-card bg-surface">
        <PageHeader title="History" />
      </View>
      <Text className="font-manrope-bold text-label text-on-surface-variant">
        Tab title with an action
      </Text>
      <View className="rounded-card bg-surface">
        <PageHeader
          title="Household"
          trailing={<Button label="Add person" variant="outline" size="small" />}
        />
      </View>
      <Text className="font-manrope-bold text-label text-on-surface-variant">Back arrow</Text>
      <View className="rounded-card bg-surface">
        <SubpageHeader title="Utilities bill" onBack={onBack} />
      </View>
      <Text className="font-manrope-bold text-label text-on-surface-variant">
        Back arrow with subtitle
      </Text>
      <View className="rounded-card bg-surface">
        <SubpageHeader title="Utilities bill" subtitle="November 2026" onBack={onBack} />
      </View>
      <Text className="font-manrope-bold text-label text-on-surface-variant">
        Back arrow, long title
      </Text>
      <View className="rounded-card bg-surface">
        <SubpageHeader
          title="A very long screen title that has to be cut off"
          subtitle="Read-only"
          onBack={onBack}
        />
      </View>
    </View>
  );
}

function DialogsDemo() {
  const [kind, setKind] = useState<DialogKind | null>(null);
  const [result, setResult] = useState('Nothing chosen yet');

  const close = (outcome: string) => {
    setResult(outcome);
    setKind(null);
  };

  return (
    <View className="gap-3">
      <Text className="font-manrope-bold text-sheet-title text-on-surface">Dialogs</Text>
      <Text className="font-manrope-medium text-caption text-on-surface-variant">
        Tapping the scrim does nothing; the Android back gesture counts as the first button.
        Last choice: {result}.
      </Text>
      <Button label="Remove person" variant="outline" onPress={() => setKind('removePerson')} />
      <Button label="Remove version" variant="outline" onPress={() => setKind('removeVersion')} />
      <Button label="Discard changes" variant="outline" onPress={() => setKind('discard')} />
      <Button label="Save with warnings" variant="outline" onPress={() => setKind('warnings')} />
      <ConfirmDialog
        open={kind === 'removePerson'}
        icon={UserMinus}
        title="Remove Tenant 2 from household?"
        body="From January 2027 they won’t get any charges or messages, and the utility shares will be split between everyone else."
        items={[
          'Past months and History stay as they are',
          'Their $950.00 deposit stays recorded until you return it',
        ]}
        onCancel={() => close('Cancel (remove person)')}
        confirmLabel="Remove from household"
        onConfirm={() => close('Remove from household')}
      />
      <ConfirmDialog
        open={kind === 'removeVersion'}
        icon={Trash2}
        title="Remove this version?"
        body="Tenant 2 will get the Everyone template from January 2027. Messages already sent won’t change."
        onCancel={() => close('Cancel (remove version)')}
        confirmLabel="Remove version"
        onConfirm={() => close('Remove version')}
      />
      <ConfirmDialog
        open={kind === 'discard'}
        icon={Undo2}
        title="Discard changes?"
        body="Your edits to Tenant 2 haven’t been saved. If you leave now, they’ll be lost."
        cancelLabel="Keep editing"
        onCancel={() => close('Keep editing')}
        confirmLabel="Discard"
        onConfirm={() => close('Discard')}
      />
      <ConfirmDialog
        open={kind === 'warnings'}
        tone="warning"
        icon={TriangleAlert}
        title="Save with warnings?"
        body="Check these before you continue:"
        items={[
          'The billing period is not in November 2026',
          'The lines add up to $1,850.00, not $1,862.86',
        ]}
        itemStyle="bullet"
        cancelLabel="Go back and fix"
        onCancel={() => close('Go back and fix')}
        confirmLabel="Save anyway"
        onConfirm={() => close('Save anyway')}
      />
    </View>
  );
}

/**
 * Dev-only component test page (plan 2.3). Every shared component gets a section here.
 * Absent from release builds: redirects home when `__DEV__` is false.
 */
export default function ComponentTestPage() {
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();
  const [checkTargets, setCheckTargets] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [scope, setScope] = useState('shared');
  const [sample, setSample] = useState('priya');
  const [method, setMethod] = useState('unit');
  const [who, setWho] = useState('sam');
  const [measured32, setMeasured32] = useState('?');
  const [measured48, setMeasured48] = useState('?');
  const [taps, setTaps] = useState(0);
  const [buttonState, setButtonState] = useState<string>('default');
  const [navActive, setNavActive] = useState('one');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <TouchTargetCheckProvider enabled={checkTargets}>
      <Screen>
        <PageHeader title="Component test page" />
        <View className="gap-3 border-b border-outline-variant bg-background px-4 pb-3 pt-1">
          <TouchTargetCheck>
            <ConnectedButtonGroup<ThemePreference>
              value={preference}
              onChange={setPreference}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System', value: 'system' },
              ]}
            />
          </TouchTargetCheck>
          <View className="min-h-11 flex-row items-center justify-between">
            <Text className="font-manrope-medium text-body text-foreground">
              Outline targets under 44px
            </Text>
            <Switch
              value={checkTargets}
              onChange={setCheckTargets}
              accessibilityLabel="Outline targets under 44px"
            />
          </View>
          <Button
            label="Open screen state gallery"
            variant="outline"
            onPress={() => router.push('/__gallery')}
          />
          <View className="min-h-11 flex-row items-center justify-between">
            <Text className="font-manrope-medium text-body text-foreground">
              Show skeletons (pulsing, costs frames)
            </Text>
            <Switch
              value={showSkeletons}
              onChange={setShowSkeletons}
              accessibilityLabel="Show skeletons"
            />
          </View>
        </View>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView contentContainerClassName="gap-6 px-4 py-6" keyboardShouldPersistTaps="handled">
          <View className="gap-3">
            <Text className="font-manrope-bold text-label text-foreground">
              Touch target check (demo)
            </Text>
            <View className="flex-row items-center gap-4">
              <TouchTargetCheck onMeasure={(w, h) => setMeasured32(`${w} x ${h}`)}>
                <View className="size-8 items-center justify-center rounded-full bg-container">
                  <Text className="font-manrope-medium text-caption text-foreground">32</Text>
                </View>
              </TouchTargetCheck>
              <TouchTargetCheck onMeasure={(w, h) => setMeasured48(`${w} x ${h}`)}>
                <View className="size-12 items-center justify-center rounded-full bg-container">
                  <Text className="font-manrope-medium text-caption text-foreground">48</Text>
                </View>
              </TouchTargetCheck>
              <Text className="flex-1 font-manrope-medium text-caption text-on-surface-variant">
                With the switch on, only the 32px box should get a red outline.
              </Text>
            </View>
            {/* TEMP diagnostic: measured sizes in dp */}
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Measured: 32 box = {measured32}, 48 box = {measured48}
            </Text>
          </View>
          <View className="gap-3">
            <Text className="font-manrope-bold text-label text-foreground">
              Connected button group
            </Text>
            <TouchTargetCheck>
              <ConnectedButtonGroup
                label="Charge type"
                value={scope}
                onChange={setScope}
                options={SCOPE_OPTIONS}
              />
            </TouchTargetCheck>
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Selected: {scope}
            </Text>
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Content-width segments (Settings preview sample)
            </Text>
            <ConnectedButtonGroup
              fit
              label="Preview sample"
              value={sample}
              onChange={setSample}
              options={SAMPLE_OPTIONS}
            />
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Disabled (saving)
            </Text>
            <ConnectedButtonGroup
              disabled
              value={scope}
              onChange={setScope}
              options={SCOPE_OPTIONS}
            />
          </View>
          <View className="gap-3">
            <Text className="font-manrope-bold text-label text-foreground">
              Single-select chips
            </Text>
            <View className="gap-1.5">
              <Text className="font-manrope-bold text-label text-foreground">Split method</Text>
              <TouchTargetCheck>
                <ChipGroup
                  label="Split method"
                  value={method}
                  onChange={setMethod}
                  options={METHOD_OPTIONS}
                />
              </TouchTargetCheck>
            </View>
            <View className="gap-1.5">
              <Text className="font-manrope-bold text-label text-foreground">Who</Text>
              <ChipGroup label="Who" value={who} onChange={setWho} options={WHO_OPTIONS} />
            </View>
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Selected: {method} / {who}
            </Text>
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Disabled (saving)
            </Text>
            <ChipGroup disabled value={method} onChange={setMethod} options={METHOD_OPTIONS} />
          </View>
          <View className="gap-3">
            <Text className="font-manrope-bold text-label text-foreground">Buttons</Text>
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Taps: {taps}. Press and hold a button to see the pressed look. Disabled and loading
              buttons must not count taps.
            </Text>
            <ConnectedButtonGroup
              label="Button state"
              value={buttonState}
              onChange={setButtonState}
              options={BUTTON_STATE_OPTIONS}
            />
            {BUTTON_VARIANTS.map((variant) => (
              <TouchTargetCheck key={variant}>
                <Button
                  variant={variant}
                  label={variant}
                  loading={buttonState === 'loading'}
                  disabled={buttonState === 'disabled'}
                  onPress={() => setTaps((n) => n + 1)}
                />
              </TouchTargetCheck>
            ))}
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Small (44px) with icons, as row actions
            </Text>
            <View className="flex-row gap-2">
              <Button
                size="small"
                variant="warning"
                icon={Bell}
                label="Nudge"
                className="flex-1"
                onPress={() => setTaps((n) => n + 1)}
              />
              <Button
                size="small"
                variant="outline"
                icon={Check}
                label="Mark paid"
                className="flex-1"
                onPress={() => setTaps((n) => n + 1)}
              />
            </View>
            <View className="flex-row gap-2">
              <Button
                size="small"
                variant="outline"
                icon={Send}
                label="Send on WhatsApp"
                className="flex-1"
                onPress={() => setTaps((n) => n + 1)}
              />
              <Button size="small" disabled variant="outline" label="Disabled" className="flex-1" />
            </View>
            <View className="flex-row gap-2">
              <Button size="small" loading label="Saving" className="flex-1" />
              <Button
                size="small"
                label="Continue"
                className="flex-1"
                onPress={() => setTaps((n) => n + 1)}
              />
            </View>
          </View>
          <View className="gap-3">
            <Text className="font-manrope-bold text-sheet-title text-on-surface">Alerts</Text>
            <Alert variant="info" message="Your session ended, sign in again." />
            <Alert
              variant="info"
              icon={Clock}
              message="Tenant 2’s utilities are due today"
            />
            <Alert
              variant="warning"
              title="Bill total looks unusual"
              message="This month is 40% higher than the last three months."
            />
            <Alert
              variant="danger"
              title="Couldn’t sign in"
              message="Something went wrong reaching Google. Try again."
            />
            <Alert variant="success" message="Everyone’s paid. Utilities bill paid 16 Nov." />
            <Alert
              variant="info"
              title="Unfinished bill draft"
              message="You started adding the November bill."
            >
              <View className="flex-row gap-2">
                <Button size="small" label="Continue" className="flex-1" />
                <Button size="small" variant="outline" label="Discard" className="flex-1" />
              </View>
            </Alert>
          </View>
          <View className="gap-3">
            <Text className="font-manrope-bold text-sheet-title text-on-surface">
              Badges and status chips
            </Text>
            {[
              {
                title: 'success',
                badges: [<Badge key="paid" variant="success" label="Paid" />],
              },
              {
                title: 'warning',
                badges: [<Badge key="unpaid" variant="warning" label="Unpaid" />],
              },
              {
                title: 'danger',
                badges: [<Badge key="overdue" variant="danger" label="Overdue 2 days" />],
              },
              {
                title: 'info',
                badges: [<Badge key="due" variant="info" label="Due 16 Nov" />],
              },
              {
                title: 'neutral',
                badges: [<Badge key="neutral" variant="neutral" label="Neutral" />],
              },
              {
                title: 'primary',
                badges: [<Badge key="todo" variant="primary" label="To do" />],
              },
              {
                title: 'with icon',
                badges: [
                  <Badge key="success" variant="success" icon={CircleCheck} label="Success" />,
                  <Badge key="warning" variant="warning" icon={TriangleAlert} label="Warning" />,
                  <Badge key="error" variant="danger" icon={CircleAlert} label="Error" />,
                  <Badge key="due" variant="info" icon={Clock} label="Due today" />,
                  <Badge key="icon-primary" variant="primary" icon={Bell} label="Primary Icon" />,
                  <Badge key="nudged" variant="neutral" icon={Bell} label="Nudged Mon 2 Nov" />,
                ],
              },
            ].map((group) => (
              <View key={group.title} className="gap-2">
                <Text className="font-manrope-bold text-label text-on-surface-variant">
                  {group.title}
                </Text>
                <View className="flex-row flex-wrap items-center gap-2">{group.badges}</View>
              </View>
            ))}
          </View>
          <FormFieldsDemo />
          <PickersDemo />
          <View className="gap-3">
            <Text className="font-manrope-bold text-label text-foreground">Bottom navigation</Text>
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Demo bar with its own selection (the real bar is at the bottom of the screen).
              Selected: {navActive}
            </Text>
            <View className="overflow-hidden rounded-card">
              <BottomNavBar items={MOCK_NAV_ITEMS} active={navActive} onItemPress={setNavActive} />
            </View>
          </View>
          <SheetDemo />
          <DialogsDemo />
          {showSkeletons ? <SkeletonDemo /> : null}
          <SurfacesDemo />
          <HeadersDemo />
        </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </TouchTargetCheckProvider>
  );
}
