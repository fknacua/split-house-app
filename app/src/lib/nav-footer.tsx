import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

interface NavFooterValue {
  /** A sticky footer sits directly above the bottom navigation. */
  shown: boolean;
  setShown: (shown: boolean) => void;
}

const NavFooterContext = createContext<NavFooterValue>({ shown: false, setShown: () => {} });

/**
 * Tells the bottom navigation whether a screen's sticky footer sits right above it. The design
 * drops the navigation's own shadow then, since the footer already casts one. Mount it around the
 * tab navigator.
 */
export function NavFooterProvider({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  const value = useMemo(() => ({ shown, setShown }), [shown]);
  return <NavFooterContext.Provider value={value}>{children}</NavFooterContext.Provider>;
}

/** Whether a sticky footer is showing above the bottom navigation. Read by the navigation bar. */
export function useNavFooterShown(): boolean {
  return useContext(NavFooterContext).shown;
}

/**
 * Call from a sticky footer. Reports it to the navigation while its tab is focused, and stops when
 * the tab loses focus or the footer unmounts, so another tab's navigation keeps its shadow.
 */
export function useReportNavFooter(): void {
  const { setShown } = useContext(NavFooterContext);
  useFocusEffect(
    useCallback(() => {
      setShown(true);
      return () => setShown(false);
    }, [setShown]),
  );
}
