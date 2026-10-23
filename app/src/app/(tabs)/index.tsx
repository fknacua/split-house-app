import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Home } from '@/screens/home';

export default function HomeScreen() {
  return (
    <Screen>
      <Home />
      {/* TEMP (plan 0.4a): remove when the session gate exists (3.2) */}
      {__DEV__ ? (
        <View className="absolute bottom-4 right-4 flex-row gap-2">
          <View className="rounded-full bg-primary px-4 py-3">
            <Link href="/sign-in">
              <Text className="font-manrope-bold text-on-primary">Sign in</Text>
            </Link>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
