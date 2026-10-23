import { Spinner as NativeSpinner } from '@/components/ui/spinner';

/**
 * App spinner (screen mapping doc: Spinner), for a wait that has no layout of its own, such as
 * "Reading your bill". Buttons show their own spinner through `loading`. A thin wrapper over the
 * native gluestack spinner in `ui/spinner`, tinted with the primary colour.
 *
 * @param size - `small` (default) or `large`.
 * @param accessibilityLabel - What is loading, read out by screen readers. Defaults to "Loading".
 * @param className - Extra classes, such as a colour override.
 */
export function Spinner({
  size = 'small',
  accessibilityLabel = 'Loading',
  className,
}: {
  size?: 'small' | 'large';
  accessibilityLabel?: string;
  className?: string;
}) {
  return (
    <NativeSpinner
      size={size}
      aria-label={accessibilityLabel}
      className={className ?? 'text-primary'}
    />
  );
}
