import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { Alert, GoogleButton, Screen } from '@/components';

// The animated app icon (squircle) replaces the design's house glyph tile (Francis's call).
const APP_ICON = require('../../../assets/images/app-icon/splithouse-squircle-loop.webp');

/** The five sign-in states in `SignIn.dc.html`. */
export type SignInState = 'out' | 'signing' | 'failed' | 'notAllowed' | 'ended';

/**
 * Sign in screen content for a given state. Pure view: the container in `./index` owns the
 * Google and Better Auth calls.
 *
 * @param state - Which of the five states to show. Defaults to `out`.
 * @param onSignIn - Called when the Google button is tapped.
 */
export function SignInView({
  state = 'out',
  onSignIn,
}: {
  state?: SignInState;
  onSignIn?: () => void;
}) {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-8 px-6 pb-7">
        <View className="items-start gap-4">
          <Image
            source={APP_ICON}
            style={{ width: 64, height: 64 }}
            accessibilityElementsHidden
          />
          <Text className="font-manrope-extrabold text-title text-on-surface">SplitHouse</Text>
          <Text className="font-manrope-medium text-body text-on-surface-variant">
            Sign in with your Google account to see this month’s rent and utilities.
          </Text>
        </View>

        <View className="gap-4">
          {state === 'ended' ? (
            <Alert variant="info" message="Your session ended, sign in again." />
          ) : null}
          {state === 'failed' ? (
            <Alert
              variant="danger"
              title="Couldn’t sign in"
              message="Something went wrong reaching Google. Try again."
            />
          ) : null}
          {state === 'notAllowed' ? (
            <Alert
              variant="danger"
              title="This account can’t use the app"
              message="That Google account isn’t set up for this app. Sign in with a different Google account."
            />
          ) : null}

          <GoogleButton onPress={onSignIn} loading={state === 'signing'} />

          {state === 'notAllowed' ? (
            <Text className="text-center font-manrope-medium text-caption text-on-surface-variant">
              Only one Google account is allowed to sign in.
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
