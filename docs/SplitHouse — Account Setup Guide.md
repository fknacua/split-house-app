# SplitHouse — Account Setup Guide

Oct 15, 2026 · @Francis · Draft v0

## Status and purpose

This guide walks through every account and setting you need before the build starts: GitHub, Neon, Google Cloud, Expo/EAS and Vercel. It follows the Tech Stack and Data Model docs. Cloud dashboards change their layouts, so if a button has moved, go by the name of the setting.

Steps marked **[Claude Code]** are done in the project itself during the build, not by hand.

## Names (decided)

They get used in several places, and the package name cannot change later without redoing the Google setup. The app is called SplitHouse.

| Item | Value | Used in |
| --- | --- | --- |
| App name | `SplitHouse` | Google consent screen, app display name |
| Repo name | `split-house-app` | GitHub, Vercel |
| Android package name | `com.splithouse.app` | Expo `app.json`, Google Android client |
| App scheme | `splithouse` | Expo `app.json`, Better Auth trusted origins |
| Vercel project name | `split-house-api` | Gives the URL `split-house-api.vercel.app` |

## Two phases

- **Phase A, now, no code needed:** GitHub, Neon, Google Cloud project and Web client, Expo account.
- **Phase B, after the project is scaffolded:** Vercel project, first Android build, signing key, Google Android client.

## Phase A

Done on Oct 15, 2026: GitHub, Neon, Google Cloud and Expo.

### 1. GitHub (private monorepo)

1. **Keep the project outside OneDrive** (done). OneDrive tries to sync `node_modules` and `.git` and will slow down or break. The repo lives at the project folder.
2. On github.com, create a new repository named `split-house-app`. Choose **Private** and leave "Add a README", `.gitignore` and licence unticked.
3. In VS Code, open the project folder and run these in the terminal:
   ```powershell
   git init -b main
   ```
4. Create a `.gitignore` with at least:
   ```
   node_modules/
   .env
   .env.*
   .next/
   .expo/
   *.keystore
   *.jks
   credentials.json
   ```
5. Commit and push:
   ```powershell
   git add .
   git commit -m "Add docs"
   git remote add origin https://github.com/<your-username>/split-house-app.git
   git push -u origin main
   ```
6. The repo layout is:
   ```
   split-house-app/
     CLAUDE.md
     docs/
     backend/     (Next.js, Prisma, Better Auth)
     app/         (Expo, gluestack)
   ```
   **[Claude Code]** creates `backend/` and `app/`.

### 2. Neon (database)

1. Go to neon.com and sign up (signing in with GitHub is fine).
2. Create a project named `split-house`. Choose the **AWS Singapore** region to be close to you, and the default Postgres version.
3. Neon creates a root branch named `production` (the console default; it is called `main` only when created from the CLI). Create a second branch named `dev` from it: **Branches**, **New branch**, name `dev`, **Auto-delete: Never**, parent `production`, **Branch data and schema**. Use `production` for the deployed app and `dev` for local development, so testing never touches real data. The free plan archives branches that sit inactive, and they wake when used.
4. For each branch, click **Connect** and copy two strings:
   - the **pooled** string (turn the "Connection pooling" toggle on; the host contains `-pooler`). The deployed app uses this one.
   - the **direct** string (toggle off). Prisma migrations use this one.
5. Keep all four strings in your password manager. You will paste them into `.env` files and Vercel later. Never commit them.
6. Free plan facts to know: 1 GB storage, compute sleeps after 5 minutes idle (the first request after that is slow, which the Retry prompt covers), and only a 6-hour restore window. Backups are a separate task (see the end).

### 3. Google Cloud (sign-in)

1. Go to console.cloud.google.com, signed in with the Google account you will use to sign in to the app.
2. Create a new project named `split-house`.
3. Open **Google Auth Platform** (search for it in the top bar) and click **Get started**:
   - **App name:** SplitHouse. **Support email:** your email.
   - **Audience:** External.
   - **Contact email:** your email. Accept the terms and create.
4. Go to **Audience** and keep the publishing status as **Testing**. Under **Test users**, add your own Google account. Only listed accounts can sign in while the app is in Testing, which is a second lock on top of the backend's email check. Google shows a "Google hasn't verified this app" warning the first time. Continue past it.
5. Go to **Clients**, then **Create client**:
   - **Application type:** Web application. **Name:** `SplitHouse backend`.
   - **Authorized redirect URIs:** add `http://localhost:3000/api/auth/callback/google` now. After Vercel exists (Phase B), also add `https://split-house-api.vercel.app/api/auth/callback/google`. These matter only for the browser-based fallback, but they cost nothing.
   - Create, then copy the **Client ID** and **Client secret** into your password manager.
6. The Android client is created in Phase B, after you have the signing key's SHA-1.

### 4. Expo / EAS (app builds)

1. Go to expo.dev and sign up. Note your username.
2. In the VS Code terminal install the CLI and log in:
   ```powershell
   npm install -g eas-cli
   eas login
   ```
3. If `eas login` fails with `self-signed certificate in certificate chain`, your network inspects HTTPS. Run `set NODE_USE_SYSTEM_CA=1` (Command Prompt) or `$env:NODE_USE_SYSTEM_CA=1` (PowerShell) first, and `setx NODE_USE_SYSTEM_CA 1` to make it permanent. Never disable certificate checks.
4. The Expo free plan gives 15 Android builds a month, in a low-priority queue, so a build can wait a while. Plan builds sparingly: a new build is needed only when a native dependency changes, not for normal code changes.

## Phase B (after Claude Code scaffolds `app/` and `backend/`)

### 5. Vercel (backend hosting)

1. In the Vercel dashboard, click **Add New**, then **Project**, and import `split-house-app` from GitHub. Your account is a personal (Hobby) one, so the personal GitHub repo works.
2. Before you deploy, click **Edit** next to **Root Directory** and choose `backend`. Framework preset should detect Next.js.
3. Set the project name to `split-house-api`.
4. Add the environment variables (see the table below) for **Production**.
5. In **Settings, Functions**, set the function region to **Singapore (sin1)** so the backend sits next to Neon. If the region option is not offered on your plan, leave the default and tell me, because it only affects speed.
6. Deploy. The production URL is `https://split-house-api.vercel.app`. Use this URL in the app. Preview deployment URLs are protected by Vercel login by default, so the app should never point at them.
7. Hobby plan notes: personal, non-commercial use only (this fits), 100 deployments a day, and no org-owned repos. Over-limit features pause for 30 days instead of billing you.
8. Optional: every push to `main` builds the backend even when only `app/` changed. That is harmless, so ignore it.

### 6. First Android build and the signing key

1. **[Claude Code]** sets up `eas.json` with a `development` profile (development client, internal distribution, APK) and a `preview` profile (APK), and sets the package name from the table above.
2. You run `eas build -p android --profile development` in `app/`. When EAS asks to generate a keystore, say **yes** and let it generate one.
3. When the build finishes, open the APK link from the build page on your phone, allow installs from your browser, and install.
4. Back up the keystore: run `eas credentials`, choose Android, and use the option to download credentials to `credentials.json`. Store the file and its passwords in your password manager. **Never commit it.** It is in `.gitignore` already.
5. Get the **SHA-1**: in `eas credentials`, view the Android keystore details, which list the SHA-1 fingerprint. If it is not shown, tell me and we will read it from the downloaded keystore instead.
6. What happens if the keystore is lost: a new build with a different key cannot be installed over the old app, and Google sign-in stops working until you add the new SHA-1. Since your data lives on the server, the fix is to uninstall, reinstall and sign in again. So the stakes are low, but back it up anyway.

### 7. Google Android client

1. In Google Auth Platform, **Clients**, **Create client**:
   - **Application type:** Android. **Name:** `SplitHouse Android`.
   - **Package name:** `com.splithouse.app`. **SHA-1:** from step 6.
2. Create. There is nothing to copy from this client. Google matches the app by package name and signing key.
3. The app's sign-in library needs the **Web** client ID (from step 3) as its `webClientId`. The backend verifies ID tokens against that same Web client ID.

## Environment variables

| Variable | Value | Where it goes |
| --- | --- | --- |
| `DATABASE_URL` | Neon **pooled** string | Vercel (Production), `backend/.env` (use the `dev` branch string locally) |
| `DIRECT_URL` | Neon **direct** string | Same places; used for migrations |
| `BETTER_AUTH_SECRET` | A long random string (generate with `openssl rand -base64 32` or a password manager) | Same places; use a different value locally |
| `BETTER_AUTH_URL` | `https://split-house-api.vercel.app` (locally `http://localhost:3000`) | Same places |
| `GOOGLE_CLIENT_ID` | Web client ID | Same places |
| `GOOGLE_CLIENT_SECRET` | Web client secret | Same places |
| `ALLOWED_EMAIL` | Your Google account email | Same places |

In the app there are no secrets. The Web client ID is public and goes in the app config, along with the backend URL. **[Claude Code]** wires all of this.

## Order of operations

1. Decide the names.
2. GitHub: move the folder, create the private repo, push.
3. Neon: project, `dev` branch, four connection strings.
4. Google Cloud: project, consent screen in Testing, test user, Web client.
5. Expo: account and `eas login`.
6. **[Claude Code]** scaffolds `backend/` and `app/` and runs the gluestack spike.
7. Vercel: import, root directory, env vars, region, deploy.
8. EAS development build, install on your phone, back up the keystore, get the SHA-1.
9. Google Android client.
10. **[Claude Code]** connects sign-in end to end.

## Still to do later

- **Backups:** set up a scheduled `pg_dump` and choose where to store it.
- **Phone install:** keep the APK link somewhere easy to reach for a new phone.
