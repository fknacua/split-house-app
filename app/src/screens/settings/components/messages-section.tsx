import { Text, View } from 'react-native';

import { Card } from '@/components';
import type { MessagesSectionProps } from '../types';
import { MessageRow } from './message-row';
import { MessagesSkeleton } from './messages-skeleton';

/** The Messages section: the label above a card with one row per template, or their skeleton while loading. */
export function MessagesSection({ rows }: MessagesSectionProps) {
  return (
    <View className="gap-2">
      <Text className="mx-1 mt-2 font-manrope-bold text-label text-on-surface-variant">Messages</Text>
      {rows ? (
        <Card padded={false}>
          {rows.map((row, i) => (
            <MessageRow key={row.kind} row={row} separated={i > 0} />
          ))}
        </Card>
      ) : (
        <MessagesSkeleton />
      )}
    </View>
  );
}
