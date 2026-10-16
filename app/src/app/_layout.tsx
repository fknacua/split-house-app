import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAppFonts } from '@/hooks/use-app-fonts';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loaded: fontsLoaded } = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
      <Stack screenOptions={{ headerShown: false }} />
    </GluestackUIProvider>
  );
}
