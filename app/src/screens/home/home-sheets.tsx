import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { MarkPaidSheet, RecordPaymentSheet } from '@/sheets/mark-paid';
import { PayBillSheet } from '@/sheets/pay-bill';
import { SendMessageSheet, type SendMessageOpening, type SendMessageSheetRef } from '@/sheets/send-message';

/** What Home's rows and footer can open as a sheet. */
interface HomeSheetsValue {
  /** Opens Mark bill paid for the month. */
  openPayBill: (month: string) => void;
  /** Opens Mark paid for one charge. */
  openMarkPaid: (chargeId: string) => void;
  /** Opens Record payment for the month, on the most urgent person and charge. */
  openRecordPayment: (month: string) => void;
  /** Opens Send message: the monthly message, or a nudge with the tapped charge ticked. */
  openSendMessage: (opening: SendMessageOpening) => void;
}

const HomeSheetsContext = createContext<HomeSheetsValue>({
  openPayBill: () => {},
  openMarkPaid: () => {},
  openRecordPayment: () => {},
  openSendMessage: () => {},
});

/**
 * Mounts Home's sheets once and lets any row button or footer open them (`useOpenTarget` reads
 * this). Each screen that offers a sheet mounts its own; this is Home's.
 *
 * @param children - The Home screen.
 */
export function HomeSheetsProvider({ children }: { children: ReactNode }) {
  const payBill = useRef<AppSheetRef>(null);
  const [payBillMonth, setPayBillMonth] = useState<string | null>(null);
  const markPaid = useRef<AppSheetRef>(null);
  const [markPaidChargeId, setMarkPaidChargeId] = useState<string | null>(null);
  const recordPayment = useRef<AppSheetRef>(null);
  const [recordPaymentMonth, setRecordPaymentMonth] = useState<string | null>(null);
  const sendMessage = useRef<SendMessageSheetRef>(null);

  // Each sheet may mount with this render, so it opens once it has.
  const openPayBill = useCallback((month: string) => {
    setPayBillMonth(month);
    requestAnimationFrame(() => payBill.current?.open());
  }, []);
  const openMarkPaid = useCallback((chargeId: string) => {
    setMarkPaidChargeId(chargeId);
    requestAnimationFrame(() => markPaid.current?.open());
  }, []);
  const openRecordPayment = useCallback((month: string) => {
    setRecordPaymentMonth(month);
    requestAnimationFrame(() => recordPayment.current?.open());
  }, []);
  // Always mounted, so the sent check still comes up if the sheet was closed while WhatsApp was open.
  const openSendMessage = useCallback((opening: SendMessageOpening) => sendMessage.current?.open(opening), []);
  const value = useMemo(
    () => ({ openPayBill, openMarkPaid, openRecordPayment, openSendMessage }),
    [openPayBill, openMarkPaid, openRecordPayment, openSendMessage],
  );

  return (
    <HomeSheetsContext.Provider value={value}>
      {children}
      {payBillMonth ? <PayBillSheet ref={payBill} month={payBillMonth} /> : null}
      {markPaidChargeId ? <MarkPaidSheet ref={markPaid} chargeId={markPaidChargeId} /> : null}
      {recordPaymentMonth ? <RecordPaymentSheet ref={recordPayment} month={recordPaymentMonth} /> : null}
      <SendMessageSheet ref={sendMessage} />
    </HomeSheetsContext.Provider>
  );
}

/** Opens Home's sheets. Only inside {@link HomeSheetsProvider}. */
export function useHomeSheets(): HomeSheetsValue {
  return useContext(HomeSheetsContext);
}
