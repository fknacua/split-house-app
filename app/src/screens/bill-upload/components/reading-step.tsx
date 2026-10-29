import { Text, View } from 'react-native';

import { Spinner } from '@/components';
import type { ReadingStepProps } from '../types';
import { FileCard } from './file-card';

/**
 * The `reading` board. The design's progress bar becomes a Spinner, since an upload with `fetch`
 * reports no progress (deviation B8). Cancel is in the footer.
 */
export function ReadingStep({ filename }: ReadingStepProps) {
  return (
    <>
      <View className="gap-2 px-1">
        <Text accessibilityRole="header" className="font-manrope-extrabold text-title text-on-surface">
          Reading the bill…
        </Text>
        <Text className="font-manrope text-body text-on-surface-variant">Takes a few seconds.</Text>
      </View>
      <FileCard filename={filename} size="large">
        <Spinner accessibilityLabel={`Reading ${filename}`} className="self-start text-primary" />
      </FileCard>
    </>
  );
}
