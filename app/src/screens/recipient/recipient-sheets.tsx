import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppSheetRef } from '@/components';
import { RecordPaymentSheet } from '@/sheets/mark-paid';
import type { RecipientChargeRow } from '@splithouse/shared';
import { NudgeChargeSheet } from './components/nudge-charge-sheet';

/** What Recipient's buttons can open as a sheet. */
interface RecipientSheetsValue {
  /** Opens Record payment for the month with the person chosen, and the charge when given. */
  openRecordPayment: (month: string, personId: string, chargeId?: string) => void;
  /** Opens Nudge about which charge? with these rows; `onChoose` gets the tapped one once the sheet closes. */
  openChooseNudge: (rows: RecipientChargeRow[], onChoose: (row: RecipientChargeRow) => void) => void;
}

const RecipientSheetsContext = createContext<RecipientSheetsValue>({
  openRecordPayment: () => {},
  openChooseNudge: () => {},
});

/**
 * Mounts Recipient's sheets once and lets its buttons open them (`useOpenRecipientTarget` reads
 * this): Record payment and Nudge about which charge?. Home mounts its own in `HomeSheetsProvider`.
 *
 * @param children - The Recipient screen.
 */
export function RecipientSheetsProvider({ children }: { children: ReactNode }) {
  const recordPayment = useRef<AppSheetRef>(null);
  const chooseNudge = useRef<AppSheetRef>(null);
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
  const value = useMemo(() => ({ openRecordPayment, openChooseNudge }), [openRecordPayment, openChooseNudge]);

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
    </RecipientSheetsContext.Provider>
  );
}

/** Opens Recipient's sheets. Only inside {@link RecipientSheetsProvider}. */
export function useRecipientSheets(): RecipientSheetsValue {
  return useContext(RecipientSheetsContext);
}
