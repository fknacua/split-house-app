import { z } from 'zod';

/** Body of every failed API response: `{ error: { code, message } }`. */
export const apiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

/** Body of every failed API response: `{ error: { code, message } }`. */
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
