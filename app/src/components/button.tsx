import type { LucideIcon } from 'lucide-react-native';

import {
  Button as NativeButton,
  ButtonIcon,
  ButtonSpinner,
  ButtonText,
} from '@/components/ui/button';

/**
 * The button looks: filled (primary, warning like Nudge, danger) and outlined (outline,
 * outline-warning, outline-danger like the Confirm action), plus ghost (no fill or border,
 * like Cancel under a sheet's main action).
 */
export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'warning'
  | 'outline-warning'
  | 'danger'
  | 'outline-danger'
  | 'ghost';

/** 48px (`default`) or the 44px row-action size (`small`). */
export type ButtonSize = 'default' | 'small';

/** Our variant names to the native button's. Every look itself lives in `ui/button`. */
const NATIVE_VARIANT = {
  primary: 'default',
  outline: 'outline',
  warning: 'warning',
  'outline-warning': 'outline-warning',
  danger: 'destructive',
  'outline-danger': 'outline-destructive',
  ghost: 'ghost',
} as const;

const NATIVE_SIZE = { default: 'default', small: 'sm' } as const;

/**
 * App button (screen mapping doc: Button). A thin wrapper over the native gluestack button in
 * `ui/button`: it renames props, composes the label, icon and spinner, and adds loading, which
 * the native button doesn't have. The colours, shapes, sizes and the disabled and pressed
 * looks all live in `ui/button`, so swapping the library only means rewriting this file.
 *
 * `loading` keeps the variant's own look, faded, with a Spinner before the label, and ignores
 * taps; pass the in-progress label (for example "Saving").
 *
 * @param label - The button text. Kept as the accessibility label while loading.
 * @param onPress - Called on tap. Not called while `disabled` or `loading`.
 * @param variant - Which look to use. Defaults to `primary`.
 * @param size - `default` (48px) or `small` (44px). Defaults to `default`.
 * @param icon - Optional Lucide icon shown before the label.
 * @param loading - Show the Spinner, fade the button and ignore taps.
 * @param disabled - Show the disabled look and ignore taps.
 * @param className - Extra classes for the outer button, such as `flex-1` or `self-start`.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  loading = false,
  disabled = false,
  className,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const fadeForLoading = loading && !disabled;

  return (
    <NativeButton
      variant={NATIVE_VARIANT[variant]}
      size={NATIVE_SIZE[size]}
      isDisabled={disabled}
      // Loading is not the native disabled look: it keeps the variant and only ignores input.
      onPress={loading ? undefined : onPress}
      pointerEvents={loading ? 'none' : undefined}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={[fadeForLoading ? 'opacity-60' : '', className].join(' ')}
    >
      {loading ? <ButtonSpinner /> : icon ? <ButtonIcon as={icon} /> : null}
      <ButtonText>{label}</ButtonText>
    </NativeButton>
  );
}
