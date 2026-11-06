import { Text, View } from 'react-native';

import { Button, Card, MessagePreview } from '@/components';
import { PERSON_COLOR_BG } from '@/lib';
import type { CustomTemplateCardProps } from '../types';

/** One person's custom template: their coloured initial, name and `{role} · {room}`, the preview, and Edit. */
export function CustomTemplateCard({ card, onEdit }: CustomTemplateCardProps) {
  return (
    <Card padded={false} className="gap-2.5 px-4 py-3.5">
      <View className="flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-full ${PERSON_COLOR_BG[card.color]}`}>
          <Text className="font-manrope-extrabold text-label text-on-person">{card.initial}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-manrope-bold text-label text-on-surface">{card.name}</Text>
          <Text className="font-manrope-semibold text-caption text-on-surface-variant">{card.sub}</Text>
        </View>
      </View>
      <View className="gap-1.5">
        <MessagePreview message={card.preview} />
      </View>
      <View className="flex-row justify-end">
        <Button label="Edit" variant="outline" size="small" onPress={onEdit} />
      </View>
    </Card>
  );
}
