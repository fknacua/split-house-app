import { useRouter } from 'expo-router';
import { Undo } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Alert, Button, Card, ConfirmDialog, Screen, SubpageFooter, SubpageHeader } from '@/components';
import { useDiscardSetupMessages, useMarkSetupStep, useSkipSetupStep } from '@/hooks';
import { MessageRow } from '@/screens/settings/components/message-row';
import type { MessagesPageProps } from '../types';

/**
 * The `FirstRunMessages` board (`empty`, `custom`): Settings' two template rows, each opening its landing page, and
 * the note. `Save` marks the step and goes back to Welcome. `Not now` skips the step (it counts as done) and
 * goes back with no custom template; otherwise it asks first (`Confirm` `skipMessages`), and `Discard templates`
 * discards them, skips the step and goes back. Welcome then shows `allDone`. A failed mark or skip shows above the
 * buttons, as on People; a failed discard shows in the dialog.
 */
export function MessagesPage({ page }: MessagesPageProps) {
  const router = useRouter();
  const mark = useMarkSetupStep();
  const discard = useDiscardSetupMessages();
  const skipStep = useSkipSetupStep();
  const [confirming, setConfirming] = useState(false);
  const dialog = page.skip.confirm;

  const skip = () =>
    dialog ? setConfirming(true) : skipStep.mutate('messages', { onSuccess: () => router.back() });
  const failed = mark.error ?? skipStep.error;
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
        {failed ? <Alert variant="danger" message={failed.message} className="mb-1.5" /> : null}
        <Button
          label={page.save.label}
          loading={mark.isPending}
          disabled={!page.save.enabled || skipStep.isPending}
          onPress={() => mark.mutate('messages', { onSuccess: () => router.back() })}
        />
        <Button
          label={page.skip.label}
          variant="ghost"
          loading={skipStep.isPending}
          disabled={mark.isPending}
          onPress={skip}
        />
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
