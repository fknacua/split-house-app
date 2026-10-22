import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ChipGroup } from '@/components/chip';
import { SegmentedControl } from '@/components/segmented-control';
import { TouchTargetCheck, TouchTargetCheckProvider } from '@/components/touch-target-check';
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
          <Text className="font-manrope-medium text-body text-on-surface-variant">
            Sections are added by the later Phase 2 steps.
          </Text>
        </ScrollView>
      </View>
    </TouchTargetCheckProvider>
  );
}
