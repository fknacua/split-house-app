import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { Icon } from './icon';

/**
 * A text button in the primary colour with an optional 16px icon before the label (screen mapping doc: Button, link),
 * such as Edit and Add more beside a section title. It keeps a 48px touch target, with negative margins so it sits
 * in a title row without making it taller.
 *
 * @param label - The text, such as `Edit`.
 * @param onPress - Called on tap. Not called while `disabled`.
 * @param icon - Optional Lucide icon shown before the label.
 * @param disabled - Show the disabled ink and ignore taps.
 */
export function LinkButton({
  label,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  const ink = disabled ? 'text-on-disabled' : 'text-primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="-mx-1 -my-3.5 min-h-12 flex-row items-center gap-1.5 px-1 active:opacity-70"
    >
      {icon ? <Icon as={icon} size={16} className={ink} /> : null}
      <Text className={`font-manrope-bold text-label ${ink}`}>{label}</Text>
    </Pressable>
  );
}
