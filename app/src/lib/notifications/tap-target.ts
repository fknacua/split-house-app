import { homeTargetSchema, type HomeTarget } from '@splithouse/shared';

/** What a tap on a notification asks for: the screen or sheet to open, or null for plain Home. */
export interface TapRequest {
  target: HomeTarget | null;
}

/**
 * Reads where a tap on a notification should go from the `data` the scheduler stored (`NotificationData`). Anything
 * missing or not a valid target falls back to Home, so an old or odd notification still opens the app.
 *
 * @param data - The notification's `content.data`.
 * @returns The request to open.
 */
export function tapRequestFromData(data: Record<string, unknown> | null | undefined): TapRequest {
  const parsed = homeTargetSchema.safeParse(data?.tap);
  return { target: parsed.success ? parsed.data : null };
}

let pending: TapRequest | null = null;
const listeners = new Set<() => void>();

/**
 * Hands a tap to Home, which owns the sheets a target may open. Home opens it when it is mounted, or at once if it
 * already is.
 *
 * @param request - The tap to open.
 */
export function setPendingTapRequest(request: TapRequest): void {
  pending = request;
  listeners.forEach((listener) => listener());
}

/**
 * Takes the waiting tap, if any, so it opens once.
 *
 * @returns The request, or null when none is waiting.
 */
export function takePendingTapRequest(): TapRequest | null {
  const request = pending;
  pending = null;
  return request;
}

/**
 * Calls back whenever a tap is handed over.
 *
 * @param listener - Called after each {@link setPendingTapRequest}.
 * @returns Stops listening.
 */
export function subscribePendingTapRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
