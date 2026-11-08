import { ArrowRight } from 'lucide-react-native';

import { Alert, Button, SubpageFooter } from '@/components';
import type { WelcomeFooterProps } from '../types';

/**
 * Welcome's fixed footer: the main button with its arrow and, in `optional`, the `Not now` link under it, which skips
 * the optional step. `Finish setup` in `allDone` finishes First run. While a skip or finish runs, its button shows the
 * spinner and the other is disabled; a failure shows above them, and both stay enabled to retry.
 */
export function WelcomeFooter({ primary, secondary, onOpen, pending, error }: WelcomeFooterProps) {
  const isPending = (kind: string): boolean => pending === kind;
  const busy = pending !== null;
  return (
    <SubpageFooter>
      {error ? <Alert variant="danger" message={error} className="mb-1.5" /> : null}
      <Button
        label={primary.label}
        icon={ArrowRight}
        iconAfter
        loading={isPending(primary.target.kind)}
        disabled={busy && !isPending(primary.target.kind)}
        onPress={() => onOpen(primary.target)}
      />
      {secondary ? (
        <Button
          label={secondary.label}
          variant="ghost"
          loading={isPending(secondary.target.kind)}
          disabled={busy && !isPending(secondary.target.kind)}
          onPress={() => onOpen(secondary.target)}
        />
      ) : null}
    </SubpageFooter>
  );
}
