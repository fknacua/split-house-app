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
  /** Cancels the request (Cancel while a bill uploads). A cancelled request rejects with {@link RequestCancelledError}. */
  signal?: AbortSignal;
}

/** The caller cancelled the request through its `signal`. It is not a failure, so nothing is shown for it. */
export class RequestCancelledError extends Error {
  constructor() {
    super('The request was cancelled.');
    this.name = 'RequestCancelledError';
  }
}

/**
 * Calls the backend with the Better Auth session cookie attached.
 *
 * @param path Path starting with `/api/`.
 * @returns The parsed JSON body.
 * @throws {ServerUnreachableError} On network failure, timeout, a 502/503/504, or a success
 *   response whose body is not JSON. An empty body (for example a 204) is fine.
 * @throws {ApiRequestError} When the backend returns its error shape (a 401 means the session ended).
 * @throws {RequestCancelledError} When `signal` aborts before the response arrives.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  return request(path, options, async (response) => {
    const text = await response.text();
    const isJson = (response.headers.get('content-type') ?? '').includes('json');
    // A success that carries a body but is not JSON did not come from our API (a captive
    // portal, a gateway page, a followed redirect), so it must not pass as data.
    if (response.ok && text && !isJson) throw new ServerUnreachableError();
    if (!response.ok) throw requestError(response.status, text);
    return parseJson(text) as T;
  });
}

/**
 * Downloads a file from the backend with the Better Auth session cookie attached, such as a
 * bill's PDF.
 *
 * @param path Path starting with `/api/`.
 * @param contentType The type the file must have, e.g. `application/pdf`.
 * @returns The file's bytes.
 * @throws {ServerUnreachableError} On network failure, timeout, a 502/503/504, or a success
 *   response of another type (a captive portal or gateway page).
 * @throws {ApiRequestError} When the backend returns its error shape (a 401 means the session ended).
 */
export async function apiFetchFile(path: string, contentType: string): Promise<Uint8Array> {
  return request(path, {}, async (response) => {
    if (!response.ok) throw requestError(response.status, await response.text());
    if (!(response.headers.get('content-type') ?? '').includes(contentType)) throw new ServerUnreachableError();
    return new Uint8Array(await response.arrayBuffer());
  });
}

/**
 * Sends a request with the session cookie and a timeout, and reads its response with `read`
 * while the timeout still runs, so a body that stalls also counts as unreachable.
 */
async function request<T>(
  path: string,
  options: ApiFetchOptions,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const { method = 'GET', body, formData, signal } = options;
  if (signal?.aborted) throw new RequestCancelledError();
  const headers: Record<string, string> = {};
  const cookie = await authClient.getCookie();
  if (cookie) headers.cookie = cookie;
  if (!formData && body !== undefined) headers['content-type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
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
      // The same abort ends a timeout and a cancel; only the caller's signal tells them apart.
      throw signal?.aborted ? new RequestCancelledError() : new ServerUnreachableError();
    }

    if (UNREACHABLE_STATUSES.includes(response.status)) throw new ServerUnreachableError();
    return await read(response);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** The error for a failed response, from the backend's error shape when the body has it. */
function requestError(status: number, text: string): ApiRequestError {
  const error = (parseJson(text) as Partial<ApiErrorBody> | null)?.error;
  return new ApiRequestError(status, error?.code ?? 'unknown', error?.message ?? 'Something went wrong.');
}

/** The body as JSON, or null when it is empty or not JSON. */
function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
