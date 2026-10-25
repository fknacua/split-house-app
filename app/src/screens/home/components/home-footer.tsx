import { Banknote, FilePen, Upload, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components';
import { openTarget } from '../open-target';
import type { HomeFooterProps } from '../types';
import { HomeFooterBar } from './home-footer-bar';

const ICONS: Record<HomeFooterProps['action']['icon'], LucideIcon> = {
  upload: Upload,
  'file-pen': FilePen,
  banknote: Banknote,
};

/** The sticky button under the content, above the bottom navigation. */
export function HomeFooter({ action }: HomeFooterProps) {
  return (
    <HomeFooterBar>
      <Button label={action.label} icon={ICONS[action.icon]} onPress={() => openTarget(action.target)} />
    </HomeFooterBar>
  );
}
