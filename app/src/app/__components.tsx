import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Bell, Check, CheckCircle, CircleAlert, CircleCheck, Clock, Send, TriangleAlert } from 'lucide-react-native';

import { Alert } from '@/components/alert';
import { Badge } from '@/components/badge';
import { Button, type ButtonVariant } from '@/components/button';
import { ChipGroup } from '@/components/chip';
import { SegmentedControl } from '@/components/segmented-control';
import { TouchTargetCheck, TouchTargetCheckProvider } from '@/components/touch-target-check';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Switch } from '@/components/ui/switch';
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

/**
 * Dev-only component test page (plan 2.3). Every shared component gets a section here.
 * Absent from release builds: redirects home when `__DEV__` is false.
 */
export default function ComponentTestPage() {
  const { preference, setPreference } = useThemePreference();
  const [checkTargets, setCheckTargets] = useState(false);
  const [scope, setScope] = useState('shared');
  const [sample, setSample] = useState('priya');
  const [method, setMethod] = useState('unit');
  const [who, setWho] = useState('sam');
  const [measured32, setMeasured32] = useState('?');
  const [measured48, setMeasured48] = useState('?');
  const [taps, setTaps] = useState(0);
  const [buttonState, setButtonState] = useState<string>('default');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <TouchTargetCheckProvider enabled={checkTargets}>
      <View className="flex-1 bg-background">
        <View className="gap-3 border-b border-outline-variant bg-background px-4 pb-3 pt-12">
          <Text className="font-manrope-bold text-title text-foreground">Component test page</Text>
          <TouchTargetCheck>
            <SegmentedControl<ThemePreference>
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
            <Switch value={checkTargets} onValueChange={setCheckTargets} />
          </View>
        </View>
        <ScrollView contentContainerClassName="gap-6 px-4 py-6">
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
              Segmented control
            </Text>
            <TouchTargetCheck>
              <SegmentedControl
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
            <SegmentedControl
              fit
              label="Preview sample"
              value={sample}
              onChange={setSample}
              options={SAMPLE_OPTIONS}
            />
            <Text className="font-manrope-medium text-caption text-on-surface-variant">
              Disabled (saving)
            </Text>
            <SegmentedControl
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
            <SegmentedControl
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
          <Text className="font-manrope-medium text-body text-on-surface-variant">
            Sections are added by the later Phase 2 steps.
          </Text>
        </ScrollView>
      </View>
    </TouchTargetCheckProvider>
  );
}
