import { Text, View } from 'react-native';

import { Card, ConnectedButtonGroup, SkeletonBlock } from '@/components';
import type { NudgePreviewCardProps } from '../types';

/** The nudge as the server rendered it, with the caption under it and the compact group that picks who it shows. Blocks stand in until the first answer. */
export function NudgePreviewCard({ answer, samples, samplePersonId, onSampleChange }: NudgePreviewCardProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-bold text-label text-on-surface">
          Preview
        </Text>
        {/* With one person or a person chosen there is nobody else to show. */}
        {samplePersonId !== null && samples.length > 1 ? (
          <ConnectedButtonGroup
            fit
            label="Preview sample"
            value={samplePersonId}
            onChange={onSampleChange}
            options={samples.map((sample) => ({ label: sample.label, value: sample.personId }))}
          />
        ) : null}
      </View>
      <Card padded={false} className="gap-2 p-3.5">
        {answer ? (
          <>
            <Text className="font-manrope-medium text-body text-on-surface">{answer.preview.intro}</Text>
            <Text className="font-manrope-semibold text-caption text-on-surface-variant">{answer.meta}</Text>
          </>
        ) : (
          <>
            <SkeletonBlock className="h-3.5" />
            <SkeletonBlock className="h-3.5 w-1/2" />
          </>
        )}
      </Card>
    </View>
  );
}
