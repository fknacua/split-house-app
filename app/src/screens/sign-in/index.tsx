import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { authClient } from '@/lib/auth-client';
// eslint-disable-next-line no-restricted-imports -- TODO: replace with a wrapper from src/components
import { Spinner } from '@/components/ui/spinner';

// Needs a real Android OAuth client (package + signing-key SHA-1) to do
// anything on device — blocked until the EAS dev build exists (Account
// Setup Guide Phase B, steps 6-7). Not runtime-verified in this spike.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

type SignInState = 'idle' | 'signing-in' | 'error' | 'not-allowed';

export function SignIn() {
  const [state, setState] = useState<SignInState>('idle');

  const handleSignIn = async () => {
    setState('signing-in');
    try {
      await GoogleSignin.hasPlayServices();
      // Clear any remembered Google account so the picker always shows.
      await GoogleSignin.signOut().catch(() => {});
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        setState('idle'); // cancelled
        return;
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        setState('error');
        return;
      }
      const { error } = await authClient.signIn.social({
        provider: 'google',
        idToken: { token: idToken },
      });
      if (error) {
        // Forget the Google account so the picker shows again on the next try.
        await GoogleSignin.signOut().catch(() => {});
        // The backend's databaseHooks reject any email but ALLOWED_EMAIL.
        setState(error.status === 403 ? 'not-allowed' : 'error');
        return;
      }
      setState('idle');
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        setState('idle');
        return;
      }
      setState('error');
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text className="font-manrope-extrabold text-title text-foreground">
        SplitHouse
      </Text>

      {state === 'signing-in' ? (
        <Spinner />
      ) : (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={handleSignIn}
        />
      )}

      {state === 'error' ? (
        <Text className="font-manrope-medium text-body text-danger">
          Sign-in failed. Try again.
        </Text>
      ) : null}

      {state === 'not-allowed' ? (
        <Text className="font-manrope-medium text-body text-danger">
          This account isn&apos;t allowed to sign in.
        </Text>
      ) : null}
    </View>
  );
}
