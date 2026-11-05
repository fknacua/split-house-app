import { Text, View } from 'react-native';

import { Card, ConnectedButtonGroup } from '@/components';
import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';

const THEME_OPTIONS: readonly { label: string; value: ThemePreference }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

/** The Appearance section: the theme choice, stored on this device. */
export function AppearanceSection() {
  const { preference, setPreference } = useThemePreference();

  return (
    <View className="gap-2">
      <Text className="mx-1 mt-2 font-manrope-bold text-label text-on-surface-variant">Appearance</Text>
      <Card padded={false} className="gap-2.5 px-4 py-3.5">
        <Text className="font-manrope-bold text-label text-on-surface">Theme</Text>
        <ConnectedButtonGroup<ThemePreference>
          label="Theme"
          value={preference}
          onChange={setPreference}
          options={THEME_OPTIONS}
        />
      </Card>
    </View>
  );
}
