import { Text, View } from 'react-native';

import type { MessageSectionProps } from '../types';

/**
 * One person's lines in the message preview. The title is plain, and the subtotal sits bold under
 * a dashed rule, as WhatsApp shows them; a lone own section has neither.
 */
export function MessageSection({ section }: MessageSectionProps) {
  return (
    <View className="gap-0.5">
      {section.title ? (
        <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">{section.title}</Text>
      ) : null}
      {section.lines.map((line, i) => (
        <View key={line.label + i} className="flex-row justify-between gap-2">
          <Text className="shrink font-manrope text-[13px] leading-[17px] text-on-surface-variant">{line.label}</Text>
          <Text
            className="font-manrope text-[13px] leading-[17px] text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {line.amount}
          </Text>
        </View>
      ))}
      {section.subtotal ? (
        <View className="flex-row justify-between gap-3 border-t border-dashed border-outline-variant pt-0.5">
          <Text className="font-manrope-bold text-[13px] leading-[17px] text-on-surface">Subtotal</Text>
          <Text
            className="font-manrope-bold text-[13px] leading-[17px] text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {section.subtotal}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
