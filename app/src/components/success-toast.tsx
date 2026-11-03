import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '@/components/alert';

/** How long the toast stays, in milliseconds. */
const TOAST_DURATION_MS = 3000;
/** The toast's gap from the bottom safe area: just above the bottom navigation bar. */
const TOAST_BOTTOM = 88;

const SuccessToastContext = createContext<(message: string) => void>(() => {});

/**
 * Draws the success toast above the app. A plain view on top of the stack, not gluestack's toast, whose
 * overlay crashed on Android when it mounted as a screen closed. Mounted once in the root layout.
 *
 * @param children - The app.
 */
export function SuccessToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <SuccessToastContext.Provider value={show}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          className="absolute left-4 right-4"
          style={{ bottom: TOAST_BOTTOM + insets.bottom }}
        >
          <Alert variant="success" message={message} />
        </View>
      ) : null}
    </SuccessToastContext.Provider>
  );
}

/**
 * A short confirmation above the bottom navigation bar, drawn as a success Alert. It stays up across a
 * navigation, so a screen can show it as it leaves.
 *
 * @returns A function taking the message to show.
 */
export function useSuccessToast() {
  return useContext(SuccessToastContext);
}
