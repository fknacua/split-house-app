import { sendQuerySchema } from "@splithouse/shared";
import { parseQuery, requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSendSheet } from "@/services/send/send.service";

/** The Send message sheet for the active month: `?mode=monthly|nudge&personId=&chargeId=`. */
export const GET = route(async (request) => {
  await requireSession(request);
  const query = parseQuery(request, sendQuerySchema);
  return Response.json(await getSendSheet(prisma, query));
});
