import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { startNextMonth } from "@/services/home/start-next-month.service";

/** Starts the month after the newest opened one, once the newest is settled. */
export const POST = route(async (request) => {
  await requireSession(request);
  return Response.json(await startNextMonth(prisma));
});
