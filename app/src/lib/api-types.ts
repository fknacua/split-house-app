/**
 * Response types for the backend API, hand-synced from the backend zod
 * schemas (the repo has no shared package). Add each endpoint's types here
 * when the endpoint is built; the list lives in backend/README.md.
 */

/** Body of every failed API response: `{ error: { code, message } }`. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

/** `GET /api/me` */
export interface MeResponse {
  email: string;
}

/** One row of the first-run checklist (`SetupStep` in the backend's `setup-progress.ts`). */
export interface SetupStep {
  id: 'rentAndRooms' | 'people' | 'yourSplit' | 'messages' | 'reminders';
  /** Messages and Reminders can be skipped. */
  optional: boolean;
  done: boolean;
}

/** The six notification toggles on Settings (ids as in `Settings.dc.html`). */
export interface NotificationSettings {
  upload: boolean;
  tenant1: boolean;
  savings: boolean;
  paysp: boolean;
  checks: boolean;
  fyi: boolean;
}

/** `GET /api/bootstrap`: what the app needs right after sign-in and on launch. */
export interface BootstrapResponse {
  /** A household version exists; false sends the app to first-run setup. */
  hasHousehold: boolean;
  /** Current billing month, `YYYY-MM`, in Asia/Singapore. */
  currentMonth: string;
  /** The first-run checklist in display order. */
  setupProgress: SetupStep[];
  settings: { notifications: NotificationSettings };
}

/**
 * `GET /api/months/:month/summary`. PLACEHOLDER with only the fields the mock
 * hook returns; step 5.1 replaces it with the full shape from the backend.
 */
export interface MonthSummaryResponse {
  month: string;
  status: 'bill_missing' | 'draft' | 'unsent' | 'collecting' | 'settled';
}
