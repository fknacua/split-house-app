import { Text, View } from 'react-native';

import type { FormSectionProps } from '../types';

/** One titled group on a person's Edit or View screen, with a rule above all but the first. */
export function FormSection({ title, separated, children }: FormSectionProps) {
  return (
    <View className={`gap-4 ${separated ? 'border-t border-outline-variant pt-[18px]' : 'pt-1'}`}>
      <Text accessibilityRole="header" className="px-1 font-manrope-bold text-label text-on-surface">
        {title}
      </Text>
      {children}
    </View>
  );
}
