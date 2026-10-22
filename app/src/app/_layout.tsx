import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';

// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useAppStateFocus } from '@/lib/focus-manager';
import { queryClient } from '@/lib/query-client';
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
      <GluestackUIProvider mode={preference}>
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <View className="flex-1 bg-background">
              {/* Phase 3 (3.2): session gate wraps the Stack here */}
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
