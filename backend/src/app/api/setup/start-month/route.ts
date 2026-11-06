import { setupStartMonthRequestSchema } from "@splithouse/shared";
import { parseBody, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSetupStartMonth, saveSetupStartMonth } from "@/services/setup/setup.service";

/** The Start month page: the three cards, the selected one and the picker's first month. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getSetupStartMonth(prisma));
});

/** Saves the start month and marks Start month done. */
export const POST = route(async (request) => {
  await requireSession(request);
  const body = await parseBody(request, setupStartMonthRequestSchema);
  return Response.json(await saveSetupStartMonth(prisma, body));
});
