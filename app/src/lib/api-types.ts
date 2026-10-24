/**
 * Response types for endpoints whose shared schema does not exist yet. Real
 * response schemas live in `shared/src/api/` (`@splithouse/shared`), written
 * when the endpoint is built; the endpoint list is in backend/README.md.
 */

/**
 * `GET /api/months/:month/summary`. PLACEHOLDER with only the fields the mock
 * hook returns; step 5.1 replaces it with the shared schema.
 */
export interface MonthSummaryResponse {
  month: string;
  status: 'bill_missing' | 'draft' | 'unsent' | 'collecting' | 'settled';
}
