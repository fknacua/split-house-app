import { z } from 'zod';

/** `GET /api/me`: the signed-in account. */
export const meResponseSchema = z.object({
  email: z.string(),
});

/** `GET /api/me`: the signed-in account. */
export type MeResponse = z.infer<typeof meResponseSchema>;
