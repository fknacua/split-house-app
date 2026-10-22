import type { LucideIcon } from 'lucide-react-native';

import { Badge as NativeBadge, BadgeIcon, BadgeText } from '@/components/ui/badge';

/**
 * The badge looks, named by tone: `neutral` (default), `primary` ("to do"), `success` (Paid),
 * `warning` (Unpaid), `danger` (Overdue, errors), `info` (Due, Due today, Corrected).
 */
export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * App status badge (screen mapping doc: Badge). A thin wrapper over the native gluestack badge in
 * `ui/badge`: the pill shape and the container colours live there; this file only composes the
 * optional icon and the label.
 *
 * @param label - The badge text, such as "Paid" or "Overdue 2 days".
 * @param variant - The tone. Defaults to `neutral`.
 * @param icon - Optional Lucide icon shown before the label.
 * @param className - Extra classes for the pill.
 */
export function Badge({
  label,
  variant = 'neutral',
  icon,
  className,
}: {
  label: string;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <NativeBadge variant={variant} className={className}>
      {icon ? <BadgeIcon as={icon} /> : null}
      <BadgeText>{label}</BadgeText>
    </NativeBadge>
  );
}
