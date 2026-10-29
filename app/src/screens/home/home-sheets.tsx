import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { PayBillSheet } from '@/sheets/pay-bill';

/** What Home's rows and footer can open as a sheet. */
interface HomeSheetsValue {
  /** Opens Mark bill paid for the month. */
  openPayBill: (month: string) => void;
}

const HomeSheetsContext = createContext<HomeSheetsValue>({ openPayBill: () => {} });

/**
 * Mounts Home's sheets once and lets any row button or footer open them (`useOpenTarget` reads
 * this). Each screen that offers a sheet mounts its own; this is Home's. Mark paid and Record
 * payment join here in Phase 7.
 *
 * @param children - The Home screen.
 */
export function HomeSheetsProvider({ children }: { children: ReactNode }) {
  const payBill = useRef<AppSheetRef>(null);
  const [payBillMonth, setPayBillMonth] = useState<string | null>(null);

  const openPayBill = useCallback((month: string) => {
    setPayBillMonth(month);
    // The sheet may mount with this render, so open it once it has.
    requestAnimationFrame(() => payBill.current?.open());
  }, []);
  const value = useMemo(() => ({ openPayBill }), [openPayBill]);

  return (
    <HomeSheetsContext.Provider value={value}>
      {children}
      {payBillMonth ? <PayBillSheet ref={payBill} month={payBillMonth} /> : null}
    </HomeSheetsContext.Provider>
  );
}

/** Opens Home's sheets. Only inside {@link HomeSheetsProvider}. */
export function useHomeSheets(): HomeSheetsValue {
  return useContext(HomeSheetsContext);
}
