import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!backendUrl) {
  throw new Error('EXPO_PUBLIC_BACKEND_URL is required (see app/README.md)');
}

/**
 * Base URL of the backend, shared with the API client. No secrets here, just
 * the backend's own URL (per the Account Setup Guide: "In the app there are
 * no secrets"). There is no fallback, so a missing value fails loudly instead
 * of shipping a localhost address.
 */
export const BACKEND_URL = backendUrl;

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
