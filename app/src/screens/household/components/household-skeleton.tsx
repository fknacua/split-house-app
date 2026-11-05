import { Pencil, Plus, UserPlus } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, SkeletonPersonCards } from '@/components';
import type { HouseholdSkeletonProps } from '../types';
import { SplitSkeletonRow } from './split-skeleton-row';
import { TabHeading } from './tab-heading';

const noop = () => {};

/** The `loading` state of a tab's content, matching its loaded layout. The heading and its button are real but do nothing. */
export function HouseholdSkeleton({ tab }: HouseholdSkeletonProps) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="gap-2" pointerEvents="none">
      {tab === 'split' ? (
        <>
          <TabHeading title="Household split" actionLabel="Edit splits" actionIcon={Pencil} onAction={noop} />
          <Card padded={false} className="px-3.5">
            {[0, 1, 2].map((i) => (
              <SplitSkeletonRow key={i} separated={i > 0} />
            ))}
          </Card>
        </>
      ) : null}
      {tab === 'people' ? (
        <>
          <TabHeading title="People" actionLabel="Add subtenant" actionIcon={UserPlus} onAction={noop} />
          <SkeletonPersonCards count={4} />
        </>
      ) : null}
      {tab === 'recurring' ? (
        <>
          <TabHeading title="Recurring charges" actionLabel="Add charge" actionIcon={Plus} onAction={noop} />
          <SkeletonPersonCards count={1} />
        </>
      ) : null}
    </View>
  );
}
