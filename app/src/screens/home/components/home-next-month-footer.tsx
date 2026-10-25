import { useState } from 'react';
import { CalendarPlus, Lock } from 'lucide-react-native';

import { Button, ConfirmDialog } from '@/components';
import { useStartNextMonth } from '@/hooks';
import { ServerUnreachableError } from '@/lib/api';
import type { HomeNextMonthFooterProps } from '../types';
import { HomeFooterBar } from './home-footer-bar';

/**
 * The settled month's bottom bar: Start next month, and the Close dialog it opens. Confirm calls
 * the backend and keeps the dialog open, with a spinner, until Home has refetched the new month
 * (this bar then goes away). A failed close keeps the dialog open with the error inside it, so
 * Confirm can be tapped again. A network failure closes the dialog instead, so the app's "Can't
 * reach the server" prompt is not drawn over it.
 */
export function HomeNextMonthFooter({ action }: HomeNextMonthFooterProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending, error, reset } = useStartNextMonth();

  const confirm = () =>
    mutate(undefined, {
      onError: (e) => {
        if (e instanceof ServerUnreachableError) setOpen(false);
      },
    });

  return (
    <HomeFooterBar>
      <Button
        label={action.label}
        icon={CalendarPlus}
        onPress={() => {
          reset();
          setOpen(true);
        }}
      />
      <ConfirmDialog
        open={open}
        icon={Lock}
        title={action.dialog.title}
        body={action.dialog.body}
        items={action.dialog.items}
        onCancel={() => setOpen(false)}
        confirmLabel="Confirm"
        onConfirm={confirm}
        loading={isPending}
        error={error && !(error instanceof ServerUnreachableError) ? error.message : undefined}
      />
    </HomeFooterBar>
  );
}
