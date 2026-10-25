import { Bell, Check, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components';
import { openTarget } from '../open-target';
import type { HomeActionButtonProps } from '../types';

const ICONS: Record<NonNullable<HomeActionButtonProps['action']['icon']>, LucideIcon> = {
  check: Check,
  bell: Bell,
};

/** A button in an open row or the hero's notice. The server picks the label, look and target; a tap opens the target. */
export function HomeActionButton({ action }: HomeActionButtonProps) {
  return (
    <Button
      label={action.label}
      variant={action.tone}
      size="small"
      icon={action.icon ? ICONS[action.icon] : undefined}
      onPress={() => openTarget(action.target)}
      className="flex-1"
    />
  );
}
