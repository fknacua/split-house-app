import { useState } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { authClient } from '@/lib/auth-client';
import { SignInView, type SignInState } from './sign-in-view';

export type { SignInState } from './sign-in-view';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

/**
 * Sign in screen with the Google and Better Auth calls wired up.
 *
 * @param sessionEnded - Start in the `ended` state ("Your session ended"), set by the session
 *   gate when a 401 arrives while signed in (step 3.2).
 */
export function SignIn({ sessionEnded = false }: { sessionEnded?: boolean }) {
  const [state, setState] = useState<SignInState>(sessionEnded ? 'ended' : 'out');

  const handleSignIn = async () => {
    setState('signing');
    try {
      await GoogleSignin.hasPlayServices();
      // Clear any remembered Google account so the picker always shows.
      await GoogleSignin.signOut().catch(() => {});
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        setState('out'); // cancelled
        return;
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        setState('failed');
        return;
      }
      const { data, error } = await authClient.signIn.social({
        provider: 'google',
        idToken: { token: idToken },
      });
      // A real sign-in returns the user; anything else (for example an error page that a
      // redirect led to) is a failure even though the request itself did not error.
      const signedIn = typeof data === 'object' && data !== null && 'user' in data;
      if (error || !signedIn) {
        // Forget the Google account so the picker shows again on the next try.
        await GoogleSignin.signOut().catch(() => {});
        // The backend's databaseHooks reject any email but ALLOWED_EMAIL.
        setState(error?.status === 403 ? 'notAllowed' : 'failed');
        return;
      }
      // New phone: end every other session so the old phone stops working (Tech Stack,
      // "Revocation, v1"). If this fails, sign the new session out too rather than leave an
      // old session alive without saying so.
      const { error: revokeError } = await authClient.revokeOtherSessions();
      if (revokeError) {
        await authClient.signOut().catch(() => {});
        await GoogleSignin.signOut().catch(() => {});
        setState('failed');
        return;
      }
      setState('out');
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        setState('out');
        return;
      }
      setState('failed');
    }
  };

  return <SignInView state={state} onSignIn={handleSignIn} />;
}
