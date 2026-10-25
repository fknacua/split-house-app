import { Check, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components';
import { openTarget } from '../open-target';
import type { HomeActionButtonProps } from '../types';

const ICONS: Record<HomeActionButtonProps['action']['icon'], LucideIcon> = {
  check: Check,
};

/** A button in an open row. The server picks the label, look and target; a tap opens the target. */
export function HomeActionButton({ action }: HomeActionButtonProps) {
  return (
    <Button
      label={action.label}
      variant={action.tone}
      size="small"
      icon={ICONS[action.icon]}
      onPress={() => openTarget(action.target)}
      className="flex-1"
    />
  );
}
