import { requireSession, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSetupMessages } from "@/services/setup/setup-messages.service";

/** First run's Custom messages page. */
export const GET = route(async (request) => {
  await requireSession(request);
  return Response.json(await getSetupMessages(prisma));
});
