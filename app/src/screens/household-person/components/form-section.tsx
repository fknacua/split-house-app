import { Text, View } from 'react-native';

import type { FormSectionProps } from '../types';

/**
 * One group on a person's Edit or View screen, with a rule above all but the first, a title unless it is untitled,
 * and an optional note.
 */
export function FormSection({ title, note, separated, children }: FormSectionProps) {
  return (
    <View className={`gap-4 ${separated ? 'border-t border-outline-variant pt-[18px]' : 'pt-1'}`}>
      {title || note ? (
        <View className="gap-0.5 px-1">
          {title ? (
            <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
              {title}
            </Text>
          ) : null}
          {note ? <Text className="font-manrope-medium text-caption text-on-surface-variant">{note}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
