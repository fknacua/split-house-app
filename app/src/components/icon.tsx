import type { LucideIcon } from 'lucide-react-native';

import { Icon as NativeIcon } from '@/components/ui/icon';

/**
 * App icon: a Lucide icon coloured by a text token class, for icons that are not part of a
 * Button or Alert (those draw their own). A thin wrapper over the native gluestack icon.
 *
 * @param as - The Lucide icon to draw.
 * @param size - Width and height in px. Defaults to 20.
 * @param className - A text colour token such as `text-on-primary`. Defaults to the foreground.
 */
export function Icon({
  as,
  size = 20,
  className,
}: {
  as: LucideIcon;
  size?: number;
  className?: string;
}) {
  return <NativeIcon as={as} size={size} className={className} />;
}
