import { ArrowRight } from 'lucide-react-native';

import { Alert, Button, SubpageFooter } from '@/components';
import type { WelcomeFooterProps } from '../types';

/**
 * Welcome's fixed footer: the main button with its arrow and, in `optional`, the `Not now` link under it. Only one of
 * them finishes at a time (`Not now` in `optional`, `Finish setup` in `allDone`): while it runs it shows the spinner
 * and the other is disabled. A failed finish shows above them, and both stay enabled to retry.
 */
export function WelcomeFooter({ primary, secondary, onOpen, finishing, error }: WelcomeFooterProps) {
  const finishes = (kind: string): boolean => finishing && kind === 'finish';
  return (
    <SubpageFooter>
      {error ? <Alert variant="danger" message={error} className="mb-1.5" /> : null}
      <Button
        label={primary.label}
        icon={ArrowRight}
        iconAfter
        loading={finishes(primary.target.kind)}
        disabled={finishing && primary.target.kind !== 'finish'}
        onPress={() => onOpen(primary.target)}
      />
      {secondary ? (
        <Button
          label={secondary.label}
          variant="ghost"
          loading={finishes(secondary.target.kind)}
          disabled={finishing && secondary.target.kind !== 'finish'}
          onPress={() => onOpen(secondary.target)}
        />
      ) : null}
    </SubpageFooter>
  );
}
