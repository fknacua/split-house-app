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

/**
 * `GET /api/months/:month/summary`. PLACEHOLDER with only the fields the mock
 * hook returns; step 5.1 replaces it with the full shape from the backend.
 */
export interface MonthSummaryResponse {
  month: string;
  status: 'bill_missing' | 'draft' | 'unsent' | 'collecting' | 'settled';
}
