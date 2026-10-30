import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { RecordPaymentSheet } from '@/sheets/mark-paid';

/** What Recipient's buttons can open as a sheet. */
interface RecipientSheetsValue {
  /** Opens Record payment for the month with the person chosen. */
  openRecordPayment: (month: string, personId: string) => void;
}

const RecipientSheetsContext = createContext<RecipientSheetsValue>({
  openRecordPayment: () => {},
});

/**
 * Mounts Recipient's sheets once and lets its footer open them (`useOpenRecipientTarget` reads
 * this). Home mounts its own in `HomeSheetsProvider`.
 *
 * @param children - The Recipient screen.
 */
export function RecipientSheetsProvider({ children }: { children: ReactNode }) {
  const recordPayment = useRef<AppSheetRef>(null);
  const [recordFor, setRecordFor] = useState<{ month: string; personId: string } | null>(null);

  // The sheet may mount with this render, so it opens once it has.
  const openRecordPayment = useCallback((month: string, personId: string) => {
    setRecordFor({ month, personId });
    requestAnimationFrame(() => recordPayment.current?.open());
  }, []);
  const value = useMemo(() => ({ openRecordPayment }), [openRecordPayment]);

  return (
    <RecipientSheetsContext.Provider value={value}>
      {children}
      {recordFor ? (
        <RecordPaymentSheet ref={recordPayment} month={recordFor.month} personId={recordFor.personId} />
      ) : null}
    </RecipientSheetsContext.Provider>
  );
}

/** Opens Recipient's sheets. Only inside {@link RecipientSheetsProvider}. */
export function useRecipientSheets(): RecipientSheetsValue {
  return useContext(RecipientSheetsContext);
}
