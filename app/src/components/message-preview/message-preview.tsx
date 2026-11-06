import { Text } from 'react-native';

import type { MessagePreview as MessagePreviewParts } from '@splithouse/shared';
import { MessageRuns } from './message-runs';
import { MessageSection } from './message-section';

/** Props for {@link MessagePreview}. */
export interface MessagePreviewProps {
  /** The rendered message, in parts. */
  message: MessagePreviewParts;
}

/**
 * A message as WhatsApp shows it, for a card to hold: the intro, each person's section and the text after them, with
 * line breaks and emoji kept and `*bold*` text shown bold without its asterisks. Recipient's message card and the
 * template editor's preview card both use it.
 */
export function MessagePreview({ message }: MessagePreviewProps) {
  return (
    <>
      {message.intro.length ? (
        <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">
          <MessageRuns runs={message.intro} />
        </Text>
      ) : null}
      {message.sections.map((section, i) => (
        <MessageSection key={i} section={section} />
      ))}
      {message.outro.length ? (
        <Text className="font-manrope text-[13px] leading-[17px] text-on-surface">
          <MessageRuns runs={message.outro} />
        </Text>
      ) : null}
    </>
  );
}
