import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Alert as NativeAlert, AlertIcon, AlertText } from '@/components/ui/alert';

/** The alert looks: neutral note, caution, blocking problem, or confirmation. */
export type AlertVariant = 'info' | 'warning' | 'danger' | 'success';

/** The default Lucide icon per variant (screen mapping doc). */
const DEFAULT_ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
  success: CircleCheck,
};

/** Danger and warning alerts are announced as alerts; info and success are polite notes. */
const IS_ALERT: Record<AlertVariant, boolean> = {
  info: false,
  warning: true,
  danger: true,
  success: false,
};

/**
 * App alert (screen mapping doc: Alert). A thin wrapper over the native gluestack alert in
 * `ui/alert`: the tint, line and text colours and the 16px radius live there; this file only
 * picks the icon and lays out the optional title, message and actions.
 *
 * @param variant - `info`, `warning`, `danger` or `success`. Defaults to `info`.
 * @param message - The body text.
 * @param title - Optional bold first line above the message.
 * @param icon - Replaces the variant's default Lucide icon, such as `Clock` for "due today".
 * @param children - Optional content under the text, such as Buttons (Continue / Discard).
 * @param className - Extra classes for the outer alert.
 */
export function Alert({
  variant = 'info',
  message,
  title,
  icon,
  children,
  className,
}: {
  variant?: AlertVariant;
  message: string;
  title?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <NativeAlert
      variant={variant}
      className={className}
      accessibilityRole={IS_ALERT[variant] ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <AlertIcon as={icon ?? DEFAULT_ICON[variant]} />
      <View className="flex-1 gap-3">
        <View className="gap-0.5">
          {title ? <AlertText className="font-manrope-extrabold">{title}</AlertText> : null}
          <AlertText className={title ? 'font-manrope-medium' : 'font-manrope-semibold'}>
            {message}
          </AlertText>
        </View>
        {children}
      </View>
    </NativeAlert>
  );
}
