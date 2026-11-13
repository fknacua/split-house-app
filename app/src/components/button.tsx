import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import {
  Button as NativeButton,
  ButtonIcon,
  ButtonSpinner,
  ButtonText,
} from '@/components/ui/button';

/**
 * The button looks: filled (primary, warning like Nudge, danger) and outlined (outline,
 * outline-warning, outline-danger like the Confirm action), plus ghost (no fill or border,
 * like Cancel under a sheet's main action) and ghost-danger (Remove from household).
 */
export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'warning'
  | 'outline-warning'
  | 'danger'
  | 'outline-danger'
  | 'ghost'
  | 'ghost-danger';

/**
 * 48px (`default`), the 44px row-action size (`small`), or 48px with tight sides and the smaller
 * label (`split`), for buttons side by side in a footer.
 */
export type ButtonSize = 'default' | 'small' | 'split';

/** Our variant names to the native button's. Every look itself lives in `ui/button`. */
const NATIVE_VARIANT = {
  primary: 'default',
  outline: 'outline',
  warning: 'warning',
  'outline-warning': 'outline-warning',
  danger: 'destructive',
  'outline-danger': 'outline-destructive',
  ghost: 'ghost',
  'ghost-danger': 'ghost-destructive',
} as const;

const NATIVE_SIZE = { default: 'default', small: 'sm', split: 'split' } as const;

/** An icon-only button is a circle: as wide as the size is tall, with no side padding. */
const ICON_ONLY_SIZE = { default: 'w-12 px-0', small: 'w-11 px-0', split: 'w-12 px-0' } as const;

/**
 * The count badge on the top-right corner. It sits half over the button and half over the page, so
 * it is always the primary fill, with a ring in the page colour that cuts it out of a filled button.
 */
const COUNT_BADGE = {
  enabled: { box: 'bg-primary', text: 'text-on-primary' },
  disabled: { box: 'bg-disabled', text: 'text-on-disabled' },
} as const;

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
 * @param size - `default` (48px), `small` (44px) or `split` (48px, tight sides). Defaults to `default`.
 * @param icon - Optional Lucide icon shown before the label.
 * @param iconAfter - Draws `icon` after the label instead, such as the arrow on Welcome's `Continue: Rent & rooms`.
 * @param iconOnly - Draws only `icon`, as a round button as wide as it is tall (44px or 48px), such as
 * the ✕ that removes a line. `label` is then only read out by screen readers.
 * @param count - A small number in a badge on the top-right corner, such as how many messages are
 * not sent. It overhangs the button's top edge, so leave about 6px above it. Read out with the
 * label; hidden while loading.
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
  iconOnly = false,
  iconAfter = false,
  count,
  loading = false,
  disabled = false,
  className,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconOnly?: boolean;
  iconAfter?: boolean;
  count?: number;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const fadeForLoading = loading && !disabled;
  const showCount = count !== undefined && !iconOnly && !loading;
  const badge = COUNT_BADGE[disabled ? 'disabled' : 'enabled'];

  return (
    <NativeButton
      variant={NATIVE_VARIANT[variant]}
      size={NATIVE_SIZE[size]}
      isDisabled={disabled}
      // Loading is not the native disabled look: it keeps the variant and only ignores input.
      onPress={loading ? undefined : onPress}
      pointerEvents={loading ? 'none' : undefined}
      accessibilityLabel={showCount ? `${label}, ${count}` : label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={[fadeForLoading ? 'opacity-60' : '', iconOnly ? ICON_ONLY_SIZE[size] : '', className].join(' ')}
    >
      {loading ? <ButtonSpinner /> : icon && !iconAfter ? <ButtonIcon as={icon} /> : null}
      {iconOnly ? null : (
        <ButtonText numberOfLines={1} className="shrink">
          {label}
        </ButtonText>
      )}
      {!loading && icon && iconAfter ? <ButtonIcon as={icon} /> : null}
      {showCount ? (
        <View
          className={`absolute -top-1.5 right-2 h-5.5 min-w-5.5 items-center justify-center rounded-full border-2 border-background px-1 ${badge.box}`}
        >
          <Text className={`font-manrope-bold text-caption ${badge.text}`}>{count}</Text>
        </View>
      ) : null}
    </NativeButton>
  );
}
