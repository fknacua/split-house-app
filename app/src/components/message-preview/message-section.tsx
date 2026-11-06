import { Text, View } from 'react-native';

import type { MessagePreview } from '@splithouse/shared';

/** Props for {@link MessageSection}. */
export interface MessageSectionProps {
  /** One person's lines, with the title and subtotal when the message has more than one person. */
  section: MessagePreview['sections'][number];
}

/**
 * One person's lines in the message preview, as WhatsApp shows the sent text: the title plain, each line
 * `**Label:** amount (working)` and the subtotal `**Subtotal:** amount`. A lone own section has no title or subtotal.
 */
export function MessageSection({ section }: MessageSectionProps) {
  return (
    <View>
      {section.title ? (
        <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">{section.title}</Text>
      ) : null}
      {section.lines.map((line, i) => (
        <Text key={line.label + i} className="font-manrope text-[13px] leading-[17px] text-on-surface">
          <Text className="font-manrope-bold">{line.label}:</Text> {line.amount}
          {line.working ? ` ${line.working}` : null}
        </Text>
      ))}
      {section.subtotal ? (
        <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">
          <Text className="font-manrope-bold">Subtotal:</Text> {section.subtotal}
        </Text>
      ) : null}
    </View>
  );
}
