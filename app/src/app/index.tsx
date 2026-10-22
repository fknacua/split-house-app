import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Home } from '@/screens/home';

export default function HomeScreen() {
  return (
    <View className="flex-1">
      <Home />
      {/* TEMP (plan 0.4a): remove when the session gate exists (3.2) */}
      {__DEV__ ? (
        <View className="absolute bottom-28 right-4 flex-row gap-2">
          {/* TEMP (plan 2.3): remove when the bottom nav test item exists (2.13) */}
          <View className="rounded-full bg-primary px-4 py-3">
            <Link href="/__components">
              <Text className="font-manrope-bold text-on-primary">Test page</Text>
            </Link>
          </View>
          <View className="rounded-full bg-primary px-4 py-3">
            <Link href="/sign-in">
              <Text className="font-manrope-bold text-on-primary">Sign in</Text>
            </Link>
          </View>
        </View>
      ) : null}
    </View>
  );
}
