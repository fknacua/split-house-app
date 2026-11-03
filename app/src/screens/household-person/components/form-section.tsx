import { Text, View } from 'react-native';

import type { FormSectionProps } from '../types';

/** One titled group on a person's Edit or View screen, with a rule above all but the first and an optional note. */
export function FormSection({ title, note, separated, children }: FormSectionProps) {
  return (
    <View className={`gap-4 ${separated ? 'border-t border-outline-variant pt-[18px]' : 'pt-1'}`}>
      <View className="gap-0.5 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          {title}
        </Text>
        {note ? <Text className="font-manrope-medium text-caption text-on-surface-variant">{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}
