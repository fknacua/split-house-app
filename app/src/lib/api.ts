import { authClient, BACKEND_URL } from '@/lib/auth-client';
import type { ApiErrorBody } from '@splithouse/shared';

/** Requests give up after this long (covers a Neon cold start). */
export const REQUEST_TIMEOUT_MS = 20_000;

/** Statuses a gateway returns while the backend or database is starting or down. */
const UNREACHABLE_STATUSES = [502, 503, 504];

/**
 * The backend could not be reached: no network, the request timed out, or a
 * gateway answered 502/503/504. The app shows the blocking "Can't reach the
 * server" prompt for this error.
 */
export class ServerUnreachableError extends Error {
  constructor(message = "Can't reach the server.") {
    super(message);
    this.name = 'ServerUnreachableError';
  }
}

/** The backend answered with its standard error shape (4xx, or a 500 it reported). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** Options for {@link apiFetch}. */
export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Sent as JSON. Ignored when `formData` is set. */
  body?: unknown;
  /** Sent as multipart (bill upload). */
  formData?: FormData;
}

/**
 * Calls the backend with the Better Auth session cookie attached.
 *
 * @param path Path starting with `/api/`.
 * @returns The parsed JSON body.
 * @throws {ServerUnreachableError} On network failure, timeout, a 502/503/504, or a success
 *   response whose body is not JSON. An empty body (for example a 204) is fine.
 * @throws {ApiRequestError} When the backend returns its error shape (a 401 means the session ended).
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, formData } = options;
  const headers: Record<string, string> = {};
  const cookie = await authClient.getCookie();
  if (cookie) headers.cookie = cookie;
  if (!formData && body !== undefined) headers['content-type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}${path}`, {
        method,
        headers,
        // The cookie is sent by hand; stop the platform adding its own.
        credentials: 'omit',
        body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
        signal: controller.signal,
      });
    } catch {
      throw new ServerUnreachableError();
    }

    if (UNREACHABLE_STATUSES.includes(response.status)) throw new ServerUnreachableError();

    const text = await response.text();
    const isJson = (response.headers.get('content-type') ?? '').includes('json');
    // A success that carries a body but is not JSON did not come from our API (a captive
    // portal, a gateway page, a followed redirect), so it must not pass as data.
    if (response.ok && text && !isJson) throw new ServerUnreachableError();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!response.ok) {
      const error = (json as Partial<ApiErrorBody> | null)?.error;
      throw new ApiRequestError(
        response.status,
        error?.code ?? 'unknown',
        error?.message ?? 'Something went wrong.',
      );
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
