import type { ReactNode } from 'react';

import { Card as NativeCard } from '@/components/ui/card';

/**
 * App card (screen mapping doc: Card). A thin wrapper over the native gluestack card in
 * `ui/card`: the surface fill, 20px radius and clipped corners live there. The card is flat, so
 * rows inside it get their separators from the caller.
 *
 * @param padded - `true` (default) adds 16px padding and a 12px gap for free-form content; `false`
 * removes both, for a list of rows that carry their own padding.
 * @param children - The card content.
 * @param className - Extra classes for the card.
 */
export function Card({
  padded = true,
  children,
  className,
}: {
  padded?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <NativeCard size={padded ? 'default' : 'none'} className={className}>
      {children}
    </NativeCard>
  );
}
