import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { MarkPaidSheet } from '@/sheets/mark-paid';
import { PayBillSheet } from '@/sheets/pay-bill';

/** What Home's rows and footer can open as a sheet. */
interface HomeSheetsValue {
  /** Opens Mark bill paid for the month. */
  openPayBill: (month: string) => void;
  /** Opens Mark paid for one charge. */
  openMarkPaid: (chargeId: string) => void;
}

const HomeSheetsContext = createContext<HomeSheetsValue>({ openPayBill: () => {}, openMarkPaid: () => {} });

/**
 * Mounts Home's sheets once and lets any row button or footer open them (`useOpenTarget` reads
 * this). Each screen that offers a sheet mounts its own; this is Home's. Record payment joins here
 * later in Phase 7.
 *
 * @param children - The Home screen.
 */
export function HomeSheetsProvider({ children }: { children: ReactNode }) {
  const payBill = useRef<AppSheetRef>(null);
  const [payBillMonth, setPayBillMonth] = useState<string | null>(null);
  const markPaid = useRef<AppSheetRef>(null);
  const [markPaidChargeId, setMarkPaidChargeId] = useState<string | null>(null);

  // Each sheet may mount with this render, so it opens once it has.
  const openPayBill = useCallback((month: string) => {
    setPayBillMonth(month);
    requestAnimationFrame(() => payBill.current?.open());
  }, []);
  const openMarkPaid = useCallback((chargeId: string) => {
    setMarkPaidChargeId(chargeId);
    requestAnimationFrame(() => markPaid.current?.open());
  }, []);
  const value = useMemo(() => ({ openPayBill, openMarkPaid }), [openPayBill, openMarkPaid]);

  return (
    <HomeSheetsContext.Provider value={value}>
      {children}
      {payBillMonth ? <PayBillSheet ref={payBill} month={payBillMonth} /> : null}
      {markPaidChargeId ? <MarkPaidSheet ref={markPaid} chargeId={markPaidChargeId} /> : null}
    </HomeSheetsContext.Provider>
  );
}

/** Opens Home's sheets. Only inside {@link HomeSheetsProvider}. */
export function useHomeSheets(): HomeSheetsValue {
  return useContext(HomeSheetsContext);
}
