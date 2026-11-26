import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { AddChargeSheet, type AddChargeSheetRef } from '@/sheets/add-charge';
import { RecordPaymentSheet, type RecordPaymentOpening, type RecordPaymentSheetRef } from '@/sheets/mark-paid';
import { PayBillSheet } from '@/sheets/pay-bill';
import { SendMessageSheet, type SendMessageOpening, type SendMessageSheetRef } from '@/sheets/send-message';

/** What Home's rows and footer can open as a sheet. */
interface HomeSheetsValue {
  /** Opens Add charge for the newest opened month. */
  openAddCharge: () => void;
  /** Opens Mark bill paid for the month. */
  openPayBill: (month: string) => void;
  /** Opens Record payment: with nobody picked (the footer), a row's charge ticked (Mark paid), or a reminder's (Paid). */
  openRecordPayment: (opening?: RecordPaymentOpening) => void;
  /** Opens Send message: the monthly message, or a nudge with the tapped charge ticked. */
  openSendMessage: (opening: SendMessageOpening) => void;
}

const HomeSheetsContext = createContext<HomeSheetsValue>({
  openAddCharge: () => {},
  openPayBill: () => {},
  openRecordPayment: () => {},
  openSendMessage: () => {},
});

/**
 * Mounts Home's sheets once and lets any row button, footer or the header's Add charge open them (`useOpenTarget` reads
 * this). Each screen that offers a sheet mounts its own; this is Home's.
 *
 * @param children - The Home screen.
 */
export function HomeSheetsProvider({ children }: { children: ReactNode }) {
  const payBill = useRef<AppSheetRef>(null);
  const [payBillMonth, setPayBillMonth] = useState<string | null>(null);
  const recordPayment = useRef<RecordPaymentSheetRef>(null);
  const sendMessage = useRef<SendMessageSheetRef>(null);
  const addCharge = useRef<AddChargeSheetRef>(null);

  // Mark bill paid may mount with this render, so it opens once it has.
  const openPayBill = useCallback((month: string) => {
    setPayBillMonth(month);
    requestAnimationFrame(() => payBill.current?.open());
  }, []);
  const openRecordPayment = useCallback((opening?: RecordPaymentOpening) => recordPayment.current?.open(opening), []);
  // Always mounted, so the sent check still comes up if the sheet was closed while WhatsApp was open.
  const openSendMessage = useCallback((opening: SendMessageOpening) => sendMessage.current?.open(opening), []);
  const openAddCharge = useCallback(() => addCharge.current?.open(), []);
  const value = useMemo(
    () => ({ openAddCharge, openPayBill, openRecordPayment, openSendMessage }),
    [openAddCharge, openPayBill, openRecordPayment, openSendMessage],
  );

  return (
    <HomeSheetsContext.Provider value={value}>
      {children}
      {payBillMonth ? <PayBillSheet ref={payBill} month={payBillMonth} /> : null}
      <RecordPaymentSheet ref={recordPayment} />
      <SendMessageSheet ref={sendMessage} />
      <AddChargeSheet ref={addCharge} />
    </HomeSheetsContext.Provider>
  );
}

/** Opens Home's sheets. Only inside {@link HomeSheetsProvider}. */
export function useHomeSheets(): HomeSheetsValue {
  return useContext(HomeSheetsContext);
}
