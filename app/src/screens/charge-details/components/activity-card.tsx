import { Text, View } from 'react-native';

import { Card } from '@/components';
import type { ActivityCardProps } from '../types';

/** What happened to the charge, newest first: each line's title and its full date. `No activity yet` when nothing has. */
export function ActivityCard({ activity }: ActivityCardProps) {
  if (activity.length === 0) {
    return (
      <Card padded={false} className="px-4 py-6">
        <Text className="text-center font-manrope-semibold text-label text-on-surface-variant">No activity yet</Text>
      </Card>
    );
  }
  return (
    <Card padded={false} className="px-3.5">
      {activity.map((line, i) => (
        <View
          key={`${line.title}-${line.date}-${i}`}
          className={`min-h-11 flex-row items-center justify-between gap-3 ${i === 0 ? '' : 'border-t border-outline-variant'}`}
        >
          <Text className="shrink font-manrope-bold text-label text-on-surface">{line.title}</Text>
          <Text className="font-manrope-semibold text-label text-on-surface-variant">{line.date}</Text>
        </View>
      ))}
    </Card>
  );
}
