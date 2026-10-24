# SplitHouse

Personal Android app, single user (Francis), to split monthly rent and utilities with housemates and send each person their breakdown on WhatsApp. v1 goes live for the November 2026 cycle.

## Read first (docs/)
- plans/implementation-plan.md: the phased build plan and the per-screen working rules.
- SplitHouse — Data Model.md and Tech Stack.md (Oct 15, 2026): these win over older text elsewhere.
- SplitHouse — gluestack v5 theme and screen mapping.md: the gluestack component for each screen.
- SplitHouse — Design Brief.md: product rules and screens. Its "Decisions made in design" section overrides earlier text in it.
If two docs disagree, stop and ask instead of choosing.

## Layout
- backend/  Next.js route handlers on Vercel, Prisma, Better Auth. Neon Postgres.
- app/      Expo (React Native) Android app, NativeWind, gluestack-ui v5.
- shared/   @splithouse/shared, source-only TypeScript imported by both backend and app (npm workspaces; install once at the repo root). Holds the zod schemas (household config, settings, primitives), the API request/response schemas in `shared/src/api/` with types inferred from them, and the pure helpers (money, month, date). Only pure code: no React, Expo, Node or Prisma imports. Code goes here only if both sides need it or it defines the API contract; helpers that exist for one UI control (for example the money text input parsing in `app/src/lib/money-input.ts`) stay in app/. The split engine is not here: it stays in backend/ only.
- docs/     Design and decision docs.
- assets-old/  Local only, gitignored, never commit. Old spreadsheet, a real utilities bill PDF (sample for testing the bill parser) and the app icon pack. The bill holds personal data: never print its contents into logs, docs or commits, and never copy these files into tracked folders. Copy only the icon pack images you need into app/assets.

## Names
App SplitHouse, repo split-house-app, Android package com.splithouse.app, scheme splithouse, Expo slug split-house-app, Vercel project split-house-api.

## Rules that must hold
- Money is integer cents, SGD, shown with 2 decimals. Every person except Francis is rounded to the nearest cent; Francis gets the remainder.
- Every endpoint's request and response schemas live in `shared/src/api/` and both sides import them. Never redefine an API type in backend/ or app/. Backend tests assert real responses parse with the shared schema.
- One split engine: a pure function in backend/ only. The app never calculates splits; Add charge and Household previews call preview endpoints. Unit tests use the Nov 2026 fixtures in the Data Model doc.
- Household settings are immutable versions with a starts-from month, and an edit must start after the current month (the first setup version is the exception). Charges are created with their amounts stored and are never recalculated. Fix history with correction charges.
- Payments are paid fields on the Charge. No carry-over of short payments.
- WhatsApp: text-only wa.me chats, opened by Francis one at a time. Never send anything automatically. Record when a chat was opened or nudged.
- Online only. When the backend can't be reached, show the blocking "Can't reach the server" prompt with Retry. The free database sleeps after 5 minutes idle, so cold starts are normal.
- Auth: Better Auth, Google sign-in with a native ID token, sessions in Postgres, only ALLOWED_EMAIL may sign in. Keep cookie caching off so revoking a session is immediate.
- UI: token classes only, never hex values. Labels sit above fields (FormControl). Lucide icons, Manrope, light and dark themes, 44px minimum touch targets. gluestack components are copied into the repo. Custom pieces: bottom navigation bar, segmented control, single-select chips.
- Never use Expo Go. Use a development build.
- Secrets: never commit .env files, keystores or credentials.json. Keep a .env.example with names only.

## Public-repo hygiene
This repo may become public as a portfolio piece.
- In code, tests, seed data, comments, commit messages and README, use fictional placeholder names and sample amounts that keep the same roles and rules as the Data Model fixtures. Never real names, phone numbers, addresses, account numbers or real rent figures. The real household lives only in the database.
- The docs in docs/ use role names (Primary tenant, Tenant 1, Tenant 2) and sample amounts; keep real names and figures out of code and other tracked files.
- Never commit anything from assets-old/, .env files, keystores, credentials.json or connection strings.

## Versions
Check current docs before using Expo SDK, gluestack v5, NativeWind, Prisma, Better Auth and Next.js. Don't rely on memory for setup steps or APIs.

## Windows notes
Developer is on Windows using bash as the terminal, on a personal device.

## Setup and spike: done
Scaffolding the backend and app and the gluestack v5 spike are finished (findings in docs/SplitHouse — gluestack v5 spike findings.md). Ignore the old "first tasks" list.

## Build order
Follow docs/plans/implementation-plan.md, phase by phase (Phase 0 to Phase 12), and the working rules (the loop) at the top of that file. Stop for Francis's review after each screen.

## Working agreements
Don't commit or push unless asked. Never stage, commit or push anything in docs/plans/ (local only, and not in .gitignore): when staging, add files by explicit path and skip that folder, and never use `git add -A`, `git add .` or `git commit -a`. Flag any conflict between docs or any decision you want to change before acting on it.

## Code comments
Document exported functions, types and interfaces with JSDoc (`/** ... */`, with `@param`, `@returns` and `@throws` where they apply), not `//` header comments, so the contract shows on hover for consumers. Use `//` only for short inline notes inside a body.
