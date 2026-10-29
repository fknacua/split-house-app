import { FileText } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Card, Icon, SkeletonBlock } from '@/components';
import type { FileCardProps } from '../types';

/** The picked PDF: a file icon, its name on one line and the pages and size under it. A null name draws a placeholder. */
export function FileCard({ filename, meta, size, children }: FileCardProps) {
  const large = size === 'large';
  return (
    <Card className={large ? 'gap-4' : 'gap-3 pb-0 pt-3'}>
      <View className="flex-row items-center gap-3">
        <View
          className={`items-center justify-center rounded-lg bg-selected ${large ? 'h-[52px] w-11' : 'h-12 w-10'}`}
        >
          <Icon as={FileText} size={large ? 24 : 22} className="text-on-selected" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          {filename === null ? (
            <SkeletonBlock className="h-4" width="60%" />
          ) : (
            <Text numberOfLines={1} className="font-manrope-bold text-label text-on-surface">
              {filename}
            </Text>
          )}
          {meta ? (
            <Text className="font-manrope-semibold text-caption text-on-surface-variant">{meta}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </Card>
  );
}
