import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppSheet, FileCard, RadioCardGroup, SkeletonBlock, SwitchRow, type AppSheetRef } from '@/components';
import { useBill, useShareBill } from '@/hooks';
import { ServerUnreachableError } from '@/lib/api';
import { SummaryPreview } from './components/summary-preview';
import type { ShareBillSheetProps, ShareChoice } from './types';

/** Shown when the share failed for any reason but an unreachable server (the server prompt covers that). */
const SHARE_FAILED = 'Couldn’t share the bill. The PDF didn’t download. Try again.';

/**
 * Share bill (`Share.dc.html`, `pdf` and `summary`), opened from Recipient only. Bill PDF or a
 * Summary; the summary shows the "Include each person's share" Switch above its preview (Francis,
 * 7.10 device review: under it, the Switch moved as the preview grew), off each time the sheet opens. Without a stored PDF the Bill PDF card is disabled and Summary is chosen
 * (agreed with Francis, 2026-10-30). "Choose where to send" opens Android's share sheet (the
 * board's `system` state is Android's own); once it closes, so does this sheet. The text comes
 * from the bill response (`useBill`), so the sheet shows a skeleton until it arrives.
 */
export const ShareBillSheet = forwardRef<AppSheetRef, ShareBillSheetProps>(function ShareBillSheet({ month }, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const share = useBill(month).data?.share ?? null;
  const shareBill = useShareBill(month);
  const [picked, setPicked] = useState<ShareChoice>('pdf');
  const [withShares, setWithShares] = useState(false);
  const choice: ShareChoice = share && !share.file ? 'summary' : picked;
  const summary = share ? (withShares ? share.summaryWithShares : share.summary) : null;

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        shareBill.reset();
        setPicked('pdf');
        setWithShares(false);
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }),
    [shareBill]
  );

  // Awaited rather than a per-call `onSuccess`, which TanStack skips when its observer is not listening.
  const send = async () => {
    if (!share) return;
    try {
      await shareBill.mutateAsync(
        choice === 'pdf' && share.file
          ? { kind: 'pdf', filename: share.file.filename }
          : { kind: 'summary', text: (summary ?? share.summary).text }
      );
    } catch {
      return; // The failed state shows from `shareBill.error`.
    }
    sheetRef.current?.close();
  };

  return (
    <AppSheet
      ref={sheetRef}
      title="Share bill"
      subtitle={share?.title}
      actionLabel="Choose where to send"
      onAction={() => void send()}
      saving={shareBill.isPending}
      failed={shareBill.isError}
      failedMessage={shareBill.error instanceof ServerUnreachableError ? undefined : SHARE_FAILED}
      disabled={!share}
      snapPoint="70%"
    >
      {share ? (
        <>
          <RadioCardGroup
            label="What to share"
            value={choice}
            onChange={setPicked}
            options={[
              {
                value: 'pdf',
                title: 'Bill PDF',
                detail: share.file ? 'The original file uploaded for this month' : 'No PDF saved for this bill',
                disabled: !share.file,
              },
              { value: 'summary', title: 'Summary', detail: 'Extracted values from the month’s bill' },
            ]}
          />
          {choice === 'pdf' && share.file ? (
            <FileCard filename={share.file.filename} meta={share.file.meta} size="large" tone="container" />
          ) : null}
          {choice === 'summary' && summary ? (
            <View className="gap-3">
              {/* Above the preview, so toggling it (which grows the preview) never moves the Switch. */}
              <SwitchRow
                label="Include each person’s share"
                description="Off: whoever gets it only sees the bill totals"
                value={withShares}
                onChange={setWithShares}
              />
              <SummaryPreview summary={summary} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <SkeletonBlock className="h-16 rounded-option" />
          <SkeletonBlock className="h-16 rounded-option" />
          <SkeletonBlock className="h-16 rounded-option" />
        </>
      )}
    </AppSheet>
  );
});
