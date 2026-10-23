import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ConnectedButtonGroup } from '@/components';
import { SignInView, type SignInState } from '@/screens/sign-in/sign-in-view';

const SIGN_IN_STATES = [
  { label: 'Out', value: 'out' },
  { label: 'Signing', value: 'signing' },
  { label: 'Failed', value: 'failed' },
  { label: 'No access', value: 'notAllowed' },
  { label: 'Ended', value: 'ended' },
] as const;

/**
 * Dev-only gallery of screen states (plan: working rules, step 5). Absent from release builds.
 * Each screen built from here on adds its states below; the theme toggle is on the test page.
 */
export default function Gallery() {
  const [signIn, setSignIn] = useState<SignInState>('out');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-x-0 bottom-0 z-10 bg-surface p-3">
        <ConnectedButtonGroup
          fit
          label="Sign in state"
          value={signIn}
          onChange={setSignIn}
          options={SIGN_IN_STATES}
        />
      </View>
      <SignInView state={signIn} onSignIn={() => {}} />
    </View>
  );
}
