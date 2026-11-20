import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { Alert, AppSheet, type AppSheetRef } from '@/components';
import { useSendSheet, type SendSheetRequest } from '@/hooks';
import { queryKeys } from '@/lib';
import { ApiRequestError } from '@/lib/api';
import { ShareBillSheet } from '@/sheets/share-bill';
import { ChargesCard } from './components/charges-card';
import { HistoryCard } from './components/history-card';
import { SendFooter } from './components/send-footer';
import { SendMessageCard } from './components/send-message-card';
import { SendMessageSkeleton } from './components/send-message-skeleton';
import { SentCheckDialog } from './components/sent-check-dialog';
import { ToField } from './components/to-field';
import { TotalCard } from './components/total-card';
import type { SendMessageSheetRef } from './types';
import { useWhatsappSend } from './use-whatsapp-send';

const CLOSED: SendSheetRequest = { mode: 'monthly', personId: null, chargeId: null, ticked: null };

/**
 * Send message (`SendMessageV2`), one sheet in two modes: the monthly message, or a nudge about overdue
 * charges. Every string comes from `GET /api/send`; changing the ticks fetches `POST /api/send/preview`,
 * and changing To fetches the new person (nudge mode then ticks their earliest-due charge). Send on
 * WhatsApp opens the chat with the message typed in, and once the app is back the sent check asks
 * whether it went out; only "Yes, it was sent" records it, and the sheet then refetches on the same
 * person. Edit template closes the sheet and opens the template editor; Share bill opens its sheet on
 * top. No Cancel: a swipe down, the scrim or the back gesture close it.
 */
export const SendMessageSheet = forwardRef<SendMessageSheetRef>(function SendMessageSheet(_, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const shareRef = useRef<AppSheetRef>(null);
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [request, setRequest] = useState<SendSheetRequest>(CLOSED);
  // Bumped on each open, so the cards start closed again.
  const [openCount, setOpenCount] = useState(0);
  const query = useSendSheet(request, opened);
  const whatsapp = useWhatsappSend();
  // A sheet from another mode (the last one kept on screen while loading) is never shown.
  const data = query.data?.mode === request.mode ? query.data : undefined;
  // While a new tick set or person loads, the old sheet stays up but can't be sent.
  const stale = query.isPlaceholderData;

  useImperativeHandle(
    ref,
    () => ({
      open: (opening) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.allSendSheets });
        setRequest({
          mode: opening.mode,
          personId: opening.personId ?? null,
          chargeId: opening.chargeId ?? null,
          ticked: null,
        });
        whatsapp.reset();
        setOpenCount((n) => n + 1);
        setOpened(true);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [queryClient, whatsapp]
  );

  const pickPerson = (personId: string) =>
    setRequest((r) => (r.personId === personId ? r : { ...r, personId, chargeId: null, ticked: null }));

  const toggleCharge = (chargeId: string) => {
    const rows = data?.charges?.rows ?? [];
    const ticked = rows.filter((r) => (r.chargeId === chargeId ? !r.ticked : r.ticked)).map((r) => r.chargeId);
    setRequest((r) => ({ ...r, ticked }));
  };

  const editTemplate = () => {
    const target = data?.message?.editTemplate.target;
    if (!target) return;
    sheetRef.current?.close();
    router.push({
      pathname: '/settings/template/[kind]/editor',
      params: target.personId ? { kind: target.template, personId: target.personId } : { kind: target.template },
    });
  };

  const sendTarget = data?.send.target ?? null;

  return (
    <>
      <AppSheet
        ref={sheetRef}
        title={data?.title ?? (request.mode === 'nudge' ? 'Send nudge message' : 'Send message')}
        subtitle={data?.subtitle}
        failed={whatsapp.error !== null}
        failedMessage={whatsapp.error ?? undefined}
        onClose={() => setOpened(false)}
        footer={
          <SendFooter
            note={data?.note ?? null}
            sendLabel={data?.send.label ?? 'Send on WhatsApp'}
            sendDisabled={!sendTarget || stale}
            onSend={() => sendTarget && void whatsapp.send(sendTarget)}
            shareLabel={data?.shareBill.label ?? 'Share bill'}
            shareDisabled={!data?.shareBill.enabled}
            onShare={() => shareRef.current?.open()}
          />
        }
      >
        {/* A refusal (someone no longer in the list) says why; an unreachable server shows the app's prompt. */}
        {query.error instanceof ApiRequestError ? <Alert variant="danger" message={query.error.message} /> : null}
        {!data && !query.error ? <SendMessageSkeleton /> : null}
        {data ? (
          <>
            <ToField to={data.to} value={request.personId} onChange={pickPerson} />
            {data.total ? <TotalCard key={`total-${openCount}`} total={data.total} /> : null}
            {data.charges ? (
              <ChargesCard key={`charges-${openCount}`} charges={data.charges} onToggle={toggleCharge} />
            ) : null}
            {data.history ? <HistoryCard history={data.history} /> : null}
            {data.message ? <SendMessageCard message={data.message} onEditTemplate={editTemplate} /> : null}
          </>
        ) : null}
      </AppSheet>
      {data ? <ShareBillSheet ref={shareRef} month={data.shareBill.target.month} /> : null}
      <SentCheckDialog
        check={whatsapp.check}
        saving={whatsapp.saving}
        error={whatsapp.recordError}
        onConfirm={() => void whatsapp.confirm()}
        onNotYet={whatsapp.notYet}
      />
    </>
  );
});
