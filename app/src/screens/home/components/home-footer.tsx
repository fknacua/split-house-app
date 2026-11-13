import { Banknote, Check, FilePen, Send, Upload, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components';
import { useOpenTarget } from '../use-open-target';
import type { HomeFooterProps } from '../types';
import { HomeFooterBar } from './home-footer-bar';

const ICONS: Record<HomeFooterProps['buttons'][number]['icon'], LucideIcon> = {
  upload: Upload,
  'file-pen': FilePen,
  send: Send,
  banknote: Banknote,
  check: Check,
};

/**
 * The sticky button under the content, above the bottom navigation. Shows the first of the
 * footer's buttons for now; the side-by-side buttons with their counts come in 12A.2.
 */
export function HomeFooter({ buttons }: HomeFooterProps) {
  const { openTarget, isDisabled } = useOpenTarget();
  const [button] = buttons;
  return (
    <HomeFooterBar>
      <Button
        label={button.label}
        icon={ICONS[button.icon]}
        disabled={isDisabled(button.target)}
        onPress={() => openTarget(button.target)}
      />
    </HomeFooterBar>
  );
}
