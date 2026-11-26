import { Alert, Button, SubpageFooter } from '@/components';
import type { RemindersFooterProps } from '../types';

/**
 * The Reminders page's footer, by permission: `Allow notifications` (the OS dialog) with `Not now` under it before
 * the phone is asked, `Done` once allowed, and `Continue` while blocked. `Not now` and `Continue` skip the step and
 * `Done` marks it; either way Welcome counts it done. While one runs the other buttons are disabled; a failure shows
 * above them.
 */
export function RemindersFooter({
  permission,
  asking,
  pending,
  error,
  onAllow,
  onDone,
  onSkip,
}: RemindersFooterProps) {
  const busy = asking || pending !== null;
  return (
    <SubpageFooter>
      {error ? <Alert variant="danger" message={error} className="mb-1.5" /> : null}
      {permission === 'undetermined' ? (
        <>
          <Button label="Allow notifications" loading={asking} disabled={busy && !asking} onPress={onAllow} />
          <Button
            label="Not now"
            variant="ghost"
            loading={pending === 'skip'}
            disabled={busy && pending !== 'skip'}
            onPress={onSkip}
          />
        </>
      ) : permission === 'granted' ? (
        <Button label="Done" loading={pending === 'mark'} disabled={busy && pending !== 'mark'} onPress={onDone} />
      ) : (
        <Button
          label="Continue"
          loading={pending === 'skip'}
          disabled={busy && pending !== 'skip'}
          onPress={onSkip}
        />
      )}
    </SubpageFooter>
  );
}
