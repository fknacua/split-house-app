import { View } from 'react-native';

import { Alert } from '@/components';
import type { HomeNoticeProps } from '../types';
import { HomeActionButton } from './home-action-button';

/** The info Alert at the bottom of the hero, such as the unfinished bill draft. Its buttons share the width. */
export function HomeNotice({ notice }: HomeNoticeProps) {
  return (
    <Alert variant="info" title={notice.title} message={notice.text}>
      <View className="flex-row gap-2">
        {notice.actions.map((action) => (
          <HomeActionButton key={action.label} action={action} />
        ))}
      </View>
    </Alert>
  );
}
