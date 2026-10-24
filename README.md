# split-house-app
A personal Android app to split rent and utils expenses for my household

## Layout

- [backend/](backend/README.md): Next.js route handlers on Vercel, Prisma, Better Auth, Neon Postgres.
- [app/](app/README.md): Expo (React Native) Android app, NativeWind, gluestack-ui v5. Runs in a development build, never Expo Go.
- shared/: `@splithouse/shared`, the zod schemas, API response types and pure helpers (money, month, date) used by both the backend and the app. Source-only TypeScript, no build step.
- docs/: design and decision docs.

## Installing

The repo is an npm workspaces monorepo (`backend`, `app`, `shared`). Run `npm install` once at the repo root; there is a single `package-lock.json` there. Root scripts `npm run test`, `typecheck` and `lint` run in every workspace. Run EAS and Expo commands from `app/`.

## Running it

Each folder's README has its own setup and run steps. Set up the backend first if you are testing local backend changes, then the app.

1. [Backend README](backend/README.md): create `backend/.env` and start the server.
2. [App README](app/README.md): create `app/.env.local` and start Metro for the development build on the phone.

## Keeping the two env files in sync

The app and the backend each hold the address of the backend, and the two must agree. `EXPO_PUBLIC_BACKEND_URL` is where the app sends its requests, and `BETTER_AUTH_URL` is the address the backend believes it is served from.

| Testing against | `EXPO_PUBLIC_BACKEND_URL` (`app/.env.local`) | `BETTER_AUTH_URL` |
|---|---|---|
| Backend on your computer | `http://<PC-LAN-IP>:3000` | The same value, in `backend/.env` |
| Deployed backend | The Vercel project's `https://` address | The same value, set in the Vercel project. Your local `backend/.env` is not used. |

- `<PC-LAN-IP>` is your computer's IPv4 address from `ipconfig`. It is never the phone's IP, and `localhost` does not work because on the phone it means the phone itself.
- The LAN address can change between sessions. If sign-in fails with no code change, check that the two files still match.
- After changing `EXPO_PUBLIC_BACKEND_URL`, restart Metro with `npx expo start --dev-client -c`.
