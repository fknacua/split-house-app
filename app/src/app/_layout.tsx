import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppProvider, ServerUnreachableProvider } from '@/components';
import { useAppFonts } from '@/hooks';
import { useAppStateFocus } from '@/lib/focus-manager';
import { queryClient } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';
import '@/global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootShell />
    </ThemePreferenceProvider>
  );
}

/** The session gate: Sign in without a session, the app with one. */
function SessionStack() {
  const { pending, signedIn } = useSession();
  if (pending) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="__gallery" />
      </Stack.Protected>
    </Stack>
  );
}

function RootShell() {
  const { preference, resolved, loaded: themeLoaded } = useThemePreference();
  const { loaded: fontsLoaded } = useAppFonts();
  useAppStateFocus();

  useEffect(() => {
    if (fontsLoaded && themeLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, themeLoaded]);

  if (!fontsLoaded || !themeLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider mode={preference}>
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <ServerUnreachableProvider>
              <View className="flex-1 bg-background">
                <SessionStack />
              </View>
            </ServerUnreachableProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
