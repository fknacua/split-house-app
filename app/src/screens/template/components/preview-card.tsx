import { Text, View } from 'react-native';

import { Card, MessagePreview, SkeletonBlock } from '@/components';
import type { PreviewCardProps } from '../types';

/** The draft as the server rendered it. Blocks stand in until the first answer; blank text has nothing to preview. */
export function PreviewCard({ answer }: PreviewCardProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          Preview
        </Text>
      </View>
      <Card padded={false} className="gap-1.5 px-3.5 py-3">
        {answer?.preview ? (
          <MessagePreview message={answer.preview} />
        ) : answer ? (
          <Text className="font-manrope-medium text-caption text-on-surface-variant">Nothing to preview yet</Text>
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
