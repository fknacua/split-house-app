# SplitHouse app

Expo (React Native) Android app, NativeWind, gluestack-ui v5. Never use Expo Go: this app runs in a development build.

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

## Environment

Values live in `app/.env.local` (never committed): `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_BACKEND_URL`.

## Point the app at a local backend

`EXPO_PUBLIC_BACKEND_URL` decides which backend the app talks to (Vercel, or your own computer). The phone cannot reach `localhost`, so use the computer's LAN address (`ipconfig`, IPv4 line; it can change).

1. In `app/.env.local`, set `EXPO_PUBLIC_BACKEND_URL=http://<LAN-IP>:3000`. Keep the Vercel value commented out above it.
2. In `backend/.env`, set `BETTER_AUTH_URL=http://<LAN-IP>:3000`, and check `DATABASE_URL` is the Neon dev branch.
3. Start the backend so it listens on the LAN: `cd backend && npm run dev -- -H 0.0.0.0`.
4. Restart Metro with `npx expo start --dev-client -c`. `EXPO_PUBLIC_*` values are baked in at bundle time, so a reload is not enough.

To go back to Vercel, restore the old values and restart Metro the same way.

## Checks

```bash
npx tsc --noEmit   # about 21 known errors inside src/components/ui/*
npm run lint
```
