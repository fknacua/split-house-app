import { Text, View } from 'react-native';

import { Card, MessagePreview, SkeletonBlock } from '@/components';
import type { PreviewCardProps } from '../types';

/** The draft as the server rendered it, with who and which month it is shown on. Blocks stand in until the first answer. */
export function PreviewCard({ answer }: PreviewCardProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          Preview
        </Text>
        {answer ? (
          <Text className="min-w-0 shrink text-right font-manrope-semibold text-caption text-on-surface-variant">
            {answer.meta}
          </Text>
        ) : null}
      </View>
      <Card padded={false} className="gap-1.5 px-3.5 py-3">
        {answer ? (
          <MessagePreview message={answer.preview} />
        ) : (
          <>
            <SkeletonBlock className="h-3.5" />
            <SkeletonBlock className="h-3.5" />
            <SkeletonBlock className="h-3.5 w-1/2" />
          </>
        )}
      </Card>
    </View>
  );
}
