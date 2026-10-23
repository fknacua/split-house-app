import type { ZodType } from "zod";
import { ZodError } from "zod";

// Error shape for every API failure: { error: { code, message } }.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

// Throws a 401 ApiError when the request has no valid session. Imported
// lazily so modules that only need the other helpers (and their tests) do
// not load Better Auth and its required env vars.
export async function requireSession(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new ApiError(401, "unauthorized", "Sign in required.");
  }
  return session;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "invalid_request", "Body must be valid JSON.");
  }
  return validate(schema, json);
}

export function parseQuery<T>(request: Request, schema: ZodType<T>) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return validate(schema, params);
}

function validate<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

function toValidationError(error: ZodError) {
  const message = error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
  return new ApiError(400, "invalid_request", message);
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

// Wraps a route handler so ApiError and unexpected errors become the standard
// error shape. Routes stay thin: `export const GET = route(async (req) => ...)`.
// Handlers read request data (headers, session), so they run at request time
// under Cache Components; there is no `dynamic` export.
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.status, error.code, error.message);
      }
      console.error("Unhandled API error", error);
      return errorResponse(500, "internal", "Something went wrong.");
    }
  };
}

/**
 * Turns a Better Auth error redirect into the standard JSON error.
 * Better Auth was built for browsers, so some failures (a database error while
 * signing in, for example) answer with a redirect such as `302 -> /error?error=...`.
 * The app's `fetch` follows redirects and would read the error page as a successful
 * reply. Only a 3xx whose `Location` carries an `error` value is converted; every
 * other response, redirects without an error included, passes through untouched.
 *
 * @param response What the Better Auth handler returned.
 * @returns The same response, or for an error redirect a `{ error: { code, message } }`
 *   response: 500 for `internal_server_error`, 400 for any other error code.
 */
export function redirectToJsonError(response: Response): Response {
  if (response.status < 300 || response.status >= 400) return response;
  const location = response.headers.get("location") ?? "";
  const code = new URLSearchParams(location.split("?")[1] ?? "").get("error");
  if (!code) return response;
  console.error("[auth] error redirect turned into a JSON error", { code });
  const status = code === "internal_server_error" ? 500 : 400;
  return errorResponse(status, code, "Authentication failed.");
}
