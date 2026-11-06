import { View } from 'react-native';

import type { LandingContentProps } from '../types';
import { CustomSection } from './custom-section';
import { DefaultSection } from './default-section';

/** The loaded landing page: the Default, then the custom templates. */
export function LandingContent({ landing, onEdit, onAdd }: LandingContentProps) {
  return (
    <View className="gap-4">
      <DefaultSection section={landing.default} onEdit={() => onEdit(null)} />
      <CustomSection section={landing.custom} onEdit={onEdit} onAdd={onAdd} />
    </View>
  );
}
