import { View } from 'react-native';

import { Card, SkeletonBlock } from '@/components';
import { HistorySkeletonRow } from './history-skeleton-row';

/** Loading state of the History list: two year labels, each over a card of month rows. */
export function HistorySkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="gap-2"
    >
      <SkeletonBlock className="mx-1 mt-2 h-3.5 w-11" />
      <Card padded={false}>
        <HistorySkeletonRow nameWidth="46%" detailWidth="82%" chipWidth={64} separated={false} />
      </Card>
      <SkeletonBlock className="mx-1 mt-2 h-3.5 w-11" />
      <Card padded={false}>
        <HistorySkeletonRow nameWidth="52%" detailWidth="70%" chipWidth={150} separated={false} />
        <HistorySkeletonRow nameWidth="50%" detailWidth="76%" chipWidth={120} separated />
      </Card>
    </View>
  );
}
