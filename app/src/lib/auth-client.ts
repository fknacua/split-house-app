import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

// No secrets here — just the backend's own base URL (per the Account Setup
// Guide: "In the app there are no secrets"). Defaults to the local backend
// for development.
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    expoClient({
      scheme: 'splithouse',
      storagePrefix: 'splithouse',
      storage: SecureStore,
    }),
  ],
});
