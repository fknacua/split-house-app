import { useRouter } from 'expo-router';
import { Undo } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Alert, Button, Card, ConfirmDialog, Screen, SubpageFooter, SubpageHeader } from '@/components';
import { useDiscardSetupMessages, useMarkSetupStep } from '@/hooks';
import { MessageRow } from '@/screens/settings/components/message-row';
import type { MessagesPageProps } from '../types';

/**
 * The `FirstRunMessages` board (`empty`, `custom`): Settings' two template rows, each opening its landing page, and
 * the note. `Save` marks the step and goes back to Welcome. `Not now` goes straight back with no custom template;
 * otherwise it asks first (`Confirm` `skipMessages`), and `Discard templates` discards them, un-marks the step and goes
 * back. A failed mark shows above Save, as on People; a failed discard shows in the dialog.
 */
export function MessagesPage({ page }: MessagesPageProps) {
  const router = useRouter();
  const mark = useMarkSetupStep();
  const discard = useDiscardSetupMessages();
  const [confirming, setConfirming] = useState(false);
  const dialog = page.skip.confirm;

  const skip = () => (dialog ? setConfirming(true) : router.back());
  const discardAndLeave = () =>
    discard.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        router.back();
      },
    });
  const closeDialog = () => {
    setConfirming(false);
    discard.reset();
  };

  return (
    <Screen>
      <SubpageHeader title={page.title} subtitle={page.sub} />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-4 pt-2">
        <Card padded={false}>
          {page.rows.map((row, i) => (
            <MessageRow key={row.kind} row={row} separated={i > 0} />
          ))}
        </Card>
        <Text className="mx-1 font-manrope-semibold text-caption text-on-surface-variant">{page.note}</Text>
      </ScrollView>
      <SubpageFooter>
        {mark.error ? <Alert variant="danger" message={mark.error.message} className="mb-1.5" /> : null}
        <Button
          label={page.save.label}
          loading={mark.isPending}
          disabled={!page.save.enabled}
          onPress={() => mark.mutate('messages', { onSuccess: () => router.back() })}
        />
        <Button label={page.skip.label} variant="ghost" disabled={mark.isPending} onPress={skip} />
      </SubpageFooter>
      {dialog ? (
        <ConfirmDialog
          open={confirming}
          icon={Undo}
          title={dialog.title}
          body={dialog.body}
          cancelLabel={dialog.cancelLabel}
          onCancel={closeDialog}
          confirmLabel={dialog.confirmLabel}
          onConfirm={discardAndLeave}
          loading={discard.isPending}
          error={discard.error?.message}
        />
      ) : null}
    </Screen>
  );
}
