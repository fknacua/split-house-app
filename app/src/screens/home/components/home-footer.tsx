import { Banknote, FilePen, Upload, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components';
import { useOpenTarget } from '../use-open-target';
import type { HomeFooterProps } from '../types';
import { HomeFooterBar } from './home-footer-bar';

const ICONS: Record<HomeFooterProps['action']['icon'], LucideIcon> = {
  upload: Upload,
  'file-pen': FilePen,
  banknote: Banknote,
};

/** The sticky button under the content, above the bottom navigation. */
export function HomeFooter({ action }: HomeFooterProps) {
  const { openTarget, isDisabled } = useOpenTarget();
  return (
    <HomeFooterBar>
      <Button
        label={action.label}
        icon={ICONS[action.icon]}
        disabled={isDisabled(action.target)}
        onPress={() => openTarget(action.target)}
      />
    </HomeFooterBar>
  );
}
