import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { EditPaymentSheet, RecordPaymentSheet } from '@/sheets/mark-paid';
import { ShareBillSheet } from '@/sheets/share-bill';
import type { RecipientChargeRow, RecipientPaidCharge } from '@splithouse/shared';
import { NudgeChargeSheet } from './components/nudge-charge-sheet';

/** What Recipient's buttons can open as a sheet. */
interface RecipientSheetsValue {
  /** Opens Record payment for the month with the person chosen, and the charge when given. */
  openRecordPayment: (month: string, personId: string, chargeId?: string) => void;
  /** Opens Nudge about which charge? with these rows; `onChoose` gets the tapped one once the sheet closes. */
  openChooseNudge: (rows: RecipientChargeRow[], onChoose: (row: RecipientChargeRow) => void) => void;
  /** Opens Edit payment on the charge, with the person's paid charges in its For list. */
  openEditPayment: (chargeId: string, charges: RecipientPaidCharge[]) => void;
  /** Opens Share bill for the month's bill. */
  openShareBill: (month: string) => void;
}

const RecipientSheetsContext = createContext<RecipientSheetsValue>({
  openRecordPayment: () => {},
  openChooseNudge: () => {},
  openEditPayment: () => {},
  openShareBill: () => {},
});

/**
 * Mounts Recipient's sheets once and lets its buttons open them (`useOpenRecipientTarget` reads
 * this): Record payment, Nudge about which charge?, Edit payment and Share bill. Home mounts
 * its own in `HomeSheetsProvider`.
 *
 * @param children - The Recipient screen.
 */
export function RecipientSheetsProvider({ children }: { children: ReactNode }) {
  const recordPayment = useRef<AppSheetRef>(null);
  const chooseNudge = useRef<AppSheetRef>(null);
  const editPayment = useRef<AppSheetRef>(null);
  const shareBill = useRef<AppSheetRef>(null);
  const [shareMonth, setShareMonth] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<{ chargeId: string; charges: RecipientPaidCharge[] } | null>(null);
  const [recordFor, setRecordFor] = useState<{ month: string; personId: string; chargeId?: string } | null>(null);
  const [nudgeChoice, setNudgeChoice] = useState<{
    rows: RecipientChargeRow[];
    onChoose: (row: RecipientChargeRow) => void;
  } | null>(null);

  // The sheet may mount with this render, so it opens once it has.
  const openRecordPayment = useCallback((month: string, personId: string, chargeId?: string) => {
    setRecordFor({ month, personId, chargeId });
    requestAnimationFrame(() => recordPayment.current?.open());
  }, []);
  const openChooseNudge = useCallback(
    (rows: RecipientChargeRow[], onChoose: (row: RecipientChargeRow) => void) => {
      setNudgeChoice({ rows, onChoose });
      requestAnimationFrame(() => chooseNudge.current?.open());
    },
    []
  );
  const openEditPayment = useCallback((chargeId: string, charges: RecipientPaidCharge[]) => {
    setEditFor({ chargeId, charges });
    requestAnimationFrame(() => editPayment.current?.open());
  }, []);
  const openShareBill = useCallback((month: string) => {
    setShareMonth(month);
    requestAnimationFrame(() => shareBill.current?.open());
  }, []);
  const value = useMemo(
    () => ({ openRecordPayment, openChooseNudge, openEditPayment, openShareBill }),
    [openRecordPayment, openChooseNudge, openEditPayment, openShareBill]
  );

  return (
    <RecipientSheetsContext.Provider value={value}>
      {children}
      {recordFor ? (
        <RecordPaymentSheet
          ref={recordPayment}
          month={recordFor.month}
          personId={recordFor.personId}
          chargeId={recordFor.chargeId}
        />
      ) : null}
      {nudgeChoice ? (
        <NudgeChargeSheet
          ref={chooseNudge}
          rows={nudgeChoice.rows}
          onChoose={(row) => {
            chooseNudge.current?.close();
            nudgeChoice.onChoose(row);
          }}
        />
      ) : null}
      {editFor ? <EditPaymentSheet ref={editPayment} chargeId={editFor.chargeId} charges={editFor.charges} /> : null}
      {shareMonth ? <ShareBillSheet ref={shareBill} month={shareMonth} /> : null}
    </RecipientSheetsContext.Provider>
  );
}

/** Opens Recipient's sheets. Only inside {@link RecipientSheetsProvider}. */
export function useRecipientSheets(): RecipientSheetsValue {
  return useContext(RecipientSheetsContext);
}
