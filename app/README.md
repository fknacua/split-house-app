# SplitHouse app

Expo (React Native) Android app, NativeWind, gluestack-ui v5. Never use Expo Go: this app runs in a development build.

## Environment

Set this up before running the app. Copy `.env.example` to `.env.local` (never committed) and fill in the values:

- `EXPO_PUBLIC_BACKEND_URL`: the backend the app sends its requests to. The app throws at launch if it is missing.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: the Google OAuth Web client ID (not the Android one), used by the sign-in screen.

`EXPO_PUBLIC_*` values are baked in at bundle time, so after changing one, restart Metro with `npx expo start --dev-client -c`. A reload is not enough.

## Choosing a backend

`EXPO_PUBLIC_BACKEND_URL` is the only thing that decides which backend the app talks to.

- **Deployed backend:** the `https://` address of the Vercel project.
- **Backend on your computer:** `http://<PC-LAN-IP>:3000`, using your computer's IPv4 address from `ipconfig`. It is not the phone's IP, and `localhost` does not work because on the phone it means the phone itself. The address can change, so check it each session. A stale address shows up as "Sign-in failed".

Running the backend itself is covered in the backend README. When using a backend on your computer, `EXPO_PUBLIC_BACKEND_URL` must hold the same value as the backend's `BETTER_AUTH_URL`; see [Keeping the two env files in sync](../README.md#keeping-the-two-env-files-in-sync).

## Run on a phone (development build, LAN mode)

1. Install the development build APK on the phone once (`eas build --profile development --platform android`, then install the APK). Rebuild only when native dependencies change.
2. Put the phone and the computer on the same Wi-Fi network.
3. From `app/`, start Metro for the dev client:

   ```bash
   npx expo start --dev-client
   ```

4. Open the SplitHouse dev build on the phone. It lists the Metro server on the LAN, or scan the QR code shown in the terminal.

If the phone cannot connect:

- Allow Node.js through Windows Firewall for private networks (the first run asks for this).
- Check that the Wi-Fi network is set to "Private" on Windows and that it has no client isolation (guest networks often do).
- Fallback: `npx expo start --dev-client --tunnel` (slower, works across networks).

## Checks

```bash
npx tsc --noEmit   # about 21 known errors inside src/components/ui/*
npm run lint
```
