import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { MarkPaidSheet, RecordPaymentSheet } from '@/sheets/mark-paid';
import { PayBillSheet } from '@/sheets/pay-bill';

/** What Home's rows and footer can open as a sheet. */
interface HomeSheetsValue {
  /** Opens Mark bill paid for the month. */
  openPayBill: (month: string) => void;
  /** Opens Mark paid for one charge. */
  openMarkPaid: (chargeId: string) => void;
  /** Opens Record payment for the month, on the most urgent person and charge. */
  openRecordPayment: (month: string) => void;
}

const HomeSheetsContext = createContext<HomeSheetsValue>({
  openPayBill: () => {},
  openMarkPaid: () => {},
  openRecordPayment: () => {},
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
  const value = useMemo(
    () => ({ openPayBill, openMarkPaid, openRecordPayment }),
    [openPayBill, openMarkPaid, openRecordPayment],
  );

  return (
    <HomeSheetsContext.Provider value={value}>
      {children}
      {payBillMonth ? <PayBillSheet ref={payBill} month={payBillMonth} /> : null}
      {markPaidChargeId ? <MarkPaidSheet ref={markPaid} chargeId={markPaidChargeId} /> : null}
      {recordPaymentMonth ? <RecordPaymentSheet ref={recordPayment} month={recordPaymentMonth} /> : null}
    </HomeSheetsContext.Provider>
  );
}

/** Opens Home's sheets. Only inside {@link HomeSheetsProvider}. */
export function useHomeSheets(): HomeSheetsValue {
  return useContext(HomeSheetsContext);
}
