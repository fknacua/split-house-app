import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, Check, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, DEFAULT_FAILED_MESSAGE, SubpageFooter } from '@/components';
import { useDeleteCorrection } from '@/hooks';
import { queryKeys } from '@/lib';
import { ApiRequestError } from '@/lib/api';
import { AddChargeSheet, type AddChargeSheetRef } from '@/sheets/add-charge';
import { EditPaymentSheet, type EditPaymentSheetRef } from '@/sheets/edit-payment';
import { RecordPaymentSheet, type RecordPaymentSheetRef } from '@/sheets/mark-paid';
import { SendMessageSheet, type SendMessageSheetRef } from '@/sheets/send-message';
import type { HomeTarget } from '@splithouse/shared';
import type { ChargeDetailsFooterProps } from '../types';
import { DeleteCorrectionDialog } from './delete-correction-dialog';

const ICONS = { check: Check, bell: Bell, pencil: Pencil, plus: Plus, trash: Trash2 } as const;

/** The backend's own message, when it sent one; the default text covers an unreachable server. */
const messageOf = (error: Error | null) => (error instanceof ApiRequestError ? error.message : undefined);

/**
 * The sticky footer, as the server sends it: Nudge or Nudge again above Mark paid on an unpaid charge,
 * Edit payment on a paid one with Add correction under it when it can be corrected, and Delete correction
 * last on a correction. Mark paid opens Record payment with this charge ticked; Nudge opens the nudge
 * sheet for the payer with this charge ticked; Edit payment opens its sheet for this charge; Add
 * correction opens the Add charge sheet as `Add correction` on it. Delete correction asks first
 * (`Delete this correction?`), then deletes while the dialog shows its spinner and goes back, since the
 * page's charge is gone; a failure stays in the dialog. After a save, a removed payment or a recorded
 * nudge the page refetches in place.
 */
export function ChargeDetailsFooter({ actions, chargeId, deleteCorrection }: ChargeDetailsFooterProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const recordPayment = useRef<RecordPaymentSheetRef>(null);
  const sendMessage = useRef<SendMessageSheetRef>(null);
  const editPayment = useRef<EditPaymentSheetRef>(null);
  const addCharge = useRef<AddChargeSheetRef>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const remove = useDeleteCorrection(chargeId);

  const openTarget = (target: HomeTarget) => {
    switch (target.kind) {
      case 'mark-paid':
        recordPayment.current?.open({ chargeIds: target.chargeIds });
        return;
      case 'send-nudge':
        sendMessage.current?.open({ mode: 'nudge', personId: target.personId, chargeIds: target.chargeIds });
        return;
      case 'edit-payment':
        editPayment.current?.open(target.chargeId);
        return;
      case 'add-correction':
        addCharge.current?.open(target.chargeId);
        return;
      case 'delete-correction':
        remove.reset();
        setDeleteOpen(true);
        return;
      default:
        // Charge details sends nothing else.
        return;
    }
  };

  const confirmDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        setDeleteOpen(false);
        if (router.canGoBack()) router.back();
        queryClient.removeQueries({ queryKey: queryKeys.chargeDetails(chargeId) });
      },
    });

  return (
    <>
      <SubpageFooter>
        <View className="gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant={action.tone}
              icon={action.icon ? ICONS[action.icon] : undefined}
              onPress={() => openTarget(action.target)}
            />
          ))}
        </View>
      </SubpageFooter>
      <RecordPaymentSheet ref={recordPayment} />
      <SendMessageSheet ref={sendMessage} />
      <EditPaymentSheet ref={editPayment} />
      <AddChargeSheet ref={addCharge} />
      {deleteCorrection ? (
        <DeleteCorrectionDialog
          open={deleteOpen}
          confirm={deleteCorrection}
          deleting={remove.isPending}
          error={remove.isError ? (messageOf(remove.error) ?? DEFAULT_FAILED_MESSAGE) : undefined}
          onKeep={() => setDeleteOpen(false)}
          onDelete={confirmDelete}
        />
      ) : null}
    </>
  );
}
