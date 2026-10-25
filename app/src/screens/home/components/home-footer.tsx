import { Banknote, FilePen, Upload, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components';
import { topShadow } from '@/lib/elevation';
import { useThemePreference } from '@/lib/theme-preference';
import { openTarget } from '../open-target';
import type { HomeFooterProps } from '../types';

const ICONS: Record<HomeFooterProps['action']['icon'], LucideIcon> = {
  upload: Upload,
  'file-pen': FilePen,
  banknote: Banknote,
};

/** The sticky button under the content, above the bottom navigation. */
export function HomeFooter({ action }: HomeFooterProps) {
  const { resolved } = useThemePreference();

  return (
    <View
      className="border-t border-outline-variant bg-background px-4 py-2.5"
      style={{ boxShadow: topShadow(resolved) }}
    >
      <Button label={action.label} icon={ICONS[action.icon]} onPress={() => openTarget(action.target)} />
    </View>
  );
}
