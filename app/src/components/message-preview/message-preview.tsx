import { Text } from 'react-native';

import type { MessagePreview as MessagePreviewParts } from '@splithouse/shared';
import { MessageSection } from './message-section';

/** Props for {@link MessagePreview}. */
export interface MessagePreviewProps {
  /** The rendered message, in parts. */
  message: MessagePreviewParts;
}

/**
 * A message as WhatsApp shows it, for a card to hold: the intro, each person's section and the text after them, with
 * line breaks and emoji kept and the total line stressed as on the board. Recipient's message card and the template
 * editor's preview card both use it.
 */
export function MessagePreview({ message }: MessagePreviewProps) {
  return (
    <>
      {message.intro ? (
        <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">{message.intro}</Text>
      ) : null}
      {message.sections.map((section, i) => (
        <MessageSection key={i} section={section} />
      ))}
      {message.outro.map((line, i) =>
        line.isTotal ? (
          <Text
            key={i}
            className="border-t border-outline pt-1.5 font-manrope-extrabold text-body leading-5 text-on-surface"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {line.text}
          </Text>
        ) : (
          // A blank template line keeps its height.
          <Text key={i} className="font-manrope text-[13px] leading-[17px] text-on-surface">
            {line.text || ' '}
          </Text>
        ),
      )}
    </>
  );
}
