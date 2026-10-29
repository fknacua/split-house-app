import { View, type DimensionValue } from 'react-native';

import { Card, SkeletonBlock } from '@/components';
import type { ReviewSkeletonProps } from '../types';
import { FileCard } from './file-card';

/** One label-above-field placeholder: the label, then the 48px input. */
function FieldSkeleton({ labelWidth, className }: { labelWidth: DimensionValue; className?: string }) {
  return (
    <View className={`gap-1.5 ${className ?? ''}`}>
      <SkeletonBlock className="h-3.5" width={labelWidth} />
      <SkeletonBlock className="h-12" />
    </View>
  );
}

/**
 * Review bill while the server reads the PDF, or while a stored draft loads: the file's name on its card, then the form's fields
 * (Current Charges, the dates, the utility lines) as placeholders, so the screen does not jump
 * when the values arrive. Cancel is in the footer.
 */
export function ReviewSkeleton({ filename }: ReviewSkeletonProps) {
  return (
    <View accessibilityLabel={filename === null ? 'Loading the bill' : `Reading ${filename}`} accessibilityRole="progressbar" className="gap-4">
      <FileCard filename={filename} size="small">
        <View className="mb-3 self-start">
          <SkeletonBlock className="h-11 w-44 rounded-full" />
        </View>
      </FileCard>

      <Card className="gap-4">
        <FieldSkeleton labelWidth="45%" />
      </Card>

      <Card className="gap-4">
        <View className="flex-row gap-3">
          <FieldSkeleton labelWidth="50%" className="min-w-0 flex-1" />
          <FieldSkeleton labelWidth="40%" className="min-w-0 flex-1" />
        </View>
        <FieldSkeleton labelWidth="30%" />
      </Card>

      <Card className="gap-3">
        <View className="gap-1.5">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-3" width="70%" />
        </View>
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-row items-center gap-3">
            <SkeletonBlock className="h-12 flex-1" />
            <SkeletonBlock className="h-12 w-28" />
          </View>
        ))}
      </Card>
    </View>
  );
}
