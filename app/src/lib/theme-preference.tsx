import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';

/** The user's choice. `system` follows the phone's light/dark setting. */
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

interface ThemePreferenceValue {
  /** What the user picked. */
  preference: ThemePreference;
  /** The theme actually shown, with `system` resolved. */
  resolved: 'light' | 'dark';
  /** True once the saved choice has been read from the device. */
  loaded: boolean;
  /** Changes the theme now and saves the choice on the device. */
  setPreference: (next: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Holds the theme preference for the whole app and saves it with `expo-secure-store`
 * (already in the dev build; AsyncStorage would need a native rebuild for one string).
 * Falls back to `system` when nothing is saved or storage can't be read.
 * Render `GluestackUIProvider` inside it with `mode={preference}`, which also
 * makes `useColorScheme()` report the forced theme (or the phone's for `system`).
 */
export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (active && isThemePreference(saved)) {
          setPreferenceState(saved);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemePreferenceValue>(
    () => ({
      preference,
      resolved: scheme === 'dark' ? 'dark' : 'light',
      loaded,
      setPreference,
    }),
    [preference, scheme, loaded, setPreference],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

/**
 * Reads the theme preference and the resolved theme.
 * @returns `{ preference, resolved, loaded, setPreference }`
 * @throws If used outside `ThemePreferenceProvider`.
 */
export function useThemePreference(): ThemePreferenceValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  }
  return value;
}
