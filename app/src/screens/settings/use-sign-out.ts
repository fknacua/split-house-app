import { useState } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useQueryClient } from '@tanstack/react-query';

import { authClient } from '@/lib/auth-client';

/**
 * Signs out: the session, then the cached data, then the Google account, so the next sign-in shows the account
 * picker. The session gate then routes to Sign in.
 *
 * @returns `signOut` to call, and `signingOut` while it runs. Calls while it runs do nothing.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // signOut clears the stored cookie before it calls the server, so a failed call still signs out locally.
      await authClient.signOut().catch(() => {});
      queryClient.clear();
      await GoogleSignin.signOut().catch(() => {});
      authClient.$store.notify('$sessionSignal');
    } finally {
      setSigningOut(false);
    }
  };

  return { signOut, signingOut };
}
