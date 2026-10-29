import { Bell, Check, type LucideIcon } from 'lucide-react-native';

import { Button } from '@/components';
import { useOpenTarget } from '../use-open-target';
import type { HomeActionButtonProps } from '../types';

const ICONS: Record<NonNullable<HomeActionButtonProps['action']['icon']>, LucideIcon> = {
  check: Check,
  bell: Bell,
};

/**
 * A button in an open row or the hero's notice. The server picks the label, look and target; a tap
 * opens the target, and an action that runs in place (Discard on the draft notice) shows its Spinner
 * meanwhile.
 */
export function HomeActionButton({ action }: HomeActionButtonProps) {
  const { openTarget, pending, isDisabled } = useOpenTarget();
  return (
    <Button
      label={action.label}
      variant={action.tone}
      size="small"
      icon={action.icon ? ICONS[action.icon] : undefined}
      loading={pending}
      disabled={isDisabled(action.target)}
      onPress={() => openTarget(action.target)}
      className="flex-1"
    />
  );
}
